import type { UnitType } from "../metrics/types";

export type MetricType = "numeric" | "label";

export interface MetricDefinition {
  id: number;
  name: string;
  type: MetricType;
  unit: UnitType | null;
  description: string | null;
  created_at: string;
}

export interface BuildContext {
  id: number;
  commit_sha: string;
  branch: string;
  run_id: string;
  run_number: number;
  actor: string | null;
  event_name: string | null;
  timestamp: string;
  created_at: string;
  pull_request_number: number | null;
  pull_request_base: string | null;
  pull_request_head: string | null;
}

export interface MetricValue {
  id: number;
  metric_id: number;
  build_id: number;
  value_numeric: number | null;
  value_label: string | null;
  collected_at: string;
  collection_duration_ms: number | null;
}

export interface InsertBuildContext {
  commit_sha: string;
  branch: string;
  run_id: string;
  run_number: number;
  actor?: string;
  event_name?: string;
  timestamp: string;
  pull_request_number?: number | null;
  pull_request_base?: string | null;
  pull_request_head?: string | null;
}

export interface InsertMetricDefinition {
  name: string;
  type: MetricType;
  unit?: UnitType | null;
  description?: string | null;
}

export interface InsertMetricValue {
  metric_id: number;
  build_id: number;
  value_numeric?: number | null;
  value_label?: string | null;
  collected_at: string;
  collection_duration_ms?: number | null;
}
