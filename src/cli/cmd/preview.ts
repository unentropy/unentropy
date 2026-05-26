import { Argv } from "yargs";
import { existsSync, mkdirSync } from "fs";
import { writeFile } from "fs/promises";
import { spawn } from "child_process";
import { basename } from "path";
import { loadConfig } from "../../config/loader.js";
import { generateEmptyReport } from "../../reporter/empty-report.js";
import { generateReport } from "../../reporter/generator.js";
import { Storage } from "../../storage/storage.js";
import { cmd } from "./cmd";

export interface PreviewArgs {
  config?: string;
  output?: string;
  db?: string;
}

function openInBrowser(filePath: string): void {
  try {
    const platform = process.platform;
    const command = platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open";

    spawn(command, [filePath], {
      detached: true,
      stdio: "ignore",
    }).unref();
    console.log("🌐 Opening in browser...");
  } catch {
    // Silently catch browser opening errors for headless environments
  }
}

export const PreviewCommand = cmd({
  command: "preview",
  describe: "generate HTML report preview from config (or local database with --db)",
  builder: (yargs: Argv<PreviewArgs>) =>
    yargs
      .option("config", {
        alias: "c",
        type: "string",
        default: "unentropy.json",
        description: "Path to config file",
      })
      .option("output", {
        alias: "o",
        type: "string",
        default: "unentropy-preview",
        description: "Output directory for report",
      })
      .option("db", {
        type: "string",
        description: "Path to local SQLite database for real data report",
      }),
  async handler(argv: PreviewArgs) {
    const configPath = argv.config || "unentropy.json";
    const outputDir = argv.output || "unentropy-preview";
    const dbPath = argv.db;
    const reportPath = `${outputDir}/index.html`;

    console.log(`Checking ${configPath}...\n`);

    // Validate config exists
    if (!existsSync(configPath)) {
      console.log(`Error: Config file not found: ${configPath}`);
      console.log(`Run 'bunx unentropy init' to create one.`);
      process.exit(1);
    }

    let config;
    try {
      config = await loadConfig(configPath);
      console.log("✓ Config schema valid\n");
    } catch (error) {
      console.log("✗ Config schema invalid:");
      console.log(`  ${error instanceof Error ? error.message : String(error)}\n`);
      console.log("Fix the errors above and try again.");
      process.exit(1);
    }

    // Display metrics being included
    const metricEntries = Object.entries(config.metrics);
    console.log(`Generating preview report with ${metricEntries.length} metrics:`);

    for (const [key, metric] of metricEntries) {
      const metricName = metric.name || key;
      console.log(`  - ${key} (${metricName})`);
    }

    console.log();

    // Create output directory if it doesn't exist
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Generate report (real data from DB or synthetic preview)
    let reportHtml;

    if (dbPath) {
      if (!existsSync(dbPath)) {
        console.log(`Error: Database not found: ${dbPath}`);
        console.log(`Run metric collection first, or check the path.`);
        process.exit(1);
      }

      console.log(`Reading database: ${dbPath}\n`);

      const storage = new Storage({
        type: "sqlite-local",
        path: dbPath,
        readonly: true,
      });

      try {
        await storage.ready();
        const repoName = basename(process.cwd());
        reportHtml = generateReport(repoName, storage, config);
      } catch (error) {
        console.log(
          `Error: Report generation failed: ${error instanceof Error ? error.message : String(error)}`
        );
        process.exit(1);
      } finally {
        await storage.close();
      }
    } else {
      try {
        reportHtml = await generateEmptyReport(config);
      } catch (error) {
        console.log(
          `Error: Report generation failed: ${error instanceof Error ? error.message : String(error)}`
        );
        process.exit(1);
      }
    }

    // Write report to file
    try {
      await writeFile(reportPath, reportHtml, "utf-8");
      console.log(`✓ Preview report generated: ${reportPath}`);
    } catch (error) {
      console.log(
        `Error: Failed to write report: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }

    // Open in browser
    openInBrowser(reportPath);
  },
});
