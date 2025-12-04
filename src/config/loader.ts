import { readFile } from "fs/promises";
import { validateConfig } from "./schema";
import { resolveMetricReference } from "../metrics/resolver.js";
import type {
  ResolvedMetricConfig,
  StorageConfig,
  MetricConfig,
  QualityGateConfig,
} from "./schema";

export interface ResolvedUnentropyConfig {
  metrics: ResolvedMetricConfig[];
  storage: StorageConfig;
  qualityGate?: QualityGateConfig;
}

export async function loadConfig(configPath = "unentropy.json"): Promise<ResolvedUnentropyConfig> {
  const fileContent = await readFile(configPath, "utf-8");
  let parsedJson;
  try {
    parsedJson = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!parsedJson.metrics || !Array.isArray(parsedJson.metrics)) {
    throw new Error("Configuration must contain a 'metrics' array");
  }

  const originalMetrics = parsedJson.metrics as MetricConfig[];

  const resolvedMetrics = originalMetrics.map((metric) => {
    if (metric.$ref) {
      return resolveMetricReference(metric);
    }
    return metric;
  });

  // Check for duplicate ids after resolution
  const seenIds = new Map<string, { index: number; wasInherited: boolean }>();
  for (let i = 0; i < resolvedMetrics.length; i++) {
    const metric = resolvedMetrics[i];
    const original = originalMetrics[i];
    if (!metric || !original) continue;

    const metricId = metric.id ?? metric.name;
    if (metricId) {
      const existing = seenIds.get(metricId);
      if (existing) {
        // Check if both were inherited from the same $ref
        const currentWasInherited = original.$ref !== undefined && original.id === undefined;
        if (existing.wasInherited && currentWasInherited) {
          throw new Error(
            `Duplicate metric id "${metricId}" found.\nWhen using the same $ref multiple times, provide explicit id values.`
          );
        }
        throw new Error(
          `Duplicate metric id "${metricId}" found.\nMetric ids must be unique within the configuration.`
        );
      }
      seenIds.set(metricId, {
        index: i,
        wasInherited: original.$ref !== undefined && original.id === undefined,
      });
    }
  }

  const configWithResolvedMetrics = {
    ...parsedJson,
    metrics: resolvedMetrics,
  };

  const validated = validateConfig(configWithResolvedMetrics);

  return validated as ResolvedUnentropyConfig;
}
