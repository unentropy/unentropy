import type { SectionData, MetricReportData } from "../../../types";
import { MetricCard } from "./MetricCard";
import { MultiMetricChartCard } from "./MultiMetricChartCard";

interface SectionProps {
  section: SectionData;
  metrics: MetricReportData[];
  previewMetrics?: MetricReportData[];
  showToggle?: boolean;
}

function renderChartCard(
  chart: SectionData["charts"][number],
  metricMap: Map<string, MetricReportData>
) {
  if (chart.type === "single" && chart.metricId) {
    const metric = metricMap.get(chart.metricId);
    if (!metric) return null;
    return <MetricCard key={chart.metricId} metric={metric} />;
  }

  if (chart.type === "multi" && chart.metricIds) {
    const chartMetrics = chart.metricIds
      .map((id) => metricMap.get(id))
      .filter(Boolean) as MetricReportData[];
    if (chartMetrics.length === 0) return null;
    return (
      <MultiMetricChartCard
        key={chart.metricIds.join("-")}
        title={chart.title}
        metrics={chartMetrics}
      />
    );
  }

  return null;
}

export function Section({ section, metrics, previewMetrics, showToggle }: SectionProps) {
  const realMetricMap = new Map(metrics.map((m) => [m.id, m]));
  // Map preview metrics by their original (unsuffixed) ID
  const previewMetricMap = new Map(
    (previewMetrics ?? []).map((m) => [m.id.replace(/-preview$/, ""), m])
  );

  return (
    <section class="mb-10">
      <div class="uent-section-head uent-mono mb-4">
        <div class="text-base">
          <span class="uent-section-marker">▾</span> {section.name}
        </div>
        {section.description && (
          <div class="uent-section-comment text-xs mt-1 pl-4">// {section.description}</div>
        )}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {showToggle && previewMetrics
          ? section.charts.map((chart) => (
              <div key={JSON.stringify(chart)}>
                <div data-view="real" class="hidden" aria-hidden="true">
                  {renderChartCard(chart, realMetricMap)}
                </div>
                <div data-view="preview">{renderChartCard(chart, previewMetricMap)}</div>
              </div>
            ))
          : section.charts.map((chart) => renderChartCard(chart, realMetricMap))}
      </div>
    </section>
  );
}
