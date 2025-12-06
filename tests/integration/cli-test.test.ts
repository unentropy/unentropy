import { describe, test, beforeEach, afterEach, expect } from "bun:test";
import { writeFile } from "node:fs/promises";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

describe("test command integration", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `unentropy-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(async () => {
    if (existsSync(tempDir)) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  function runTestCommand(args: string[]): { code: number; stdout: string; stderr: string } {
    const projectRoot = new URL("../..", import.meta.url).pathname;
    const result = spawnSync("bun", [join(projectRoot, "src/index.ts"), "test", ...args], {
      cwd: tempDir,
      encoding: "utf-8",
    });

    const stdout = typeof result.stdout === "string" ? result.stdout : "";
    const stderr = typeof result.stderr === "string" ? result.stderr : "";
    const code = result.status || 0;

    return { code, stdout, stderr };
  }

  test("displays error when config file not found", async () => {
    const result = runTestCommand(["--config", "nonexistent.json"]);

    expect(result.code).toBe(1);
    expect(result.stdout).toContain("Error: Config file not found");
    expect(result.stdout).toContain("Run 'bunx unentropy init' to create one");
  });

  test("validates config schema and shows error for invalid config", async () => {
    const configPath = join(tempDir, "unentropy.json");
    const invalidConfig = {
      metrics: {
        "test-metric": {
          type: "numeric",
          // Missing required 'command' field
        },
      },
    };

    await writeFile(configPath, JSON.stringify(invalidConfig, null, 2));

    const result = runTestCommand(["-c", "unentropy.json"]);

    expect(result.code).toBe(1);
    expect(result.stdout).toContain("Config schema invalid");
  });

  test("successfully collects metrics and displays results", async () => {
    const configPath = join(tempDir, "unentropy.json");
    const config = {
      storage: {
        type: "sqlite-artifact",
      },
      metrics: {
        "test-metric-1": {
          type: "numeric",
          name: "Test Metric 1",
          command: 'echo "42"',
          unit: "integer",
        },
        "test-metric-2": {
          type: "label",
          name: "Test Metric 2",
          command: 'echo "success"',
        },
      },
    };

    await writeFile(configPath, JSON.stringify(config, null, 2));

    const result = runTestCommand(["-c", "unentropy.json"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Config schema valid");
    expect(result.stdout).toContain("Collecting metrics:");
    expect(result.stdout).toContain("✓ Test Metric 1 (integer)");
    expect(result.stdout).toContain("42");
    expect(result.stdout).toContain("✓ Test Metric 2");
    expect(result.stdout).toContain("success");
    expect(result.stdout).toContain("All 2 metrics collected successfully");
  });

  test("reports partial failure when some metrics fail", async () => {
    const configPath = join(tempDir, "unentropy.json");
    const config = {
      storage: {
        type: "sqlite-artifact",
      },
      metrics: {
        "working-metric": {
          type: "numeric",
          name: "Working Metric",
          command: 'echo "100"',
          unit: "integer",
        },
        "failing-metric": {
          type: "numeric",
          name: "Failing Metric",
          command: "exit 1",
        },
      },
    };

    await writeFile(configPath, JSON.stringify(config, null, 2));

    const result = runTestCommand(["-c", "unentropy.json"]);

    expect(result.code).toBe(2);
    expect(result.stdout).toContain("Collecting metrics:");
    expect(result.stdout).toContain("✓ Working Metric (integer)");
    expect(result.stdout).toContain("✗ Failing Metric");
    expect(result.stdout).toContain("1 of 2 metric failed");
  });

  test("shows verbose output with commands when --verbose flag is used", async () => {
    const configPath = join(tempDir, "unentropy.json");
    const config = {
      storage: {
        type: "sqlite-artifact",
      },
      metrics: {
        "test-metric": {
          type: "numeric",
          name: "Test Metric",
          command: 'echo "123"',
          unit: "integer",
        },
      },
    };

    await writeFile(configPath, JSON.stringify(config, null, 2));

    const result = runTestCommand(["-c", "unentropy.json", "--verbose"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Command:");
    expect(result.stdout).toContain('echo "123"');
  });

  test("uses default timeout of 30000ms", async () => {
    const configPath = join(tempDir, "unentropy.json");
    const config = {
      storage: {
        type: "sqlite-artifact",
      },
      metrics: {
        "quick-metric": {
          type: "numeric",
          name: "Quick Metric",
          command: 'echo "99"',
          unit: "integer",
        },
      },
    };

    await writeFile(configPath, JSON.stringify(config, null, 2));

    const result = runTestCommand(["-c", "unentropy.json"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("✓ Quick Metric (integer)");
  });

  test("respects custom timeout option", async () => {
    const configPath = join(tempDir, "unentropy.json");
    const config = {
      storage: {
        type: "sqlite-artifact",
      },
      metrics: {
        "fast-metric": {
          type: "numeric",
          name: "Fast Metric",
          command: 'echo "50"',
          unit: "integer",
        },
      },
    };

    await writeFile(configPath, JSON.stringify(config, null, 2));

    const result = runTestCommand(["-c", "unentropy.json", "--timeout", "5000"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("✓ Fast Metric (integer)");
  });

  test("displays metric values with correct formatting", async () => {
    const configPath = join(tempDir, "unentropy.json");
    const config = {
      storage: {
        type: "sqlite-artifact",
      },
      metrics: {
        "percent-metric": {
          type: "numeric",
          name: "Coverage Percent",
          command: 'echo "87.5"',
          unit: "percent",
        },
        "bytes-metric": {
          type: "numeric",
          name: "Size Bytes",
          command: 'echo "1024000"',
          unit: "bytes",
        },
      },
    };

    await writeFile(configPath, JSON.stringify(config, null, 2));

    const result = runTestCommand(["-c", "unentropy.json"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("87.5%"); // percent: with % symbol
    expect(result.stdout).toContain("1,000 KB"); // bytes: human-readable KB (1024000 bytes)
  });
});
