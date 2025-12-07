import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { collectMetrics } from "../../src/collector/collector";
import { Storage } from "../../src/storage/storage";
import type { ResolvedMetricConfig } from "../../src/config/schema";

describe("End-to-end collection workflow", () => {
  const originalEnv = process.env;
  let storage: Storage;
  let testDbPath: string;

  beforeEach(async () => {
    const uniqueSuffix = Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    testDbPath = `/tmp/unentropy-test-${uniqueSuffix}.db`;

    process.env = {
      ...originalEnv,
      GITHUB_REPOSITORY: "user/repo",
      GITHUB_SHA: "abc123",
      GITHUB_REF: "refs/heads/main",
      GITHUB_RUN_ID: "42",
      GITHUB_RUN_NUMBER: "1",
      GITHUB_EVENT_NAME: "push",
    };

    storage = new Storage({
      type: "sqlite-local",
      path: testDbPath,
    });

    await storage.initialize();
  });

  afterEach(async () => {
    process.env = originalEnv;
    if (existsSync(testDbPath)) {
      try {
        await unlink(testDbPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  test("should collect metrics and return results", async () => {
    const metrics: Record<string, ResolvedMetricConfig> = {
      "test-coverage": {
        id: "test-coverage",
        type: "numeric",
        command: 'echo "85.5"',
        description: "Test coverage percentage",
        unit: "percent",
      },
      "build-status": {
        id: "build-status",
        type: "label",
        command: 'echo "passing"',
        description: "Build status",
      },
    };

    const buildContext = {
      commit_sha: "abc123def456abc123def456abc123def456abcd",
      branch: "test-branch",
      run_id: "999",
      run_number: 1,
      event_name: "push",
      timestamp: new Date().toISOString(),
    };

    const repository = storage.getRepository();
    const result = await collectMetrics(metrics);

    expect(result.successful).toBe(2);
    expect(result.failed).toBe(0);

    const buildId = await repository.recordBuild(buildContext, result.collectedMetrics);

    const values = storage.getRepository().getMetricValuesByBuildId(buildId);
    expect(values).toHaveLength(2);

    const coverage = values.find((v) => v.metric_name === "test-coverage");
    expect(coverage).toBeDefined();
    expect(coverage?.value_numeric).toBe(85.5);

    const status = values.find((v) => v.metric_name === "build-status");
    expect(status).toBeDefined();
    expect(status?.value_label).toBe("passing");
  }, 10000);

  test("creates metric definitions on first collection", async () => {
    const metrics: Record<string, ResolvedMetricConfig> = {
      "new-metric": { id: "new-metric", type: "numeric", command: 'echo "42"' },
    };

    const db = new Storage({ type: "sqlite-local", path: testDbPath });
    await db.initialize();

    const buildContext = {
      commit_sha: "abc123def456abc123def456abc123def456abcd",
      branch: "test-branch",
      run_id: "999",
      run_number: 1,
      timestamp: new Date().toISOString(),
    };

    const repository = db.getRepository();
    const result = await collectMetrics(metrics);
    await repository.recordBuild(buildContext, result.collectedMetrics);

    const metricDef = db.getRepository().getMetricDefinition("new-metric");
    expect(metricDef).toBeDefined();
    expect(metricDef?.id).toBe("new-metric");
    expect(metricDef?.type).toBe("numeric");
  });

  test("reuses existing metric definitions", async () => {
    const metrics: Record<string, ResolvedMetricConfig> = {
      "existing-metric": { id: "existing-metric", type: "numeric", command: 'echo "1"' },
    };

    const uniqueSuffix = Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    const testPath = `/tmp/unentropy-reuse-${uniqueSuffix}.db`;
    const db = new Storage({ type: "sqlite-local", path: testPath });
    await db.initialize();

    try {
      const repository = db.getRepository();

      const buildContext1 = {
        commit_sha: "commit1commit1commit1commit1commit1commit1",
        branch: "test-branch",
        run_id: "1",
        run_number: 1,
        timestamp: new Date().toISOString(),
      };

      const result1 = await collectMetrics(metrics);
      await repository.recordBuild(buildContext1, result1.collectedMetrics);

      const buildContext2 = {
        commit_sha: "commit2commit2commit2commit2commit2commit2",
        branch: "test-branch",
        run_id: "2",
        run_number: 2,
        timestamp: new Date().toISOString(),
      };

      const metricsRun2: Record<string, ResolvedMetricConfig> = {
        "existing-metric": { id: "existing-metric", type: "numeric", command: 'echo "2"' },
      };

      const result2 = await collectMetrics(metricsRun2);
      await repository.recordBuild(buildContext2, result2.collectedMetrics);

      const allDefs = db.getRepository().getAllMetricDefinitions();
      const existingMetrics = allDefs.filter((d: { id: string }) => d.id === "existing-metric");
      expect(existingMetrics).toHaveLength(1);

      const values = db.getRepository().getAllMetricValues();
      const existingValues = values.filter(
        (v: { metric_name: string }) => v.metric_name === "existing-metric"
      );
      expect(existingValues).toHaveLength(2);
    } finally {
      await db.close();
      if (existsSync(testPath)) {
        await unlink(testPath);
      }
    }
  }, 10000);

  test("handles mixed success and failure gracefully", async () => {
    const metrics: Record<string, ResolvedMetricConfig> = {
      success1: { id: "success1", type: "numeric", command: 'echo "10"' },
      failure: { id: "failure", type: "numeric", command: "exit 1" },
      success2: { id: "success2", type: "label", command: 'echo "ok"' },
    };

    const uniqueSuffix = Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    const testPath = `/tmp/unentropy-mixed-${uniqueSuffix}.db`;
    const db = new Storage({ type: "sqlite-local", path: testPath });
    await db.initialize();

    try {
      const buildContext = {
        commit_sha: "abc123def456abc123def456abc123def456abcd",
        branch: "test-branch",
        run_id: "999",
        run_number: 1,
        timestamp: new Date().toISOString(),
      };

      const repository = db.getRepository();
      const result = await collectMetrics(metrics);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.failures[0]?.metricName).toBe("failure");

      const buildId = await repository.recordBuild(buildContext, result.collectedMetrics);

      const values = db.getRepository().getMetricValuesByBuildId(buildId);
      expect(values).toHaveLength(2);
    } finally {
      await db.close();
      if (existsSync(testPath)) {
        await unlink(testPath);
      }
    }
  }, 10000);

  test("associates metrics with correct build context", async () => {
    const metrics: Record<string, ResolvedMetricConfig> = {
      metric: { id: "metric", type: "numeric", command: 'echo "5"' },
    };

    const uniqueSuffix = Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    const testPath = `/tmp/unentropy-context-${uniqueSuffix}.db`;
    const db = new Storage({ type: "sqlite-local", path: testPath });
    await db.initialize();

    try {
      const buildContext = {
        commit_sha: "testcommittestcommittestcommittestcommit1",
        branch: "feature-branch",
        run_id: "12345",
        run_number: 42,
        event_name: "pull_request",
        timestamp: new Date().toISOString(),
      };

      const repository = db.getRepository();
      const result = await collectMetrics(metrics);
      const buildId = await repository.recordBuild(buildContext, result.collectedMetrics);

      const values = db.getRepository().getMetricValuesByBuildId(buildId);
      expect(values).toHaveLength(1);
      expect(values[0]?.build_id).toBe(buildId);
    } finally {
      await db.close();
      if (existsSync(testPath)) {
        await unlink(testPath);
      }
    }
  }, 10000);
});
