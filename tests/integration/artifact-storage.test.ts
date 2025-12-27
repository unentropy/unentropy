import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { Storage } from "../../src/storage/storage";
import { SqliteArtifactStorageProvider } from "../../src/storage/providers/sqlite-artifact";
import type {
  StorageProviderConfig,
  SqliteArtifactConfig,
} from "../../src/storage/providers/interface";

// Helper to create a properly typed mock fetch
const createMockFetch = (
  handler: (url: string, options?: RequestInit) => Promise<Response>
): typeof fetch => {
  const mockFn = mock(handler) as unknown as typeof fetch;
  return mockFn;
};

describe("Artifact Storage Integration", () => {
  const originalFetch = global.fetch;

  const baseArtifactConfig = {
    token: "test-token",
    repository: "test-owner/test-repo",
  };

  beforeEach(() => {
    // Mock fetch to return empty artifacts by default (first-run scenario)
    global.fetch = createMockFetch(async (url: string) => {
      if (url.includes("/actions/artifacts")) {
        return new Response(JSON.stringify({ artifacts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("Not found", { status: 404 });
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("sqlite-artifact provider", () => {
    let provider: SqliteArtifactStorageProvider;

    beforeEach(() => {
      // Mock artifact upload for all tests
      const mockUploadArtifact = mock(() =>
        Promise.resolve({ id: 12345, size: 1024, digest: "test-digest" })
      );
      const MockArtifactClient = mock(() => ({
        uploadArtifact: mockUploadArtifact,
      }));

      mock.module("@actions/artifact", () => ({
        DefaultArtifactClient: MockArtifactClient,
      }));
    });

    afterEach(async () => {
      if (provider) {
        try {
          await provider.cleanup();
        } catch {
          // Ignore cleanup errors
        }
      }
    });

    it("should initialize provider and create new database on first run", async () => {
      const uniquePath = `/tmp/artifact-integration-init-${Date.now()}.db`;
      const config: SqliteArtifactConfig = {
        type: "sqlite-artifact",
        databasePath: uniquePath,
        ...baseArtifactConfig,
      };

      provider = new SqliteArtifactStorageProvider(config);

      const db = await provider.initialize();

      expect(db).toBeDefined();
      expect(provider.isInitialized()).toBe(true);
      expect(provider.isFirstRun()).toBe(true);
    });

    it("should handle complete workflow: initialize, use, persist, cleanup", async () => {
      const uniquePath = `/tmp/artifact-integration-workflow-${Date.now()}.db`;
      const config: SqliteArtifactConfig = {
        type: "sqlite-artifact",
        databasePath: uniquePath,
        artifactName: "integration-test",
        ...baseArtifactConfig,
      };

      provider = new SqliteArtifactStorageProvider(config);

      // Initialize
      const db = await provider.initialize();
      expect(db).toBeDefined();
      expect(provider.isInitialized()).toBe(true);

      // Use database
      db.run("CREATE TABLE integration_test (id INTEGER PRIMARY KEY, data TEXT)");
      db.run("INSERT INTO integration_test (data) VALUES (?)", ["test-data"]);

      const result = db.query("SELECT data FROM integration_test").get() as { data: string };
      expect(result.data).toBe("test-data");

      // Persist (will fallback since we're not in real GitHub Actions)
      await provider.persist();
      expect(provider.isInitialized()).toBe(true);

      // Cleanup
      await provider.cleanup();
      expect(provider.isInitialized()).toBe(false);
    });

    it("should support custom artifact name and branch filter", async () => {
      const uniquePath = `/tmp/artifact-integration-custom-${Date.now()}.db`;
      const config: SqliteArtifactConfig = {
        type: "sqlite-artifact",
        databasePath: uniquePath,
        artifactName: "my-custom-artifact",
        branchFilter: "develop",
        ...baseArtifactConfig,
      };

      provider = new SqliteArtifactStorageProvider(config);

      expect(provider.getArtifactName()).toBe("my-custom-artifact");
      expect(provider.getBranchFilter()).toBe("develop");

      await provider.initialize();
      expect(provider.isInitialized()).toBe(true);
    });

    it("should use default values when not specified", async () => {
      const config: SqliteArtifactConfig = {
        type: "sqlite-artifact",
        ...baseArtifactConfig,
      };

      provider = new SqliteArtifactStorageProvider(config);

      expect(provider.getArtifactName()).toBe("unentropy-metrics");
      expect(provider.getBranchFilter()).toBe("main");
      expect(provider.getDatabasePath()).toBe("./unentropy-metrics.db");
    });

    it("should throw error when token is empty", async () => {
      const config: SqliteArtifactConfig = {
        type: "sqlite-artifact",
        token: "",
        repository: "owner/repo",
      };

      provider = new SqliteArtifactStorageProvider(config);

      await expect(provider.initialize()).rejects.toThrow("GitHub token is required");
    });

    it("should throw error when repository is empty", async () => {
      const config: SqliteArtifactConfig = {
        type: "sqlite-artifact",
        token: "test-token",
        repository: "",
      };

      provider = new SqliteArtifactStorageProvider(config);

      await expect(provider.initialize()).rejects.toThrow("GitHub repository is required");
    });

    it("should handle persist error when not initialized", async () => {
      const config: SqliteArtifactConfig = {
        type: "sqlite-artifact",
        ...baseArtifactConfig,
      };

      provider = new SqliteArtifactStorageProvider(config);

      await expect(provider.persist()).rejects.toThrow("Storage provider not initialized");
    });
  });

  describe("Storage class integration", () => {
    it("should create storage with sqlite-artifact provider through factory", async () => {
      const uniquePath = `/tmp/artifact-storage-factory-${Date.now()}.db`;
      const config: StorageProviderConfig = {
        type: "sqlite-artifact",
        databasePath: uniquePath,
        ...baseArtifactConfig,
      };

      const storage = new Storage(config);
      await storage.ready();

      // Verify storage is working
      expect(storage).toBeDefined();
      const repository = storage.getRepository();
      expect(repository).toBeDefined();

      await storage.close();
    });
  });

  describe("branch filter handling", () => {
    let provider: SqliteArtifactStorageProvider;

    afterEach(async () => {
      if (provider) {
        try {
          await provider.cleanup();
        } catch {
          // Ignore cleanup errors
        }
      }
    });

    it("should default to main when branchFilter not specified", () => {
      const config: SqliteArtifactConfig = {
        type: "sqlite-artifact",
        ...baseArtifactConfig,
      };

      provider = new SqliteArtifactStorageProvider(config);

      expect(provider.getBranchFilter()).toBe("main");
    });

    it("should use explicit branchFilter when specified", () => {
      const config: SqliteArtifactConfig = {
        type: "sqlite-artifact",
        branchFilter: "explicit-branch",
        ...baseArtifactConfig,
      };

      provider = new SqliteArtifactStorageProvider(config);

      expect(provider.getBranchFilter()).toBe("explicit-branch");
    });
  });

  describe("data persistence across provider instances", () => {
    it("should support creating multiple instances with different paths", async () => {
      const path1 = `/tmp/artifact-multi-1-${Date.now()}.db`;
      const path2 = `/tmp/artifact-multi-2-${Date.now()}.db`;

      const provider1 = new SqliteArtifactStorageProvider({
        type: "sqlite-artifact",
        databasePath: path1,
        artifactName: "artifact-1",
        ...baseArtifactConfig,
      });

      const provider2 = new SqliteArtifactStorageProvider({
        type: "sqlite-artifact",
        databasePath: path2,
        artifactName: "artifact-2",
        ...baseArtifactConfig,
      });

      await provider1.initialize();
      await provider2.initialize();

      // Create different data in each
      provider1.getDb().run("CREATE TABLE data1 (id INTEGER)");
      provider2.getDb().run("CREATE TABLE data2 (id INTEGER)");

      // Verify isolation
      const tables1 = provider1
        .getDb()
        .query("SELECT name FROM sqlite_master WHERE type='table'")
        .all();
      const tables2 = provider2
        .getDb()
        .query("SELECT name FROM sqlite_master WHERE type='table'")
        .all();

      expect(tables1).toContainEqual({ name: "data1" });
      expect(tables1).not.toContainEqual({ name: "data2" });
      expect(tables2).toContainEqual({ name: "data2" });
      expect(tables2).not.toContainEqual({ name: "data1" });

      await provider1.cleanup();
      await provider2.cleanup();
    });

    it("should maintain data after persist and reconnect", async () => {
      const uniquePath = `/tmp/artifact-reconnect-${Date.now()}.db`;

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

      const provider1 = new SqliteArtifactStorageProvider({
        type: "sqlite-artifact",
        databasePath: uniquePath,
        ...baseArtifactConfig,
      });

      await provider1.initialize();

      // Create data
      provider1.getDb().run("CREATE TABLE persist_test (value TEXT)");
      provider1.getDb().run("INSERT INTO persist_test (value) VALUES (?)", ["persisted"]);

      // Persist and cleanup
      await provider1.persist();
      await provider1.cleanup();

      // Create new provider pointing to same path
      const provider2 = new SqliteArtifactStorageProvider({
        type: "sqlite-artifact",
        databasePath: uniquePath,
        ...baseArtifactConfig,
      });

      // Mock fetch to simulate finding the artifact (first-run behavior for test)
      // In real scenario, this would download from GitHub
      await provider2.initialize();

      // Verify data persisted (since we're using same local path)
      const result = provider2.getDb().query("SELECT value FROM persist_test").get() as {
        value: string;
      };
      expect(result.value).toBe("persisted");

      await provider2.cleanup();
    });
  });
});
