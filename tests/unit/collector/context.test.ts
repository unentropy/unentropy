import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { extractBuildContext } from "../../../src/collector/context";

describe("extractBuildContext", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("extracts build context from GitHub Actions environment variables", () => {
    process.env.GITHUB_SHA = "abc123def456abc123def456abc123def456abcd";
    process.env.GITHUB_REF = "refs/heads/main";
    process.env.GITHUB_RUN_ID = "12345";
    process.env.GITHUB_RUN_NUMBER = "42";
    process.env.GITHUB_EVENT_NAME = "push";

    const context = extractBuildContext();

    expect(context.commit_sha).toBe("abc123def456abc123def456abc123def456abcd");
    expect(context.branch).toBe("main");
    expect(context.run_id).toBe("12345");
    expect(context.run_number).toBe(42);
    expect(context.event_name).toBe("push");
  });

  test("extracts branch from refs/heads/ prefix", () => {
    process.env.GITHUB_REF = "refs/heads/feature/new-feature";
    process.env.GITHUB_SHA = "abc123def456abc123def456abc123def456abcd";
    process.env.GITHUB_RUN_ID = "12345";
    process.env.GITHUB_RUN_NUMBER = "1";

    const context = extractBuildContext();

    expect(context.branch).toBe("feature/new-feature");
  });

  test("extracts tag from refs/tags/ prefix", () => {
    process.env.GITHUB_REF = "refs/tags/v1.0.0";
    process.env.GITHUB_SHA = "abc123def456abc123def456abc123def456abcd";
    process.env.GITHUB_RUN_ID = "12345";
    process.env.GITHUB_RUN_NUMBER = "1";

    const context = extractBuildContext();

    expect(context.branch).toBe("v1.0.0");
  });

  test("uses full ref if no prefix matches", () => {
    process.env.GITHUB_REF = "unknown-ref-format";
    process.env.GITHUB_SHA = "abc123def456abc123def456abc123def456abcd";
    process.env.GITHUB_RUN_ID = "12345";
    process.env.GITHUB_RUN_NUMBER = "1";

    const context = extractBuildContext();

    expect(context.branch).toBe("unknown-ref-format");
  });

  test("handles missing optional environment variables", () => {
    process.env.GITHUB_SHA = "abc123def456abc123def456abc123def456abcd";
    process.env.GITHUB_REF = "refs/heads/main";
    process.env.GITHUB_RUN_ID = "12345";
    process.env.GITHUB_RUN_NUMBER = "42";
    delete process.env.GITHUB_EVENT_NAME;

    const context = extractBuildContext();

    expect(context.commit_sha).toBe("abc123def456abc123def456abc123def456abcd");
    expect(context.branch).toBe("main");
    expect(context.run_id).toBe("12345");
    expect(context.run_number).toBe(42);
    expect(context.event_name).toBeUndefined();
  });

  test("throws error when required environment variable GITHUB_SHA is missing", () => {
    delete process.env.GITHUB_SHA;
    process.env.GITHUB_REF = "refs/heads/main";
    process.env.GITHUB_RUN_ID = "12345";
    process.env.GITHUB_RUN_NUMBER = "42";

    expect(() => extractBuildContext()).toThrow("GITHUB_SHA");
  });

  test("throws error when required environment variable GITHUB_REF is missing", () => {
    process.env.GITHUB_SHA = "abc123def456abc123def456abc123def456abcd";
    delete process.env.GITHUB_REF;
    process.env.GITHUB_RUN_ID = "12345";
    process.env.GITHUB_RUN_NUMBER = "42";

    expect(() => extractBuildContext()).toThrow("GITHUB_REF");
  });

  test("throws error when required environment variable GITHUB_RUN_ID is missing", () => {
    process.env.GITHUB_SHA = "abc123def456abc123def456abc123def456abcd";
    process.env.GITHUB_REF = "refs/heads/main";
    delete process.env.GITHUB_RUN_ID;
    process.env.GITHUB_RUN_NUMBER = "42";

    expect(() => extractBuildContext()).toThrow("GITHUB_RUN_ID");
  });

  test("throws error when required environment variable GITHUB_RUN_NUMBER is missing", () => {
    process.env.GITHUB_SHA = "abc123def456abc123def456abc123def456abcd";
    process.env.GITHUB_REF = "refs/heads/main";
    process.env.GITHUB_RUN_ID = "12345";
    delete process.env.GITHUB_RUN_NUMBER;

    expect(() => extractBuildContext()).toThrow("GITHUB_RUN_NUMBER");
  });

  test("parses run_number as integer", () => {
    process.env.GITHUB_SHA = "abc123def456abc123def456abc123def456abcd";
    process.env.GITHUB_REF = "refs/heads/main";
    process.env.GITHUB_RUN_ID = "12345";
    process.env.GITHUB_RUN_NUMBER = "999";

    const context = extractBuildContext();

    expect(context.run_number).toBe(999);
    expect(typeof context.run_number).toBe("number");
  });

  test("throws error when run_number is not a valid integer", () => {
    process.env.GITHUB_SHA = "abc123def456abc123def456abc123def456abcd";
    process.env.GITHUB_REF = "refs/heads/main";
    process.env.GITHUB_RUN_ID = "12345";
    process.env.GITHUB_RUN_NUMBER = "not-a-number";

    expect(() => extractBuildContext()).toThrow("GITHUB_RUN_NUMBER");
  });
});
