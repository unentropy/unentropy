# Implementation Plan: Init Scaffolding & Test Commands

**Branch**: `008-init-scaffolding` | **Date**: 2025-01-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-init-scaffolding/spec.md`

## Summary

Two CLI commands for onboarding and local validation:

1. **`bunx unentropy init`** - Scaffolding command that detects project type (JavaScript/TypeScript, PHP, Go, Python) based on marker files, generates a default `unentropy.json` configuration with appropriate metrics and quality gate settings, and outputs GitHub Actions workflow examples.

2. **`bunx unentropy test`** - Validation command that loads the config, runs all metric collection commands sequentially without persisting data, and reports results. Useful for verifying setup before pushing to CI.

## Technical Context

**Language/Version**: TypeScript with Bun runtime (aligned with existing codebase)
**Primary Dependencies**: yargs (CLI framework, already in use), fs/path (Node.js built-ins), existing collector infrastructure
**Storage**: N/A (this feature generates config files and runs dry-run collections, does not persist data)
**Testing**: bun test (unit tests for detector, templates, output generator, test runner)
**Target Platform**: CLI tool running on any platform with Bun installed
**Project Type**: Single project - extends existing CLI structure
**Performance Goals**: Config generation in < 5 seconds (SC-001), metric validation in < 60 seconds (SC-007)
**Constraints**: Must produce valid configurations that pass `bunx unentropy verify`
**Scale/Scope**: 4 project types, 2 commands, ~8 CLI options total, generates 1 config file + console output

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Serverless Architecture | PASS | CLI tool runs locally, no server required |
| II. Technology Stack Consistency | PASS | Uses Bun + TypeScript, follows existing CLI patterns |
| III. Code Quality Standards | PASS | Will use strict TypeScript, Prettier, minimal comments |
| IV. Security Best Practices | PASS | No secrets handled by this feature |
| V. Testing Discipline | PASS | Unit tests planned for detector, templates, output |

**Additional Constraints Check**:
- Lightweight and self-contained: PASS (no external dependencies beyond yargs)
- Runs within GitHub Actions: PASS (CLI tool, works in any environment)
- CI/CD compatible: PASS (designed to output GH Actions examples)

**All gates passed. Proceeding to Phase 0.**

## Project Structure

### Documentation (this feature)

```text
specs/008-init-scaffolding/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── cli-interface.md
│   └── config-schema.md
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── cli/
│   ├── cmd/
│   │   ├── cmd.ts           # existing - command helper
│   │   ├── collect.ts       # existing - collect subcommands
│   │   ├── verify.ts        # existing - verify command
│   │   ├── init.ts          # NEW - init command entry point
│   │   └── test.ts          # NEW - test command entry point
│   └── init/
│       ├── detector.ts      # NEW - project type detection
│       ├── templates.ts     # NEW - config templates per project type
│       └── output.ts        # NEW - workflow example generator
├── collector/
│   ├── collector.ts         # existing - metric collection logic
│   └── runner.ts            # existing - command runner (reused by test)
├── config/
│   ├── loader.ts            # existing - config loading
│   └── schema.ts            # existing - config validation
└── index.ts                 # existing - CLI entry point (add InitCommand, TestCommand)

tests/
├── unit/
│   └── cli/
│       ├── init/
│       │   ├── detector.test.ts    # NEW - detector unit tests
│       │   ├── templates.test.ts   # NEW - templates unit tests
│       │   └── output.test.ts      # NEW - output generator tests
│       └── test/
│           └── test-command.test.ts # NEW - test command unit tests
└── integration/
    ├── cli-init.test.ts            # NEW - end-to-end init tests
    └── cli-test.test.ts            # NEW - end-to-end test command tests
```

**Structure Decision**: Extends existing CLI structure under `src/cli/`. New `init/` subdirectory contains modular components (detector, templates, output) following separation of concerns. The `test` command reuses existing collector infrastructure from `src/collector/`. Tests mirror the source structure.

## Complexity Tracking

> No constitution violations identified. Table not required.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design completion.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Serverless Architecture | PASS | No servers - pure CLI file generation |
| II. Technology Stack Consistency | PASS | TypeScript, Bun, yargs - all existing |
| III. Code Quality Standards | PASS | Contracts define clear interfaces, tests planned |
| IV. Security Best Practices | PASS | No secrets in generated configs (placeholders only) |
| V. Testing Discipline | PASS | Unit + integration tests specified |

**Design adheres to all constitution principles.**

## Phase Outputs

| Phase | Artifact | Status |
|-------|----------|--------|
| Phase 0 | [research.md](./research.md) | Complete |
| Phase 1 | [data-model.md](./data-model.md) | Complete |
| Phase 1 | [contracts/cli-interface.md](./contracts/cli-interface.md) | Complete |
| Phase 1 | [contracts/config-schema.md](./contracts/config-schema.md) | Complete |
| Phase 1 | [quickstart.md](./quickstart.md) | Complete |
| Phase 2 | tasks.md | Pending (`/speckit.tasks`) |
