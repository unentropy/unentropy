import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { executeCollect } from "../../../src/collector/collect-runner";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let testDir: string;
let lcovFilePath: string;

beforeAll(() => {
  testDir = mkdtempSync(join(tmpdir(), "collect-runner-test-"));

  const lcovContent = `TN:
SF:src/test.ts
FN:1,testFunc
FNF:1
FNH:1
FNDA:5,testFunc
DA:1,1
DA:2,1
DA:3,1
DA:4,1
DA:5,0
LF:5
LH:4
BRF:2
BRH:1
BRDA:1,0,0,1
BRDA:1,0,1,0
end_of_record`;

  lcovFilePath = join(testDir, "test.lcov");
  writeFileSync(lcovFilePath, lcovContent);
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("executeCollect", () => {
  describe("loc collector", () => {
    test("collects LOC from a directory", async () => {
      const result = await executeCollect("loc ./src");
      expect(result.success).toBe(true);
      expect(parseInt(result.value)).toBeGreaterThan(0);
    });

    test("collects LOC with language filter", async () => {
      const result = await executeCollect("loc ./src --language TypeScript");
      expect(result.success).toBe(true);
      expect(parseInt(result.value)).toBeGreaterThan(0);
    });

    test("collects LOC with short language flag", async () => {
      const result = await executeCollect("loc ./src -l TypeScript");
      expect(result.success).toBe(true);
      expect(parseInt(result.value)).toBeGreaterThan(0);
    });

    test("collects LOC with exclude pattern", async () => {
      const result = await executeCollect("loc ./src --exclude node_modules");
      expect(result.success).toBe(true);
      expect(parseInt(result.value)).toBeGreaterThan(0);
    });

    test("fails with missing path", async () => {
      const result = await executeCollect("loc");
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("fails with invalid path", async () => {
      const result = await executeCollect("loc ./nonexistent-dir");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("size collector", () => {
    test("collects size of a file", async () => {
      const result = await executeCollect("size package.json");
      expect(result.success).toBe(true);
      expect(parseInt(result.value)).toBeGreaterThan(0);
    });

    test("collects size of multiple files", async () => {
      const result = await executeCollect("size package.json tsconfig.json");
      expect(result.success).toBe(true);
      expect(parseInt(result.value)).toBeGreaterThan(0);
    });

    test("collects size with glob pattern", async () => {
      const result = await executeCollect("size *.json");
      expect(result.success).toBe(true);
      expect(parseInt(result.value)).toBeGreaterThan(0);
    });

    test("collects size with nested glob pattern", async () => {
      const result = await executeCollect("size src/**/*.ts");
      expect(result.success).toBe(true);
      expect(parseInt(result.value)).toBeGreaterThan(0);
    });

    test("fails with glob pattern that matches no files", async () => {
      const result = await executeCollect("size nonexistent-*.xyz");
      expect(result.success).toBe(false);
      expect(result.error).toContain("No files matched glob pattern");
    });

    test("fails with missing path", async () => {
      const result = await executeCollect("size");
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("coverage-lcov collector", () => {
    test("parses LCOV file with line coverage", async () => {
      const result = await executeCollect(`coverage-lcov ${lcovFilePath}`);
      expect(result.success).toBe(true);
      expect(parseFloat(result.value)).toBeGreaterThanOrEqual(0);
    });

    test("parses LCOV file with branch coverage", async () => {
      const result = await executeCollect(`coverage-lcov ${lcovFilePath} --type branch`);
      expect(result.success).toBe(true);
      expect(parseFloat(result.value)).toBeGreaterThanOrEqual(0);
    });

    test("fails when file not found", async () => {
      const result = await executeCollect("coverage-lcov nonexistent.lcov");
      expect(result.success).toBe(false);
    });

    test("fails with missing path", async () => {
      const result = await executeCollect("coverage-lcov");
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("coverage-cobertura collector", () => {
    test("parses Cobertura XML file", async () => {
      const result = await executeCollect("coverage-cobertura tests/fixtures/cobertura/sample.xml");
      expect(result.success).toBe(true);
      expect(parseFloat(result.value)).toBeGreaterThanOrEqual(0);
    });

    test("parses Cobertura with branch coverage type", async () => {
      const result = await executeCollect(
        "coverage-cobertura tests/fixtures/cobertura/sample.xml --type branch"
      );
      expect(result.success).toBe(true);
      expect(parseFloat(result.value)).toBeGreaterThanOrEqual(0);
    });

    test("fails with missing path", async () => {
      const result = await executeCollect("coverage-cobertura");
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("unknown collector", () => {
    test("returns error for unknown collector", async () => {
      const result = await executeCollect("unknown-collector ./src");
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("empty input", () => {
    test("returns error for empty input", async () => {
      const result = await executeCollect("");
      expect(result.success).toBe(false);
      expect(result.error).toContain("No collector specified");
    });
  });

  describe("argument parsing", () => {
    test("handles quoted arguments", async () => {
      const result = await executeCollect('loc "./src"');
      expect(result.success).toBe(true);
    });

    test("handles arguments with equals sign", async () => {
      const result = await executeCollect("loc ./src --language=TypeScript");
      expect(result.success).toBe(true);
      expect(parseInt(result.value)).toBeGreaterThan(0);
    });
  });
});
