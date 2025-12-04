export interface MetricTemplate {
  id: string;
  name: string;
  description: string;
  type: "numeric" | "label";
  command?: string;
  unit?: UnitType;
}

export type MetricTemplateRegistry = Record<string, MetricTemplate>;

/**
 * Semantic unit types for consistent value formatting across reports and PR comments.
 *
 * See specs/005-metrics-gallery/data-model.md for detailed formatting rules for each unit type.
 */
export type UnitType = "percent" | "integer" | "bytes" | "duration" | "decimal";
