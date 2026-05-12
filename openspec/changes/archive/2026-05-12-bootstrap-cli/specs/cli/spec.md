# CLI Specification

## Overview

The CLI domain encompasses all commands for project initialization, metric collection testing, report preview, and configuration verification. These commands provide the primary user interface for unentropy, enabling developers to bootstrap tracking, validate setup, and preview results without requiring CI/CD pipeline execution.

## ADDED Requirements

### Requirement: Project Detection

The system SHALL detect project type by scanning for marker files in the current working directory, using a defined priority order when multiple types match. Detection MUST only check the current directory (not subdirectories).

#### Scenario: Detect JavaScript by package.json

- **GIVEN** a directory containing `package.json`
- **WHEN** the user runs `bunx unentropy init`
- **THEN** the system detects project type as `javascript` and reports which files were found

#### Scenario: Detect JavaScript by tsconfig.json

- **GIVEN** a directory without `package.json` but with `tsconfig.json`
- **WHEN** the user runs `bunx unentropy init`
- **THEN** the system detects project type as `javascript`

#### Scenario: Detect PHP by composer.json

- **GIVEN** a directory containing `composer.json`
- **WHEN** the user runs `bunx unentropy init`
- **THEN** the system detects project type as `php`

#### Scenario: Detect Go by go.mod

- **GIVEN** a directory containing `go.mod`
- **WHEN** the user runs `bunx unentropy init`
- **THEN** the system detects project type as `go`

#### Scenario: Detect Python by pyproject.toml

- **GIVEN** a directory containing `pyproject.toml`
- **WHEN** the user runs `bunx unentropy init`
- **THEN** the system detects project type as `python`

#### Scenario: Priority order with multiple markers

- **GIVEN** a directory containing both `package.json` and `go.mod`
- **WHEN** the user runs `bunx unentropy init`
- **THEN** the system detects project type as `javascript` (priority: JavaScript > PHP > Go > Python)

#### Scenario: No detection files found

- **GIVEN** a directory with no recognized marker files
- **WHEN** the user runs `bunx unentropy init`
- **THEN** the system exits with error code 1 and a message to use `--type` to specify the project type manually

#### Scenario: Marker files in subdirectories are ignored

- **GIVEN** a directory where `package.json` exists only in a subdirectory
- **WHEN** the user runs `bunx unentropy init`
- **THEN** the system does not detect a JavaScript project

---

### Requirement: Configuration Generation

The system SHALL generate a valid `unentropy.json` configuration appropriate to the detected or specified project type, including relevant metrics and a default quality gate.

#### Scenario: JavaScript config includes lines-of-code, test-coverage, and size

- **GIVEN** a detected JavaScript project
- **WHEN** the system generates configuration
- **THEN** the config includes `lines-of-code`, `test-coverage`, and `size` metrics with appropriate language filters

#### Scenario: PHP config includes lines-of-code and test-coverage

- **GIVEN** a detected PHP project
- **WHEN** the system generates configuration
- **THEN** the config includes `lines-of-code` and `test-coverage` metrics (no size metric)

#### Scenario: Go config includes lines-of-code, test-coverage, and binary-size

- **GIVEN** a detected Go project
- **WHEN** the system generates configuration
- **THEN** the config includes `lines-of-code`, `test-coverage`, and `binary-size` metrics with Go-specific commands

#### Scenario: Python config includes lines-of-code and test-coverage

- **GIVEN** a detected Python project
- **WHEN** the system generates configuration
- **THEN** the config includes `lines-of-code` and `test-coverage` metrics

#### Scenario: Default quality gate with test-coverage threshold

- **GIVEN** any project type
- **WHEN** the system generates configuration
- **THEN** the config includes a quality gate with `test-coverage` minimum 80%, severity `warning`, mode `soft`

#### Scenario: Default storage type is artifact

- **GIVEN** any project type
- **WHEN** the system generates configuration without `--storage`
- **THEN** the config uses `sqlite-artifact` as the storage type

#### Scenario: Default source directory is ./src (except Go)

- **GIVEN** a JavaScript, PHP, or Python project
- **WHEN** the system generates configuration
- **THEN** the LOC command targets `./src`
- **AND GIVEN** a Go project
- **WHEN** the system generates configuration
- **THEN** the LOC command targets `.`

---

### Requirement: CLI Options

The system SHALL support options to override auto-detection, select storage, handle existing files, and preview without writing.

#### Scenario: Force project type with --type

- **GIVEN** a directory containing `package.json`
- **WHEN** the user runs `bunx unentropy init --type php`
- **THEN** the system generates PHP-specific configuration and reports "Using forced project type: php"

#### Scenario: Force project type in empty directory

- **GIVEN** an empty directory
- **WHEN** the user runs `bunx unentropy init --type go`
- **THEN** the system generates Go-specific configuration

#### Scenario: Invalid --type value

- **GIVEN** any directory
- **WHEN** the user runs `bunx unentropy init --type invalid`
- **THEN** the system displays an error listing valid types (javascript, php, go, python) and exits with code 1

#### Scenario: Select storage type

- **GIVEN** any project
- **WHEN** the user runs `bunx unentropy init --storage s3`
- **THEN** the generated config uses `sqlite-s3`
- **AND WHEN** the user runs `bunx unentropy init --storage local`
- **THEN** the generated config uses `sqlite-local`

#### Scenario: Overwrite existing config with --force

- **GIVEN** a directory with existing `unentropy.json`
- **WHEN** the user runs `bunx unentropy init --force`
- **THEN** the file is overwritten with new configuration

#### Scenario: Preview without writing with --dry-run

- **GIVEN** any directory
- **WHEN** the user runs `bunx unentropy init --dry-run`
- **THEN** the system displays what would be created without writing any files

---

### Requirement: Output Formatting

The system SHALL display detected project type with evidence, list generated metrics, output GitHub Actions workflow examples, and present clear next steps.

#### Scenario: Display detected type and evidence

- **GIVEN** a directory with `package.json` and `tsconfig.json`
- **WHEN** the user runs `bunx unentropy init`
- **THEN** the output includes "Detected project type: javascript (found: package.json, tsconfig.json)"

#### Scenario: Display generated metrics list

- **GIVEN** a successful init
- **WHEN** configuration is created
- **THEN** the output lists each metric with name and label

#### Scenario: Output workflow examples for metric tracking

- **GIVEN** a successful init
- **WHEN** configuration is created
- **THEN** the output includes a GitHub Actions workflow example for metric tracking on main branch pushes

#### Scenario: Output workflow examples for quality gate

- **GIVEN** a successful init
- **WHEN** configuration is created
- **THEN** the output includes a GitHub Actions workflow example for quality gate on pull requests

#### Scenario: Project-type-specific workflow steps

- **GIVEN** a JavaScript project init
- **WHEN** viewing workflow examples
- **THEN** the examples include `actions/setup-node` and `npm test -- --coverage`
- **AND GIVEN** a PHP project init
- **WHEN** viewing workflow examples
- **THEN** the examples include `shivammathur/setup-php` and `vendor/bin/phpunit`

#### Scenario: S3 secrets guidance

- **GIVEN** the user ran init with `--storage s3`
- **WHEN** viewing the output
- **THEN** the output includes S3 secret configuration placeholders and instructions

#### Scenario: Display next steps after init

- **GIVEN** a successful init
- **WHEN** configuration is created
- **THEN** the output displays next steps including suggestions to run `bunx unentropy test` and `bunx unentropy preview`

---

### Requirement: Init Error Handling

The system SHALL exit with appropriate error codes and clear messages for all error conditions in the init command.

#### Scenario: Config already exists

- **GIVEN** a directory with existing `unentropy.json`
- **WHEN** the user runs `bunx unentropy init`
- **THEN** the system displays "Error: unentropy.json already exists. Use --force to overwrite." and exits with code 1

#### Scenario: Detection failed without --type

- **GIVEN** a directory with no recognized marker files
- **WHEN** the user runs `bunx unentropy init`
- **THEN** the system displays "Error: Could not detect project type. Use --type to specify: javascript, php, go, or python" and exits with code 1

#### Scenario: Invalid --type value error

- **GIVEN** any directory
- **WHEN** the user runs `bunx unentropy init --type invalid`
- **THEN** the system displays "Error: Invalid project type \"invalid\". Valid types: javascript, php, go, python" and exits with code 1

---

### Requirement: Test Command

The system SHALL provide a `test` command that validates the config schema and runs all metric collections sequentially without persisting data.

#### Scenario: All metrics collected successfully

- **GIVEN** a valid `unentropy.json` with 3 metrics
- **WHEN** the user runs `bunx unentropy test`
- **THEN** each metric is collected sequentially, and the output displays name, value with unit, and collection time for each, and exits with code 0

#### Scenario: Metrics displayed with value, unit, and timing

- **GIVEN** a valid `unentropy.json`
- **WHEN** the user runs `bunx unentropy test`
- **THEN** each metric displays formatted value (e.g., "4,521" for integer, "87.3%" for percent, "240 KB" for bytes) and collection duration (e.g., "0.8s")

#### Scenario: Config validation before collection

- **GIVEN** a config file
- **WHEN** the user runs `bunx unentropy test`
- **THEN** the system validates the config schema before attempting any collection

#### Scenario: Custom config path with --config

- **GIVEN** a valid config at `custom-config.json`
- **WHEN** the user runs `bunx unentropy test --config custom-config.json`
- **THEN** the system uses the specified config file

#### Scenario: Per-metric timeout override with --timeout

- **GIVEN** a metric that takes a long time
- **WHEN** the user runs `bunx unentropy test --timeout 60000`
- **THEN** the system uses 60000ms as the per-metric timeout instead of the default 30000ms

---

### Requirement: Test Error Handling

The system SHALL handle test command errors with appropriate exit codes and continue collecting remaining metrics after individual failures.

#### Scenario: Config validation fails

- **GIVEN** an invalid config schema
- **WHEN** the user runs `bunx unentropy test`
- **THEN** the system displays schema validation error and exits with code 1

#### Scenario: Config file not found

- **GIVEN** no config file exists
- **WHEN** the user runs `bunx unentropy test`
- **THEN** the system displays "Error: Config file not found: unentropy.json" with suggestion to run init, and exits with code 1

#### Scenario: Individual metric failure with continue

- **GIVEN** a config where one metric fails (e.g., missing coverage file)
- **WHEN** the user runs `bunx unentropy test`
- **THEN** the error is displayed for that metric, remaining metrics continue collecting, and exit code is 2

#### Scenario: All metrics succeed exit code 0

- **GIVEN** all metrics collect successfully
- **WHEN** the user runs `bunx unentropy test`
- **THEN** the system exits with code 0

#### Scenario: All metrics fail exit code 2

- **GIVEN** all metrics fail to collect
- **WHEN** the user runs `bunx unentropy test`
- **THEN** the system displays all errors and exits with code 2

#### Scenario: Metric command times out

- **GIVEN** a metric command that exceeds the timeout
- **WHEN** the user runs `bunx unentropy test`
- **THEN** the system displays "Error: Command timed out after 30000ms" and continues to the next metric

---

### Requirement: Preview Command

The system SHALL provide a `preview` command that generates an HTML report showing all configured metrics with empty/no-data state.

#### Scenario: Generate preview with empty data

- **GIVEN** a valid `unentropy.json` with 3 metrics
- **WHEN** the user runs `bunx unentropy preview`
- **THEN** an HTML report is generated in `unentropy-preview/index.html` showing all 3 metrics with empty/no-data state and opens in default browser

#### Scenario: Suppress browser open with --no-open

- **GIVEN** a valid config
- **WHEN** the user runs `bunx unentropy preview --no-open`
- **THEN** the report is generated but browser is not opened

#### Scenario: Custom output directory with --output

- **GIVEN** a valid config
- **WHEN** the user runs `bunx unentropy preview --output custom-dir`
- **THEN** the report is written to `custom-dir/index.html` (directory created if needed)

#### Scenario: Non-empty output directory error

- **GIVEN** an existing non-empty output directory
- **WHEN** the user runs `bunx unentropy preview`
- **THEN** the command exits with error suggesting --force flag

#### Scenario: Force overwrite existing directory with --force

- **GIVEN** an existing non-empty output directory
- **WHEN** the user runs `bunx unentropy preview --force`
- **THEN** the directory is cleared and report is generated with a warning message

#### Scenario: Config validation before preview

- **GIVEN** an invalid config schema
- **WHEN** the user runs `bunx unentropy preview`
- **THEN** schema validation error is displayed and exit code is 1

#### Scenario: Config file not found for preview

- **GIVEN** no config file exists
- **WHEN** the user runs `bunx unentropy preview`
- **THEN** the system displays error with suggestion to run init, and exits with code 1

#### Scenario: Headless environment (browser unavailable)

- **GIVEN** no browser available
- **WHEN** the user runs `bunx unentropy preview`
- **THEN** the report is generated successfully and the browser-open error is caught silently

#### Scenario: Report path displayed on success

- **GIVEN** a successful preview generation
- **WHEN** the report is generated
- **THEN** the output displays the path to the generated report file

---

### Requirement: Verify Command

The system SHALL provide a `verify` command to validate configuration files with clear success/error output and appropriate exit codes.

#### Scenario: Valid configuration

- **GIVEN** a valid `unentropy.json`
- **WHEN** the user runs `bunx unentropy verify`
- **THEN** the system exits with code 0 and displays a confirmation message

#### Scenario: Invalid configuration

- **GIVEN** an `unentropy.json` with schema errors
- **WHEN** the user runs `bunx unentropy verify`
- **THEN** the system exits with code 1 and displays specific, actionable error messages

#### Scenario: Custom config path

- **GIVEN** a config file at a non-default path
- **WHEN** the user runs `bunx unentropy verify path/to/config.json`
- **THEN** the system validates the specified file

#### Scenario: File not found

- **GIVEN** a specified config file does not exist
- **WHEN** the user runs `bunx unentropy verify`
- **THEN** the system exits with code 1 displaying a clear message

## Edge Cases

- What happens when no project type can be detected and `--type` is not provided? Command displays an error with instructions to use `--type` flag.
- What happens when the current directory is not writable? Command displays a permission error.
- What happens when detection files exist but are in subdirectories? Only root-level files are checked for detection.
- What happens when `unentropy.json` does not exist for test/preview? Command displays an error suggesting to run `init` first.
- What happens when a metric command times out in test? Command displays timeout error for that metric and continues to next.
- What happens when all metrics fail in test? Command displays all errors and exits with code 2.
- What happens when output directory parent doesn't exist for preview? Command displays a permission/path error.
- What happens when browser opening fails in preview (headless environment)? Error is caught silently, report is still generated successfully.

## Assumptions

- Users have `bunx` (Bun) available in their environment to run the command
- Projects follow standard conventions for marker files (e.g., `package.json` at root for Node.js projects)
- The default source directory (`./src`) exists or users understand they may need to adjust paths
- For coverage metrics, users will run their test suite with coverage reporting enabled before metric collection
- Monorepo support is out of scope for this version (single project type per directory)

## Dependencies

- Existing CLI infrastructure (yargs command structure)
- Existing config schema validation
- Existing metric collection runner (`src/collector/runner.ts`)
- Coverage format support depends on available collectors

## Scope Boundaries

### In Scope

- Project type detection via marker files
- Configuration file generation per project type
- CLI option overrides (--type, --storage, --force, --dry-run)
- GitHub Actions workflow guidance output
- Test command for local metric collection verification
- Preview command for empty report generation
- Verify command for config validation

### Out of Scope

- Monorepo detection and multi-project-type handling
- Framework-specific detection (e.g., Laravel, Next.js, Django)
- Interactive prompts or wizard-style configuration
- Auto-detection of source/output directories beyond defaults
- Creating actual workflow files (only outputs examples to console)
- Coverage collectors for formats not yet implemented

## Foundational Contracts

| Contract | Location | Referenced By |
|----------|----------|---------------|
| CLI Interface | `contracts/cli-interface.md` | — |
