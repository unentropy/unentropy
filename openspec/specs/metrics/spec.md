# Metrics Specification

## Purpose

Define and collect code metrics via configuration, with support for custom metrics, built-in templates, and in-process collectors.

## Overview

The system supports Clover XML coverage reports via the `coverage-clover` built-in collector, alongside the existing Cobertura and LCOV collectors.
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

### Requirement: Multi-File Coverage Collection

As a user running tests in parallel CI jobs, I want to merge multiple Cobertura XML files so that I get one consolidated coverage metric representing the full test suite.

The system SHALL accept multiple Cobertura XML file paths to the `coverage-cobertura` collector, parse each one, and compute a merged coverage percentage across all reports.

#### Scenario: Merge two non-overlapping reports

- **GIVEN** two Cobertura XML files covering different source files
- **WHEN** the merge operation runs
- **THEN** the returned coverage includes the combined line/branch/function totals from both files

#### Scenario: Merge two overlapping reports

- **GIVEN** two Cobertura XML files where one source file appears in both with different coverage on different lines
- **WHEN** the merge operation runs
- **THEN** the coverage for that file is computed by per-class per-line deduplication for line coverage (union of covered lines across reports), root-level summation for branch coverage, and method-key deduplication for function coverage

#### Scenario: Merge with line coverage type

- **GIVEN** multiple Cobertura XML files and `--type line` (or default)
- **WHEN** the merge operation runs
- **THEN** the result is the combined line coverage percentage

#### Scenario: Merge with branch coverage type

- **GIVEN** multiple Cobertura XML files and `--type branch`
- **WHEN** the merge operation runs
- **THEN** the result is the combined branch coverage percentage

#### Scenario: Merge with function coverage type

- **GIVEN** multiple Cobertura XML files and `--type function`
- **WHEN** the merge operation runs
- **THEN** the result is the combined function coverage percentage

#### Scenario: Single file with merge syntax

- **GIVEN** only one Cobertura XML file path is provided to the merge-capable collector
- **WHEN** the merge operation runs
- **THEN** the result matches what the single-file parser would return for that file

#### Scenario: Overlapping partial coverage

- **GIVEN** two reports where file A has lines 1-50 covered out of 100 lines in report 1, and lines 51-80 covered out of 100 lines in report 2
- **WHEN** the merge operation runs with `--type line`
- **THEN** the merged result for file A is: total valid = 100 (union of line sets), total covered = 80 (union of covered lines) = 80%

#### Scenario: Missing input file

- **GIVEN** a file path that does not exist
- **WHEN** the merge operation runs
- **THEN** the system fails with an error message identifying the missing file

#### Scenario: Empty file list

- **GIVEN** zero file paths are provided
- **WHEN** the merge operation runs
- **THEN** the system fails with an error message indicating no files were provided

#### Scenario: Malformed XML file fails

- **GIVEN** multiple Cobertura XML files where one file contains invalid XML
- **WHEN** the merge operation runs
- **THEN** the system fails with an error identifying the malformed file rather than returning a fallback value

#### Scenario: File missing required attributes fails

- **GIVEN** multiple Cobertura XML files where one file lacks `lines-covered` and `lines-valid` on the root `<coverage>` element
- **WHEN** the merge operation runs
- **THEN** the system fails with an error indicating the file cannot be merged due to missing attributes

---

### Requirement: Clover XML Coverage Collection

As a user of a PHP project (or any project that produces Clover XML reports), I want to collect coverage metrics from `clover.xml` files so that I can track PHPUnit coverage in Unentropy.

The system SHALL provide a `coverage-clover` built-in collector that parses Clover XML coverage reports and returns a coverage percentage.

#### Scenario: Line coverage from PHPUnit Clover report

- **GIVEN** a PHP project that produces a Clover XML report via `phpunit --coverage-clover`
- **WHEN** a user configures `"coverage": { "$ref": "coverage", "command": "@collect coverage-clover clover.xml" }`
- **THEN** the system parses the Clover XML file and returns the line coverage percentage calculated from `statements` and `coveredstatements`

#### Scenario: Function coverage from Clover report

- **GIVEN** a PHP project with a Clover XML report containing method coverage data
- **WHEN** a user specifies `--type function` with the `coverage-clover` collector
- **THEN** the system returns the function coverage percentage calculated from `methods` and `coveredmethods`

#### Scenario: Branch coverage from Clover report

- **GIVEN** a Clover XML report with conditional coverage data
- **WHEN** a user specifies `--type branch` with the `coverage-clover` collector
- **THEN** the system returns the branch coverage percentage calculated from `conditionals` and `coveredconditionals`

#### Scenario: Multi-file merge

- **WHEN** a user provides multiple Clover XML file paths to `coverage-clover`
- **THEN** the system merges coverage: for line type, per-file per-statement-line deduplication via union of covered lines from `<line type="stmt">` elements; for function and branch types, project-level summation of `methods`/`coveredmethods` and `conditionals`/`coveredconditionals` across all files before computing the percentage

#### Scenario: Malformed XML

- **GIVEN** a Clover XML file with invalid XML content
- **WHEN** the `coverage-clover` collector attempts to parse it
- **THEN** the system fails with an error describing the parse failure

#### Scenario: Missing coverage data

- **GIVEN** a Clover XML file that is valid XML but lacks expected coverage attributes
- **WHEN** the `coverage-clover` collector attempts to parse it
- **THEN** the system fails with an error indicating missing coverage data

## Key Entities

- **`sloc` library**: The embedded JavaScript library used for in-process lines-of-code counting.
- **Clover XML report**: An XML format produced by PHPUnit (`--coverage-clover`) and OpenClover containing coverage metrics organized as a project hierarchy with per-file `<metrics>` elements
- **Coverage type**: The aspect of coverage being measured — line (via `statements`), function (via `methods`), or branch (via `conditionals`)

## Edge Cases

- What happens when the same `$ref` is used with different object keys? Each metric is treated as a separate entry with unique identifiers (from their keys).
- What happens when a threshold references the wrong key? `"my-loc": { "$ref": "loc" }` with threshold `{ "metric": "loc" }` fails — thresholds must reference the object key, not the template ID.
- What happens when `@collect` encounters an unknown collector? The system fails with an error listing available collectors.
- What happens when a glob pattern matches no files? The system fails with an error rather than returning zero.
- What happens when a custom metric and a template reference share the same object key? Not possible in valid JSON — object keys are inherently unique.

## Assumptions

- Users understand basic JSON configuration syntax.
- Metric collection scripts/commands are provided by the user and referenced in configuration (the system invokes them but does not define them).
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
