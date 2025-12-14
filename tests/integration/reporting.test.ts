import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Storage } from "../../src/storage/storage";
import { generateReport } from "../../src/reporter/generator";
import type { ResolvedUnentropyConfig } from "../../src/config/loader";
import fs from "fs";

const TEST_DB_PATH = "/tmp/test-integration-reporting.db";

// Test configuration matching the test data
const testConfig: ResolvedUnentropyConfig = {
  metrics: {
    "test-coverage": {
      id: "test-coverage",
      name: "test-coverage",
      type: "numeric",
      unit: "percent",
      description: "Code coverage percentage",
      command: "echo 85",
    },
    size: {
      id: "size",
      name: "size",
      type: "numeric",
      unit: "bytes",
      description: "Total bundle size",
      command: "echo 500",
    },
    "build-status": {
      id: "build-status",
      name: "build-status",
      type: "label",
      description: "Build status result",
      command: "echo success",
    },
  },
  storage: {
    type: "sqlite-local",
  },
};

describe("Full reporting workflow integration (Bun runtime)", () => {
  let db: Storage;

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    db = new Storage({ type: "sqlite-local", path: TEST_DB_PATH });
    await db.initialize();
    const repo = db.getRepository();

    for (let i = 0; i < 15; i++) {
      await repo.recordBuild(
        {
          commit_sha: `commit-${i}`,
          branch: "main",
          run_id: `run-${i}`,
          run_number: i + 1,
          event_name: "push",
          timestamp: new Date(Date.UTC(2025, 9, i + 1, 12, 0, 0)).toISOString(),
        },
        [
          {
            definition: {
              id: "test-coverage",
              type: "numeric",
              unit: "percent",
              description: "Code coverage percentage",
            },
            value_numeric: 80 + Math.random() * 10,
          },
          {
            definition: {
              id: "size",
              type: "numeric",
              unit: "bytes",
              description: "Total bundle size",
            },
            value_numeric: 450 + Math.random() * 50,
          },
          {
            definition: {
              id: "build-status",
              type: "label",
              description: "Build status result",
            },
            value_label: i % 10 === 0 ? "failure" : "success",
          },
        ]
      );
    }
  });

  afterAll(async () => {
    await db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  test("generates complete HTML report with multiple metrics", () => {
    const html = generateReport("test-org/test-repo", db, testConfig);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("test-org/test-repo");
    expect(html).toContain("test-coverage");
    expect(html).toContain("size");
    expect(html).toContain("Code coverage percentage");
    expect(html).toContain("Total bundle size");
  });

  test("includes semantic chart data for line charts", () => {
    const html = generateReport("test-org/test-repo", db, testConfig);

    expect(html).toContain("__chartData");
    expect(html).toContain("timeline:");
    expect(html).toContain("lineCharts:");
    expect(html).toMatch(/"id":"test-coverage"/);
    expect(html).toMatch(/"id":"size"/);
    expect(html).toContain("buildLineChart");
  });

  test("includes semantic chart data for bar charts", () => {
    const html = generateReport("test-org/test-repo", db, testConfig);

    expect(html).toContain("barCharts:");
    expect(html).toMatch(/"id":"build-status"/);
    expect(html).toContain("buildBarChart");
  });

  test("includes metadata with correct build count and date range", () => {
    const html = generateReport("test-org/test-repo", db, testConfig);

    expect(html).toContain("Builds: 15");
    expect(html).toMatch(/Oct.*2025/);
  });

  test("handles XSS in repository name", () => {
    const html = generateReport("test<script>alert('xss')</script>/repo", db, testConfig);

    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;");
  });

  test("generates self-contained HTML with CDN links", () => {
    const html = generateReport("test-org/test-repo", db, testConfig);

    expect(html).toContain("https://cdn.tailwindcss.com");
    expect(html).toContain("https://cdn.jsdelivr.net/npm/chart.js");
    expect(html).toContain("chartjs-adapter-date-fns");
  });

  test("includes responsive and dark mode classes", () => {
    const html = generateReport("test-org/test-repo", db, testConfig);

    expect(html).toContain("dark:bg-gray");
    expect(html).toContain("sm:grid-cols");
    expect(html).toContain("lg:grid-cols");
  });

  test("includes print styles", () => {
    const html = generateReport("test-org/test-repo", db, testConfig);

    expect(html).toContain("@media print");
    expect(html).toContain("page-break-inside: avoid");
  });

  test("handles empty database gracefully", async () => {
    const emptyDbPath = "/tmp/test-empty-reporting.db";
    if (fs.existsSync(emptyDbPath)) {
      fs.unlinkSync(emptyDbPath);
    }

    const emptyDb = new Storage({ type: "sqlite-local", path: emptyDbPath });
    await emptyDb.initialize();

    const html = generateReport("empty/repo", emptyDb, testConfig);

    // With config, we get preview data instead of "No metrics data"
    expect(html).toContain("Show preview data");
    expect(html).toContain("Builds: 0");

    emptyDb.close();
    fs.unlinkSync(emptyDbPath);
  });

  test("includes accessibility features", () => {
    const html = generateReport("test-org/test-repo", db, testConfig);

    expect(html).toContain("aria-label");
    expect(html).toContain('lang="en"');
    expect(html).toContain("<header");
    expect(html).toContain("<main");
    expect(html).toContain("<footer");
  });
});
