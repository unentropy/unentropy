## Context

This change consolidates CLI-related behavior from spec-kit into OpenSpec format. The behavior spans two original specs:

- **008-init-scaffolding**: `init`, `test`, and `preview` commands with project detection, config generation, workflow guidance, and safe file handling
- **001-metrics-tracking-poc (US2)**: `verify` command for local config validation

The implementation is already complete and in active use. This is a retroactive specification.

## Goals / Non-Goals

**Goals:**

- Establish `openspec/specs/cli/` as the canonical behavior specification for all CLI commands
- Create a discrete contract for the CLI interface (command signatures, options, exit codes, output formats)
- Enable future CLI-related changes to use OpenSpec delta specs

**Non-Goals:**

- Modify any implementation code
- Add new CLI commands or flags
- Change existing command behavior or exit codes
- Alter the config schema

## Decisions

### Decision: Single CLI Domain

**Chosen**: Merge all four commands (init, test, preview, verify) into a single `cli/` domain spec.

**Rationale**: All commands share the same CLI infrastructure (yargs), operate on the same config file, and follow consistent patterns for options, exit codes, and output formatting. Splitting them would create artificial boundaries and cross-references.

**Alternative**: Separate specs per command — rejected because the shared contracts (option conventions, exit code semantics, error formatting) would need to be duplicated or cross-referenced.

### Decision: Verify Lives with CLI

**Chosen**: Include `verify` in the CLI domain rather than the metrics domain.

**Rationale**: While `verify` validates the config schema (owned by metrics), it is a CLI command invoked by users at their terminal. Its behavior is CLI-shaped (arguments, exit codes, output formatting). The config schema itself remains owned by `contracts/config-schema.md` in the metrics domain.

**Alternative**: Place `verify` in the metrics domain — rejected because it would split CLI commands across domains and duplicate CLI interface conventions.

### Decision: S3 Secrets Output Is Contract-Scoped

**Chosen**: The S3 storage output block lives in the CLI interface contract rather than the storage spec.

**Rationale**: The output is part of `init`'s console output behavior — what the user sees when they run the command. The storage domain owns the configuration schema and provider behavior, not the CLI output formatting.

## Contracts Referenced

- `contracts/cli-interface.md` — all CLI command signatures, options, exit codes, console output

## File Changes

No source code changes.

## Open Questions

None.
