# Data Model: Metrics Tracking PoC

**Feature**: 001-metrics-tracking-poc  
**Date**: Thu Oct 16 2025  
**Updated**: 2025-12-07  
**Status**: Implemented

## Overview

This document defines the data entities, their relationships, validation rules, and state transitions for the metrics tracking system. The model is designed to support efficient time-series queries, concurrent writes, and flexible metric definitions.

## Core Entities

### 1. Metric Definition

**Description**: Represents a user-defined metric that can be tracked over time.

**Attributes**:
- `id` (string, primary key): Metric identifier from config (e.g., "test-coverage", "bundle-size")
- `type` (enum, required): Either 'numeric' or 'label'
- `unit` (string, optional): Display unit for numeric metrics (percent, integer, bytes, duration, decimal)
- `description` (string, optional): Human-readable description of what this metric measures

**Validation Rules**:
- `id`: Must match pattern `^[a-z0-9-]+$` (lowercase alphanumeric with hyphens)
- `id`: Length 1-64 characters
- `type`: Must be either 'numeric' or 'label'
- `unit`: Must be one of: percent, integer, bytes, duration, decimal
- `description`: Max 256 characters if provided

**Uniqueness Constraints**:
- `id` is the primary key (unique by definition)

**Relationships**:
- Has many `MetricValue` records (one-to-many)

**Lifecycle**:
- Created when first referenced in a metric collection run
- Immutable once created (type cannot change)
- No deletion in MVP (historical data preservation)

---

### 2. Build Context

**Description**: Represents a single CI/CD pipeline execution with associated metadata.

**Attributes**:
- `id` (integer, primary key): Auto-generated unique identifier
- `commit_sha` (string, required): Git commit SHA (40 characters)
- `branch` (string, required): Git branch name
- `run_id` (string, required): GitHub Actions run ID
- `run_number` (integer, required): GitHub Actions run number
- `event_name` (string, optional): GitHub event type (push, pull_request, schedule, etc.)
- `timestamp` (datetime, required): When the build started

**Validation Rules**:
- `commit_sha`: Must be 40-character hexadecimal string
- `branch`: Max 255 characters
- `run_id`: Max 64 characters
- `run_number`: Positive integer
- `event_name`: Max 32 characters if provided

**Uniqueness Constraints**:
- (`commit_sha`, `run_id`) combination must be unique (same commit can have multiple runs in rare cases, but run_id is always unique)

**Relationships**:
- Has many `MetricValue` records (one-to-many)

**Lifecycle**:
- Created at the start of each metric collection run
- Immutable once created
- Used for filtering and grouping in reports

---

### 3. Metric Value

**Description**: Represents a single measurement of a metric for a specific build.

**Attributes**:
- `id` (integer, primary key): Auto-generated unique identifier
- `metric_id` (string, foreign key, required): References `MetricDefinition.id`
- `build_id` (integer, foreign key, required): References `BuildContext.id`
- `value_numeric` (float, optional): Numeric value (populated when metric type is 'numeric')
- `value_label` (string, optional): Text value (populated when metric type is 'label')

**Validation Rules**:
- Exactly one of `value_numeric` or `value_label` must be populated (based on metric type)
- `value_numeric`: Any valid float (including negative, zero, infinity)
- `value_label`: Max 256 characters

**Uniqueness Constraints**:
- (`metric_id`, `build_id`) combination must be unique (one value per metric per build)

**Relationships**:
- Belongs to one `MetricDefinition` (many-to-one)
- Belongs to one `BuildContext` (many-to-one)

**Lifecycle**:
- Created during metric collection for each successful measurement
- Immutable once created
- Used for time-series analysis and reporting

---

## Entity Relationships

```
MetricDefinition (1) ──────< (N) MetricValue
                                      │
                                      │
BuildContext (1) ──────────────< (N) MetricValue
```

**Relationship Rules**:
1. Each `MetricValue` must reference exactly one `MetricDefinition`
2. Each `MetricValue` must reference exactly one `BuildContext`
3. A `MetricDefinition` can have zero or many `MetricValue` records
4. A `BuildContext` can have zero or many `MetricValue` records
5. Cascade behavior: No cascading deletes in MVP (preserve historical data)

---

## Configuration Entity (Not Persisted)

### Unentropy Configuration

**Description**: User-defined configuration from `unentropy.json`. This is NOT stored in the database but validated at runtime.

**Structure**:
```typescript
{
  metrics: Record<string, MetricConfig>
}

MetricConfig {
  name?: string,             // Optional display name (defaults to key)
  type: 'numeric' | 'label', // Maps to MetricDefinition.type
  description?: string,      // Maps to MetricDefinition.description
  command: string,           // Shell command to execute (not stored)
  unit?: string              // Maps to MetricDefinition.unit
}
```

**Note**: The object key serves as the metric identifier and maps directly to `MetricDefinition.id` in the database.

**Validation Rules** (enforced by Zod schema):
- `metrics`: Object with at least 1 property, max 50 properties
- Object keys: Must match pattern `^[a-z0-9-]+$`, length 1-64 characters
- `metrics[key].type`: Must be 'numeric' or 'label'
- `metrics[key].command`: Non-empty string, max 1024 characters
- `metrics[key].unit`: Must be one of: percent, integer, bytes, duration, decimal
- `metrics[key].description`: Max 256 characters if provided
- `metrics[key].name`: Max 256 characters if provided (optional display name)

---

## Storage Architecture (Three-Layer Separation)

### Overview

The storage layer implements a **three-layer architecture** to separate concerns:

1. **StorageProvider**: Manages database lifecycle and storage location (WHERE to store)
2. **DatabaseAdapter**: Abstracts query execution engine (WHAT queries to run)
3. **MetricsRepository**: Provides domain-specific operations (WHY - business logic)
4. **Storage**: Orchestrates all three layers

This separation enables future extensibility for different database engines (PostgreSQL) and storage backends (S3, GitHub Artifacts) while keeping business logic clean and testable.

### Architecture Diagram (with Drizzle ORM)

```
┌──────────────────────────────────────────────────────────────┐
│ Application Code (Actions, Collectors, Reporters)           │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ uses
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ Storage (Orchestrator)                                       │
│ - coordinates provider, drizzle, repository                  │
│ - initialize(), close(), transaction()                       │
└──┬───────────────────┬─────────────────────────┬────────────┘
   │                   │                         │
   │ manages           │ creates                 │ provides
   │                   │                         │
   ▼                   ▼                         ▼
┌─────────────┐  ┌──────────────────┐  ┌─────────────────────┐
│ Provider    │  │ Drizzle ORM      │  │ Repository          │
│             │  │ (bun-sqlite)     │  │                     │
│ WHERE       │  │                  │  │ WHY                 │
│ (location)  │  │ Type-safe        │  │ (domain ops)        │
│             │  │ queries          │  │                     │
└──────┬──────┘  └──────┬───────────┘  └──────┬──────────────┘
       │                │                      │
       │ returns        │                      │ uses drizzle
       │ Database       │                      │
       ▼                ▼                      │
┌─────────────────────────────────────────────────────────────┐
│ bun:sqlite Database                                         │
│ - Native SQLite driver                                      │
│ - Passed to drizzle({ client: db })                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ StorageProvider Interface                                   │
│ + initialize(): Promise<Database>                           │
│ + persist(): Promise<void>                                  │
│ + cleanup(): void                                           │
└──┬──────────────────────────────────────────────────────────┘
   │
   │ implementations
   ▼
   ├─> SqliteLocalStorageProvider (local file)
   ├─> SqliteS3StorageProvider (S3-compatible storage)
   └─> PostgresStorageProvider (future: remote database)

┌─────────────────────────────────────────────────────────────┐
│ MetricsRepository                                           │
│ + recordBuild(buildContext, metrics)                        │
│ + getMetricComparison(name, baseCommit, currentCommit)      │
│ + getMetricHistory(name, options)                           │
│ + getMetricTimeSeries(metricName)                           │
└─────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

#### 1. StorageProvider (WHERE)

Manages database lifecycle and storage location.

```typescript
interface StorageProvider {
  initialize(): Promise<Database>;  // Open/download database
  persist(): Promise<void>;         // Save/upload database if needed
  cleanup(): void;                  // Close connections, clean temp files
  readonly isInitialized: boolean;
}

interface StorageProviderConfig {
  type: 'sqlite-local' | 'sqlite-s3' | 'postgres';
  
  // For SQLite local storage
  path?: string;
  
  // For SQLite S3 storage
  s3Bucket?: string;
  s3Key?: string;
  s3Region?: string;
  s3Endpoint?: string;
  
  // For PostgreSQL (future)
  connectionString?: string;
  
  // Common options
  readonly?: boolean;
  verbose?: boolean;
}
```

**Current Implementations**:
- `SqliteLocalStorageProvider`: Opens database file on local filesystem
- `SqliteS3StorageProvider`: Downloads from S3 on init, uploads on persist

**Future Implementations**:
- `PostgresStorageProvider`: Connects to remote PostgreSQL database

#### 2. Drizzle ORM (Query Layer)

Provides type-safe database queries using Drizzle ORM's SQLite dialect.

**Schema Definition** (`src/storage/schema.ts`):

```typescript
import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const metricDefinitions = sqliteTable('metric_definitions', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['numeric', 'label'] }).notNull(),
  unit: text('unit'),
  description: text('description'),
});

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

**Query Examples**:

```typescript
// Insert build context
const [inserted] = await db.insert(buildContexts)
  .values({ commitSha, branch, runId, runNumber, eventName, timestamp })
  .returning({ id: buildContexts.id });

// Upsert metric definition
await db.insert(metricDefinitions)
  .values({ id, type, unit, description })
  .onConflictDoUpdate({
    target: metricDefinitions.id,
    set: { unit, description }
  });

// Get time series with joins
const results = await db.select({
  ...metricValues,
  metricName: metricDefinitions.id,
  commitSha: buildContexts.commitSha,
  branch: buildContexts.branch,
  runNumber: buildContexts.runNumber,
  timestamp: buildContexts.timestamp,
})
.from(metricValues)
.innerJoin(metricDefinitions, eq(metricValues.metricId, metricDefinitions.id))
.innerJoin(buildContexts, eq(metricValues.buildId, buildContexts.id))
.where(and(
  eq(metricDefinitions.id, metricName),
  eq(buildContexts.eventName, 'push')
))
.orderBy(asc(buildContexts.timestamp));
```

**Benefits**:
- Type-safe queries with TypeScript inference
- Schema as single source of truth
- SQL-like API familiar to developers
- Future PostgreSQL support via dialect change

#### 3. MetricsRepository (WHY)

Provides domain-specific operations using Drizzle for data access.

```typescript
import { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';

class MetricsRepository {
  constructor(private db: BunSQLiteDatabase<typeof schema>) {}
  
  async recordBuild(buildContext: InsertBuildContext, metrics: MetricInput[]): Promise<number> {
    const [{ id: buildId }] = await this.db.insert(schema.buildContexts)
      .values(buildContext)
      .returning({ id: schema.buildContexts.id });
    
    for (const metric of metrics) {
      await this.db.insert(schema.metricDefinitions)
        .values(metric.definition)
        .onConflictDoUpdate({
          target: schema.metricDefinitions.id,
          set: { unit: metric.definition.unit, description: metric.definition.description }
        });
      
      await this.db.insert(schema.metricValues)
        .values({
          metricId: metric.definition.id,
          buildId,
          valueNumeric: metric.value_numeric,
          valueLabel: metric.value_label,
        });
    }
    
    return buildId;
  }
  
  // ... other methods using Drizzle queries
}
```

**Benefits**:
- Clean API for application code
- No raw SQL knowledge required for users of repository
- Easy to mock for testing
- Type-safe query results

#### 4. Storage (Orchestrator)

Coordinates all three layers.

```typescript
class Storage {
  private provider: StorageProvider;
  private adapter: DatabaseAdapter;
  private repository: MetricsRepository;
  
  async initialize(): Promise<void> {
    this.provider = await createStorageProvider(config);
    const db = await this.provider.initialize();
    this.adapter = new SqliteDatabaseAdapter(db);
    this.repository = new MetricsRepository(this.adapter);
    await initializeSchema(db);
  }
  
  getRepository(): MetricsRepository {
    return this.repository;
  }
  
  async close(): Promise<void> {
    await this.provider.persist();
    this.provider.cleanup();
  }
}
```

### Usage Example

```typescript
// Initialize storage
const storage = new Storage({
  type: 'sqlite-local',
  path: './metrics.db'
});
await storage.initialize();

// Get repository for domain operations
const repo = storage.getRepository();

// Record a build with metrics
const buildId = await repo.recordBuild(buildContext, [
  { definition: { id: 'test-coverage', type: 'numeric', unit: 'percent' }, value_numeric: 85.5 },
  { definition: { id: 'build-status', type: 'label' }, value_label: 'success' }
]);

// Query metric history
const timeSeries = repo.getMetricTimeSeries('test-coverage');

// Clean up
await storage.close();
```

**Key Design Decisions**:
- Two-layer separation with Drizzle ORM: Provider (WHERE) and Repository (WHY)
- Provider manages database lifecycle and location
- Drizzle ORM provides type-safe queries, replacing raw SQL adapters
- Repository provides clean domain API using Drizzle
- Storage orchestrates provider + Drizzle + repository
- Metric IDs are strings matching the config key
- Schema defined in TypeScript, queries are type-checked at compile time

---

## State Transitions

### Metric Collection Workflow

```
1. Load Configuration
   └─> Validate schema (fail fast on error)
   
2. Initialize Storage Provider
   └─> Create StorageProvider based on config
   └─> Initialize database connection
   └─> Create tables if not exist (migration)
   └─> Enable WAL mode
   
3. Create Build Context
   └─> Insert BuildContext record
   └─> Capture git metadata (commit, branch, etc.)
   
4. For each metric in configuration:
   ├─> Upsert MetricDefinition (create or update)
   │
   ├─> Execute collection command
   │   ├─> Success: Parse output
   │   └─> Failure: Log error, continue to next metric
   │
   └─> If successful:
       └─> Insert MetricValue with parsed value
       
5. Finalize
   └─> Persist storage (upload to S3 if applicable)
   └─> Close database connection
   └─> Cleanup resources
```

### Report Generation Workflow

```
1. Initialize Storage Provider
   └─> Download database from S3 if applicable
   └─> Open database
   
2. Query Data
   ├─> Load all MetricDefinitions
   ├─> Load BuildContexts (filtered by event_name = 'push')
   └─> Load MetricValues for selected builds
   
3. Transform Data
   ├─> Group values by metric
   ├─> Sort by timestamp
   └─> Format for Chart.js
   
4. Generate HTML
   ├─> Render template with embedded data
   ├─> Include Chart.js from CDN
   └─> Write to output file
   
5. Finalize
   └─> Close database connection
   └─> Cleanup resources
```

---

## Database Schema (SQLite v2.0.0)

### Table: `metric_definitions`

```sql
CREATE TABLE metric_definitions (
  id TEXT PRIMARY KEY CHECK(id GLOB '[a-z0-9-]*'),
  type TEXT NOT NULL CHECK(type IN ('numeric', 'label')),
  unit TEXT,
  description TEXT
);
```

### Table: `build_contexts`

```sql
CREATE TABLE build_contexts (
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

### Table: `metric_values`

```sql
CREATE TABLE metric_values (
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

---

## Concurrency Model

### Write Concurrency
- **WAL Mode**: Enabled for all database connections
- **Transaction Mode**: IMMEDIATE transactions for writes
- **Busy Timeout**: 5000ms
- **Retry Strategy**: 3 attempts with exponential backoff (100ms, 200ms, 400ms)

### Read Concurrency
- **Isolation Level**: Read Uncommitted (acceptable for metrics)
- **No Lock Contention**: WAL mode allows concurrent reads during writes

### S3 Storage Concurrency
When multiple concurrent jobs need to write to the database:
1. Download latest database from S3
2. Apply local writes (new build + metric values)
3. Upload updated database
4. Conflict resolution: last-write-wins

---

## Data Retention

**MVP Policy**: No automatic deletion

- All historical data is preserved
- Database size management is user responsibility

**Estimated Storage**:
- Metric definition: ~80 bytes
- Build context: ~150 bytes
- Metric value: ~40 bytes
- 1000 builds × 10 metrics = ~400KB (negligible)

---

## Error Handling

### Validation Errors
- **Config validation**: Fail fast with detailed error message
- **Type mismatch**: Error if numeric value provided for label metric (and vice versa)
- **Foreign key violations**: Should never occur (defensive programming)

### Collection Errors
- **Command execution failure**: Log error, skip metric, continue with others
- **Parse error**: Log warning, skip metric value
- **Database lock**: Retry with backoff, fail after 3 attempts

### Report Generation Errors
- **Missing data**: Generate report with available data, show warnings
- **Invalid data**: Skip invalid records, log warnings
- **Empty storage**: Generate report with "no data" message

---

## Migration Strategy

**Current Schema**: Version 2.0.0

**Migration History**:
- v2.0.0: Clean schema with string metric IDs, removed unused columns

**Migration Rules**:
- Handled via migration scripts in `src/storage/migrations.ts`
- Version tracking table: `schema_version`
- Apply migrations on storage initialization

---

## Query Patterns

### Common Queries (Drizzle ORM)

**Get time-series data for a metric**:
```typescript
const results = await db.select({
  id: schema.metricValues.id,
  metricId: schema.metricValues.metricId,
  buildId: schema.metricValues.buildId,
  valueNumeric: schema.metricValues.valueNumeric,
  valueLabel: schema.metricValues.valueLabel,
  metricName: schema.metricDefinitions.id,
  commitSha: schema.buildContexts.commitSha,
  branch: schema.buildContexts.branch,
  runNumber: schema.buildContexts.runNumber,
  timestamp: schema.buildContexts.timestamp,
})
.from(schema.metricValues)
.innerJoin(schema.metricDefinitions, eq(schema.metricValues.metricId, schema.metricDefinitions.id))
.innerJoin(schema.buildContexts, eq(schema.metricValues.buildId, schema.buildContexts.id))
.where(and(
  eq(schema.metricDefinitions.id, metricName),
  eq(schema.buildContexts.eventName, 'push')
))
.orderBy(asc(schema.buildContexts.timestamp));
```

**Get baseline metric value**:
```typescript
const result = await db.select({ valueNumeric: schema.metricValues.valueNumeric })
  .from(schema.metricValues)
  .innerJoin(schema.metricDefinitions, eq(schema.metricValues.metricId, schema.metricDefinitions.id))
  .innerJoin(schema.buildContexts, eq(schema.metricValues.buildId, schema.buildContexts.id))
  .where(and(
    eq(schema.metricDefinitions.id, metricId),
    eq(schema.buildContexts.branch, referenceBranch),
    eq(schema.buildContexts.eventName, 'push'),
    gte(schema.buildContexts.timestamp, sql`datetime('now', '-' || ${maxAgeDays} || ' days')`),
    isNotNull(schema.metricValues.valueNumeric)
  ))
  .orderBy(desc(schema.buildContexts.timestamp))
  .limit(1);
```

### Raw SQL Equivalents (for reference)

**Get time-series data for a metric**:
```sql
SELECT 
  mv.*,
  md.id as metric_name,
  bc.commit_sha,
  bc.branch,
  bc.run_number,
  bc.timestamp as build_timestamp
FROM metric_values mv
JOIN metric_definitions md ON mv.metric_id = md.id
JOIN build_contexts bc ON mv.build_id = bc.id
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

**Performance Characteristics**:
- Time range queries: O(log n) with timestamp index
- Metric lookup: O(1) with primary key
- Full scan for reports: O(n) acceptable for MVP scale (<1000 builds)
