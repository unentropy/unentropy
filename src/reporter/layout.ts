import { ResolvedUnentropyConfig } from "../config/loader";
import type { ReportLayout, SectionData, ChartData, MetricReportData } from "./types";

export function buildReportLayout(
  config: ResolvedUnentropyConfig,
  metrics: MetricReportData[]
): ReportLayout | undefined {
  if (!config.report?.sections) {
    return undefined;
  }

  const metricMap = new Map(metrics.map((m) => [m.id, m]));

  const sections: SectionData[] = config.report.sections.map((section) => {
    const charts: ChartData[] = [];

    for (const chartConfig of section.charts) {
      const metricKeys = Array.isArray(chartConfig.metrics)
        ? chartConfig.metrics
        : [chartConfig.metrics];

      const validMetrics = metricKeys
        .map((key) => key.replace(/[^a-zA-Z0-9-]/g, "-"))
        .filter((id) => metricMap.has(id));

      const firstMetricId = validMetrics[0];
      if (!firstMetricId) {
        continue;
      }

      const firstMetric = metricMap.get(firstMetricId);
      if (!firstMetric) {
        continue;
      }

      const isMulti = validMetrics.length > 1;

      const title =
        chartConfig.title ||
        (isMulti
          ? validMetrics.map((id) => metricMap.get(id)?.name || id).join(", ")
          : firstMetric.name);

      charts.push({
        type: isMulti ? "multi" : "single",
        metricId: isMulti ? undefined : validMetrics[0],
        metricIds: isMulti ? validMetrics : undefined,
        title,
        chartType: firstMetric.chartType,
      });
    }

    return {
      name: section.name,
      description: section.description,
      charts,
    };
  });

  return { sections };
}
