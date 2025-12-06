# Implementation Plan: Metrics Tracking PoC

**Branch**: `001-metrics-tracking-poc` | **Date**: Thu Oct 16 2025 | **Spec**: [spec.md](./spec.md)
**Status**: Implemented

## Summary

This plan covers the foundational proof-of-concept for the Unentropy metrics tracking system. It establishes core capabilities: configuration management with validation, SQLite-based metric persistence with a three-layer storage architecture, and self-contained HTML report generation with Chart.js visualizations.

**Note**: The original 3-action architecture (collect-metrics, generate-report, find-database) has been superseded by the unified `track-metrics` action defined in spec 003. This plan documents the core platform implementation that subsequent specs build upon.

## Technical Context

**Language/Version**: TypeScript 5.x / Bun 1.2.x (matches existing project setup and constitution requirements)  
**Primary Dependencies**: 
- `bun:sqlite` for database operations (Bun native)
- `@actions/core` and `@actions/github` for GitHub Actions integration
- Chart.js (via CDN) for HTML report visualizations
- `zod` for configuration validation
- `yargs` v18.x for command-line argument parsing and help generation
- `@types/yargs` for TypeScript support in CLI development

**Storage**: SQLite database file stored as GitHub Actions artifact (persisted across workflow runs)  
**Testing**: Existing test setup (bun test with unit and integration tests)  
**Target Platform**: GitHub Actions runners (Ubuntu latest, Bun 1.2.x)  
**Project Type**: Single project (CLI tool / library with GitHub Action wrapper)  
**Performance Goals**: 
- Configuration validation: <100ms for typical configs
- CLI verification command: <2 seconds for typical configuration files
- Database artifact download: <15 seconds (including API calls)
- Metric collection: <30 seconds total overhead per CI run
- Report generation: <10 seconds for 100 data points

**Constraints**: 
- Must be serverless (no external services)
- Single-file HTML output (no separate assets)
- Database must handle concurrent writes from parallel jobs
- Zero configuration for standard use cases
- Uses Bun runtime for both local development and GitHub Actions
- Database persistence via GitHub Actions artifacts (no external storage)

**Scale/Scope**: 
- Support 50+ concurrent workflow runs
- Handle 1000+ metric data points per repository
- Support 10+ custom metrics per project
- Self-monitoring implementation: 2 metrics (test coverage, LoC) for demonstration (User Story 4)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. Serverless Architecture
**Status**: PASS  
**Justification**: All components run within GitHub Actions. SQLite database stored as artifact (no external database service). HTML reports generated locally. No servers required.

### ✅ II. Technology Stack Consistency
**Status**: PASS  
**Justification**: Using Bun runtime with TypeScript as required by constitution. SQLite for storage (as specified). Chart.js for visualization (as specified in dependencies). Bun as package manager. Bun runtime is used consistently for both local development and GitHub Actions.

### ✅ III. Code Quality Standards
**Status**: PASS  
**Justification**: Will use existing TypeScript strict mode, Prettier config, and ESLint setup. Following existing patterns from `src/lib/` structure.

### ✅ IV. Security Best Practices
**Status**: PASS  
**Justification**: No secrets handling required for MVP. Database contains only metric data (no sensitive information). User-provided metric collection commands run in isolated CI environment.

### ✅ V. Testing Discipline
**Status**: PASS  
**Justification**: Will implement unit tests for configuration parsing, database operations, and report generation. Integration tests for end-to-end workflow. Contract tests for GitHub Action interface.

### ✅ Additional Constraints
**Status**: PASS  
**Justification**: Lightweight implementation. Self-contained with no external service dependencies beyond GitHub Actions. Compatible with standard CI/CD environments.

**Overall Gate Status**: ✅ PASS - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```
specs/001-metrics-tracking-poc/
 ├── plan.md              # This file
 ├── research.md          # Technical decisions and research
 ├── data-model.md        # Entity definitions and storage architecture
 ├── quickstart.md        # Acceptance test scenarios
 ├── contracts/           # Interface contracts (referenced by other specs)
 │   ├── config-schema.md              # unentropy.json schema
 │   ├── database-schema.md            # SQLite table definitions
 │   ├── storage-provider-interface.md # Storage provider contract (extensibility)
 │   ├── html-report-template.md       # Report template contract
 │   └── visual-acceptance-criteria.md # Visual testing checklist
 └── tasks.md             # Implementation tasks (completed)
```

### Source Code (repository root)

```
 src/
 ├── cli/
 │   ├── cmd/
 │   │   ├── cmd.ts          # Command builder utility
 │   │   └── verify.ts       # CLI verification command
 │   └── index.ts            # CLI entrypoint
 ├── config/
 │   ├── schema.ts           # Zod schema for unentropy.json
 │   └── loader.ts           # Config file reading and validation
 ├── storage/
 │   ├── providers/
 │   │   ├── interface.ts    # StorageProvider interface + config types
 │   │   ├── factory.ts      # createStorageProvider() factory function
 │   │   ├── sqlite-local.ts # SqliteLocalStorageProvider (local file)
 │   │   └── sqlite-s3.ts    # SqliteS3StorageProvider (S3-compatible)
 │   ├── adapters/
 │   │   ├── interface.ts    # DatabaseAdapter interface
 │   │   └── sqlite.ts       # SqliteDatabaseAdapter implementation
 │   ├── storage.ts          # Storage orchestrator (coordinates provider + adapter + repository)
 │   ├── repository.ts       # MetricsRepository (domain operations: recordBuild, getMetricComparison)
 │   ├── migrations.ts       # Schema initialization
 │   ├── queries.ts          # Low-level SQL query functions (used by adapter)
 │   └── types.ts            # Database entity types
 ├── collector/
 │   ├── runner.ts           # Execute metric collection commands
 │   ├── collector.ts        # Main collection orchestration
 │   └── context.ts          # Build context extraction (git SHA, etc.)
 ├── reporter/
 │   ├── generator.ts        # HTML report generation
 │   ├── charts.ts           # Chart.js configuration builder
 │   └── templates/          # HTML component templates (TSX)
 ├── actions/
 │   ├── collect.ts          # GitHub Action entrypoint for collection
 │   ├── report.ts           # GitHub Action entrypoint for reporting
 │   ├── find-database.ts    # GitHub Action for artifact discovery
 │   └── track-metrics.ts    # GitHub Action combining collection + reporting
 └── index.ts                # Main library exports

tests/
 ├── unit/
 │   ├── config/             # Configuration validation tests
 │   ├── storage/            # Storage provider and database tests
 │   ├── collector/          # Collection logic tests
 │   └── reporter/           # Report generation tests
 ├── integration/
 │   ├── end-to-end.test.ts  # Full workflow tests
 │   └── fixtures/           # Test data and configs
 └── contract/
     └── action.test.ts      # GitHub Action interface tests

.github/
 ├── actions/
 │   ├── collect-metrics/
 │   │   ├── action.yml      # GitHub Action definition (collection)
 │   │   └── dist/           # Compiled action code
 │   └── generate-report/
 │       ├── action.yml      # GitHub Action definition (reporting)
 │       └── dist/           # Compiled action code
 └── workflows/
     └── ci.yml              # Updated to include self-monitoring steps

unentropy.json               # Self-monitoring configuration (test coverage + LoC)
```

**Structure Decision**: Using single project structure as this is a CLI tool/library with GitHub Action wrappers. All components are TypeScript/Bun. Clear separation of concerns follows a layered architecture:

1. **CLI Layer** (`cli/`): Command-line interface with yargs for argument parsing and help generation
2. **Configuration Layer** (`config/`): Schema validation and file loading
3. **Storage Layer** (`storage/`): Three-layer separation of concerns:
   - **Providers** (`providers/`): Database lifecycle & location (WHERE to store)
   - **Adapters** (`adapters/`): Query execution engine (WHAT queries to run)
   - **Repository** (`repository.ts`): Domain operations (WHY - business logic)
   - **Storage** (`storage.ts`): Orchestration layer that coordinates provider, adapter, and repository
4. **Collection Layer** (`collector/`): Metric extraction and command execution
5. **Reporting Layer** (`reporter/`): HTML generation and visualization
6. **Action Layer** (`actions/`): GitHub Actions entrypoints

This architecture enables independent testing of each layer and future extensibility (e.g., PostgreSQL adapter, alternative storage providers).

**Storage Architecture**: The `storage/` directory implements a three-layer separation:

1. **StorageProvider** (`providers/`): Manages database lifecycle and storage location (local file, S3, GitHub Artifacts). Handles initialization, open/close, and persistence.
2. **DatabaseAdapter** (`adapters/`): Abstracts database query execution. SQLite adapter provides SQL-based operations; future PostgreSQL adapter would provide Postgres-specific queries.
3. **MetricsRepository** (`repository.ts`): Exposes domain-specific operations (`recordBuild()`, `getMetricComparison()`) that use the adapter internally.
4. **Storage** (`storage.ts`): Orchestrates the three layers, providing a unified API.

This separation enables:
- Future database engines (PostgreSQL) via new adapters
- Alternative storage locations (S3, Artifacts) via new providers
- Clean business logic in repository without coupling to SQL or storage details
- Independent testing of each layer

Provider naming: `<database-engine>-<storage-location>` (e.g., `sqlite-local`, `sqlite-s3`). See `contracts/storage-provider-interface.md` and `contracts/database-adapter-interface.md` for detailed contracts.

## Foundational Contracts

This PoC establishes contracts that are referenced by subsequent specs:

| Contract | Purpose | Referenced By |
|----------|---------|---------------|
| Configuration Schema | unentropy.json validation | All specs |
| Database Schema | SQLite table definitions | 003, 004, 005, 006 |
| Storage Provider Interface | Three-layer architecture | 003 |
| HTML Report Template | Report structure | 006 |

## Future Enhancements (Out of Scope)

The following enhancements are documented here for future specs:

- **Drizzle ORM Migration**: Replace raw SQL with type-safe Drizzle schema (tracked in Roadmap)
- **Database Migrations**: Proper versioned migration system
- **Transaction Support**: Improved transaction handling for concurrent writes
- **Connection Pooling**: Better connection lifecycle management

