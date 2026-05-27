import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { parseSize, collectSize } from "../../../../src/metrics/collectors/size";

describe("parseSize", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "size-test-"));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("throws for empty path", async () => {
    expect(parseSize("")).rejects.toThrow("Source path must be a non-empty string");
  });

  it("calculates size of a directory", async () => {
    writeFileSync(join(testDir, "file.ts"), "hello");
    mkdirSync(join(testDir, "sub"));
    writeFileSync(join(testDir, "sub", "other.ts"), "world");

    const size = await parseSize(testDir);
    expect(size).toBeGreaterThan(0);
  });

  it("resolves relative path against cwd", async () => {
    writeFileSync(join(testDir, "file.ts"), "hello");
    const size = await parseSize("file.ts", { cwd: testDir });
    expect(size).toBeGreaterThan(0);
  });

  it("throws for non-existent path", async () => {
    expect(parseSize(join(testDir, "nonexistent"))).rejects.toThrow();
  });

  it("resolves glob patterns", async () => {
    mkdirSync(join(testDir, "src"));
    writeFileSync(join(testDir, "src", "a.ts"), "hello");
    writeFileSync(join(testDir, "src", "b.ts"), "world");

    const size = await parseSize(join(testDir, "src", "*"), { cwd: testDir });
    expect(size).toBeGreaterThan(0);
  });
});

describe("collectSize", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "collect-size-"));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("throws for empty paths", async () => {
    expect(collectSize([])).rejects.toThrow("At least one path is required");
  });

  it("collects size from glob patterns", async () => {
    mkdirSync(join(testDir, "src"));
    writeFileSync(join(testDir, "src", "a.ts"), "hello");
    writeFileSync(join(testDir, "src", "b.ts"), "world");

    const size = await collectSize(["src/*.ts"], { cwd: testDir });
    expect(size).toBeGreaterThan(0);
  });

  it("collects size from multiple patterns", async () => {
    mkdirSync(join(testDir, "lib"));
    writeFileSync(join(testDir, "src.ts"), "hello");
    writeFileSync(join(testDir, "lib", "util.ts"), "world");

    const size = await collectSize(["*.ts", "lib/*.ts"], { cwd: testDir });
    expect(size).toBeGreaterThan(0);
  });

  it("respects exclude patterns", async () => {
    mkdirSync(join(testDir, "src"));
    writeFileSync(join(testDir, "a.ts"), "hello");
    writeFileSync(join(testDir, "src", "b.ts"), "world");

    const sizeWithExclude = await collectSize(["**/*.ts"], {
      cwd: testDir,
      excludePatterns: ["src/**"],
    });
    const sizeAll = await collectSize(["**/*.ts"], { cwd: testDir });
    expect(sizeWithExclude).toBeLessThan(sizeAll);
  });
});
