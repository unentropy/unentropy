# Feature Specification: Unified S3-Compatible Storage Action

**Feature Branch**: `003-unified-s3-action`  
**Created**: Thu Nov 13 2025  
**Status**: Draft  
**Input**: User description: "as per spec/Roadmap.md file, plan implementing the "single unified action" - a gh action that downloads the metrics database from S3-compatible storage, runs the metric collection, uploads the database again and generates the HTML report"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure Storage Backend (Priority: P1)

As a developer, I want to specify my storage backend preference via the `storage` key in my Unentropy configuration, so I can choose between `sqlite-local` (default), `sqlite-artifact` (GitHub Artifacts with automatic persistence), or `sqlite-s3` (S3-compatible storage).

**Why this priority**: This is the foundation for the unified action. The `storage.type` selection determines how the entire workflow operates, enabling automatic database persistence for both GitHub Artifacts and S3 backends.

**Independent Test**: Can be fully tested by setting `storage.type` in `unentropy.json` (either `sqlite-local`, `sqlite-artifact`, or `sqlite-s3`), verifying the system validates the configuration correctly and provides clear error messages for invalid settings, delivering immediate value by validating the storage setup.

The `storage` block supports backend-specific options. When `storage.type` is `sqlite-local`, the system uses local file storage. When `storage.type` is `sqlite-artifact`, the system automatically searches for and downloads the latest database artifact from previous workflow runs, then uploads the updated database after collection. When `storage.type` is `sqlite-s3`, the system downloads/uploads the database from/to S3-compatible storage.

**Acceptance Scenarios**:

1. **Given** I want to use S3-compatible storage, **When** I set `storage.type` to `sqlite-s3` in my `unentropy.json` and provide S3 credentials as GitHub Action parameters, **Then** the system uses S3 for database storage with automatic download/upload
2. **Given** I want to use GitHub Artifacts storage, **When** I set `storage.type` to `sqlite-artifact`, **Then** the system automatically finds and downloads the latest database artifact, runs collection, and uploads the updated database as a new artifact
3. **Given** I want to use local file storage, **When** I set `storage.type` to `sqlite-local` (or omit the `storage` configuration entirely), **Then** the system uses local file storage for the database
4. **Given** I have configured `storage.type`, **When** the value is invalid, **Then** the system provides clear error messages and defaults to `sqlite-local` with a warning
5. **Given** I need to keep credentials secure, **When** I provide S3 credentials as GitHub Action parameters from GitHub Secrets, **Then** the system accepts credentials without exposing them in logs or configuration files
6. **Given** I am using `sqlite-artifact` storage, **When** I run the track-metrics action, **Then** the system auto-detects `GITHUB_TOKEN` and `GITHUB_REPOSITORY` from the environment for artifact operations

---

### User Story 2 - Run Complete Metrics Workflow with Single Action (Priority: P2)

As a developer, I want to run a single GitHub Action that handles the entire metrics workflow (download database, collect metrics, upload database, generate report), so I can track metrics without managing multiple workflow steps.

**Why this priority**: This is the core value proposition - simplifying the workflow to a single action. It depends on storage configuration being available but delivers the main user benefit of convenience.

**Independent Test**: Can be fully tested by running the unified action in a workflow with S3 or artifact configuration, verifying it performs all steps in sequence and produces a report, delivering complete end-to-end value in one action invocation.

**Acceptance Scenarios**:

1. **Given** I have S3 storage configured, **When** I run the unified action in my CI pipeline, **Then** the system downloads the existing database from S3 (or creates new if none exists), collects current metrics, uploads the updated database back to S3, and generates an HTML report
2. **Given** I have artifact storage configured, **When** I run the unified action in my CI pipeline, **Then** the system searches for the latest database artifact from previous successful runs, downloads it (or creates new if none exists), collects current metrics, uploads the updated database as a new artifact, and generates an HTML report
3. **Given** I'm running metrics collection for the first time (no existing database), **When** the unified action executes with S3 or artifact storage, **Then** it creates a new database, collects initial metrics, uploads to storage, and generates a report with the first data point
4. **Given** my metric collection takes time, **When** the unified action runs, **Then** each phase (download, collect, upload, report) completes successfully and I can see progress in the workflow logs
5. **Given** I run the action on multiple commits, **When** viewing the generated reports over time, **Then** each report shows growing historical data reflecting all previous collections
6. **Given** I am using artifact storage, **When** the unified action searches for previous artifacts, **Then** it finds artifacts from successful workflow runs on the specified branch (defaulting to current branch)

---

### User Story 3 - Handle S3 Storage Failures Gracefully (Priority: P3)

As a developer, I want the unified action to handle S3 storage failures gracefully, so I understand what went wrong and can fix configuration or credential issues without deciphering cryptic errors.

**Why this priority**: Error handling improves user experience but isn't critical for the happy path. Clear errors help users troubleshoot storage issues independently.

**Independent Test**: Can be fully tested by simulating various S3 failure scenarios (invalid credentials, network issues, missing bucket), verifying the action provides actionable error messages and appropriate exit codes, delivering value through better troubleshooting.

**Acceptance Scenarios**:

1. **Given** my S3 credentials are invalid or expired, **When** the unified action attempts to download the database, **Then** it provides a clear error message indicating authentication failure with guidance on checking credentials
2. **Given** the specified S3 bucket doesn't exist, **When** the action tries to access it, **Then** it provides an error message identifying the missing bucket and suggesting verification steps
3. **Given** network connectivity to S3 is interrupted during upload, **When** the upload fails, **Then** the action retries the upload with exponential backoff and reports if all retries are exhausted
4. **Given** S3 upload succeeds but report generation fails, **When** the action completes, **Then** the database is safely stored in S3 even though the report wasn't generated (data preservation priority)

---


### Edge Cases

- What happens when S3 download succeeds but the database file is corrupted?
- What happens when metric collection runs for a very long time and S3 credentials expire?
- What happens when the database file grows large (100MB+) and upload takes significant time?
- What happens when multiple workflow runs execute concurrently and try to download/upload the same database?
- What happens when S3 bucket permissions allow download but not upload (or vice versa)?
- What happens when the workflow is cancelled mid-execution during database upload?
- What happens when switching between different S3 providers (data migration)?
- What happens when network bandwidth is limited and database transfer times out?
- What happens when using S3-compatible storage with non-standard authentication mechanisms?
- What happens when the S3 bucket has versioning enabled and multiple database versions exist?
- What happens when artifact storage finds multiple artifacts from different workflow runs?
- What happens when artifact retention policy has expired old artifacts?
- What happens when GitHub API rate limiting prevents artifact search or download?
- What happens when `GITHUB_TOKEN` lacks permissions to access artifacts?
- What happens when running in a forked repository with different artifact access rules?

## Requirements *(mandatory)*

### Functional Requirements

#### Storage Configuration

- **FR-001**: System MUST support a `storage` object in `unentropy.json` with a `type` property limited to `sqlite-local` (default), `sqlite-artifact`, or `sqlite-s3`.
- **FR-002**: System MUST default `storage.type` to `sqlite-local` when the `storage` block or `type` field is omitted
- **FR-003**: System MUST accept S3 credentials (access key ID, secret access key, endpoint, bucket, region) as GitHub Action input parameters, not in configuration file
- **FR-004**: System MUST validate `storage.type` and provide clear error messages for unrecognized values before falling back to `sqlite-artifact`
- **FR-005**: System MUST validate S3 action parameters (when `storage.type` is `sqlite-s3`) before attempting any storage operations
- **FR-006**: System MUST work with any S3-compatible storage provider (AWS S3, MinIO, DigitalOcean Spaces, Cloudflare R2, Backblaze B2) through parameterized configuration
- **FR-007**: System MUST provide clear error messages for missing or invalid S3 parameters when S3 storage type is selected
- **FR-008**: System MUST never log or expose S3 credentials in workflow output, error messages, or generated reports

#### Unified Workflow Orchestration

- **FR-009**: System MUST provide a single GitHub Action that orchestrates the complete metrics workflow
- **FR-010**: Action MUST execute workflow phases in sequence: download database, collect metrics, upload database, generate report
- **FR-011**: Action MUST create a new database if none exists in S3 storage (first-run scenario)
- **FR-013**: Action MUST log progress for each phase to provide visibility in workflow logs
- **FR-014**: Action MUST continue to report generation even if previous steps encountered non-fatal issues

#### Database Download from S3

- **FR-015**: System MUST download the metrics database from S3-compatible storage before metric collection
- **FR-016**: System MUST verify the downloaded database is a valid SQLite file before proceeding
- **FR-017**: System MUST handle the case where no database exists in S3 (first run) by creating a new empty database
- **FR-018**: Download MUST use authenticated requests with configured credentials
- **FR-019**: System MUST store the downloaded database in a temporary location accessible to metric collection

#### Database Upload to S3

- **FR-020**: System MUST upload the updated database to S3-compatible storage after metric collection completes
- **FR-021**: Upload MUST use authenticated requests with configured credentials
- **FR-022**: System MUST verify upload success before considering the workflow complete
- **FR-023**: Upload MUST use appropriate content-type headers for SQLite database files
- **FR-024**: System MUST preserve the database in local storage until upload is confirmed successful (no premature deletion)

#### Error Handling and Resilience

- **FR-025**: System MUST provide clear, actionable error messages for S3 authentication failures
- **FR-026**: System MUST provide clear, actionable error messages for S3 bucket access issues
- **FR-027**: System MUST implement retry logic with exponential backoff for transient network failures
- **FR-028**: System MUST distinguish between recoverable errors (network issues) and permanent failures (invalid credentials)
- **FR-029**: System MUST prioritize data preservation - ensure database is uploaded to S3 even if report generation fails
- **FR-030**: System MUST handle corrupted database files gracefully with options to recreate or restore from backup

#### Backward Compatibility

- **FR-031**: System MUST maintain support for local file storage whenever `storage.type` is `sqlite-local` or the `storage` block is not specified
- **FR-032**: System MUST provide full workflow support for GitHub Artifacts storage whenever `storage.type` is `sqlite-artifact`, including automatic search, download, and upload of database artifacts
- **FR-033**: System MUST automatically detect which storage backend to use based on storage type in unentropy.json and provide full workflow capabilities for all remote storage types (`sqlite-s3` and `sqlite-artifact`)
- **FR-034**: System MUST provide migration guidance for users transitioning between storage backends

#### GitHub Artifacts Storage

- **FR-040**: System MUST search for the most recent database artifact from successful workflow runs on the specified branch when using `sqlite-artifact` storage
- **FR-041**: System MUST download and extract the database artifact to a temporary location before opening the database
- **FR-042**: System MUST upload the updated database as a new artifact after metric collection completes
- **FR-043**: System MUST handle first-run scenario (no existing artifact) by creating a new database
- **FR-044**: System MUST auto-detect `GITHUB_TOKEN` from the environment for artifact operations
- **FR-045**: System MUST auto-detect `GITHUB_REPOSITORY` from the environment for artifact operations
- **FR-046**: System MUST support configurable artifact name (default: `unentropy-metrics`)
- **FR-047**: System MUST support configurable branch filter for artifact search (default: current branch from `GITHUB_REF_NAME`)
- **FR-048**: System MUST verify the downloaded artifact contains a valid SQLite database before proceeding

### Key Entities

- **Storage Type Configuration**: Represents the `storage` block in `unentropy.json`, with a `type` property with values `sqlite-local`, `sqlite-artifact`, or `sqlite-s3` (as defined in config schema contract)
- **Storage Provider**: Represents the abstraction layer between workflow logic and storage implementation (uses StorageProvider interface from spec 001)
- **Action Parameters**: Represents GitHub Action input parameters including S3 credentials (access key, secret key, endpoint, bucket, region) when S3 storage is used, or artifact configuration (artifact name, branch filter) when artifact storage is used
- **Database File**: Represents the SQLite database stored in local filesystem, GitHub Artifacts, or S3, including file path, size, last modified timestamp, and storage-specific metadata
- **Workflow Phase**: Represents a distinct step in the unified action (download, collect, upload, report), including status, duration, and error information
- **Artifact Metadata**: Represents information about a GitHub Actions artifact including artifact ID, name, workflow run ID, creation timestamp, and expiration status

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can configure S3 storage and run the unified action successfully within 10 minutes of reading setup documentation
- **SC-002**: Database download from S3 completes within 30 seconds for files up to 10MB
- **SC-003**: Database upload to S3 completes within 45 seconds for files up to 10MB
- **SC-004**: Complete workflow (download, collect, upload, report) completes within 5 minutes for typical workloads
- **SC-005**: System successfully handles transient network failures with automatic retries in 95% of cases
- **SC-006**: Error messages clearly identify root cause and provide actionable remediation steps in 90% of failure scenarios
- **SC-007**: Users migrating from GitHub Artifacts to S3 storage complete the transition in under 15 minutes
- **SC-008**: Concurrent workflow runs do not corrupt the database or cause data loss in 99.9% of scenarios
- **SC-009**: Action works with at least 4 different S3-compatible providers (AWS S3, MinIO, DigitalOcean Spaces, Cloudflare R2) without code changes

## Assumptions *(mandatory)*

- Users have access to S3-compatible storage with appropriate permissions (read, write, delete) when using S3 storage type
- S3 storage endpoint is accessible from GitHub Actions runners (not behind restrictive firewalls)
- Database files remain under 50MB for reasonable upload/download performance
- S3 credentials provided as action parameters have sufficient validity duration to complete the entire workflow
- Users understand basic S3 concepts (buckets, regions, access keys) when opting for S3 storage
- The project already has working metric collection configuration (unentropy.json)
- GitHub Actions workflow has necessary permissions to access GitHub Secrets for passing S3 credentials as action parameters
- Network connectivity between GitHub Actions runners and S3 endpoints is generally reliable (99%+ uptime) when using S3 storage
- S3 bucket is dedicated to Unentropy or uses a clear prefix/path to avoid conflicts
- Database schema remains compatible across versions (migrations handled by existing migration system)
- Local file storage remains the default for development and simple setups
- GitHub Artifacts provide an intermediate option for users already using GitHub Actions artifacts
- S3 storage provides the full unified action experience with automatic persistence

## Dependencies *(mandatory)*

- GitHub Actions workflow execution environment
- S3-compatible storage provider account and bucket (for `sqlite-s3` storage)
- S3 client support via Bun's built-in `S3Client` (no extra dependency)
- GitHub REST API for artifact operations (for `sqlite-artifact` storage)
- `@actions/github` package for GitHub API client
- Existing Unentropy metric collection and report generation functionality (from spec 001)
- Storage Provider interface and implementations from spec 001
- SQLite support via bun:sqlite for database operations
- GitHub Secrets for secure credential storage (S3 credentials)
- GitHub Token for artifact access (auto-detected from environment)
- Bun runtime for TypeScript execution in GitHub Actions

## Scope Boundaries *(mandatory)*

### In Scope

- Storage type selection (`sqlite-local`/`sqlite-artifact`/`sqlite-s3`) in `unentropy.json` using the StorageProvider interface from spec 001
- S3 credentials passed as GitHub Action input parameters (not in configuration file)
- Unified GitHub Action that orchestrates complete workflow for both S3 and artifact storage
- Database download from S3 before metric collection (sqlite-s3)
- Database upload to S3 after metric collection (sqlite-s3)
- Automatic artifact search and download before metric collection (sqlite-artifact)
- Automatic artifact upload after metric collection (sqlite-artifact)
- Auto-detection of `GITHUB_TOKEN` and `GITHUB_REPOSITORY` for artifact operations
- Configurable artifact name and branch filter for artifact storage
- Report generation and output as workflow artifact
- Error handling for S3 authentication and connectivity issues
- Error handling for GitHub API and artifact access issues
- Retry logic for transient failures
- Support for multiple S3-compatible providers (AWS S3, MinIO, etc.)
- Backward compatibility with local file storage (sqlite-local)
- First-run scenario handling (no existing database/artifact)
- Basic concurrency handling (advisory locking or warnings)
- Configuration validation and error reporting

### Out of Scope

- Advanced database backup and versioning strategies (S3 versioning is user-managed)
- Multi-region S3 replication for high availability
- Database migration between different S3 providers (users manage manually)
- Compression or encryption of database files beyond S3 server-side encryption
- Advanced concurrency control with distributed locking mechanisms
- Database optimization or compaction during upload
- Cost optimization features (lifecycle policies, storage class selection)
- Integration with cloud-specific services beyond standard S3 API
- Support for non-S3 cloud storage (Azure Blob, Google Cloud Storage) - S3-compatible only
- Automatic credential rotation or IAM role management
- Bandwidth throttling or transfer rate limiting
- Custom S3 request signing mechanisms beyond standard SDK support
- Cross-repository artifact access
- Artifact cleanup or retention policy management
- Aggregating data from multiple database artifacts
- Performance optimization for repositories with thousands of workflow runs
