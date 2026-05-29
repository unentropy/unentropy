import type { Argv } from "yargs";
import { existsSync, readFileSync } from "fs";
import { loadConfig } from "../../config/loader.js";
import { Storage } from "../../storage/storage.js";
import { buildIngestPlan, ingest } from "../../collector/import/ingester.js";
import { ShallowCloneError } from "../../collector/import/commit-resolver.js";
import { formatSummary, formatWarnings } from "../../collector/import/summary.js";
import type { IngestSummary } from "../../collector/import/types.js";
import { cmd } from "./cmd";
import { SeedWorkflowCommand } from "./import-seed-workflow";

export interface ImportArgs {
  jsonl?: string;
  output?: string;
  config?: string;
  strict?: boolean;
  "dry-run"?: boolean;
  "trend-branch"?: string;
}

const IngestJsonlCommand = cmd({
  command: "$0 <jsonl>",
  describe: "ingest canonical JSONL metric records into a local SQLite database",
  builder: (yargs: Argv<ImportArgs>) =>
    yargs
      .positional("jsonl", {
        type: "string",
        description: "path to canonical JSONL file",
      })
      .option("output", {
        alias: "o",
        type: "string",
        description: "target SQLite database (created if missing)",
      })
      .option("config", {
        alias: "c",
        type: "string",
        default: "unentropy.json",
        description: "path to unentropy.json",
      })
      .option("dry-run", {
        type: "boolean",
        default: false,
        description: "validate and report; do not write",
      })
      .option("strict", {
        type: "boolean",
        default: false,
        description: "abort on first invalid record",
      })
      .option("trend-branch", {
        type: "string",
        default: "main",
        description: "branch used for nearest-commit fallback",
      }),
  async handler(argv: ImportArgs) {
    const jsonlPath = argv.jsonl;
    const outputPath = argv.output;
    const configPath = argv.config ?? "unentropy.json";
    const trendBranch = argv["trend-branch"] ?? "main";
    const dryRun = !!argv["dry-run"];
    const strict = !!argv.strict;

    if (!jsonlPath) {
      console.error("Error: JSONL path is required");
      process.exit(1);
    }
    if (!outputPath) {
      console.error("Error: --output is required");
      process.exit(1);
    }

    if (!existsSync(jsonlPath)) {
      console.error(`Error: JSONL file not found: ${jsonlPath}`);
      process.exit(1);
    }

    if (!existsSync(configPath)) {
      console.error(`Error: Config file not found: ${configPath}`);
      console.error(`Run 'bunx unentropy init' to create one.`);
      process.exit(1);
    }

    let declaredMetricIds: Set<string>;
    try {
      const config = await loadConfig(configPath);
      declaredMetricIds = new Set(Object.keys(config.metrics));
    } catch (error) {
      console.error(
        `Error: Config invalid: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }

    const jsonl = readFileSync(jsonlPath, "utf-8");

    if (dryRun) {
      try {
        const plan = buildIngestPlan(jsonl, { trendBranch, declaredMetricIds });
        emitWarnings(plan.summary, jsonlPath);
        console.log(formatSummary(plan.summary, { jsonlPath, outputPath, dryRun: true }));
        const failed = strict && (plan.summary.invalidRecords > 0 || plan.summary.skipped > 0);
        process.exit(failed ? 1 : 0);
      } catch (err) {
        handleResolverError(err);
      }
      return;
    }

    let storage: Storage;
    try {
      storage = new Storage({ type: "sqlite-local", path: outputPath });
      await storage.ready();
    } catch (error) {
      console.error(
        `Error: Failed to open database at ${outputPath}: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }

    try {
      const summary = ingest(storage, jsonl, {
        trendBranch,
        strict,
        declaredMetricIds,
      });
      await storage.persist();
      await storage.close();

      emitWarnings(summary, jsonlPath);
      console.log(formatSummary(summary, { jsonlPath, outputPath, dryRun: false }));

      const failed = strict && (summary.invalidRecords > 0 || summary.skipped > 0);
      process.exit(failed ? 1 : 0);
    } catch (err) {
      await storage.close().catch(() => undefined);
      handleResolverError(err);
    }
  },
});

export const ImportCommand = cmd({
  command: "import",
  describe: "import historical metric data from canonical JSONL",
  builder: (yargs: Argv) =>
    yargs.command(IngestJsonlCommand).command(SeedWorkflowCommand).demandCommand(),
  async handler() {
    // handled by subcommands
  },
});

function emitWarnings(summary: IngestSummary, jsonlPath: string): void {
  for (const w of formatWarnings(summary, jsonlPath)) {
    console.error(w);
  }
}

function handleResolverError(err: unknown): never {
  if (err instanceof ShallowCloneError) {
    console.error(`error: ${err.message}`);
    console.error(`       no records were written`);
    process.exit(1);
  }
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
