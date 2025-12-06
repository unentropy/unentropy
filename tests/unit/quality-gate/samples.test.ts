import { describe, it, expect, beforeEach } from "bun:test";
import { buildMetricSamples } from "../../../src/quality-gate/samples.js";
import type { MetricsRepository } from "../../../src/storage/repository.js";

describe("buildMetricSamples", () => {
  let mockRepository: MetricsRepository;

  beforeEach(() => {
    mockRepository = {
      getBaselineMetricValue: (name: string) => {
        if (name === "coverage") {
          return 80;
        }
        if (name === "size") {
          return 500;
        }
        return undefined;
      },
    } as unknown as MetricsRepository;
  });

  it("should build samples for numeric metrics", () => {
    const collectedMetrics = [
      {
        definition: {
          name: "coverage",
          type: "numeric" as const,
          unit: "percent",
          description: "Code coverage",
        },
        value_numeric: 85,
      },
    ];

    const samples = buildMetricSamples(collectedMetrics, mockRepository, "main", 90);

    expect(samples).toHaveLength(1);
    expect(samples[0]).toEqual({
      name: "coverage",
      unit: "percent",
      type: "numeric",
      baselineValue: 80,
      pullRequestValue: 85,
    });
  });

  it("should filter out label metrics", () => {
    const collectedMetrics = [
      {
        definition: {
          name: "status",
          type: "label" as const,
          description: "Build status",
        },
        value_label: "pass",
      },
      {
        definition: {
          name: "coverage",
          type: "numeric" as const,
          unit: "percent",
          description: "Code coverage",
        },
        value_numeric: 85,
      },
    ];

    const samples = buildMetricSamples(collectedMetrics, mockRepository, "main", 90);

    expect(samples).toHaveLength(1);
    expect(samples[0]?.name).toBe("coverage");
  });

  it("should handle metrics with no baseline data", () => {
    const collectedMetrics = [
      {
        definition: {
          name: "new-metric",
          type: "numeric" as const,
          unit: "count",
          description: "New metric",
        },
        value_numeric: 100,
      },
    ];

    const samples = buildMetricSamples(collectedMetrics, mockRepository, "main", 90);

    expect(samples).toHaveLength(1);
    expect(samples[0]?.baselineValue).toBeUndefined();
    expect(samples[0]?.pullRequestValue).toBe(100);
  });

  it("should handle multiple metrics", () => {
    const collectedMetrics = [
      {
        definition: {
          name: "coverage",
          type: "numeric" as const,
          unit: "percent",
          description: "Code coverage",
        },
        value_numeric: 85,
      },
      {
        definition: {
          name: "size",
          type: "numeric" as const,
          unit: "bytes",
          description: "Bundle size",
        },
        value_numeric: 520,
      },
    ];

    const samples = buildMetricSamples(collectedMetrics, mockRepository, "main", 90);

    expect(samples).toHaveLength(2);
    expect(samples[0]?.name).toBe("coverage");
    expect(samples[0]?.baselineValue).toBe(80);
    expect(samples[1]?.name).toBe("size");
    expect(samples[1]?.baselineValue).toBe(500);
  });

  it("should pass maxAgeDays to repository", () => {
    let capturedMaxAgeDays: number | undefined;

    const mockRepo = {
      getBaselineMetricValue: (_name: string, _branch: string, maxAgeDays: number) => {
        capturedMaxAgeDays = maxAgeDays;
        return undefined;
      },
    } as unknown as MetricsRepository;

    const collectedMetrics = [
      {
        definition: {
          name: "coverage",
          type: "numeric" as const,
          unit: "percent",
          description: "Code coverage",
        },
        value_numeric: 85,
      },
    ];

    buildMetricSamples(collectedMetrics, mockRepo, "main", 30);

    expect(capturedMaxAgeDays).toBe(30);
  });
});
