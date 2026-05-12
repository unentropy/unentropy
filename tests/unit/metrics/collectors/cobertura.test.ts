import { describe, it, expect } from "bun:test";
import {
  parseCoberturaCoerage,
  mergeCoberturaCoerage,
} from "../../../../src/metrics/collectors/cobertura.js";
import { join } from "path";

const fixturesDir = join(process.cwd(), "tests/fixtures/cobertura");
const f = (name: string) => join(fixturesDir, name);

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

    it("should throw when no methods exist", async () => {
      expect(
        parseCoberturaCoerage(join(fixturesDir, "no-methods.xml"), { type: "function" })
      ).rejects.toThrow("No function coverage data");
    });

    it("should throw when no packages exist for function coverage", async () => {
      expect(
        parseCoberturaCoerage(join(fixturesDir, "minimal.xml"), { type: "function" })
      ).rejects.toThrow("No function coverage data");
    });
  });

  describe("parse errors", () => {
    it("should throw when coverage data is invalid", async () => {
      expect(parseCoberturaCoerage(join(fixturesDir, "malformed.xml"))).rejects.toThrow();
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
  });
});

describe("mergeCoberturaCoerage", () => {
  describe("line coverage (default)", () => {
    it("should merge two non-overlapping reports", async () => {
      const coverage = await mergeCoberturaCoerage([f("sample.xml"), f("parallel-report.xml")]);
      // sample: 15/20, parallel: 18/20 => 33/40 = 82.5
      expect(coverage).toBe(82.5);
    });

    it("should merge two overlapping reports", async () => {
      const coverage = await mergeCoberturaCoerage([f("sample.xml"), f("overlap-report.xml")]);
      // sample: 15/20, overlap: 10/10 => 25/30 ≈ 83.33
      expect(coverage).toBeCloseTo(83.33, 1);
    });
  });

  describe("branch coverage", () => {
    it("should merge with branch coverage type", async () => {
      const coverage = await mergeCoberturaCoerage([f("sample.xml"), f("parallel-report.xml")], {
        type: "branch",
      });
      // sample: 6/10, parallel: 8/10 => 14/20 = 70
      expect(coverage).toBe(70);
    });
  });

  describe("function coverage", () => {
    it("should merge with function coverage type", async () => {
      const coverage = await mergeCoberturaCoerage([f("sample.xml"), f("overlap-report.xml")], {
        type: "function",
      });
      // sample: add, subtract, divide, multiply (3 covered)
      // overlap: add, divideByZero (2 covered)
      // unique: add, subtract, divide, multiply, divideByZero => 4/5 = 80
      expect(coverage).toBe(80);
    });
  });

  describe("single file", () => {
    it("should match single-file parser output when given one file", async () => {
      const merged = await mergeCoberturaCoerage([f("sample.xml")]);
      const single = await parseCoberturaCoerage(f("sample.xml"));
      expect(merged).toBe(single);
    });
  });

  describe("error handling", () => {
    it("should fail with error on missing file", async () => {
      expect(mergeCoberturaCoerage([f("sample.xml"), "/nonexistent/file.xml"])).rejects.toThrow();
    });

    it("should fail with error on empty file list", async () => {
      expect(mergeCoberturaCoerage([])).rejects.toThrow("At least one source path is required");
    });

    it("should fail with error on malformed XML", async () => {
      expect(mergeCoberturaCoerage([f("sample.xml"), f("malformed.xml")])).rejects.toThrow();
    });

    it("should fail with error on file missing required attributes", async () => {
      expect(mergeCoberturaCoerage([f("sample.xml"), f("no-counts.xml")])).rejects.toThrow(
        "lines-covered"
      );
    });
  });
});
