import type {
  ReportMetadata,
  MetricReportData,
  ReportData,
  ChartsData,
  PreviewDataSet,
  LineChartData,
  BarChartData,
} from "./types";
import type { ResolvedUnentropyConfig } from "../config/loader";
import { generateSyntheticData, calculateSyntheticStats } from "./synthetic";

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
    dataPointCount: 0,
  }));

  // Generate synthetic preview data for 0-build case
  const currentDate = new Date();
  const previewTimestamps: string[] = [];
  for (let i = 19; i >= 0; i--) {
    const date = new Date(currentDate.getTime() - i * 3 * 24 * 60 * 60 * 1000);
    previewTimestamps.push(date.toISOString());
  }

  // Create line chart definitions (empty values for real data)
  const lineCharts = Object.entries(config.metrics)
    .filter(([, metric]) => metric.type === "numeric")
    .map(([key, metric]) => ({
      id: key.replace(/[^a-zA-Z0-9-]/g, "-"),
      name: metric.name || key,
      unit: metric.unit ?? null,
      values: [] as (number | null)[],
    }));

  // Generate preview data with synthetic values and stats
  const previewData: PreviewDataSet[] = lineCharts.map((chart) => {
    const defaultStats = {
      latest: null,
      min: null,
      max: null,
      average: 50,
      trendDirection: null,
      trendPercent: null,
    } as const;

    const syntheticValues = generateSyntheticData(chart.name, defaultStats, chart.unit);
    const syntheticStats = calculateSyntheticStats(syntheticValues);

    return {
      metricId: chart.id,
      timestamps: previewTimestamps,
      values: syntheticValues,
      stats: syntheticStats,
    };
  });

  // Create preview versions with -preview suffix to avoid ID collisions
  const previewLineCharts: LineChartData[] = lineCharts.map((chart, index) => ({
    ...chart,
    id: `${chart.id}-preview`,
    values: previewData[index]?.values || [],
  }));

  // Create preview bar charts with -preview suffix
  const barCharts: BarChartData[] = [];
  const previewBarCharts: BarChartData[] = [];

  // Create preview metrics array with synthetic stats
  const previewMetrics: MetricReportData[] = metrics.map((metric) => {
    if (metric.chartType === "line") {
      const previewStats = previewData.find((p) => p.metricId === metric.id)?.stats;
      return {
        ...metric,
        id: `${metric.id}-preview`,
        stats: previewStats || metric.stats,
      };
    } else {
      return {
        ...metric,
        id: `${metric.id}-preview`,
      };
    }
  });

  // Charts data with toggle enabled for 0-build preview
  const chartsData: ChartsData = {
    timeline: [],
    metadata: [],
    lineCharts,
    barCharts,
    previewLineCharts,
    previewBarCharts,
    buildCount: 0,
    showToggle: true,
    previewData,
  };

  const reportData: ReportData = { metadata, metrics, previewMetrics };

  const jsx = h(HtmlDocument, { data: reportData, chartsData });
  return "<!DOCTYPE html>" + render(jsx);
}
