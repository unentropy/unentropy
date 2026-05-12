## Why

The track-metrics GitHub Action orchestrates the complete metrics workflow (download DB, collect metrics, upload DB, generate report) but lacks a formal OpenSpec specification. The existing spec-kit document (003-unified-s3-action) describes this behavior mixed with storage backend concerns.

## What Changes

- Create `openspec/specs/track-metrics/` as the canonical behavior specification for the track-metrics action
- Consolidate action workflow orchestration behavior from spec-kit 003 (User Story 2, FR-009-FR-014, FR-025-FR-030)
- Create `contracts/action-interface.md` defining inputs, outputs, configuration precedence, and usage patterns
- No code changes — this is a specification-only bootstrap

## Capabilities

### New Capabilities

- `track-metrics`: Composite GitHub Action that orchestrates the complete metrics workflow — storage initialization, metric collection, persistence, and report generation

### Modified Capabilities

- None (bootstrap of existing behavior)

## Impact

- Affected: `openspec/specs/track-metrics/` and related contracts
- No source code, APIs, or user-facing behavior changes
- Existing workflow configurations remain valid

### Documentation Impact

- Contracts affect: `reference/actions.md` (track-metrics section), `guides/actions.md`

## Non-goals

- Storage backend configuration or behavior (see `storage/` spec)
- Metric definition or collection logic (see `metrics/` spec)
- Report generation internals (see `reporting/` spec)
