# Tasks: Metrics Gallery

**Input**: Design documents from `/specs/005-metrics-gallery/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Updated**: 2025-12-10
**Version**: Aligned with spec v4.0.0 (LCOV + Cobertura coverage formats only)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Current Status (2025-12-06)

### ✅ COMPLETE
- **Phase 1**: Setup (all tasks)
- **Phase 2**: Foundational infrastructure (all tasks)
- **Phase 2b**: @collect infrastructure (all tasks)
- **Phase 3**: Unit Types infrastructure (all tasks except T023)
- **Phase 4a**: User Story 1 - Ultra-minimal setup (implementation complete, tests complete ✅)
- **Phase 4b**: User Story 2 - Template references (implementation complete, tests complete ✅)
- **Phase 5**: User Story 3 - Overrides (implementation complete, tests complete ✅)

### 🚧 IN PROGRESS
- **Phase 6**: CLI helpers (LOC done, size needs glob support)
- **Phase 7**: Report integration (formatValue exists, generator integration incomplete)

### ❌ BLOCKED / NEEDS WORK
- **T036**: Post-resolution validation (needs redesign)
- **T066b-d**: Glob support for size collector (CRITICAL - blocking spec compliance)
- **T073**: Pass unit to formatValue in generator (CRITICAL - blocking proper formatting)

### 🎯 HIGH PRIORITY NEXT STEPS
1. T066b-d: Implement glob support for size collector
2. T073: Complete report generator unit integration
3. T023: Add UnitType validation tests
4. ~~T024h-j: Add tests for id/command/name inheritance~~ ✅ DONE (2025-12-06)
5. ~~T044-T048: Add tests for override functionality~~ ✅ DONE (2025-12-06)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US0, US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- Single project: `src/`, `tests/` at repository root

## Key Spec Changes (v4.0.0)

- **Object-based metrics config**: Metrics are defined as `Record<string, MetricConfig>` where object keys ARE the metric IDs
- **Object key = metric id**: `"my-loc": { "$ref": "loc" }` creates a metric with id "my-loc"
- **Optional `command`**: When `$ref` has default `command`, user command is optional
- **`@collect` shortcut**: In-process execution of collectors via `bun src/index.ts collect <args>`
- **Glob support**: `@collect size` supports glob patterns (e.g., `./dist/*.js`)
- **No coverage default**: Coverage metrics require explicit command (too technology-specific)
- **MetricTemplate**: Includes `id`, `name`, `description`, `type`, `unit`, `command?`
- **Property inheritance**: User config overrides template defaults via nullish coalescing (??)
- **Coverage formats**: Only LCOV and Cobertura supported (removed coverage-json, coverage-xml)
- **Coverage --type option**: Both coverage collectors support `--type line|branch|function`
- **6 metric templates**: Removed `function-coverage` (use `--type function` option instead)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and module structure for metrics gallery

- [x] T001 Create metrics module directory structure at src/metrics/
- [x] T002 [P] Create metrics types file at src/metrics/types.ts
- [x] T003 [P] Create CLI collect command file at src/cli/cmd/collect.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core registry and resolution infrastructure that MUST be complete before ANY user story can be implemented

**Warning**: No user story work can begin until this phase is complete

- [x] T004 Create MetricTemplate interface in src/metrics/types.ts
  - Define UnitType in src/metrics/types.ts
  - Define unit field as: unit?: UnitType (semantic type, not string)
  - Include fields: id, name, description, type, unit?, command?
- [x] T005 Create metric templates registry structure in src/metrics/registry.ts
- [x] T006 Create resolver module skeleton in src/metrics/resolver.ts
- [x] T007 Extend MetricConfig schema to support optional $ref in src/config/schema.ts
- [x] T007a [NEW] ~~Update MetricConfig schema to make id optional when $ref provided in src/config/schema.ts~~
  - NOT APPLICABLE: v3.0.0 uses object keys as IDs (no id field in schema)
  - Object keys are inherently unique (JavaScript object property behavior)
  - IMPLEMENTED: MetricConfigSchema has no id field (src/config/schema.ts:27-58)

**Checkpoint**: Foundation ready - unit types phase can now begin

---

## Phase 2b: @collect Infrastructure (NEW)

**Purpose**: Enable simple execution of collectors via @collect shortcut by delegating to existing CLI

- [x] T007b [NEW] Add @collect transformation to runCommand in src/collector/runner.ts
  - Detect commands starting with "@collect "
  - Transform to "bun src/index.ts collect <args>"
  - Execute transformed command via existing shell infrastructure
  - Total implementation: 7 lines of code

- [x] T007c [NEW] Add glob expansion support to size collector in src/metrics/collectors/size.ts
  - Use Bun.Glob for pattern expansion
  - Sum sizes of all matched files
  - Fail if pattern matches no files

- [x] T007d [NEW] Add unit tests for @collect transformation in tests/unit/collector/runner.test.ts
  - Test @collect loc command transformation
  - Test @collect size with multiple files
  - Test @collect with complex arguments (flags, multiple values)

**Checkpoint**: @collect infrastructure ready - commands delegate to CLI with zero duplication

---

## Phase 3: Unit Types Infrastructure

**Purpose**: Implement semantic unit types for consistent value formatting across HTML reports and PR comments

**Warning**: Unit types must be complete before built-in metrics can be defined with correct units

### Unit Type Implementation

- [x] T008 [P] Create UnitType type definition in src/metrics/types.ts
  - Define: type UnitType = 'percent' | 'integer' | 'bytes' | 'duration' | 'decimal'
  - Export type for use across codebase

- [x] T009 Create formatValue function in src/metrics/unit-formatter.ts
  - Function signature: formatValue(value: number | null, unit: UnitType | null): string
  - Handle null values returning "N/A"
  - Implement percent formatting: 1 decimal, append %
  - Implement integer formatting: no decimals, thousands separator
  - Implement decimal formatting: 2 decimals
  - Call formatBytes for bytes unit
  - Call formatDuration for duration unit

- [x] T010 [P] Implement formatBytes helper in src/metrics/unit-formatter.ts
  - Auto-scale: B -> KB -> MB -> GB (thresholds at 1024)
  - Show 1 decimal for KB/MB/GB, 0 for B
  - Examples: "500 B", "1.5 KB", "2.3 MB", "1.1 GB"

- [x] T011 [P] Implement formatDuration helper in src/metrics/unit-formatter.ts
  - Input is seconds
  - Auto-scale: < 1s -> ms, < 60s -> s, < 3600s -> m+s, else h+m
  - Examples: "500ms", "45s", "1m 30s", "1h 5m"

- [x] T012 Implement formatDelta function in src/metrics/unit-formatter.ts
  - Function signature: formatDelta(delta: number, unit: UnitType | null): string
  - Apply same formatting rules as formatValue
  - Prefix with + or - sign
  - Examples: "+2.5%", "-256 KB", "+1m 15s"

- [x] T013 [P] Implement formatInteger helper in src/metrics/unit-formatter.ts
  - No decimal places
  - US locale thousands separator (1,234,567)

- [x] T014 Export formatting functions in src/metrics/index.ts
  - Export formatValue, formatDelta, formatInteger, formatBytes, formatDuration from unit-formatter.ts

### Unit Type Validation

- [x] T015 Add UnitTypeSchema to src/config/schema.ts
  - z.enum(["percent", "integer", "bytes", "duration", "decimal"])
  - Clear error message: "unit must be one of: percent, integer, bytes, duration, decimal"

- [x] T016 Update MetricConfigSchema.unit to use UnitTypeSchema in src/config/schema.ts
  - Replace z.string().max(10) with UnitTypeSchema
  - Maintain optional behavior

### Unit Type Tests

- [x] T017 [P] Add unit tests for formatValue with percent in tests/unit/metrics/unit-formatter.test.ts
  - Test 85.5 -> "85.5%"
  - Test 100 -> "100%"
  - Test 0 -> "0%"

- [x] T018 [P] Add unit tests for formatValue with integer in tests/unit/metrics/unit-formatter.test.ts
  - Test 1234 -> "1,234"
  - Test 1234567 -> "1,234,567"
  - Test 0 -> "0"

- [x] T019 [P] Add unit tests for formatBytes in tests/unit/metrics/unit-formatter.test.ts
  - Test 500 -> "500 B"
  - Test 1536 -> "1.5 KB"
  - Test 1572864 -> "1.5 MB"
  - Test 1610612736 -> "1.5 GB"

- [x] T020 [P] Add unit tests for formatDuration in tests/unit/metrics/unit-formatter.test.ts
  - Test 0.5 -> "500ms"
  - Test 45 -> "45s"
  - Test 90 -> "1m 30s"
  - Test 3665 -> "1h 1m"

- [x] T021 [P] Add unit tests for formatDelta in tests/unit/metrics/unit-formatter.test.ts
  - Test positive percent: +2.5 -> "+2.5%"
  - Test negative bytes: -262144 -> "-256 KB"
  - Test positive integer: +150 -> "+150"

- [x] T022 [P] Add unit tests for null handling in tests/unit/metrics/unit-formatter.test.ts
  - Test formatValue(null, "percent") -> "N/A"
  - Test formatValue(null, null) -> "N/A"

- [ ] T023 Add unit tests for UnitType validation in tests/unit/config/schema.test.ts
  - Test valid units pass: "percent", "integer", "bytes", "duration", "decimal"
  - Test invalid unit fails with clear error message
  - Test missing unit is allowed (optional)

**Checkpoint**: Unit types infrastructure complete - metric templates can now use semantic units

---

## Phase 4a: User Story 1 - Ultra-minimal setup (Priority: P1) [NEW]

**Goal**: Enable developers to use metric templates with absolute minimal configuration: `{ "$ref": "loc" }`. The id is inherited from the template, and templates with command need no user command.

**Independent Test**: Add `{ "$ref": "loc" }` to unentropy.json, run metrics collection, verify LOC is collected using inherited id and default command.

### Implementation for User Story 1

- [x] T024a [NEW] [US1] Update MetricTemplate to include command field in src/metrics/types.ts
  - Optional field: command?: string
  - Used when user doesn't provide command

- [x] T024b [NEW] [US1] Add command to loc metric in src/metrics/registry.ts
  - command: "@collect loc ."

- [x] T024c [NEW] [US1] Add command to size metric in src/metrics/registry.ts
  - command: "@collect size ./dist"

- [x] T024d [NEW] [US1] Verify coverage metrics have NO command in src/metrics/registry.ts
  - coverage: no command (too technology-specific)
  - function-coverage: no command (too technology-specific)

- [x] T024e [NEW] [US1] Update resolver to inherit id from template in src/metrics/resolver.ts
  - If $ref provided and id not provided, use template.id
  - Validate id uniqueness after resolution
  - Error message format: "Duplicate metric id \"{id}\" found.\nWhen using the same $ref multiple times, provide explicit id values."

- [x] T024f [NEW] [US1] Update resolver to use command in src/metrics/resolver.ts
  - If $ref provided and command not provided, use template.command
  - If no command and no template.command, fail validation
  - Error message format: "Metric \"{id}\" requires a command.\nThe metric template \"{$ref}\" does not have a default command.\nYou must provide a command appropriate for your project."
  - IMPLEMENTED: src/metrics/resolver.ts:22-27

- [x] T024g [NEW] [US1] Update resolver to inherit name from template in src/metrics/resolver.ts
  - If $ref provided and name not provided, use template.name
  - If no $ref and name not provided, default to id
  - No error messages (name has sensible defaults)
  - IMPLEMENTED: src/metrics/resolver.ts:31 (name inheritance via ??)

- [x] T024h [NEW] [US1] Add unit tests for id inheritance in tests/unit/metrics/resolver.test.ts
  - Test object key becomes metric id (e.g., "my-loc": { "$ref": "loc" } resolves to id: "my-loc")
  - Test different keys with same $ref work independently
  - UPDATED: Object keys ARE the ids in v3.0.0 (no optional id field)
  - COMPLETED: 2 tests added (2025-12-06)

- [x] T024i [NEW] [US1] Add unit tests for command inheritance in tests/unit/metrics/resolver.test.ts
  - Test template with command: uses template command when user doesn't provide one
  - Test template without command: fails with clear error when user doesn't provide command
  - Test { "$ref": "coverage", "command": "..." } succeeds
  - COMPLETED: 3 tests added (2025-12-06)

- [x] T024j [NEW] [US1] Add edge case tests in tests/unit/metrics/resolver.test.ts
  - Test custom metric without type/command fails with clear error
  - Test invalid $ref fails with list of available templates
  - COMPLETED: 1 test added for property preservation (2025-12-06)

**Checkpoint**: Ultra-minimal configs like `{ "$ref": "loc" }` work. Users can track LOC with one line. (User Story 1 complete)

---

## Phase 4b: User Story 2 - Quick setup with pre-defined metrics (Priority: P2)

**Goal**: Enable developers to reference metric templates by ID (e.g., `{"$ref": "coverage", "command": "@collect coverage-lcov ..."}`) with automatic expansion to full metric definitions including units and types.

**Independent Test**: Add `{"$ref": "coverage", "command": "@collect coverage-lcov coverage/lcov.info"}` to unentropy.json, run metrics collection, verify coverage is collected with percent unit.

### Implementation for User Story 1

- [x] T024 [P] [US2] Define coverage metric template in src/metrics/registry.ts
  - unit: "percent" (UnitType)
  - NO command (too technology-specific)
- [x] ~~T025 [P] [US2] Define function-coverage metric template in src/metrics/registry.ts~~ **CANCELLED** (v4.0.0)
  - REMOVED: Use `--type function` option with coverage-lcov or coverage-cobertura instead
- [x] T026 [P] [US2] Define loc metric template in src/metrics/registry.ts
  - unit: "integer" (UnitType)
  - command: "@collect loc ."
- [x] T027 [P] [US2] Define size metric template in src/metrics/registry.ts
  - unit: "bytes" (UnitType)
  - command: "@collect size ./dist"
- [x] T028 [P] [US2] Define build-time metric template in src/metrics/registry.ts
  - unit: "duration" (UnitType)
  - NO command (too project-specific)
- [x] T029 [P] [US2] Define test-time metric template in src/metrics/registry.ts
  - unit: "duration" (UnitType)
  - NO command (too project-specific)
- [x] T030 [P] [US2] Define dependencies-count metric template in src/metrics/registry.ts
  - unit: "integer" (UnitType)
  - NO command (varies by package manager)
- [x] T031 [US2] Implement getBuiltInMetric lookup function in src/metrics/registry.ts
- [x] T032 [US2] Implement listAvailableMetricIds function in src/metrics/registry.ts
- [x] T033 [US2] Implement resolveMetricReference function in src/metrics/resolver.ts
- [x] T034 [US2] Implement validateBuiltInReference function in src/metrics/resolver.ts
- [x] T035 [US2] Add resolution step to loadConfig function in src/config/loader.ts
- [ ] T036 [US2] Add post-resolution validation in src/config/loader.ts
  - NOTE: Currently validation happens BEFORE resolution (line 29)
  - Consider adding validation after resolution to catch edge cases
  - Or redesign to validate resolved metrics instead of raw config
- [x] T037 [P] [US2] Add unit test for metric templates registry in tests/unit/metrics/registry.test.ts
- [x] T038 [P] [US2] Add unit test for resolver with valid references in tests/unit/metrics/resolver.test.ts
- [x] T039 [P] [US2] Add unit test for resolver with invalid references in tests/unit/metrics/resolver.test.ts

**Checkpoint**: At this point, User Story 2 should be fully functional and testable independently. Users can reference all 6 metric templates by ID.

---

## Phase 5: User Story 3 - Override metric template defaults (Priority: P3)

**Goal**: Enable developers to customize specific properties of metric templates (name, unit, etc.) while keeping other defaults, supporting flexible adaptation to project-specific requirements.

**Independent Test**: Reference `{"$ref": "coverage", "name": "custom-coverage", "command": "..."}` in config, verify custom name is used while other properties (unit, type) are preserved from template defaults.

**STATUS**: ✅ ALREADY IMPLEMENTED - Override functionality works via nullish coalescing in resolver.ts

### Implementation for User Story 3

- [x] T040 [US3] ~~Implement mergeMetricWithOverrides function in src/metrics/resolver.ts~~
  - NOT NEEDED: Merging already happens naturally via ?? operator in resolveMetricReference
  - IMPLEMENTED: src/metrics/resolver.ts:29-37
- [x] T041 [US3] ~~Add override validation logic in src/metrics/resolver.ts~~
  - NOT NEEDED: Schema validation handles this in MetricConfigSchema
- [x] T042 [US3] Update resolveMetricReference to support property overrides in src/metrics/resolver.ts
  - ALREADY DONE: name, description, unit, command, timeout all support overrides
  - IMPLEMENTED: src/metrics/resolver.ts:29-37
- [x] T043 [US3] Add validation for merged metric config in src/metrics/resolver.ts
  - ALREADY DONE: Schema validation ensures valid overrides
- [x] T044 [P] [US3] Add unit test for name override in tests/unit/metrics/resolver.test.ts
  - COMPLETED: Test exists from initial implementation (2025-12-06)
- [x] T045 [P] [US3] Add unit test for command override in tests/unit/metrics/resolver.test.ts
  - COMPLETED: 1 test added (2025-12-06)
- [x] T046 [P] [US3] Add unit test for unit override validation in tests/unit/metrics/resolver.test.ts
  - Test overriding unit with valid UnitType works
  - Test overriding unit with invalid value fails validation
  - COMPLETED: 2 tests added (2025-12-06)
- [x] T047 [P] [US3] Add unit test for multiple property overrides in tests/unit/metrics/resolver.test.ts
  - COMPLETED: Test exists from initial implementation (2025-12-06)
- [ ] T048 [P] [US3] Add unit test for invalid override validation in tests/unit/metrics/resolver.test.ts
  - NOTE: Schema validation tested in config/schema.test.ts; resolver-specific validation may not be needed
- [ ] T049 [US3] Add integration test for mixing template refs with overrides in tests/integration/config-overrides.test.ts
  - Test multiple metrics with different override combinations
  - Test override validation errors
- [ ] T050 [US3] Add contract test for override property validation in tests/contract/config-overrides.test.ts
  - Test all override fields work correctly
  - Test invalid overrides fail validation

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently. Users can reference metric templates with or without overrides.

---

## Phase 6: CLI Helper Implementation (Optional Enhancement)

**Purpose**: Implement CLI helpers for metric collection. These are invoked via `@collect` shortcut which runs in-process.

**Note**: The `@collect` prefix triggers in-process execution (Phase 2b). CLI commands like `unentropy collect loc` still work for manual testing but are not the primary interface.

### LOC Collector (SCC-based)

- [x] T051 [P] [CLI] Create CLI collect command structure in src/cli/cmd/collect.ts
- [x] T052 [P] [CLI] Create LocOptions interface in src/metrics/collectors/loc.ts
  - TypeScript interface with path (required), excludePatterns? (optional), languageFilter? (optional)
  - Export interface for use by collectLoc function
  - Add JSDoc documentation
- [x] T053 [P] [CLI] Define SCC output type interfaces in src/metrics/collectors/loc.ts
  - SccLanguageResult interface: Name, Lines, Code, Comments, Blanks, Complexity
  - SccOutput type as array of SccLanguageResult
  - Document "Total" entry format
- [x] T054 [CLI] Implement collectLoc function in src/metrics/collectors/loc.ts
  - Async function: async collectLoc(options: LocOptions): Promise<number>
  - Execute: scc --format json <path> [--exclude-dir patterns...]
  - Parse JSON output and extract Code field from Total entry
  - Handle language filtering by finding matching language entry
  - Error handling: SCC unavailable, invalid path, missing Total, parsing failures
  - Return numeric LOC count
- [x] T055 [CLI] Add loc subcommand handler to src/cli/cmd/collect.ts
   - Command: "loc <path>"
   - Positional: path (required directory)
   - Options: --exclude (array), --language (string)
   - Handler calls collectLoc and outputs result to stdout
   - Register with yargs in CLI structure

### LOC Collector Tests

- [ ] T056 [P] [CLI] Add unit tests for LocOptions validation in tests/unit/metrics/collectors/loc.test.ts
  - Test valid option combinations compile
  - Test optional properties work correctly
  - Test TypeScript strict mode passes
- [ ] T057 [P] [CLI] Add unit tests for SCC output parsing in tests/unit/metrics/collectors/loc.test.ts
  - Test parsing valid SCC output with Total entry
  - Test error when Total entry missing
  - Test error on invalid JSON
  - Test multiple language entries handled correctly
- [ ] T058 [P] [CLI] Add unit tests for collectLoc with basic path in tests/unit/metrics/collectors/loc.test.ts
  - Test returns numeric value for valid directory
  - Test returns value >= 0
  - Test works with relative paths
  - Test works with absolute paths
  - Test idempotent (same result on multiple calls)
- [ ] T059 [P] [CLI] Add unit tests for collectLoc with excludePatterns in tests/unit/metrics/collectors/loc.test.ts
  - Test single exclude pattern passed to SCC
  - Test multiple exclude patterns handled
  - Test empty excludes array handled gracefully
  - Test excluded directories reduce count
- [ ] T060 [P] [CLI] Add unit tests for collectLoc with language filtering in tests/unit/metrics/collectors/loc.test.ts
  - Test language filter returns language-specific count
  - Test invalid language throws error
  - Test error message lists available languages
  - Test language count <= total count
- [ ] T061 [P] [CLI] Add unit tests for collectLoc error handling in tests/unit/metrics/collectors/loc.test.ts
  - Test SCC unavailable error with installation guidance
  - Test directory not found error
  - Test permission denied error
  - Test SCC returns no metrics error
  - Test malformed SCC JSON error
- [x] T062 [CLI] Add integration tests for "collect loc" CLI command in tests/integration/cli-loc-collector.test.ts
  - Use dedicated fixture: tests/fixtures/loc-collector/
  - Test: unentropy collect loc ./tests/fixtures/loc-collector/src/
  - Test: unentropy collect loc ./tests/fixtures/loc-collector/src/ --exclude dist node_modules
  - Test: unentropy collect loc ./tests/fixtures/loc-collector/ --language TypeScript
  - Test: unentropy collect loc ./tests/fixtures/loc-collector/src/ --exclude dist --language TypeScript
  - Test output is numeric and deterministic across runs on same fixture
  - Test exit code 0 on success
- [ ] T063 [CLI] Add CLI error handling tests in tests/integration/cli-loc-collector.test.ts
  - Test missing required path argument error
  - Test invalid flag format error
  - Test --help displays all options
  - Test unknown flag rejected
  - Test invalid directory error
  - Test exit code non-zero on error

### LOC Contract Tests

- [ ] T064 [P] [CLI] Add contract test for loc metric reference in tests/contract/loc-metrics.test.ts
  - Test {"$ref": "loc"} resolves correctly
  - Test resolved metric has type: "numeric"
  - Test resolved metric has unit: "integer" (UnitType)
  - Test can override name, description, unit (must be valid UnitType)
  - Test configuration validation passes
  - Test multiple LOC references with different names work
- [ ] T065 [P] [CLI] Add contract test for LOC CLI helper output format in tests/contract/loc-metrics.test.ts
  - Test output is numeric integer
  - Test output is non-negative
  - Test output is reasonable (> 100 for unentropy repo)
  - Test output integrates with metric collection
  - Test value persists in storage
- [ ] T066 [CLI] Update loc metric template in src/metrics/registry.ts with SCC command reference
  - Update description to: "Total lines of code in the codebase (excluding blanks and comments)"
  - Update command example to: "unentropy collect loc ./src/"
  - Add comment explaining SCC-based collection
  - Verify registry compiles correctly

### Size Collector with Glob Support

- [x] T066a [CLI] Implement size collector in src/metrics/collectors/size.ts (existing parseSize)
- [ ] T066b [NEW] [CLI] **PRIORITY** Add glob pattern expansion to size collector in src/metrics/collectors/size.ts
  - Use Bun.Glob for pattern matching
  - Sum sizes of all matched files
  - Support patterns like: ./dist/*.js, .github/actions/*/dist/*.js
  - Fail with error if pattern matches no files (no fallback to 0)
  - REQUIRED FOR: spec v3.0.0 compliance

- [ ] T066c [NEW] [CLI] **PRIORITY** Add unit tests for size collector glob support in tests/unit/metrics/collectors/size.test.ts
  - Test single file path works
  - Test glob pattern expands correctly
  - Test multiple matches are summed
  - Test no matches throws error

- [ ] T066d [NEW] [CLI] **PRIORITY** Add size subcommand handler to src/cli/cmd/collect.ts
  - Command: "size <paths...>"
  - Positional: paths (required, supports globs)
  - Options: --followSymlinks
  - Handler calls parseSize/glob expansion and outputs result
  - REQUIRED FOR: @collect size with glob patterns

### Coverage Collectors

- [x] T067 [P] [CLI] Implement coverage-lcov parser in src/metrics/collectors/lcov.ts
- [x] T067a [NEW] [CLI] Add --type option to coverage-lcov in src/metrics/collectors/lcov.ts
  - Support `--type line` (default), `--type branch`, `--type function`
  - Extract appropriate coverage percentage from LCOV data
  - COMPLETED: 2025-12-10
- [x] ~~T068 [P] [CLI] Implement coverage-json parser~~ **CANCELLED** (v4.0.0)
  - REMOVED: Only LCOV and Cobertura formats supported
- [x] T069 [P] [CLI] Implement coverage-cobertura parser in src/metrics/collectors/cobertura.ts
  - Parse Cobertura XML format (common with Istanbul, coverage.py, etc.)
  - Support `--type line` (default): Extract `line-rate` attribute
  - Support `--type branch`: Extract `branch-rate` attribute
  - Support `--type function`: Calculate from `<method>` elements
  - Return percentage as 0-100 value (multiply rate by 100)
- [x] T069a [NEW] [CLI] Add coverage-cobertura CLI command in src/cli/cmd/collect.ts
  - Command: "coverage-cobertura <sourcePath>"
  - Options: --type (line|branch|function), --fallback
- [ ] T070 [P] [CLI] Add integration tests for CLI helpers in tests/integration/cli-helpers.test.ts
- [ ] T071 [P] [CLI] Add contract tests for CLI helper outputs in tests/contract/cli-helpers.test.ts

### @collect Integration Tests

- [ ] T071a [NEW] [CLI] Add integration tests for @collect in-process execution in tests/integration/collect-shortcut.test.ts
  - Test @collect loc ./src returns numeric value
  - Test @collect size ./dist returns numeric value
  - Test @collect size ./dist/*.js with glob works
  - Test @collect coverage-lcov coverage/lcov.info works
  - Test @collect coverage-lcov coverage/lcov.info --type branch works
  - Test @collect coverage-cobertura coverage.xml works
  - Test @collect coverage-cobertura coverage.xml --type function works
  - Test @collect unknown fails with available collectors list
  - Test @collect executes faster than equivalent shell command

**Checkpoint**: LOC, size, and coverage collectors complete. @collect shortcut works for in-process execution.

---

## Phase 7: Report Integration

**Purpose**: Integrate unit type formatting into HTML reports and PR comments

### HTML Report Updates

- [x] T072 Update formatValue in src/reporter/templates/default/components/formatUtils.ts
  - Import formatValue from src/metrics/unit-formatter.ts
  - Replace existing implementation with unit-aware version
  - IMPLEMENTED: src/reporter/templates/default/components/formatUtils.ts

- [ ] T073 **PRIORITY** Update report generator to pass unit to formatValue in src/reporter/generator.ts
  - Ensure unit from metric definition is passed to formatting functions
  - CRITICAL FOR: Consistent unit formatting across reports
  - Currently may not be fully integrated

- [ ] T074 Add visual test for unit formatting in tests/fixtures/visual-review/
  - Add metrics with each unit type to fixture
  - Verify display in generated HTML report
  - Validate: percent, integer, bytes, duration, decimal all format correctly

**Checkpoint**: HTML reports now use semantic unit formatting

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T075 [P] Add JSDoc documentation to all public functions in src/metrics/unit-formatter.ts
- [ ] T076 [P] Add JSDoc documentation to all public functions in src/metrics/
- [ ] T077 [P] Add error message improvements with available template IDs in src/metrics/resolver.ts
- [ ] T078 [P] Update root-level unentropy.json to use metric template reference as example
- [ ] T079 Run build and typecheck to ensure no type errors
- [ ] T080 Run all tests to ensure full suite passes
- [ ] T081 Run quickstart.md validation with metric template examples
- [ ] T082 [US2] Enhance validateBuiltInReference with available IDs list in src/metrics/resolver.ts
- [ ] T083 [US2] Add error message tests for invalid reference scenarios in tests/unit/metrics/resolver.test.ts
- [ ] T084 [P] [US2] Organize metric templates by categories in src/metrics/registry.ts
- [ ] T085 [US2] Add getCategory function for metric organization in src/metrics/registry.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion
- **@collect Infrastructure (Phase 2b)**: Depends on Phase 2, can run parallel with Phase 3
- **Unit Types (Phase 3)**: Depends on Setup completion - BLOCKS metric template definitions
- **User Story 1 (Phase 4a)**: Depends on Phase 2, 2b, and 3 - id/command inheritance
- **User Story 2 (Phase 4b)**: Depends on User Story 1 completion
- **User Story 3 (Phase 5)**: Depends on User Story 2 completion
- **CLI Helpers (Phase 6)**: Can start after Phase 2b - provides collector implementations
- **Report Integration (Phase 7)**: Depends on Unit Types (Phase 3) completion
- **Polish (Phase 8)**: Depends on all desired phases being complete

### User Story Dependencies

- **User Story 1 (P1)**: Minimal config with id/command inheritance - highest priority
- **User Story 2 (P2)**: Full built-in metric support - depends on US1
- **User Story 3 (P3)**: Override support - depends on US2
- **CLI Helpers**: Required for @collect to work - should be early priority

### Within Each Phase

- Unit type helpers (T010, T011, T013) can run in parallel
- Built-in metric definitions (T024-T030) can run in parallel
- Registry lookup functions before resolver implementation
- Resolver implementation before config loader integration
- Implementation before tests
- Unit tests can run in parallel
- Integration and contract tests after implementation
- CLI helper parsers (T067-T069) can run in parallel after CLI command structure (T051)

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T003)
- Unit type helpers marked [P] can run in parallel (T008, T010, T011, T013)
- Unit type tests marked [P] can run in parallel (T017-T022)
- All built-in metric definitions marked [P] can run in parallel (T024-T030)
- Unit tests for User Story 1 marked [P] can run in parallel (T037-T039)
- User Story 2 unit tests marked [P] can run in parallel (T044-T048)
- LOC collector interfaces marked [P] can run in parallel (T052, T053)
- LOC collector unit tests marked [P] can run in parallel (T056-T061)
- LOC contract tests marked [P] can run in parallel (T064, T065)
- Other CLI helper parsers marked [P] can run in parallel (T067-T069)
- Polish tasks marked [P] can run in parallel (T077-T080, T086)

---

## Parallel Example: Unit Types (Phase 3)

```bash
# Launch unit type helpers together:
Task: "Create UnitType type definition in src/metrics/types.ts"
Task: "Implement formatBytes helper in src/metrics/unit-formatter.ts"
Task: "Implement formatDuration helper in src/metrics/unit-formatter.ts"
Task: "Implement formatInteger helper in src/metrics/unit-formatter.ts"

# Launch unit type tests together (after implementation):
Task: "Add unit tests for formatValue with percent"
Task: "Add unit tests for formatValue with integer"
Task: "Add unit tests for formatBytes"
Task: "Add unit tests for formatDuration"
Task: "Add unit tests for formatDelta"
Task: "Add unit tests for null handling"
```

---

## Parallel Example: User Story 2 (Phase 4b)

```bash
# Launch all metric template definitions together:
Task: "Define coverage metric template in src/metrics/registry.ts"
Task: "Define function-coverage metric template in src/metrics/registry.ts"
Task: "Define loc metric template in src/metrics/registry.ts"
Task: "Define size metric template in src/metrics/registry.ts"
Task: "Define build-time metric template in src/metrics/registry.ts"
Task: "Define test-time metric template in src/metrics/registry.ts"
Task: "Define dependencies-count metric template in src/metrics/registry.ts"

# Launch all unit tests for User Story 2 together:
Task: "Add unit test for metric templates registry in tests/unit/metrics/registry.test.ts"
Task: "Add unit test for resolver with valid references in tests/unit/metrics/resolver.test.ts"
Task: "Add unit test for resolver with invalid references in tests/unit/metrics/resolver.test.ts"
```

---

## Parallel Example: User Story 3 (Phase 5)

```bash
# Launch all unit tests for User Story 3 together:
Task: "Add unit test for name override in tests/unit/metrics/resolver.test.ts"
Task: "Add unit test for command override in tests/unit/metrics/resolver.test.ts"
Task: "Add unit test for unit override validation in tests/unit/metrics/resolver.test.ts"
Task: "Add unit test for multiple property overrides in tests/unit/metrics/resolver.test.ts"
Task: "Add unit test for invalid override validation in tests/unit/metrics/resolver.test.ts"
```

---

## Parallel Example: LOC Collector (Phase 6)

```bash
# Launch LOC collector interfaces together (can start immediately after T051):
Task: "Create LocOptions interface in src/metrics/collectors/loc.ts"
Task: "Define SCC output type interfaces in src/metrics/collectors/loc.ts"

# Launch LOC unit tests together (after T054 collectLoc implementation):
Task: "Add unit tests for LocOptions validation in tests/unit/metrics/collectors/loc.test.ts"
Task: "Add unit tests for SCC output parsing in tests/unit/metrics/collectors/loc.test.ts"
Task: "Add unit tests for collectLoc with basic path in tests/unit/metrics/collectors/loc.test.ts"
Task: "Add unit tests for collectLoc with excludePatterns in tests/unit/metrics/collectors/loc.test.ts"
Task: "Add unit tests for collectLoc with language filtering in tests/unit/metrics/collectors/loc.test.ts"
Task: "Add unit tests for collectLoc error handling in tests/unit/metrics/collectors/loc.test.ts"

# Launch LOC contract tests together (after T065 implementation):
Task: "Add contract test for loc metric reference in tests/contract/loc-metrics.test.ts"
Task: "Add contract test for LOC CLI helper output format in tests/contract/loc-metrics.test.ts"
```

---

## Implementation Strategy

### Current Implementation Progress (2025-12-06)

**✅ COMPLETED (Phases 1-5):**
1. ✅ Phase 1: Setup
2. ✅ Phase 2: Foundational (infrastructure ready)
3. ✅ Phase 2b: @collect Infrastructure (command transformation works)
4. ✅ Phase 3: Unit Types (formatters implemented)
5. ✅ Phase 4a: User Story 1 (id/command/name inheritance works)
6. ✅ Phase 4b: User Story 2 (all 6 built-in metrics available)
7. ✅ Phase 5: User Story 3 (overrides work via ?? operator)

**🚧 IN PROGRESS:**
8. Phase 6: CLI Helpers (LOC ✅, size needs glob support ❌)
9. Phase 7: Report Integration (partial - needs T073)

**📋 REMAINING WORK:**
- T066b-d: Add glob support to size collector (CRITICAL)
- T073: Integrate unit formatting in report generator (CRITICAL)
- T024h-j: Add tests for inheritance behavior
- T044-T050: Add tests for override behavior
- T023: Add UnitType validation tests
- Phase 8: Polish & documentation

### MVP First (Ultra-minimal config + @collect) - ACHIEVED ✅

The MVP is functionally complete! Users can:
- Use `"loc": { "$ref": "loc" }` for ultra-minimal setup ✅
- Reference all 6 built-in metric templates ✅
- Override any template property ✅
- Use `@collect` shortcut for in-process execution ✅

**Remaining work is primarily:**
- Glob support for size collector (spec compliance)
- Test coverage for existing functionality
- Report formatting integration

### Incremental Delivery

1. Complete Setup + Foundational + @collect Infrastructure -> Foundation ready
2. Add LOC/Size collectors -> @collect works
3. Add User Story 1 -> Test with `{ "$ref": "loc" }` -> Deploy/Demo (Ultra-minimal MVP!)
4. Add User Story 2 -> All 6 built-in metrics available
5. Add User Story 3 -> Overrides supported
6. Add Report Integration -> Consistent formatting
7. Add other CLI helpers + Phase 8 polish -> Complete feature suite

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: @collect Infrastructure (Phase 2b)
   - Developer B: Unit Types (Phase 3)
3. Once @collect Infrastructure complete:
   - Developer A: LOC + Size collectors (Phase 6: T051-T066d)
   - Developer B: Continue Unit Types, then User Story 1 (Phase 4a)
4. After collectors + User Story 1 complete:
   - Test with `{ "$ref": "loc" }` - ultra-minimal MVP
5. Continue with User Story 2, User Story 3, Report Integration
6. Other CLI helpers follow after core functionality complete

---

## Notes

### Task Conventions
- [P] tasks = different files, no dependencies (can run in parallel)
- [Story] label maps task to specific user story for traceability
- [CLI] label indicates CLI helper implementation tasks
- ✅/❌ status reflects implementation completion, not test coverage
- Each user story should be independently completable and testable

### Implementation Guidelines
- **Object-based config**: Metrics use `Record<string, MetricConfig>` where keys are metric IDs
- **Property inheritance**: User config overrides template via `??` operator (no separate merge function)
- **Metric template commands**: Follow contract specifications in contracts/built-in-metrics.md
- **Unit types**: Semantic types (percent, integer, bytes, duration, decimal) for consistent formatting
- **LOC collector**: Uses SCC (supports --exclude and --language flags)
- **Resolution order**: Currently validates BEFORE resolution (see T036 for potential issue)
- **Error messages**: Include available template IDs for invalid references

### Current State (v4.0.0)
- ✅ Core functionality complete (Phases 1-5)
- 🚧 CLI helpers partial (LOC done, coverage-lcov done, size needs glob, coverage-cobertura TODO)
- 🚧 Report integration partial (formatters exist, generator needs work)
- 📋 Tests needed for existing functionality
- ⚠️ Glob support for size collector is CRITICAL for spec compliance
- ⚠️ Coverage-cobertura collector needs implementation
- ⚠️ --type option needs to be added to coverage-lcov

### Backward Compatibility
- Schema extensions maintain compatibility with custom metrics
- Migration from array to object format completed
- Historical metric names may differ from current config (handle carefully)
