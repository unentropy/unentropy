import { describe, test, expect } from "bun:test";
import { calculateSummaryStats, normalizeMetricToBuilds } from "../../../src/reporter/generator";
import { buildReportLayout } from "../../../src/reporter/layout";
import type { BuildContext } from "../../../src/storage/types";
import type {
  TimeSeriesData,
  TimeSeriesDataPoint,
  MetricReportData,
} from "../../../src/reporter/types";
import type { ResolvedUnentropyConfig } from "../../../src/config/loader";

describe("calculateSummaryStats", () => {
  test("calculates summary statistics for numeric metric", () => {
    const dataPoints: TimeSeriesDataPoint[] = [
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
    ];

    const stats = calculateSummaryStats("numeric", dataPoints);

    expect(stats.latest).toBe(88.0);
    expect(stats.min).toBe(85.0);
    expect(stats.max).toBe(90.0);
    expect(stats.average).toBeCloseTo(87.67, 2);
    expect(stats.trendDirection).toBe("up");
    expect(stats.trendPercent).toBeCloseTo(3.53, 2);
  });

  test("returns null values for label metric", () => {
    const dataPoints: TimeSeriesDataPoint[] = [
      {
        timestamp: "2025-10-01T12:00:00Z",
        valueNumeric: null,
        valueLabel: "success",
        commitSha: "abc123",
        branch: "main",
        runNumber: 1,
      },
    ];

    const stats = calculateSummaryStats("label", dataPoints);

    expect(stats.latest).toBeNull();
    expect(stats.min).toBeNull();
    expect(stats.max).toBeNull();
    expect(stats.average).toBeNull();
    expect(stats.trendDirection).toBeNull();
    expect(stats.trendPercent).toBeNull();
  });

  test("returns null values for empty data points", () => {
    const stats = calculateSummaryStats("numeric", []);

    expect(stats.latest).toBeNull();
    expect(stats.min).toBeNull();
    expect(stats.max).toBeNull();
    expect(stats.average).toBeNull();
    expect(stats.trendDirection).toBeNull();
    expect(stats.trendPercent).toBeNull();
  });

  test("detects downward trend", () => {
    const dataPoints: TimeSeriesDataPoint[] = [
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
    ];

    const stats = calculateSummaryStats("numeric", dataPoints);

    expect(stats.trendDirection).toBe("down");
    expect(stats.trendPercent).toBeCloseTo(-5.0, 2);
  });

  test("detects stable trend", () => {
    const dataPoints: TimeSeriesDataPoint[] = [
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
    ];

    const stats = calculateSummaryStats("numeric", dataPoints);

    expect(stats.trendDirection).toBe("stable");
    expect(stats.trendPercent).toBe(0);
  });

  test("handles single data point", () => {
    const dataPoints: TimeSeriesDataPoint[] = [
      {
        timestamp: "2025-10-01T12:00:00Z",
        valueNumeric: 42.0,
        valueLabel: null,
        commitSha: "abc123",
        branch: "main",
        runNumber: 1,
      },
    ];

    const stats = calculateSummaryStats("numeric", dataPoints);

    expect(stats.latest).toBe(42.0);
    expect(stats.min).toBe(42.0);
    expect(stats.max).toBe(42.0);
    expect(stats.average).toBe(42.0);
    expect(stats.trendDirection).toBeNull();
    expect(stats.trendPercent).toBeNull();
  });

  test("filters out null numeric values", () => {
    const dataPoints: TimeSeriesDataPoint[] = [
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
    ];

    const stats = calculateSummaryStats("numeric", dataPoints);

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

describe("buildReportLayout", () => {
  const createMetrics = (): MetricReportData[] => [
    {
      id: "bundle-size",
      name: "Bundle Size",
      description: null,
      unit: "bytes",
      stats: {
        latest: null,
        min: null,
        max: null,
        average: null,
        trendDirection: null,
        trendPercent: null,
      },
      chartType: "line",
      dataPointCount: 0,
    },
    {
      id: "test-coverage",
      name: "Test Coverage",
      description: null,
      unit: "percent",
      stats: {
        latest: null,
        min: null,
        max: null,
        average: null,
        trendDirection: null,
        trendPercent: null,
      },
      chartType: "line",
      dataPointCount: 0,
    },
    {
      id: "build-status",
      name: "Build Status",
      description: null,
      unit: null,
      stats: {
        latest: null,
        min: null,
        max: null,
        average: null,
        trendDirection: null,
        trendPercent: null,
      },
      chartType: "bar",
      dataPointCount: 0,
    },
  ];

  test("returns undefined when no report config", () => {
    const config = {
      metrics: {},
      storage: { type: "sqlite-local" as const },
    } as ResolvedUnentropyConfig;
    const layout = buildReportLayout(config, createMetrics());
    expect(layout).toBeUndefined();
  });

  test("creates sections with correct names and descriptions", () => {
    const config = {
      metrics: {},
      storage: { type: "sqlite-local" as const },
      report: {
        sections: [
          {
            name: "Build Metrics",
            description: "Size and timing metrics",
            charts: [{ metrics: "bundle-size" }],
          },
          {
            name: "Quality",
            charts: [{ metrics: "test-coverage" }],
          },
        ],
      },
    } as ResolvedUnentropyConfig;

    const layout = buildReportLayout(config, createMetrics());

    expect(layout).toBeDefined();
    expect(layout?.sections).toHaveLength(2);
    expect(layout?.sections[0]?.name).toBe("Build Metrics");
    expect(layout?.sections[0]?.description).toBe("Size and timing metrics");
    expect(layout?.sections[1]?.name).toBe("Quality");
    expect(layout?.sections[1]?.description).toBeUndefined();
  });

  test("creates single-metric charts with correct type", () => {
    const config = {
      metrics: {},
      storage: { type: "sqlite-local" as const },
      report: {
        sections: [
          {
            name: "Build",
            charts: [{ metrics: "bundle-size" }],
          },
        ],
      },
    } as ResolvedUnentropyConfig;

    const layout = buildReportLayout(config, createMetrics());

    expect(layout).toBeDefined();
    expect(layout?.sections[0]?.charts[0]).toEqual({
      type: "single",
      metricId: "bundle-size",
      metricIds: undefined,
      title: "Bundle Size",
      chartType: "line",
    });
  });

  test("creates multi-metric charts with custom title", () => {
    const config = {
      metrics: {},
      storage: { type: "sqlite-local" as const },
      report: {
        sections: [
          {
            name: "Refactoring",
            charts: [
              {
                metrics: ["bundle-size", "test-coverage"],
                title: "Size vs Coverage",
              },
            ],
          },
        ],
      },
    } as ResolvedUnentropyConfig;

    const layout = buildReportLayout(config, createMetrics());

    expect(layout).toBeDefined();
    expect(layout?.sections[0]?.charts[0]).toEqual({
      type: "multi",
      metricId: undefined,
      metricIds: ["bundle-size", "test-coverage"],
      title: "Size vs Coverage",
      chartType: "line",
    });
  });

  test("auto-generates title for multi-metric charts without title", () => {
    const config = {
      metrics: {},
      storage: { type: "sqlite-local" as const },
      report: {
        sections: [
          {
            name: "Overview",
            charts: [{ metrics: ["bundle-size", "test-coverage"] }],
          },
        ],
      },
    } as ResolvedUnentropyConfig;

    const layout = buildReportLayout(config, createMetrics());

    expect(layout).toBeDefined();
    expect(layout?.sections[0]?.charts[0]?.title).toBe("Bundle Size, Test Coverage");
  });

  test("omits invalid metric references silently", () => {
    const config = {
      metrics: {},
      storage: { type: "sqlite-local" as const },
      report: {
        sections: [
          {
            name: "Section",
            charts: [{ metrics: "nonexistent-metric" }],
          },
        ],
      },
    } as ResolvedUnentropyConfig;

    const layout = buildReportLayout(config, createMetrics());

    expect(layout).toBeDefined();
    expect(layout?.sections[0]?.charts).toHaveLength(0);
  });

  test("keeps valid metrics and omits invalid ones in multi-metric chart", () => {
    const config = {
      metrics: {},
      storage: { type: "sqlite-local" as const },
      report: {
        sections: [
          {
            name: "Section",
            charts: [{ metrics: ["bundle-size", "nonexistent", "test-coverage"] }],
          },
        ],
      },
    } as ResolvedUnentropyConfig;

    const layout = buildReportLayout(config, createMetrics());

    expect(layout).toBeDefined();
    expect(layout?.sections[0]?.charts[0]?.type).toBe("multi");
    expect(layout?.sections[0]?.charts[0]?.metricIds).toEqual(["bundle-size", "test-coverage"]);
  });

  test("uses definition order for sections and charts", () => {
    const config = {
      metrics: {},
      storage: { type: "sqlite-local" as const },
      report: {
        sections: [
          {
            name: "Second",
            charts: [{ metrics: "test-coverage" }, { metrics: "bundle-size" }],
          },
          {
            name: "First",
            charts: [{ metrics: "build-status" }],
          },
        ],
      },
    } as ResolvedUnentropyConfig;

    const layout = buildReportLayout(config, createMetrics());

    expect(layout).toBeDefined();
    expect(layout?.sections[0]?.name).toBe("Second");
    expect(layout?.sections[1]?.name).toBe("First");
    expect(layout?.sections[0]?.charts[0]?.metricId).toBe("test-coverage");
    expect(layout?.sections[0]?.charts[1]?.metricId).toBe("bundle-size");
  });
});
