import type { MetricReportData } from "../../../types";
import { StatsGrid } from "./StatsGrid";
import { ChartCanvas } from "./ChartCanvas";

interface MultiMetricChartCardProps {
  title: string;
  metrics: MetricReportData[];
}

export function MultiMetricChartCard({ title, metrics }: MultiMetricChartCardProps) {
  const chartId = metrics.map((m) => m.id).join("-");

  return (
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 metric-card multi-metric">
      <div class="mb-4">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>

      <div class="flex flex-wrap gap-4 mb-6">
        {metrics.map((metric) => (
          <div key={metric.id} class="flex-1 min-w-[140px]">
            <div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {metric.name}
            </div>
            <StatsGrid stats={metric.stats} unit={metric.unit} />
          </div>
        ))}
      </div>

      <div class="chart-container">
        <ChartCanvas id={chartId} name={title} chartType="line" />
      </div>
    </div>
  );
}
