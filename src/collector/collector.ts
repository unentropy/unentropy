import { runCommand } from "./runner";
import type { ResolvedMetricConfig } from "../config/schema";
import type { UnitType } from "../metrics/types";

export interface ParseResult {
  success: boolean;
  numericValue?: number;
  labelValue?: string;
  error?: string;
}

export interface FailureDetail {
  metricName: string;
  reason: string;
}

export interface CollectionResult {
  total: number;
  successful: number;
  failed: number;
  failures: FailureDetail[];
}

export function parseMetricValue(output: string, type: "numeric" | "label"): ParseResult {
  const trimmedOutput = output.trim();
  const firstLine = trimmedOutput.split("\n")[0]?.trim() ?? "";

  if (firstLine === "") {
    return {
      success: false,
      error: "Output is empty",
    };
  }

  if (type === "numeric") {
    const numericValue = parseFloat(firstLine);
    if (isNaN(numericValue)) {
      return {
        success: false,
        error: `Failed to parse numeric value from output: ${firstLine}`,
      };
    }
    return {
      success: true,
      numericValue,
    };
  } else {
    return {
      success: true,
      labelValue: firstLine,
    };
  }
}

/**
 * Collect metrics by running their commands and parsing outputs.
 * Returns collected metrics for caller to record to database.
 *
 * @param metrics - Array of metric configurations to collect
 * @returns Collection result with successful metrics and failures
 */
export async function collectMetrics(metrics: ResolvedMetricConfig[]): Promise<
  CollectionResult & {
    collectedMetrics: {
      definition: {
        name: string;
        type: "numeric" | "label";
        unit?: UnitType;
        description?: string;
      };
      value_numeric?: number;
      value_label?: string;
      collected_at: string;
      collection_duration_ms?: number;
    }[];
  }
> {
  const result: CollectionResult & {
    collectedMetrics: {
      definition: {
        name: string;
        type: "numeric" | "label";
        unit?: UnitType;
        description?: string;
      };
      value_numeric?: number;
      value_label?: string;
      collected_at: string;
      collection_duration_ms?: number;
    }[];
  } = {
    total: metrics.length,
    successful: 0,
    failed: 0,
    failures: [],
    collectedMetrics: [],
  };

  if (metrics.length === 0) {
    return result;
  }

  for (const metric of metrics) {
    try {
      const commandResult = await runCommand(metric.command, {}, metric.timeout ?? 60000);

      if (!commandResult.success) {
        const reason = commandResult.timedOut
          ? `Command timed out after ${metric.timeout ?? 60000}ms`
          : `Command failed with exit code ${commandResult.exitCode}`;

        result.failed++;
        result.failures.push({
          metricName: metric.name,
          reason,
        });
        continue;
      }

      const parseResult = parseMetricValue(commandResult.stdout, metric.type);

      if (!parseResult.success) {
        result.failed++;
        result.failures.push({
          metricName: metric.name,
          reason: `Failed to parse output: ${parseResult.error}`,
        });
        continue;
      }

      // Add to collected metrics (caller will record to DB)
      result.collectedMetrics.push({
        definition: {
          name: metric.name,
          type: metric.type,
          unit: metric.unit,
          description: metric.description,
        },
        value_numeric: parseResult.numericValue,
        value_label: parseResult.labelValue,
        collected_at: new Date().toISOString(),
        collection_duration_ms: commandResult.durationMs,
      });

      result.successful++;
    } catch (error) {
      result.failed++;
      result.failures.push({
        metricName: metric.name,
        reason: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }

  return result;
}
