# Feature Specification: Metrics Gallery

**Feature Branch**: `005-metrics-gallery`  
**Created**: 2025-11-22  
**Updated**: 2025-12-04  
**Status**: Draft  
**Version**: 2.0.0

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Minimal setup with built-in metrics (Priority: P0)

Development teams want to track common code metrics with minimal configuration. They can reference built-in metrics with just an `id` and `$ref`, and the system automatically provides the collection command, units, and sensible defaults.

**Why this priority**: This is the core value proposition - enabling a complete metrics setup in seconds with minimal configuration.

**Independent Test**: Add `{ "id": "loc", "$ref": "loc" }` to configuration, run metrics collection, and verify that lines of code are collected using the built-in default command.

**Acceptance Scenarios**:

1. **Given** a repository with metrics tracking enabled, **When** a user adds `{ "id": "loc", "$ref": "loc" }` to their metrics configuration, **Then** the system uses the built-in default command `@collect loc .` to collect lines of code for the entire project.
2. **Given** a user configures `{ "$ref": "coverage" }` without a command, **When** validation runs, **Then** the system fails with a clear error message explaining that coverage requires a command.
3. **Given** a built-in metric without a default command (e.g., `build-time`), **When** a user references it without providing a command, **Then** configuration validation fails with a clear error message.

---

### User Story 2 - Quick setup with pre-defined metrics (Priority: P1)

Development teams want to track common code metrics like test coverage, bundle size, and lines of code without researching shell commands. They can reference built-in metrics with custom commands using the `@collect` shortcut for simplified, in-process execution.

**Why this priority**: This enables fast setup while allowing customization of paths and options.

**Independent Test**: Add a built-in metric reference with `@collect` command, run metrics collection, and verify that the metric is collected correctly.

**Acceptance Scenarios**:

1. **Given** a user adds `{ "id": "src-loc", "$ref": "loc", "command": "@collect loc ./src --language TypeScript" }`, **When** metrics are collected, **Then** the system counts only TypeScript lines in the src directory.
2. **Given** a user references `{ "id": "bundle", "$ref": "bundle-size", "command": "@collect size ./dist/*.js" }` with a glob pattern, **When** metrics are collected, **Then** the system sums the size of all matching JavaScript files.
3. **Given** multiple metrics use the same `$ref` with different `id` values, **When** the configuration is validated, **Then** each metric is treated as a separate entry.

---

### User Story 3 - Override built-in metric defaults (Priority: P2)

Development teams need to customize display names or other properties of built-in metrics to match their project requirements while benefiting from pre-defined metadata.

**Why this priority**: Flexibility is important but secondary to basic functionality.

**Independent Test**: Reference a built-in metric and override its display name, verify that the custom name is used in reports.

**Acceptance Scenarios**:

1. **Given** a user references `{ "id": "test-coverage", "$ref": "coverage", "name": "Test Coverage" }`, **When** reports are generated, **Then** the metric is displayed as "Test Coverage".
2. **Given** a user overrides the unit of a built-in metric, **When** values are formatted, **Then** the custom unit formatting is applied.
3. **Given** a user overrides multiple properties of a built-in metric, **When** the configuration is validated, **Then** the system merges user overrides with built-in defaults correctly.

---

### Built-in Metrics

The following metrics are shipped by default. Each metric provides metadata (description, type, unit) and optionally a default command using `@collect` syntax.

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

#### ID Resolution

1. **Duplicate implicit IDs**: When using `{ "$ref": "loc" }` twice, both inherit `id: "loc"` causing a duplicate error. Solution: provide explicit `id` values for at least one.

2. **Explicit ID conflicts with implicit ID**: `{ "$ref": "loc" }` and `{ "id": "loc", "$ref": "coverage" }` both resolve to `id: "loc"` - duplicate error.

3. **Explicit ID matches template ID**: `{ "id": "loc", "$ref": "loc" }` is valid - explicit id matches what would be inherited.

4. **Custom metric without ID**: `{ "type": "numeric", "command": "echo 42" }` fails - custom metrics require explicit `id`.

#### Quality Gate References

5. **Threshold references inherited ID**: `{ "$ref": "loc" }` with threshold `{ "metric": "loc" }` works - threshold matches inherited id.

6. **Threshold references template ID when overridden**: `{ "id": "my-loc", "$ref": "loc" }` with threshold `{ "metric": "loc" }` fails - threshold must reference `"my-loc"`.

#### Command Resolution

7. **Built-in without default command**: `{ "$ref": "build-time" }` fails - `build-time` has no default command, user must provide one.

8. **Invalid `$ref`**: `{ "$ref": "unknown" }` fails with error listing available metric IDs.

9. **Unknown collector**: `{ "command": "@collect unknown ./path" }` fails with error listing available collectors.

10. **Glob matches no files**: `{ "command": "@collect size ./nonexistent/*.js" }` fails with error (no fallback to zero).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a library of built-in metric definitions that users can reference by a unique identifier (e.g., `coverage`, `bundle-size`, `loc`).
- **FR-002**: Each built-in metric MUST include at minimum: description, metric type (numeric or label), and optional unit type and default command using `@collect` syntax.
- **FR-003**: The system MUST require an `id` field for custom metrics (without `$ref`). When `$ref` is provided, `id` is optional and inherits from the template.
- **FR-004**: When a built-in metric is referenced, the system MUST resolve the reference to a complete metric configuration by combining built-in metadata with user-provided overrides before metric collection begins.
- **FR-005**: When a built-in metric has a `defaultCommand`, the user's `command` field is optional. When there is no `defaultCommand`, the user MUST provide a `command`.
- **FR-006**: Users MUST be able to override metadata properties (name, description, unit) of a referenced built-in metric by explicitly specifying those properties alongside the `$ref`.
- **FR-007**: The system MUST fail configuration validation with a clear error message when a user references a non-existent built-in metric ID.
- **FR-008**: The system MUST fail configuration validation when duplicate `id` values are detected after resolution (including inherited IDs).
- **FR-009**: The initial release MUST include the 7 built-in metrics specified in the "Built-in Metrics" section.
- **FR-010**: The system MUST support mixing built-in metric references and custom metric definitions in the same configuration.
- **FR-011**: The `@collect` shortcut MUST execute collectors in-process without spawning subprocesses.
- **FR-012**: The `@collect size` command MUST support glob patterns for file matching.
- **FR-013**: When `@collect` commands fail (missing files, parse errors), the system MUST fail with an error rather than returning a fallback value.

### Key Entities

- **Built-in Metric Template**: A pre-defined metric template stored in the system's registry, including description, type, unit type, and optional default command.
- **Metric Configuration**: A configuration entry with optional `id` (required for custom metrics, inherited from template when `$ref` provided), optional `$ref` to reference a built-in template, optional `name` for display, and conditionally required `command`.
- **Resolved Metric**: The final metric configuration after resolving built-in references and defaults, ready for collection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add a commonly-tracked metric (coverage, bundle size, or LOC) to their project in under 30 seconds using ultra-minimal configuration like `{ "$ref": "loc" }`.
- **SC-002**: At least 80% of new metrics tracking setups use at least one built-in metric reference, demonstrating the feature's value in reducing configuration effort.
- **SC-003**: Configuration validation provides clear, actionable error messages for invalid references, missing commands, and duplicate IDs, with users able to correct errors within 1 minute.
- **SC-004**: Built-in metric metadata works correctly across different project technologies in 100% of cases when using `@collect` commands.
- **SC-005**: `@collect` commands execute faster than equivalent shell commands due to in-process execution.

## Assumptions

- The built-in metrics focus on metrics commonly used in web and software development projects.
- Users understand basic JSON configuration syntax.
- The `@collect` shortcut provides sufficient flexibility for most use cases; complex scenarios can still use shell commands.
- Default commands assume common project structures (e.g., `coverage/lcov.info`, `./dist`).
- The SCC tool is available for `@collect loc` (with installation instructions provided).

## Dependencies

- The configuration system must support the `$ref` syntax and optional `id` field (with inheritance from template).
- The metric collection system must resolve references before executing commands.
- The quality gate feature (004) provides the threshold framework that built-in metrics reference.
- Collector functions must be available for in-process `@collect` execution.
