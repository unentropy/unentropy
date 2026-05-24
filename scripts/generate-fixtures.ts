#!/usr/bin/env bun

import { generateReport } from "../src/reporter/generator";
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import { FIXTURES } from "./fixtures/definitions";
import { generateFixtureDatabase, createReportConfig } from "./fixtures/generator";
import type { FixtureConfig } from "./fixtures/definitions";

async function generateFixture(config: FixtureConfig): Promise<void> {
  console.log(`\n📦 Generating fixture: ${config.name}`);
  console.log(`  Database: ${config.dbPath}`);
  console.log(`  Output: ${config.outputPath}`);

  const db = await generateFixtureDatabase(config, config.dbPath);

  console.log(
    `  ✅ Generated ${config.buildCount} builds with ${config.metricGenerators.length} metrics each`
  );

  const reportConfig = createReportConfig(config.metricGenerators, config.report);
  const html = generateReport(`unentropy/fixture-${config.name}`, db, reportConfig);

  mkdirSync(dirname(config.outputPath), { recursive: true });
  writeFileSync(config.outputPath, html, "utf-8");
  console.log(`  ✅ HTML report generated: ${config.outputPath}`);

  await db.close();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fixtureArg = args.find((arg) => arg.startsWith("--fixture="))?.split("=")[1];

  if (fixtureArg && fixtureArg !== "all") {
    const config = FIXTURES[fixtureArg];
    if (!config) {
      console.error(`❌ Unknown fixture: ${fixtureArg}`);
      console.error(`Available fixtures: ${Object.keys(FIXTURES).join(", ")}`);
      process.exit(1);
    }
    await generateFixture(config);
  } else {
    console.log("🚀 Generating all visual test fixtures...\n");
    for (const config of Object.values(FIXTURES)) {
      await generateFixture(config);
    }
    console.log("\n✨ All fixtures generated successfully!");
    console.log("\n📖 To review reports, open:");
    console.log("   tests/fixtures/visual-review/*/report.html");
  }
}

main().catch((error) => {
  console.error("❌ Error generating fixtures:", error);
  process.exit(1);
});
