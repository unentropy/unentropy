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
    <div class="uent-card metric-card multi-metric p-4">
      <div class="mb-3">
        <h3 class="uent-metric-name text-sm font-medium">{title}</h3>
      </div>

      <div class="flex flex-wrap gap-4 mb-3">
        {metrics.map((metric) => (
          <div key={metric.id} class="flex-1 min-w-[140px]">
            <div class="uent-metric-name uent-mono text-xs mb-1">{metric.name}</div>
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
