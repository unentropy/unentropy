import type { TimeSeriesData, NormalizedDataPoint, LineChartData, BarChartData } from "./types";
import type { UnitType } from "../metrics/types";

export function buildLineChartData(
  metricId: string,
  metricName: string,
  unit: UnitType | null,
  normalizedData: NormalizedDataPoint[]
): LineChartData {
  return {
    id: metricId,
    name: metricName,
    unit,
    values: normalizedData.map((dp) => dp.value),
  };
}

export function buildBarChartData(
  metricId: string,
  metricName: string,
  dataPoints: TimeSeriesData["dataPoints"],
  unit: UnitType | null
): BarChartData {
  const labelCounts = new Map<string, number>();

  for (const dp of dataPoints) {
    if (dp.valueLabel) {
      labelCounts.set(dp.valueLabel, (labelCounts.get(dp.valueLabel) ?? 0) + 1);
    }
  }

  const labels = Array.from(labelCounts.keys()).sort();

  return {
    id: metricId,
    name: metricName,
    unit,
    labels,
    counts: labels.map((label) => labelCounts.get(label) ?? 0),
  };
}
