/**
 * Development server for working on HTML report templates.
 *
 * Usage:
 *   pnpm dev:report
 *
 * This script:
 * 1. Generates the full-featured fixture with test data
 * 2. Serves the report at http://localhost:3000
 * 3. Watches for changes via `node --watch-path=src --watch-path=scripts` (restart on file change)
 *
 * When you edit files in src/reporter/templates/, the script restarts
 * and regenerates the report. Refresh your browser to see changes.
 */

import { createServer } from "node:http";
import { generateReport } from "../src/reporter/generator";
import { FIXTURES } from "./fixtures/definitions";
import { generateFixtureDatabase, createReportConfig } from "./fixtures/generator";

// Import template components to trigger watch on changes
// These imports keep the template component graph loaded by this script
import "../src/reporter/templates/default/components/index";
// charts.js is imported via text import in ChartScripts.tsx, so it's already watched

const PORT = 3000;
const FIXTURE_CONFIG = FIXTURES["full-featured"];

async function main(): Promise<void> {
  console.log("\n📊 Unentropy Report Dev Server\n");
  console.log("Generating fixture data...");

  const db = await generateFixtureDatabase(FIXTURE_CONFIG, FIXTURE_CONFIG.dbPath);
  const config = createReportConfig(FIXTURE_CONFIG.metricGenerators);

  const html = generateReport("unentropy/dev-preview", db, config);
  await db.close();

  console.log(`Generated report (${html.length} bytes)`);

  createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  }).listen(PORT);

  console.log(`\nServing at: http://localhost:${PORT}`);
  console.log("\nWatching for changes in src/reporter/templates/");
  console.log("Edit templates and refresh browser to see changes.\n");
  console.log("Press Ctrl+C to stop.\n");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
