# Implementation Plan: Metrics Gallery

**Branch**: `005-metrics-gallery` | **Date**: 2025-11-22 | **Updated**: 2025-12-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-metrics-gallery/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

The Metrics Gallery feature provides a curated collection of 7 metric templates that users can reference by ID (e.g., `{"$ref": "coverage"}`) with minimal configuration. Key simplifications:

- **Optional `id`**: When using `$ref`, the `id` is inherited from the template (e.g., `{"$ref": "loc"}` resolves to `id: "loc"`)
- **Optional `command`**: Metric templates with `command` don't require user-provided commands
- **`@collect` shortcut**: In-process execution of collectors (no subprocess overhead)
- **Glob support**: The `@collect size` command supports glob patterns

Users can override any property while keeping other defaults. The feature reduces configuration friction and promotes best practices for common metrics tracking scenarios.

## Technical Context

**Language/Version**: TypeScript with Bun runtime (existing project stack)  
**Primary Dependencies**: Zod (schema validation), existing Unentropy config/collector modules  
**Storage**: N/A (configuration only, uses existing SQLite via existing storage layer)  
**Testing**: Bun test (existing test infrastructure)  
**Target Platform**: GitHub Actions (serverless, existing constraint)  
**Project Type**: Single project (CLI tool with library components)  
**Performance Goals**: Configuration resolution <10ms, no impact on metric collection performance  
**Constraints**: Must maintain backward compatibility with existing custom metric configs, must work within GitHub Actions environment  
**Scale/Scope**: Initial collection of 7 metric templates, support for mixing templates and custom metrics in same config

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Serverless Architecture
✅ **PASS** - Feature operates entirely within existing GitHub Actions workflow, no external servers required. Metric templates are resolved at configuration load time.

### II. Technology Stack Consistency
✅ **PASS** - Uses Bun runtime with TypeScript (existing stack), extends existing configuration system, no new technology introduced.

### III. Code Quality Standards
✅ **PASS** - Will follow existing strict TypeScript, Prettier formatting, and code conventions. Zod schema validation for configuration consistency.

### IV. Security Best Practices
✅ **PASS** - No secrets or credentials involved. Built-in metric commands use standard utilities. User-provided overrides go through existing validation.

### V. Testing Discipline
✅ **PASS** - Will implement unit tests (metric registry, resolution logic), integration tests (config loading with built-in metric refs), and contract tests (schema validation).

**Result**: ✅ All gates pass. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── metrics/              # NEW: Gallery metrics module
│   ├── types.ts         # MetricTemplate interface and types
│   ├── registry.ts      # Built-in metric template definitions
│   ├── resolver.ts      # $ref resolution logic
│   ├── collectors/      # NEW: CLI helper format parsers
│   │   ├── coverage-lcov.ts
│   │   ├── coverage-json.ts
│   │   ├── coverage-xml.ts
│   │   └── size.ts
│   └── commands/        # Default command implementations
│       ├── coverage.ts
│       ├── size.ts
│       ├── loc.ts
│       ├── build-time.ts
│       ├── test-time.ts
│       └── dependencies-count.ts
├── cli/                 # EXISTING: Extend for collect command
│   └── cmd/
│       ├── cmd.ts       # Modify to add collect subcommand
│       └── collect.ts   # NEW: CLI helper command handler
├── config/              # EXISTING: Extend for $ref support
│   ├── loader.ts        # Modify to resolve gallery refs
│   └── schema.ts        # Extend to validate $ref syntax
├── collector/           # EXISTING: No changes needed
└── storage/             # EXISTING: No changes needed

tests/
├── unit/
│   └── metrics/         # NEW: Gallery-specific tests
│       ├── registry.test.ts
│       ├── resolver.test.ts
│       ├── collectors/
│       │   └── *.test.ts
│       └── commands/
│           └── *.test.ts
├── integration/
│   └── cli-helpers.test.ts     # NEW: CLI helper integration tests
└── contract/
    └── cli-helpers.test.ts     # NEW: CLI helper output contracts
```

**Structure Decision**: Single project structure (Option 1). New `src/metrics/` module for gallery functionality. Extends existing `src/config/` module to support `$ref` resolution. All other modules (collector, storage, reporter) remain unchanged and work with resolved metrics.

## Complexity Tracking

No constitution violations to justify. All gates pass without exceptions.

---

## Phase 0: Research ✅ COMPLETE

**Output**: [research.md](research.md)

**Key Decisions**:
- Configuration syntax: Use `$ref` property (JSON Schema convention)
- `id` field: Optional when `$ref` provided (inherits from template), required for custom metrics
- `name` field: Optional display name (inherits from template or defaults to `id`)
- `command` field: Optional when `$ref` provides `command`
- `@collect` shortcut: In-process collector execution (no subprocess)
- Override behavior: Shallow merge with user precedence
- Schema validation: Single MetricConfig interface with optional `$ref` property
- Resolution timing: During config loading, before validation
- Threshold behavior: Documented recommendations, not auto-applied
- Error messages: List available IDs on invalid reference, clear duplicate id errors

**Technologies Researched**:
- Zod schema validation patterns for discriminated unions
- Command implementations for coverage, LOC, bundle size, timing
- JSON Schema `$ref` conventions

---

## Phase 1: Design & Contracts ✅ COMPLETE

**Outputs**:
- [data-model.md](data-model.md) - Core entities and resolution process
- [contracts/config-schema.md](contracts/config-schema.md) - Extended configuration schema v2.0.0
- [contracts/built-in-metrics.md](contracts/built-in-metrics.md) - Metric template definitions
- [quickstart.md](quickstart.md) - User guide with examples

**Key Entities**:
- `MetricTemplate`: Metric template definition (id, name, description, type, unit, command)
- `MetricConfig`: Extended with optional `$ref` and `id` properties (single interface for both custom and template metrics)
- `ResolvedMetricConfig`: Fully resolved configuration after inheriting from template
- `BuiltInMetricsRegistry`: Record<string, MetricTemplate> for lookups

**Contracts Defined**:
- Configuration schema extension (backward compatible)
- 7 metric templates with commands
- Override behavior and merge strategy
- Validation rules and error messages

**Integration Points**:
- `src/config/loader.ts`: Add resolution step before validation
- `src/config/schema.ts`: Extend MetricConfig schema with optional $ref
- `src/metrics/*`: New module for gallery functionality
- `src/cli/cmd/collect.ts`: New CLI helper command handler

### Constitution Re-check (Post-Design)

#### I. Serverless Architecture
✅ **PASS** - Design confirmed: No servers, runs in GitHub Actions, config resolution at load time

#### II. Technology Stack Consistency
✅ **PASS** - Design uses: TypeScript, Bun runtime, Zod validation (all existing stack)

#### III. Code Quality Standards
✅ **PASS** - Design includes: Strict types, schema validation, follows existing patterns

#### IV. Security Best Practices
✅ **PASS** - Design ensures: No secrets, standard utilities, validated user input

#### V. Testing Discipline
✅ **PASS** - Design specifies: Unit tests (registry, resolver), integration tests (config loading), contract tests (schema)

**Final Result**: ✅ All gates pass after detailed design. Ready for Phase 2 (tasks).

---

## Next Steps

Run `/speckit.tasks` to generate implementation tasks from this plan.
