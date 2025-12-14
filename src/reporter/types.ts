import type { MetricType } from "../storage/types";
import type { UnitType } from "../metrics/types";

export interface TimeSeriesDataPoint {
  timestamp: string;
  valueNumeric: number | null;
  valueLabel: string | null;
  commitSha: string;
  branch: string;
  runNumber: number;
}

export interface NormalizedDataPoint {
  timestamp: string;
  value: number | null;
  commitSha: string;
  runNumber: number;
}

export interface TimeSeriesData {
  metricName: string;
  metricType: MetricType;
  unit: UnitType | null;
  description: string | null;
  dataPoints: TimeSeriesDataPoint[];
}

export interface SummaryStats {
  latest: number | null;
  min: number | null;
  max: number | null;
  average: number | null;
  trendDirection: "up" | "down" | "stable" | null;
  trendPercent: number | null;
}

export interface ReportMetadata {
  repository: string;
  generatedAt: string;
  buildCount: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface MetricReportData {
  id: string;
  name: string;
  description: string | null;
  unit: UnitType | null;
  stats: SummaryStats;
  chartType: "line" | "bar";
  dataPointCount: number;
}

export interface MetadataPoint {
  sha: string;
  run: number;
}

export interface LineChartData {
  id: string;
  name: string;
  unit: UnitType | null;
  values: (number | null)[];
}

export interface BarChartData {
  id: string;
  name: string;
  unit: UnitType | null;
  labels: string[];
  counts: number[];
}

export interface PreviewDataSet {
  metricId: string;
  timestamps: string[];
  values: number[];
  stats: SummaryStats;
}

export interface ChartsData {
  timeline: string[];
  metadata: (MetadataPoint | null)[];
  lineCharts: LineChartData[];
  barCharts: BarChartData[];
  previewLineCharts: LineChartData[];
  previewBarCharts: BarChartData[];
  buildCount: number;
  showToggle: boolean;
  previewData: PreviewDataSet[];
  availableDateRange?: {
    min: string;
    max: string;
  };
}

export interface ReportData {
  metadata: ReportMetadata;
  metrics: MetricReportData[];
  previewMetrics?: MetricReportData[];
}

export interface GenerateReportOptions {
  repository?: string;
  metricNames?: string[];
  config?: import("../config/loader").ResolvedUnentropyConfig;
}
