# Database Schema

**Domain**: storage

## Overview

Defines the SQLite database schema for the Unentropy metrics tracking system. The schema supports metric definitions, build context tracking, and metric value storage with referential integrity and upsert semantics.

## Schema Version Management

### Version Tracking

```sql
CREATE TABLE IF NOT EXISTS schema_version (
  version TEXT PRIMARY KEY,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);
```

The `schema_version` table tracks the current schema version. On initialization, the system checks the current version and applies any pending migrations.

## Core Tables

### Table: `metric_definitions`

Stores metric metadata and configuration. The `id` is the metric key from the configuration file (e.g., `test-coverage`, `bundle-size`).

```sql
CREATE TABLE IF NOT EXISTS metric_definitions (
  id TEXT PRIMARY KEY CHECK(id GLOB '[a-z0-9-]*'),
  type TEXT NOT NULL CHECK(type IN ('numeric', 'label')),
  unit TEXT,
  description TEXT
);
```

**Columns**:

| Column        | Type | Nullable | Default | Constraints                         | Description            |
| ------------- | ---- | -------- | ------- | ----------------------------------- | ---------------------- |
| `id`          | TEXT | No       | -       | PRIMARY KEY, matches `^[a-z0-9-]+$` | Metric key from config |
| `type`        | TEXT | No       | -       | CHECK: 'numeric' or 'label'         | Metric type            |
| `unit`        | TEXT | Yes      | NULL    | Max 10 chars                        | Display unit           |
| `description` | TEXT | Yes      | NULL    | Max 256 chars                       | Human description      |

**Constraints**:

- `id` is the primary key (no separate auto-increment id)
- `type` must be 'numeric' or 'label'
- `id` must match the pattern `[a-z0-9-]*`

---

### Table: `build_contexts`

Stores CI/CD build execution metadata.

```sql
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

CREATE INDEX idx_build_timestamp ON build_contexts(timestamp);
CREATE INDEX idx_build_branch ON build_contexts(branch);
CREATE INDEX idx_build_commit ON build_contexts(commit_sha);
CREATE INDEX idx_build_event_timestamp ON build_contexts(event_name, timestamp);
```

**Columns**:

| Column       | Type     | Nullable | Default        | Constraints   | Description               |
| ------------ | -------- | -------- | -------------- | ------------- | ------------------------- |
| `id`         | INTEGER  | No       | Auto-increment | PRIMARY KEY   | Internal identifier       |
| `commit_sha` | TEXT     | No       | -              | 40-char hex   | Git commit SHA            |
| `branch`     | TEXT     | No       | -              | Max 255 chars | Git branch name           |
| `run_id`     | TEXT     | No       | -              | Max 64 chars  | GitHub Actions run ID     |
| `run_number` | INTEGER  | No       | -              | Positive      | GitHub Actions run number |
| `event_name` | TEXT     | Yes      | NULL           | Max 32 chars  | GitHub event type         |
| `timestamp`  | DATETIME | No       | -              | ISO 8601      | Build start time          |

**Indexes**:

- `idx_build_timestamp`: Fast time-range queries
- `idx_build_branch`: Fast branch filtering
- `idx_build_commit`: Fast commit lookup
- `idx_build_event_timestamp`: Optimizes `WHERE event_name = 'push' ORDER BY timestamp` queries

**Constraints**:

- (`commit_sha`, `run_id`) must be unique together

---

### Table: `metric_values`

Stores individual metric measurements.

```sql
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

CREATE INDEX idx_metric_value_build ON metric_values(build_id);
```

**Columns**:

| Column          | Type    | Nullable | Default        | Constraints                   | Description               |
| --------------- | ------- | -------- | -------------- | ----------------------------- | ------------------------- |
| `id`            | INTEGER | No       | Auto-increment | PRIMARY KEY                   | Internal identifier       |
| `metric_id`     | TEXT    | No       | -              | FK to metric_definitions      | Which metric (string key) |
| `build_id`      | INTEGER | No       | -              | FK to build_contexts          | Which build               |
| `value_numeric` | REAL    | Yes      | NULL           | Mutually exclusive with label | Numeric value             |
| `value_label`   | TEXT    | Yes      | NULL           | Max 256 chars, exclusive      | Text value                |

**Indexes**:

- `idx_metric_value_build`: All metrics for a build

**Constraints**:

- Exactly one of `value_numeric` or `value_label` must be non-NULL
- (`metric_id`, `build_id`) must be unique together
- Foreign keys enforce referential integrity

## SQLite Connection Configuration

### Connection Settings

```typescript
const db = new Database(dbPath, {
  readonly: false,
  fileMustExist: false,
  timeout: 5000,
});
```

### PRAGMA Configuration

```sql
PRAGMA journal_mode = DELETE;       -- Single-file storage (no WAL files to manage)
PRAGMA synchronous = NORMAL;        -- Balance safety and performance
PRAGMA foreign_keys = ON;           -- Enforce foreign key constraints
PRAGMA busy_timeout = 5000;         -- 5 second timeout for locks
PRAGMA cache_size = -2000;          -- 2MB cache
PRAGMA temp_store = MEMORY;         -- Use memory for temp tables
```

**Rationale**:

- **DELETE mode**: Ensures all data is in a single `.db` file (WAL mode creates separate `-wal` and `-shm` files that would be lost when uploading artifacts or to S3)
- **NORMAL synchronous**: Acceptable risk for metrics data (not financial)
- **Foreign keys ON**: Data integrity
- **5s busy timeout**: Handles concurrent GitHub Actions writes
- **2MB cache**: Improves query performance for reports

## Migration Mechanism

Schema versions are tracked in the `schema_version` table. On initialization:

1. Check current schema version: `SELECT version FROM schema_version ORDER BY applied_at DESC LIMIT 1`
2. If no version exists, create all tables and insert current version
3. If version is behind, apply migrations sequentially
4. Each migration updates the `schema_version` table with the new version and description

Migration files are stored in a `migrations/` directory and applied in order.

## Common Query Patterns

**Insert new build context**:

```sql
INSERT INTO build_contexts (commit_sha, branch, run_id, run_number, event_name, timestamp)
VALUES (?, ?, ?, ?, ?, ?)
RETURNING id;
```

**Insert or update metric definition**:

```sql
INSERT INTO metric_definitions (id, type, unit, description)
VALUES (?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  unit = excluded.unit,
  description = excluded.description;
```

**Insert metric value**:

```sql
INSERT INTO metric_values (metric_id, build_id, value_numeric, value_label)
VALUES (?, ?, ?, ?)
ON CONFLICT(metric_id, build_id) DO UPDATE SET
  value_numeric = excluded.value_numeric,
  value_label = excluded.value_label;
```

**Get time-series data for report**:

```sql
SELECT md.id as metric_name, md.type, md.unit, md.description,
       mv.value_numeric, mv.value_label,
       bc.commit_sha, bc.branch, bc.timestamp as build_timestamp
FROM metric_values mv
INNER JOIN metric_definitions md ON mv.metric_id = md.id
INNER JOIN build_contexts bc ON mv.build_id = bc.id
WHERE md.id = ? AND bc.event_name = 'push'
ORDER BY bc.timestamp ASC;
```

## Transaction Patterns

### Metric Collection (Write)

```sql
BEGIN IMMEDIATE;
INSERT INTO build_contexts (...) VALUES (...) RETURNING id;
INSERT INTO metric_definitions (...) VALUES (...) ON CONFLICT(id) DO UPDATE ...;
INSERT INTO metric_values (...) VALUES (...);
COMMIT;
```

**Isolation**: `IMMEDIATE` transaction acquires write lock immediately, preventing concurrent writes during collection.

**Rollback Strategy**: If any metric fails, continue with remaining metrics (partial commit). Each metric value insert is independent.

### Report Generation (Read)

```sql
BEGIN DEFERRED;
-- Multiple SELECT queries for report data
COMMIT;
```

**Isolation**: `DEFERRED` allows concurrent reads and does not block writers.

## Concurrency Handling

### Write Conflicts

Two GitHub Actions jobs writing simultaneously:

1. Both jobs download latest database
2. Job A starts transaction (IMMEDIATE)
3. Job B waits (busy_timeout = 5000ms)
4. Job A commits and uploads
5. Job B acquires lock and commits
6. Job B uploads (overwrites Job A's upload)

Both jobs' data is preserved because different builds produce non-overlapping data.

### Read Conflicts

Report generation while collection is running: No conflict in practice (GitHub Actions runs are sequential per branch). Reader sees consistent snapshot.

## Data Integrity

- `metric_values.metric_id` must exist in `metric_definitions.id` (foreign key)
- `metric_values.build_id` must exist in `build_contexts.id` (foreign key)
- Exactly one of `value_numeric` or `value_label` must be non-NULL (check constraint)
- (`metric_id`, `build_id`) must be unique (unique constraint)

## Performance

### Expected Data Volume (1 year)

| Entity             | Count   | Size per Row | Total Size |
| ------------------ | ------- | ------------ | ---------- |
| metric_definitions | 20      | 80 bytes     | 1.6 KB     |
| build_contexts     | 5,000   | 150 bytes    | 750 KB     |
| metric_values      | 100,000 | 40 bytes     | 4 MB       |
| **Total**          | -       | -            | **~5 MB**  |

### Query Performance

| Query               | Complexity   | Expected Time |
| ------------------- | ------------ | ------------- |
| Insert build        | O(1)         | <1ms          |
| Insert metric value | O(1)         | <1ms          |
| Time range query    | O(log n + k) | <10ms         |
| Latest values       | O(n)         | <50ms         |
| Report generation   | O(n)         | <100ms        |

## Integrity Checking

```sql
PRAGMA integrity_check;
```

Recovery from corruption: Download previous artifact/upload version, or initialize empty database with a warning about data loss.
