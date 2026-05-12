## Why

Unentropy's storage layer — local filesystem, GitHub Artifacts, and S3-compatible backends — is fully implemented but lacks a formal OpenSpec specification. This change creates `openspec/specs/storage/` as the canonical behavior spec.

## What Changes

- Create `openspec/specs/storage/` as the canonical behavior specification for database persistence and storage provider selection
- Consolidate storage behavior from spec-kit 001 (local storage, database schema) and 003 (artifact storage, S3 storage, unified action workflow)

## Capabilities

### New Capabilities

- `storage`: Persist metrics across CI runs using local, artifact, or S3-compatible storage backends

### Modified Capabilities

- None (bootstrap of existing behavior)

## Impact

- Affected: `openspec/specs/storage/` and related contracts
- No source code changes

### Documentation Impact

- Contracts affect: `reference/config.md` (storage section), `guides/storage.md`

## Non-goals

- Quality gate baseline retrieval (see `quality-gates/` spec)
- Action workflow orchestration (see `actions/track-metrics/` spec)
