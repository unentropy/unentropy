import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { parseMetricValue, collectMetrics } from "../../../src/collector/collector";
import type { ResolvedMetricConfig } from "../../../src/config/schema";
import { Storage } from "../../../src/storage/storage";
import { unlink } from "node:fs/promises";
import { existsSync } from "node:fs";

const TEST_DB_PATH = "/tmp/test-collector.db";
let testStorage: Storage;

beforeAll(async () => {
  if (existsSync(TEST_DB_PATH)) {
    await unlink(TEST_DB_PATH);
  }

  testStorage = new Storage({ type: "sqlite-local", path: TEST_DB_PATH });
  await testStorage.initialize();
});

afterAll(async () => {
  await testStorage.close();
  if (existsSync(TEST_DB_PATH)) {
    await unlink(TEST_DB_PATH);
  }
});

describe("parseMetricValue", () => {
  test("parses valid numeric value from stdout", () => {
    const result = parseMetricValue("42.5", "numeric");

    expect(result.success).toBe(true);
    expect(result.numericValue).toBe(42.5);
    expect(result.labelValue).toBeUndefined();
  });

  test("parses integer as numeric value", () => {
    const result = parseMetricValue("100", "numeric");

    expect(result.success).toBe(true);
    expect(result.numericValue).toBe(100);
  });

  test("parses negative numeric value", () => {
    const result = parseMetricValue("-25.75", "numeric");

    expect(result.success).toBe(true);
    expect(result.numericValue).toBe(-25.75);
  });

  test("parses zero as numeric value", () => {
    const result = parseMetricValue("0", "numeric");

    expect(result.success).toBe(true);
    expect(result.numericValue).toBe(0);
  });

  test("parses scientific notation", () => {
    const result = parseMetricValue("1.5e3", "numeric");

    expect(result.success).toBe(true);
    expect(result.numericValue).toBe(1500);
  });

  test("trims whitespace from numeric value", () => {
    const result = parseMetricValue("  42.5  \n", "numeric");

    expect(result.success).toBe(true);
    expect(result.numericValue).toBe(42.5);
  });

  test("returns failure for non-numeric string when type is numeric", () => {
    const result = parseMetricValue("not-a-number", "numeric");

    expect(result.success).toBe(false);
    expect(result.error).toContain("numeric");
  });

  test("returns failure for empty string when type is numeric", () => {
    const result = parseMetricValue("", "numeric");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("parses label value from stdout", () => {
    const result = parseMetricValue("passing", "label");

    expect(result.success).toBe(true);
    expect(result.labelValue).toBe("passing");
    expect(result.numericValue).toBeUndefined();
  });

  test("trims whitespace from label value", () => {
    const result = parseMetricValue("  green  \n", "label");

    expect(result.success).toBe(true);
    expect(result.labelValue).toBe("green");
  });

  test("preserves spaces within label value", () => {
    const result = parseMetricValue("build passing", "label");

    expect(result.success).toBe(true);
    expect(result.labelValue).toBe("build passing");
  });

  test("accepts numeric-looking string as label", () => {
    const result = parseMetricValue("42", "label");

    expect(result.success).toBe(true);
    expect(result.labelValue).toBe("42");
  });

  test("returns failure for empty label value", () => {
    const result = parseMetricValue("", "label");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("returns failure for whitespace-only label value", () => {
    const result = parseMetricValue("   \n  ", "label");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("handles multiline output by taking first line", () => {
    const result = parseMetricValue("42\nextra line\n", "numeric");

    expect(result.success).toBe(true);
    expect(result.numericValue).toBe(42);
  });

  test("handles label with multiline output by taking first line", () => {
    const result = parseMetricValue("passing\nextra\n", "label");

    expect(result.success).toBe(true);
    expect(result.labelValue).toBe("passing");
  });
});

describe("collectMetrics - partial failure handling", () => {
  test("continues collecting when one metric fails", async () => {
    const metrics: Record<string, ResolvedMetricConfig> = {
      "working-metric": { id: "working-metric", type: "numeric", command: "echo 42" },
      "failing-metric": { id: "failing-metric", type: "numeric", command: "exit 1" },
      "another-working": { id: "another-working", type: "label", command: 'echo "green"' },
    };

    const result = await collectMetrics(metrics);

    expect(result.total).toBe(3);
    expect(result.successful).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]?.metricName).toBe("failing-metric");
  });

  test("records failure details for failed metrics", async () => {
    const metrics: Record<string, ResolvedMetricConfig> = {
      "timeout-metric": {
        id: "timeout-metric",
        type: "numeric",
        command: "sleep 60",
        timeout: 100,
      },
    };

    const result = await collectMetrics(metrics);

    expect(result.successful).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.failures[0]?.reason).toContain("timed out");
  }, 10000);

  test("handles all metrics failing", async () => {
    const metrics: Record<string, ResolvedMetricConfig> = {
      fail1: { id: "fail1", type: "numeric", command: "exit 1" },
      fail2: { id: "fail2", type: "numeric", command: "exit 1" },
    };

    const result = await collectMetrics(metrics);

    expect(result.total).toBe(2);
    expect(result.successful).toBe(0);
    expect(result.failed).toBe(2);
    expect(result.failures).toHaveLength(2);
  });

  test("handles all metrics succeeding", async () => {
    const metrics: Record<string, ResolvedMetricConfig> = {
      metric1: { id: "metric1", type: "numeric", command: "echo 1" },
      metric2: { id: "metric2", type: "numeric", command: "echo 2" },
      metric3: { id: "metric3", type: "label", command: 'echo "label"' },
    };

    const result = await collectMetrics(metrics);

    expect(result.total).toBe(3);
    expect(result.successful).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.failures).toHaveLength(0);
  });

  test("handles parse error as failure", async () => {
    const metrics: Record<string, ResolvedMetricConfig> = {
      "parse-fail": { id: "parse-fail", type: "numeric", command: 'echo "not-a-number"' },
    };

    const result = await collectMetrics(metrics);

    expect(result.successful).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.failures[0]?.reason).toContain("parse");
  });

  test("collects metrics in order", async () => {
    const metrics: Record<string, ResolvedMetricConfig> = {
      first: { id: "first", type: "label", command: 'echo "1"' },
      second: { id: "second", type: "label", command: 'echo "2"' },
      third: { id: "third", type: "label", command: 'echo "3"' },
    };

    const result = await collectMetrics(metrics);

    expect(result.successful).toBe(3);
  });

  test("handles empty metrics object", async () => {
    const metrics: Record<string, ResolvedMetricConfig> = {};

    const result = await collectMetrics(metrics);

    expect(result.total).toBe(0);
    expect(result.successful).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.failures).toHaveLength(0);
  });
});
