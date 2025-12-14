#!/usr/bin/env bun

import { Storage } from "../src/storage/storage";
import { generateReport } from "../src/reporter/generator";
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import type { UnitType } from "../src/metrics/types";

interface MetricInput {
  definition: {
    id: string;
    type: "numeric" | "label";
    description?: string;
    unit?: UnitType;
  };
  value_numeric?: number;
  value_label?: string;
}

interface FixtureConfig {
  name: string;
  dbPath: string;
  outputPath: string;
  buildCount: number;
  timestampGenerator?: (buildIndex: number, baseTimestamp: number) => Date;
  metricGenerators: {
    name: string;
    type: "numeric" | "label";
    description: string;
    unit?: UnitType;
    valueGenerator: (buildIndex: number) => number | string | null;
  }[];
}

const FIXTURES: Record<string, FixtureConfig> = {
  minimal: {
    name: "minimal",
    dbPath: "tests/fixtures/visual-review/minimal/minimal.db",
    outputPath: "tests/fixtures/visual-review/minimal/report.html",
    buildCount: 5,
    metricGenerators: [
      {
        name: "test-coverage",
        type: "numeric",
        description: "Code coverage percentage",
        unit: "percent",
        valueGenerator: (i) => 82.1 + i * 0.85,
      },
    ],
  },

  "full-featured": {
    name: "full-featured",
    dbPath: "tests/fixtures/visual-review/full-featured/full-featured.db",
    outputPath: "tests/fixtures/visual-review/full-featured/report.html",
    buildCount: 25,
    metricGenerators: [
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
        description: "Average API response time (sparse data - only collected on some builds)",
        unit: "duration",
        valueGenerator: (i) => {
          // Create clusters of data points with gaps to showcase discontinuity
          // Cluster 1: builds 0-3 (4 consecutive points)
          // Gap: builds 4-6
          // Cluster 2: builds 7-10 (4 consecutive points)
          // Gap: builds 11-13
          // Cluster 3: builds 14-17 (4 consecutive points)
          // Gap: builds 18-20
          // Cluster 4: builds 21-24 (4 consecutive points)
          const sparseBuilds = [0, 1, 2, 3, 7, 8, 9, 10, 14, 15, 16, 17, 21, 22, 23, 24];
          if (!sparseBuilds.includes(i)) return null;
          // Create a trend: starting around 140ms, gradually improving to ~110ms with some variation
          // Convert from milliseconds to seconds for duration unit
          return (140 - i * 1.2 + Math.sin(i * 0.5) * 8) / 1000;
        },
      },
    ],
  },

  "sparse-data": {
    name: "sparse-data",
    dbPath: "tests/fixtures/visual-review/sparse-data/sparse-data.db",
    outputPath: "tests/fixtures/visual-review/sparse-data/report.html",
    buildCount: 3,
    metricGenerators: [
      {
        name: "test-coverage",
        type: "numeric",
        description: "Code coverage percentage",
        unit: "percent",
        valueGenerator: (i) => [78.5, 82.1, 85.3][i] || 80,
      },
      {
        name: "build-status",
        type: "label",
        description: "CI build result",
        valueGenerator: (i) => ["success", "failure", "success"][i] || "success",
      },
    ],
  },

  "edge-cases": {
    name: "edge-cases",
    dbPath: "tests/fixtures/visual-review/edge-cases/edge-cases.db",
    outputPath: "tests/fixtures/visual-review/edge-cases/report.html",
    buildCount: 10,
    metricGenerators: [
      {
        name: "test-coverage",
        type: "numeric",
        description:
          "This is a very long description that tests how the template handles descriptions with many characters and ensures that the layout doesn't break when displaying lengthy explanatory text about what a particular metric represents",
        unit: "percent",
        valueGenerator: () => 0,
      },
      {
        name: "bundle-size-kb",
        type: "numeric",
        description: "Bundle size with special chars: @/\\*",
        unit: "bytes",
        valueGenerator: () => 9999999.99 * 1024,
      },
      {
        name: "flatline-metric",
        type: "numeric",
        description: "A metric that never changes",
        unit: "integer",
        valueGenerator: () => 100,
      },
      {
        name: "negative-metric",
        type: "numeric",
        description: "Metric with negative values",
        unit: "decimal",
        valueGenerator: (i) => -50 + i * 1.5,
      },
      {
        name: "special-chars-label",
        type: "label",
        description: "Label with special characters: <script>alert('xss')</script>",
        valueGenerator: (i) =>
          ["<script>alert('xss')</script>", "normal-value", '"quoted"', "apostrophe's", "&amp;"][
            i % 5
          ] || "normal",
      },
    ],
  },

  "huge-report": {
    name: "huge-report",
    dbPath: "tests/fixtures/visual-review/huge-report/huge-report.db",
    outputPath: "tests/fixtures/visual-review/huge-report/report.html",
    buildCount: 3000,
    timestampGenerator: (buildIndex, baseTimestamp) => {
      const dayInMs = 24 * 60 * 60 * 1000;
      const hourInMs = 60 * 60 * 1000;

      const dayOffset = Math.floor(buildIndex / 4);
      const buildOfDay = buildIndex % 4;

      const dayStart = baseTimestamp + dayOffset * dayInMs;
      const date = new Date(dayStart);
      const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;

      if (isWeekend && buildOfDay >= 2) {
        return new Date(dayStart + (8 + buildOfDay * 2) * hourInMs);
      }

      const workingHourOffsets = [9, 11, 14, 17];
      const hourOffset = workingHourOffsets[buildOfDay] || 12;
      const minuteVariation = Math.floor((buildIndex * 37) % 60);

      return new Date(dayStart + hourOffset * hourInMs + minuteVariation * 60 * 1000);
    },
    metricGenerators: [
      {
        name: "test-coverage",
        type: "numeric",
        description: "Code coverage percentage",
        unit: "percent",
        valueGenerator: (i) => {
          const progress = i / 3000;
          return 45 + 47 * (1 - Math.exp(-progress * 4));
        },
      },
      {
        name: "bundle-size",
        type: "numeric",
        description: "Production JavaScript bundle size",
        unit: "bytes",
        valueGenerator: (i) => {
          let baseSize = 180 * 1024;
          const growthRate = 900;

          baseSize += i * growthRate;

          if (i > 800) baseSize *= 0.82;
          if (i > 1600) baseSize *= 0.85;
          if (i > 2400) baseSize *= 0.88;

          return baseSize;
        },
      },
      {
        name: "build-duration",
        type: "numeric",
        description: "CI pipeline execution time",
        unit: "duration",
        valueGenerator: (i) => {
          let duration = 120 + i * 0.15;

          if (i > 1000) duration -= 180;
          if (i > 2000) duration -= 120;

          return Math.max(90, duration);
        },
      },
      {
        name: "active-contributors",
        type: "numeric",
        description: "Number of unique contributors in past 30 days",
        unit: "integer",
        valueGenerator: (i) => {
          const progress = i / 3000;
          const logisticGrowth = 15 / (1 + Math.exp(-10 * (progress - 0.5)));
          const noise = Math.sin(i * 0.1) * 0.5;
          return Math.max(2, Math.min(15, Math.round(2 + logisticGrowth + noise)));
        },
      },
      {
        name: "dependency-count",
        type: "numeric",
        description: "Total number of npm dependencies",
        unit: "integer",
        valueGenerator: (i) => {
          const baseGrowth = 50 + i * 0.125;
          const noise = Math.sin(i * 0.05) * 3;
          return Math.round(baseGrowth + noise);
        },
      },
      {
        name: "deployment-target",
        type: "label",
        description: "Deployment environment for this build",
        valueGenerator: (i) => {
          const rand = (i * 17 + 13) % 100;
          if (rand < 65) return "staging";
          if (rand < 95) return "production";
          return "canary";
        },
      },
    ],
  },
};

function calculateBaseTimestamp(endDate: Date, config: FixtureConfig): number {
  const dayInMs = 24 * 60 * 60 * 1000;

  if (config.timestampGenerator) {
    // For fixtures with custom timestamp generators (e.g., huge-report),
    // estimate the time span and work backwards
    if (config.name === "huge-report") {
      // huge-report has ~4 builds per day, so approximate the total days
      const estimatedDays = Math.ceil(config.buildCount / 4);
      return endDate.getTime() - estimatedDays * dayInMs;
    }

    // For other custom generators, use a simple backward calculation
    return endDate.getTime() - config.buildCount * dayInMs;
  }

  // For simple fixtures, calculate exact base timestamp
  // Each build is 1 day apart, so subtract (buildCount - 1) days
  return endDate.getTime() - (config.buildCount - 1) * dayInMs;
}

async function generateFixture(config: FixtureConfig): Promise<void> {
  console.log(`\n📦 Generating fixture: ${config.name}`);
  console.log(`  Database: ${config.dbPath}`);
  console.log(`  Output: ${config.outputPath}`);

  const fs = await import("fs/promises");
  try {
    await fs.unlink(config.dbPath);
  } catch {}

  const db = new Storage({
    type: "sqlite-local",
    path: config.dbPath,
  });
  await db.ready();

  const repo = db.getRepository();

  const hourInMs = 60 * 60 * 1000;
  const dayInMs = 24 * 60 * 60 * 1000;

  // Calculate base timestamp to end approximately 1 hour before now
  const endDate = new Date(Date.now() - hourInMs);
  const baseTimestamp = calculateBaseTimestamp(endDate, config);

  const buildInterval = config.buildCount > 10 ? 1 : 1;

  for (let i = 0; i < config.buildCount; i++) {
    const buildDate = config.timestampGenerator
      ? config.timestampGenerator(i, baseTimestamp)
      : new Date(baseTimestamp + i * buildInterval * dayInMs);
    const buildTimestamp = buildDate.toISOString();
    const commitSha = `abc${i.toString().padStart(4, "0")}def0123456789012345678901234`;

    const metrics: MetricInput[] = [];

    for (const metricGen of config.metricGenerators) {
      const value = metricGen.valueGenerator(i);
      if (value === null) continue;

      metrics.push({
        definition: {
          id: metricGen.name,
          type: metricGen.type,
          description: metricGen.description,
          unit: metricGen.unit || undefined,
        },
        value_numeric: metricGen.type === "numeric" ? Number(value) : undefined,
        value_label: metricGen.type === "label" ? String(value) : undefined,
      });
    }

    await repo.recordBuild(
      {
        commit_sha: commitSha,
        branch: "main",
        run_id: `run-${i + 1000}`,
        run_number: i + 1,
        event_name: "push",
        timestamp: buildTimestamp,
      },
      metrics
    );
  }

  console.log(
    `  ✅ Generated ${config.buildCount} builds with ${config.metricGenerators.length} metrics each`
  );

  const html = generateReport(db, {
    repository: `unentropy/fixture-${config.name}`,
  });

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
