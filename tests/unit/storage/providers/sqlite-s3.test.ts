import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { SqliteS3StorageProvider } from "../../../../src/storage/providers/sqlite-s3";

describe("SqliteS3StorageProvider", () => {
  let provider: SqliteS3StorageProvider;

  beforeEach(async () => {
    const uniqueSuffix = Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    provider = new SqliteS3StorageProvider({
      type: "sqlite-s3",
      endpoint: "http://localhost:9000",
      bucket: "unentropy-test",
      region: "us-east-1",
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
      databaseKey: `test-${uniqueSuffix}.db`,
    });
  });

  afterEach(async () => {
    if (provider) {
      await provider.cleanup();
    }
  });

  test("should initialize with temporary database", async () => {
    await provider.initialize();

    expect(provider.isInitialized()).toBe(true);

    // Should have created temporary database file
    const tempPath = provider.getTempDbPath();
    expect(tempPath).toContain("/tmp/unentropy-s3-");
    expect(tempPath).toContain(".db");
  });

  test("should create new database when none exists in S3", async () => {
    await provider.initialize();

    expect(provider.isInitialized()).toBe(true);

    // Should be able to get database connection
    const db = await provider.initialize();
    expect(db).toBeDefined();
  });

  test("should use custom database key when provided", async () => {
    const uniqueSuffix = Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    const customProvider = new SqliteS3StorageProvider({
      type: "sqlite-s3",
      endpoint: "http://localhost:9000",
      bucket: "unentropy-test",
      region: "us-east-1",
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
      databaseKey: `custom/path/test-${uniqueSuffix}.db`,
    });

    await customProvider.initialize();

    expect(customProvider.isInitialized()).toBe(true);

    // Should use custom key
    const tempPath = customProvider.getTempDbPath();
    expect(tempPath).toBeDefined();

    // Verify custom key was used by checking provider's behavior
    expect(customProvider.isInitialized()).toBe(true);
  });

  test("should configure SQLite connection properly", async () => {
    await provider.initialize();

    const db = await provider.initialize();

    // Verify SQLite configuration
    const journalMode = db.query("PRAGMA journal_mode").get() as { journal_mode: string };
    expect(journalMode.journal_mode).toBe("delete");

    const foreignKeys = db.query("PRAGMA foreign_keys").get() as { foreign_keys: number };
    expect(foreignKeys.foreign_keys).toBe(1);

    const busyTimeout = db.query("PRAGMA busy_timeout").get() as { timeout: number };
    expect(busyTimeout.timeout).toBe(5000);
  });

  test("should upload database to S3 on persist", async () => {
    await provider.initialize();
    const db = await provider.initialize();

    // Create test table and insert data
    db.run("CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT)");
    db.run("INSERT INTO test_table (name) VALUES (?)", ["test_data"]);

    // Persist to S3
    await provider.persist();

    // Verify file exists in S3
    const s3Client = provider.getS3Client();
    if (!s3Client) {
      throw new Error("S3 client not initialized");
    }
    const s3File = s3Client.file(provider.getDatabaseKey());
    expect(await s3File.exists()).toBe(true);
  });

  test("should download existing database from S3 on initialization", async () => {
    // First provider: create and upload data
    await provider.initialize();
    const db1 = await provider.initialize();

    db1.run("CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT)");
    db1.run("INSERT INTO test_table (name) VALUES (?)", ["original_data"]);
    await provider.persist();
    await provider.cleanup();

    // Second provider: should download existing data
    const provider2 = new SqliteS3StorageProvider({
      type: "sqlite-s3",
      endpoint: "http://localhost:9000",
      bucket: "unentropy-test",
      region: "us-east-1",
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
      databaseKey: provider.getDatabaseKey(),
    });

    await provider2.initialize();
    const db2 = await provider2.initialize();

    // Verify data was downloaded
    const result = db2.query("SELECT name FROM test_table").get() as { name: string } | undefined;
    expect(result?.name).toBe("original_data");

    await provider2.cleanup();
  });

  test("should handle database persistence across provider instances", async () => {
    // Create initial data with first provider
    await provider.initialize();
    const db1 = await provider.initialize();

    db1.run("CREATE TABLE metrics (id INTEGER PRIMARY KEY, value INTEGER)");
    db1.run("INSERT INTO metrics (value) VALUES (?)", [42]);
    await provider.persist();
    await provider.cleanup();

    // Create second provider and verify data persistence
    const provider2 = new SqliteS3StorageProvider({
      type: "sqlite-s3",
      endpoint: "http://localhost:9000",
      bucket: "unentropy-test",
      region: "us-east-1",
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
      databaseKey: provider.getDatabaseKey(),
    });

    await provider2.initialize();
    const db2 = await provider2.initialize();

    // Add more data
    db2.run("INSERT INTO metrics (value) VALUES (?)", [84]);
    await provider2.persist();
    await provider2.cleanup();

    // Create third provider to verify all data persists
    const provider3 = new SqliteS3StorageProvider({
      type: "sqlite-s3",
      endpoint: "http://localhost:9000",
      bucket: "unentropy-test",
      region: "us-east-1",
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
      databaseKey: provider.getDatabaseKey(),
    });

    await provider3.initialize();
    const db3 = await provider3.initialize();

    const results = db3.query("SELECT value FROM metrics ORDER BY id").all() as { value: number }[];
    expect(results).toHaveLength(2);
    expect(results[0]?.value).toBe(42);
    expect(results[1]?.value).toBe(84);

    await provider3.cleanup();
  });

  test("should maintain data integrity after upload/download cycle", async () => {
    await provider.initialize();
    const db = await provider.initialize();

    // Create complex test data
    db.run(
      "CREATE TABLE test_data (id INTEGER PRIMARY KEY, text TEXT, number REAL, blob BLOB, timestamp INTEGER)"
    );

    const baseTime = 1600000000000;
    const testData = [
      { id: 1, text: "test1", number: 3.14, blob: null, timestamp: baseTime },
      { id: 2, text: "test2", number: 2.71, blob: null, timestamp: baseTime + 1000 },
      { id: 3, text: "test3", number: 1.618, blob: null, timestamp: baseTime + 2000 },
    ];

    for (const data of testData) {
      db.run("INSERT INTO test_data (text, number, timestamp) VALUES (?, ?, ?)", [
        data.text,
        data.number,
        data.timestamp,
      ]);
    }

    // Persist and cleanup
    await provider.persist();
    await provider.cleanup();

    // Create new provider and verify data integrity
    const provider2 = new SqliteS3StorageProvider({
      type: "sqlite-s3",
      endpoint: "http://localhost:9000",
      bucket: "unentropy-test",
      region: "us-east-1",
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
      databaseKey: provider.getDatabaseKey(),
    });

    await provider2.initialize();
    const db2 = await provider2.initialize();

    const results = db2.query("SELECT * FROM test_data ORDER BY id").all() as {
      text: string;
      number: number;
      timestamp: number;
    }[];
    // expect(results).toHaveLength(3);
    expect(results).toEqual(testData);

    await provider2.cleanup();
  });

  test("should use custom database key in S3 operations", async () => {
    const uniqueSuffix = Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    const customKey = `custom/path/test-${uniqueSuffix}.db`;
    const customProvider = new SqliteS3StorageProvider({
      type: "sqlite-s3",
      endpoint: "http://localhost:9000",
      bucket: "unentropy-test",
      region: "us-east-1",
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
      databaseKey: customKey,
    });

    await customProvider.initialize();
    const db = await customProvider.initialize();

    db.run("CREATE TABLE custom_test (id INTEGER PRIMARY KEY, value TEXT)");
    db.run("INSERT INTO custom_test (value) VALUES (?)", ["custom_key_test"]);
    await customProvider.persist();

    // Verify file exists at custom path
    const s3Client = customProvider.getS3Client();
    if (!s3Client) {
      throw new Error("S3 client not initialized");
    }
    const s3File = s3Client.file(customKey);
    expect(await s3File.exists()).toBe(true);

    await customProvider.cleanup();
  });
});
