import type { MetricReportData } from "../../../types";
import { StatsGrid } from "./StatsGrid";
import { ChartCanvas } from "./ChartCanvas";

interface MetricCardProps {
  metric: MetricReportData;
}

export function MetricCard({ metric }: MetricCardProps) {
  return (
    <div class="uent-card metric-card p-4">
      <div class="mb-2">
        <h3 class="uent-metric-name text-sm font-medium">{metric.name}</h3>
        {metric.description && <p class="uent-metric-desc text-xs mt-0.5">{metric.description}</p>}
      </div>

      {metric.chartType === "line" && <StatsGrid stats={metric.stats} unit={metric.unit} />}
      {metric.chartType === "bar" && <div class="h-6"></div>}

      <div class="chart-container">
        <ChartCanvas id={metric.id} name={metric.name} chartType={metric.chartType} />
      </div>
    </div>
  );
}
