import { describe, it, expect } from "bun:test";
import { parseCoberturaCoerage } from "../../../../src/metrics/collectors/cobertura.js";
import { join } from "path";

const fixturesDir = join(process.cwd(), "tests/fixtures/cobertura");

describe("parseCoberturaCoerage", () => {
  describe("line coverage (default)", () => {
    it("should parse valid Cobertura XML and return line coverage percentage", async () => {
      const coverage = await parseCoberturaCoerage(join(fixturesDir, "sample.xml"));
      expect(coverage).toBe(75); // line-rate="0.75" * 100
    });

    it("should return 100% for full coverage report", async () => {
      const coverage = await parseCoberturaCoerage(join(fixturesDir, "full-coverage.xml"));
      expect(coverage).toBe(100);
    });

    it("should return line coverage when type is 'line'", async () => {
      const coverage = await parseCoberturaCoerage(join(fixturesDir, "minimal.xml"), {
        type: "line",
      });
      expect(coverage).toBe(85); // line-rate="0.85" * 100
    });
  });

  describe("branch coverage", () => {
    it("should return branch coverage when type is 'branch'", async () => {
      const coverage = await parseCoberturaCoerage(join(fixturesDir, "sample.xml"), {
        type: "branch",
      });
      expect(coverage).toBe(60); // branch-rate="0.60" * 100
    });

    it("should return 100% branch coverage for full coverage report", async () => {
      const coverage = await parseCoberturaCoerage(join(fixturesDir, "full-coverage.xml"), {
        type: "branch",
      });
      expect(coverage).toBe(100);
    });
  });

  describe("function coverage", () => {
    it("should return function coverage when type is 'function'", async () => {
      const coverage = await parseCoberturaCoerage(join(fixturesDir, "sample.xml"), {
        type: "function",
      });
      // 3 out of 4 methods have line-rate > 0 (add, subtract, divide covered; multiply not)
      expect(coverage).toBe(75);
    });

    it("should return 100% function coverage when all methods are covered", async () => {
      const coverage = await parseCoberturaCoerage(join(fixturesDir, "full-coverage.xml"), {
        type: "function",
      });
      expect(coverage).toBe(100);
    });

    it("should return fallback when no methods exist", async () => {
      const coverage = await parseCoberturaCoerage(join(fixturesDir, "no-methods.xml"), {
        type: "function",
        fallback: 0,
      });
      expect(coverage).toBe(0);
    });

    it("should return fallback when no packages exist for function coverage", async () => {
      const coverage = await parseCoberturaCoerage(join(fixturesDir, "minimal.xml"), {
        type: "function",
        fallback: 42,
      });
      expect(coverage).toBe(42);
    });
  });

  describe("fallback handling", () => {
    it("should return fallback value when XML is malformed", async () => {
      const coverage = await parseCoberturaCoerage(join(fixturesDir, "malformed.xml"), {
        fallback: 50,
      });
      expect(coverage).toBe(50);
    });

    it("should return 0 when no fallback provided and XML is malformed", async () => {
      const coverage = await parseCoberturaCoerage(join(fixturesDir, "malformed.xml"));
      expect(coverage).toBe(0);
    });
  });

  describe("error handling", () => {
    it("should throw error for empty source path", async () => {
      expect(parseCoberturaCoerage("")).rejects.toThrow("Source path must be a non-empty string");
    });

    it("should throw error for null source path", async () => {
      expect(parseCoberturaCoerage(null as unknown as string)).rejects.toThrow(
        "Source path must be a non-empty string"
      );
    });

    it("should throw error for non-existent file", async () => {
      expect(parseCoberturaCoerage("/non/existent/file.xml")).rejects.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle file with empty coverage element", async () => {
      const coverage = await parseCoberturaCoerage(join(fixturesDir, "minimal.xml"));
      expect(coverage).toBe(85);
    });

    it("should use default fallback of 0", async () => {
      const coverage = await parseCoberturaCoerage(join(fixturesDir, "malformed.xml"));
      expect(coverage).toBe(0);
    });
  });
});
