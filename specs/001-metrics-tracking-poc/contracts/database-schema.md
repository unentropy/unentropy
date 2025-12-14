# Database Schema Contract

**Feature**: 001-metrics-tracking-poc  
**Database**: SQLite 3.x  
**Schema Version**: 2.0.0  
**Last Updated**: Sat Dec 07 2025

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
VALUES ('2.0.0', 'Clean schema with string metric IDs');
```

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

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | TEXT | No | - | PRIMARY KEY, matches `^[a-z0-9-]+$` | Metric key from config |
| `type` | TEXT | No | - | CHECK: 'numeric' or 'label' | Metric type |
| `unit` | TEXT | Yes | NULL | enum: percent, integer, bytes, duration, decimal | Display unit |
| `description` | TEXT | Yes | NULL | Max 256 chars | Human description |

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

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | INTEGER | No | Auto-increment | PRIMARY KEY | Internal identifier |
| `commit_sha` | TEXT | No | - | 40-char hex | Git commit SHA |
| `branch` | TEXT | No | - | Max 255 chars | Git branch name |
| `run_id` | TEXT | No | - | Max 64 chars | GitHub Actions run ID |
| `run_number` | INTEGER | No | - | Positive | GitHub Actions run number |
| `event_name` | TEXT | Yes | NULL | Max 32 chars | GitHub event type |
| `timestamp` | DATETIME | No | - | ISO 8601 | Build start time |

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

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | INTEGER | No | Auto-increment | PRIMARY KEY | Internal identifier |
| `metric_id` | TEXT | No | - | FK to metric_definitions | Which metric (string key) |
| `build_id` | INTEGER | No | - | FK to build_contexts | Which build |
| `value_numeric` | REAL | Yes | NULL | Mutually exclusive with label | Numeric value |
| `value_label` | TEXT | Yes | NULL | Max 256 chars, exclusive | Text value |

**Indexes**:
- `idx_metric_value_build`: All metrics for a build

**Constraints**:
- Exactly one of `value_numeric` or `value_label` must be non-NULL
- (`metric_id`, `build_id`) must be unique together
- Foreign keys enforce referential integrity

---

## Drizzle Schema Definition

The database schema is defined in TypeScript using Drizzle ORM. This serves as the single source of truth for both runtime queries and migration management.

### Schema File: `src/storage/schema.ts`

```typescript
import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

// Schema version tracking (managed separately from Drizzle migrations)
export const schemaVersion = sqliteTable('schema_version', {
  version: text('version').primaryKey(),
  appliedAt: text('applied_at').notNull(),
  description: text('description'),
});

// Metric definitions
export const metricDefinitions = sqliteTable('metric_definitions', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['numeric', 'label'] }).notNull(),
  unit: text('unit'),
  description: text('description'),
});

// Build contexts
export const buildContexts = sqliteTable('build_contexts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  commitSha: text('commit_sha').notNull(),
  branch: text('branch').notNull(),
  runId: text('run_id').notNull(),
  runNumber: integer('run_number').notNull(),
  eventName: text('event_name'),
  timestamp: text('timestamp').notNull(),
}, (table) => [
  index('idx_build_timestamp').on(table.timestamp),
  index('idx_build_branch').on(table.branch),
  index('idx_build_commit').on(table.commitSha),
  index('idx_build_event_timestamp').on(table.eventName, table.timestamp),
  uniqueIndex('unique_commit_run').on(table.commitSha, table.runId),
]);

// Metric values
export const metricValues = sqliteTable('metric_values', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  metricId: text('metric_id').notNull().references(() => metricDefinitions.id),
  buildId: integer('build_id').notNull().references(() => buildContexts.id),
  valueNumeric: real('value_numeric'),
  valueLabel: text('value_label'),
}, (table) => [
  uniqueIndex('unique_metric_build').on(table.metricId, table.buildId),
  index('idx_metric_value_build').on(table.buildId),
]);
```

### Type Inference

Drizzle automatically infers TypeScript types from the schema:

```typescript
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { metricDefinitions, buildContexts, metricValues } from './schema';

// Select types (for query results)
type MetricDefinition = InferSelectModel<typeof metricDefinitions>;
type BuildContext = InferSelectModel<typeof buildContexts>;
type MetricValue = InferSelectModel<typeof metricValues>;

// Insert types (for write operations)
type InsertMetricDefinition = InferInsertModel<typeof metricDefinitions>;
type InsertBuildContext = InferInsertModel<typeof buildContexts>;
type InsertMetricValue = InferInsertModel<typeof metricValues>;
```

### Schema Compatibility

The Drizzle schema produces identical SQL to the existing raw SQL schema. This ensures:
- Existing SQLite databases remain compatible
- No migration required for existing installations
- Schema can be verified with `drizzle-kit pull` to compare

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

---

## Query Patterns

### Common Queries (Drizzle ORM)

**Insert new build context**:
```typescript
const [{ id }] = await db.insert(buildContexts)
  .values({ commitSha, branch, runId, runNumber, eventName, timestamp })
  .returning({ id: buildContexts.id });
```

**Insert or update metric definition**:
```typescript
await db.insert(metricDefinitions)
  .values({ id, type, unit, description })
  .onConflictDoUpdate({
    target: metricDefinitions.id,
    set: { unit: sql`excluded.unit`, description: sql`excluded.description` }
  });
```

**Insert metric value**:
```typescript
await db.insert(metricValues)
  .values({ metricId, buildId, valueNumeric, valueLabel })
  .onConflictDoUpdate({
    target: [metricValues.metricId, metricValues.buildId],
    set: { valueNumeric: sql`excluded.value_numeric`, valueLabel: sql`excluded.value_label` }
  });
```

**Get time-series data for report**:
```typescript
const results = await db.select({
  metricName: metricDefinitions.id,
  type: metricDefinitions.type,
  unit: metricDefinitions.unit,
  description: metricDefinitions.description,
  valueNumeric: metricValues.valueNumeric,
  valueLabel: metricValues.valueLabel,
  commitSha: buildContexts.commitSha,
  branch: buildContexts.branch,
  buildTimestamp: buildContexts.timestamp,
})
.from(metricValues)
.innerJoin(metricDefinitions, eq(metricValues.metricId, metricDefinitions.id))
.innerJoin(buildContexts, eq(metricValues.buildId, buildContexts.id))
.where(and(
  eq(metricDefinitions.id, metricId),
  eq(buildContexts.eventName, 'push')
))
.orderBy(asc(buildContexts.timestamp));
```

**Get baseline metric value**:
```typescript
const result = await db.select({ valueNumeric: metricValues.valueNumeric })
  .from(metricValues)
  .innerJoin(metricDefinitions, eq(metricValues.metricId, metricDefinitions.id))
  .innerJoin(buildContexts, eq(metricValues.buildId, buildContexts.id))
  .where(and(
    eq(metricDefinitions.id, metricId),
    eq(buildContexts.branch, referenceBranch),
    eq(buildContexts.eventName, 'push'),
    gte(buildContexts.timestamp, sql`datetime('now', '-' || ${maxAgeDays} || ' days')`),
    isNotNull(metricValues.valueNumeric)
  ))
  .orderBy(desc(buildContexts.timestamp))
  .limit(1);
```

### Raw SQL Equivalents (for reference)

**Insert new build context**:
```sql
INSERT INTO build_contexts (
  commit_sha, branch, run_id, run_number, event_name, timestamp
) VALUES (?, ?, ?, ?, ?, ?)
RETURNING id;
```

**Insert or update metric definition**:
```sql
INSERT INTO metric_definitions (id, type, unit, description)
VALUES (?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  unit = excluded.unit,
  description = excluded.description
RETURNING id, type, unit, description;
```

**Insert metric value**:
```sql
INSERT INTO metric_values (
  metric_id, build_id, value_numeric, value_label
) VALUES (?, ?, ?, ?)
ON CONFLICT(metric_id, build_id) DO UPDATE SET
  value_numeric = excluded.value_numeric,
  value_label = excluded.value_label
RETURNING id;
```

**Get time-series data for report**:
```sql
SELECT 
  md.id as metric_name,
  md.type,
  md.unit,
  md.description,
  mv.value_numeric,
  mv.value_label,
  bc.commit_sha,
  bc.branch,
  bc.timestamp as build_timestamp
FROM metric_values mv
INNER JOIN metric_definitions md ON mv.metric_id = md.id
INNER JOIN build_contexts bc ON mv.build_id = bc.id
WHERE md.id = ? AND bc.event_name = 'push'
ORDER BY bc.timestamp ASC;
```

**Get baseline metric value**:
```sql
SELECT mv.value_numeric
FROM metric_values mv
JOIN metric_definitions md ON mv.metric_id = md.id
JOIN build_contexts bc ON mv.build_id = bc.id
WHERE md.id = ? 
  AND bc.branch = ?
  AND bc.event_name = 'push'
  AND bc.timestamp >= datetime('now', '-' || ? || ' days')
  AND mv.value_numeric IS NOT NULL
ORDER BY bc.timestamp DESC
LIMIT 1;
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
  ON CONFLICT(id) DO UPDATE ... RETURNING id;

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

**Metric ID format**:
```sql
CHECK(id GLOB '[a-z0-9-]*')
```

**Value exclusivity**:
```sql
CHECK(
  (value_numeric IS NOT NULL AND value_label IS NULL) OR
  (value_numeric IS NULL AND value_label IS NOT NULL)
)
```

### Unique Constraints

**Metric IDs** (primary key):
```sql
PRIMARY KEY (id)  -- in metric_definitions
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

## Performance Characteristics

### Expected Data Volume

| Entity | Count (1 year) | Size per Row | Total Size |
|--------|----------------|--------------|------------|
| metric_definitions | 20 | 80 bytes | 1.6 KB |
| build_contexts | 5,000 | 150 bytes | 750 KB |
| metric_values | 100,000 | 40 bytes | 4 MB |
| **Total** | - | - | **~5 MB** |

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
```

---

## Testing Contracts

### Unit Test Requirements

1. Schema creation is idempotent
2. Foreign key constraints are enforced
3. Check constraints prevent invalid data
4. Unique constraints prevent duplicates
5. Indexes exist and are used by queries
6. Metric ID uses TEXT primary key

### Integration Test Requirements

1. Concurrent writes don't corrupt database
2. WAL mode enables concurrent reads
3. Transactions rollback on error
4. Backup/restore preserves data integrity
