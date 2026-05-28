import type { IngestSummary } from "./types";

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
  if (opts.dryRun) {
    lines.push(`  commit resolution:`);
    lines.push(`    source-provided        ${t["source-provided"]}`);
    lines.push(`    nearest-timestamp      ${t["nearest-timestamp"]}`);
    lines.push(`    skipped (unresolvable) ${t.skipped}`);
    lines.push(opts.dryRun ? `no database writes performed (--dry-run).` : "");
  } else if (t["source-provided"] + t["nearest-timestamp"] + t.skipped > 0) {
    lines.push(
      `  commits resolved: ${t["source-provided"]} from source SHA, ${t["nearest-timestamp"]} by nearest timestamp`
    );
    if (t.skipped > 0) {
      lines.push(`  commits skipped: ${t.skipped} (timestamp predates repo history)`);
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
