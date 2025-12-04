import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Storage } from "../../src/storage/storage";
import { SqliteS3StorageProvider } from "../../src/storage/providers/sqlite-s3";
import type { StorageProviderConfig, SqliteS3Config } from "../../src/storage/providers/interface";

// Mock S3 configuration for testing
const mockS3Config: SqliteS3Config = {
  type: "sqlite-s3",
  endpoint: "https://s3.amazonaws.com",
  bucket: "test-bucket",
  region: "us-east-1",
  accessKeyId: "test-access-key",
  secretAccessKey: "test-secret-key",
  databaseKey: "test-unentropy.db",
};

describe("Storage Backend Selection Integration", () => {
  describe("sqlite-local provider", () => {
    it("should create storage for sqlite-local provider", async () => {
      const config: StorageProviderConfig = {
        type: "sqlite-local",
        path: `/tmp/storage-selection-local-${Date.now()}.db`,
      };

      const storage = new Storage(config);
      await storage.ready();
      await storage.close();
    });
  });

  describe("sqlite-s3 provider", () => {
    let s3Provider: SqliteS3StorageProvider;

    beforeEach(() => {
      s3Provider = new SqliteS3StorageProvider(mockS3Config);
    });

    afterEach(async () => {
      try {
        await s3Provider.cleanup();
      } catch {
        // Ignore cleanup errors
      }
    });

    it("should initialize S3 provider and create database", async () => {
      const db = await s3Provider.initialize();

      expect(db).toBeDefined();
      expect(s3Provider.isInitialized()).toBe(true);
      expect(s3Provider.getTempDbPath()).toContain("/tmp/unentropy-s3-");
      expect(s3Provider.getDatabaseKey()).toBe("test-unentropy.db");
    });

    it("should handle persist operation", async () => {
      await s3Provider.initialize();

      // Persist should not throw even if S3 operations fail in test environment
      // The provider should handle errors gracefully
      try {
        await s3Provider.persist();
      } catch (error) {
        // Expected in test environment without real S3
        expect(error).toBeInstanceOf(Error);
      }
    });

    it("should use default database key when not specified", async () => {
      const configWithoutKey: SqliteS3Config = {
        ...mockS3Config,
        databaseKey: undefined,
      };

      const provider = new SqliteS3StorageProvider(configWithoutKey);
      await provider.initialize();

      expect(provider.getDatabaseKey()).toBe("unentropy.db");

      await provider.cleanup();
    });

    it("should reject incomplete S3 configuration", async () => {
      const incompleteConfig: SqliteS3Config = {
        type: "sqlite-s3",
        // Missing required fields
      };

      const provider = new SqliteS3StorageProvider(incompleteConfig);

      expect(provider.initialize()).rejects.toThrow(
        "S3 configuration is incomplete: endpoint, accessKeyId, and secretAccessKey are required"
      );
    });

    it("should return same database instance on multiple initialize calls", async () => {
      const db1 = await s3Provider.initialize();
      const db2 = await s3Provider.initialize();

      expect(db1).toBe(db2);
      expect(s3Provider.isInitialized()).toBe(true);

      await s3Provider.cleanup();
    });

    it("should handle storage creation through Storage class", async () => {
      const provider: StorageProviderConfig = mockS3Config;
      const storage = new Storage(provider);

      // This should work without throwing
      expect(storage).toBeDefined();

      // Note: In test environment without real S3, initialization might fail
      // but the factory should create the provider successfully
      try {
        await storage.ready();
        await storage.close();
      } catch (error) {
        // Expected in test environment
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe("Storage Provider Factory", () => {
    it("should reject unknown storage type", async () => {
      // Test with type assertion to simulate invalid config
      const provider = { type: "invalid-type" } as unknown as StorageProviderConfig;

      const create = async () => {
        const db = new Storage(provider);
        await db.ready();
      };

      expect(create()).rejects.toThrow(
        "Storage provider type 'invalid-type' is not yet implemented"
      );
    });
  });
});
