import { describe, test, beforeEach, afterEach, expect } from "bun:test";
import { existsSync, mkdirSync, rmSync, readFileSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

describe("init command integration", () => {
  let tempDir: string;
  const fixturesDir = join(__dirname, "../fixtures/init-projects");

  beforeEach(async () => {
    tempDir = join(tmpdir(), `unentropy-init-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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

  function setupFixture(fixtureName: string): void {
    const fixtureDir = join(fixturesDir, fixtureName);
    cpSync(fixtureDir, tempDir, { recursive: true });
  }

  function runInitCommand(args: string[]): { code: number; stdout: string; stderr: string } {
    const projectRoot = new URL("../..", import.meta.url).pathname;
    const result = spawnSync("bun", [join(projectRoot, "src/index.ts"), "init", ...args], {
      cwd: tempDir,
      encoding: "utf-8",
    });

    const stdout = typeof result.stdout === "string" ? result.stdout : "";
    const stderr = typeof result.stderr === "string" ? result.stderr : "";
    const code = result.status || 0;

    return { code, stdout, stderr };
  }

  describe("JavaScript/TypeScript project detection", () => {
    test("creates config for minimal JavaScript project with package.json", async () => {
      setupFixture("javascript-minimal");

      const result = runInitCommand([]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Detected project type: javascript");
      expect(result.stdout).toContain("package.json");
      expect(result.stdout).toContain("✓ Created unentropy.json with 3 metrics:");
      expect(result.stdout).toContain("lines-of-code");
      expect(result.stdout).toContain("test-coverage");
      expect(result.stdout).toContain("bundle");

      const configPath = join(tempDir, "unentropy.json");
      expect(existsSync(configPath)).toBe(true);

      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(config.metrics["lines-of-code"].command).toContain("TypeScript");
      expect(config.metrics["test-coverage"].command).toContain("coverage-lcov");
      expect(config.metrics.bundle.command).toContain("size dist");
      expect(config.storage.type).toBe("sqlite-artifact");
      expect(config.qualityGate.mode).toBe("soft");
    });

    test("detects JavaScript project with multiple marker files", async () => {
      setupFixture("javascript-full");

      const result = runInitCommand([]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Detected project type: javascript");
      expect(result.stdout).toContain("package.json");
      expect(result.stdout).toContain("tsconfig.json");
      expect(result.stdout).toContain("yarn.lock");
    });
  });

  describe("PHP project detection", () => {
    test("creates config for minimal PHP project with composer.json", async () => {
      setupFixture("php-minimal");

      const result = runInitCommand([]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Detected project type: php");
      expect(result.stdout).toContain("composer.json");
      expect(result.stdout).toContain("✓ Created unentropy.json with 2 metrics:");
      expect(result.stdout).toContain("lines-of-code");
      expect(result.stdout).toContain("test-coverage");

      const configPath = join(tempDir, "unentropy.json");
      expect(existsSync(configPath)).toBe(true);

      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(config.metrics["lines-of-code"].command).toContain("PHP");
      expect(config.metrics["test-coverage"].command).toContain("coverage-xml");
      expect(config.storage.type).toBe("sqlite-artifact");
    });

    test("detects PHP Laravel project with multiple marker files", async () => {
      setupFixture("php-laravel");

      const result = runInitCommand([]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Detected project type: php");
      expect(result.stdout).toContain("composer.json");
      expect(result.stdout).toContain("composer.lock");
    });
  });

  describe("Go project detection", () => {
    test("creates config for minimal Go project with go.mod", async () => {
      setupFixture("go-minimal");

      const result = runInitCommand([]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Detected project type: go");
      expect(result.stdout).toContain("go.mod");
      expect(result.stdout).toContain("✓ Created unentropy.json with 3 metrics:");
      expect(result.stdout).toContain("lines-of-code");
      expect(result.stdout).toContain("test-coverage");
      expect(result.stdout).toContain("binary-size");

      const configPath = join(tempDir, "unentropy.json");
      expect(existsSync(configPath)).toBe(true);

      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(config.metrics["lines-of-code"].command).toContain("Go");
      expect(config.metrics["test-coverage"].command).toContain("go tool cover");
      expect(config.metrics["binary-size"].command).toContain("size ./bin");
      expect(config.storage.type).toBe("sqlite-artifact");
    });

    test("detects Go project with go.sum file", async () => {
      setupFixture("go-full");

      const result = runInitCommand([]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Detected project type: go");
      expect(result.stdout).toContain("go.mod");
      expect(result.stdout).toContain("go.sum");
    });
  });

  describe("Python project detection", () => {
    test("creates config for Python project with pyproject.toml", async () => {
      setupFixture("python-minimal");

      const result = runInitCommand([]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Detected project type: python");
      expect(result.stdout).toContain("pyproject.toml");
      expect(result.stdout).toContain("✓ Created unentropy.json with 2 metrics:");
      expect(result.stdout).toContain("lines-of-code");
      expect(result.stdout).toContain("test-coverage");

      const configPath = join(tempDir, "unentropy.json");
      expect(existsSync(configPath)).toBe(true);

      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(config.metrics["lines-of-code"].command).toContain("Python");
      expect(config.metrics["test-coverage"].command).toContain("coverage.lcov");
      expect(config.storage.type).toBe("sqlite-artifact");
    });

    test("detects Python project with requirements.txt", async () => {
      setupFixture("python-requirements");

      const result = runInitCommand([]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Detected project type: python");
      expect(result.stdout).toContain("requirements.txt");
    });

    test("detects Python project with multiple marker files", async () => {
      setupFixture("python-full");

      const result = runInitCommand([]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Detected project type: python");
      expect(result.stdout).toContain("pyproject.toml");
      expect(result.stdout).toContain("setup.py");
      expect(result.stdout).toContain("Pipfile");
    });
  });

  describe("priority-based detection", () => {
    test("detects JavaScript when both JS and PHP markers present", async () => {
      setupFixture("mixed-project");

      const result = runInitCommand([]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Detected project type: javascript");
      expect(result.stdout).not.toContain("Detected project type: php");

      const config = JSON.parse(readFileSync(join(tempDir, "unentropy.json"), "utf-8"));
      expect(config.metrics["lines-of-code"].command).toContain("TypeScript");
      expect(config.metrics["lines-of-code"].command).not.toContain("PHP");
    });
  });

  describe("error handling", () => {
    test("shows error when no project type detected", async () => {
      setupFixture("empty-project");

      const result = runInitCommand([]);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Could not detect project type");
      expect(result.stderr).toContain("Use --type to specify");
    });

    test("shows error when config already exists", async () => {
      setupFixture("existing-config");

      const result = runInitCommand([]);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain("unentropy.json already exists");
      expect(result.stderr).toContain("Use --force to overwrite");
    });

    test("allows overwrite with --force flag", async () => {
      setupFixture("existing-config");

      const result = runInitCommand(["--force"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("✓ Created unentropy.json");

      const config = JSON.parse(readFileSync(join(tempDir, "unentropy.json"), "utf-8"));
      expect(Object.keys(config.metrics).length).toBe(3);
      expect(config.metrics["lines-of-code"]).toBeDefined();
    });

    test("shows error for invalid --type value", async () => {
      setupFixture("empty-project");

      const result = runInitCommand(["--type", "invalid"]);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Invalid project type "invalid"');
      expect(result.stderr).toContain("Valid types: javascript, php, go, python");
    });

    test("shows error for invalid --storage value", async () => {
      setupFixture("javascript-minimal");

      const result = runInitCommand(["--storage", "invalid"]);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Invalid storage type "invalid"');
      expect(result.stderr).toContain("Valid types: artifact, s3, local");
    });
  });

  describe("forced project type", () => {
    test("uses forced project type instead of detection", async () => {
      setupFixture("javascript-minimal");

      const result = runInitCommand(["--type", "php"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Using forced project type: php");
      expect(result.stdout).not.toContain("Detected project type");

      const config = JSON.parse(readFileSync(join(tempDir, "unentropy.json"), "utf-8"));
      expect(config.metrics["lines-of-code"].command).toContain("PHP");
    });
  });

  describe("storage type selection", () => {
    test("uses s3 storage when --storage s3 is specified", async () => {
      setupFixture("javascript-minimal");

      const result = runInitCommand(["--storage", "s3"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("S3 SECRETS REQUIRED");
      expect(result.stdout).toContain("AWS_ENDPOINT_URL");
      expect(result.stdout).toContain("AWS_BUCKET_NAME");

      const config = JSON.parse(readFileSync(join(tempDir, "unentropy.json"), "utf-8"));
      expect(config.storage.type).toBe("sqlite-s3");
    });

    test("uses local storage when --storage local is specified", async () => {
      setupFixture("javascript-minimal");

      const result = runInitCommand(["--storage", "local"]);

      expect(result.code).toBe(0);

      const config = JSON.parse(readFileSync(join(tempDir, "unentropy.json"), "utf-8"));
      expect(config.storage.type).toBe("sqlite-local");
    });
  });

  describe("dry-run mode", () => {
    test("shows preview without creating file", async () => {
      setupFixture("javascript-minimal");

      const result = runInitCommand(["--dry-run"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Would create unentropy.json:");
      expect(result.stdout).toContain('"metrics"');
      expect(result.stdout).toContain('"storage"');

      const configPath = join(tempDir, "unentropy.json");
      expect(existsSync(configPath)).toBe(false);
    });

    test("dry-run works even when config exists", async () => {
      setupFixture("existing-config");

      const result = runInitCommand(["--dry-run"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Would create unentropy.json:");
    });
  });

  describe("workflow output", () => {
    test("displays GitHub Actions workflow examples", async () => {
      setupFixture("javascript-minimal");

      const result = runInitCommand([]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("TRACK METRICS");
      expect(result.stdout).toContain("QUALITY GATE");
      expect(result.stdout).toContain("name: Metrics");
      expect(result.stdout).toContain("name: CI");
      expect(result.stdout).toContain("actions/setup-node@v4");
      expect(result.stdout).toContain("npm ci");
      expect(result.stdout).toContain("npm test -- --coverage");
      expect(result.stdout).toContain("unentropy/track-metrics@v1");
      expect(result.stdout).toContain("unentropy/quality-gate@v1");
    });

    test("includes next steps in output", async () => {
      setupFixture("javascript-minimal");

      const result = runInitCommand([]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Next steps:");
      expect(result.stdout).toContain("Run your tests with coverage");
      expect(result.stdout).toContain("bunx unentropy test");
      expect(result.stdout).toContain("Add the workflows below to your CI");
    });
  });
});
