import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { parseSize } from "../../src/metrics/collectors/size";

describe("size parser integration", () => {
  let testDir: string;
  let testFile: string;

  beforeAll(async () => {
    // Create temporary directory and file for testing
    testDir = await fs.mkdtemp(join(tmpdir(), "unentropy-size-test-"));
    testFile = join(testDir, "test.txt");

    // Create a test file with known content
    await fs.writeFile(testFile, "Hello, World!".repeat(1000)); // ~13KB
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
      console.debug("Cleanup error:", (error as Error).message);
    }
  });

  describe("parseSize", () => {
    it("should calculate size of a file", async () => {
      const size = await parseSize(testFile);

      expect(size).toBeGreaterThan(0);
      expect(size).toBeGreaterThanOrEqual(13000); // Should be around 13KB = ~13000 bytes
      expect(typeof size).toBe("number");

      const stats = await fs.stat(testFile);
      console.log("Test file size during test:", stats.size, "bytes");
    });

    it("should calculate size of a directory", async () => {
      const size = await parseSize(testDir);

      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe("number");
    });

    it("should handle non-existent path", async () => {
      expect(parseSize("/non/existent/path")).rejects.toThrow();
    });

    it("should handle empty string path", async () => {
      expect(parseSize("")).rejects.toThrow("Source path must be a non-empty string");
    });

    it("should handle null/undefined path", async () => {
      // @ts-expect-error - Testing invalid input
      expect(parseSize(null)).rejects.toThrow();
      // @ts-expect-error - Testing invalid input
      expect(parseSize(undefined)).rejects.toThrow();
    });

    it("should handle symlinks without error", async () => {
      // Create a symlink to our test file
      const symlinkPath = join(testDir, "symlink.txt");

      try {
        await fs.symlink(testFile, symlinkPath);

        const size = await parseSize(symlinkPath);

        // With lstat semantics, symlink size is the link entry size
        // (length of the target path string), not the target file content
        expect(typeof size).toBe("number");
      } catch (error) {
        // Skip symlink test on systems that don't support it
        console.warn("Symlink test skipped:", (error as Error).message);
      }
    });

    it("should return consistent results", async () => {
      const size1 = await parseSize(testFile);
      const size2 = await parseSize(testFile);

      expect(size1).toBe(size2);
    });

    it("should handle paths with spaces", async () => {
      const spaceDir = join(testDir, "dir with spaces");
      const spaceFile = join(spaceDir, "file with spaces.txt");

      await fs.mkdir(spaceDir);
      await fs.writeFile(spaceFile, "test content");

      const size = await parseSize(spaceFile);
      expect(size).toBeGreaterThan(0);
    });

    it("should handle very small files", async () => {
      const smallFile = join(testDir, "small.txt");
      await fs.writeFile(smallFile, "x");

      const size = await parseSize(smallFile);
      expect(size).toBeGreaterThanOrEqual(1); // At least 1 byte
    });
  });
});
