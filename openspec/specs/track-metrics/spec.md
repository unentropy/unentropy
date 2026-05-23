# actions/track-metrics Specification

## Purpose

The track-metrics action is a composite GitHub Action that orchestrates the complete metrics workflow. It coordinates storage initialization, metric collection, database persistence, and report generation into a single reusable action — abstracting away the underlying storage backend details from the user.

## Requirements

### Requirement: Unified Workflow Orchestration

The system SHALL provide a single composite GitHub Action that orchestrates the complete metrics workflow: initialize storage, collect metrics, persist database, and generate report.

#### Scenario: Complete S3 storage workflow
- **GIVEN** S3 storage is configured
- **WHEN** the unified action runs
- **THEN** the action downloads the existing database from S3 (or creates new if none exists), collects current metrics, uploads the updated database back to S3, and generates an HTML report

#### Scenario: Complete artifact storage workflow
- **GIVEN** artifact storage is configured
- **WHEN** the unified action runs
- **THEN** the action searches for the latest database artifact from previous successful runs, downloads it (or creates new if none exists), collects current metrics, uploads the updated database as a new artifact, and generates an HTML report

#### Scenario: First run with no existing database
- **GIVEN** no previous database exists in storage
- **WHEN** the unified action executes
- **THEN** it creates a new database, collects initial metrics, uploads to storage, and generates a report with the first data point

#### Scenario: Incremental data across runs
- **GIVEN** multiple workflow runs on subsequent commits
- **WHEN** viewing generated reports over time
- **THEN** each report shows growing historical data reflecting all previous collections

---

### Requirement: Phase Execution and Logging

The action SHALL execute workflow phases in a fixed sequence with per-phase progress logging to provide visibility in CI logs.

#### Scenario: Sequential phase execution
- **GIVEN** the unified action is running
- **WHEN** each phase completes
- **THEN** the next phase begins only after the previous one succeeds, and each phase logs its status (start, success, or failure with details)

#### Scenario: Visible progress in workflow logs
- **GIVEN** metric collection takes significant time
- **WHEN** the unified action runs
- **THEN** each phase (download, collect, upload, report) shows clear progress messages in the workflow logs

---

### Requirement: First-Run Database Creation

The system SHALL create a new empty database when no existing database is found in any configured storage backend.

#### Scenario: First run with S3 storage
- **GIVEN** S3 storage is configured and no database exists at the configured key
- **WHEN** the action initializes storage
- **THEN** it creates a new empty database and proceeds with metric collection

#### Scenario: First run with artifact storage
- **GIVEN** artifact storage is configured and no previous artifact exists
- **WHEN** the action initializes storage
- **THEN** it creates a new empty database without attempting to download a non-existent artifact

---

### Requirement: Graceful Report Generation Failure

The action SHALL handle report generation failure gracefully — the overall action SHALL NOT fail when report generation fails after the database has been persisted.

#### Scenario: Database persists, report fails
- **GIVEN** metric collection and database upload succeed
- **WHEN** report generation fails
- **THEN** the action logs the report failure as a warning but exits with success (exit code 0), and the database is safely stored

#### Scenario: Report generation succeeds
- **GIVEN** all prior phases complete successfully
- **WHEN** report generation executes
- **THEN** the HTML report is generated and the action exits with success

---

### Requirement: Error Handling for Action Execution

The system SHALL handle storage failures during action execution with clear, actionable error messages, retry logic for transient failures, and graceful handling of corrupted data.

#### Scenario: S3 authentication failure
- **GIVEN** S3 credentials are invalid or expired
- **WHEN** the action attempts to download the database
- **THEN** it provides a clear error message indicating authentication failure with guidance on checking credentials, and exits with failure

#### Scenario: Missing S3 bucket
- **GIVEN** the configured S3 bucket does not exist
- **WHEN** the action attempts to access it
- **THEN** it provides an error message identifying the missing bucket and suggesting verification steps

#### Scenario: Transient network failure with retry
- **GIVEN** a transient network failure occurs during upload
- **WHEN** the upload fails
- **THEN** the action retries with exponential backoff and reports if all retries are exhausted before exiting with failure

#### Scenario: Corrupted database download
- **GIVEN** a downloaded database file is corrupted
- **WHEN** the action attempts to open it
- **THEN** it handles the error gracefully with options to recreate or restore from backup

#### Scenario: Distinguish recoverable and permanent errors
- **GIVEN** an error occurs during storage operations
- **WHEN** the error is evaluated
- **THEN** the action distinguishes between recoverable errors (network issues, timeouts) which trigger retries, and permanent failures (invalid credentials, missing bucket) which fail immediately

---

### Requirement: Data Preservation

The action SHALL prioritize data preservation — the database SHALL be persisted to storage even when subsequent phases (report generation) fail.

#### Scenario: Database persisted before report generation
- **GIVEN** metric collection completes successfully
- **WHEN** the database is uploaded to storage before report generation begins
- **THEN** the upload completes successfully and the database is safely stored regardless of report generation outcome

#### Scenario: Database preserved on upload failure
- **GIVEN** the database has been modified by metric collection
- **WHEN** upload to remote storage fails
- **THEN** the local database file is preserved and not deleted until upload is confirmed successful

---

### Requirement: Composite Action Structure

The action SHALL be implemented as a composite GitHub Action that sets up the execution environment, runs the entrypoint, and handles report artifact output.

#### Scenario: Set up Bun runtime
- **GIVEN** the action is invoked in a workflow step
- **WHEN** the action runs
- **THEN** it sets up the Bun runtime for TypeScript execution

#### Scenario: Run entrypoint script
- **GIVEN** the environment is prepared
- **WHEN** all dependencies are installed
- **THEN** the action executes the entrypoint script that orchestrates storage, collection, and reporting

#### Scenario: Upload report as artifact
- **GIVEN** the entrypoint completes and a report file exists
- **WHEN** the action finishes
- **THEN** the generated HTML report is uploaded as a workflow artifact for subsequent download or viewing

---

### Requirement: Storage Workflow Variants

The action SHALL support both S3 and Artifact storage workflow variants, adapting phase behavior based on the configured storage type.

#### Scenario: S3 workflow with full S3 lifecycle
- **GIVEN** `storage-type` is set to `sqlite-s3`
- **WHEN** the action runs
- **THEN** it uses S3-compatible storage for database download and upload, with credentials passed as action inputs

#### Scenario: Artifact workflow with full artifact lifecycle
- **GIVEN** `storage-type` is set to `sqlite-artifact`
- **WHEN** the action runs
- **THEN** it searches for, downloads, and uploads database artifacts using the GitHub API with auto-detected `GITHUB_TOKEN` and `GITHUB_REPOSITORY`

#### Scenario: Local storage fallback
- **GIVEN** `storage-type` is set to `sqlite-local` (or omitted)
- **WHEN** the action runs
- **THEN** it uses local file storage for the database without any download or upload operations

---

## REMOVED Requirements

### Requirement: (Scenario) Install external tools

**Reason**: The `loc` collector now uses an embedded JavaScript library (`sloc`) and no longer requires the SCC binary. All metric collectors are self-contained within the Bun runtime.

**Migration**: Remove any workflow steps that install SCC (e.g., `brew install scc` or manual binary downloads) before invoking the track-metrics action. No user configuration changes are required.

---

## Edge Cases

- What happens when the workflow is cancelled mid-execution during database upload?
- What happens when multiple workflow runs execute concurrently and try to download/upload the same database?
- What happens when S3 credentials expire mid-workflow (during long metric collection)?
- What happens when the database file grows large (100MB+) and upload takes significant time?
- What happens when running in a forked repository with different artifact access rules?
- What happens when `GITHUB_TOKEN` lacks permissions to access artifacts?
- What happens when GitHub API rate limiting prevents artifact search or download?
- What happens when artifact retention policy has expired old artifacts?
- What happens when switching between different storage backends (data migration)?

## Assumptions

- GitHub Actions workflow has necessary permissions to access GitHub Secrets for passing S3 credentials
- S3 storage endpoint is accessible from GitHub Actions runners (not behind restrictive firewalls)
- Database files remain under 50MB for reasonable upload/download performance
- S3 credentials provided as action parameters have sufficient validity duration to complete the entire workflow
- Users already have working metric collection configuration (`unentropy.json`)
- Network connectivity between GitHub Actions runners and remote storage endpoints is generally reliable (99%+ uptime)
- The `@actions/github` package is available for GitHub API operations
- Bun runtime is compatible with the GitHub Actions runner environment

## Dependencies

- GitHub Actions workflow execution environment
- Bun runtime for TypeScript execution in GitHub Actions
- Existing Unentropy metric collection and report generation functionality (from `metrics/` and `reporting/` specs)
- Storage Provider interface and implementations (from `storage/` spec)
- `@actions/github` package for GitHub API client
- GitHub Secrets for secure S3 credential storage
- GitHub Token for artifact access (auto-detected from environment)
- SQLite support via bun:sqlite for database operations

## Scope Boundaries

### In Scope

- Single composite GitHub Action for complete metrics workflow
- Storage initialization (download or create database) before metric collection
- Metric collection execution after storage is initialized
- Database persistence (upload to remote or no-op for local) after collection
- Report generation as the final phase
- Error handling for storage authentication, connectivity, and data integrity issues
- Retry logic with exponential backoff for transient failures
- Data preservation: database persisted even if report generation fails
- Support for all three storage types: `sqlite-local`, `sqlite-artifact`, `sqlite-s3`
- Phase-level progress logging for CI visibility
- Action inputs and outputs as defined in the action interface contract
- First-run scenario handling (no existing database/artifact)

### Out of Scope

- Storage backend implementation details (see `storage/` spec)
- Metric definition, template, or collection logic (see `metrics/` spec)
- Report generation layout, templates, or visualization internals (see `reporting/` spec)
- Quality gate evaluation or PR commenting (see `quality-gates/` spec)
- Configuration file schema beyond action input overrides
- Advanced concurrency control with distributed locking mechanisms
- Bandwidth throttling or transfer rate limiting
- Custom S3 request signing mechanisms beyond standard SDK support
- Cross-repository artifact access
- Artifact cleanup or retention policy management

## Foundational Contracts

| Contract | Location | Referenced By |
|----------|----------|---------------|
| Action Interface | `contracts/action-interface.md` | — |
