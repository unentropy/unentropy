import { describe, test, beforeEach, afterEach, expect } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = new URL("../..", import.meta.url).pathname;
const CLI = join(PROJECT_ROOT, "src/index.ts");

const ARTIFACT_CONFIG = JSON.stringify({
  storage: { type: "sqlite-artifact" },
  metrics: { coverage: { type: "numeric", command: "echo 0", unit: "percent" } },
});

const S3_CONFIG = JSON.stringify({
  storage: { type: "sqlite-s3" },
  metrics: { coverage: { type: "numeric", command: "echo 0", unit: "percent" } },
});

function runSeedWorkflow(
  cwd: string,
  args: string[]
): { code: number; stdout: string; stderr: string } {
  const r = spawnSync("bun", [CLI, "import", "seed-workflow", ...args], {
    cwd,
    encoding: "utf-8",
  });
  return {
    code: r.status ?? -1,
    stdout: typeof r.stdout === "string" ? r.stdout : "",
    stderr: typeof r.stderr === "string" ? r.stderr : "",
  };
}

describe("unentropy import seed-workflow (integration)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "unentropy-seed-workflow-"));
  });

  afterEach(() => {
    if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
  });

  test("writes canonical YAML to stdout for artifact storage", () => {
    writeFileSync(join(tempDir, "unentropy.json"), ARTIFACT_CONFIG);
    const r = runSeedWorkflow(tempDir, []);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("name: unentropy seed");
    expect(r.stdout).toContain('branches: ["unentropy-import-*"]');
    expect(r.stdout).toContain("name: unentropy-metrics");
    expect(r.stdout).toContain("path: seed.db");
  });

  test("--output writes the file and exits 0", () => {
    writeFileSync(join(tempDir, "unentropy.json"), ARTIFACT_CONFIG);
    const target = join(tempDir, ".github/workflows/unentropy-seed.yml");
    const r = runSeedWorkflow(tempDir, ["--output", target]);
    expect(r.code).toBe(0);
    expect(existsSync(target)).toBe(true);
    const yaml = readFileSync(target, "utf-8");
    expect(yaml).toContain("name: unentropy seed");
  });

  test("--output refuses to overwrite an existing file without --force", () => {
    writeFileSync(join(tempDir, "unentropy.json"), ARTIFACT_CONFIG);
    const target = join(tempDir, "existing.yml");
    writeFileSync(target, "preexisting");
    const r = runSeedWorkflow(tempDir, ["--output", target]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("already exists");
    expect(readFileSync(target, "utf-8")).toBe("preexisting");
  });

  test("--output with --force overwrites an existing file", () => {
    writeFileSync(join(tempDir, "unentropy.json"), ARTIFACT_CONFIG);
    const target = join(tempDir, "existing.yml");
    writeFileSync(target, "preexisting");
    const r = runSeedWorkflow(tempDir, ["--output", target, "--force"]);
    expect(r.code).toBe(0);
    expect(readFileSync(target, "utf-8")).toContain("name: unentropy seed");
  });

  test("refuses on non-artifact storage type", () => {
    writeFileSync(join(tempDir, "unentropy.json"), S3_CONFIG);
    const r = runSeedWorkflow(tempDir, []);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("only applies to the sqlite-artifact backend");
    expect(r.stderr).toContain("sqlite-s3");
  });

  test("reports missing config with exit 1", () => {
    const r = runSeedWorkflow(tempDir, []);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("Config file not found");
  });
});
