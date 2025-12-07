import type { ReportMetadata, MetricReportData, ReportData, ChartsData } from "./types";
import type { ResolvedUnentropyConfig } from "../config/loader";

/**
 * Generate an empty report showing configured metrics with no data.
 * Used for preview mode where users want to see report structure.
 * Uses dynamic imports to avoid JSX module issues when not needed.
 */
export async function generateEmptyReport(
  config: ResolvedUnentropyConfig,
  options: { repository?: string } = {}
): Promise<string> {
  // Lazy load rendering dependencies
  const render = await import("preact-render-to-string").then((m) => m.default);
  const { h } = await import("preact");
  const { HtmlDocument } = await import("./templates/default/components");

  const repository = options.repository || "preview/repository";
  const now = new Date().toISOString();

  // Create empty metadata
  const metadata: ReportMetadata = {
    repository,
    generatedAt: now,
    buildCount: 0,
    dateRange: { start: now, end: now },
  };

  // Create metrics with empty stats
  const metrics: MetricReportData[] = Object.entries(config.metrics).map(([key, metric]) => ({
    id: key.replace(/[^a-zA-Z0-9-]/g, "-"),
    name: metric.name || key,
    description: metric.description || null,
    unit: metric.unit || null,
    stats: {
      latest: null,
      min: null,
      max: null,
      average: null,
      trendDirection: null,
      trendPercent: null,
    },
    chartType: metric.type === "numeric" ? "line" : "bar",
    sparse: true,
    dataPointCount: 0,
  }));

  // Empty charts data
  const chartsData: ChartsData = {
    timeline: [],
    metadata: [],
    lineCharts: [],
    barCharts: [],
  };

  const reportData: ReportData = { metadata, metrics };

  const jsx = h(HtmlDocument, { data: reportData, chartsData });
  return "<!DOCTYPE html>" + render(jsx);
}
