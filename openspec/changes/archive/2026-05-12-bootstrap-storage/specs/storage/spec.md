## ADDED Requirements

### Requirement: Storage Backend Configuration
The system SHALL support configurable storage backends via a `storage` object in `unentropy.json` with a `type` property limited to `sqlite-local` (default), `sqlite-artifact`, or `sqlite-s3`.

#### Scenario: Default local storage
- **GIVEN** a user has an `unentropy.json` without a `storage` block
- **WHEN** the system initializes storage
- **THEN** it defaults to `sqlite-local` storage using a local SQLite database file

#### Scenario: S3 storage selection
- **GIVEN** a user wants to use S3-compatible storage
- **WHEN** they set `"storage": { "type": "sqlite-s3" }` in `unentropy.json` and provide S3 credentials as GitHub Action inputs
- **THEN** the system uses S3 for database storage with automatic download and upload

#### Scenario: Artifact storage selection
- **GIVEN** a user wants to use GitHub Artifacts storage
- **WHEN** they set `"storage": { "type": "sqlite-artifact" }` in `unentropy.json`
- **THEN** the system searches for the latest database artifact, downloads it, runs collection, and uploads the updated database as a new artifact

#### Scenario: Invalid storage type
- **GIVEN** a user sets `"storage": { "type": "sqlite-invalid" }` in `unentropy.json`
- **WHEN** the system validates the configuration
- **THEN** it provides a clear error message for the unrecognized value and falls back to `sqlite-local` with a warning

#### Scenario: Artifact configuration with custom name
- **GIVEN** a user wants a custom artifact name
- **WHEN** they set `"storage": { "type": "sqlite-artifact", "artifact": { "name": "my-project-metrics" } }` in `unentropy.json`
- **THEN** the system uses `my-project-metrics` as the artifact name instead of the default `unentropy-metrics`

#### Scenario: Artifact branch filter
- **GIVEN** a user wants to search for artifacts on a specific branch
- **WHEN** they set `"artifact": { "branchFilter": "main" }` in the storage configuration
- **THEN** the system searches for previous artifacts only on the `main` branch

---

### Requirement: Local Storage Behavior
The system SHALL provide a local file-based SQLite storage provider that stores the metrics database at a configurable path on the local filesystem.

#### Scenario: Initialize local database
- **GIVEN** a storage configuration with `type: "sqlite-local"` and a valid path
- **WHEN** the provider initializes
- **THEN** it opens or creates the SQLite database file at the configured path and configures connection pragmas

#### Scenario: Persist is no-op for local
- **GIVEN** a local storage provider with an open database
- **WHEN** `persist()` is called
- **THEN** it returns immediately without performing any operation (SQLite writes are immediate to disk)

#### Scenario: Cleanup closes connection
- **GIVEN** a local storage provider with an initialized database
- **WHEN** `cleanup()` is called
- **THEN** the database connection is closed and temporary resources are released

#### Scenario: Database path missing
- **GIVEN** a local storage provider created without a path
- **WHEN** `initialize()` is called
- **THEN** it throws an error indicating the path is required

---

### Requirement: Artifact Storage Behavior
The system SHALL provide a GitHub Artifacts storage provider that searches for, downloads, and uploads the metrics database using the GitHub REST API.

#### Scenario: Search and download latest artifact
- **GIVEN** a storage configuration with `type: "sqlite-artifact"`
- **WHEN** the provider initializes
- **THEN** it searches for the most recent database artifact from successful workflow runs on the configured branch, downloads it, and extracts it to a temporary location

#### Scenario: First run with no existing artifact
- **GIVEN** a storage configuration with `type: "sqlite-artifact"` and no previous artifact exists
- **WHEN** the provider initializes
- **THEN** it creates a new empty database without attempting to download

#### Scenario: Upload updated database as artifact
- **GIVEN** an artifact storage provider with metrics collected
- **WHEN** `persist()` is called
- **THEN** it uploads the updated database as a new artifact with the configured name, non-destructively (does not delete previous artifacts)

#### Scenario: Auto-detect environment for artifact operations
- **GIVEN** a storage configuration with `type: "sqlite-artifact"`
- **WHEN** the provider initializes
- **THEN** it auto-detects `GITHUB_TOKEN` and `GITHUB_REPOSITORY` from the environment for GitHub API calls

#### Scenario: Configurable artifact name
- **GIVEN** a user sets `"artifact": { "name": "custom-metrics" }` in storage config
- **WHEN** the provider searches for or uploads artifacts
- **THEN** it uses `custom-metrics` as the artifact name instead of the default `unentropy-metrics`

#### Scenario: Configurable branch filter
- **GIVEN** a user sets `"artifact": { "branchFilter": "develop" }` in storage config
- **WHEN** the provider searches for previous artifacts
- **THEN** it filters search results to only include artifacts from the `develop` branch

---

### Requirement: S3 Storage Behavior
The system SHALL provide an S3-compatible storage provider that downloads and uploads the metrics database using S3 API operations.

#### Scenario: Download database from S3
- **GIVEN** a storage configuration with `type: "sqlite-s3"` with valid S3 credentials
- **WHEN** the provider initializes
- **THEN** it downloads the database from the configured S3 bucket and key to a temporary location and opens it

#### Scenario: First run with no database in S3
- **GIVEN** a storage configuration with `type: "sqlite-s3"` and no database exists in S3
- **WHEN** the provider initializes
- **THEN** it creates a new empty database without error

#### Scenario: Upload updated database to S3
- **GIVEN** an S3 storage provider with metrics collected
- **WHEN** `persist()` is called
- **THEN** it uploads the updated database to the configured S3 bucket and key with appropriate content-type headers

#### Scenario: S3 credentials from action inputs
- **GIVEN** a user provides S3 credentials as GitHub Action input parameters
- **WHEN** the provider initializes
- **THEN** it uses the provided credentials for authenticated S3 requests without exposing them in logs or error messages

#### Scenario: S3 endpoint for non-AWS providers
- **GIVEN** a user configures an S3 endpoint for a non-AWS provider (e.g., MinIO, DigitalOcean Spaces)
- **WHEN** the provider makes S3 API calls
- **THEN** it uses the configured endpoint URL for all S3 operations

---

### Requirement: Database Schema
The system SHALL store metrics in a SQLite database with a defined schema consisting of `metric_definitions`, `build_contexts`, `metric_values`, and `schema_version` tables.

#### Scenario: Schema creation on first run
- **GIVEN** a new empty database
- **WHEN** the system initializes storage
- **THEN** it creates the `metric_definitions`, `build_contexts`, `metric_values`, and `schema_version` tables with the correct schema

#### Scenario: Idempotent schema creation
- **GIVEN** an existing database with the correct schema
- **WHEN** the system initializes storage
- **THEN** schema creation is idempotent (no errors, no data loss)

#### Scenario: Store metric definitions
- **GIVEN** a configured metric with key "test-coverage", type "numeric", unit "%"
- **WHEN** the system persists metric metadata
- **THEN** a row is inserted into `metric_definitions` with the metric key as primary key

#### Scenario: Store build context
- **GIVEN** a CI pipeline run with commit SHA, branch, run ID, and timestamp
- **WHEN** the system records the build context
- **THEN** a row is inserted into `build_contexts` with all build metadata

#### Scenario: Store metric values
- **GIVEN** a collected metric value for a specific build
- **WHEN** the system persists the measurement
- **THEN** a row is inserted into `metric_values` linking the metric definition and build context with the collected value

#### Scenario: Unique metric per build
- **GIVEN** a metric value already exists for a given metric and build
- **WHEN** the system inserts the same metric and build again
- **THEN** the existing value is updated (upsert behavior) rather than creating a duplicate

#### Scenario: Schema migration
- **GIVEN** an existing database at an older schema version
- **WHEN** the system initializes storage
- **THEN** it migrates the schema to the current version while preserving existing data

---

### Requirement: Storage Provider Interface
The system SHALL define a `StorageProvider` interface with `initialize()`, `persist()`, and `cleanup()` methods that all storage backends implement.

#### Scenario: Full provider lifecycle
- **GIVEN** a storage provider implementation
- **WHEN** the system calls `initialize()`, uses the database, calls `persist()`, then `cleanup()`
- **THEN** the lifecycle completes without errors: database is opened, changes are persisted, resources are released

#### Scenario: Initialize returns database instance
- **GIVEN** a storage provider
- **WHEN** `initialize()` is called successfully
- **THEN** it returns a ready-to-use bun:sqlite `Database` instance and `isInitialized` returns `true`

#### Scenario: Persist after initialize
- **GIVEN** a storage provider with a successfully initialized database
- **WHEN** `persist()` is called
- **THEN** changes are saved to the storage backend (immediate for local, upload for remote)

#### Scenario: Idempotent cleanup
- **GIVEN** a storage provider that has been cleaned up
- **WHEN** `cleanup()` is called again
- **THEN** the second call is safe and does not throw errors

#### Scenario: Provider factory selection
- **GIVEN** a storage configuration with type "sqlite-local", "sqlite-artifact", or "sqlite-s3"
- **WHEN** the system creates a storage provider via the factory function
- **THEN** it returns the correct provider implementation based on the type

---

### Requirement: Error Handling for Remote Storage
The system SHALL handle remote storage failures gracefully with clear error messages, retry logic for transient failures, and data preservation priority.

#### Scenario: S3 authentication failure
- **GIVEN** invalid or expired S3 credentials
- **WHEN** the provider attempts to download or upload
- **THEN** it provides a clear error message indicating authentication failure with guidance on checking credentials

#### Scenario: S3 network failure with retry
- **GIVEN** a transient network failure during S3 upload
- **WHEN** the upload fails
- **THEN** the action retries with exponential backoff and reports if all retries are exhausted

#### Scenario: Missing S3 bucket
- **GIVEN** the configured S3 bucket does not exist
- **WHEN** the provider attempts to access it
- **THEN** it provides an error message identifying the missing bucket and suggesting verification steps

#### Scenario: Corrupted database download
- **GIVEN** the downloaded S3 or artifact database file is corrupted
- **WHEN** the provider attempts to open it
- **THEN** it handles the error gracefully with options to recreate or restore from backup

#### Scenario: Data preservation on report failure
- **GIVEN** S3 upload succeeds but subsequent report generation fails
- **WHEN** the workflow completes
- **THEN** the database is safely stored in S3 even though the report was not generated

#### Scenario: Missing GitHub token for artifact
- **GIVEN** an artifact storage provider without `GITHUB_TOKEN` in the environment
- **WHEN** initialization begins
- **THEN** it provides a clear error message about the missing token

#### Scenario: GitHub API rate limiting
- **GIVEN** the GitHub API rate limit is exceeded during artifact operations
- **WHEN** the provider searches or downloads artifacts
- **THEN** it provides a clear error message about rate limiting

---

### Requirement: Backward Compatibility
The system SHALL maintain full backward compatibility with local file storage when no `storage` block is configured or when `storage.type` is `sqlite-local`.

#### Scenario: No storage block in config
- **GIVEN** an `unentropy.json` file without a `storage` block (original format from spec 001)
- **WHEN** the system reads the configuration
- **THEN** it defaults to `sqlite-local` storage, preserving the original behavior

#### Scenario: Explicit local storage
- **GIVEN** a user explicitly sets `"storage": { "type": "sqlite-local" }` in `unentropy.json`
- **WHEN** the system initializes storage
- **THEN** it uses local file storage identically to the default behavior

---

## Edge Cases

- What happens when S3 credentials expire mid-workflow during a long metric collection? The upload fails, providing a clear error message.
- What happens when the database file grows large (100MB+) and upload takes significant time? The system handles large files with appropriate timeouts and streaming.
- What happens when multiple workflow runs execute concurrently and try to download/upload the same database? Advisory locking or warnings are used; each build's data is preserved independently.
- What happens when S3 bucket permissions allow download but not upload (or vice versa)? Clear error messages indicate the specific permission issue.
- What happens when artifact storage finds multiple artifacts from different workflow runs? The most recent from a successful run is selected.
- What happens when artifact retention policy has expired old artifacts? First-run scenario applies — a new database is created.
- What happens when switching storage backends (e.g., from sqlite-artifact to sqlite-s3)? Users manage manual migration; the new backend starts with a fresh database.
- What happens when the database file is locked by another process? The busy timeout (5 seconds) handles concurrent lock contention.
- What happens when a workflow is cancelled mid-execution during database upload? The database changes are preserved locally but may not be persisted remotely.
- What happens when using S3-compatible storage with non-standard authentication mechanisms? The system supports standard S3 credential patterns; non-standard mechanisms are out of scope.
- What happens when running in a forked repository with different artifact access rules? Artifact operations are limited to the same repository with appropriate error messages.

## Assumptions

- Users using S3 storage have access to S3-compatible storage with appropriate permissions (read, write).
- S3 storage endpoints are accessible from GitHub Actions runners.
- Database files remain under 50MB for reasonable upload/download performance.
- S3 credentials provided as action parameters have sufficient validity duration to complete the entire workflow.
- GitHub Actions workflow has necessary permissions to access GitHub Secrets for passing S3 credentials as action parameters.
- The project already has working metric collection configuration (`unentropy.json`).
- Local file storage remains the default for development and simple setups.
- GitHub Artifacts provide an intermediate option for users already using GitHub Actions artifacts.
- Database schema remains compatible across versions (migrations handled by the schema migration system).
- S3 bucket is dedicated to Unentropy or uses a clear prefix/path to avoid conflicts.

## Dependencies

- GitHub Actions workflow execution environment
- S3-compatible storage provider account and bucket (for `sqlite-s3` storage)
- S3 client support via Bun's built-in `S3Client`
- GitHub REST API for artifact operations (for `sqlite-artifact` storage)
- `@actions/github` package for GitHub API client
- Existing Unentropy metric collection and report generation functionality
- Storage Provider interface implementations
- SQLite support via `bun:sqlite` for database operations
- GitHub Secrets for secure credential storage (S3 credentials)
- GitHub Token for artifact access (auto-detected from environment)
- Bun runtime for TypeScript execution in GitHub Actions

## Scope Boundaries

### In Scope
- Storage type selection (`sqlite-local`/`sqlite-artifact`/`sqlite-s3`) via `storage.type` in `unentropy.json`
- Local file-based SQLite storage provider
- GitHub Artifacts storage provider (auto-search, download, upload)
- S3-compatible storage provider (download, upload, credential handling)
- Storage provider factory pattern and interface
- Database schema (metric_definitions, build_contexts, metric_values, schema_version)
- SQLite connection pragma configuration (DELETE journal mode, foreign keys, busy timeout)
- Schema migration mechanism
- Error handling for remote storage failures (authentication, network, permissions)
- Retry logic with exponential backoff for transient failures
- Support for multiple S3-compatible providers (AWS S3, MinIO, DigitalOcean Spaces, Cloudflare R2, Backblaze B2)
- Auto-detection of `GITHUB_TOKEN` and `GITHUB_REPOSITORY` for artifact operations
- Configurable artifact name and branch filter for artifact storage
- First-run scenario handling (no existing database/artifact)
- Backward compatibility with local file storage
- Credential security (no logging of secrets)

### Out of Scope
- Advanced database backup and versioning strategies (S3 versioning is user-managed)
- Multi-region S3 replication for high availability
- Database migration between different S3 providers (users manage manually)
- Compression or encryption of database files beyond S3 server-side encryption
- Advanced concurrency control with distributed locking mechanisms
- Database optimization or compaction during upload
- Cost optimization features (lifecycle policies, storage class selection)
- Integration with non-S3 cloud storage (Azure Blob, Google Cloud Storage)
- Automatic credential rotation or IAM role management
- Cross-repository artifact access
- Artifact cleanup or retention policy management
- Aggregating data from multiple database artifacts

## Foundational Contracts

| Contract | Location | Referenced By |
|----------|----------|---------------|
| Database Schema | `contracts/database-schema.md` | `quality-gates/`, `reporting/` |
| Storage Provider Interface | `contracts/storage-provider-interface.md` | `actions/` |
| Storage Config Schema | `contracts/config-schema.md` | `configuration/` |
