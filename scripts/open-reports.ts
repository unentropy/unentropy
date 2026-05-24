#!/usr/bin/env bun

import { execSync } from "child_process";
import { existsSync } from "fs";

const REPORT_FILES = [
  "tests/fixtures/visual-review/minimal/report.html",
  "tests/fixtures/visual-review/full-featured/report.html",
  "tests/fixtures/visual-review/sparse-data/report.html",
  "tests/fixtures/visual-review/edge-cases/report.html",
  "tests/fixtures/visual-review/sections-demo/report.html",
  "tests/fixtures/visual-review/huge-report/report.html",
  "tests/fixtures/visual-review/empty/report.html",
];

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
  console.log("🌐 Opening visual review reports...\n");

  for (const filePath of REPORT_FILES) {
    if (existsSync(filePath)) {
      openFile(filePath);
    } else {
      console.log(`⚠️  File not found: ${filePath}`);
    }
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
