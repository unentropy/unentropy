import { describe, it, expect, afterEach, beforeEach, mock } from "bun:test";
import { createStorageProvider } from "../../../../src/storage/providers/factory";
import type { StorageProviderConfig } from "../../../../src/storage/providers/interface";

describe("createStorageProvider", () => {
  let provider: Awaited<ReturnType<typeof createStorageProvider>> | null = null;

  // Store original values for artifact tests
  const originalEnv = {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY,
    GITHUB_REF_NAME: process.env.GITHUB_REF_NAME,
    GITHUB_RUN_ID: process.env.GITHUB_RUN_ID,
  };
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Set up environment variables for artifact tests
    process.env.GITHUB_TOKEN = "test-token";
    process.env.GITHUB_REPOSITORY = "test-owner/test-repo";
    process.env.GITHUB_REF_NAME = "main";
    process.env.GITHUB_RUN_ID = "99999";

    // Mock fetch for artifact tests
    global.fetch = mock(async () => {
      return new Response(JSON.stringify({ workflow_runs: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;
  });

  afterEach(async () => {
    await provider?.cleanup();
    provider = null;

    // Restore original values
    process.env.GITHUB_TOKEN = originalEnv.GITHUB_TOKEN;
    process.env.GITHUB_REPOSITORY = originalEnv.GITHUB_REPOSITORY;
    process.env.GITHUB_REF_NAME = originalEnv.GITHUB_REF_NAME;
    process.env.GITHUB_RUN_ID = originalEnv.GITHUB_RUN_ID;
    global.fetch = originalFetch;
  });

  it("should create sqlite-local provider", async () => {
    const config: StorageProviderConfig = {
      type: "sqlite-local",
      path: ":memory:",
    };

    provider = createStorageProvider(config);
    expect(provider).toBeDefined();
    expect(provider.isInitialized()).toBe(false);

    const db = await provider.initialize();
    expect(db).toBeDefined();
    expect(provider.isInitialized()).toBe(true);
  });

  it("should create sqlite-artifact provider", async () => {
    const uniquePath = `/tmp/factory-artifact-${Date.now()}.db`;
    const config: StorageProviderConfig = {
      type: "sqlite-artifact",
      artifactName: "test-artifact",
      databasePath: uniquePath,
    };

    provider = createStorageProvider(config);
    expect(provider).toBeDefined();
    expect(provider.isInitialized()).toBe(false);

    const db = await provider.initialize();
    expect(db).toBeDefined();
    expect(provider.isInitialized()).toBe(true);
  });

  it("should throw error for unsupported provider types", () => {
    const config = {
      type: "unsupported-type",
    } as unknown as StorageProviderConfig;

    expect(() => createStorageProvider(config)).toThrow("not yet implemented");
  });
});
