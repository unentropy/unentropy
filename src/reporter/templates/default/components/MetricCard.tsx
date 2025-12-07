import type { MetricReportData } from "../../../types";
import { StatsGrid } from "./StatsGrid";
import { ChartCanvas } from "./ChartCanvas";

interface MetricCardProps {
  metric: MetricReportData;
}

export function MetricCard({ metric }: MetricCardProps) {
  return (
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 metric-card">
      <div class="mb-4">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{metric.name}</h2>
        {metric.description && (
          <p class="text-sm text-gray-600 dark:text-gray-400">{metric.description}</p>
        )}
      </div>

      {metric.chartType === "line" && <StatsGrid stats={metric.stats} unit={metric.unit} />}
      {metric.chartType === "bar" && <div class="h-20"></div>}

      <ChartCanvas id={metric.id} name={metric.name} chartType={metric.chartType} />
    </div>
  );
}
