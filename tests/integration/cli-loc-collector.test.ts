import { describe, it, expect } from "bun:test";
import { join, resolve } from "path";
import { collectLoc } from "../../src/metrics/collectors/loc";

describe("LOC Collector Integration Tests (T059)", () => {
  // Use the dedicated loc-collector fixture
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

      // src/ contains only TypeScript files: main.ts + utils.ts = 31 code lines
      expect(loc).toBe(EXPECTED.src.typeScript);
      expect(Number.isInteger(loc)).toBe(true);
    });

    it("should count LOC from root fixture directory", async () => {
      const loc = await collectLoc({ path: fixtureDir });

      // Root contains TypeScript files (31 lines) + package.json (16 lines) = 47 total
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

      // Excluding non-existent pattern should not change result
      expect(with_).toBe(without);
      expect(with_).toBe(EXPECTED.src.typeScript);
    });

    it("should handle multiple exclude patterns", async () => {
      const loc = await collectLoc({
        path: srcDir,
        excludePatterns: ["dist", "build", "node_modules"],
      });

      // Multiple non-existent patterns should not affect result
      expect(loc).toBe(EXPECTED.src.typeScript);
    });
  });

  describe("language filtering", () => {
    it("should return TypeScript LOC for src directory", async () => {
      const typeScriptLoc = await collectLoc({
        path: srcDir,
        languageFilter: "TypeScript",
      });

      // src/ only contains TypeScript files
      expect(typeScriptLoc).toBe(EXPECTED.src.typeScript);
    });

    it("should return TypeScript count that equals total when only TypeScript exists", async () => {
      const typeScriptLoc = await collectLoc({
        path: srcDir,
        languageFilter: "TypeScript",
      });

      const totalLoc = await collectLoc({ path: srcDir });

      // When src/ only has TypeScript, filtered result should equal total
      expect(typeScriptLoc).toBe(totalLoc);
      expect(typeScriptLoc).toBe(EXPECTED.src.typeScript);
    });

    it("should return JSON LOC from root fixture directory", async () => {
      const jsonLoc = await collectLoc({
        path: fixtureDir,
        languageFilter: "JSON",
      });

      // Fixture root contains package.json = 16 code lines
      expect(jsonLoc).toBe(EXPECTED.root.json);
    });

    it("should support combined language filter and exclude patterns", async () => {
      const loc = await collectLoc({
        path: srcDir,
        excludePatterns: ["nonexistent"],
        languageFilter: "TypeScript",
      });

      // TypeScript in src/ is 31 lines regardless of non-existent exclusions
      expect(loc).toBe(EXPECTED.src.typeScript);
    });
  });

  describe("determinism", () => {
    it("should return deterministic results across multiple calls", async () => {
      const loc1 = await collectLoc({ path: srcDir });
      const loc2 = await collectLoc({ path: srcDir });
      const loc3 = await collectLoc({ path: srcDir });

      // All calls should return the same value
      expect(loc1).toBe(EXPECTED.src.typeScript);
      expect(loc2).toBe(EXPECTED.src.typeScript);
      expect(loc3).toBe(EXPECTED.src.typeScript);
    });

    it("should handle paths with trailing slashes deterministically", async () => {
      const without = await collectLoc({ path: srcDir });
      const with_ = await collectLoc({ path: `${srcDir}/` });

      // Trailing slash should not affect result
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

    it("should throw error for invalid language filter", async () => {
      expect(
        collectLoc({
          path: srcDir,
          languageFilter: "NonExistentLanguage123",
        })
      ).rejects.toThrow("not supported");
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
  });
});
