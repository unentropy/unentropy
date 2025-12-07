import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Storage } from "../../../src/storage/storage";
import { initializeSchema } from "../../../src/storage/migrations";
import { rm } from "fs/promises";

describe("Schema Initialization", () => {
  const testDbPath = "./test-migrations.db";
  let client: Storage;

  beforeEach(async () => {
    client = new Storage({
      type: "sqlite-local",
      path: testDbPath,
    });
    await client.ready();
  });

  afterEach(async () => {
    await client.close();
    await rm(testDbPath, { force: true });
    await rm(`${testDbPath}-shm`, { force: true });
    await rm(`${testDbPath}-wal`, { force: true });
  });

  it("creates all required tables", () => {
    initializeSchema(client);
    const db = client.getConnection();

    const tables = db
      .query<
        { name: string },
        []
      >("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all();

    const tableNames = tables.map((t) => t.name).sort();
    expect(tableNames).toEqual([
      "build_contexts",
      "metric_definitions",
      "metric_values",
      "schema_version",
    ]);
  });

  it("creates metric_definitions table with correct schema", () => {
    initializeSchema(client);
    const db = client.getConnection();

    const columns = db
      .query<{ name: string; type: string }, []>("PRAGMA table_info(metric_definitions)")
      .all();
    const columnNames = columns.map((c) => c.name);

    expect(columnNames).toEqual(["id", "type", "unit", "description"]);
  });

  it("creates build_contexts table with correct schema", () => {
    initializeSchema(client);
    const db = client.getConnection();

    const columns = db
      .query<{ name: string; type: string }, []>("PRAGMA table_info(build_contexts)")
      .all();
    const columnNames = columns.map((c) => c.name);

    expect(columnNames).toEqual([
      "id",
      "commit_sha",
      "branch",
      "run_id",
      "run_number",
      "event_name",
      "timestamp",
    ]);
  });

  it("creates metric_values table with correct schema", () => {
    initializeSchema(client);
    const db = client.getConnection();

    const columns = db
      .query<{ name: string; type: string }, []>("PRAGMA table_info(metric_values)")
      .all();
    const columnNames = columns.map((c) => c.name);

    expect(columnNames).toEqual(["id", "metric_id", "build_id", "value_numeric", "value_label"]);
  });

  it("creates indexes", () => {
    initializeSchema(client);
    const db = client.getConnection();

    const indexes = db
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type='index'")
      .all();

    const indexNames = indexes.map((i) => i.name).sort();
    expect(indexNames).toContain("idx_build_timestamp");
    expect(indexNames).toContain("idx_build_branch");
    expect(indexNames).toContain("idx_build_commit");
    expect(indexNames).toContain("idx_build_event_timestamp");
    expect(indexNames).toContain("idx_metric_value_build");
  });

  it("records schema version", () => {
    initializeSchema(client);
    const db = client.getConnection();

    const version = db
      .query<
        { version: string },
        []
      >("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1")
      .get();

    expect(version?.version).toBe("2.0.0");
  });

  it("is idempotent", () => {
    initializeSchema(client);
    initializeSchema(client);

    const db = client.getConnection();
    const versions = db
      .query<{ count: number }, []>("SELECT COUNT(*) as count FROM schema_version")
      .get();

    expect(versions?.count).toBe(1);
  });

  it("uses TEXT primary key for metric_definitions", () => {
    initializeSchema(client);
    const db = client.getConnection();

    const columns = db
      .query<
        { name: string; type: string; pk: number },
        []
      >("PRAGMA table_info(metric_definitions)")
      .all();

    const idColumn = columns.find((c) => c.name === "id");
    expect(idColumn?.type).toBe("TEXT");
    expect(idColumn?.pk).toBe(1);
  });

  it("uses TEXT for metric_id in metric_values", () => {
    initializeSchema(client);
    const db = client.getConnection();

    const columns = db
      .query<{ name: string; type: string }, []>("PRAGMA table_info(metric_values)")
      .all();

    const metricIdColumn = columns.find((c) => c.name === "metric_id");
    expect(metricIdColumn?.type).toBe("TEXT");
  });
});
