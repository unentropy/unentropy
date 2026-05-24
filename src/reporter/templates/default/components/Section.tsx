import type { SectionData } from "../../../types";
import { MetricCard } from "./MetricCard";
import { MultiMetricChartCard } from "./MultiMetricChartCard";

interface SectionProps {
  section: SectionData;
  metrics: import("../../../types").MetricReportData[];
}

export function Section({ section, metrics }: SectionProps) {
  const metricMap = new Map(metrics.map((m) => [m.id, m]));

  return (
    <section class="mb-8">
      <div class="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{section.name}</h2>
        {section.description && (
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">{section.description}</p>
        )}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {section.charts.map((chart) => {
          if (chart.type === "single" && chart.metricId) {
            const metric = metricMap.get(chart.metricId);
            if (!metric) return null;
            return <MetricCard key={chart.metricId} metric={metric} />;
          }

          if (chart.type === "multi" && chart.metricIds) {
            const chartMetrics = chart.metricIds
              .map((id) => metricMap.get(id))
              .filter(Boolean) as import("../../../types").MetricReportData[];
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
        })}
      </div>
    </section>
  );
}
