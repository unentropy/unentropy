import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { collectLoc } from "../../../../src/metrics/collectors/loc";

describe("collectLoc", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "loc-test-"));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("basic directory counting", () => {
    it("counts source lines for a single TypeScript file", async () => {
      writeFileSync(join(testDir, "main.ts"), "function foo() {\n  return 1;\n}\n");
      const result = await collectLoc({ path: testDir });
      expect(result).toBe(3);
    });

    it("counts source lines across multiple files", async () => {
      writeFileSync(join(testDir, "a.ts"), "const a = 1;\n");
      writeFileSync(join(testDir, "b.ts"), "const b = 2;\n");
      const result = await collectLoc({ path: testDir });
      expect(result).toBe(2);
    });

    it("counts non-empty lines for unsupported extensions", async () => {
      writeFileSync(join(testDir, "config.json"), '{\n  "key": "value"\n}\n');
      const result = await collectLoc({ path: testDir });
      expect(result).toBe(3);
    });
  });

  describe("exclude patterns", () => {
    it("skips directories matching exclude patterns", async () => {
      mkdirSync(join(testDir, "node_modules"), { recursive: true });
      writeFileSync(join(testDir, "index.ts"), "const x = 1;\n");
      writeFileSync(join(testDir, "node_modules", "dep.ts"), "const y = 2;\n");

      const withoutExclude = await collectLoc({ path: testDir });
      expect(withoutExclude).toBe(2);

      const withExclude = await collectLoc({
        path: testDir,
        excludePatterns: ["node_modules"],
      });
      expect(withExclude).toBe(1);
    });

    it("handles multiple exclude patterns", async () => {
      mkdirSync(join(testDir, "dist"), { recursive: true });
      mkdirSync(join(testDir, "build"), { recursive: true });
      writeFileSync(join(testDir, "src.ts"), "const s = 1;\n");
      writeFileSync(join(testDir, "dist", "out.ts"), "const d = 2;\n");
      writeFileSync(join(testDir, "build", "bundle.ts"), "const b = 3;\n");

      const result = await collectLoc({
        path: testDir,
        excludePatterns: ["dist", "build"],
      });
      expect(result).toBe(1);
    });
  });

  describe("language filtering", () => {
    it("counts only files matching the language filter", async () => {
      writeFileSync(join(testDir, "app.ts"), "const a = 1;\n");
      writeFileSync(join(testDir, "style.css"), ".class { color: red; }\n");
      writeFileSync(join(testDir, "index.js"), "const b = 2;\n");

      const tsResult = await collectLoc({
        path: testDir,
        languageFilter: "TypeScript",
      });
      expect(tsResult).toBe(1);

      const jsResult = await collectLoc({
        path: testDir,
        languageFilter: "JavaScript",
      });
      expect(jsResult).toBe(1);

      const cssResult = await collectLoc({
        path: testDir,
        languageFilter: "CSS",
      });
      expect(cssResult).toBe(1);
    });

    it("throws for unsupported language filter", async () => {
      expect(
        collectLoc({
          path: testDir,
          languageFilter: "NonExistentLanguage123",
        })
      ).rejects.toThrow("not supported");
    });
  });

  describe("error handling", () => {
    it("throws for non-existent directory", async () => {
      expect(collectLoc({ path: "/non/existent/directory/path" })).rejects.toThrow(
        "Directory not found"
      );
    });

    it("throws for empty path", async () => {
      expect(collectLoc({ path: "" })).rejects.toThrow("Path must be a non-empty string");
    });

    it("throws for null path", async () => {
      expect(
        // @ts-expect-error - Testing invalid input
        collectLoc({ path: null })
      ).rejects.toThrow("Path must be a non-empty string");
    });
  });
});
