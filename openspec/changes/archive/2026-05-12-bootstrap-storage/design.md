## Context

This change consolidates storage-related behavior from spec-kit 001 and 003 into a single OpenSpec domain.

The behavior spans two original specs:

- **001-metrics-tracking-poc**: Local file-based SQLite storage, database schema, storage provider interface (User Story 3, FR-006-FR-011)
- **003-unified-s3-action**: S3-compatible storage, GitHub Artifacts storage, unified action workflow, error handling for remote storage (User Stories 1-3, FR-001-FR-048)

The implementation is already complete and in active use. This is a retroactive specification.

## Goals / Non-Goals

**Goals:**

- Establish `openspec/specs/storage/` as the canonical behavior specification for database persistence and storage provider selection
- Create discrete contracts for the storage config schema, storage provider interface, and database schema
- Consolidate storage behavior scattered across two spec-kit documents
- Enable future storage-related changes to use OpenSpec delta specs

**Non-Goals:**

- Modify any implementation code
- Add new storage backends beyond the existing three (local, artifact, S3)
- Change the configuration schema or storage provider interface

## Decisions

### Decision: Single Domain Spec

**Chosen**: Merge 001 (local storage, database schema) and 003 (artifact/S3 storage) into a single `storage/` domain.

**Rationale**: Both describe the same capability — where and how to persist the metrics database. Storage backend selection, local storage, artifact storage, and S3 storage are all facets of the same concern. Splitting them would create artificial boundaries.

**Alternative**: Keep 001 and 003 as separate specs — rejected because it preserves the legacy chronological structure rather than organizing by behavior.

### Decision: Action Workflow Out of Scope

**Chosen**: The storage spec describes storage behavior only. The unified action workflow orchestration (download → collect → upload → report) belongs in the `actions/track-metrics/` spec.

**Rationale**: Storage providers are used by actions, but the orchestration logic is a separate concern. The storage domain owns provider interfaces, configuration, and schema — not workflow sequencing.

### Decision: Database Schema as Storage Contract

**Chosen**: The database schema contract lives in the storage domain.

**Rationale**: The SQLite schema defines how metrics data is persisted. It is consumed by storage providers (for schema creation), quality gates (for baseline queries), and reporting (for time-series queries).

## Risks / Trade-offs

- [Risk] Database schema changes affect multiple consumers (quality-gates, reporting) → Mitigation: Foundational Contracts table explicitly lists all consumers
- [Risk] Cross-domain references (e.g., action parameters reference storage types) are hard to trace → Mitigation: Contracts explicitly list referenced domains
- [Risk] Storage provider interface is referenced by action orchestration code → Mitigation: Interface contract is kept stable; actions depend on the interface, not implementations

## Contracts Referenced

- `contracts/config-schema.md` — storage block of `unentropy.json`
- `contracts/storage-provider-interface.md` — provider interface and implementations
- `contracts/database-schema.md` — SQLite schema and migration mechanism

## File Changes

No source code changes.

## Open Questions

None.
