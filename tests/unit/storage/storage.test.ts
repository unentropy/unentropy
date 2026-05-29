import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Storage } from "../../../src/storage/storage";
import { createStorageProvider } from "../../../src/storage/providers/factory";
import { rm } from "fs/promises";

describe("Storage", () => {
  const testDbPath = "./test-client.db";
  let storage: Storage;

  beforeEach(async () => {
    storage = new Storage(
      createStorageProvider({
        type: "sqlite-local",
        path: testDbPath,
      })
    );
    await storage.ready();
  });

  afterEach(async () => {
    await storage.close();
    await rm(testDbPath, { force: true });
    await rm(`${testDbPath}-shm`, { force: true });
    await rm(`${testDbPath}-wal`, { force: true });
  });

  it("provides direct database access", () => {
    const db = storage.getConnection();
    expect(db).toBeDefined();
  });

  it("configures DELETE journal mode via provider", () => {
    const db = storage.getConnection();
    const result = db.prepare("PRAGMA journal_mode").get() as Record<string, unknown>;
    expect(result?.journal_mode).toBe("delete");
  });

  it("enables foreign keys via provider", () => {
    const db = storage.getConnection();
    const result = db.prepare("PRAGMA foreign_keys").get() as Record<string, unknown>;
    expect(result?.foreign_keys).toBe(1);
  });

  it("sets busy timeout", () => {
    const db = storage.getConnection();
    const result = db.prepare("PRAGMA busy_timeout").get() as Record<string, unknown>;
    expect(result?.timeout).toBe(5000);
  });
});
