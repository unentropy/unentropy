import { Storage } from "./storage";
import { Database } from "bun:sqlite";

interface Migration {
  version: string;
  description: string;
  up: (db: Database) => void;
}

const SCHEMA_SQL = `
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

const migrations: Migration[] = [
  {
    version: "2.0.0",
    description: "Clean schema with string metric IDs",
    up: (db) => {
      db.exec(SCHEMA_SQL);
    },
  },
];

export function initializeSchema(storage: Storage, targetVersion?: string): void {
  const db = storage.getConnection();

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

    migration.up(db);

    const insertStmt = db.query<unknown, [string, string]>(
      "INSERT OR IGNORE INTO schema_version (version, description) VALUES (?, ?)"
    );
    insertStmt.run(migration.version, migration.description);
  }
}
