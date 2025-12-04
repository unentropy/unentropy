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
        actor: "test-user",
        event_name: "push",
        timestamp: new Date().toISOString(),
      });

      const result = adapter.getBuildContext(id);
      expect(result?.actor).toBe("test-user");
      expect(result?.event_name).toBe("push");
    });
  });

  describe("upsertMetricDefinition", () => {
    it("inserts a new metric definition", () => {
      const metric = adapter.upsertMetricDefinition({
        name: "test-coverage",
        type: "numeric",
        unit: "%",
        description: "Code coverage percentage",
      });

      expect(metric.id).toBeGreaterThan(0);
      expect(metric.name).toBe("test-coverage");
      expect(metric.type).toBe("numeric");
      expect(metric.unit).toBe("%");
      expect(metric.description).toBe("Code coverage percentage");
    });

    it("updates existing metric definition on conflict", () => {
      const metric1 = adapter.upsertMetricDefinition({
        name: "bundle-size",
        type: "numeric",
        unit: "KB",
      });

      const metric2 = adapter.upsertMetricDefinition({
        name: "bundle-size",
        type: "numeric",
        unit: "MB",
        description: "Updated description",
      });

      expect(metric2.id).toBe(metric1.id);
      expect(metric2.unit).toBe("MB");
      expect(metric2.description).toBe("Updated description");
    });

    it("inserts label type metric", () => {
      const metric = adapter.upsertMetricDefinition({
        name: "build-status",
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
        name: "test-metric",
        type: "numeric",
      });

      const valueId = adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: buildId,
        value_numeric: 42.5,
        collected_at: new Date().toISOString(),
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
        name: "status-metric",
        type: "label",
      });

      const valueId = adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: buildId,
        value_label: "passing",
        collected_at: new Date().toISOString(),
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
        name: "update-test",
        type: "numeric",
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: buildId,
        value_numeric: 10,
        collected_at: new Date().toISOString(),
      });

      const newTime = new Date().toISOString();
      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: buildId,
        value_numeric: 20,
        collected_at: newTime,
      });

      const value = adapter.getMetricValues(metric.id, buildId);
      expect(value?.value_numeric).toBe(20);
    });

    it("stores collection duration", () => {
      const buildId = adapter.insertBuildContext({
        commit_sha: "f".repeat(40),
        branch: "main",
        run_id: "12350",
        run_number: 6,
        timestamp: new Date().toISOString(),
      });

      const metric = adapter.upsertMetricDefinition({
        name: "duration-test",
        type: "numeric",
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: buildId,
        value_numeric: 100,
        collected_at: new Date().toISOString(),
        collection_duration_ms: 1500,
      });

      const value = adapter.getMetricValues(metric.id, buildId);
      expect(value?.collection_duration_ms).toBe(1500);
    });
  });

  describe("getMetricDefinition", () => {
    it("retrieves metric by name", () => {
      adapter.upsertMetricDefinition({
        name: "lookup-test",
        type: "numeric",
      });

      const metric = adapter.getMetricDefinition("lookup-test");
      expect(metric?.name).toBe("lookup-test");
    });

    it("returns undefined for non-existent metric", () => {
      const metric = adapter.getMetricDefinition("non-existent");
      expect(metric).toBeUndefined();
    });
  });

  describe("getAllMetricDefinitions", () => {
    it("returns all metrics sorted by name", () => {
      adapter.upsertMetricDefinition({ name: "zebra", type: "numeric" });
      adapter.upsertMetricDefinition({ name: "alpha", type: "label" });
      adapter.upsertMetricDefinition({ name: "beta", type: "numeric" });

      const metrics = adapter.getAllMetricDefinitions();
      expect(metrics).toHaveLength(3);
      expect(metrics[0]?.name).toBe("alpha");
      expect(metrics[1]?.name).toBe("beta");
      expect(metrics[2]?.name).toBe("zebra");
    });

    it("returns empty array when no metrics exist", () => {
      const metrics = adapter.getAllMetricDefinitions();
      expect(metrics).toHaveLength(0);
    });
  });

  describe("getBaselineMetricValues", () => {
    it("returns baseline values for metric from reference branch", () => {
      // Create reference branch builds
      const refBuild1 = adapter.insertBuildContext({
        commit_sha: "ref1".repeat(10),
        branch: "main",
        run_id: "ref1",
        run_number: 1,
        event_name: "push",
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      });

      const refBuild2 = adapter.insertBuildContext({
        commit_sha: "ref2".repeat(10),
        branch: "main",
        run_id: "ref2",
        run_number: 2,
        event_name: "push",
        timestamp: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
      });

      const metric = adapter.upsertMetricDefinition({
        name: "test-metric",
        type: "numeric",
      });

      // Insert baseline values
      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: refBuild1,
        value_numeric: 85.5,
        collected_at: new Date().toISOString(),
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: refBuild2,
        value_numeric: 87.2,
        collected_at: new Date().toISOString(),
      });

      const baselineValues = adapter.getBaselineMetricValues("test-metric", "main");

      expect(baselineValues).toHaveLength(2);
      expect(baselineValues[0]?.value_numeric).toBe(87.2); // Most recent first
      expect(baselineValues[1]?.value_numeric).toBe(85.5);
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
        name: "branch-test",
        type: "numeric",
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: mainBuild,
        value_numeric: 100,
        collected_at: new Date().toISOString(),
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: featureBuild,
        value_numeric: 200,
        collected_at: new Date().toISOString(),
      });

      const baselineValues = adapter.getBaselineMetricValues("branch-test", "main");

      expect(baselineValues).toHaveLength(1);
      expect(baselineValues[0]?.value_numeric).toBe(100);
    });

    it("excludes non-push events and old builds", () => {
      const oldBuild = adapter.insertBuildContext({
        commit_sha: "old1".repeat(10),
        branch: "main",
        run_id: "old1",
        run_number: 1,
        event_name: "push",
        timestamp: new Date(Date.now() - 86400000 * 100).toISOString(), // 100 days ago
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
        name: "filter-test",
        type: "numeric",
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: oldBuild,
        value_numeric: 50,
        collected_at: new Date().toISOString(),
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: prBuild,
        value_numeric: 75,
        collected_at: new Date().toISOString(),
      });

      const baselineValues = adapter.getBaselineMetricValues("filter-test", "main", 20, 90);

      expect(baselineValues).toHaveLength(0); // Both filtered out
    });

    it("respects maxBuilds limit", () => {
      const metric = adapter.upsertMetricDefinition({
        name: "limit-test",
        type: "numeric",
      });

      // Create 5 builds on main branch
      for (let i = 0; i < 5; i++) {
        const buildId = adapter.insertBuildContext({
          commit_sha: `build${i}${"x".repeat(34)}`,
          branch: "main",
          run_id: `build${i}`,
          run_number: i + 1,
          event_name: "push",
          timestamp: new Date().toISOString(),
        });

        adapter.insertMetricValue({
          metric_id: metric.id,
          build_id: buildId,
          value_numeric: i * 10,
          collected_at: new Date().toISOString(),
        });
      }

      const baselineValues = adapter.getBaselineMetricValues("limit-test", "main", 3, 90);

      expect(baselineValues).toHaveLength(3); // Limited to 3
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
        name: "test-metric",
        type: "numeric",
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: buildWithMetrics,
        value_numeric: 42,
        collected_at: new Date().toISOString(),
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
        name: "test-metric",
        type: "numeric",
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: prBuild,
        value_numeric: 42,
        collected_at: new Date().toISOString(),
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
        name: "test-metric",
        type: "numeric",
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: newerBuild,
        value_numeric: 100,
        collected_at: new Date().toISOString(),
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: olderBuild,
        value_numeric: 50,
        collected_at: new Date().toISOString(),
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
        name: "pr-test",
        type: "numeric",
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: prBuild,
        value_numeric: 42.5,
        collected_at: new Date().toISOString(),
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
        name: "null-test",
        type: "numeric",
      });

      adapter.insertMetricValue({
        metric_id: metric.id,
        build_id: prBuild,
        value_label: "some-label", // No numeric value
        collected_at: new Date().toISOString(),
      });

      const value = adapter.getPullRequestMetricValue("null-test", prBuild);

      expect(value).toBeUndefined();
    });
  });
});
