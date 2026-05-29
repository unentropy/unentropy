import { describe, it, expect, afterEach } from "bun:test";
import { SqliteLocalStorageProvider } from "../../../../src/storage/providers/sqlite-local";
import { existsSync, unlinkSync } from "fs";

describe("SqliteLocalStorageProvider", () => {
  const testDbPath = "./test-provider.db";
  let provider: SqliteLocalStorageProvider;

  afterEach(async () => {
    await provider?.cleanup();
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  it("should initialize database at specified path", async () => {
    provider = new SqliteLocalStorageProvider({
      type: "sqlite-local",
      path: testDbPath,
    });

    const db = await provider.initialize();
    expect(db).toBeDefined();
    expect(provider.isInitialized()).toBe(true);
    expect(existsSync(testDbPath)).toBe(true);
  });

  it("should support in-memory database", async () => {
    provider = new SqliteLocalStorageProvider({
      type: "sqlite-local",
      path: ":memory:",
    });

    const db = await provider.initialize();
    expect(db).toBeDefined();
    expect(provider.isInitialized()).toBe(true);
  });

  it("should return same database instance on multiple initialize calls", async () => {
    provider = new SqliteLocalStorageProvider({
      type: "sqlite-local",
      path: ":memory:",
    });

    const db1 = await provider.initialize();
    const db2 = await provider.initialize();
    expect(db1).toBe(db2);
  });

  it("should cleanup database", async () => {
    provider = new SqliteLocalStorageProvider({
      type: "sqlite-local",
      path: ":memory:",
    });

    await provider.initialize();
    expect(provider.isInitialized()).toBe(true);

    await provider.cleanup();
    expect(provider.isInitialized()).toBe(false);
  });

  it("persist should be no-op", async () => {
    provider = new SqliteLocalStorageProvider({
      type: "sqlite-local",
      path: ":memory:",
    });

    await provider.initialize();
    const result = await provider.persist();
    expect(result).toBeUndefined();
  });

  it("should accept readonly configuration", async () => {
    // First create a database
    const tempProvider = new SqliteLocalStorageProvider({
      type: "sqlite-local",
      path: testDbPath,
    });
    const tempDb = await tempProvider.initialize();
    tempDb.exec("CREATE TABLE test (id INTEGER)");
    await tempProvider.cleanup();

    // Now open in readonly mode - just verify it opens successfully
    provider = new SqliteLocalStorageProvider({
      type: "sqlite-local",
      path: testDbPath,
      readonly: true,
    });

    const db = await provider.initialize();
    expect(db).toBeDefined();
    expect(provider.isInitialized()).toBe(true);
  });
});
