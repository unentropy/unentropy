import { readFile } from "fs/promises";
import { existsSync, statSync } from "fs";
import { dirname, resolve } from "path";
import { validateConfig } from "./schema";
import { resolveMetricReference } from "../metrics/resolver.js";
import type {
  ResolvedMetricConfig,
  StorageConfig,
  QualityGateConfig,
  ReportConfig,
  SourcesConfig,
} from "./schema";

export interface ResolvedUnentropyConfig {
  metrics: Record<string, ResolvedMetricConfig>;
  storage: StorageConfig;
  qualityGate?: QualityGateConfig;
  report?: ReportConfig;
  sources?: SourcesConfig;
  basePath?: string;
}

function normalizeSourcesPatterns(sources: SourcesConfig, basePath?: string): SourcesConfig {
  return sources.map((pattern) => {
    const isNegated = pattern.startsWith("!");
    const core = isNegated ? pattern.slice(1) : pattern;

    const hasGlobChars = /[*?[\]{}]/.test(core);
    if (hasGlobChars) {
      return pattern;
    }

    const resolvedCore = basePath ? resolve(basePath, core) : resolve(core);
    if (existsSync(resolvedCore) && statSync(resolvedCore).isDirectory()) {
      return isNegated ? `!${core}/**` : `${core}/**`;
    }

    return pattern;
  });
}

export async function loadConfig(configPath = "unentropy.json"): Promise<ResolvedUnentropyConfig> {
  const fileContent = await readFile(configPath, "utf-8");
  let parsedJson;
  try {
    parsedJson = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (
    !parsedJson.metrics ||
    typeof parsedJson.metrics !== "object" ||
    Array.isArray(parsedJson.metrics)
  ) {
    throw new Error("Configuration must contain a 'metrics' object");
  }

  const validated = validateConfig(parsedJson);

  const resolvedMetrics: Record<string, ResolvedMetricConfig> = {};
  for (const [key, metric] of Object.entries(validated.metrics)) {
    if (metric.$ref) {
      resolvedMetrics[key] = resolveMetricReference(key, metric);
    } else {
      if (!metric.type || !metric.command) {
        throw new Error(`Metric "${key}" requires both type and command fields`);
      }
      resolvedMetrics[key] = {
        id: key,
        name: metric.name,
        type: metric.type,
        description: metric.description,
        command: metric.command,
        unit: metric.unit,
        timeout: metric.timeout,
      };
    }
  }

  const basePath = dirname(resolve(configPath));

  return {
    metrics: resolvedMetrics,
    storage: validated.storage,
    qualityGate: validated.qualityGate,
    report: validated.report,
    basePath,
    sources: validated.sources ? normalizeSourcesPatterns(validated.sources, basePath) : undefined,
  };
}
