import type { SqliteDatabase } from "../../storage/driver";
import type { Storage } from "../../storage/storage";
import {
  CanonicalImportRecordSchema,
  type CanonicalImportRecord,
  type CommitResolutionTier,
  type IngestSummary,
  type RecordResolutionWarning,
  type RecordValidationError,
  type ResolvedRecord,
} from "./types";
import { CommitResolver, ShallowCloneError } from "./commit-resolver";

export const IMPORT_EVENT_NAME = "import";
const DEFAULT_SOURCE = "manual";
const DEFAULT_RUN_NUMBER = 0;
const RUN_ID_SHA_LENGTH = 12;
const MAX_RUN_ID_LENGTH = 128;

export interface IngestOptions {
  strict?: boolean;
  trendBranch: string;
  declaredMetricIds?: Set<string>;
  cwd?: string;
}

export interface IngestRequest {
  jsonl: string;
  options: IngestOptions;
}

export interface IngestPlan {
  summary: IngestSummary;
  resolved: ResolvedRecord[];
}

export function parseJsonl(jsonl: string): {
  records: { line: number; record: CanonicalImportRecord }[];
  errors: RecordValidationError[];
} {
  const lines = jsonl.split(/\r?\n/);
  const records: { line: number; record: CanonicalImportRecord }[] = [];
  const errors: RecordValidationError[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    if (raw.trim() === "") continue;
    const lineNumber = i + 1;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      errors.push({
        line: lineNumber,
        reason: `invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
        raw,
      });
      continue;
    }

    const result = CanonicalImportRecordSchema.safeParse(parsed);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      errors.push({
        line: lineNumber,
        reason: firstIssue?.message ?? "validation failed",
        raw,
      });
      continue;
    }

    records.push({ line: lineNumber, record: result.data });
  }

  return { records, errors };
}

export function buildIngestPlan(jsonl: string, options: IngestOptions): IngestPlan {
  const { records, errors } = parseJsonl(jsonl);
  const trendBranch = options.trendBranch;
  const resolver = new CommitResolver({ trendBranch, cwd: options.cwd });
  const resolved: ResolvedRecord[] = [];
  const warnings: RecordResolutionWarning[] = [];
  const tierCounts: Record<CommitResolutionTier, number> = {
    "source-provided": 0,
    "nearest-timestamp": 0,
    skipped: 0,
  };

  for (const { line, record } of records) {
    let sha: string | null;
    let tier: CommitResolutionTier;

    if (record.commit_sha) {
      sha = resolver.resolveDirect(record.commit_sha);
      tier = "source-provided";
    } else {
      sha = resolver.resolveByTimestamp(record.timestamp);
      tier = sha ? "nearest-timestamp" : "skipped";
    }

    if (!sha) {
      tierCounts.skipped += 1;
      warnings.push({
        line,
        reason: `no commit could be resolved for timestamp ${record.timestamp} on branch ${trendBranch}`,
        category: "unresolved-commit",
        record,
      });
      continue;
    }

    tierCounts[tier] += 1;

    const source = record.source ?? DEFAULT_SOURCE;
    const branch = record.branch ?? trendBranch;
    const runNumber = record.run_number ?? DEFAULT_RUN_NUMBER;
    const runId = record.run_id ?? buildDefaultRunId(source, sha);

    if (runId.length > MAX_RUN_ID_LENGTH) {
      tierCounts[tier] -= 1;
      tierCounts.skipped += 1;
      warnings.push({
        line,
        reason: `derived run_id exceeds ${MAX_RUN_ID_LENGTH} characters; provide an explicit run_id`,
        category: "run-id-length",
        record,
      });
      continue;
    }

    resolved.push({ record, commitSha: sha, branch, source, runId, runNumber, tier });
  }

  const metricIds = unique(resolved.map((r) => r.record.metric_id)).sort();
  const declared = options.declaredMetricIds ?? new Set<string>();
  const undeclaredMetricIds = metricIds.filter((id) => !declared.has(id));
  const sources = countBy(resolved.map((r) => r.source));
  const dateRange = computeDateRange(resolved.map((r) => r.record.timestamp));

  const summary: IngestSummary = {
    totalRecords: records.length + errors.length,
    validRecords: records.length,
    invalidRecords: errors.length,
    inserted: 0,
    skipped: tierCounts.skipped,
    validationErrors: errors,
    resolutionWarnings: warnings,
    tierCounts,
    metricIds,
    undeclaredMetricIds,
    sources,
    dateRange,
  };

  return { summary, resolved };
}

export function ingest(storage: Storage, jsonl: string, options: IngestOptions): IngestSummary {
  let plan: IngestPlan;
  try {
    plan = buildIngestPlan(jsonl, options);
  } catch (err) {
    if (err instanceof ShallowCloneError) throw err;
    throw err;
  }

  if (options.strict && (plan.summary.invalidRecords > 0 || plan.summary.skipped > 0)) {
    return plan.summary;
  }

  const db = storage.getConnection();
  const inserted = applyResolvedRecords(db, plan.resolved);

  return { ...plan.summary, inserted };
}

function applyResolvedRecords(db: SqliteDatabase, resolved: ResolvedRecord[]): number {
  if (resolved.length === 0) return 0;

  const insertBuild = db.prepare(
    `INSERT INTO build_contexts
       (commit_sha, branch, run_id, run_number, event_name, timestamp)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(commit_sha, run_id) DO NOTHING
     RETURNING id`
  );
  const selectBuild = db.prepare(
    `SELECT id FROM build_contexts WHERE commit_sha = ? AND run_id = ?`
  );
  const upsertDef = db.prepare(
    `INSERT INTO metric_definitions (id, type)
     VALUES (?, ?)
     ON CONFLICT(id) DO NOTHING`
  );
  const insertValue = db.prepare(
    `INSERT INTO metric_values (metric_id, build_id, value_numeric, value_label)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(metric_id, build_id) DO UPDATE SET
       value_numeric = excluded.value_numeric,
       value_label = excluded.value_label`
  );

  let inserted = 0;
  db.exec("BEGIN");
  try {
    for (const item of resolved) {
      const buildRow =
        insertBuild.get(
          item.commitSha,
          item.branch,
          item.runId,
          item.runNumber,
          IMPORT_EVENT_NAME,
          item.record.timestamp
        ) ?? selectBuild.get(item.commitSha, item.runId);

      if (!buildRow) continue;

      const metricType: "numeric" | "label" =
        item.record.value_numeric !== undefined ? "numeric" : "label";
      upsertDef.run(item.record.metric_id, metricType);

      insertValue.run(
        item.record.metric_id,
        buildRow.id,
        item.record.value_numeric ?? null,
        item.record.value_label ?? null
      );
      inserted += 1;
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }

  return inserted;
}

function buildDefaultRunId(source: string, sha: string): string {
  return `import:${source}:${sha.slice(0, RUN_ID_SHA_LENGTH)}`;
}

function unique<T>(xs: T[]): T[] {
  return Array.from(new Set(xs));
}

function countBy(xs: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const x of xs) out[x] = (out[x] ?? 0) + 1;
  return out;
}

function computeDateRange(timestamps: string[]): { start: string; end: string } | null {
  if (timestamps.length === 0) return null;
  const sorted = [...timestamps].sort();
  const start = sorted[0];
  const end = sorted[sorted.length - 1];
  if (start === undefined || end === undefined) return null;
  return { start, end };
}
