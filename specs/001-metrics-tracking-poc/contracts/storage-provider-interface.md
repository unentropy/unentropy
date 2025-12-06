# Contract: Storage Provider Interface

**Feature**: 001-metrics-tracking-poc  
**Created**: Sat Nov 15 2025  
**Status**: Implemented

## Purpose

Defines the interface contract for storage providers that abstract where SQLite database files are stored and how they're accessed. This enables future extensibility for different storage backends (GitHub Artifacts, S3, etc.) while keeping the MVP simple with local file storage.

## Architecture Overview

### Class Dependency Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Action Layer                                   │
│                     (track-metrics.ts, etc.)                             │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    │ Uses
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            Storage                                       │
│                (Orchestrates provider + repository)                      │
└──────────────┬────────────────────────────────────────┬─────────────────┘
               │                                        │
               │ Manages                                │ Exposes
               ▼                                        ▼
┌──────────────────────────────┐          ┌───────────────────────────────┐
│   StorageProvider            │          │  MetricsRepository            │
│   (interface)                │          │  (domain operations)          │
│   + initialize()             │          │  + recordBuild()              │
│   + getDb()                  │          │  + getMetricComparison()      │
│   + persist()                │          └───────────┬───────────────────┘
│   + cleanup()                │                      │
│   + isInitialized()          │                      │ Uses
└───────────┬──────────────────┘                      ▼
            │                          ┌──────────────────────────────────┐
            │ implements               │  DatabaseAdapter                 │
            ▼                          │  (interface)                     │
┌───────────┴───────────┬──────────────┤  + insertBuildContext()         │
│                       │              │  + getMetricTimeSeries()         │
│                       │              │  + upsertMetricDefinition()      │
│                       │              └──────────────┬───────────────────┘
│                       │                             │
│                       │                             │ implements
▼                       ▼                             ▼
┌──────────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐
│ SqliteLocal  │  │  SqliteS3   │  │  Artifact    │  │  Postgres        │
│ Provider     │  │  Provider   │  │  Provider    │  │  Provider        │
│ (MVP)        │  │  (future)   │  │  (future)    │  │  (future)        │
└──────┬───────┘  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘
       │                 │                │                    │
       │ all return Database instance     │                    │
       └─────────────────┴────────────────┴────────────────────┘
                         │
                         ▼
       ┌──────────────────────────────────────┐
       │  Database (bun:sqlite)               │
       │  - query(), run(), exec()            │
       │  - transaction(), close()            │
       └─────────────────┬────────────────────┘
                         │
                         │ passed to adapter implementations
                         ▼
              ┌──────────┴───────────┐
              │                      │
              ▼                      ▼
   ┌──────────────────────┐  ┌─────────────────────────┐
   │ SqliteDatabaseAdapter│  │ PostgresDatabaseAdapter │
   │ (MVP)                │  │ (future)                │
   │ implements           │  │ implements              │
   │ DatabaseAdapter      │  │ DatabaseAdapter         │
   └──────────────────────┘  └─────────────────────────┘
```

**Key Design Principles:**

1. **Storage (Orchestration Layer)**: 
   - Coordinates provider initialization and repository creation
   - Manages the lifecycle: initialize provider → get database → create adapter → create repository
   - Public API for application code

2. **StorageProvider (Infrastructure Layer)**:
   - Abstract interface for **WHERE** the database is stored (local file, S3, artifact)
   - Manages database lifecycle: download/open → persist/upload → cleanup
   - Returns raw Database connection for use by adapters

3. **DatabaseAdapter (Query Layer)**:
   - Abstract interface for **WHAT** queries to execute
   - Handles database-specific SQL (SQLite queries vs Postgres queries)
   - Takes Database connection from provider, executes queries
   - Enables future multi-database support (SQLite, Postgres, etc.)

4. **MetricsRepository (Domain Layer)**:
   - High-level business operations (recordBuild, getMetricComparison)
   - Encapsulates domain logic and orchestrates adapter queries
   - Primary API for actions and business logic
   - Exposes adapter via `queries` accessor for advanced/test use

**Key Separation:**
- Provider knows **WHERE** (location/lifecycle) but not **WHAT** (queries)
- Adapter knows **WHAT** (queries) but not **WHERE** (location/lifecycle)
- Repository knows **WHY** (business operations) and uses adapter for data access

## Interface Definition

### StorageProvider Interface

```typescript
import type { Database } from "bun:sqlite";

interface StorageProvider {
  /**
   * Initialize the storage provider and return a ready-to-use Database instance.
   * 
   * For local storage: Opens the database file directly
   * For remote storage (future): Downloads database, then opens locally
   * 
   * @returns Promise resolving to bun:sqlite Database instance
   * @throws Error if initialization fails (file not found, permission denied, etc.)
   */
  initialize(): Promise<Database>;

  /**
   * Persist any changes made to the database.
   * 
   * For local storage: No-op (writes are immediate to disk)
   * For remote storage (future): Uploads database to remote location
   * 
   * @returns Promise resolving when persistence is complete
   * @throws Error if persistence fails (network error, quota exceeded, etc.)
   */
  persist(): Promise<void>;

  /**
   * Cleanup resources (close connections, delete temp files, etc.)
   * 
   * Called after persist() to release all resources.
   * Should be idempotent (safe to call multiple times).
   */
  cleanup(): void;

  /**
   * Check if the provider has been initialized.
   * 
   * @returns true if initialize() has been called and succeeded
   */
  readonly isInitialized: boolean;
}
```

### StorageProviderConfig Type

```typescript
interface StorageProviderConfig {
  /**
   * Type of storage provider to use.
   * Format: <database-engine>-<storage-location>
   * 
   * MVP: Only 'sqlite-local' is supported
   * Future: 'sqlite-artifact', 'sqlite-s3', 'postgres'
   */
  type: 'sqlite-local' | 'sqlite-artifact' | 'sqlite-s3' | 'postgres';

  /**
   * File system path for SQLite local storage.
   * Required when type === 'sqlite-local'
   * 
   * @example "./unentropy.db"
   * @example "/tmp/metrics.db"
   */
  path?: string;

  // ... other config fields for future providers 
}
```

## Factory Function

```typescript
/**
 * Create a storage provider based on configuration.
 * 
 * @param config - Storage provider configuration
 * @returns Promise resolving to configured StorageProvider
 * @throws Error if config.type is unsupported or config is invalid
 */
async function createStorageProvider(
  config: StorageProviderConfig
): Promise<StorageProvider>;
```

## Implementation Requirements

### SqliteLocalStorageProvider (MVP)

**Behavior:**
- `initialize()`: Opens SQLite database at `config.path` using `bun:sqlite` and configures connection
- `persist()`: No-op (SQLite writes are immediate to disk)
- `cleanup()`: Closes database connection via `db.close()`
- `isInitialized`: Returns `true` after successful `initialize()`

**Connection Configuration:**
The provider handles SQLite-specific PRAGMA configuration:
```typescript
private configureConnection(db: Database): void {
  db.run("PRAGMA journal_mode = WAL");      // Write-Ahead Logging for concurrency
  db.run("PRAGMA synchronous = NORMAL");    // Balance safety and performance
  db.run("PRAGMA foreign_keys = ON");       // Enforce foreign key constraints
  db.run("PRAGMA busy_timeout = 5000");     // 5 second timeout for locks
  db.run("PRAGMA cache_size = -2000");      // 2MB cache
  db.run("PRAGMA temp_store = MEMORY");     // Use memory for temp tables
}
```

**Bun Database API:**
```typescript
import { Database } from "bun:sqlite";

// Open database
const db = new Database(path, {
  readonly?: boolean,   // Open in read-only mode
  create?: boolean,     // Create if doesn't exist (default: true)
  readwrite?: boolean,  // Open in read-write mode
});

// Execute SQL
db.run("PRAGMA journal_mode = WAL");  // Returns void for DDL
db.exec("CREATE TABLE..."); // Execute multiple statements

// Prepare statement
const stmt = db.query("SELECT * FROM users WHERE id = ?");
const row = stmt.get(userId);  // Get single row
const rows = stmt.all(userId); // Get all rows
stmt.run(userId);              // Execute without returning rows

// Transactions
const insertMany = db.transaction((items) => {
  for (const item of items) {
    stmt.run(item);
  }
});

// Close
db.close();
```

**Error Handling:**
- Throws if `config.path` is undefined
- Throws if file permissions prevent read/write access
- Throws if database file is corrupted

**Example Usage:**
```typescript
const provider = new SqliteLocalStorageProvider({
  type: 'sqlite-local',
  path: './unentropy.db',
  verbose: true,
});

const db = await provider.initialize();
// Use db for queries...
await provider.persist();  // No-op for local
provider.cleanup();
```

### Future Providers (Not Implemented in MVP)

**SqliteArtifactStorageProvider** (documented for future implementation):
- `initialize()`: Downloads latest artifact, extracts to temp directory, opens database
- `persist()`: Uploads database as new artifact version
- `cleanup()`: Deletes temp directory

**SqliteS3StorageProvider** (documented for future implementation):
- `initialize()`: Downloads database from S3 to temp directory, opens database
- `persist()`: Uploads database back to S3
- `cleanup()`: Deletes temp directory

**PostgresStorageProvider** (documented for future implementation):
- `initialize()`: Connects to PostgreSQL using connection string, returns connection handle
- `persist()`: No-op (PostgreSQL handles persistence automatically)
- `cleanup()`: Closes PostgreSQL connection
- **Note**: Will use a different database interface than SQLite (e.g., `pg` or similar client)

## Integration with Storage

The Storage class orchestrates the provider, adapter, and repository:

```typescript
import type { Database } from "bun:sqlite";
import type { StorageProvider, StorageProviderConfig } from "./providers/interface";
import { createStorageProvider } from "./providers/factory";
import { SqliteDatabaseAdapter } from "./adapters/sqlite";
import type { DatabaseAdapter } from "./adapters/interface";
import { MetricsRepository } from "./repository";
import { initializeSchema } from "./migrations";

class Storage {
  private readonly provider: StorageProvider;
  private adapter: DatabaseAdapter | null = null;
  private repository: MetricsRepository | null = null;

  constructor(private config: StorageProviderConfig) {
    this.provider = createStorageProvider(this.config);
    this.initPromise = this.initialize();
  }

  async initialize(): Promise<void> {
    // Step 1: Initialize provider (creates/downloads database)
    await this.provider.initialize();

    // Step 2: Get database connection and run migrations
    const db = this.provider.getDb();
    initializeSchema(db);

    // Step 3: Create adapter with database connection
    this.adapter = this.createAdapter(db, this.config.type);

    // Step 4: Create repository with adapter
    this.repository = new MetricsRepository(this.adapter);
  }

  private createAdapter(db: Database, type: string): DatabaseAdapter {
    // Future: switch based on database type
    switch (type) {
      case "sqlite-local":
      case "sqlite-s3":
      case "sqlite-artifact":
        return new SqliteDatabaseAdapter(db);
      // Future support:
      // case "postgres":
      //   return new PostgresDatabaseAdapter(db);
      default:
        return new SqliteDatabaseAdapter(db);
    }
  }

  /**
   * Get repository for domain operations
   * This is the primary API for business logic
   */
  getRepository(): MetricsRepository {
    if (!this.repository) throw new Error("Database not initialized");
    return this.repository;
  }

  /**
   * Get raw database connection
   * Use sparingly - prefer repository methods
   */
  getConnection(): Database {
    return this.provider?.getDb();
  }

  async close(): Promise<void> {
    if (this.provider) {
      // Persist changes (uploads for remote storage)
      await this.provider.persist();
      
      // Cleanup resources
      this.provider.cleanup();
    }
  }

  transaction<T>(fn: () => T): T {
    const tx = this.provider.getDb().transaction(fn);
    return tx();
  }
}
```

**Usage in Actions:**

```typescript
// Initialize storage
const storage = new Storage({ type: 'sqlite-local', path: './metrics.db' });
await storage.ready();

// Use repository for domain operations
const repo = storage.getRepository();
const buildId = repo.recordBuild(context, metrics);

// For advanced queries (tests)
const values = repo.queries.getMetricValuesByBuildId(buildId);

// Clean up
await storage.close();
```

## Design Rationale

### Why DatabaseAdapter Interface?

The system includes a `DatabaseAdapter` interface that abstracts query execution:

1. **Multi-database support**: Enables future support for PostgreSQL, MySQL, etc. without rewriting business logic
2. **Query abstraction**: Different databases use different SQL dialects (SQLite vs Postgres)
3. **Testability**: Can mock adapter for testing repository without real database
4. **Separation of concerns**: Query execution is separate from storage location management
5. **Clean architecture**: Adapter knows **WHAT** to query, Provider knows **WHERE** database lives

**Example: Future Postgres Support**
```typescript
class PostgresDatabaseAdapter implements DatabaseAdapter {
  constructor(private readonly connection: PostgresConnection) {}
  
  insertBuildContext(data: InsertBuildContext): number {
    // Postgres SQL with $1, $2 placeholders instead of ?
    const result = this.connection.query(
      'INSERT INTO build_contexts (...) VALUES ($1, $2, ...) RETURNING id',
      [data.commit_sha, data.branch, ...]
    );
    return result.rows[0].id;
  }
}
```

### Why MetricsRepository Layer?

The repository provides domain-level operations above the adapter:

1. **Business logic encapsulation**: High-level operations like `recordBuild()` and `getMetricComparison()`
2. **Query orchestration**: Combines multiple adapter queries into single business operation
3. **Consistent API**: Actions use repository methods instead of raw queries
4. **Testability**: Repository exposes `queries` accessor for testing while keeping production API clean
5. **Domain focus**: Repository speaks the language of metrics, not SQL

**Example: Domain Operation**
```typescript
// Instead of multiple low-level queries:
const buildId = adapter.insertBuildContext(context);
for (const metric of metrics) {
  const def = adapter.upsertMetricDefinition({...});
  adapter.insertMetricValue({...});
}

// Use single domain operation:
const buildId = repository.recordBuild(context, metrics);
```

### Why Storage Provider Pattern?

The provider manages database lifecycle and location:

1. **Location abstraction**: Storage location (local file, S3, artifact) vs. database operations
2. **Lifecycle management**: Download → open → close → upload lifecycle for remote storage
3. **Future extensibility**: Easy to add GitHub Artifacts, S3, or other storage backends
4. **Simple MVP**: LocalStorageProvider is trivial (just opens a file)
5. **Clear interface**: initialize → use → persist → cleanup lifecycle

**Provider is separate from Adapter:**
- Provider: "Download from S3, open file" → returns Database connection
- Adapter: Receives Database connection → executes queries
- Clean separation: Provider doesn't know about queries, Adapter doesn't know about S3

### Why Three Layers?

The three-layer separation provides clear responsibilities:

| Layer | Responsibility | Knows About | Doesn't Know About |
|-------|---------------|-------------|-------------------|
| **StorageProvider** | WHERE to store | S3, local files, artifacts | Queries, business logic |
| **DatabaseAdapter** | WHAT queries to run | SQL, database schema | Storage location, business logic |
| **MetricsRepository** | WHY (business ops) | Domain concepts, metrics | Storage location, SQL details |

This enables:
- Switching from SQLite to Postgres without changing business logic
- Switching from local file to S3 without changing queries
- Adding new domain operations without modifying infrastructure

### Why Async initialize()?

Even though LocalStorageProvider opens files synchronously, the interface is async because:
- Future providers (Artifact, S3) need to download files asynchronously
- Consistent interface across all providers
- Allows for async validation or setup steps

## Validation Rules

### Config Validation

- `type` must be one of: 'sqlite-local', 'sqlite-artifact', 'sqlite-s3', 'postgres'
- For `type === 'sqlite-local'`: `path` is required
- For `type === 'sqlite-artifact'`: `artifactName`, `repository`, `githubToken` are required (future)
- For `type === 'sqlite-s3'`: `s3Bucket`, `s3Key`, `s3Region` are required (future)
- For `type === 'postgres'`: `connectionString` is required (future)
- `readonly` must be boolean if provided
- `verbose` must be boolean if provided

### Runtime Validation

- `initialize()` must be called before using the Database
- `persist()` can only be called after successful `initialize()`
- `cleanup()` should be called after `persist()` (if needed)
- Multiple calls to `cleanup()` should be safe (idempotent)

## Testing Strategy

### Unit Tests

- Test SqliteLocalStorageProvider initialization with valid/invalid paths
- Test persist() and cleanup() lifecycle
- Test error handling (file not found, permission denied, corrupted DB)
- Test readonly mode prevents writes
- Test verbose logging output

### Integration Tests

- Test Storage + SqliteLocalStorageProvider integration
- Test full lifecycle: initialize → write data → persist → cleanup
- Test multiple Storage instances (concurrency)
- Test recovery from failed initialization

### Contract Tests (Future)

- All StorageProvider implementations must pass same test suite
- Verify initialize/persist/cleanup contract behavior
- Verify error handling consistency

## Migration Path

For future storage providers:

1. Implement new class (e.g., `SqliteArtifactStorageProvider` or `PostgresStorageProvider`) that implements `StorageProvider`
2. Add new type to `StorageProviderConfig.type` union
3. Update factory function to handle new type
4. Add provider-specific config fields to `StorageProviderConfig`
5. Write tests for new provider
6. Document usage in provider's class documentation

**Note for PostgreSQL**: The `StorageProvider` interface may need extension to accommodate different database APIs. Consider:
- Returning a generic database handle instead of bun:sqlite `Database`
- Or creating a separate `PostgresStorageProvider` interface that returns PostgreSQL connection
- Or using a higher-level abstraction that works across both SQLite and PostgreSQL

When adding new storage providers, no changes needed to:
- Storage orchestration logic (uses StorageProvider interface)
- DatabaseAdapter implementations (use Database connection from provider)
- MetricsRepository (uses DatabaseAdapter interface)
- Migrations (run against Database directly)
- Existing tests (if they use interface abstractions)

When adding new database engines:
- Implement new DatabaseAdapter (e.g., PostgresDatabaseAdapter)
- Implement corresponding StorageProvider (e.g., PostgresStorageProvider)
- Update Storage.createAdapter() to handle new type
- No changes to MetricsRepository or business logic

## Examples

### MVP: SQLite Local Storage

```typescript
const storage = new Storage({
  type: 'sqlite-local',
  path: './unentropy.db',
  verbose: true,
});

await storage.ready();
// Use storage for queries...
await storage.close();
```

### Future: SQLite with GitHub Artifacts

```typescript
const storage = new Storage({
  type: 'sqlite-artifact',
  artifactName: 'unentropy-database',
  repository: 'myorg/myrepo',
  githubToken: process.env.GITHUB_TOKEN,
  verbose: true,
});

await storage.ready();
// Use storage for queries...
await storage.close();  // Uploads updated database
```

### Future: SQLite with S3 Storage

```typescript
const storage = new Storage({
  type: 'sqlite-s3',
  s3Bucket: 'my-metrics-bucket',
  s3Key: 'metrics/unentropy.db',
  s3Region: 'us-east-1',
  verbose: true,
});

await storage.ready();
// Use storage for queries...
await storage.close();  // Uploads updated database
```

### Future: PostgreSQL

```typescript
const storage = new Storage({
  type: 'postgres',
  connectionString: 'postgresql://user:pass@localhost:5432/metrics',
  verbose: true,
});

await storage.ready();
// Use storage for queries...
await storage.close();  // Closes connection
```
