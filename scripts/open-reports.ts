#!/usr/bin/env bun

import { execSync } from "child_process";
import { existsSync, readdirSync, statSync } from "fs";
import { resolve } from "path";

const REVIEW_DIR = "tests/fixtures/visual-review";

function findReportFiles(): string[] {
  const results: string[] = [];
  try {
    const entries = readdirSync(REVIEW_DIR);
    for (const entry of entries) {
      const reportPath = resolve(REVIEW_DIR, entry, "report.html");
      if (statSync(resolve(REVIEW_DIR, entry)).isDirectory() && existsSync(reportPath)) {
        results.push(reportPath);
      }
    }
  } catch {
    // Directory doesn't exist yet
  }
  return results.sort();
}

function getOpenCommand(): string | null {
  const platform = process.platform;

  switch (platform) {
    case "darwin":
      return "open";
    case "linux":
      return "xdg-open";
    case "win32":
      return "start";
    default:
      return null;
  }
}

function openFile(filePath: string): void {
  const openCmd = getOpenCommand();

  if (!openCmd) {
    console.log(`📂 Open manually: ${filePath}`);
    return;
  }

  try {
    execSync(`${openCmd} "${filePath}"`, { stdio: "inherit" });
    console.log(`✅ Opened: ${filePath}`);
  } catch {
    console.log(`❌ Could not open: ${filePath}`);
    console.log(`📂 Open manually: ${filePath}`);
  }
}

async function main(): Promise<void> {
  const reports = findReportFiles();

  if (reports.length === 0) {
    console.log("⚠️  No reports found. Run `bun run generate-fixtures` first.");
    return;
  }

  console.log(`🌐 Opening ${reports.length} visual review reports...\n`);

  for (const filePath of reports) {
    openFile(filePath);
  }

  const openCmd = getOpenCommand();
  if (!openCmd) {
    console.log("\n💡 Tip: Install a platform-specific opener for your system");
  }
}

main().catch((error) => {
  console.error("❌ Error opening reports:", error);
  process.exit(1);
});
