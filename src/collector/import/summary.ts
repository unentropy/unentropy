import type { IngestSummary, RecordResolutionWarning, SkipReasonCategory } from "./types";

const SKIP_REASON_LABELS: Record<SkipReasonCategory, string> = {
  "unresolved-commit": "timestamp predates repo history",
  "run-id-length": "derived run_id too long",
};

function skipBreakdown(
  warnings: RecordResolutionWarning[]
): { label: string; count: number }[] {
  const counts = new Map<SkipReasonCategory, number>();
  for (const w of warnings) {
    counts.set(w.category, (counts.get(w.category) ?? 0) + 1);
  }
  return [...counts.entries()].map(([category, count]) => ({
    label: SKIP_REASON_LABELS[category],
    count,
  }));
}

export function formatSummary(
  summary: IngestSummary,
  opts: { jsonlPath: string; outputPath: string; dryRun: boolean }
): string {
  const lines: string[] = [];

  if (opts.dryRun) {
    lines.push(`dry-run summary for ${opts.jsonlPath}:`);
    lines.push(
      `  records:       ${summary.totalRecords} (${summary.validRecords} valid, ${summary.invalidRecords} invalid)`
    );
  } else {
    lines.push(
      `imported ${summary.inserted} records from ${opts.jsonlPath} into ${opts.outputPath}`
    );
  }

  const sourceLine = formatSources(summary.sources);
  if (sourceLine)
    lines.push(opts.dryRun ? `  sources:       ${sourceLine}` : `  sources: ${sourceLine}`);

  if (summary.metricIds.length > 0) {
    const undeclared = new Set(summary.undeclaredMetricIds);
    const annotated = summary.metricIds
      .map((id) => (undeclared.has(id) ? `${id} (undeclared)` : id))
      .join(", ");
    lines.push(opts.dryRun ? `  metric ids:    ${annotated}` : `  metrics: ${annotated}`);
  }

  if (summary.dateRange) {
    lines.push(
      opts.dryRun
        ? `  date range:    ${summary.dateRange.start} → ${summary.dateRange.end}`
        : `  date range: ${summary.dateRange.start} → ${summary.dateRange.end}`
    );
  }

  const t = summary.tierCounts;
  const breakdown = skipBreakdown(summary.resolutionWarnings);
  if (opts.dryRun) {
    lines.push(`  commit resolution:`);
    lines.push(`    source-provided        ${t["source-provided"]}`);
    lines.push(`    nearest-timestamp      ${t["nearest-timestamp"]}`);
    lines.push(`    skipped                ${t.skipped}`);
    for (const { label, count } of breakdown) {
      lines.push(`      ${label}: ${count}`);
    }
    lines.push(`no database writes performed (--dry-run).`);
  } else if (t["source-provided"] + t["nearest-timestamp"] + t.skipped > 0) {
    lines.push(
      `  commits resolved: ${t["source-provided"]} from source SHA, ${t["nearest-timestamp"]} by nearest timestamp`
    );
    if (t.skipped > 0) {
      lines.push(`  commits skipped: ${t.skipped}`);
      for (const { label, count } of breakdown) {
        lines.push(`    ${label}: ${count}`);
      }
    }
  }

  return lines.filter((l) => l !== undefined).join("\n");
}

function formatSources(sources: Record<string, number>): string | null {
  const entries = Object.entries(sources);
  if (entries.length === 0) return null;
  return entries.map(([name, count]) => `${name} (${count})`).join(", ");
}

export function formatWarnings(summary: IngestSummary, jsonlPath: string): string[] {
  const out: string[] = [];
  for (const e of summary.validationErrors) {
    out.push(`warning: ${jsonlPath}:${e.line} — ${e.reason} (record skipped)`);
  }
  for (const w of summary.resolutionWarnings) {
    out.push(`warning: ${jsonlPath}:${w.line} — ${w.reason} (record skipped)`);
  }
  return out;
}
