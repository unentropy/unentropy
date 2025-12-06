import type { MetricConfig, ResolvedMetricConfig } from "../config/schema.js";
import { getMetricTemplate, listMetricTemplateIds } from "./registry.js";

export function resolveMetricReference(key: string, config: MetricConfig): ResolvedMetricConfig {
  if (config.$ref === undefined || config.$ref === null) {
    throw new Error(`resolveMetricReference called without $ref for metric "${key}"`);
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

  const command = config.command ?? builtInMetric.command;
  if (!command) {
    throw new Error(
      `Metric "${key}" requires a command.\nThe metric template "${config.$ref}" does not have a default command.\nYou must provide a command appropriate for your project.`
    );
  }

  const resolved: ResolvedMetricConfig = {
    id: key,
    name: config.name ?? builtInMetric.name,
    type: builtInMetric.type,
    description: config.description ?? builtInMetric.description,
    command,
    unit: config.unit ?? builtInMetric.unit,
    timeout: config.timeout,
  };

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
}
