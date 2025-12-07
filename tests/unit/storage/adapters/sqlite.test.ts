import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Storage } from "../../../../src/storage/storage";
import { initializeSchema } from "../../../../src/storage/migrations";
import { SqliteDatabaseAdapter } from "../../../../src/storage/adapters/sqlite";
import { rm } from "fs/promises";

describe("SqliteDatabaseAdapter", () => {
  const testDbPath = "./test-sqlite-adapter.db";
  let client: Storage;
  let adapter: SqliteDatabaseAdapter;

  beforeEach(async () => {
    client = new Storage({
      type: "sqlite-local",
      path: testDbPath,
    });
    await client.ready();
    initializeSchema(client);
    adapter = new SqliteDatabaseAdapter(client.getConnection());
  });

  afterEach(async () => {
    await client.close();
    await rm(testDbPath, { force: true });
    await rm(`${testDbPath}-shm`, { force: true });
    await rm(`${testDbPath}-wal`, { force: true });
  });

  describe("insertBuildContext", () => {
    it("inserts a build context and returns id", () => {
      const id = adapter.insertBuildContext({
        commit_sha: "a".repeat(40),
        branch: "main",
        run_id: "12345",
        run_number: 1,
        timestamp: new Date().toISOString(),
      });

      expect(id).toBeGreaterThan(0);
    });

    it("inserts build context with optional fields", () => {
      const id = adapter.insertBuildContext({
        commit_sha: "b".repeat(40),
        branch: "feature",
        run_id: "12346",
        run_number: 2,
        event_name: "push",
        timestamp: new Date().toISOString(),
      });

      const result = adapter.getBuildContext(id);
      expect(result?.event_name).toBe("push");
    });
  });

  describe("upsertMetricDefinition", () => {
    it("inserts a new metric definition", () => {
      const metric = adapter.upsertMetricDefinition({
        id: "test-coverage",
        type: "numeric",
        unit: "percent",
        description: "Code coverage percentage",
      });

      expect(metric.id).toBe("test-coverage");
      expect(metric.type).toBe("numeric");
      expect(metric.unit).toBe("percent");
      expect(metric.description).toBe("Code coverage percentage");
    });

    it("updates existing metric definition on conflict", () => {
      const metric1 = adapter.upsertMetricDefinition({
        id: "size",
        type: "numeric",
        unit: "bytes",
      });

      const metric2 = adapter.upsertMetricDefinition({
        id: "size",
        type: "numeric",
        unit: "integer",
        description: "Updated description",
      });

      expect(metric2.id).toBe(metric1.id);
      expect(metric2.unit).toBe("integer");
      expect(metric2.description).toBe("Updated description");
    });

    it("inserts label type metric", () => {
      const metric = adapter.upsertMetricDefinition({
        id: "build-status",
        type: "label",
      });

      expect(metric.type).toBe("label");
      expect(metric.unit).toBeNull();
    });
  });

  describe("insertMetricValue", () => {
    it("inserts numeric metric value", () => {
      const buildId = adapter.insertBuildContext({
        commit_sha: "c".repeat(40),
        branch: "main",
        run_id: "12347",
        run_number: 3,
        timestamp: new Date().toISOString(),
      });

      const metric = adapter.upsertMetricDefinition({
        id: "test-metric",
        type: "numeric",
      });

      const valueId = adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: buildId,
        value_numeric: 42.5,
      });

      expect(valueId).toBeGreaterThan(0);

      const value = adapter.getMetricValues(metric.id, buildId);
      expect(value?.value_numeric).toBe(42.5);
      expect(value?.value_label).toBeNull();
    });

    it("inserts label metric value", () => {
      const buildId = adapter.insertBuildContext({
        commit_sha: "d".repeat(40),
        branch: "main",
        run_id: "12348",
        run_number: 4,
        timestamp: new Date().toISOString(),
      });

      const metric = adapter.upsertMetricDefinition({
        id: "status-metric",
        type: "label",
      });

      const valueId = adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: buildId,
        value_label: "passing",
      });

      expect(valueId).toBeGreaterThan(0);

      const value = adapter.getMetricValues(metric.id, buildId);
      expect(value?.value_label).toBe("passing");
      expect(value?.value_numeric).toBeNull();
    });

    it("updates metric value on conflict", () => {
      const buildId = adapter.insertBuildContext({
        commit_sha: "e".repeat(40),
        branch: "main",
        run_id: "12349",
        run_number: 5,
        timestamp: new Date().toISOString(),
      });

      const metric = adapter.upsertMetricDefinition({
        id: "update-test",
        type: "numeric",
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: buildId,
        value_numeric: 10,
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: buildId,
        value_numeric: 20,
      });

      const value = adapter.getMetricValues(metric.id, buildId);
      expect(value?.value_numeric).toBe(20);
    });
  });

  describe("getMetricDefinition", () => {
    it("retrieves metric by id", () => {
      adapter.upsertMetricDefinition({
        id: "lookup-test",
        type: "numeric",
      });

      const metric = adapter.getMetricDefinition("lookup-test");
      expect(metric?.id).toBe("lookup-test");
    });

    it("returns undefined for non-existent metric", () => {
      const metric = adapter.getMetricDefinition("non-existent");
      expect(metric).toBeUndefined();
    });
  });

  describe("getAllMetricDefinitions", () => {
    it("returns all metrics sorted by id", () => {
      adapter.upsertMetricDefinition({ id: "zebra", type: "numeric" });
      adapter.upsertMetricDefinition({ id: "alpha", type: "label" });
      adapter.upsertMetricDefinition({ id: "beta", type: "numeric" });

      const metrics = adapter.getAllMetricDefinitions();
      expect(metrics).toHaveLength(3);
      expect(metrics[0]?.id).toBe("alpha");
      expect(metrics[1]?.id).toBe("beta");
      expect(metrics[2]?.id).toBe("zebra");
    });

    it("returns empty array when no metrics exist", () => {
      const metrics = adapter.getAllMetricDefinitions();
      expect(metrics).toHaveLength(0);
    });
  });

  describe("getBaselineMetricValues", () => {
    it("returns baseline values for metric from reference branch", () => {
      const refBuild1 = adapter.insertBuildContext({
        commit_sha: "ref1".repeat(10),
        branch: "main",
        run_id: "ref1",
        run_number: 1,
        event_name: "push",
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      });

      const refBuild2 = adapter.insertBuildContext({
        commit_sha: "ref2".repeat(10),
        branch: "main",
        run_id: "ref2",
        run_number: 2,
        event_name: "push",
        timestamp: new Date(Date.now() - 43200000).toISOString(),
      });

      const metric = adapter.upsertMetricDefinition({
        id: "test-metric",
        type: "numeric",
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: refBuild1,
        value_numeric: 85.5,
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: refBuild2,
        value_numeric: 87.2,
      });

      const baselineValue = adapter.getBaselineMetricValue("test-metric", "main");

      expect(baselineValue).toBe(87.2);
    });

    it("filters by reference branch", () => {
      const mainBuild = adapter.insertBuildContext({
        commit_sha: "main1".repeat(10),
        branch: "main",
        run_id: "main1",
        run_number: 1,
        event_name: "push",
        timestamp: new Date().toISOString(),
      });

      const featureBuild = adapter.insertBuildContext({
        commit_sha: "feat1".repeat(10),
        branch: "feature",
        run_id: "feat1",
        run_number: 1,
        event_name: "push",
        timestamp: new Date().toISOString(),
      });

      const metric = adapter.upsertMetricDefinition({
        id: "branch-test",
        type: "numeric",
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: mainBuild,
        value_numeric: 100,
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: featureBuild,
        value_numeric: 200,
      });

      const baselineValue = adapter.getBaselineMetricValue("branch-test", "main");

      expect(baselineValue).toBe(100);
    });

    it("excludes non-push events and old builds", () => {
      const oldBuild = adapter.insertBuildContext({
        commit_sha: "old1".repeat(10),
        branch: "main",
        run_id: "old1",
        run_number: 1,
        event_name: "push",
        timestamp: new Date(Date.now() - 86400000 * 100).toISOString(),
      });

      const prBuild = adapter.insertBuildContext({
        commit_sha: "pr1".repeat(10),
        branch: "main",
        run_id: "pr1",
        run_number: 1,
        event_name: "pull_request",
        timestamp: new Date().toISOString(),
      });

      const metric = adapter.upsertMetricDefinition({
        id: "filter-test",
        type: "numeric",
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: oldBuild,
        value_numeric: 50,
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: prBuild,
        value_numeric: 75,
      });

      const baselineValue = adapter.getBaselineMetricValue("filter-test", "main", 90);

      expect(baselineValue).toBeUndefined();
    });
  });

  describe("getAllBuildContexts", () => {
    it("returns all builds when no options provided", () => {
      adapter.insertBuildContext({
        commit_sha: "a".repeat(40),
        branch: "main",
        run_id: "1",
        run_number: 1,
        timestamp: new Date().toISOString(),
      });

      adapter.insertBuildContext({
        commit_sha: "b".repeat(40),
        branch: "main",
        run_id: "2",
        run_number: 2,
        timestamp: new Date().toISOString(),
      });

      const builds = adapter.getAllBuildContexts();
      expect(builds).toHaveLength(2);
    });

    it("returns only push builds with metrics when onlyWithMetrics is true", () => {
      const buildWithMetrics = adapter.insertBuildContext({
        commit_sha: "a".repeat(40),
        branch: "main",
        run_id: "1",
        run_number: 1,
        event_name: "push",
        timestamp: new Date(Date.now() - 1000).toISOString(),
      });

      adapter.insertBuildContext({
        commit_sha: "b".repeat(40),
        branch: "main",
        run_id: "2",
        run_number: 2,
        event_name: "push",
        timestamp: new Date().toISOString(),
      });

      const metric = adapter.upsertMetricDefinition({
        id: "test-metric",
        type: "numeric",
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: buildWithMetrics,
        value_numeric: 42,
      });

      const builds = adapter.getAllBuildContexts({ onlyWithMetrics: true });
      expect(builds).toHaveLength(1);
      expect(builds[0]?.commit_sha).toBe("a".repeat(40));
    });

    it("excludes pull_request builds when onlyWithMetrics is true", () => {
      const prBuild = adapter.insertBuildContext({
        commit_sha: "a".repeat(40),
        branch: "main",
        run_id: "1",
        run_number: 1,
        event_name: "pull_request",
        timestamp: new Date().toISOString(),
      });

      const metric = adapter.upsertMetricDefinition({
        id: "test-metric",
        type: "numeric",
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: prBuild,
        value_numeric: 42,
      });

      const builds = adapter.getAllBuildContexts({ onlyWithMetrics: true });
      expect(builds).toHaveLength(0);
    });

    it("returns empty array when no push builds have metrics", () => {
      adapter.insertBuildContext({
        commit_sha: "a".repeat(40),
        branch: "main",
        run_id: "1",
        run_number: 1,
        event_name: "push",
        timestamp: new Date().toISOString(),
      });

      const builds = adapter.getAllBuildContexts({ onlyWithMetrics: true });
      expect(builds).toHaveLength(0);
    });

    it("preserves timestamp ordering with onlyWithMetrics", () => {
      const olderBuild = adapter.insertBuildContext({
        commit_sha: "a".repeat(40),
        branch: "main",
        run_id: "1",
        run_number: 1,
        event_name: "push",
        timestamp: "2024-01-01T00:00:00.000Z",
      });

      const newerBuild = adapter.insertBuildContext({
        commit_sha: "b".repeat(40),
        branch: "main",
        run_id: "2",
        run_number: 2,
        event_name: "push",
        timestamp: "2024-01-02T00:00:00.000Z",
      });

      const metric = adapter.upsertMetricDefinition({
        id: "test-metric",
        type: "numeric",
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: newerBuild,
        value_numeric: 100,
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: olderBuild,
        value_numeric: 50,
      });

      const builds = adapter.getAllBuildContexts({ onlyWithMetrics: true });
      expect(builds).toHaveLength(2);
      expect(builds[0]?.commit_sha).toBe("a".repeat(40));
      expect(builds[1]?.commit_sha).toBe("b".repeat(40));
    });
  });

  describe("getPullRequestMetricValue", () => {
    it("returns metric value for specific PR build", () => {
      const prBuild = adapter.insertBuildContext({
        commit_sha: "pr1".repeat(10),
        branch: "feature/test",
        run_id: "pr1",
        run_number: 1,
        event_name: "pull_request",
        timestamp: new Date().toISOString(),
      });

      const metric = adapter.upsertMetricDefinition({
        id: "pr-test",
        type: "numeric",
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: prBuild,
        value_numeric: 42.5,
      });

      const value = adapter.getPullRequestMetricValue("pr-test", prBuild);

      expect(value?.value_numeric).toBe(42.5);
    });

    it("returns undefined for non-existent metric", () => {
      const prBuild = adapter.insertBuildContext({
        commit_sha: "pr2".repeat(10),
        branch: "feature/test",
        run_id: "pr2",
        run_number: 1,
        event_name: "pull_request",
        timestamp: new Date().toISOString(),
      });

      const value = adapter.getPullRequestMetricValue("non-existent", prBuild);

      expect(value).toBeUndefined();
    });

    it("returns undefined for null values", () => {
      const prBuild = adapter.insertBuildContext({
        commit_sha: "pr3".repeat(10),
        branch: "feature/test",
        run_id: "pr3",
        run_number: 1,
        event_name: "pull_request",
        timestamp: new Date().toISOString(),
      });

      const metric = adapter.upsertMetricDefinition({
        id: "null-test",
        type: "numeric",
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: prBuild,
        value_label: "some-label",
      });

      const value = adapter.getPullRequestMetricValue("null-test", prBuild);

      expect(value).toBeUndefined();
    });
  });
});
