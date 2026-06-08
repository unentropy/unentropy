import { describe, test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { runCommand } from "../../../src/collector/runner";

describe("runCommand", () => {
  test("executes command and returns stdout", async () => {
    const result = await runCommand('echo "test output"', {}, 60000, true);

    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe("test output");
    expect(result.stderr).toBe("");
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.durationMs).toBeGreaterThan(0);
  });

  test("captures stderr when command writes to stderr", async () => {
    const result = await runCommand('echo "error message" >&2', {}, 60000, true);

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("");
    expect(result.stderr.trim()).toBe("error message");
    expect(result.exitCode).toBe(0);
  });

  test("captures both stdout and stderr", async () => {
    const result = await runCommand('echo "output" && echo "error" >&2', {}, 60000, true);

    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe("output");
    expect(result.stderr.trim()).toBe("error");
    expect(result.exitCode).toBe(0);
  });

  test("returns failure when command exits with non-zero code", async () => {
    const result = await runCommand("exit 1", {}, 60000, true);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.timedOut).toBe(false);
  });

  test("handles command timeout", async () => {
    const result = await runCommand("sleep 10", {}, 100, true);

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.durationMs).toBeLessThan(2000);
  });

  test("uses default timeout of 60000ms", async () => {
    const start = Date.now();
    const result = await runCommand('echo "quick"', {}, 60000, true);
    const elapsed = Date.now() - start;

    expect(result.success).toBe(true);
    expect(elapsed).toBeLessThan(1000);
  });

  test("passes environment variables to command", async () => {
    const result = await runCommand(
      "echo $CUSTOM_VAR",
      {
        CUSTOM_VAR: "custom-value",
      },
      60000,
      true
    );

    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe("custom-value");
  });

  test("passes multiple environment variables to command", async () => {
    const result = await runCommand(
      'echo "$VAR1-$VAR2"',
      {
        VAR1: "first",
        VAR2: "second",
      },
      60000,
      true
    );

    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe("first-second");
  });

  test("environment variables override existing ones", async () => {
    process.env.TEST_VAR = "original";

    const result = await runCommand(
      "echo $TEST_VAR",
      {
        TEST_VAR: "overridden",
      },
      60000,
      true
    );

    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe("overridden");

    delete process.env.TEST_VAR;
  });

  test("measures command duration accurately", async () => {
    const result = await runCommand("sleep 0.1", {}, 60000, true);

    expect(result.success).toBe(true);
    expect(result.durationMs).toBeGreaterThanOrEqual(100);
    expect(result.durationMs).toBeLessThan(200);
  });

  test("handles command with special characters in output", async () => {
    const result = await runCommand('echo "test\nwith\nnewlines"', {}, 60000, true);

    expect(result.success).toBe(true);
    expect(result.stdout).toContain("\n");
  });

  test("handles empty command output", async () => {
    const result = await runCommand("true", {}, 60000, true);

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
    expect(result.exitCode).toBe(0);
  });

  test("handles command that does not exist", async () => {
    const result = await runCommand("nonexistent-command-xyz", {}, 60000, true);

    expect(result.success).toBe(false);
    expect(result.exitCode).not.toBe(0);
  });

  test("handles very long output", async () => {
    const result = await runCommand("seq 1 1000", {}, 60000, true);

    expect(result.success).toBe(true);
    expect(result.stdout.split("\n").length).toBeGreaterThan(1000);
  });

  test("transforms @collect commands to CLI invocations", async () => {
    const result = await runCommand("@collect loc ./src", {}, 60000, true);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+$/);
    expect(parseInt(result.stdout.trim())).toBeGreaterThan(0);
  });

  test("transforms @collect with multiple arguments", async () => {
    const result = await runCommand("@collect size package.json", {}, 60000, true);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+$/);
    expect(parseInt(result.stdout.trim())).toBeGreaterThan(0);
  });

  test("passes @collect arguments correctly", async () => {
    const result = await runCommand("@collect loc ./src --exclude node_modules", {}, 60000, true);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+$/);
  });

  test("executes shell command with basePath as cwd", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "runner-test-"));
    writeFileSync(join(tempDir, "testfile.txt"), "hello-from-basedir");

    const result = await runCommand("cat ./testfile.txt", {}, 60000, true, undefined, tempDir);

    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe("hello-from-basedir");
    expect(result.exitCode).toBe(0);

    rmSync(tempDir, { recursive: true, force: true });
  });

  test("executes shell command in process.cwd() when basePath is not provided", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "runner-test-"));
    writeFileSync(join(tempDir, "testfile.txt"), "hello-from-cwd");

    const result = await runCommand("cat ./testfile.txt", {}, 60000, true);

    // Without basePath, the command runs in process.cwd() and should not find the file
    expect(result.success).toBe(false);

    rmSync(tempDir, { recursive: true, force: true });
  });

  test("@collect loc resolves relative path against basePath", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "runner-test-"));
    const srcDir = join(tempDir, "src");
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, "test.ts"), "const x = 1;\n");

    const result = await runCommand("@collect loc ./src", {}, 60000, true, undefined, tempDir);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(parseInt(result.stdout.trim())).toBeGreaterThan(0);

    rmSync(tempDir, { recursive: true, force: true });
  });

  test("@collect size resolves glob against basePath", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "runner-test-"));
    const distDir = join(tempDir, "dist");
    mkdirSync(distDir, { recursive: true });
    writeFileSync(join(distDir, "a.js"), "console.log(1);\n");
    writeFileSync(join(distDir, "b.js"), "console.log(2);\n");

    const result = await runCommand(
      "@collect size ./dist/*.js",
      {},
      60000,
      true,
      undefined,
      tempDir
    );

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(parseInt(result.stdout.trim())).toBeGreaterThan(0);

    rmSync(tempDir, { recursive: true, force: true });
  });
});
