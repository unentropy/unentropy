## Why

Unentropy has no formal specification for its core value proposition: defining and collecting code metrics. The existing spec-kit specs (001 and 005) describe this behavior but are scattered across chronological feature files and use a legacy format. This change consolidates all metric-related behavior — custom metric definition, built-in templates, and `@collect` shortcuts — into a single OpenSpec domain that serves as the source of truth.

## What Changes

- Create `openspec/specs/metrics/` as the canonical behavior specification for metric definition and collection
- Consolidate metric behavior from spec-kit 001 (custom metrics) and 005 (built-in templates, `@collect`)
- Create `contracts/config-schema.md` defining the `metrics` block of `unentropy.json`
- Create `contracts/built-in-metrics.md` defining the 6 metric templates and `@collect` syntax
- No code changes — this is a specification-only bootstrap

## Capabilities

### New Capabilities

- `metrics`: Define and collect custom code metrics via configuration, with support for built-in templates and in-process collectors

### Modified Capabilities

- None (this is a bootstrap of existing behavior)

## Impact

- Affected: `openspec/specs/metrics/` and related contracts
- No source code, APIs, or user-facing behavior changes
- Existing `unentropy.json` configurations remain valid

### Documentation Impact

- Contracts affect: `reference/config.md` (metrics section), `guides/metrics.md`
