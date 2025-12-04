import type { MetricsRepository } from "../storage/repository.js";
import type { MetricSample } from "./types.js";

export function buildMetricSamples(
  collectedMetrics: {
    definition: {
      name: string;
      type: "numeric" | "label";
      unit?: string;
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

    const baselineValue = repository.getBaselineMetricValue(def.name, referenceBranch, maxAgeDays);

    samples.push({
      name: def.name,
      unit: def.unit,
      type: "numeric",
      baselineValue,
      pullRequestValue: collected.value_numeric,
    });
  }

  return samples;
}
