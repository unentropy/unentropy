import type { MetricConfig } from "../config/schema.js";
import { getMetricTemplate, listMetricTemplateIds } from "./registry.js";

export function resolveMetricReference(config: MetricConfig): MetricConfig {
  if (config.$ref === undefined || config.$ref === null) {
    return config;
  }

  if (config.$ref.trim() === "") {
    throw new Error(
      `Built-in metric '${config.$ref}' not found. Available metrics: coverage, function-coverage, loc, bundle-size, build-time, test-time, dependencies-count`
    );
  }

  const builtInMetric = getMetricTemplate(config.$ref);
  if (!builtInMetric) {
    throw new Error(
      `Built-in metric '${config.$ref}' not found. Available metrics: coverage, function-coverage, loc, bundle-size, build-time, test-time, dependencies-count`
    );
  }

  // Inherit id from template if not provided
  const resolvedId = config.id !== undefined ? config.id : builtInMetric.id;

  // Start with built-in metric defaults
  const resolved: MetricConfig = {
    id: resolvedId,
    name: builtInMetric.name,
    type: builtInMetric.type,
    description: builtInMetric.description,
    command: builtInMetric.command,
    unit: builtInMetric.unit,
  };

  // Apply user overrides (excluding $ref)
  if (config.name !== undefined) resolved.name = config.name;
  if (config.type !== undefined) resolved.type = config.type;
  if (config.description !== undefined) resolved.description = config.description;
  if (config.command !== undefined) resolved.command = config.command;
  if (config.unit !== undefined) resolved.unit = config.unit;
  if (config.timeout !== undefined) resolved.timeout = config.timeout;

  return resolved;
}

export function validateBuiltInReference(ref: string): void {
  if (!ref || ref.trim() === "") {
    throw new Error("Built-in metric reference cannot be empty");
  }

  const builtInMetric = getMetricTemplate(ref);
  if (!builtInMetric) {
    const availableMetrics = listMetricTemplateIds().join(", ");
    throw new Error(`Built-in metric '${ref}' not found. Available metrics: ${availableMetrics}`);
  }

  // Additional validation could be added here in the future
  // For now, we just validate that the metric exists
}

export function resolveMetric(config: MetricConfig): MetricConfig {
  return config;
}
