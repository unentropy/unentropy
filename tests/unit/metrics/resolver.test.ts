import { describe, it, expect } from "bun:test";
import { resolveMetricReference, validateBuiltInReference } from "../../../src/metrics/resolver.js";
import type { MetricConfig } from "../../../src/config/schema.js";

describe("resolver", () => {
  describe("resolveMetricReference", () => {
    it.each([
      ["coverage", "percent", "Overall test coverage percentage across the codebase"],
      ["function-coverage", "percent", "Percentage of functions covered by tests"],
      ["loc", "integer", "Total lines of code in the codebase"],
      ["size", "bytes", "Size of files or directories"],
      ["build-time", "duration", "Time taken to complete the build"],
      ["test-time", "duration", "Time taken to run all tests"],
      ["dependencies-count", "integer", "Total number of dependencies"],
    ] as const)("should resolve %s built-in metric", (ref, unit, description) => {
      const config: MetricConfig = {
        $ref: ref,
        command: `test-command-${ref}`,
      };

      const result = resolveMetricReference(ref, config);

      expect(result.id).toBe(ref);
      expect(result.name).toBe(ref);
      expect(result.type).toBe("numeric");
      expect(result.unit).toBe(unit);
      expect(result.command).toBe(`test-command-${ref}`);
      expect(result.description).toBe(description);
    });

    it("should apply name override", () => {
      const config: MetricConfig = {
        $ref: "coverage",
        name: "My Custom Coverage",
        command: "npm run test:coverage",
      };

      const result = resolveMetricReference("my-custom-coverage", config);

      expect(result.id).toBe("my-custom-coverage");
      expect(result.name).toBe("My Custom Coverage");
      expect(result.type).toBe("numeric");
      expect(result.unit).toBe("percent");
      expect(result.command).toBe("npm run test:coverage");
    });

    it("should apply multiple overrides", () => {
      const config: MetricConfig = {
        $ref: "coverage",
        name: "Frontend Coverage",
        command: "npm run test:coverage:frontend",
        unit: "percent",
        description: "Frontend test coverage",
        timeout: 60000,
      };

      const result = resolveMetricReference("frontend-coverage", config);

      expect(result.id).toBe("frontend-coverage");
      expect(result.name).toBe("Frontend Coverage");
      expect(result.type).toBe("numeric");
      expect(result.unit).toBe("percent");
      expect(result.command).toBe("npm run test:coverage:frontend");
      expect(result.description).toBe("Frontend test coverage");
      expect(result.timeout).toBe(60000);
    });

    it("should throw error for non-existent built-in metric", () => {
      const config: MetricConfig = {
        $ref: "non-existent-metric",
        command: "echo 'test'",
      };

      expect(() => resolveMetricReference("test", config)).toThrow(
        "Built-in metric 'non-existent-metric' not found. Available metrics: coverage, function-coverage, loc, size, build-time, test-time, dependencies-count"
      );
    });

    describe("id inheritance (T024h)", () => {
      it("should use object key as metric id", () => {
        const config: MetricConfig = {
          $ref: "loc",
        };

        const result = resolveMetricReference("my-custom-loc", config);

        expect(result.id).toBe("my-custom-loc");
      });

      it("should allow different keys with same $ref", () => {
        const config1: MetricConfig = { $ref: "loc" };
        const config2: MetricConfig = { $ref: "loc" };

        const result1 = resolveMetricReference("loc-src", config1);
        const result2 = resolveMetricReference("loc-tests", config2);

        expect(result1.id).toBe("loc-src");
        expect(result2.id).toBe("loc-tests");
        expect(result1.name).toBe(result2.name);
        expect(result1.type).toBe(result2.type);
      });
    });

    describe("command inheritance (T024i)", () => {
      it("should use template command when user doesn't provide one", () => {
        const config: MetricConfig = {
          $ref: "loc",
        };

        const result = resolveMetricReference("my-loc", config);

        expect(result.command).toBe("@collect loc .");
      });

      it("should fail when template has no command and user doesn't provide one", () => {
        const config: MetricConfig = {
          $ref: "coverage",
        };

        expect(() => resolveMetricReference("my-coverage", config)).toThrow(
          'Metric "my-coverage" requires a command.\nThe metric template "coverage" does not have a default command.\nYou must provide a command appropriate for your project.'
        );
      });

      it("should use user command when provided for template without default", () => {
        const config: MetricConfig = {
          $ref: "coverage",
          command: "npm test --coverage",
        };

        const result = resolveMetricReference("my-coverage", config);

        expect(result.command).toBe("npm test --coverage");
        expect(result.type).toBe("numeric");
        expect(result.unit).toBe("percent");
      });
    });

    describe("command override (T045)", () => {
      it("should override template command with user command", () => {
        const config: MetricConfig = {
          $ref: "loc",
          command: "custom-loc-counter ./src",
        };

        const result = resolveMetricReference("my-loc", config);

        expect(result.command).toBe("custom-loc-counter ./src");
        expect(result.type).toBe("numeric");
        expect(result.unit).toBe("integer");
      });
    });

    describe("unit override (T046)", () => {
      it("should allow overriding unit with valid UnitType", () => {
        const config: MetricConfig = {
          $ref: "loc",
          unit: "decimal",
        };

        const result = resolveMetricReference("my-loc", config);

        expect(result.unit).toBe("decimal");
        expect(result.type).toBe("numeric");
        expect(result.command).toBe("@collect loc .");
      });

      it("should override percent unit with different unit", () => {
        const config: MetricConfig = {
          $ref: "coverage",
          command: "npm test",
          unit: "decimal",
        };

        const result = resolveMetricReference("my-coverage", config);

        expect(result.unit).toBe("decimal");
        expect(result.type).toBe("numeric");
      });
    });

    describe("edge cases (T024j)", () => {
      it("should preserve all template properties when minimal config", () => {
        const config: MetricConfig = {
          $ref: "loc",
        };

        const result = resolveMetricReference("my-loc", config);

        expect(result.id).toBe("my-loc");
        expect(result.name).toBe("loc");
        expect(result.type).toBe("numeric");
        expect(result.unit).toBe("integer");
        expect(result.description).toBe("Total lines of code in the codebase");
        expect(result.command).toBe("@collect loc .");
      });
    });
  });

  describe("validateBuiltInReference", () => {
    it.each([
      "coverage",
      "function-coverage",
      "loc",
      "size",
      "build-time",
      "test-time",
      "dependencies-count",
    ])("should not throw for valid built-in metric: %s", (metricId) => {
      expect(() => validateBuiltInReference(metricId)).not.toThrow();
    });

    it("should throw error for non-existent built-in metric ID", () => {
      expect(() => validateBuiltInReference("non-existent")).toThrow(
        "Built-in metric 'non-existent' not found. Available metrics: coverage, function-coverage, loc, size, build-time, test-time, dependencies-count"
      );
    });

    it("should throw error for empty string", () => {
      expect(() => validateBuiltInReference("")).toThrow(
        "Built-in metric reference cannot be empty"
      );
    });

    it("should throw error for whitespace-only string", () => {
      expect(() => validateBuiltInReference("   ")).toThrow(
        "Built-in metric reference cannot be empty"
      );
    });

    it("should handle case-sensitive metric IDs", () => {
      expect(() => validateBuiltInReference("Coverage")).toThrow(
        "Built-in metric 'Coverage' not found. Available metrics: coverage, function-coverage, loc, size, build-time, test-time, dependencies-count"
      );
    });
  });
});
