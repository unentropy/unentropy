## Why

CLI commands (init, test, preview, verify) are fully implemented but lack formal specification. The existing spec-kit specs (008-init-scaffolding and 001-metrics-tracking-poc US2) describe this behavior but use a legacy format spread across two feature files. This change creates a single `cli/` domain spec consolidating all CLI command behavior — project initialization, metric collection testing, report preview, and config verification.

## What Changes

- Create `openspec/specs/cli/` as the canonical behavior specification for all CLI commands
- Consolidate CLI behavior from spec-kit 008 (init, test, preview) and 001 US2 (verify)
- Create `contracts/cli-interface.md` defining all CLI command signatures, options, exit codes, and output formats
- No code changes — this is a specification-only bootstrap

## Capabilities

### New Capabilities

- `cli`: CLI commands for project initialization, metric collection testing, report preview, and config verification

### Modified Capabilities

- None (this is a bootstrap of existing behavior)

## Impact

- Affected: `openspec/specs/cli/` and related contracts
- No source code, APIs, or user-facing behavior changes
- Existing CLI usage and `unentropy.json` configurations remain unaffected

### Documentation Impact

- Contracts affect: `reference/cli.md`, `guides/getting-started.md`

## Non-goals

- No new CLI commands or flags
- No changes to existing command behavior or exit codes
- No changes to the config schema or metric collection logic
