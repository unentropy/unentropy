import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Storage } from "../../../src/storage/storage";
import { SqliteDatabaseAdapter } from "../../../src/storage/adapters/sqlite";
import {
  getMetricTimeSeries,
  calculateSummaryStats,
  normalizeMetricToBuilds,
} from "../../../src/reporter/generator";
import type { BuildContext } from "../../../src/storage/types";
import type { TimeSeriesData } from "../../../src/reporter/types";
import fs from "fs";

const TEST_DB_PATH = "/tmp/test-generator.db";

describe("getMetricTimeSeries", () => {
  let db: Storage;
  let adapter: SqliteDatabaseAdapter;

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    db = new Storage({ type: "sqlite-local", path: TEST_DB_PATH });
    await db.initialize();
    adapter = new SqliteDatabaseAdapter(db.getConnection());

    const buildId1 = adapter.insertBuildContext({
      commit_sha: "abc123",
      branch: "main",
      run_id: "1",
      run_number: 1,
      event_name: "push",
      timestamp: "2025-10-01T12:00:00Z",
    });

    const buildId2 = adapter.insertBuildContext({
      commit_sha: "def456",
      branch: "main",
      run_id: "2",
      run_number: 2,
      event_name: "push",
      timestamp: "2025-10-02T12:00:00Z",
    });

    const buildId3 = adapter.insertBuildContext({
      commit_sha: "ghi789",
      branch: "main",
      run_id: "3",
      run_number: 3,
      event_name: "push",
      timestamp: "2025-10-03T12:00:00Z",
    });

    const coverageMetric = adapter.upsertMetricDefinition({
      id: "test-coverage",
      type: "numeric",
      unit: "percent",
      description: "Test coverage percentage",
    });

    const statusMetric = adapter.upsertMetricDefinition({
      id: "build-status",
      type: "label",
      description: "Build status",
    });

    adapter.insertMetricValue({
      metric_id: coverageMetric.id,
      build_id: buildId1,
      value_numeric: 85.2,
    });

    adapter.insertMetricValue({
      metric_id: coverageMetric.id,
      build_id: buildId2,
      value_numeric: 86.1,
    });

    adapter.insertMetricValue({
      metric_id: coverageMetric.id,
      build_id: buildId3,
      value_numeric: 87.5,
    });

    adapter.insertMetricValue({
      metric_id: statusMetric.id,
      build_id: buildId1,
      value_label: "success",
    });

    adapter.insertMetricValue({
      metric_id: statusMetric.id,
      build_id: buildId2,
      value_label: "success",
    });

    adapter.insertMetricValue({
      metric_id: statusMetric.id,
      build_id: buildId3,
      value_label: "failure",
    });
  });

  afterAll(async () => {
    await db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  test("retrieves time-series data for numeric metric", () => {
    const data = getMetricTimeSeries(db, "test-coverage");

    expect(data).toBeDefined();
    expect(data.metricName).toBe("test-coverage");
    expect(data.metricType).toBe("numeric");
    expect(data.unit).toBe("percent");
    expect(data.description).toBe("Test coverage percentage");
    expect(data.dataPoints).toHaveLength(3);
    expect(data.dataPoints[0]?.valueNumeric).toBe(85.2);
    expect(data.dataPoints[1]?.valueNumeric).toBe(86.1);
    expect(data.dataPoints[2]?.valueNumeric).toBe(87.5);
    expect(data.dataPoints[0]?.commitSha).toBe("abc123");
    expect(data.dataPoints[0]?.timestamp).toBe("2025-10-01T12:00:00Z");
  });

  test("retrieves time-series data for label metric", () => {
    const data = getMetricTimeSeries(db, "build-status");

    expect(data).toBeDefined();
    expect(data.metricName).toBe("build-status");
    expect(data.metricType).toBe("label");
    expect(data.dataPoints).toHaveLength(3);
    expect(data.dataPoints[0]?.valueLabel).toBe("success");
    expect(data.dataPoints[1]?.valueLabel).toBe("success");
    expect(data.dataPoints[2]?.valueLabel).toBe("failure");
  });

  test("returns data sorted by timestamp ascending", () => {
    const data = getMetricTimeSeries(db, "test-coverage");

    expect(data.dataPoints[0]?.timestamp).toBe("2025-10-01T12:00:00Z");
    expect(data.dataPoints[1]?.timestamp).toBe("2025-10-02T12:00:00Z");
    expect(data.dataPoints[2]?.timestamp).toBe("2025-10-03T12:00:00Z");
  });

  test("throws error for non-existent metric", () => {
    expect(() => getMetricTimeSeries(db, "non-existent")).toThrow(
      "Metric 'non-existent' not found"
    );
  });

  test("returns empty data points for metric with no values", () => {
    adapter.upsertMetricDefinition({
      id: "empty-metric",
      type: "numeric",
      description: "No data",
    });

    const data = getMetricTimeSeries(db, "empty-metric");

    expect(data.metricName).toBe("empty-metric");
    expect(data.dataPoints).toHaveLength(0);
  });
});

describe("calculateSummaryStats", () => {
  test("calculates summary statistics for numeric metric", () => {
    const data: TimeSeriesData = {
      metricName: "test-coverage",
      metricType: "numeric" as const,
      unit: "percent",
      description: "Test coverage",
      dataPoints: [
        {
          timestamp: "2025-10-01T12:00:00Z",
          valueNumeric: 85.0,
          valueLabel: null,
          commitSha: "abc123",
          branch: "main",
          runNumber: 1,
        },
        {
          timestamp: "2025-10-02T12:00:00Z",
          valueNumeric: 90.0,
          valueLabel: null,
          commitSha: "def456",
          branch: "main",
          runNumber: 2,
        },
        {
          timestamp: "2025-10-03T12:00:00Z",
          valueNumeric: 88.0,
          valueLabel: null,
          commitSha: "ghi789",
          branch: "main",
          runNumber: 3,
        },
      ],
    };

    const stats = calculateSummaryStats(data);

    expect(stats.latest).toBe(88.0);
    expect(stats.min).toBe(85.0);
    expect(stats.max).toBe(90.0);
    expect(stats.average).toBeCloseTo(87.67, 2);
    expect(stats.trendDirection).toBe("up");
    expect(stats.trendPercent).toBeCloseTo(3.53, 2);
  });

  test("returns null values for label metric", () => {
    const data = {
      metricName: "build-status",
      metricType: "label" as const,
      unit: null,
      description: "Build status",
      dataPoints: [
        {
          timestamp: "2025-10-01T12:00:00Z",
          valueNumeric: null,
          valueLabel: "success",
          commitSha: "abc123",
          branch: "main",
          runNumber: 1,
        },
      ],
    };

    const stats = calculateSummaryStats(data);

    expect(stats.latest).toBeNull();
    expect(stats.min).toBeNull();
    expect(stats.max).toBeNull();
    expect(stats.average).toBeNull();
    expect(stats.trendDirection).toBeNull();
    expect(stats.trendPercent).toBeNull();
  });

  test("returns null values for empty data points", () => {
    const data: TimeSeriesData = {
      metricName: "test-coverage",
      metricType: "numeric" as const,
      unit: "percent",
      description: "Test coverage",
      dataPoints: [],
    };

    const stats = calculateSummaryStats(data);

    expect(stats.latest).toBeNull();
    expect(stats.min).toBeNull();
    expect(stats.max).toBeNull();
    expect(stats.average).toBeNull();
    expect(stats.trendDirection).toBeNull();
    expect(stats.trendPercent).toBeNull();
  });

  test("detects downward trend", () => {
    const data: TimeSeriesData = {
      metricName: "size",
      metricType: "numeric" as const,
      unit: "bytes",
      description: "Bundle size",
      dataPoints: [
        {
          timestamp: "2025-10-01T12:00:00Z",
          valueNumeric: 100.0,
          valueLabel: null,
          commitSha: "abc123",
          branch: "main",
          runNumber: 1,
        },
        {
          timestamp: "2025-10-02T12:00:00Z",
          valueNumeric: 95.0,
          valueLabel: null,
          commitSha: "def456",
          branch: "main",
          runNumber: 2,
        },
      ],
    };

    const stats = calculateSummaryStats(data);

    expect(stats.trendDirection).toBe("down");
    expect(stats.trendPercent).toBeCloseTo(-5.0, 2);
  });

  test("detects stable trend", () => {
    const data = {
      metricName: "metric",
      metricType: "numeric" as const,
      unit: null,
      description: "Metric",
      dataPoints: [
        {
          timestamp: "2025-10-01T12:00:00Z",
          valueNumeric: 100.0,
          valueLabel: null,
          commitSha: "abc123",
          branch: "main",
          runNumber: 1,
        },
        {
          timestamp: "2025-10-02T12:00:00Z",
          valueNumeric: 100.0,
          valueLabel: null,
          commitSha: "def456",
          branch: "main",
          runNumber: 2,
        },
      ],
    };

    const stats = calculateSummaryStats(data);

    expect(stats.trendDirection).toBe("stable");
    expect(stats.trendPercent).toBe(0);
  });

  test("handles single data point", () => {
    const data = {
      metricName: "metric",
      metricType: "numeric" as const,
      unit: null,
      description: "Metric",
      dataPoints: [
        {
          timestamp: "2025-10-01T12:00:00Z",
          valueNumeric: 42.0,
          valueLabel: null,
          commitSha: "abc123",
          branch: "main",
          runNumber: 1,
        },
      ],
    };

    const stats = calculateSummaryStats(data);

    expect(stats.latest).toBe(42.0);
    expect(stats.min).toBe(42.0);
    expect(stats.max).toBe(42.0);
    expect(stats.average).toBe(42.0);
    expect(stats.trendDirection).toBeNull();
    expect(stats.trendPercent).toBeNull();
  });

  test("filters out null numeric values", () => {
    const data = {
      metricName: "metric",
      metricType: "numeric" as const,
      unit: null,
      description: "Metric",
      dataPoints: [
        {
          timestamp: "2025-10-01T12:00:00Z",
          valueNumeric: null,
          valueLabel: null,
          commitSha: "abc123",
          branch: "main",
          runNumber: 1,
        },
        {
          timestamp: "2025-10-02T12:00:00Z",
          valueNumeric: 50.0,
          valueLabel: null,
          commitSha: "def456",
          branch: "main",
          runNumber: 2,
        },
      ],
    };

    const stats = calculateSummaryStats(data);

    expect(stats.latest).toBe(50.0);
    expect(stats.min).toBe(50.0);
    expect(stats.max).toBe(50.0);
    expect(stats.average).toBe(50.0);
  });
});

describe("normalizeMetricToBuilds", () => {
  const createBuildContext = (
    id: number,
    timestamp: string,
    commitSha: string,
    runNumber: number
  ): BuildContext => ({
    id,
    commit_sha: commitSha,
    branch: "main",
    run_id: `run-${id}`,
    run_number: runNumber,
    event_name: "push",
    timestamp,
  });

  const createTimeSeries = (
    dataPoints: { timestamp: string; value: number; commitSha: string; runNumber: number }[]
  ): TimeSeriesData => ({
    metricName: "test-metric",
    metricType: "numeric",
    unit: "percent",
    description: "Test metric",
    dataPoints: dataPoints.map((dp) => ({
      timestamp: dp.timestamp,
      valueNumeric: dp.value,
      valueLabel: null,
      commitSha: dp.commitSha,
      branch: "main",
      runNumber: dp.runNumber,
    })),
  });

  test("maps metric data to complete build range with values for all builds", () => {
    const allBuilds = [
      createBuildContext(1, "2025-10-01T12:00:00Z", "abc123", 1),
      createBuildContext(2, "2025-10-02T12:00:00Z", "def456", 2),
      createBuildContext(3, "2025-10-03T12:00:00Z", "ghi789", 3),
    ];

    const timeSeries = createTimeSeries([
      { timestamp: "2025-10-01T12:00:00Z", value: 85.0, commitSha: "abc123", runNumber: 1 },
      { timestamp: "2025-10-02T12:00:00Z", value: 86.0, commitSha: "def456", runNumber: 2 },
      { timestamp: "2025-10-03T12:00:00Z", value: 87.0, commitSha: "ghi789", runNumber: 3 },
    ]);

    const normalized = normalizeMetricToBuilds(allBuilds, timeSeries);

    expect(normalized).toHaveLength(3);
    expect(normalized[0]).toEqual({
      timestamp: "2025-10-01T12:00:00Z",
      value: 85.0,
      commitSha: "abc123",
      runNumber: 1,
    });
    expect(normalized[1]).toEqual({
      timestamp: "2025-10-02T12:00:00Z",
      value: 86.0,
      commitSha: "def456",
      runNumber: 2,
    });
    expect(normalized[2]).toEqual({
      timestamp: "2025-10-03T12:00:00Z",
      value: 87.0,
      commitSha: "ghi789",
      runNumber: 3,
    });
  });

  test("fills gaps with null when metric is missing for some builds", () => {
    const allBuilds = [
      createBuildContext(1, "2025-10-01T12:00:00Z", "abc123", 1),
      createBuildContext(2, "2025-10-02T12:00:00Z", "def456", 2),
      createBuildContext(3, "2025-10-03T12:00:00Z", "ghi789", 3),
      createBuildContext(4, "2025-10-04T12:00:00Z", "jkl012", 4),
      createBuildContext(5, "2025-10-05T12:00:00Z", "mno345", 5),
    ];

    const timeSeries = createTimeSeries([
      { timestamp: "2025-10-01T12:00:00Z", value: 85.0, commitSha: "abc123", runNumber: 1 },
      { timestamp: "2025-10-03T12:00:00Z", value: 87.0, commitSha: "ghi789", runNumber: 3 },
      { timestamp: "2025-10-05T12:00:00Z", value: 89.0, commitSha: "mno345", runNumber: 5 },
    ]);

    const normalized = normalizeMetricToBuilds(allBuilds, timeSeries);

    expect(normalized).toHaveLength(5);
    expect(normalized[0]?.value).toBe(85.0);
    expect(normalized[1]?.value).toBeNull();
    expect(normalized[2]?.value).toBe(87.0);
    expect(normalized[3]?.value).toBeNull();
    expect(normalized[4]?.value).toBe(89.0);
  });

  test("returns null values for all builds when metric has no data points", () => {
    const allBuilds = [
      createBuildContext(1, "2025-10-01T12:00:00Z", "abc123", 1),
      createBuildContext(2, "2025-10-02T12:00:00Z", "def456", 2),
    ];

    const timeSeries = createTimeSeries([]);

    const normalized = normalizeMetricToBuilds(allBuilds, timeSeries);

    expect(normalized).toHaveLength(2);
    expect(normalized[0]?.value).toBeNull();
    expect(normalized[1]?.value).toBeNull();
    expect(normalized[0]?.commitSha).toBe("abc123");
    expect(normalized[1]?.commitSha).toBe("def456");
  });

  test("handles empty build list", () => {
    const timeSeries = createTimeSeries([
      { timestamp: "2025-10-01T12:00:00Z", value: 85.0, commitSha: "abc123", runNumber: 1 },
    ]);

    const normalized = normalizeMetricToBuilds([], timeSeries);

    expect(normalized).toHaveLength(0);
  });

  test("preserves build context metadata for missing data points", () => {
    const allBuilds = [
      createBuildContext(1, "2025-10-01T12:00:00Z", "abc123", 1),
      createBuildContext(2, "2025-10-02T12:00:00Z", "def456", 2),
    ];

    const timeSeries = createTimeSeries([
      { timestamp: "2025-10-01T12:00:00Z", value: 85.0, commitSha: "abc123", runNumber: 1 },
    ]);

    const normalized = normalizeMetricToBuilds(allBuilds, timeSeries);

    expect(normalized[1]).toEqual({
      timestamp: "2025-10-02T12:00:00Z",
      value: null,
      commitSha: "def456",
      runNumber: 2,
    });
  });

  test("output length equals input build count", () => {
    const allBuilds = [
      createBuildContext(1, "2025-10-01T12:00:00Z", "abc123", 1),
      createBuildContext(2, "2025-10-02T12:00:00Z", "def456", 2),
      createBuildContext(3, "2025-10-03T12:00:00Z", "ghi789", 3),
    ];

    const timeSeries = createTimeSeries([
      { timestamp: "2025-10-02T12:00:00Z", value: 86.0, commitSha: "def456", runNumber: 2 },
    ]);

    const normalized = normalizeMetricToBuilds(allBuilds, timeSeries);

    expect(normalized.length).toBe(allBuilds.length);
  });
});
