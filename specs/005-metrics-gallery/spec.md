# Feature Specification: Metrics Gallery

**Feature Branch**: `005-metrics-gallery`  
**Created**: 2025-11-22  
**Updated**: 2025-12-06  
**Status**: Draft  
**Version**: 3.0.0

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ultra-minimal setup (Priority: P0)

Development teams want to track common code metrics with absolute minimal configuration. For templates with default commands, they can reference with just `"loc": { "$ref": "loc" }` - the system uses the object key as the metric id and inherits the command, units, and all metadata from the template.

**Why this priority**: This is the core value proposition - enabling a complete metrics setup in under 10 seconds with a single-line configuration.

**Independent Test**: Add `"loc": { "$ref": "loc" }` to configuration, run metrics collection, and verify that lines of code are collected using the key "loc" as the id and template's default command.

**Acceptance Scenarios**:

1. **Given** a repository with metrics tracking enabled, **When** a user adds `"loc": { "$ref": "loc" }` to their metrics configuration, **Then** the system uses the object key as the id and the template's default command `@collect loc .` to collect lines of code for the entire project.
2. **Given** a user configures `"coverage": { "$ref": "coverage" }` without a command, **When** validation runs, **Then** the system fails with a clear error message explaining that coverage requires a command.
3. **Given** a metric template without a default command (e.g., `build-time`), **When** a user references it without providing a command, **Then** configuration validation fails with a clear error message.

---

### User Story 2 - Customized templates with custom keys (Priority: P1)

Development teams want to track multiple variations of the same metric (e.g., source LOC vs test LOC) or customize commands for specific paths. They can reference the same template multiple times with different object keys and custom commands using the `@collect` shortcut.

**Why this priority**: This enables flexibility for advanced use cases while maintaining template benefits.

**Independent Test**: Add multiple references to the same template with different object keys and commands, verify each metric is collected independently.

**Acceptance Scenarios**:

1. **Given** a user adds `"src-loc": { "$ref": "loc", "command": "@collect loc ./src --language TypeScript" }`, **When** metrics are collected, **Then** the system counts only TypeScript lines in the src directory using the key "src-loc" as the id.
2. **Given** a user references `"bundle": { "$ref": "bundle-size", "command": "@collect size ./dist/*.js" }` with a glob pattern, **When** metrics are collected, **Then** the system sums the size of all matching JavaScript files.
3. **Given** multiple metrics use the same `$ref` with different object keys, **When** the configuration is validated, **Then** each metric is treated as a separate entry with unique ids (from their keys).

---

### User Story 3 - Override metric template defaults (Priority: P2)

Development teams need to customize display names or other properties of metric templates to match their project requirements while benefiting from pre-defined metadata.

**Why this priority**: Flexibility is important but secondary to basic functionality.

**Independent Test**: Reference a metric template and override its display name, verify that the custom name is used in reports.

**Acceptance Scenarios**:

1. **Given** a user references `"test-coverage": { "$ref": "coverage", "name": "Test Coverage", "command": "..." }`, **When** reports are generated, **Then** the metric is displayed as "Test Coverage".
2. **Given** a user overrides the unit of a metric template, **When** values are formatted, **Then** the custom unit formatting is applied.
3. **Given** a user overrides multiple properties of a metric template, **When** the configuration is validated, **Then** the system merges user overrides with template defaults correctly.

---

### Metric Templates

The following metric templates are shipped by default. Each template provides metadata (description, type, unit) and optionally a default command using `@collect` syntax.

#### Unit Types

Units are semantic types that determine how metric values are formatted consistently across HTML reports and PR comments:

| UnitType | Display Example | Use Case |
|----------|-----------------|----------|
| `percent` | `85.5%` | Coverage metrics |
| `integer` | `1,234` | LOC, counts |
| `bytes` | `1.5 MB` | Bundle size (auto-scales B -> KB -> MB -> GB) |
| `duration` | `1m 30s` | Build/test time (auto-scales ms -> s -> m -> h) |
| `decimal` | `3.14` | Generic numeric |

#### Coverage Metrics

1. **`coverage`** - Test Coverage Percentage
   - **Description**: Overall test coverage percentage across the codebase
   - **Type**: numeric
   - **Unit**: `percent`
   - **Default Command**: None (technology-specific)
   - **Default Threshold**: no-regression

2. **`function-coverage`** - Function Coverage
   - **Description**: Percentage of functions covered by tests
   - **Type**: numeric
   - **Unit**: `percent`
   - **Default Command**: None (technology-specific)
   - **Default Threshold**: no-regression

#### Code Size Metrics

3. **`loc`** - Lines of Code
   - **Description**: Total lines of code in the codebase
   - **Type**: numeric
   - **Unit**: `integer`
   - **Default Command**: `@collect loc .`
   - **Default Threshold**: none

4. **`bundle-size`** - Production Bundle Size
   - **Description**: Total size of production build artifacts
   - **Type**: numeric
   - **Unit**: `bytes`
   - **Default Command**: `@collect size ./dist`
   - **Default Threshold**: delta-max-drop (5% maximum increase)

#### Performance Metrics

5. **`build-time`** - Build Duration
   - **Description**: Time taken to complete the build
   - **Type**: numeric
   - **Unit**: `duration`
   - **Default Command**: None (too project-specific)
   - **Default Threshold**: delta-max-drop (10% maximum increase)

6. **`test-time`** - Test Suite Duration
   - **Description**: Time taken to run all tests
   - **Type**: numeric
   - **Unit**: `duration`
   - **Default Command**: None (too project-specific)
   - **Default Threshold**: delta-max-drop (10% maximum increase)

#### Dependency Metrics

7. **`dependencies-count`** - Dependency Count
   - **Description**: Total number of direct dependencies
   - **Type**: numeric
   - **Unit**: `integer`
   - **Default Command**: None (varies by package manager)
   - **Default Threshold**: none

---

### Edge Cases

#### Key Resolution

1. **Same key used twice**: Not possible in valid JSON - object keys are inherently unique.

2. **Key matches template ID**: `"loc": { "$ref": "loc" }` is valid - this is the intended minimal usage.

3. **Custom metric**: `"my-metric": { "type": "numeric", "command": "echo 42" }` is valid - object key serves as the id.

#### Quality Gate References

4. **Threshold references key**: `"loc": { "$ref": "loc" }` with threshold `{ "metric": "loc" }` works - threshold matches the object key.

5. **Threshold references wrong key**: `"my-loc": { "$ref": "loc" }` with threshold `{ "metric": "loc" }` fails - threshold must reference `"my-loc"`.

#### Command Resolution

6. **Template without default command**: `"build-time": { "$ref": "build-time" }` fails - `build-time` has no default command, user must provide one.

7. **Invalid `$ref`**: `"my-metric": { "$ref": "unknown" }` fails with error listing available template IDs.

8. **Unknown collector**: `"my-metric": { "command": "@collect unknown ./path" }` fails with error listing available collectors.

9. **Glob matches no files**: `"my-bundle": { "command": "@collect size ./nonexistent/*.js" }` fails with error (no fallback to zero).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a library of metric template definitions that users can reference by a unique identifier (e.g., `coverage`, `bundle-size`, `loc`).
- **FR-002**: Each metric template MUST include at minimum: description, metric type (numeric or label), and optional unit type and default command using `@collect` syntax.
- **FR-003**: The system MUST use the object key as the metric identifier. For custom metrics (without `$ref`), `type` and `command` are required.
- **FR-004**: When a metric template is referenced, the system MUST resolve the reference to a complete metric configuration by combining template metadata with user-provided overrides before metric collection begins.
- **FR-005**: When a metric template has a `command`, the user's `command` field is optional. When there is no `command`, the user MUST provide a `command`.
- **FR-006**: Users MUST be able to override metadata properties (name, description, unit) of a referenced metric template by explicitly specifying those properties alongside the `$ref`.
- **FR-007**: The system MUST fail configuration validation with a clear error message when a user references a non-existent metric template ID.
- **FR-008**: Object keys are inherently unique (JSON requirement) - no duplicate detection needed.
- **FR-009**: The initial release MUST include the 7 metric templates specified in the "Metric Templates" section.
- **FR-010**: The system MUST support mixing metric template references and custom metric definitions in the same configuration.
- **FR-011**: The `@collect` shortcut MUST execute collectors in-process without spawning subprocesses.
- **FR-012**: The `@collect size` command MUST support glob patterns for file matching.
- **FR-013**: When `@collect` commands fail (missing files, parse errors), the system MUST fail with an error rather than returning a fallback value.

### Key Entities

- **Metric Template**: A pre-defined metric template stored in the system's registry, including description, type, unit type, and optional default command.
- **Metric Configuration**: A configuration entry where the object key serves as the metric identifier, optional `$ref` to reference a metric template, optional `name` for display, and conditionally required `command`.
- **Resolved Metric**: The final metric configuration after resolving template references and defaults, ready for collection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add a commonly-tracked metric (coverage, bundle size, or LOC) to their project in under 30 seconds using ultra-minimal configuration like `"loc": { "$ref": "loc" }`.
- **SC-002**: At least 80% of new metrics tracking setups use at least one metric template reference, demonstrating the feature's value in reducing configuration effort.
- **SC-003**: Configuration validation provides clear, actionable error messages for invalid references and missing commands, with users able to correct errors within 1 minute.
- **SC-004**: Metric template metadata works correctly across different project technologies in 100% of cases when using `@collect` commands.
- **SC-005**: `@collect` commands execute faster than equivalent shell commands due to in-process execution.

## Assumptions

- The metric templates focus on metrics commonly used in web and software development projects.
- Users understand basic JSON configuration syntax.
- The `@collect` shortcut provides sufficient flexibility for most use cases; complex scenarios can still use shell commands.
- Default commands assume common project structures (e.g., `coverage/lcov.info`, `./dist`).
- The SCC tool is available for `@collect loc` (with installation instructions provided).

## Dependencies

- The configuration system must support the object-based metrics structure and `$ref` syntax.
- The metric collection system must resolve references before executing commands.
- The quality gate feature (004) provides the threshold framework that metric templates reference.
- Collector functions must be available for in-process `@collect` execution.
