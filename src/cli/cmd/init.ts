import type { Argv } from "yargs";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cmd } from "./cmd";
import {
  detectProjectType,
  isValidProjectType,
  getValidProjectTypes,
  type ProjectType,
} from "../init/detector";
import { getTemplateForProjectType } from "../init/templates";
import {
  STORAGE_TYPE_MAPPING,
  generateMetricsWorkflow,
  generateQualityGateWorkflow,
  formatWorkflowAsYaml,
  generateS3Secrets,
  type StorageType,
} from "../init/output";

interface InitArgs {
  type?: string;
  storage?: string;
  force?: boolean;
  "dry-run"?: boolean;
}

export const InitCommand = cmd({
  command: "init",
  describe: "initialize unentropy.json configuration",
  builder: (yargs: Argv<InitArgs>) => {
    return yargs.options({
      type: {
        alias: "t",
        type: "string",
        description: "force project type (javascript, php, go, python)",
      },
      storage: {
        alias: "s",
        type: "string",
        description: "storage backend type (artifact, s3, local)",
        default: "artifact",
      },
      force: {
        alias: "f",
        type: "boolean",
        description: "overwrite existing config",
        default: false,
      },
      "dry-run": {
        type: "boolean",
        description: "preview without writing",
        default: false,
      },
    });
  },
  async handler(argv: InitArgs) {
    try {
      const cwd = process.cwd();
      const configPath = join(cwd, "unentropy.json");

      if (existsSync(configPath) && !argv.force && !argv["dry-run"]) {
        console.error("Error: unentropy.json already exists. Use --force to overwrite.");
        process.exit(1);
      }

      let projectType: ProjectType;
      let detectedFiles: string[] = [];

      if (argv.type) {
        if (!isValidProjectType(argv.type)) {
          const validTypes = getValidProjectTypes().join(", ");
          console.error(`Error: Invalid project type "${argv.type}".`);
          console.error(`Valid types: ${validTypes}`);
          process.exit(1);
        }
        projectType = argv.type;
        console.log(`Using forced project type: ${argv.type}`);
        console.log();
      } else {
        const detection = detectProjectType(cwd);
        if (!detection) {
          console.error("Error: Could not detect project type.");
          console.error("Use --type to specify: javascript, php, go, or python");
          process.exit(1);
        }
        projectType = detection.type;
        detectedFiles = detection.detectedFiles;
        console.log(`Detected project type: ${projectType} (found: ${detectedFiles.join(", ")})`);
        console.log();
      }

      if (!["artifact", "s3", "local"].includes(argv.storage || "")) {
        console.error(`Error: Invalid storage type "${argv.storage}".`);
        console.error("Valid types: artifact, s3, local");
        process.exit(1);
      }
      const storageType = argv.storage as StorageType;

      const template = getTemplateForProjectType(projectType);

      const config = {
        metrics: template.metrics,
        storage: {
          type: STORAGE_TYPE_MAPPING[storageType],
        },
        qualityGate: template.qualityGate,
      };

      if (argv["dry-run"]) {
        console.log("Would create unentropy.json:");
        console.log();
        console.log(JSON.stringify(config, null, 2));
        console.log();
      } else {
        writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
        const metricCount = Object.keys(config.metrics).length;
        const metricNames = Object.entries(config.metrics)
          .map(([key, metric]) => `  - ${key} (${metric.name})`)
          .join("\n");
        console.log(`✓ Created unentropy.json with ${metricCount} metrics:`);
        console.log(metricNames);
        console.log();
      }

      console.log("Next steps:");
      console.log("  1. Run your tests with coverage (see commands below)");
      console.log("  2. Verify metrics collect: bunx unentropy test");
      console.log("  3. Add the workflows below to your CI");
      console.log();

      const metricsWorkflow = generateMetricsWorkflow(projectType, storageType);
      const qualityGateWorkflow = generateQualityGateWorkflow(projectType, storageType);

      console.log("────────────────────────────────────────────────────────────");
      console.log("TRACK METRICS (add to your CI for main branch)");
      console.log("────────────────────────────────────────────────────────────");
      console.log();
      console.log(formatWorkflowAsYaml(metricsWorkflow));
      console.log();

      console.log("────────────────────────────────────────────────────────────");
      console.log("QUALITY GATE (add to your CI for pull requests)");
      console.log("────────────────────────────────────────────────────────────");
      console.log();
      console.log(formatWorkflowAsYaml(qualityGateWorkflow));
      console.log();

      if (storageType === "s3") {
        console.log("────────────────────────────────────────────────────────────");
        console.log("S3 SECRETS REQUIRED");
        console.log("────────────────────────────────────────────────────────────");
        console.log();
        console.log(generateS3Secrets());
        console.log();
      }
    } catch (error) {
      console.error(`✗ Failed to initialize configuration:`);
      console.error(`  ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  },
});
