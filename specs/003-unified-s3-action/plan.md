# Implementation Plan: Unified S3-Compatible Storage Action

**Branch**: `003-unified-s3-action` | **Date**: Thu Nov 13 2025 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-unified-s3-action/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create a unified track-metrics GitHub Action that orchestrates the complete Unentropy metrics workflow with support for three storage backends: local file system (sqlite-local), GitHub Artifacts (sqlite-artifact), and S3-compatible storage (sqlite-s3). The action will provide full workflow automation for both S3 and artifact storage (download/search, collect, upload, report) while maintaining backward compatibility with local file storage. S3 credentials are handled securely via GitHub Action parameters; GitHub token for artifact operations is auto-detected from the environment.

## Technical Context

**Language/Version**: TypeScript with Bun runtime (per constitution)  
**Primary Dependencies**: Bun native S3 client, existing Unentropy collector and reporter modules, StorageProvider interface from spec 001  
**Storage**: Three-tier storage architecture - sqlite-local (default), sqlite-artifact (full artifact workflow), sqlite-s3 (full S3 workflow)  
**Testing**: Bun test framework (per constitution), unit/integration/contract tests for all storage providers  
**Target Platform**: GitHub Actions runners (Linux serverless environment)  
**Project Type**: Single project with modular storage provider architecture  
**Performance Goals**: Database download/upload within 30-45 seconds for 10MB files, complete workflow under 5 minutes  
**Constraints**: Serverless architecture, no external servers, <50MB database files, secure credential handling  
**Scale/Scope**: Support for 4+ S3-compatible providers, concurrent workflow handling, StorageProvider pattern for extensibility

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Serverless Architecture ✅
- **Requirement**: All components operate within GitHub Actions workflows
- **Compliance**: Unified action runs entirely in GitHub Actions, no external servers
- **Status**: PASS

### II. Technology Stack Consistency ✅
- **Requirement**: Bun runtime with TypeScript, SQLite, Chart.js
- **Compliance**: Uses existing Bun/TypeScript codebase, SQLite database, existing Chart.js reports, StorageProvider interface from spec 001
- **Status**: PASS

### III. Code Quality Standards ✅
- **Requirement**: Strict TypeScript, Prettier formatting, minimal comments
- **Compliance**: Follows existing code conventions and linting rules
- **Status**: PASS

### IV. Security Best Practices ✅
- **Requirement**: Never log/expose secrets, follow security guidelines
- **Compliance**: Credentials passed as GitHub Action parameters from Secrets, never in config files or logs
- **Status**: PASS

### V. Testing Discipline ✅
- **Requirement**: Comprehensive unit, integration, contract tests
- **Compliance**: Will follow existing test patterns for actions and storage providers, including contract tests for StorageProvider interface
- **Status**: PASS

### Additional Constraints ✅
- **Requirement**: Lightweight, self-contained, CI/CD compatible
- **Compliance**: Single action with modular storage providers, no external dependencies beyond S3 SDK
- **Status**: PASS

**Overall Status**: ✅ PASS - Ready for Phase 2 task creation

### Post-Design Re-evaluation

**Phase 0 Research**: ✅ COMPLETED
- S3 SDK selection: Bun native S3 client (zero dependencies)
- Provider compatibility: All major S3-compatible providers supported
- Security patterns: GitHub Secrets + action parameters
- Error handling: Exponential backoff, clear categorization
- Storage architecture: Three-tier approach (sqlite-local, sqlite-artifact, sqlite-s3) using StorageProvider interface from spec 001

**Phase 1 Design**: ✅ COMPLETED
- Data model: Complete entity definitions and relationships
- Contracts: GitHub Action interface fully specified, StorageProvider interface extension documented
- Quickstart: Comprehensive setup guide for all storage types
- Agent context: Updated with new technologies and storage patterns

**Constitution Compliance**: ✅ MAINTAINED
- Serverless architecture: Action runs entirely in GitHub Actions
- Technology consistency: Uses Bun/TypeScript, follows existing patterns, leverages StorageProvider interface
- Security: Credentials properly separated from configuration
- Testing: Comprehensive test strategy defined including contract tests for storage providers
- Lightweight: Single action with modular storage providers following established patterns

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── config-schema.md              # Extension of base config schema
│   ├── storage-provider-interface.md  # Extension of base storage interface
│   └── action-interface.md          # GitHub Action interface
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── actions/
│   ├── collect.ts           # Existing metric collection action
│   ├── find-database.ts     # DEPRECATED: To be removed, logic moved to sqlite-artifact provider
│   ├── report.ts            # Existing report generation action
│   └── track-metrics.ts     # Existing unified track-metrics action
├── storage/
│   ├── providers/               # Existing storage providers from spec 001
│   │   ├── sqlite-local.ts     # Existing local storage provider
│   │   ├── factory.ts         # Existing factory (to be extended)
│   │   ├── sqlite-s3.ts       # Existing S3-compatible storage provider
│   │   └── sqlite-artifact.ts  # NEW: GitHub Artifacts storage provider (migrated from find-database.ts)
│   ├── interface.ts            # Existing StorageProvider interface
│   └── storage.ts             # Existing high-level Storage class
├── config/
│   ├── loader.ts            # Existing config loading (to be extended)
│   └── schema.ts            # Existing config validation (to be extended)
├── collector/               # Existing metric collection modules
├── reporter/                # Existing report generation modules
└── database/                # Existing database operations

tests/
├── contract/
│   ├── track-metrics-config.test.ts      # Existing Track-Metrics config contract tests
│   └── track-metrics-workflow.test.ts    # NEW: Track-Metrics workflow contract tests
├── integration/
│   ├── collection.test.ts
│   ├── reporting.test.ts
│   ├── storage-selection.test.ts         # Existing storage selection tests
│   ├── s3-storage.test.ts                # NEW: S3 storage integration tests
│   └── artifact-storage.test.ts          # NEW: Artifact storage integration tests
└── unit/
    ├── storage/
    │   ├── providers/
    │   │   ├── sqlite-s3.test.ts         # Existing S3 provider unit tests
    │   │   ├── sqlite-artifact.test.ts   # NEW: Artifact provider unit tests
    │   │   └── factory.test.ts           # Existing extended factory tests
    │   └── interface.test.ts             # Existing StorageProvider interface tests
    └── actions/
        └── track-metrics.test.ts         # NEW: Track-Metrics action unit tests

.github/
└── workflows/
    ├── ci.yml
    ├── metrics.yml
    └── track-metrics-example.yml         # NEW: Example unified track-metrics workflow
```

**Structure Decision**: Single project structure following existing patterns from spec 001. Unified track-metrics action integrates with existing collector, reporter, and database modules. Storage provider pattern from spec 001 is extended with SqliteS3StorageProvider (existing) and new SqliteArtifactStorageProvider (migrated from find-database action) while maintaining backward compatibility with existing sqlite-local provider.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
