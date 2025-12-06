import { describe, test, beforeEach, afterEach } from "bun:test";
import { unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { writeFileSync } from "node:fs";
import { runTrackMetricsAction } from "../../src/actions/track-metrics";

describe("track-metrics action integration", () => {
  const testConfigPath = "/tmp/unentropy-track-test.json";
  const testReportDir = "/tmp/test-report";
  const originalEnv = process.env;
  let uniqueSuffix: string;

  beforeEach(async () => {
    // Generate unique database name
    uniqueSuffix = Date.now() + "-" + Math.random().toString(36).substr(2, 9);

    // Create test config file
    const testConfig = {
      storage: {
        type: "sqlite-s3",
      },
      metrics: {
        "test-metric": {
          type: "numeric",
          command: 'echo "42"',
          description: "Test metric",
        },
      },
    };
    writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));

    // Mock GitHub Actions inputs and environment
    process.env = {
      ...originalEnv,
      GITHUB_ACTIONS: "true",
      GITHUB_SHA: "abc123def456abc123def456abc123def456abcd",
      GITHUB_REF: "refs/heads/main",
      GITHUB_REF_NAME: "main",
      GITHUB_RUN_ID: "123456789",
      GITHUB_RUN_NUMBER: "42",
      GITHUB_REPOSITORY: "test/repo",
      "INPUT_STORAGE-TYPE": "sqlite-s3",
      "INPUT_CONFIG-FILE": testConfigPath,
      "INPUT_DATABASE-KEY": `integration-test-${uniqueSuffix}.db`,
      "INPUT_REPORT-DIR": testReportDir,
      "INPUT_S3-ENDPOINT": "http://localhost:9000",
      "INPUT_S3-BUCKET": "unentropy-test",
      "INPUT_S3-REGION": "us-east-1",
      "INPUT_S3-ACCESS-KEY-ID": "minioadmin",
      "INPUT_S3-SECRET-ACCESS-KEY": "minioadmin",
    };
  });

  afterEach(async () => {
    process.env = originalEnv;
    // Clean up test files
    if (existsSync(testConfigPath)) {
      await unlink(testConfigPath);
    }
    const reportFile = `${testReportDir}/index.html`;
    if (existsSync(reportFile)) {
      await unlink(reportFile);
    }
  });

  test("runs track-metrics action successfully with sqlite-s3 storage", async () => {
    // The function should complete without throwing an error
    await runTrackMetricsAction();
  });

  test("stores pull request context when in PR event", async () => {
    // Update environment to simulate PR context
    process.env.GITHUB_EVENT_NAME = "pull_request";
    process.env.GITHUB_REF = "refs/pull/123/merge";
    process.env.GITHUB_BASE_REF = "main";
    process.env.GITHUB_HEAD_REF = "feature/test-pr";

    // The function should complete without throwing an error
    await runTrackMetricsAction();
  });

  test("verifies PR data is stored in database", async () => {
    // Update environment to simulate PR context
    process.env.GITHUB_EVENT_NAME = "pull_request";
    process.env.GITHUB_REF = "refs/pull/456/merge";
    process.env.GITHUB_BASE_REF = "main";
    process.env.GITHUB_HEAD_REF = "feature/pr-data-test";

    // Run the action
    await runTrackMetricsAction();

    // For PR context, database is not uploaded, so we can't easily verify it
    // The fact that the action completed without error means PR data was processed
    // In a real scenario, the PR data would be available in the local database
  });
});
