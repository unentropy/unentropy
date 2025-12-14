import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { SqliteArtifactStorageProvider } from "../../../../src/storage/providers/sqlite-artifact";
import type { SqliteArtifactConfig } from "../../../../src/storage/providers/interface";

// Helper to create a properly typed mock fetch
const createMockFetch = (
  handler: (url: string, options?: RequestInit) => Promise<Response>
): typeof fetch => {
  const mockFn = mock(handler) as unknown as typeof fetch;
  return mockFn;
};

describe("SqliteArtifactStorageProvider", () => {
  let provider: SqliteArtifactStorageProvider;
  const baseConfig: SqliteArtifactConfig = {
    type: "sqlite-artifact",
    artifactName: "unentropy-metrics",
    branchFilter: "main",
    databasePath: "/tmp/test-unentropy.db",
  };

  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.GITHUB_TOKEN = "test-token";
    process.env.GITHUB_REPOSITORY = "test-owner/test-repo";
    process.env.GITHUB_REF_NAME = "main";
    process.env.GITHUB_RUN_ID = "99999";
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;

    if (provider) {
      try {
        await provider.cleanup();
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe("constructor", () => {
    test("should create provider with default values", () => {
      provider = new SqliteArtifactStorageProvider({
        type: "sqlite-artifact",
      });

      expect(provider).toBeDefined();
      expect(provider.isInitialized()).toBe(false);
    });

    test("should create provider with custom artifact name", () => {
      provider = new SqliteArtifactStorageProvider({
        type: "sqlite-artifact",
        artifactName: "custom-metrics",
      });

      expect(provider).toBeDefined();
      expect(provider.getArtifactName()).toBe("custom-metrics");
    });

    test("should create provider with custom branch filter", () => {
      provider = new SqliteArtifactStorageProvider({
        type: "sqlite-artifact",
        branchFilter: "develop",
      });

      expect(provider).toBeDefined();
      expect(provider.getBranchFilter()).toBe("develop");
    });

    test("should use environment variable for branch filter when not specified", () => {
      process.env.GITHUB_REF_NAME = "feature/test";
      provider = new SqliteArtifactStorageProvider({
        type: "sqlite-artifact",
      });

      expect(provider.getBranchFilter()).toBe("feature/test");
    });

    test("should default branch filter to main when env var not set", () => {
      delete process.env.GITHUB_REF_NAME;
      provider = new SqliteArtifactStorageProvider({
        type: "sqlite-artifact",
      });

      expect(provider.getBranchFilter()).toBe("main");
    });
  });

  describe("initialize", () => {
    test("should throw error when GITHUB_TOKEN is not set", async () => {
      delete process.env.GITHUB_TOKEN;
      provider = new SqliteArtifactStorageProvider(baseConfig);

      await expect(provider.initialize()).rejects.toThrow(
        "GITHUB_TOKEN environment variable is required"
      );
    });

    test("should throw error when GITHUB_REPOSITORY is not set", async () => {
      delete process.env.GITHUB_REPOSITORY;
      provider = new SqliteArtifactStorageProvider(baseConfig);

      await expect(provider.initialize()).rejects.toThrow(
        "GITHUB_REPOSITORY environment variable is required"
      );
    });

    test("should throw error for invalid GITHUB_REPOSITORY format", async () => {
      process.env.GITHUB_REPOSITORY = "invalid-format";
      provider = new SqliteArtifactStorageProvider(baseConfig);

      await expect(provider.initialize()).rejects.toThrow("Invalid GITHUB_REPOSITORY format");
    });

    test("should create new database when no previous artifact exists", async () => {
      const uniquePath = `/tmp/unentropy-artifact-test-${Date.now()}.db`;
      provider = new SqliteArtifactStorageProvider({
        ...baseConfig,
        databasePath: uniquePath,
      });

      // Mock fetch to return empty artifacts list
      global.fetch = createMockFetch(async (url: string) => {
        if (url.includes("/actions/artifacts")) {
          return new Response(JSON.stringify({ artifacts: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("Not found", { status: 404 });
      });

      const db = await provider.initialize();

      expect(db).toBeDefined();
      expect(provider.isInitialized()).toBe(true);
      expect(provider.isFirstRun()).toBe(true);
    });

    test("should return same database instance on multiple initialize calls", async () => {
      const uniquePath = `/tmp/unentropy-artifact-multi-init-${Date.now()}.db`;
      provider = new SqliteArtifactStorageProvider({
        ...baseConfig,
        databasePath: uniquePath,
      });

      // Mock fetch to return empty artifacts list
      global.fetch = createMockFetch(async () => {
        return new Response(JSON.stringify({ artifacts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const db1 = await provider.initialize();
      const db2 = await provider.initialize();

      expect(db1).toBe(db2);
    });
  });

  describe("persist", () => {
    test("should throw error when not initialized", async () => {
      provider = new SqliteArtifactStorageProvider(baseConfig);

      await expect(provider.persist()).rejects.toThrow("Storage provider not initialized");
    });

    test("should persist database successfully", async () => {
      const uniquePath = `/tmp/unentropy-artifact-persist-${Date.now()}.db`;
      provider = new SqliteArtifactStorageProvider({
        ...baseConfig,
        databasePath: uniquePath,
      });

      // Mock fetch for initialization
      global.fetch = createMockFetch(async (url: string) => {
        if (url.includes("/actions/artifacts")) {
          return new Response(JSON.stringify({ artifacts: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("Not found", { status: 404 });
      });

      // Mock artifact upload
      const mockUploadArtifact = mock(() =>
        Promise.resolve({ id: 12345, size: 1024, digest: "test-digest" })
      );
      const MockArtifactClient = mock(() => ({
        uploadArtifact: mockUploadArtifact,
      }));

      mock.module("@actions/artifact", () => ({
        DefaultArtifactClient: MockArtifactClient,
      }));

      await provider.initialize();

      // Create some test data
      const db = provider.getDb();
      db.run("CREATE TABLE test_persist (id INTEGER PRIMARY KEY, value TEXT)");
      db.run("INSERT INTO test_persist (value) VALUES (?)", ["test"]);

      await provider.persist();

      // Verify provider is still initialized after persist
      expect(provider.isInitialized()).toBe(true);
      expect(mockUploadArtifact).toHaveBeenCalled();
    });

    test("should fail when artifact upload fails", async () => {
      const uniquePath = `/tmp/unentropy-artifact-persist-fail-${Date.now()}.db`;
      provider = new SqliteArtifactStorageProvider({
        ...baseConfig,
        databasePath: uniquePath,
      });

      // Mock fetch for initialization
      global.fetch = createMockFetch(async (url: string) => {
        if (url.includes("/actions/artifacts")) {
          return new Response(JSON.stringify({ artifacts: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("Not found", { status: 404 });
      });

      // Mock artifact upload to fail
      const mockUploadArtifact = mock(() => Promise.reject(new Error("Upload failed")));
      const MockArtifactClient = mock(() => ({
        uploadArtifact: mockUploadArtifact,
      }));

      mock.module("@actions/artifact", () => ({
        DefaultArtifactClient: MockArtifactClient,
      }));

      await provider.initialize();

      // Create some test data
      const db = provider.getDb();
      db.run("CREATE TABLE test_persist (id INTEGER PRIMARY KEY, value TEXT)");

      await expect(provider.persist()).rejects.toThrow("Upload failed");
    });
  });

  describe("cleanup", () => {
    test("should cleanup database resources", async () => {
      const uniquePath = `/tmp/unentropy-artifact-cleanup-${Date.now()}.db`;
      provider = new SqliteArtifactStorageProvider({
        ...baseConfig,
        databasePath: uniquePath,
      });

      // Mock fetch for initialization
      global.fetch = createMockFetch(async () => {
        return new Response(JSON.stringify({ artifacts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      await provider.initialize();
      expect(provider.isInitialized()).toBe(true);

      await provider.cleanup();
      expect(provider.isInitialized()).toBe(false);
    });

    test("should be safe to call cleanup multiple times", async () => {
      provider = new SqliteArtifactStorageProvider(baseConfig);

      // Should not throw
      await provider.cleanup();
      await provider.cleanup();
    });
  });

  describe("getDb", () => {
    test("should throw error when not initialized", () => {
      provider = new SqliteArtifactStorageProvider(baseConfig);

      expect(() => provider.getDb()).toThrow("Database not initialized");
    });

    test("should return database when initialized", async () => {
      const uniquePath = `/tmp/unentropy-artifact-getdb-${Date.now()}.db`;
      provider = new SqliteArtifactStorageProvider({
        ...baseConfig,
        databasePath: uniquePath,
      });

      // Mock fetch for initialization
      global.fetch = createMockFetch(async () => {
        return new Response(JSON.stringify({ artifacts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      await provider.initialize();
      const db = provider.getDb();

      expect(db).toBeDefined();
      // Verify it's a working database connection
      db.run("CREATE TABLE test_getdb (id INTEGER PRIMARY KEY)");
      const result = db.query("SELECT name FROM sqlite_master WHERE type='table'").all();
      expect(result).toContainEqual({ name: "test_getdb" });
    });
  });

  describe("SQLite configuration", () => {
    test("should configure SQLite properly", async () => {
      const uniquePath = `/tmp/unentropy-artifact-sqlite-config-${Date.now()}.db`;
      provider = new SqliteArtifactStorageProvider({
        ...baseConfig,
        databasePath: uniquePath,
      });

      // Mock fetch for initialization
      global.fetch = createMockFetch(async () => {
        return new Response(JSON.stringify({ artifacts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      await provider.initialize();
      const db = provider.getDb();

      // Verify SQLite configuration
      const journalMode = db.query("PRAGMA journal_mode").get() as {
        journal_mode: string;
      };
      expect(journalMode.journal_mode).toBe("wal");

      const foreignKeys = db.query("PRAGMA foreign_keys").get() as {
        foreign_keys: number;
      };
      expect(foreignKeys.foreign_keys).toBe(1);

      const busyTimeout = db.query("PRAGMA busy_timeout").get() as {
        timeout: number;
      };
      expect(busyTimeout.timeout).toBe(5000);
    });
  });

  describe("artifact metadata", () => {
    test("should return correct artifact name", () => {
      provider = new SqliteArtifactStorageProvider({
        type: "sqlite-artifact",
        artifactName: "my-metrics-db",
      });

      expect(provider.getArtifactName()).toBe("my-metrics-db");
    });

    test("should return default artifact name when not specified", () => {
      provider = new SqliteArtifactStorageProvider({
        type: "sqlite-artifact",
      });

      expect(provider.getArtifactName()).toBe("unentropy-metrics");
    });

    test("should return database path", () => {
      const customPath = "/tmp/custom-path.db";
      provider = new SqliteArtifactStorageProvider({
        type: "sqlite-artifact",
        databasePath: customPath,
      });

      expect(provider.getDatabasePath()).toBe(customPath);
    });

    test("should return default database path when not specified", () => {
      provider = new SqliteArtifactStorageProvider({
        type: "sqlite-artifact",
      });

      expect(provider.getDatabasePath()).toBe("./unentropy-metrics.db");
    });
  });

  describe("source run tracking", () => {
    test("should report first run when no previous artifact exists", async () => {
      const uniquePath = `/tmp/unentropy-artifact-first-${Date.now()}.db`;
      provider = new SqliteArtifactStorageProvider({
        ...baseConfig,
        databasePath: uniquePath,
      });

      // Mock fetch to return empty artifacts list
      global.fetch = createMockFetch(async () => {
        return new Response(JSON.stringify({ artifacts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      await provider.initialize();

      expect(provider.isFirstRun()).toBe(true);
    });
  });
});
