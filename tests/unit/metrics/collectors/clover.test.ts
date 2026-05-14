import { describe, it, expect } from "bun:test";
import {
  parseCloverCoverage,
  mergeCloverCoverage,
} from "../../../../src/metrics/collectors/clover.js";
import { join } from "path";

const fixturesDir = join(process.cwd(), "tests/fixtures/clover");
const f = (name: string) => join(fixturesDir, name);

describe("parseCloverCoverage", () => {
  describe("line coverage (default)", () => {
    it("should parse valid Clover XML and return line coverage percentage", async () => {
      const coverage = await parseCloverCoverage(join(fixturesDir, "sample.xml"));
      expect(coverage).toBe(75);
    });

    it("should return 100% for full coverage report", async () => {
      const coverage = await parseCloverCoverage(join(fixturesDir, "full-coverage.xml"));
      expect(coverage).toBe(100);
    });

    it("should return line coverage when type is 'line'", async () => {
      const coverage = await parseCloverCoverage(join(fixturesDir, "minimal.xml"), {
        type: "line",
      });
      expect(coverage).toBe(0);
    });
  });

  describe("branch coverage", () => {
    it("should return branch coverage when type is 'branch'", async () => {
      const coverage = await parseCloverCoverage(join(fixturesDir, "sample.xml"), {
        type: "branch",
      });
      expect(coverage).toBe(60);
    });

    it("should return 100% branch coverage for full coverage report", async () => {
      const coverage = await parseCloverCoverage(join(fixturesDir, "full-coverage.xml"), {
        type: "branch",
      });
      expect(coverage).toBe(100);
    });
  });

  describe("function coverage", () => {
    it("should return function coverage when type is 'function'", async () => {
      const coverage = await parseCloverCoverage(join(fixturesDir, "sample.xml"), {
        type: "function",
      });
      expect(coverage).toBe(75);
    });

    it("should return 100% function coverage when all methods are covered", async () => {
      const coverage = await parseCloverCoverage(join(fixturesDir, "full-coverage.xml"), {
        type: "function",
      });
      expect(coverage).toBe(100);
    });

    it("should return 0 when no methods exist", async () => {
      const coverage = await parseCloverCoverage(join(fixturesDir, "minimal.xml"), {
        type: "function",
      });
      expect(coverage).toBe(0);
    });
  });

  describe("parse errors", () => {
    it("should throw when coverage data is invalid", async () => {
      expect(parseCloverCoverage(join(fixturesDir, "malformed.xml"))).rejects.toThrow();
    });
  });

  describe("error handling", () => {
    it("should throw error for empty source path", async () => {
      expect(parseCloverCoverage("")).rejects.toThrow("Source path must be a non-empty string");
    });

    it("should throw error for null source path", async () => {
      expect(parseCloverCoverage(null as unknown as string)).rejects.toThrow(
        "Source path must be a non-empty string"
      );
    });

    it("should throw error for non-existent file", async () => {
      expect(parseCloverCoverage("/non/existent/file.xml")).rejects.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle file with empty coverage element", async () => {
      const coverage = await parseCloverCoverage(join(fixturesDir, "minimal.xml"));
      expect(coverage).toBe(0);
    });

    it("should return 0 for valid XML with no coverage data", async () => {
      const coverage = await parseCloverCoverage(join(fixturesDir, "no-coverage.xml"));
      expect(coverage).toBe(0);
    });
  });
});

describe("mergeCloverCoverage", () => {
  describe("line coverage (default)", () => {
    it("should merge two non-overlapping reports", async () => {
      const coverage = await mergeCloverCoverage([f("sample.xml"), f("parallel-report.xml")]);
      expect(coverage).toBeCloseTo(63.64, 1);
    });

    it("should merge two overlapping reports, deduplicating lines", async () => {
      const coverage = await mergeCloverCoverage([f("sample.xml"), f("overlap-report.xml")]);
      expect(coverage).toBeCloseTo(100, 1);
    });
  });

  describe("branch coverage", () => {
    it("should merge with branch coverage type", async () => {
      const coverage = await mergeCloverCoverage([f("sample.xml"), f("parallel-report.xml")], {
        type: "branch",
      });
      expect(coverage).toBeCloseTo(66.67, 1);
    });
  });

  describe("function coverage", () => {
    it("should merge with function coverage type", async () => {
      const coverage = await mergeCloverCoverage([f("sample.xml"), f("overlap-report.xml")], {
        type: "function",
      });
      expect(coverage).toBeCloseTo(83.33, 1);
    });
  });

  describe("single file", () => {
    it("should match single-file parser output when given one file", async () => {
      const merged = await mergeCloverCoverage([f("sample.xml")]);
      const single = await parseCloverCoverage(f("sample.xml"));
      expect(merged).toBe(single);
    });
  });

  describe("error handling", () => {
    it("should fail with error on missing file", async () => {
      expect(mergeCloverCoverage([f("sample.xml"), "/nonexistent/file.xml"])).rejects.toThrow();
    });

    it("should fail with error on empty file list", async () => {
      expect(mergeCloverCoverage([])).rejects.toThrow("At least one source path is required");
    });

    it("should fail with error on malformed XML", async () => {
      expect(mergeCloverCoverage([f("sample.xml"), f("malformed.xml")])).rejects.toThrow();
    });

    it("should handle file with no coverage data without throwing", async () => {
      const coverage = await mergeCloverCoverage([f("sample.xml"), f("no-coverage.xml")]);
      expect(coverage).toBeCloseTo(75, 1);
    });
  });
});
