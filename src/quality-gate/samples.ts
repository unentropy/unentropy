import type { MetricsRepository } from "../storage/repository.js";
import type { MetricSample } from "./types.js";
import type { UnitType } from "../metrics/types.js";

export function buildMetricSamples(
  collectedMetrics: {
    definition: {
      id: string;
      type: "numeric" | "label";
      unit?: UnitType;
      description?: string;
    };
    value_numeric?: number;
    value_label?: string;
  }[],
  repository: MetricsRepository,
  referenceBranch: string,
  maxAgeDays: number
): MetricSample[] {
  const samples: MetricSample[] = [];

  for (const collected of collectedMetrics) {
    const def = collected.definition;

    if (def.type !== "numeric") {
      continue;
    }

    const baselineValue = repository.getBaselineMetricValue(def.id, referenceBranch, maxAgeDays);

    samples.push({
      name: def.id,
      unit: def.unit,
      type: "numeric",
      baselineValue,
      pullRequestValue: collected.value_numeric,
    });
  }

  return samples;
}
