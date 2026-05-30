import { describe, it, expect } from "bun:test";
import { join, resolve } from "path";
import { collectLoc } from "../../src/metrics/collectors/loc";

describe("LOC Collector Integration Tests (T059)", () => {
  const fixtureDir = resolve(join(__dirname, "../fixtures/loc-collector"));
  const srcDir = join(fixtureDir, "src");

  // Expected values for fixture files (verified with SCC)
  // src/main.ts: 25 code lines
  // src/utils.ts: 6 code lines
  // Total TypeScript in src/: 31 code lines
  // package.json: 16 code lines
  // Total in root: 47 code lines (31 TS + 16 JSON)
  const EXPECTED = {
    src: {
      typeScript: 31,
    },
    root: {
      all: 47,
      json: 16,
      typeScript: 31,
    },
  };

  describe("basic LOC collection", () => {
    it("should collect LOC from fixture src directory", async () => {
      const loc = await collectLoc({ path: srcDir });
      expect(loc).toBe(EXPECTED.src.typeScript);
      expect(Number.isInteger(loc)).toBe(true);
    });

    it("should count LOC from root fixture directory", async () => {
      const loc = await collectLoc({ path: fixtureDir });
      expect(loc).toBe(EXPECTED.root.all);
    });
  });

  describe("exclude patterns", () => {
    it("should not affect LOC when excluding non-existent patterns", async () => {
      const without = await collectLoc({ path: srcDir });
      const with_ = await collectLoc({
        path: srcDir,
        excludePatterns: ["does-not-exist-pattern"],
      });
      expect(with_).toBe(without);
      expect(with_).toBe(EXPECTED.src.typeScript);
    });

    it("should handle multiple exclude patterns", async () => {
      const loc = await collectLoc({
        path: srcDir,
        excludePatterns: ["dist", "build", "node_modules"],
      });
      expect(loc).toBe(EXPECTED.src.typeScript);
    });
  });

  describe("language filtering", () => {
    it("should return TypeScript LOC for src directory", async () => {
      const typeScriptLoc = await collectLoc({
        path: srcDir,
        languageFilter: "TypeScript",
      });
      expect(typeScriptLoc).toBe(EXPECTED.src.typeScript);
    });

    it("should return TypeScript count that equals total when only TypeScript exists", async () => {
      const typeScriptLoc = await collectLoc({
        path: srcDir,
        languageFilter: "TypeScript",
      });
      const totalLoc = await collectLoc({ path: srcDir });
      expect(typeScriptLoc).toBe(totalLoc);
      expect(typeScriptLoc).toBe(EXPECTED.src.typeScript);
    });

    it("should return JSON LOC from root fixture directory", async () => {
      const jsonLoc = await collectLoc({
        path: fixtureDir,
        languageFilter: "JSON",
      });
      expect(jsonLoc).toBe(EXPECTED.root.json);
    });

    it("should support combined language filter and exclude patterns", async () => {
      const loc = await collectLoc({
        path: srcDir,
        excludePatterns: ["nonexistent"],
        languageFilter: "TypeScript",
      });
      expect(loc).toBe(EXPECTED.src.typeScript);
    });
  });

  describe("paths (glob) mode", () => {
    it("should collect LOC from glob patterns", async () => {
      const loc = await collectLoc({
        paths: ["src/**"],
        cwd: fixtureDir,
      });
      expect(loc).toBe(EXPECTED.src.typeScript);
    });

    it("should support language filter in paths mode", async () => {
      const loc = await collectLoc({
        paths: ["src/**"],
        languageFilter: "TypeScript",
        cwd: fixtureDir,
      });
      expect(loc).toBe(EXPECTED.src.typeScript);
    });

    it("should return zero for non-matching language filter in paths mode", async () => {
      const loc = await collectLoc({
        paths: ["src/**"],
        languageFilter: "JSON",
        cwd: fixtureDir,
      });
      expect(loc).toBe(0);
    });

    it("should support exclude patterns in paths mode", async () => {
      const loc = await collectLoc({
        paths: ["src/**"],
        excludePatterns: ["nonexistent"],
        cwd: fixtureDir,
      });
      expect(loc).toBe(EXPECTED.src.typeScript);
    });
  });

  describe("fallback for unsupported extensions", () => {
    it("should count non-empty lines for unsupported file types", async () => {
      const loc = await collectLoc({ path: fixtureDir });
      const tsOnly = await collectLoc({
        path: fixtureDir,
        languageFilter: "TypeScript",
      });
      const nonTs = loc - tsOnly;
      expect(nonTs).toBe(EXPECTED.root.json);
    });

    it("should count non-empty lines for unknown language filter", async () => {
      const result = await collectLoc({
        path: srcDir,
        languageFilter: "NonExistentLanguage123",
      });
      expect(result).toBeGreaterThan(0);
    });
  });

  describe("determinism", () => {
    it("should return deterministic results across multiple calls", async () => {
      const loc1 = await collectLoc({ path: srcDir });
      const loc2 = await collectLoc({ path: srcDir });
      const loc3 = await collectLoc({ path: srcDir });
      expect(loc1).toBe(EXPECTED.src.typeScript);
      expect(loc2).toBe(EXPECTED.src.typeScript);
      expect(loc3).toBe(EXPECTED.src.typeScript);
    });

    it("should handle paths with trailing slashes deterministically", async () => {
      const without = await collectLoc({ path: srcDir });
      const with_ = await collectLoc({ path: `${srcDir}/` });
      expect(with_).toBe(without);
      expect(with_).toBe(EXPECTED.src.typeScript);
    });
  });

  describe("error handling", () => {
    it("should throw error for non-existent directory", async () => {
      expect(collectLoc({ path: "/non/existent/directory/path" })).rejects.toThrow(
        "Directory not found"
      );
    });

    it("should throw error for empty path", async () => {
      expect(collectLoc({ path: "" })).rejects.toThrow("Path must be a non-empty string");
    });

    it("should throw error for null path", async () => {
      expect(
        // @ts-expect-error - Testing invalid input
        collectLoc({ path: null })
      ).rejects.toThrow("Path must be a non-empty string");
    });

    it("should throw error when neither path nor paths provided", async () => {
      expect(collectLoc({})).rejects.toThrow("Either path or paths must be provided");
    });
  });
});
