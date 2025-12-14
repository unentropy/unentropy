/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { Storage } from "../../src/storage/storage";
import type { InsertMetricDefinition } from "../../src/storage/types";

const testDbPath = `/tmp/unentropy-query-contract-${Date.now()}.db`;

let storage: Storage;

// Generate timestamps relative to now for reliable testing
const now = new Date();
const daysAgo = (days: number) =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

// Seed data constants for verification
const SEED = {
  build1: {
    commitSha: "a".repeat(40),
    branch: "main",
    runId: "run-1",
    runNumber: 1,
    eventName: "push",
    timestamp: daysAgo(4), // 4 days ago
  },
  build2: {
    commitSha: "b".repeat(40),
    branch: "main",
    runId: "run-2",
    runNumber: 2,
    eventName: "push",
    timestamp: daysAgo(3), // 3 days ago (newer than build1)
  },
  build3: {
    commitSha: "c".repeat(40),
    branch: "feature",
    runId: "run-3",
    runNumber: 3,
    eventName: "pull_request",
    timestamp: daysAgo(2), // 2 days ago
  },
  build4: {
    commitSha: "d".repeat(40),
    branch: "develop",
    runId: "run-4",
    runNumber: 4,
    eventName: "push",
    timestamp: daysAgo(1), // 1 day ago (newest)
  },
  metrics: {
    coverage: {
      id: "coverage",
      type: "numeric",
      unit: "percent",
      description: "Code coverage",
    } as InsertMetricDefinition,
    status: { id: "status", type: "label", description: "Build status" } as InsertMetricDefinition,
    size: {
      id: "size",
      type: "numeric",
      unit: "bytes",
      description: "Bundle size",
    } as InsertMetricDefinition,
  },
};

// Track build IDs for verification (initialized to 0, set in beforeAll)
const buildIds = {
  build1: 0,
  build2: 0,
  build3: 0,
  build4: 0,
};

// Shape assertion helpers
function assertBuildContextShape(obj: unknown): void {
  expect(obj).toHaveProperty("id");
  expect(obj).toHaveProperty("commit_sha");
  expect(obj).toHaveProperty("branch");
  expect(obj).toHaveProperty("run_id");
  expect(obj).toHaveProperty("run_number");
  expect(obj).toHaveProperty("event_name");
  expect(obj).toHaveProperty("timestamp");
}

function assertTimeSeriesRowShape(obj: unknown): void {
  expect(obj).toHaveProperty("id");
  expect(obj).toHaveProperty("metric_id");
  expect(obj).toHaveProperty("build_id");
  expect(obj).toHaveProperty("value_numeric");
  expect(obj).toHaveProperty("value_label");
  expect(obj).toHaveProperty("metric_name");
  expect(obj).toHaveProperty("commit_sha");
  expect(obj).toHaveProperty("branch");
  expect(obj).toHaveProperty("run_number");
  expect(obj).toHaveProperty("build_timestamp");
}

function assertMetricValueWithNameShape(obj: unknown): void {
  expect(obj).toHaveProperty("id");
  expect(obj).toHaveProperty("metric_id");
  expect(obj).toHaveProperty("build_id");
  expect(obj).toHaveProperty("value_numeric");
  expect(obj).toHaveProperty("value_label");
  expect(obj).toHaveProperty("metric_name");
}

// Helper to assert defined and return for chaining
function assertDefined<T>(value: T | undefined | null, message?: string): T {
  expect(value, message).toBeDefined();
  return value as T;
}

describe("Storage Query Contracts", () => {
  beforeAll(async () => {
    storage = new Storage({ type: "sqlite-local", path: testDbPath });
    await storage.initialize();

    const repo = storage.getRepository();

    // Build 1: Push on main with coverage + status
    buildIds.build1 = await repo.recordBuild(
      {
        commit_sha: SEED.build1.commitSha,
        branch: SEED.build1.branch,
        run_id: SEED.build1.runId,
        run_number: SEED.build1.runNumber,
        event_name: SEED.build1.eventName,
        timestamp: SEED.build1.timestamp,
      },
      [
        { definition: SEED.metrics.coverage, value_numeric: 85.5 },
        { definition: SEED.metrics.status, value_label: "success" },
      ]
    );

    // Build 2: Push on main with coverage only (newer)
    buildIds.build2 = await repo.recordBuild(
      {
        commit_sha: SEED.build2.commitSha,
        branch: SEED.build2.branch,
        run_id: SEED.build2.runId,
        run_number: SEED.build2.runNumber,
        event_name: SEED.build2.eventName,
        timestamp: SEED.build2.timestamp,
      },
      [{ definition: SEED.metrics.coverage, value_numeric: 87.0 }]
    );

    // Build 3: Pull request on feature branch
    buildIds.build3 = await repo.recordBuild(
      {
        commit_sha: SEED.build3.commitSha,
        branch: SEED.build3.branch,
        run_id: SEED.build3.runId,
        run_number: SEED.build3.runNumber,
        event_name: SEED.build3.eventName,
        timestamp: SEED.build3.timestamp,
      },
      [{ definition: SEED.metrics.coverage, value_numeric: 90.0 }]
    );

    // Build 4: Push on develop branch
    buildIds.build4 = await repo.recordBuild(
      {
        commit_sha: SEED.build4.commitSha,
        branch: SEED.build4.branch,
        run_id: SEED.build4.runId,
        run_number: SEED.build4.runNumber,
        event_name: SEED.build4.eventName,
        timestamp: SEED.build4.timestamp,
      },
      [
        { definition: SEED.metrics.coverage, value_numeric: 82.0 },
        { definition: SEED.metrics.size, value_numeric: 1024 },
      ]
    );
  });

  afterAll(async () => {
    await storage.close();
    if (existsSync(testDbPath)) {
      await unlink(testDbPath);
    }
    // Clean up WAL files
    for (const suffix of ["-shm", "-wal"]) {
      const walPath = testDbPath + suffix;
      if (existsSync(walPath)) {
        await unlink(walPath);
      }
    }
  });

  // ============================================================
  // Scenario 1: recordBuild Contract
  // ============================================================
  describe("recordBuild contract", () => {
    it("returns valid build ID", () => {
      expect(buildIds.build1).toBeGreaterThan(0);
      expect(buildIds.build2).toBeGreaterThan(0);
      expect(buildIds.build3).toBeGreaterThan(0);
      expect(buildIds.build4).toBeGreaterThan(0);
    });

    it("creates build context with all fields", () => {
      const repo = storage.getRepository();
      const builds = repo.getAllBuildContexts();
      const build1 = assertDefined(
        builds.find((b) => b.commit_sha === SEED.build1.commitSha),
        "build1 should exist"
      );

      expect(build1.branch).toBe(SEED.build1.branch);
      expect(build1.run_id).toBe(SEED.build1.runId);
      expect(build1.run_number).toBe(SEED.build1.runNumber);
      expect(build1.event_name).toBe(SEED.build1.eventName);
      expect(build1.timestamp).toBe(SEED.build1.timestamp);
    });

    it("creates metric definitions for new metrics", () => {
      const repo = storage.getRepository();
      const coverageDef = assertDefined(repo.getMetricDefinition("coverage"));

      expect(coverageDef.id).toBe("coverage");
      expect(coverageDef.type).toBe("numeric");
      expect(coverageDef.unit).toBe("percent");
      expect(coverageDef.description).toBe("Code coverage");
    });

    it("handles numeric and label metrics in same build", () => {
      const repo = storage.getRepository();
      const values = repo.getMetricValuesByBuildId(buildIds.build1);

      const numericMetric = assertDefined(values.find((v) => v.metric_name === "coverage"));
      const labelMetric = assertDefined(values.find((v) => v.metric_name === "status"));

      expect(numericMetric.value_numeric).toBe(85.5);
      expect(numericMetric.value_label).toBeNull();

      expect(labelMetric.value_label).toBe("success");
      expect(labelMetric.value_numeric).toBeNull();
    });
  });

  // ============================================================
  // Scenario 2: getMetricTimeSeries Contract
  // ============================================================
  describe("getMetricTimeSeries contract", () => {
    it("returns only push events with correct length", () => {
      const repo = storage.getRepository();
      const timeSeries = repo.getMetricTimeSeries("coverage");

      // 3 push events with coverage: build1, build2, build4 (build3 is PR)
      expect(timeSeries).toHaveLength(3);

      // Verify PR build is excluded
      const prBuild = timeSeries.find((t) => t.commit_sha === SEED.build3.commitSha);
      expect(prBuild).toBeUndefined();
    });

    it("includes all expected column names", () => {
      const repo = storage.getRepository();
      const timeSeries = repo.getMetricTimeSeries("coverage");

      expect(timeSeries.length).toBeGreaterThan(0);
      assertTimeSeriesRowShape(timeSeries[0]);
    });

    it("orders by timestamp ascending with correct values", () => {
      const repo = storage.getRepository();
      const timeSeries = repo.getMetricTimeSeries("coverage");

      expect(timeSeries).toHaveLength(3);

      // Verify timestamps are in ascending order
      expect(timeSeries[0]!.build_timestamp < timeSeries[1]!.build_timestamp).toBe(true);
      expect(timeSeries[1]!.build_timestamp < timeSeries[2]!.build_timestamp).toBe(true);

      // Verify the values correspond to the expected order (build1, build2, build4)
      expect(timeSeries[0]!.value_numeric).toBe(85.5); // build1
      expect(timeSeries[1]!.value_numeric).toBe(87.0); // build2
      expect(timeSeries[2]!.value_numeric).toBe(82.0); // build4
    });

    it("returns empty array for non-existent metric", () => {
      const repo = storage.getRepository();
      const timeSeries = repo.getMetricTimeSeries("non-existent-metric");

      expect(timeSeries).toHaveLength(0);
    });

    it("joins metric definition correctly (metric_name)", () => {
      const repo = storage.getRepository();
      const timeSeries = repo.getMetricTimeSeries("coverage");

      expect(timeSeries[0]!.metric_name).toBe("coverage");
    });
  });

  // ============================================================
  // Scenario 3: getBaselineMetricValue Contract
  // ============================================================
  describe("getBaselineMetricValue contract", () => {
    it("returns most recent value from reference branch", () => {
      const repo = storage.getRepository();
      const baseline = repo.getBaselineMetricValue("coverage", "main");

      // build2 is newer than build1, both on main
      expect(baseline).toBe(87.0);
    });

    it("filters by branch name exactly", () => {
      const repo = storage.getRepository();
      const developBaseline = repo.getBaselineMetricValue("coverage", "develop");

      expect(developBaseline).toBe(82.0);
    });

    it("ignores pull_request events", () => {
      const repo = storage.getRepository();
      // feature branch only has a PR event, no push
      const featureBaseline = repo.getBaselineMetricValue("coverage", "feature");

      expect(featureBaseline).toBeUndefined();
    });

    it("respects maxAgeDays parameter", () => {
      const repo = storage.getRepository();
      // With maxAgeDays = 2, builds older than 2 days are excluded
      // build1 is 4 days old, build2 is 3 days old - both excluded
      const baselineShort = repo.getBaselineMetricValue("coverage", "main", 2);
      expect(baselineShort).toBeUndefined();

      // With maxAgeDays = 10, all data should be included
      const baselineLong = repo.getBaselineMetricValue("coverage", "main", 10);
      expect(baselineLong).toBe(87.0); // build2 is newest on main
    });

    it("returns undefined for non-existent branch", () => {
      const repo = storage.getRepository();
      const baseline = repo.getBaselineMetricValue("coverage", "non-existent-branch");

      expect(baseline).toBeUndefined();
    });
  });

  // ============================================================
  // Scenario 4: getAllBuildContexts Contract
  // ============================================================
  describe("getAllBuildContexts contract", () => {
    it("returns all builds when no options", () => {
      const repo = storage.getRepository();
      const builds = repo.getAllBuildContexts();

      expect(builds).toHaveLength(4);
    });

    it("filters to push events when onlyWithMetrics=true", () => {
      const repo = storage.getRepository();
      const builds = repo.getAllBuildContexts({ onlyWithMetrics: true });

      // Only push events: build1, build2, build4 (build3 is PR)
      expect(builds).toHaveLength(3);

      const prBuild = builds.find((b) => b.commit_sha === SEED.build3.commitSha);
      expect(prBuild).toBeUndefined();
    });

    it("returns builds ordered by timestamp with correct shape", () => {
      const repo = storage.getRepository();
      const builds = repo.getAllBuildContexts();

      // Verify shape
      for (const build of builds) {
        assertBuildContextShape(build);
        expect(typeof build.id).toBe("number");
        expect(typeof build.commit_sha).toBe("string");
        expect(typeof build.branch).toBe("string");
        expect(typeof build.run_id).toBe("string");
        expect(typeof build.run_number).toBe("number");
        expect(typeof build.timestamp).toBe("string");
      }

      // Verify timestamps are in ascending order
      for (let i = 1; i < builds.length; i++) {
        expect(builds[i]!.timestamp > builds[i - 1]!.timestamp).toBe(true);
      }

      // Verify the commit SHAs correspond to expected order
      expect(builds[0]!.commit_sha).toBe(SEED.build1.commitSha);
      expect(builds[1]!.commit_sha).toBe(SEED.build2.commitSha);
      expect(builds[2]!.commit_sha).toBe(SEED.build3.commitSha);
      expect(builds[3]!.commit_sha).toBe(SEED.build4.commitSha);
    });
  });

  // ============================================================
  // Scenario 5: getMetricValuesByBuildId Contract
  // ============================================================
  describe("getMetricValuesByBuildId contract", () => {
    it("returns all metrics for specific build", () => {
      const repo = storage.getRepository();
      const values = repo.getMetricValuesByBuildId(buildIds.build1);

      // build1 has coverage + status
      expect(values).toHaveLength(2);
    });

    it("includes metric_name from join", () => {
      const repo = storage.getRepository();
      const values = repo.getMetricValuesByBuildId(buildIds.build1);

      assertMetricValueWithNameShape(values[0]);
      expect(values.some((v) => v.metric_name === "coverage")).toBe(true);
      expect(values.some((v) => v.metric_name === "status")).toBe(true);
    });

    it("returns empty array for non-existent build", () => {
      const repo = storage.getRepository();
      const values = repo.getMetricValuesByBuildId(99999);

      expect(values).toHaveLength(0);
    });
  });

  // ============================================================
  // Scenario 6: getAllMetricValues Contract
  // ============================================================
  describe("getAllMetricValues contract", () => {
    it("returns all values across all builds", () => {
      const repo = storage.getRepository();
      const values = repo.getAllMetricValues();

      // build1: 2, build2: 1, build3: 1, build4: 2 = 6 total
      expect(values).toHaveLength(6);
    });

    it("includes metric_name from join", () => {
      const repo = storage.getRepository();
      const values = repo.getAllMetricValues();

      for (const value of values) {
        assertMetricValueWithNameShape(value);
        expect(typeof value.metric_name).toBe("string");
      }
    });

    it("orders by build_id", () => {
      const repo = storage.getRepository();
      const values = repo.getAllMetricValues();

      // Verify ordering is consistent (build_id ascending)
      let prevBuildId = 0;
      for (const value of values) {
        expect(value.build_id).toBeGreaterThanOrEqual(prevBuildId);
        prevBuildId = value.build_id;
      }
    });
  });

  // ============================================================
  // Scenario 7: Column Name Mapping Contract (Critical for Drizzle)
  // ============================================================
  describe("Column Name Mapping Contract", () => {
    it("build contexts use snake_case columns", () => {
      const repo = storage.getRepository();
      const builds = repo.getAllBuildContexts();
      const build = builds[0];

      // Verify snake_case column names
      expect(build).toHaveProperty("commit_sha");
      expect(build).toHaveProperty("run_id");
      expect(build).toHaveProperty("run_number");
      expect(build).toHaveProperty("event_name");

      // Verify camelCase is NOT used
      expect(build).not.toHaveProperty("commitSha");
      expect(build).not.toHaveProperty("runId");
      expect(build).not.toHaveProperty("runNumber");
      expect(build).not.toHaveProperty("eventName");
    });

    it("metric definitions use expected columns", () => {
      const repo = storage.getRepository();
      const def = repo.getMetricDefinition("coverage");

      expect(def).toHaveProperty("id");
      expect(def).toHaveProperty("type");
      expect(def).toHaveProperty("unit");
      expect(def).toHaveProperty("description");
    });

    it("metric values use snake_case columns", () => {
      const repo = storage.getRepository();
      const values = repo.getMetricValuesByBuildId(buildIds.build1);
      const value = values[0];

      expect(value).toHaveProperty("metric_id");
      expect(value).toHaveProperty("build_id");
      expect(value).toHaveProperty("value_numeric");
      expect(value).toHaveProperty("value_label");

      // Verify camelCase is NOT used
      expect(value).not.toHaveProperty("metricId");
      expect(value).not.toHaveProperty("buildId");
      expect(value).not.toHaveProperty("valueNumeric");
      expect(value).not.toHaveProperty("valueLabel");
    });

    it("time series uses aliased column build_timestamp", () => {
      const repo = storage.getRepository();
      const timeSeries = repo.getMetricTimeSeries("coverage");
      const row = timeSeries[0];

      expect(row).toHaveProperty("build_timestamp");
      // The original column is "timestamp" but it's aliased to "build_timestamp"
      expect(row).not.toHaveProperty("buildTimestamp");
    });
  });

  // ============================================================
  // Scenario 8: NULL Handling Contract
  // ============================================================
  describe("NULL Handling Contract", () => {
    it("optional unit can be null", () => {
      const repo = storage.getRepository();
      const statusDef = assertDefined(repo.getMetricDefinition("status"));

      // Status metric has no unit
      expect(statusDef.unit).toBeNull();
    });
  });
});
