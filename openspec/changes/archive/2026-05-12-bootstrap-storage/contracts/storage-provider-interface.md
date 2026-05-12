# Storage Provider Interface

**Domain**: storage

## Overview

Defines the interface contract for storage providers that abstract where SQLite database files are stored and how they are accessed. The interface supports local file storage, GitHub Artifacts, and S3-compatible storage backends.

## Architecture

```
┌─────────────────────────────┐
│         Action Layer         │
│   (track-metrics, etc.)     │
└────────────┬────────────────┘
             │ Uses
             ▼
┌─────────────────────────────┐
│          Storage             │
│  (Orchestrates provider     │
│   + drizzle + repository)   │
└──────┬─────────────────┬────┘
       │ Manages         │ Exposes
       ▼                 ▼
┌──────────────┐  ┌────────────────┐
│ Storage      │  │ Metrics        │
│ Provider     │  │ Repository     │
│ (interface)  │  │ (domain ops)   │
└──────┬───────┘  └────────────────┘
       │
       │ returns bun:sqlite Database
       ▼
┌─────────────────────────────┐
│  StorageProvider            │
│  Implementations            │
├──────────┬────────┬─────────┤
│ Sqlite   │ Sqlite │ Sqlite  │
│ Local    │S3      │Artifact │
│ Provider │Provider│Provider │
└──────────┴────────┴─────────┘
```

**Key Design Principle**: Provider knows WHERE (location/lifecycle) but not WHAT (queries). Queries are handled by the Drizzle ORM and MetricsRepository layers.

## Interface Definition

### StorageProvider Interface

```typescript
import type { Database } from "bun:sqlite";

interface StorageProvider {
  /**
   * Initialize the storage provider and return a ready-to-use Database instance.
   *
   * For local storage: Opens the database file directly.
   * For remote storage: Downloads database to temporary location, then opens locally.
   *
   * @returns Promise resolving to bun:sqlite Database instance
   * @throws Error if initialization fails (file not found, permission denied, network error, etc.)
   */
  initialize(): Promise<Database>;

  /**
   * Persist any changes made to the database.
   *
   * For local storage: No-op (writes are immediate to disk).
   * For remote storage: Uploads database to remote location (S3 or artifact).
   *
   * @returns Promise resolving when persistence is complete
   * @throws Error if persistence fails (network error, quota exceeded, etc.)
   */
  persist(): Promise<void>;

  /**
   * Cleanup resources (close connections, delete temp files, etc.).
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
  /** Type of storage provider to use. */
  type: "sqlite-local" | "sqlite-artifact" | "sqlite-s3";

  /** File system path for SQLite local storage. Required when type === 'sqlite-local'. */
  path?: string;

  // Artifact-specific fields (required when type === 'sqlite-artifact')
  artifactName?: string;
  repository?: string;
  githubToken?: string;
  branchFilter?: string;

  // S3-specific fields (required when type === 'sqlite-s3')
  s3Bucket?: string;
  s3Key?: string;
  s3Region?: string;
  s3Endpoint?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
}
```

### Factory Function

```typescript
/**
 * Create a storage provider based on configuration.
 *
 * @param config - Storage provider configuration
 * @returns Promise resolving to configured StorageProvider
 * @throws Error if config.type is unsupported or config is invalid
 */
async function createStorageProvider(config: StorageProviderConfig): Promise<StorageProvider>;
```

## Provider Responsibilities

### SqliteLocalStorageProvider

**Behavior**:

- `initialize()`: Opens SQLite database at `config.path` using `bun:sqlite`. If the file does not exist, creates it. Configures connection with appropriate PRAGMA settings (DELETE journal mode, NORMAL synchronous, foreign keys ON, 5s busy timeout, 2MB cache, MEMORY temp store).
- `persist()`: No-op. SQLite writes are immediate to disk.
- `cleanup()`: Closes database connection via `db.close()`. Removes any temporary resources.
- `isInitialized`: Returns `true` after successful `initialize()`.

**Error Handling**:

- Throws if `config.path` is undefined
- Throws if file permissions prevent read/write access
- Throws if database file is corrupted

### SqliteS3StorageProvider

**Behavior**:

- `initialize()`: Downloads database from S3 to a temp directory, then opens the SQLite database. If no database exists in S3 (first run), creates a new empty database. Verifies downloaded file is a valid SQLite database.
- `persist()`: Uploads the updated database back to S3 with authenticated requests and appropriate content-type headers. Preserves database in local storage until upload is confirmed successful (no premature deletion).
- `cleanup()`: Closes database connection, removes temporary directory.
- `isInitialized`: Returns `true` after successful S3 download and database open.

**Error Handling**:

- Authentication failures: Clear error messages for invalid/expired credentials
- Network issues: Retry with exponential backoff for transient failures
- Permission errors: Specific guidance for bucket/key permissions
- Corrupted database: Graceful handling with options to recreate

### SqliteArtifactStorageProvider

**Behavior**:

- `initialize()`: Searches for the most recent database artifact from successful workflow runs on the configured branch. Downloads the artifact to a temp directory, extracts the database, and opens it. If no artifact exists, creates a new empty database. Auto-detects `GITHUB_TOKEN` and `GITHUB_REPOSITORY` from the environment.
- `persist()`: Uploads the updated database as a new artifact with the configured name. Non-destructive — does not delete previous artifacts.
- `cleanup()`: Closes database connection, removes temporary directory.
- `isInitialized`: Returns `true` after successful artifact download and database open.

**Error Handling**:

- Missing artifact: Starts with new database (first-run scenario)
- Missing GitHub token: Clear error message
- GitHub API rate limiting: Clear error message
- Corrupted artifact: Graceful handling

### Re-Upload Behavior

All remote storage providers follow a non-destructive upload strategy:

- Uploads only add new data; they never delete previous versions
- Previous artifact versions remain accessible via GitHub's artifact retention
- S3 versioning (if enabled) preserves previous database states
- The database is preserved in local storage until remote upload is confirmed successful

## Validation Rules

### Config Validation

- `type` must be one of: `'sqlite-local'`, `'sqlite-artifact'`, `'sqlite-s3'`
- For `type === 'sqlite-local'`: `path` is required
- For `type === 'sqlite-artifact'`: `artifactName`, `repository`, `githubToken` are required
- For `type === 'sqlite-s3'`: `s3Bucket`, `s3Key`, `s3Region` are required

### Runtime Validation

- `initialize()` must be called before using the Database
- `persist()` can only be called after successful `initialize()`
- `cleanup()` can be called after `persist()` or on error
- Multiple calls to `cleanup()` must be safe (idempotent)

## Integration

The Storage class orchestrates the provider, Drizzle ORM, and repository:

```typescript
class Storage {
  private readonly provider: StorageProvider;

  constructor(private config: StorageProviderConfig) {
    this.provider = createStorageProvider(this.config);
  }

  async initialize(): Promise<void> {
    const rawDb = await this.provider.initialize();
    // Wrap with Drizzle ORM
    // Create MetricsRepository
  }

  async close(): Promise<void> {
    await this.provider.persist();
    this.provider.cleanup();
  }
}
```
