import type { Argv } from "yargs";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname } from "path";
import { loadConfig } from "../../config/loader.js";
import { cmd } from "./cmd";

export interface SeedWorkflowArgs {
  output?: string;
  force?: boolean;
  config?: string;
}

export function renderSeedWorkflow(artifactName: string): string {
  return `name: unentropy seed
on:
  push:
    branches: ["unentropy-import-*"]

permissions:
  contents: read

jobs:
  upload-seed:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/upload-artifact@v4
        with:
          name: ${artifactName}
          path: seed.db
          if-no-files-found: error
          retention-days: 90
`;
}

export const SeedWorkflowCommand = cmd({
  command: "seed-workflow",
  describe:
    "emit a ready-to-commit GitHub Actions workflow YAML for seeding the sqlite-artifact backend",
  builder: (yargs: Argv<SeedWorkflowArgs>) =>
    yargs
      .option("output", {
        alias: "o",
        type: "string",
        description: "write YAML to <path> instead of stdout",
      })
      .option("force", {
        type: "boolean",
        default: false,
        description: "overwrite <path> if it exists (ignored without --output)",
      })
      .option("config", {
        alias: "c",
        type: "string",
        default: "unentropy.json",
        description: "path to unentropy.json",
      }),
  async handler(argv: SeedWorkflowArgs) {
    const configPath = argv.config ?? "unentropy.json";

    if (!existsSync(configPath)) {
      console.error(`Error: Config file not found: ${configPath}`);
      console.error(`Run 'bunx unentropy init' to create one.`);
      process.exit(1);
    }

    let config;
    try {
      config = await loadConfig(configPath);
    } catch (error) {
      console.error(
        `Error: Config invalid: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }

    if (config.storage.type !== "sqlite-artifact") {
      console.error(`error: 'seed-workflow' only applies to the sqlite-artifact backend`);
      console.error(`       current storage.type: ${config.storage.type}`);
      console.error(
        `       for ${config.storage.type}, upload your database directly with the AWS CLI or your existing tooling`
      );
      process.exit(1);
    }

    const artifactName = readArtifactName(config.storage);
    const yaml = renderSeedWorkflow(artifactName);

    if (argv.output) {
      const target = argv.output;
      if (existsSync(target) && !argv.force) {
        console.error(`Error: ${target} already exists. Use --force to overwrite.`);
        process.exit(1);
      }
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, yaml, "utf-8");
      console.log(`Wrote ${target}`);
    } else {
      process.stdout.write(yaml);
    }
  },
});

function readArtifactName(storage: { type: string } & Record<string, unknown>): string {
  const artifact = storage["artifact"];
  if (artifact && typeof artifact === "object" && "name" in artifact) {
    const name = (artifact as Record<string, unknown>)["name"];
    if (typeof name === "string" && name.length > 0) return name;
  }
  return "unentropy-metrics";
}
