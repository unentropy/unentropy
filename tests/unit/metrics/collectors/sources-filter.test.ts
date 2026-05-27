import { describe, it, expect } from "bun:test";
import { matchesSources } from "../../../../src/metrics/collectors/sources-filter";

describe("matchesSources", () => {
  it("matches file against include pattern", () => {
    const sources = ["src/**"];
    expect(matchesSources("src/app.ts", sources)).toBe(true);
    expect(matchesSources("lib/helper.ts", sources)).toBe(false);
  });

  it("respects negation patterns", () => {
    const sources = ["src/**", "!src/**/*.test.ts"];
    expect(matchesSources("src/app.ts", sources)).toBe(true);
    expect(matchesSources("src/app.test.ts", sources)).toBe(false);
  });

  it("handles multiple include patterns", () => {
    const sources = ["src/**", "tests/**"];
    expect(matchesSources("src/app.ts", sources)).toBe(true);
    expect(matchesSources("tests/app.test.ts", sources)).toBe(true);
    expect(matchesSources("docs/readme.md", sources)).toBe(false);
  });

  it("normalizes backslash paths", () => {
    const sources = ["src/**"];
    expect(matchesSources("src\\app.ts", sources)).toBe(true);
  });

  it("normalizes leading ./", () => {
    const sources = ["src/**"];
    expect(matchesSources("./src/app.ts", sources)).toBe(true);
  });

  it("returns false when all files are excluded", () => {
    const sources = ["src/**", "!src/**"];
    expect(matchesSources("src/app.ts", sources)).toBe(false);
  });

  it("handles negation-only patterns", () => {
    const sources = ["**/*", "!node_modules/**"];
    expect(matchesSources("src/app.ts", sources)).toBe(true);
    expect(matchesSources("node_modules/lib/index.js", sources)).toBe(false);
  });

  describe("basePath handling", () => {
    it("strips basePath prefix from absolute paths", () => {
      const sources = ["src/**"];
      expect(matchesSources("/repo/src/app.ts", sources, "/repo")).toBe(true);
      expect(matchesSources("/repo/lib/helper.ts", sources, "/repo")).toBe(false);
    });

    it("uses path.relative for paths with directory traversal", () => {
      const sources = ["src/**"];
      expect(matchesSources("/repo/subdir/../src/app.ts", sources, "/repo")).toBe(true);
    });

    it("uses path.relative for paths with dot segments", () => {
      const sources = ["src/**"];
      expect(matchesSources("/repo/./src/app.ts", sources, "/repo")).toBe(true);
    });

    it("handles trailing slash in basePath", () => {
      const sources = ["src/**"];
      expect(matchesSources("/repo/src/app.ts", sources, "/repo/")).toBe(true);
    });

    it("handles paths with ./ prefix and basePath", () => {
      const sources = ["src/**"];
      expect(matchesSources("./src/app.ts", sources, "/repo")).toBe(true);
    });

    it("works with negation patterns and basePath", () => {
      const sources = ["src/**", "!src/**/*.test.ts"];
      expect(matchesSources("/repo/src/app.ts", sources, "/repo")).toBe(true);
      expect(matchesSources("/repo/src/app.test.ts", sources, "/repo")).toBe(false);
    });

    it("handles basePath that matches exactly the file directory", () => {
      const sources = ["app.ts"];
      expect(matchesSources("/repo/app.ts", sources, "/repo")).toBe(true);
    });

    it("handles backslash paths with basePath", () => {
      const sources = ["src/**"];
      expect(matchesSources("\\repo\\src\\app.ts", sources, "\\repo")).toBe(true);
    });
  });
});
