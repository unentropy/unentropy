#!/usr/bin/env bun

/**
 * Development server for working on HTML report templates.
 *
 * Usage:
 *   bun run dev:report
 *
 * This script:
 * 1. Generates the full-featured fixture with test data
 * 2. Serves the report at http://localhost:3000
 * 3. Watches for changes via `bun --watch` (restart on file change)
 *
 * When you edit files in src/reporter/templates/, the script restarts
 * and regenerates the report. Refresh your browser to see changes.
 */

import { Storage } from "../src/storage/storage";
import { SqliteDatabaseAdapter } from "../src/storage/adapters/sqlite";
import { generateReport } from "../src/reporter/generator";
import type { UnitType } from "../src/metrics/types";

// Import template components to trigger watch on changes
// These imports ensure bun --watch detects changes to templates
import "../src/reporter/templates/default/components/index";
// charts.js is imported via text import in ChartScripts.tsx, so it's already watched

const PORT = 3000;
const DB_PATH = "tests/fixtures/visual-review/full-featured/full-featured.db";

interface MetricGenerator {
  name: string;
  type: "numeric" | "label";
  description: string;
  unit?: UnitType;
  valueGenerator: (buildIndex: number) => number | string | null;
}

const METRIC_GENERATORS: MetricGenerator[] = [
  {
    name: "test-coverage",
    type: "numeric",
    description: "Percentage of code covered by tests",
    unit: "percent",
    valueGenerator: (i) => 75 + Math.sin(i * 0.3) * 10 + i * 0.4,
  },
  {
    name: "bundle-size",
    type: "numeric",
    description: "JavaScript bundle size in KB",
    unit: "bytes",
    valueGenerator: (i) => (250 - Math.cos(i * 0.2) * 20 - i * 0.5) * 1024,
  },
  {
    name: "build-status",
    type: "label",
    description: "CI build result",
    valueGenerator: (i) => (i % 7 === 0 ? "failure" : i % 10 === 0 ? "warning" : "success"),
  },
  {
    name: "primary-language",
    type: "label",
    description: "Most used programming language",
    valueGenerator: (i) =>
      ["TypeScript", "JavaScript", "TypeScript", "TypeScript", "Python"][i % 5] || "TypeScript",
  },
  {
    name: "api-response-time",
    type: "numeric",
    description: "Average API response time (sparse data)",
    unit: "duration",
    valueGenerator: (i) => {
      const sparseBuilds = [0, 1, 2, 3, 7, 8, 9, 10, 14, 15, 16, 17, 21, 22, 23, 24];
      if (!sparseBuilds.includes(i)) return null;
      return (140 - i * 1.2 + Math.sin(i * 0.5) * 8) / 1000;
    },
  },
];

const BUILD_COUNT = 25;

async function generateFixtureData(): Promise<Storage> {
  const fs = await import("fs/promises");
  try {
    await fs.unlink(DB_PATH);
  } catch {}

  const db = new Storage({
    type: "sqlite-local",
    path: DB_PATH,
  });
  await db.ready();

  const adapter = new SqliteDatabaseAdapter(db.getConnection());
  const baseTimestamp = new Date("2025-01-01T00:00:00Z").getTime();
  const dayInMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < BUILD_COUNT; i++) {
    const buildTimestamp = new Date(baseTimestamp + i * dayInMs).toISOString();
    const commitSha = `abc${i.toString().padStart(4, "0")}def0123456789012345678901234`;

    const buildId = adapter.insertBuildContext({
      commit_sha: commitSha,
      branch: "main",
      run_id: `run-${i + 1000}`,
      run_number: i + 1,
      event_name: "push",
      timestamp: buildTimestamp,
    });

    for (const metricGen of METRIC_GENERATORS) {
      const metricDef = adapter.upsertMetricDefinition({
        id: metricGen.name,
        type: metricGen.type,
        description: metricGen.description,
        unit: metricGen.unit || null,
      });

      const value = metricGen.valueGenerator(i);
      if (value === null) continue;

      adapter.insertMetricValue({
        metric_id: metricDef.id,
        build_id: buildId,
        value_numeric: metricGen.type === "numeric" ? Number(value) : null,
        value_label: metricGen.type === "label" ? String(value) : null,
      });
    }
  }

  return db;
}

async function main(): Promise<void> {
  console.log("\n📊 Unentropy Report Dev Server\n");
  console.log("Generating fixture data...");

  const db = await generateFixtureData();
  const html = generateReport(db, {
    repository: "unentropy/dev-preview",
  });
  await db.close();

  console.log(`Generated report (${html.length} bytes)`);

  const server = Bun.serve({
    port: PORT,
    fetch() {
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    },
  });

  console.log(`\nServing at: http://localhost:${server.port}`);
  console.log("\nWatching for changes in src/reporter/templates/");
  console.log("Edit templates and refresh browser to see changes.\n");
  console.log("Press Ctrl+C to stop.\n");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
