# Database Schema Contract

**Feature**: 001-metrics-tracking-poc  
**Database**: SQLite 3.x  
**Schema Version**: 1.0.0  
**Last Updated**: Thu Oct 16 2025

## Overview

This document defines the SQLite database schema for the Unentropy metrics tracking system. This contract ensures data consistency, query performance, and supports concurrent access patterns.

## Schema Version Management

### Version Tracking Table

```sql
CREATE TABLE IF NOT EXISTS schema_version (
  version TEXT PRIMARY KEY,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);

INSERT INTO schema_version (version, description) 
VALUES ('1.0.0', 'Initial MVP schema');
```

## Core Tables

### Table: `metric_definitions`

Stores metric metadata and configuration.

```sql
CREATE TABLE IF NOT EXISTS metric_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK(type IN ('numeric', 'label')),
  unit TEXT,
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_metric_name ON metric_definitions(name);
```

**Columns**:

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | INTEGER | No | Auto-increment | PRIMARY KEY | Internal identifier |
| `name` | TEXT | No | - | UNIQUE, matches `^[a-z0-9-]+$` | Metric name from config |
| `type` | TEXT | No | - | CHECK: 'numeric' or 'label' | Metric type |
| `unit` | TEXT | Yes | NULL | Max 10 chars | Display unit |
| `description` | TEXT | Yes | NULL | Max 256 chars | Human description |
| `created_at` | DATETIME | No | CURRENT_TIMESTAMP | - | First seen timestamp |

**Indexes**:
- `idx_metric_name` (UNIQUE): Fast lookup by name

**Constraints**:
- `name` must be unique
- `type` must be 'numeric' or 'label'

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
  actor TEXT,
  event_name TEXT,
  timestamp DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(commit_sha, run_id)
);

CREATE INDEX idx_build_timestamp ON build_contexts(timestamp);
CREATE INDEX idx_build_branch ON build_contexts(branch);
CREATE INDEX idx_build_commit ON build_contexts(commit_sha);
```

**Columns**:

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | INTEGER | No | Auto-increment | PRIMARY KEY | Internal identifier |
| `commit_sha` | TEXT | No | - | 40-char hex | Git commit SHA |
| `branch` | TEXT | No | - | Max 255 chars | Git branch name |
| `run_id` | TEXT | No | - | Max 64 chars | GitHub Actions run ID |
| `run_number` | INTEGER | No | - | Positive | GitHub Actions run number |
| `actor` | TEXT | Yes | NULL | Max 64 chars | User/bot who triggered |
| `event_name` | TEXT | Yes | NULL | Max 32 chars | GitHub event type |
| `timestamp` | DATETIME | No | - | ISO 8601 | Build start time |
| `created_at` | DATETIME | No | CURRENT_TIMESTAMP | - | Record creation time |

**Indexes**:
- `idx_build_timestamp`: Fast time-range queries
- `idx_build_branch`: Fast branch filtering
- `idx_build_commit`: Fast commit lookup

**Constraints**:
- (`commit_sha`, `run_id`) must be unique together

---

### Table: `metric_values`

Stores individual metric measurements.

```sql
CREATE TABLE IF NOT EXISTS metric_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_id INTEGER NOT NULL,
  build_id INTEGER NOT NULL,
  value_numeric REAL,
  value_label TEXT,
  collected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  collection_duration_ms INTEGER,
  FOREIGN KEY (metric_id) REFERENCES metric_definitions(id),
  FOREIGN KEY (build_id) REFERENCES build_contexts(id),
  UNIQUE(metric_id, build_id),
  CHECK(
    (value_numeric IS NOT NULL AND value_label IS NULL) OR
    (value_numeric IS NULL AND value_label IS NOT NULL)
  )
);

CREATE INDEX idx_metric_value_metric_time ON metric_values(metric_id, collected_at);
CREATE INDEX idx_metric_value_build ON metric_values(build_id);
```

**Columns**:

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | INTEGER | No | Auto-increment | PRIMARY KEY | Internal identifier |
| `metric_id` | INTEGER | No | - | FK to metric_definitions | Which metric |
| `build_id` | INTEGER | No | - | FK to build_contexts | Which build |
| `value_numeric` | REAL | Yes | NULL | Mutually exclusive with label | Numeric value |
| `value_label` | TEXT | Yes | NULL | Max 256 chars, exclusive | Text value |
| `collected_at` | DATETIME | No | CURRENT_TIMESTAMP | ISO 8601 | Collection timestamp |
| `collection_duration_ms` | INTEGER | Yes | NULL | Positive | Command execution time |

**Indexes**:
- `idx_metric_value_metric_time`: Time-series queries per metric
- `idx_metric_value_build`: All metrics for a build

**Constraints**:
- Exactly one of `value_numeric` or `value_label` must be non-NULL
- (`metric_id`, `build_id`) must be unique together
- Foreign keys enforce referential integrity

---

## Database Configuration

### Connection Settings

```typescript
const db = new Database(dbPath, {
  readonly: false,
  fileMustExist: false,
  timeout: 5000,
  verbose: process.env.DEBUG ? console.log : undefined
});
```

### Provider-Level Pragma Settings

SQLite-specific PRAGMA configuration is handled by the `SqliteLocalStorageProvider`:

```sql
PRAGMA journal_mode = WAL;          -- Write-Ahead Logging for concurrency
PRAGMA synchronous = NORMAL;        -- Balance safety and performance
PRAGMA foreign_keys = ON;           -- Enforce foreign key constraints
PRAGMA busy_timeout = 5000;         -- 5 second timeout for locks
PRAGMA cache_size = -2000;          -- 2MB cache
PRAGMA temp_store = MEMORY;         -- Use memory for temp tables
```

**Rationale**:
- **WAL mode**: Enables concurrent reads during writes
- **NORMAL synchronous**: Acceptable risk for metrics data (not financial)
- **Foreign keys ON**: Data integrity
- **5s busy timeout**: Handles concurrent GitHub Actions writes
- **2MB cache**: Improves query performance for reports

**Note**: These PRAGMA statements are applied by the storage provider, not by the generic Storage class, ensuring proper separation of concerns between storage-specific configuration and generic storage operations.

---

## Query Patterns

### Common Queries

**Insert new build context**:
```sql
INSERT INTO build_contexts (
  commit_sha, branch, run_id, run_number, actor, event_name, timestamp
) VALUES (?, ?, ?, ?, ?, ?, ?)
RETURNING id;
```

**Insert or get metric definition**:
```sql
INSERT INTO metric_definitions (name, type, unit, description)
VALUES (?, ?, ?, ?)
ON CONFLICT(name) DO UPDATE SET
  unit = excluded.unit,
  description = excluded.description
RETURNING id, type;
```

**Insert metric value**:
```sql
INSERT INTO metric_values (
  metric_id, build_id, value_numeric, value_label, collected_at, collection_duration_ms
) VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT(metric_id, build_id) DO UPDATE SET
  value_numeric = excluded.value_numeric,
  value_label = excluded.value_label,
  collected_at = excluded.collected_at,
  collection_duration_ms = excluded.collection_duration_ms;
```

**Get time-series data for report**:
```sql
SELECT 
  md.name,
  md.type,
  md.unit,
  md.description,
  mv.value_numeric,
  mv.value_label,
  mv.collected_at,
  bc.commit_sha,
  bc.branch,
  bc.timestamp
FROM metric_values mv
INNER JOIN metric_definitions md ON mv.metric_id = md.id
INNER JOIN build_contexts bc ON mv.build_id = bc.id
WHERE bc.timestamp >= ? AND bc.timestamp <= ?
ORDER BY md.name, bc.timestamp ASC;
```

**Get latest value per metric**:
```sql
WITH latest_builds AS (
  SELECT id, timestamp
  FROM build_contexts
  ORDER BY timestamp DESC
  LIMIT 10
)
SELECT 
  md.name,
  md.type,
  md.unit,
  mv.value_numeric,
  mv.value_label,
  bc.timestamp
FROM metric_values mv
INNER JOIN metric_definitions md ON mv.metric_id = md.id
INNER JOIN latest_builds bc ON mv.build_id = bc.id
ORDER BY bc.timestamp DESC, md.name;
```

**Get metric statistics** (for numeric metrics):
```sql
SELECT 
  md.name,
  md.unit,
  COUNT(mv.value_numeric) as count,
  MIN(mv.value_numeric) as min,
  MAX(mv.value_numeric) as max,
  AVG(mv.value_numeric) as avg,
  SUM(mv.value_numeric) as sum
FROM metric_values mv
INNER JOIN metric_definitions md ON mv.metric_id = md.id
WHERE md.type = 'numeric' AND md.name = ?
GROUP BY md.id;
```

---

## Transaction Patterns

### Metric Collection Transaction

```sql
BEGIN IMMEDIATE;

-- Insert build context
INSERT INTO build_contexts (...) VALUES (...) RETURNING id;

-- For each metric:
INSERT INTO metric_definitions (...) VALUES (...)
  ON CONFLICT(name) DO UPDATE ... RETURNING id;

INSERT INTO metric_values (...) VALUES (...);

COMMIT;
```

**Isolation**: `IMMEDIATE` transaction acquires write lock immediately, preventing concurrent writes during collection.

**Rollback Strategy**: If any metric fails, continue with remaining metrics (partial commit). Each metric value insert is independent.

### Report Generation (Read-Only)

```sql
BEGIN DEFERRED;  -- Read-only transaction

-- Multiple SELECT queries for report data

COMMIT;
```

**Isolation**: `DEFERRED` allows concurrent reads and doesn't block writers.

---

## Concurrency Handling

### Write Conflicts

**Scenario**: Two GitHub Actions jobs write to database simultaneously

**Strategy**:
1. Both jobs download latest artifact
2. Job A starts transaction (IMMEDIATE)
3. Job B waits (busy_timeout = 5000ms)
4. Job A commits and uploads artifact
5. Job B acquires lock and commits
6. Job B uploads artifact (overwrites Job A's artifact)

**Result**: Both jobs' data is preserved in Job B's artifact because:
- Job A wrote build X + metrics
- Job B wrote build Y + metrics
- No overlap in data (different builds)

**Edge Case**: If Job A's artifact upload fails, Job B's artifact becomes the latest and Job A's data is lost. This is acceptable for metrics (not critical data).

### Read Conflicts

**Scenario**: Report generation while collection is running

**Result**: No conflict. WAL mode allows concurrent reads during writes. Reader sees consistent snapshot from before write started.

---

## Data Integrity

### Foreign Key Enforcement

```sql
PRAGMA foreign_keys = ON;
```

- `metric_values.metric_id` must exist in `metric_definitions.id`
- `metric_values.build_id` must exist in `build_contexts.id`
- Prevents orphaned metric values

### Check Constraints

**Metric type validation**:
```sql
CHECK(type IN ('numeric', 'label'))
```

**Value exclusivity**:
```sql
CHECK(
  (value_numeric IS NOT NULL AND value_label IS NULL) OR
  (value_numeric IS NULL AND value_label IS NOT NULL)
)
```

### Unique Constraints

**Metric names**:
```sql
UNIQUE(name)  -- in metric_definitions
```

**Build identity**:
```sql
UNIQUE(commit_sha, run_id)  -- in build_contexts
```

**One value per metric per build**:
```sql
UNIQUE(metric_id, build_id)  -- in metric_values
```

---

## Migration Strategy

### Version 1.0.0 → 1.1.0 (Example)

```sql
-- Check current version
SELECT version FROM schema_version ORDER BY applied_at DESC LIMIT 1;

-- Apply migration if needed
ALTER TABLE metric_definitions ADD COLUMN tags TEXT;

-- Update version
INSERT INTO schema_version (version, description)
VALUES ('1.1.0', 'Added tags support to metrics');
```

**Migration Rules**:
- All migrations must be idempotent (safe to run multiple times)
- Additive changes only (no column drops)
- Default values for new columns
- Backward compatible with old code reading new schema

---

## Performance Characteristics

### Expected Data Volume

| Entity | Count (1 year) | Size per Row | Total Size |
|--------|----------------|--------------|------------|
| metric_definitions | 20 | 100 bytes | 2 KB |
| build_contexts | 5,000 | 200 bytes | 1 MB |
| metric_values | 100,000 | 50 bytes | 5 MB |
| **Total** | - | - | **~6 MB** |

**Assumptions**:
- 20 metrics defined
- 100 builds per week × 52 weeks = 5,200 builds
- 20 metrics × 5,000 builds = 100,000 values

### Query Performance

| Query | Complexity | Expected Time | Notes |
|-------|------------|---------------|-------|
| Insert build | O(1) | <1ms | Single row insert |
| Insert metric value | O(1) | <1ms | Single row insert with FK lookup |
| Time range query | O(log n + k) | <10ms | Index seek + scan results |
| Latest values | O(n) | <50ms | Full scan acceptable for small data |
| Report generation | O(n) | <100ms | Full table scan, 100K rows |

### Index Usage

```sql
EXPLAIN QUERY PLAN
SELECT * FROM metric_values 
WHERE metric_id = 1 AND collected_at > '2025-01-01';
```

Expected plan:
```
SEARCH metric_values USING INDEX idx_metric_value_metric_time (metric_id=? AND collected_at>?)
```

---

## Backup and Recovery

### Backup Strategy

**Manual backup**:
```bash
sqlite3 metrics.db ".backup backup.db"
```

**Automatic backup**: GitHub Actions artifacts provide built-in versioning and retention.

### Recovery

**Corrupt database detection**:
```sql
PRAGMA integrity_check;
```

**Recovery steps**:
1. Download previous artifact version
2. If not available, initialize empty database
3. Log warning about data loss

---

## Schema Introspection

### Get schema version
```sql
SELECT version FROM schema_version ORDER BY applied_at DESC LIMIT 1;
```

### List all tables
```sql
SELECT name FROM sqlite_master WHERE type='table';
```

### Get table schema
```sql
PRAGMA table_info(metric_values);
```

### Get index information
```sql
PRAGMA index_list(metric_values);
PRAGMA index_info(idx_metric_value_metric_time);
```

---

## Testing Contracts

### Unit Test Requirements

1. Schema creation is idempotent
2. Foreign key constraints are enforced
3. Check constraints prevent invalid data
4. Unique constraints prevent duplicates
5. Indexes exist and are used by queries

### Integration Test Requirements

1. Concurrent writes don't corrupt database
2. WAL mode enables concurrent reads
3. Transactions rollback on error
4. Migrations apply successfully
5. Backup/restore preserves data integrity

---

## Backward Compatibility

**Schema v1.0.0** (MVP):
- All tables and columns defined above
- No breaking changes in future versions

**Future Versions**:
- New tables/columns added as optional
- Existing columns never removed or renamed
- Type changes avoided (new column + migration)
- Old code can read new schema (ignore new fields)
