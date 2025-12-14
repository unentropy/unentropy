import { describe, test, expect } from "bun:test";
import { buildLineChartData, buildBarChartData } from "../../../src/reporter/charts";
import type { NormalizedDataPoint, TimeSeriesDataPoint } from "../../../src/reporter/types";

describe("buildLineChartData", () => {
  const createNormalizedData = (
    dataPoints: { timestamp: string; value: number | null; commitSha: string; runNumber: number }[]
  ): NormalizedDataPoint[] => dataPoints;

  test("extracts values from normalized data", () => {
    const normalizedData = createNormalizedData([
      { timestamp: "2025-10-01T12:00:00Z", value: 85.2, commitSha: "abc1234567890", runNumber: 1 },
      { timestamp: "2025-10-02T12:00:00Z", value: 86.1, commitSha: "def4567890123", runNumber: 2 },
      { timestamp: "2025-10-03T12:00:00Z", value: 87.5, commitSha: "ghi7890123456", runNumber: 3 },
    ]);

    const data = buildLineChartData("test-coverage", "Test Coverage", "percent", normalizedData);

    expect(data.values).toEqual([85.2, 86.1, 87.5]);
  });

  test("sets id and name correctly", () => {
    const normalizedData = createNormalizedData([
      { timestamp: "2025-10-01T12:00:00Z", value: 85.0, commitSha: "abc1234567890", runNumber: 1 },
    ]);

    const data = buildLineChartData("my-metric-id", "My Metric Name", null, normalizedData);

    expect(data.id).toBe("my-metric-id");
    expect(data.name).toBe("My Metric Name");
  });

  test("preserves null values in values array", () => {
    const normalizedData = createNormalizedData([
      { timestamp: "2025-10-01T12:00:00Z", value: 85.0, commitSha: "abc1234567890", runNumber: 1 },
      { timestamp: "2025-10-02T12:00:00Z", value: null, commitSha: "def4567890123", runNumber: 2 },
      { timestamp: "2025-10-03T12:00:00Z", value: 87.0, commitSha: "ghi7890123456", runNumber: 3 },
    ]);

    const data = buildLineChartData("test-id", "Test", null, normalizedData);

    expect(data.values).toEqual([85.0, null, 87.0]);
  });

  test("handles all null values (empty metric)", () => {
    const normalizedData = createNormalizedData([
      { timestamp: "2025-10-01T12:00:00Z", value: null, commitSha: "abc1234567890", runNumber: 1 },
      { timestamp: "2025-10-02T12:00:00Z", value: null, commitSha: "def4567890123", runNumber: 2 },
    ]);

    const data = buildLineChartData("test-id", "Test", null, normalizedData);

    expect(data.values).toEqual([null, null]);
  });

  test("handles empty normalized data", () => {
    const data = buildLineChartData("test-id", "Test", null, []);

    expect(data.values).toEqual([]);
  });

  test("handles single data point", () => {
    const normalizedData = createNormalizedData([
      { timestamp: "2025-10-01T12:00:00Z", value: 85.0, commitSha: "abc1234567890", runNumber: 1 },
    ]);

    const data = buildLineChartData("test-id", "Test", null, normalizedData);

    expect(data.values).toEqual([85.0]);
  });
});

describe("buildBarChartData", () => {
  const createLabelDataPoints = (
    dataPoints: {
      timestamp: string;
      valueLabel: string | null;
      commitSha: string;
      runNumber: number;
    }[]
  ): TimeSeriesDataPoint[] =>
    dataPoints.map((dp) => ({
      timestamp: dp.timestamp,
      valueNumeric: null,
      valueLabel: dp.valueLabel,
      commitSha: dp.commitSha,
      branch: "main",
      runNumber: dp.runNumber,
    }));

  test("sets id and name correctly", () => {
    const dataPoints = createLabelDataPoints([
      {
        timestamp: "2025-10-01T12:00:00Z",
        valueLabel: "success",
        commitSha: "abc123",
        runNumber: 1,
      },
    ]);

    const data = buildBarChartData("my-bar-id", "My Bar Name", dataPoints, null);

    expect(data.id).toBe("my-bar-id");
    expect(data.name).toBe("My Bar Name");
  });

  test("aggregates label occurrences", () => {
    const dataPoints = createLabelDataPoints([
      {
        timestamp: "2025-10-01T12:00:00Z",
        valueLabel: "success",
        commitSha: "abc123",
        runNumber: 1,
      },
      {
        timestamp: "2025-10-02T12:00:00Z",
        valueLabel: "success",
        commitSha: "def456",
        runNumber: 2,
      },
      {
        timestamp: "2025-10-03T12:00:00Z",
        valueLabel: "failure",
        commitSha: "ghi789",
        runNumber: 3,
      },
    ]);

    const data = buildBarChartData("test-id", "Test", dataPoints, null);

    const successIndex = data.labels.indexOf("success");
    const failureIndex = data.labels.indexOf("failure");

    expect(data.counts[successIndex]).toBe(2);
    expect(data.counts[failureIndex]).toBe(1);
  });

  test("sorts labels alphabetically", () => {
    const dataPoints = createLabelDataPoints([
      { timestamp: "2025-10-01T12:00:00Z", valueLabel: "zebra", commitSha: "abc123", runNumber: 1 },
      { timestamp: "2025-10-02T12:00:00Z", valueLabel: "apple", commitSha: "def456", runNumber: 2 },
      { timestamp: "2025-10-03T12:00:00Z", valueLabel: "mango", commitSha: "ghi789", runNumber: 3 },
    ]);

    const data = buildBarChartData("test-id", "Test", dataPoints, null);

    expect(data.labels).toEqual(["apple", "mango", "zebra"]);
  });

  test("counts are aligned with sorted labels", () => {
    const dataPoints = createLabelDataPoints([
      { timestamp: "2025-10-01T12:00:00Z", valueLabel: "zebra", commitSha: "abc123", runNumber: 1 },
      { timestamp: "2025-10-02T12:00:00Z", valueLabel: "zebra", commitSha: "def456", runNumber: 2 },
      { timestamp: "2025-10-03T12:00:00Z", valueLabel: "apple", commitSha: "ghi789", runNumber: 3 },
    ]);

    const data = buildBarChartData("test-id", "Test", dataPoints, null);

    expect(data.labels).toEqual(["apple", "zebra"]);
    expect(data.counts).toEqual([1, 2]);
  });

  test("ignores null labels", () => {
    const dataPoints = createLabelDataPoints([
      {
        timestamp: "2025-10-01T12:00:00Z",
        valueLabel: "success",
        commitSha: "abc123",
        runNumber: 1,
      },
      { timestamp: "2025-10-02T12:00:00Z", valueLabel: null, commitSha: "def456", runNumber: 2 },
      {
        timestamp: "2025-10-03T12:00:00Z",
        valueLabel: "success",
        commitSha: "ghi789",
        runNumber: 3,
      },
    ]);

    const data = buildBarChartData("test-id", "Test", dataPoints, null);

    expect(data.labels).toEqual(["success"]);
    expect(data.counts).toEqual([2]);
  });

  test("handles empty data points", () => {
    const data = buildBarChartData("test-id", "Test", [], null);

    expect(data.labels).toEqual([]);
    expect(data.counts).toEqual([]);
  });

  test("handles single label", () => {
    const dataPoints = createLabelDataPoints([
      {
        timestamp: "2025-10-01T12:00:00Z",
        valueLabel: "only-one",
        commitSha: "abc123",
        runNumber: 1,
      },
    ]);

    const data = buildBarChartData("test-id", "Test", dataPoints, null);

    expect(data.labels).toEqual(["only-one"]);
    expect(data.counts).toEqual([1]);
  });
});
