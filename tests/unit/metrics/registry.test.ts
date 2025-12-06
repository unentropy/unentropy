import { describe, it, expect } from "bun:test";
import {
  getMetricTemplate,
  listMetricTemplateIds,
  METRIC_TEMPLATES,
} from "../../../src/metrics/registry.js";

describe("registry", () => {
  describe("getMetricTemplate", () => {
    it("should return coverage metric template when requested", () => {
      const result = getMetricTemplate("coverage");

      expect(result).toBeDefined();
      expect(result?.id).toBe("coverage");
      expect(result?.name).toBe("coverage");
      expect(result?.type).toBe("numeric");
      expect(result?.unit).toBe("percent");
      expect(result?.command).toBeUndefined(); // No default command (technology-specific)
    });

    it("should return function-coverage metric template when requested", () => {
      const result = getMetricTemplate("function-coverage");

      expect(result).toBeDefined();
      expect(result?.id).toBe("function-coverage");
      expect(result?.name).toBe("function-coverage");
      expect(result?.type).toBe("numeric");
      expect(result?.unit).toBe("percent");
      expect(result?.command).toBeUndefined(); // No default command (technology-specific)
    });

    it("should return loc metric template when requested", () => {
      const result = getMetricTemplate("loc");

      expect(result).toBeDefined();
      expect(result?.id).toBe("loc");
      expect(result?.name).toBe("loc");
      expect(result?.type).toBe("numeric");
      expect(result?.unit).toBe("integer");
      expect(result?.command).toBe("@collect loc .");
    });

    it("should return size metric template when requested", () => {
      const result = getMetricTemplate("size");

      expect(result).toBeDefined();
      expect(result?.id).toBe("size");
      expect(result?.name).toBe("size");
      expect(result?.type).toBe("numeric");
      expect(result?.unit).toBe("bytes");
      expect(result?.command).toBe("@collect size dist");
    });

    it("should return build-time metric template when requested", () => {
      const result = getMetricTemplate("build-time");

      expect(result).toBeDefined();
      expect(result?.id).toBe("build-time");
      expect(result?.name).toBe("build-time");
      expect(result?.type).toBe("numeric");
      expect(result?.unit).toBe("duration");
      expect(result?.command).toBeUndefined(); // No default command (project-specific)
    });

    it("should return test-time metric template when requested", () => {
      const result = getMetricTemplate("test-time");

      expect(result).toBeDefined();
      expect(result?.id).toBe("test-time");
      expect(result?.name).toBe("test-time");
      expect(result?.type).toBe("numeric");
      expect(result?.unit).toBe("duration");
      expect(result?.command).toBeUndefined(); // No default command (project-specific)
    });

    it("should return dependencies-count metric template when requested", () => {
      const result = getMetricTemplate("dependencies-count");

      expect(result).toBeDefined();
      expect(result?.id).toBe("dependencies-count");
      expect(result?.name).toBe("dependencies-count");
      expect(result?.type).toBe("numeric");
      expect(result?.unit).toBe("integer");
      expect(result?.command).toBeUndefined(); // No default command (package manager-specific)
    });

    it("should return undefined for non-existent metric template ID", () => {
      const result = getMetricTemplate("non-existent");
      expect(result).toBeUndefined();
    });

    it("should return undefined for empty string", () => {
      const result = getMetricTemplate("");
      expect(result).toBeUndefined();
    });

    it("should return the same object reference from registry", () => {
      const result1 = getMetricTemplate("coverage");
      const result2 = METRIC_TEMPLATES.coverage;

      expect(result1).toBe(result2);
    });

    it("should return all required properties for each metric template", () => {
      const metricIds = [
        "coverage",
        "function-coverage",
        "loc",
        "size",
        "build-time",
        "test-time",
        "dependencies-count",
      ];

      const templatesWithCommands = ["loc", "size"];

      metricIds.forEach((id) => {
        const metric = getMetricTemplate(id);
        expect(metric).toBeDefined();
        expect(metric).toHaveProperty("id");
        expect(metric).toHaveProperty("name");
        expect(metric).toHaveProperty("description");
        expect(metric).toHaveProperty("type");
        expect(metric?.id).toBe(id);
        expect(metric?.name).toBe(id);
        expect(metric?.type).toMatch(/^(numeric|label)$/);

        // Only templates with default commands have the command property
        if (templatesWithCommands.includes(id)) {
          expect(metric).toHaveProperty("command");
          expect(typeof metric?.command).toBe("string");
          if (metric?.command) {
            expect(metric.command.length).toBeGreaterThan(0);
          }
        } else {
          // Templates without default commands should not have command property
          expect(metric?.command).toBeUndefined();
        }
      });
    });
  });

  describe("listMetricTemplateIds", () => {
    it("should return all metric template IDs", () => {
      const result = listMetricTemplateIds();

      expect(result).toContain("coverage");
      expect(result).toContain("function-coverage");
      expect(result).toContain("loc");
      expect(result).toContain("size");
      expect(result).toContain("build-time");
      expect(result).toContain("test-time");
      expect(result).toContain("dependencies-count");
    });

    it("should return exactly 7 metric IDs", () => {
      const result = listMetricTemplateIds();
      expect(result).toHaveLength(7);
    });

    it("should return the same IDs as keys in METRIC_TEMPLATES", () => {
      const result = listMetricTemplateIds();
      const registryKeys = Object.keys(METRIC_TEMPLATES);

      expect(result.sort()).toEqual(registryKeys.sort());
    });

    it("should return a new array (not reference to internal keys)", () => {
      const result1 = listMetricTemplateIds();
      const result2 = listMetricTemplateIds();

      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });

    it("should return strings only", () => {
      const result = listMetricTemplateIds();

      result.forEach((id) => {
        expect(typeof id).toBe("string");
        expect(id.length).toBeGreaterThan(0);
      });
    });

    it("should return IDs in consistent order", () => {
      const result1 = listMetricTemplateIds();
      const result2 = listMetricTemplateIds();

      expect(result1).toEqual(result2);
    });
  });
});
