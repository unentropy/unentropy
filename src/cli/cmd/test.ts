import { Argv } from "yargs";
import { existsSync } from "fs";
import { loadConfig } from "../../config/loader.js";
import { parseMetricValue } from "../../collector/collector.js";
import { runCommand } from "../../collector/runner.js";
import { formatValue } from "../../metrics/unit-formatter.js";
import type { UnitType } from "../../metrics/types.js";
import { cmd } from "./cmd";

export interface TestArgs {
  config?: string;
  timeout?: number;
  verbose?: boolean;
}

export interface CollectionResult {
  metricKey: string;
  metricName: string;
  success: boolean;
  value: number | string | null;
  unit?: string;
  duration: number;
  error?: string;
  command: string;
}

export interface TestSummary {
  configValid: boolean;
  configError?: string;
  results: CollectionResult[];
  totalMetrics: number;
  successCount: number;
  failureCount: number;
  totalDuration: number;
}

function formatDuration(ms: number): string {
  const seconds = ms / 1000;
  return seconds.toFixed(1) + "s";
}

function padRight(str: string, width: number): string {
  return str.padEnd(width);
}

function displayTestResults(summary: TestSummary, verbose: boolean): void {
  if (summary.configValid) {
    console.log("✓ Config schema valid\n");
  } else {
    console.log("✗ Config schema invalid:");
    console.log(`  ${summary.configError}\n`);
    return;
  }

  console.log("Collecting metrics:\n");

  const maxNameUnitLength = Math.max(
    ...summary.results.map((r) => {
      const unitStr = r.unit ? ` (${r.unit})` : "";
      return r.metricName.length + unitStr.length;
    }),
    "metric-name".length
  );

  for (const result of summary.results) {
    const statusIcon = result.success ? "✓" : "✗";
    const unitStr = result.unit ? ` (${result.unit})` : "";
    const nameWithUnit = `${result.metricName}${unitStr}`;
    const paddedNameWithUnit = padRight(nameWithUnit, maxNameUnitLength);
    const durationStr = formatDuration(result.duration);

    if (result.success) {
      // Format value using shared formatter for numeric values, or as-is for labels
      let formattedValue: string;
      if (typeof result.value === "string") {
        formattedValue = result.value;
      } else if (typeof result.value === "number") {
        formattedValue = formatValue(result.value, (result.unit as UnitType) || null);
      } else {
        formattedValue = "N/A";
      }

      console.log(`  ${statusIcon} ${paddedNameWithUnit}\t${formattedValue}  ${durationStr}`);
    } else {
      const error = result.error || "Unknown error";
      console.log(`  ${statusIcon} ${paddedNameWithUnit}\tError: ${error}`);
    }

    if (verbose && result.success) {
      console.log(`     Command: ${result.command}`);
    }
  }

  console.log();

  if (summary.failureCount === 0) {
    console.log(`All ${summary.totalMetrics} metrics collected successfully.`);
  } else {
    const plural = summary.failureCount === 1 ? "metric" : "metrics";
    console.log(`${summary.failureCount} of ${summary.totalMetrics} ${plural} failed`);
  }
}

export const TestCommand = cmd({
  command: "test",
  describe: "validate config and run all metric collections locally",
  builder: (yargs: Argv<TestArgs>) =>
    yargs
      .option("config", {
        alias: "c",
        type: "string",
        default: "unentropy.json",
        description: "Path to config file",
      })
      .option("timeout", {
        type: "number",
        default: 30000,
        description: "Per-metric timeout in milliseconds",
      })
      .option("verbose", {
        alias: "v",
        type: "boolean",
        default: false,
        description: "Show command executed for each metric",
      }),
  async handler(argv: TestArgs) {
    const configPath = argv.config || "unentropy.json";
    const timeout = argv.timeout || 30000;
    const verbose = argv.verbose || false;

    console.log(`Checking ${configPath}...\n`);

    const summary: TestSummary = {
      configValid: false,
      results: [],
      totalMetrics: 0,
      successCount: 0,
      failureCount: 0,
      totalDuration: 0,
    };

    // Validate config exists
    if (!existsSync(configPath)) {
      summary.configError = `Config file not found: ${configPath}`;
      console.log(`Error: Config file not found: ${configPath}`);
      console.log(`Run 'bunx unentropy init' to create one.`);
      process.exit(1);
    }

    let config;
    try {
      config = await loadConfig(configPath);
      summary.configValid = true;
    } catch (error) {
      summary.configError = error instanceof Error ? error.message : String(error);
      console.log(`✗ Config schema invalid:`);
      console.log(`  ${summary.configError}\n`);
      console.log("Fix the errors above and try again.");
      process.exit(1);
    }

    const metricEntries = Object.entries(config.metrics);
    summary.totalMetrics = metricEntries.length;

    const startTime = Date.now();

    for (const [metricKey, metric] of metricEntries) {
      const commandStartTime = Date.now();

      const result = await runCommand(metric.command, {}, timeout, true);
      const duration = Date.now() - commandStartTime;

      const collectionResult: CollectionResult = {
        metricKey,
        metricName: metric.name || metricKey,
        success: result.success,
        value: null,
        unit: metric.unit,
        duration,
        command: metric.command,
      };

      if (result.success) {
        const parseResult = parseMetricValue(result.stdout, metric.type);
        if (parseResult.success) {
          collectionResult.value =
            metric.type === "numeric"
              ? (parseResult.numericValue ?? null)
              : (parseResult.labelValue ?? null);
          summary.successCount++;
        } else {
          collectionResult.success = false;
          collectionResult.error = parseResult.error;
          summary.failureCount++;
        }
      } else {
        collectionResult.error = result.timedOut
          ? `Command timed out after ${timeout}ms`
          : result.stderr || "Command failed";
        summary.failureCount++;
      }

      summary.results.push(collectionResult);
    }

    summary.totalDuration = Date.now() - startTime;

    displayTestResults(summary, verbose);

    const exitCode = summary.failureCount > 0 ? 2 : 0;
    process.exit(exitCode);
  },
});
