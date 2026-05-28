import { z } from "zod";

export const CanonicalImportRecordSchema = z
  .object({
    metric_id: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9-]+$/, {
        message: "metric_id must match ^[a-z0-9-]+$",
      }),
    timestamp: z.string().datetime({ offset: true }),
    value_numeric: z.number().optional(),
    value_label: z.string().max(256).optional(),
    commit_sha: z
      .string()
      .regex(/^[0-9a-f]{40}$/, {
        message: "commit_sha must be 40-char lowercase hex",
      })
      .optional(),
    branch: z.string().min(1).max(255).optional(),
    source: z.string().min(1).max(64).optional(),
    run_id: z.string().min(1).max(64).optional(),
    run_number: z.number().int().min(0).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .refine((data) => (data.value_numeric !== undefined) !== (data.value_label !== undefined), {
    message: "exactly one of value_numeric or value_label must be set",
  });

export type CanonicalImportRecord = z.infer<typeof CanonicalImportRecordSchema>;

export type CommitResolutionTier = "source-provided" | "nearest-timestamp" | "skipped";

export interface ResolvedRecord {
  record: CanonicalImportRecord;
  commitSha: string;
  branch: string;
  source: string;
  runId: string;
  runNumber: number;
  tier: CommitResolutionTier;
}

export interface RecordValidationError {
  line: number;
  reason: string;
  raw: string;
}

export interface RecordResolutionWarning {
  line: number;
  reason: string;
  record: CanonicalImportRecord;
}

export interface IngestSummary {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  inserted: number;
  skipped: number;
  validationErrors: RecordValidationError[];
  resolutionWarnings: RecordResolutionWarning[];
  tierCounts: Record<CommitResolutionTier, number>;
  metricIds: string[];
  undeclaredMetricIds: string[];
  sources: Record<string, number>;
  dateRange: { start: string; end: string } | null;
}
