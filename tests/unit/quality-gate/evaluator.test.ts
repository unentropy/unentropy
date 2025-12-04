import { describe, it, expect } from "bun:test";
import { evaluateThreshold, evaluateQualityGate } from "../../../src/quality-gate/evaluator.js";
import type { MetricSample } from "../../../src/quality-gate/types.js";
import type { MetricThresholdConfig, QualityGateConfig } from "../../../src/config/schema.js";

describe("evaluateThreshold", () => {
  describe("min mode", () => {
    it("should pass when value meets minimum", () => {
      const sample: MetricSample = {
        name: "coverage",
        type: "numeric",
        unit: "percent",
        baselineValue: 80,
        pullRequestValue: 85,
      };
      const threshold: MetricThresholdConfig = {
        metric: "coverage",
        mode: "min",
        target: 80,
      };
      const result = evaluateThreshold(sample, threshold, 80);
      expect(result.status).toBe("pass");
    });

    it("should fail when value below minimum", () => {
      const sample: MetricSample = {
        name: "coverage",
        type: "numeric",
        unit: "percent",
        baselineValue: 80,
        pullRequestValue: 75,
      };
      const threshold: MetricThresholdConfig = {
        metric: "coverage",
        mode: "min",
        target: 80,
      };
      const result = evaluateThreshold(sample, threshold, 80);
      expect(result.status).toBe("fail");
      expect(result.message).toContain("below minimum threshold");
    });

    it("should be unknown when target not specified", () => {
      const sample: MetricSample = {
        name: "coverage",
        type: "numeric",
        unit: "percent",
        baselineValue: 80,
        pullRequestValue: 85,
      };
      const threshold: MetricThresholdConfig = {
        metric: "coverage",
        mode: "min",
      };
      const result = evaluateThreshold(sample, threshold, 80);
      expect(result.status).toBe("unknown");
    });
  });

  describe("max mode", () => {
    it("should pass when value below maximum", () => {
      const sample: MetricSample = {
        name: "bundle-size",
        type: "numeric",
        unit: "bytes",
        baselineValue: 500,
        pullRequestValue: 450,
      };
      const threshold: MetricThresholdConfig = {
        metric: "bundle-size",
        mode: "max",
        target: 500,
      };
      const result = evaluateThreshold(sample, threshold, 500);
      expect(result.status).toBe("pass");
    });

    it("should fail when value exceeds maximum", () => {
      const sample: MetricSample = {
        name: "bundle-size",
        type: "numeric",
        unit: "bytes",
        baselineValue: 500,
        pullRequestValue: 550,
      };
      const threshold: MetricThresholdConfig = {
        metric: "bundle-size",
        mode: "max",
        target: 500,
      };
      const result = evaluateThreshold(sample, threshold, 500);
      expect(result.status).toBe("fail");
      expect(result.message).toContain("exceeds maximum threshold");
    });
  });

  describe("no-regression mode", () => {
    it("should pass when within tolerance", () => {
      const sample: MetricSample = {
        name: "coverage",
        type: "numeric",
        unit: "percent",
        baselineValue: 80,
        pullRequestValue: 79.6,
      };
      const threshold: MetricThresholdConfig = {
        metric: "coverage",
        mode: "no-regression",
        tolerance: 0.5,
      };
      const result = evaluateThreshold(sample, threshold, 80);
      expect(result.status).toBe("pass");
    });

    it("should fail when beyond tolerance", () => {
      const sample: MetricSample = {
        name: "coverage",
        type: "numeric",
        unit: "percent",
        baselineValue: 80,
        pullRequestValue: 79,
      };
      const threshold: MetricThresholdConfig = {
        metric: "coverage",
        mode: "no-regression",
        tolerance: 0.5,
      };
      const result = evaluateThreshold(sample, threshold, 80);
      expect(result.status).toBe("fail");
      expect(result.message).toContain("regressed beyond tolerance");
    });

    it("should use default tolerance when not specified", () => {
      const sample: MetricSample = {
        name: "coverage",
        type: "numeric",
        unit: "percent",
        baselineValue: 80,
        pullRequestValue: 79.6,
      };
      const threshold: MetricThresholdConfig = {
        metric: "coverage",
        mode: "no-regression",
      };
      const result = evaluateThreshold(sample, threshold, 80);
      expect(result.status).toBe("pass");
    });
  });

  describe("delta-max-drop mode", () => {
    it("should pass when drop is within limit", () => {
      const sample: MetricSample = {
        name: "coverage",
        type: "numeric",
        unit: "percent",
        baselineValue: 80,
        pullRequestValue: 77,
      };
      const threshold: MetricThresholdConfig = {
        metric: "coverage",
        mode: "delta-max-drop",
        maxDropPercent: 5,
      };
      const result = evaluateThreshold(sample, threshold, 80);
      expect(result.status).toBe("pass");
    });

    it("should fail when drop exceeds limit", () => {
      const sample: MetricSample = {
        name: "coverage",
        type: "numeric",
        unit: "percent",
        baselineValue: 80,
        pullRequestValue: 72,
      };
      const threshold: MetricThresholdConfig = {
        metric: "coverage",
        mode: "delta-max-drop",
        maxDropPercent: 5,
      };
      const result = evaluateThreshold(sample, threshold, 80);
      expect(result.status).toBe("fail");
      expect(result.message).toContain("dropped by 10.00%");
    });

    it("should be unknown when maxDropPercent not specified", () => {
      const sample: MetricSample = {
        name: "coverage",
        type: "numeric",
        unit: "percent",
        baselineValue: 80,
        pullRequestValue: 77,
      };
      const threshold: MetricThresholdConfig = {
        metric: "coverage",
        mode: "delta-max-drop",
      };
      const result = evaluateThreshold(sample, threshold, 80);
      expect(result.status).toBe("unknown");
    });

    it("should be unknown when baseline is zero", () => {
      const sample: MetricSample = {
        name: "coverage",
        type: "numeric",
        unit: "percent",
        baselineValue: 0,
        pullRequestValue: 5,
      };
      const threshold: MetricThresholdConfig = {
        metric: "coverage",
        mode: "delta-max-drop",
        maxDropPercent: 5,
      };
      const result = evaluateThreshold(sample, threshold, 0);
      expect(result.status).toBe("unknown");
      expect(result.message).toContain("Cannot calculate percentage drop from zero");
    });
  });

  describe("missing data handling", () => {
    it("should be unknown when PR value is missing", () => {
      const sample: MetricSample = {
        name: "coverage",
        type: "numeric",
        unit: "percent",
        baselineValue: 80,
        pullRequestValue: undefined,
      };
      const threshold: MetricThresholdConfig = {
        metric: "coverage",
        mode: "min",
        target: 80,
      };
      const result = evaluateThreshold(sample, threshold, 80);
      expect(result.status).toBe("unknown");
      expect(result.message).toContain("not available for pull request");
    });

    it("should be unknown when baseline is missing", () => {
      const sample: MetricSample = {
        name: "coverage",
        type: "numeric",
        unit: "percent",
        baselineValue: undefined,
        pullRequestValue: 85,
      };
      const threshold: MetricThresholdConfig = {
        metric: "coverage",
        mode: "min",
        target: 80,
      };
      const result = evaluateThreshold(sample, threshold, undefined);
      expect(result.status).toBe("unknown");
      expect(result.message).toContain("Baseline data not available");
    });
  });

  describe("severity and blocking", () => {
    it("should mark blocker severity as blocking", () => {
      const sample: MetricSample = {
        name: "coverage",
        type: "numeric",
        unit: "percent",
        baselineValue: 80,
        pullRequestValue: 75,
      };
      const threshold: MetricThresholdConfig = {
        metric: "coverage",
        mode: "min",
        target: 80,
        severity: "blocker",
      };
      const result = evaluateThreshold(sample, threshold, 80);
      expect(result.isBlocking).toBe(true);
    });

    it("should not mark warning severity as blocking", () => {
      const sample: MetricSample = {
        name: "coverage",
        type: "numeric",
        unit: "percent",
        baselineValue: 80,
        pullRequestValue: 75,
      };
      const threshold: MetricThresholdConfig = {
        metric: "coverage",
        mode: "min",
        target: 80,
        severity: "warning",
      };
      const result = evaluateThreshold(sample, threshold, 80);
      expect(result.isBlocking).toBe(false);
    });
  });

  describe("delta calculations", () => {
    it("should calculate absolute and relative deltas", () => {
      const sample: MetricSample = {
        name: "coverage",
        type: "numeric",
        unit: "percent",
        baselineValue: 80,
        pullRequestValue: 85,
      };
      const threshold: MetricThresholdConfig = {
        metric: "coverage",
        mode: "min",
        target: 70,
      };
      const result = evaluateThreshold(sample, threshold, 80);
      expect(result.absoluteDelta).toBe(5);
      expect(result.relativeDeltaPercent).toBe(6.25);
    });
  });
});

describe("evaluateQualityGate", () => {
  const baselineInfo = {
    referenceBranch: "main",
    maxAgeDays: 90,
  };

  describe("mode off", () => {
    it("should return unknown status when mode is off", () => {
      const samples: MetricSample[] = [
        {
          name: "coverage",
          type: "numeric",
          unit: "percent",
          baselineValue: 80,
          pullRequestValue: 85,
        },
      ];
      const config: QualityGateConfig = {
        mode: "off",
      };
      const result = evaluateQualityGate(samples, config, baselineInfo);
      expect(result.status).toBe("unknown");
      expect(result.mode).toBe("off");
      expect(result.summary.totalMetrics).toBe(1);
      expect(result.summary.evaluatedMetrics).toBe(0);
    });
  });

  describe("no thresholds configured", () => {
    it("should return unknown status when no thresholds are defined", () => {
      const samples: MetricSample[] = [
        {
          name: "coverage",
          type: "numeric",
          unit: "percent",
          baselineValue: 80,
          pullRequestValue: 85,
        },
      ];
      const config: QualityGateConfig = {
        mode: "soft",
        thresholds: [],
      };
      const result = evaluateQualityGate(samples, config, baselineInfo);
      expect(result.status).toBe("unknown");
      expect(result.summary.evaluatedMetrics).toBe(0);
    });

    it("should still calculate deltas for metrics without thresholds", () => {
      const samples: MetricSample[] = [
        {
          name: "coverage",
          type: "numeric",
          unit: "percent",
          baselineValue: 80,
          pullRequestValue: 85,
        },
      ];
      const config: QualityGateConfig = {
        mode: "soft",
        thresholds: [],
      };
      const result = evaluateQualityGate(samples, config, baselineInfo);
      expect(result.metrics[0]?.absoluteDelta).toBe(5);
      expect(result.metrics[0]?.status).toBe("unknown");
    });
  });

  describe("with thresholds", () => {
    it("should pass when all metrics pass", () => {
      const samples: MetricSample[] = [
        {
          name: "coverage",
          type: "numeric",
          unit: "percent",
          baselineValue: 80,
          pullRequestValue: 85,
        },
      ];
      const config: QualityGateConfig = {
        mode: "soft",
        thresholds: [
          {
            metric: "coverage",
            mode: "min",
            target: 80,
          },
        ],
      };
      const result = evaluateQualityGate(samples, config, baselineInfo);
      expect(result.status).toBe("pass");
      expect(result.summary.passed).toBe(1);
      expect(result.summary.failed).toBe(0);
      expect(result.failingMetrics).toHaveLength(0);
    });

    it("should fail when blocking metric fails", () => {
      const samples: MetricSample[] = [
        {
          name: "coverage",
          type: "numeric",
          unit: "percent",
          baselineValue: 80,
          pullRequestValue: 75,
        },
      ];
      const config: QualityGateConfig = {
        mode: "hard",
        thresholds: [
          {
            metric: "coverage",
            mode: "min",
            target: 80,
            severity: "blocker",
          },
        ],
      };
      const result = evaluateQualityGate(samples, config, baselineInfo);
      expect(result.status).toBe("fail");
      expect(result.summary.failed).toBe(1);
      expect(result.failingMetrics).toHaveLength(1);
      expect(result.failingMetrics[0]?.isBlocking).toBe(true);
    });

    it("should pass when only warnings fail", () => {
      const samples: MetricSample[] = [
        {
          name: "coverage",
          type: "numeric",
          unit: "percent",
          baselineValue: 80,
          pullRequestValue: 75,
        },
      ];
      const config: QualityGateConfig = {
        mode: "hard",
        thresholds: [
          {
            metric: "coverage",
            mode: "min",
            target: 80,
            severity: "warning",
          },
        ],
      };
      const result = evaluateQualityGate(samples, config, baselineInfo);
      expect(result.status).toBe("pass");
      expect(result.failingMetrics).toHaveLength(0);
    });
  });

  describe("mixed scenarios", () => {
    it("should handle multiple metrics with different results", () => {
      const samples: MetricSample[] = [
        {
          name: "coverage",
          type: "numeric",
          unit: "percent",
          baselineValue: 80,
          pullRequestValue: 85,
        },
        {
          name: "bundle-size",
          type: "numeric",
          unit: "bytes",
          baselineValue: 500,
          pullRequestValue: 550,
        },
      ];
      const config: QualityGateConfig = {
        mode: "soft",
        thresholds: [
          {
            metric: "coverage",
            mode: "min",
            target: 80,
          },
          {
            metric: "bundle-size",
            mode: "max",
            target: 500,
          },
        ],
      };
      const result = evaluateQualityGate(samples, config, baselineInfo);
      expect(result.summary.passed).toBe(1);
      expect(result.summary.failed).toBe(1);
      expect(result.status).toBe("fail");
    });

    it("should handle metrics without thresholds alongside those with thresholds", () => {
      const samples: MetricSample[] = [
        {
          name: "coverage",
          type: "numeric",
          unit: "percent",
          baselineValue: 80,
          pullRequestValue: 85,
        },
        {
          name: "loc",
          type: "numeric",
          unit: "lines",
          baselineValue: 1000,
          pullRequestValue: 1100,
        },
      ];
      const config: QualityGateConfig = {
        mode: "soft",
        thresholds: [
          {
            metric: "coverage",
            mode: "min",
            target: 80,
          },
        ],
      };
      const result = evaluateQualityGate(samples, config, baselineInfo);
      expect(result.summary.totalMetrics).toBe(2);
      expect(result.summary.evaluatedMetrics).toBe(1);
      expect(result.metrics[1]?.status).toBe("unknown");
      expect(result.metrics[1]?.message).toContain("No threshold configured");
    });
  });

  describe("summary statistics", () => {
    it("should correctly count all metric states", () => {
      const samples: MetricSample[] = [
        {
          name: "coverage",
          type: "numeric",
          unit: "percent",
          baselineValue: 80,
          pullRequestValue: 85,
        },
        {
          name: "bundle-size",
          type: "numeric",
          unit: "bytes",
          baselineValue: 500,
          pullRequestValue: 550,
        },
        {
          name: "loc",
          type: "numeric",
          unit: "lines",
          baselineValue: undefined,
          pullRequestValue: 1100,
        },
      ];
      const config: QualityGateConfig = {
        mode: "soft",
        thresholds: [
          {
            metric: "coverage",
            mode: "min",
            target: 80,
          },
          {
            metric: "bundle-size",
            mode: "max",
            target: 500,
          },
          {
            metric: "loc",
            mode: "min",
            target: 1000,
          },
        ],
      };
      const result = evaluateQualityGate(samples, config, baselineInfo);
      expect(result.summary.totalMetrics).toBe(3);
      expect(result.summary.evaluatedMetrics).toBe(3);
      expect(result.summary.passed).toBe(1);
      expect(result.summary.failed).toBe(1);
      expect(result.summary.unknown).toBe(1);
    });
  });

  describe("baseline info", () => {
    it("should include baseline info in result", () => {
      const samples: MetricSample[] = [];
      const config: QualityGateConfig = {
        mode: "soft",
      };
      const result = evaluateQualityGate(samples, config, baselineInfo);
      expect(result.baselineInfo).toEqual(baselineInfo);
    });
  });
});
