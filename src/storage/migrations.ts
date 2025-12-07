import { copyFileSync } from "fs";
import { Storage } from "./storage";
import { Database } from "bun:sqlite";

interface Migration {
  version: string;
  description: string;
  up: (db: Database, dbPath: string) => void;
}

function tableExists(db: Database, tableName: string): boolean {
  const result = db
    .query<
      { count: number },
      [string]
    >("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?")
    .get(tableName);
  return (result?.count ?? 0) > 0;
}

function hasIntegerMetricId(db: Database): boolean {
  const result = db
    .query<
      { type: string },
      [string]
    >("SELECT type FROM pragma_table_info('metric_definitions') WHERE name='id'")
    .get("id");
  return result?.type === "INTEGER";
}

function createBackup(dbPath: string): string {
  const backupPath = `${dbPath}.backup-${Date.now()}`;
  copyFileSync(dbPath, backupPath);
  console.log(`Created backup: ${backupPath}`);
  return backupPath;
}

const FRESH_INSTALL_SQL = `
  CREATE TABLE IF NOT EXISTS metric_definitions (
    id TEXT PRIMARY KEY CHECK(id GLOB '[a-z0-9-]*'),
    type TEXT NOT NULL CHECK(type IN ('numeric', 'label')),
    unit TEXT,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS build_contexts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commit_sha TEXT NOT NULL,
    branch TEXT NOT NULL,
    run_id TEXT NOT NULL,
    run_number INTEGER NOT NULL,
    event_name TEXT,
    timestamp DATETIME NOT NULL,
    UNIQUE(commit_sha, run_id)
  );

  CREATE INDEX IF NOT EXISTS idx_build_timestamp ON build_contexts(timestamp);
  CREATE INDEX IF NOT EXISTS idx_build_branch ON build_contexts(branch);
  CREATE INDEX IF NOT EXISTS idx_build_commit ON build_contexts(commit_sha);
  CREATE INDEX IF NOT EXISTS idx_build_event_timestamp ON build_contexts(event_name, timestamp);

  CREATE TABLE IF NOT EXISTS metric_values (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_id TEXT NOT NULL,
    build_id INTEGER NOT NULL,
    value_numeric REAL,
    value_label TEXT,
    FOREIGN KEY (metric_id) REFERENCES metric_definitions(id),
    FOREIGN KEY (build_id) REFERENCES build_contexts(id),
    UNIQUE(metric_id, build_id),
    CHECK(
      (value_numeric IS NOT NULL AND value_label IS NULL) OR
      (value_numeric IS NULL AND value_label IS NOT NULL)
    )
  );

  CREATE INDEX IF NOT EXISTS idx_metric_value_build ON metric_values(build_id);
`;

const UPGRADE_FROM_1_1_0_SQL = `
  -- Create new tables with v2.0.0 schema
  CREATE TABLE metric_definitions_new (
    id TEXT PRIMARY KEY CHECK(id GLOB '[a-z0-9-]*'),
    type TEXT NOT NULL CHECK(type IN ('numeric', 'label')),
    unit TEXT,
    description TEXT
  );

  CREATE TABLE build_contexts_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commit_sha TEXT NOT NULL,
    branch TEXT NOT NULL,
    run_id TEXT NOT NULL,
    run_number INTEGER NOT NULL,
    event_name TEXT,
    timestamp DATETIME NOT NULL,
    UNIQUE(commit_sha, run_id)
  );

  CREATE TABLE metric_values_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_id TEXT NOT NULL,
    build_id INTEGER NOT NULL,
    value_numeric REAL,
    value_label TEXT,
    FOREIGN KEY (metric_id) REFERENCES metric_definitions_new(id),
    FOREIGN KEY (build_id) REFERENCES build_contexts_new(id),
    UNIQUE(metric_id, build_id),
    CHECK(
      (value_numeric IS NOT NULL AND value_label IS NULL) OR
      (value_numeric IS NULL AND value_label IS NOT NULL)
    )
  );

  -- Migrate data (transform INTEGER metric_id to TEXT via JOIN)
  INSERT INTO metric_definitions_new (id, type, unit, description)
  SELECT name, type, unit, description FROM metric_definitions;

  INSERT INTO build_contexts_new (id, commit_sha, branch, run_id, run_number, event_name, timestamp)
  SELECT id, commit_sha, branch, run_id, run_number, event_name, timestamp FROM build_contexts;

  INSERT INTO metric_values_new (id, metric_id, build_id, value_numeric, value_label)
  SELECT mv.id, md.name, mv.build_id, mv.value_numeric, mv.value_label
  FROM metric_values mv
  JOIN metric_definitions md ON mv.metric_id = md.id;

  -- Drop old tables (indexes are dropped automatically)
  DROP TABLE metric_values;
  DROP TABLE build_contexts;
  DROP TABLE metric_definitions;

  -- Rename new tables
  ALTER TABLE metric_definitions_new RENAME TO metric_definitions;
  ALTER TABLE build_contexts_new RENAME TO build_contexts;
  ALTER TABLE metric_values_new RENAME TO metric_values;

  -- Create indexes
  CREATE INDEX idx_build_timestamp ON build_contexts(timestamp);
  CREATE INDEX idx_build_branch ON build_contexts(branch);
  CREATE INDEX idx_build_commit ON build_contexts(commit_sha);
  CREATE INDEX idx_build_event_timestamp ON build_contexts(event_name, timestamp);
  CREATE INDEX idx_metric_value_build ON metric_values(build_id);
`;

const migrations: Migration[] = [
  {
    version: "2.0.0",
    description: "Clean schema with string metric IDs",
    up: (db, dbPath) => {
      const existingTables = tableExists(db, "metric_definitions");
      const isUpgradeFrom1x = existingTables && hasIntegerMetricId(db);

      if (isUpgradeFrom1x) {
        console.log("Detected v1.x schema, upgrading to v2.0.0...");
        createBackup(dbPath);
        db.exec(UPGRADE_FROM_1_1_0_SQL);
        console.log("Migration from v1.x to v2.0.0 completed successfully");
      } else if (!existingTables) {
        db.exec(FRESH_INSTALL_SQL);
      }
    },
  },
];

export function initializeSchema(storage: Storage, targetVersion?: string): void {
  const db = storage.getConnection();
  const dbPath = storage.getDatabasePath();

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version TEXT PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    );
  `);

  const currentVersionRow = db
    .query<
      { version: string },
      []
    >("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1")
    .get();

  const currentVersion = currentVersionRow?.version;
  const currentMigrationIndex = currentVersion
    ? migrations.findIndex((m) => m.version === currentVersion)
    : -1;

  const targetIndex = targetVersion
    ? migrations.findIndex((m) => m.version === targetVersion)
    : migrations.length - 1;

  if (targetIndex === -1) {
    throw new Error(`Unknown target version: ${targetVersion}`);
  }

  for (let i = currentMigrationIndex + 1; i <= targetIndex; i++) {
    const migration = migrations[i];
    if (!migration) continue;

    migration.up(db, dbPath);

    const insertStmt = db.query<unknown, [string, string]>(
      "INSERT OR IGNORE INTO schema_version (version, description) VALUES (?, ?)"
    );
    insertStmt.run(migration.version, migration.description);
  }
}
