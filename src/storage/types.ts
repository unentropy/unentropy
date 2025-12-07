import type { UnitType } from "../metrics/types";

export type MetricType = "numeric" | "label";

export interface MetricDefinition {
  id: string;
  type: MetricType;
  unit: UnitType | null;
  description: string | null;
}

export interface BuildContext {
  id: number;
  commit_sha: string;
  branch: string;
  run_id: string;
  run_number: number;
  event_name: string | null;
  timestamp: string;
}

export interface MetricValue {
  id: number;
  metric_id: string;
  build_id: number;
  value_numeric: number | null;
  value_label: string | null;
}

export interface InsertBuildContext {
  commit_sha: string;
  branch: string;
  run_id: string;
  run_number: number;
  event_name?: string;
  timestamp: string;
}

export interface InsertMetricDefinition {
  id: string;
  type: MetricType;
  unit?: UnitType | null;
  description?: string | null;
}

export interface InsertMetricValue {
  metric_id: string;
  build_id: number;
  value_numeric?: number | null;
  value_label?: string | null;
}
