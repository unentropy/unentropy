import { describe, it, expect } from "bun:test";
import { loadConfig } from "../../../src/config/loader";
import * as path from "path";

describe("Config Loader", () => {
  const fixturesDir = path.join(__dirname, "fixtures");

  it("should parse valid minimal config", async () => {
    const configPath = path.join(fixturesDir, "valid-minimal.json");
    const config = await loadConfig(configPath);

    expect(config.metrics).toHaveLength(1);
    expect(config.metrics[0]?.name).toBe("test-coverage");
    expect(config.metrics[0]?.type).toBe("numeric");
    expect(config.metrics[0]?.command).toBe(
      "npm run test:coverage -- --json | jq -r '.total.lines.pct'"
    );
  });

  it("should parse valid complete config with all fields", async () => {
    const configPath = path.join(fixturesDir, "valid-complete.json");
    const config = await loadConfig(configPath);

    expect(config.metrics).toHaveLength(3);

    const metric = config.metrics[0];
    expect(metric?.name).toBe("test-coverage");
    expect(metric?.type).toBe("numeric");
    expect(metric?.description).toBe("Percentage of code covered by tests");
    expect(metric?.unit).toBe("percent");
    expect(metric?.command).toBe("npm run test:coverage -- --json | jq -r '.total.lines.pct'");
  });

  it("should parse config with label type metric", async () => {
    const configPath = path.join(fixturesDir, "valid-label.json");
    const config = await loadConfig(configPath);

    expect(config.metrics).toHaveLength(1);
    expect(config.metrics[0]?.type).toBe("label");
    expect(config.metrics[0]?.name).toBe("build-status");
  });

  it("should throw error for missing config file", async () => {
    const configPath = path.join(fixturesDir, "nonexistent.json");

    await expect(loadConfig(configPath)).rejects.toThrow();
  });

  it("should throw error for invalid JSON", async () => {
    const configPath = path.join(fixturesDir, "invalid-json.json");

    await expect(loadConfig(configPath)).rejects.toThrow(Error);
  });

  describe("Quality Gate Configuration", () => {
    it("should parse config with qualityGate in soft mode", async () => {
      const configPath = path.join(fixturesDir, "valid-quality-gate-soft.json");
      const config = await loadConfig(configPath);

      expect(config.qualityGate).toBeDefined();
      expect(config.qualityGate?.mode).toBe("soft");
      expect(config.qualityGate?.enablePullRequestComment).toBe(true);
      expect(config.qualityGate?.maxCommentMetrics).toBe(30);
      expect(config.qualityGate?.maxCommentCharacters).toBe(8000);
    });

    it("should parse config with qualityGate baseline configuration", async () => {
      const configPath = path.join(fixturesDir, "valid-quality-gate-soft.json");
      const config = await loadConfig(configPath);

      expect(config.qualityGate?.baseline).toBeDefined();
      expect(config.qualityGate?.baseline?.referenceBranch).toBe("main");
      expect(config.qualityGate?.baseline?.maxAgeDays).toBe(90);
    });

    it("should parse config with qualityGate thresholds", async () => {
      const configPath = path.join(fixturesDir, "valid-quality-gate-soft.json");
      const config = await loadConfig(configPath);

      expect(config.qualityGate?.thresholds).toBeDefined();
      expect(config.qualityGate?.thresholds).toHaveLength(2);

      const coverageThreshold = config.qualityGate?.thresholds?.[0];
      expect(coverageThreshold?.metric).toBe("coverage");
      expect(coverageThreshold?.mode).toBe("no-regression");
      expect(coverageThreshold?.tolerance).toBe(0.5);
      expect(coverageThreshold?.severity).toBe("blocker");

      const bundleSizeThreshold = config.qualityGate?.thresholds?.[1];
      expect(bundleSizeThreshold?.metric).toBe("bundle-size");
      expect(bundleSizeThreshold?.mode).toBe("delta-max-drop");
      expect(bundleSizeThreshold?.maxDropPercent).toBe(5);
      expect(bundleSizeThreshold?.severity).toBe("warning");
    });

    it("should parse config with qualityGate in hard mode", async () => {
      const configPath = path.join(fixturesDir, "valid-quality-gate-hard.json");
      const config = await loadConfig(configPath);

      expect(config.qualityGate).toBeDefined();
      expect(config.qualityGate?.mode).toBe("hard");
      expect(config.qualityGate?.thresholds).toHaveLength(1);

      const threshold = config.qualityGate?.thresholds?.[0];
      expect(threshold?.metric).toBe("coverage");
      expect(threshold?.mode).toBe("min");
      expect(threshold?.target).toBe(80);
      expect(threshold?.severity).toBe("blocker");
    });

    it("should parse config with qualityGate in off mode", async () => {
      const configPath = path.join(fixturesDir, "valid-quality-gate-off.json");
      const config = await loadConfig(configPath);

      expect(config.qualityGate).toBeDefined();
      expect(config.qualityGate?.mode).toBe("off");
    });

    it("should parse config without qualityGate block", async () => {
      const configPath = path.join(fixturesDir, "valid-minimal.json");
      const config = await loadConfig(configPath);

      expect(config.qualityGate).toBeUndefined();
    });

    it("should return UnentropyConfigWithQualityGate type", async () => {
      const configPath = path.join(fixturesDir, "valid-quality-gate-soft.json");
      const config = await loadConfig(configPath);

      expect(config).toHaveProperty("metrics");
      expect(config).toHaveProperty("storage");
      expect(config).toHaveProperty("qualityGate");
      expect(config.metrics).toBeInstanceOf(Array);
      expect(config.storage).toHaveProperty("type");
    });
  });
});
