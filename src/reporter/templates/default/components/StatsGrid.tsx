import type { SummaryStats } from "../../../types";
import type { UnitType } from "../../../../metrics/types";
import { formatTrendArrow, getTrendColor, formatValue } from "./formatUtils";

interface StatsGridProps {
  stats: SummaryStats;
  unit: UnitType | null;
}

export function StatsGrid({ stats, unit }: StatsGridProps) {
  const trendArrow = formatTrendArrow(stats.trendDirection);
  const trendColor = getTrendColor(stats.trendDirection);
  const trendPercent =
    stats.trendPercent !== null ? Math.abs(stats.trendPercent).toFixed(1) : "0.0";

  return (
    <div class="uent-stats flex flex-wrap gap-x-6 gap-y-2 py-2 my-3">
      <div class="flex flex-col">
        <span class="uent-stat-l text-[10px]">latest</span>
        <span class="uent-stat-v uent-mono text-base">{formatValue(stats.latest, unit)}</span>
      </div>
      <div class="flex flex-col">
        <span class="uent-stat-l text-[10px]">trend</span>
        <span class={`uent-stat-v uent-mono text-base ${trendColor}`}>
          {trendArrow}
          {trendPercent}%
        </span>
      </div>
    </div>
  );
}
