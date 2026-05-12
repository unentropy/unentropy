# Metrics Specification

## Purpose

Define and collect code metrics via configuration, with support for custom metrics, built-in templates, and in-process collectors.

## Requirements

### Requirement: Custom Metric Definition
The system SHALL allow users to define custom metrics in `unentropy.json` using object keys as unique identifiers, with each metric specifying a type (`numeric` or `label`) and a shell command to collect its value.

#### Scenario: Minimal numeric metric
- **GIVEN** a project with no metrics configured
- **WHEN** a user adds `"test-coverage": { "type": "numeric", "command": "echo 42" }` to `unentropy.json`
- **THEN** the system treats "test-coverage" as the metric identifier, validates the configuration, and collects the value 42

#### Scenario: Label metric
- **GIVEN** a project with no metrics configured
- **WHEN** a user adds `"build-status": { "type": "label", "command": "echo 'healthy'" }` to `unentropy.json`
- **THEN** the system collects the string value "healthy" without numeric parsing

#### Scenario: Multiple metrics
- **GIVEN** a user wants to track 3 metrics
- **WHEN** they add 3 metric definitions to the `metrics` object
- **THEN** the system validates all 3 and collects each independently

#### Scenario: Invalid metric key
- **GIVEN** a user adds a metric with key `"Test Coverage"` (contains uppercase and space)
- **WHEN** configuration validation runs
- **THEN** the system rejects the key with a clear error message explaining the `^[a-z0-9-]+$` pattern

---

### Requirement: Metric Template References
The system SHALL provide built-in metric templates that users can reference via `$ref`, inheriting metadata (description, type, unit) and optionally a default command.

#### Scenario: Ultra-minimal template reference
- **GIVEN** a repository with metrics tracking enabled
- **WHEN** a user adds `"loc": { "$ref": "loc" }` to their metrics configuration
- **THEN** the system uses the object key "loc" as the identifier and the template's default command `@collect loc .` to collect lines of code

#### Scenario: Template without default command
- **GIVEN** a user configures `"coverage": { "$ref": "coverage" }` without a command
- **WHEN** validation runs
- **THEN** the system fails with a clear error message explaining that coverage requires a command because the template has no default

#### Scenario: Custom key with template reference
- **GIVEN** a user adds `"src-loc": { "$ref": "loc", "command": "@collect loc ./src --language TypeScript" }`
- **WHEN** metrics are collected
- **THEN** the system counts only TypeScript lines in the src directory using the key "src-loc" as the identifier

#### Scenario: Override template metadata
- **GIVEN** a user references `"test-coverage": { "$ref": "coverage", "name": "Test Coverage", "command": "..." }`
- **WHEN** reports are generated
- **THEN** the metric is displayed as "Test Coverage" instead of the template's default name

---

### Requirement: In-Process Collectors
The system SHALL support `@collect` commands that execute collectors in-process without spawning subprocesses, providing consistent behavior and better performance than equivalent shell commands.

#### Scenario: Lines of code collection
- **GIVEN** a metric with command `@collect loc ./src`
- **WHEN** the metric is collected
- **THEN** the system invokes the `loc` collector in-process, passing `./src` as the target directory

#### Scenario: Bundle size with glob
- **GIVEN** a metric with command `@collect size ./dist/*.js`
- **WHEN** the metric is collected
- **THEN** the system sums the size of all matching JavaScript files

#### Scenario: Coverage from LCOV
- **GIVEN** a metric with command `@collect coverage-lcov ./coverage/lcov.info`
- **WHEN** the metric is collected
- **THEN** the system parses the LCOV file and returns the line coverage percentage

#### Scenario: Collector failure
- **GIVEN** a metric with command `@collect size ./nonexistent/*.js`
- **WHEN** the metric is collected
- **THEN** the system fails with an error message rather than returning a fallback value of zero

---

### Requirement: Configuration Validation
The system SHALL validate the `metrics` object structure and provide clear, actionable error messages for invalid configurations.

#### Scenario: Missing required fields
- **GIVEN** a metric configuration missing the `type` field
- **WHEN** validation runs
- **THEN** the system reports which metric is missing required fields and what fields are required

#### Scenario: Invalid type value
- **GIVEN** a metric with `"type": "percentage"`
- **WHEN** validation runs
- **THEN** the system reports that type must be either `numeric` or `label`

#### Scenario: Empty command
- **GIVEN** a metric with `"command": ""`
- **WHEN** validation runs
- **THEN** the system reports that command cannot be empty

#### Scenario: Unknown template reference
- **GIVEN** a metric with `"$ref": "unknown-template"`
- **WHEN** validation runs
- **THEN** the system lists available template IDs and fails

---

## Edge Cases

- What happens when the same `$ref` is used with different object keys? Each metric is treated as a separate entry with unique identifiers (from their keys).
- What happens when a threshold references the wrong key? `"my-loc": { "$ref": "loc" }` with threshold `{ "metric": "loc" }` fails — thresholds must reference the object key, not the template ID.
- What happens when `@collect` encounters an unknown collector? The system fails with an error listing available collectors.
- What happens when a glob pattern matches no files? The system fails with an error rather than returning zero.
- What happens when a custom metric and a template reference share the same object key? Not possible in valid JSON — object keys are inherently unique.

## Assumptions

- Users understand basic JSON configuration syntax.
- Metric collection scripts/commands are provided by the user and referenced in configuration (the system invokes them but does not define them).
- The SCC tool is available for `@collect loc` (with installation instructions provided).
- Default commands assume common project structures (e.g., `coverage/lcov.info`, `./dist`).
- The `@collect` shortcut provides sufficient flexibility for most use cases; complex scenarios can still use shell commands.

## Dependencies

- The configuration system must support the object-based metrics structure and `$ref` syntax.
- The metric collection system must resolve references before executing commands.
- Collector functions must be available for in-process `@collect` execution.

## Scope Boundaries

### In Scope

- Custom metric definition via `unentropy.json`
- Built-in metric template registry with 6 templates
- `$ref` syntax for template reference
- `@collect` in-process collector execution
- Configuration validation for the metrics block
- Unit types for display formatting (`percent`, `integer`, `bytes`, `duration`, `decimal`)

### Out of Scope

- Storage backend configuration (see `storage/` spec)
- Quality gate thresholds (see `quality-gates/` spec)
- Report generation and visualization (see `reporting/` spec)
- CLI commands for configuration scaffolding (see `cli/` spec)
- GitHub Actions workflow orchestration (see `actions/` spec)
- Framework-specific detection (e.g., Laravel, Next.js, Django)
- Custom collector plugins (future work)

## Foundational Contracts

| Contract | Location | Referenced By |
|----------|----------|---------------|
| Metrics Config Schema | `contracts/config-schema.md` | `storage/`, `quality-gates/`, `cli/` |
| Built-in Metrics Registry | `contracts/built-in-metrics.md` | `cli/` (init scaffolding) |
