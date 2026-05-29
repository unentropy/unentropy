import { describe, it, expect } from "bun:test";
import { formatSummary } from "../../../../src/collector/import/summary";
import type { CanonicalImportRecord, IngestSummary } from "../../../../src/collector/import/types";

function record(metric_id: string): CanonicalImportRecord {
  return { metric_id, timestamp: "2024-01-01T00:00:00Z", value_numeric: 1 };
}

function summaryWithSkips(): IngestSummary {
  return {
    totalRecords: 5,
    validRecords: 5,
    invalidRecords: 0,
    inserted: 2,
    skipped: 3,
    validationErrors: [],
    resolutionWarnings: [
      { line: 1, reason: "no commit could be resolved", category: "unresolved-commit", record: record("a") },
      { line: 2, reason: "derived run_id exceeds 128 characters", category: "run-id-length", record: record("b") },
      { line: 3, reason: "derived run_id exceeds 128 characters", category: "run-id-length", record: record("c") },
    ],
    tierCounts: { "source-provided": 0, "nearest-timestamp": 2, skipped: 3 },
    metricIds: ["a", "b", "c"],
    undeclaredMetricIds: [],
    sources: {},
    dateRange: null,
  };
}

describe("formatSummary skip breakdown", () => {
  it("breaks down skipped records by category instead of blaming timestamps", () => {
    const out = formatSummary(summaryWithSkips(), {
      jsonlPath: "seed.jsonl",
      outputPath: "out.db",
      dryRun: false,
    });

    expect(out).toContain("commits skipped: 3");
    // run_id-length skips must be visible, not hidden behind "timestamp predates repo history"
    expect(out).toMatch(/run_id.*2/);
    expect(out).toMatch(/predates repo history.*1/);
  });
});
