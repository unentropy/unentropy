# Feature Specification: Init Scaffolding & Test Commands

**Feature Branch**: `008-init-scaffolding`  
**Created**: 2025-01-06  
**Status**: Draft  
**Input**: User description: "CLI scaffolding command that detects project type and generates unentropy.json configuration, plus a test command to verify metric collection locally"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick Start with Auto-Detection (Priority: P1)

A developer wants to start tracking metrics in their existing project with minimal setup. They run `bunx unentropy init` in their project directory, and the command automatically detects the project type (JavaScript/TypeScript, PHP, Go, or Python) and creates a sensible default configuration.

**Why this priority**: This is the core value proposition - reducing friction for new users to adopt unentropy. Without auto-detection, users must manually research which metrics apply to their stack.

**Independent Test**: Can be fully tested by running `bunx unentropy init` in a directory containing a `package.json` file and verifying a valid `unentropy.json` is created with JavaScript-appropriate metrics.

**Acceptance Scenarios**:

1. **Given** a directory containing `package.json`, **When** user runs `bunx unentropy init`, **Then** the command creates `unentropy.json` with JavaScript/TypeScript metrics (lines-of-code, test-coverage, size)
2. **Given** a directory containing `composer.json`, **When** user runs `bunx unentropy init`, **Then** the command creates `unentropy.json` with PHP metrics (lines-of-code, test-coverage)
3. **Given** a directory containing `go.mod`, **When** user runs `bunx unentropy init`, **Then** the command creates `unentropy.json` with Go metrics (lines-of-code, test-coverage, binary-size)
4. **Given** a directory containing `pyproject.toml`, **When** user runs `bunx unentropy init`, **Then** the command creates `unentropy.json` with Python metrics (lines-of-code, test-coverage)
5. **Given** a directory with multiple project markers (e.g., both `package.json` and `requirements.txt`), **When** user runs `bunx unentropy init`, **Then** the command uses priority order (JavaScript > PHP > Go > Python) to select one type

---

### User Story 2 - Force Project Type Override (Priority: P2)

A developer has a multi-language project or wants to use a different configuration than what was auto-detected. They can explicitly specify the project type using the `--type` flag.

**Why this priority**: Enables users to override auto-detection when needed, supporting edge cases and user preferences without blocking the core functionality.

**Independent Test**: Can be tested by running `bunx unentropy init --type php` in any directory and verifying PHP-specific configuration is generated regardless of what files exist.

**Acceptance Scenarios**:

1. **Given** a directory containing `package.json`, **When** user runs `bunx unentropy init --type php`, **Then** the command creates `unentropy.json` with PHP metrics (ignoring the JavaScript markers)
2. **Given** an empty directory, **When** user runs `bunx unentropy init --type go`, **Then** the command creates `unentropy.json` with Go metrics
3. **Given** any directory, **When** user runs `bunx unentropy init --type invalid`, **Then** the command displays an error listing valid types (javascript, php, go, python)

---

### User Story 3 - GitHub Actions Workflow Guidance (Priority: P2)

After generating the configuration, the developer needs to know how to integrate unentropy into their CI/CD pipeline. The command outputs ready-to-use GitHub Actions workflow examples for both metric tracking and quality gate evaluation.

**Why this priority**: Configuration alone is not enough - users need actionable next steps to complete their setup. This guidance reduces time-to-value significantly.

**Independent Test**: Can be tested by running `bunx unentropy init` and verifying the console output contains valid GitHub Actions YAML snippets for both track-metrics and quality-gate workflows.

**Acceptance Scenarios**:

1. **Given** a successful init, **When** the configuration is created, **Then** the command outputs a GitHub Actions workflow example for tracking metrics on main branch pushes
2. **Given** a successful init, **When** the configuration is created, **Then** the command outputs a GitHub Actions workflow example for quality gate on pull requests
3. **Given** a JavaScript project init, **When** viewing the workflow examples, **Then** the examples include appropriate setup steps (actions/setup-node) and test commands (npm test --coverage)
4. **Given** a PHP project init, **When** viewing the workflow examples, **Then** the examples include appropriate setup steps (shivammathur/setup-php) and test commands (vendor/bin/phpunit)

---

### User Story 4 - Safe File Handling (Priority: P3)

A developer accidentally runs `init` in a project that already has `unentropy.json`. The command should prevent accidental overwrites unless explicitly requested.

**Why this priority**: Protects users from accidentally losing their customized configuration. Important for safety but not blocking core functionality.

**Independent Test**: Can be tested by creating an `unentropy.json` file, running `bunx unentropy init`, and verifying the command exits with an error without modifying the existing file.

**Acceptance Scenarios**:

1. **Given** a directory with existing `unentropy.json`, **When** user runs `bunx unentropy init`, **Then** the command displays an error and does not overwrite the file
2. **Given** a directory with existing `unentropy.json`, **When** user runs `bunx unentropy init --force`, **Then** the command overwrites the existing file with new configuration
3. **Given** any directory, **When** user runs `bunx unentropy init --dry-run`, **Then** the command displays what would be created without writing any files

---

### User Story 5 - Storage Type Selection (Priority: P3)

A developer wants to use S3 storage instead of the default artifact storage. They can specify the storage type during initialization.

**Why this priority**: Advanced users may need different storage backends, but artifact storage is a sensible default for most users.

**Independent Test**: Can be tested by running `bunx unentropy init --storage s3` and verifying the generated configuration uses `sqlite-s3` storage type.

**Acceptance Scenarios**:

1. **Given** any project, **When** user runs `bunx unentropy init`, **Then** the configuration uses `sqlite-artifact` as the default storage type
2. **Given** any project, **When** user runs `bunx unentropy init --storage s3`, **Then** the configuration uses `sqlite-s3` storage type
3. **Given** any project, **When** user runs `bunx unentropy init --storage local`, **Then** the configuration uses `sqlite-local` storage type
4. **Given** S3 storage is selected, **When** viewing the workflow examples, **Then** the examples include S3 secret configuration placeholders and instructions

---

### User Story 6 - Verify Metric Collection Locally (Priority: P2)

A developer wants to verify that all metrics can be collected successfully before pushing to CI. They run `bunx unentropy test` to execute all collection commands locally and see results without persisting any data.

**Why this priority**: Reduces CI debugging cycles by catching configuration and collection issues locally. Natural follow-up after running `init`.

**Independent Test**: Can be tested by running `bunx unentropy test` in a project with a valid `unentropy.json` and verifying all metrics are collected and displayed with their values.

**Acceptance Scenarios**:

1. **Given** a valid `unentropy.json` with 3 metrics, **When** user runs `bunx unentropy test`, **Then** each metric is collected sequentially with value, unit, and timing displayed
2. **Given** a config with a metric that fails (e.g., missing coverage file), **When** user runs `bunx unentropy test`, **Then** the error is displayed for that metric and exit code is 2
3. **Given** an invalid config schema, **When** user runs `bunx unentropy test`, **Then** schema validation error is displayed and exit code is 1
4. **Given** any config, **When** user runs `bunx unentropy test --verbose`, **Then** the actual command executed for each metric is shown
5. **Given** a successful `init`, **When** the output is displayed, **Then** it includes a suggestion to run `bunx unentropy test` to verify collection

---

### Edge Cases

#### Init Command
- What happens when no project type can be detected and `--type` is not provided? Command displays an error with instructions to use `--type` flag.
- What happens when the current directory is not writable? Command displays a permission error.
- What happens when detection files exist but are in subdirectories? Only root-level files are checked for detection.

#### Test Command
- What happens when `unentropy.json` does not exist? Command displays an error suggesting to run `init` first.
- What happens when a metric command times out? Command displays timeout error for that metric and continues to next.
- What happens when all metrics fail? Command displays all errors and exits with code 2.

## Requirements *(mandatory)*

### Functional Requirements

#### Detection

- **FR-001**: System MUST detect JavaScript/TypeScript projects by presence of: `package.json`, `tsconfig.json`, `bun.lockb`, `pnpm-lock.yaml`, `yarn.lock`, or `package-lock.json`
- **FR-002**: System MUST detect PHP projects by presence of: `composer.json` or `composer.lock`
- **FR-003**: System MUST detect Go projects by presence of: `go.mod` or `go.sum`
- **FR-004**: System MUST detect Python projects by presence of: `pyproject.toml`, `setup.py`, `requirements.txt`, `Pipfile`, or `setup.cfg`
- **FR-005**: System MUST use priority order for detection when multiple project types are present: JavaScript (1st) > PHP (2nd) > Go (3rd) > Python (4th)
- **FR-006**: System MUST only check for detection files in the current working directory (not subdirectories)

#### Configuration Generation

- **FR-007**: System MUST generate valid `unentropy.json` configuration conforming to the existing config schema
- **FR-008**: System MUST include `lines-of-code` metric for all project types with appropriate language filter
- **FR-009**: System MUST include `test-coverage` metric for all project types with appropriate coverage format
- **FR-010**: System MUST include `size` metric for JavaScript/TypeScript and Go projects (as `binary-size`)
- **FR-011**: System MUST include a default quality gate with test-coverage threshold (minimum 80%, severity: warning, mode: soft)
- **FR-012**: System MUST use `sqlite-artifact` as the default storage type
- **FR-013**: System MUST use `./src` as the default source directory for LOC collection (except Go which uses `.`)

#### CLI Options

- **FR-014**: System MUST support `--type` / `-t` option to force project type (values: javascript, php, go, python)
- **FR-015**: System MUST support `--storage` / `-s` option to select storage type (values: artifact, s3, local; default: artifact)
- **FR-016**: System MUST support `--force` / `-f` option to overwrite existing configuration
- **FR-017**: System MUST support `--dry-run` option to preview without writing files

#### Output

- **FR-018**: System MUST display detected project type and detection evidence (which files were found)
- **FR-019**: System MUST display list of metrics included in the generated configuration
- **FR-020**: System MUST output GitHub Actions workflow example for metric tracking (main branch pushes)
- **FR-021**: System MUST output GitHub Actions workflow example for quality gate (pull requests)
- **FR-022**: System MUST include project-type-specific setup steps in workflow examples (e.g., setup-node for JS, setup-php for PHP)
- **FR-023**: System MUST include project-type-specific test commands in workflow examples
- **FR-024**: When S3 storage is selected, system MUST output instructions for required secrets configuration

#### Init Error Handling

- **FR-025**: System MUST exit with error code 1 when `unentropy.json` already exists (unless `--force` is used)
- **FR-026**: System MUST exit with error code 1 when project type cannot be detected and `--type` is not provided
- **FR-027**: System MUST exit with error code 1 when invalid `--type` value is provided
- **FR-028**: System MUST display clear, actionable error messages for all error conditions
- **FR-029**: After successful init, system MUST display next steps including suggestion to run `bunx unentropy test`

#### Test Command

- **FR-030**: System MUST provide `test` command to validate config and run all metric collections without persisting data
- **FR-031**: System MUST first validate config schema before attempting collection
- **FR-032**: System MUST run metrics sequentially, displaying each result as it completes
- **FR-033**: System MUST display metric name, collected value, unit, and collection time for each metric
- **FR-034**: System MUST support `--config` / `-c` option to specify alternate config file path (default: `unentropy.json`)
- **FR-035**: System MUST support `--verbose` / `-v` option to show the command executed for each metric
- **FR-036**: System MUST support `--timeout` option to override default per-metric timeout (default: 30000ms)
- **FR-037**: System MUST respect per-metric timeout settings from config when `--timeout` is not specified

#### Test Error Handling

- **FR-038**: System MUST exit with code 0 if all metrics collected successfully
- **FR-039**: System MUST exit with code 1 if config validation fails
- **FR-040**: System MUST exit with code 2 if one or more metrics fail to collect
- **FR-041**: System MUST continue collecting remaining metrics after a failure (not fail-fast)
- **FR-042**: System MUST display clear error message for each failed metric

### Key Entities

- **Project Type**: One of four supported types (javascript, php, go, python) with associated detection rules and configuration templates
- **Configuration Template**: A pre-defined set of metrics, storage settings, and quality gate thresholds appropriate for a specific project type
- **Detection Rule**: A set of filenames that indicate a specific project type when present in the current directory
- **Collection Result**: The outcome of running a metric's collection command, including value, unit, timing, and success/failure status

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can generate a valid configuration file in under 5 seconds from running the command
- **SC-002**: Generated configurations pass validation (`bunx unentropy verify`) without errors in 100% of cases
- **SC-003**: Detection correctly identifies project type based on standard marker files with 100% accuracy for single-type projects
- **SC-004**: Users can integrate unentropy into their GitHub Actions workflow within 10 minutes of running init (using provided examples)
- **SC-005**: Command provides clear guidance for all error conditions, requiring no external documentation lookup to resolve
- **SC-006**: 90% of users can complete initial setup (init + first successful metric collection) without needing to manually edit the generated configuration
- **SC-007**: Users can verify all metrics collect successfully in under 60 seconds using the test command
- **SC-008**: Test command clearly identifies which metrics failed and why, enabling users to fix issues without external documentation

## Assumptions

- Users have `bunx` (Bun) available in their environment to run the command
- Projects follow standard conventions for marker files (e.g., `package.json` at root for Node.js projects)
- The default source directory (`./src`) exists or users understand they may need to adjust paths
- For coverage metrics, users will run their test suite with coverage reporting enabled before metric collection
- Monorepo support is out of scope for this version (single project type per directory)

## Out of Scope

- Monorepo detection and multi-project-type handling
- Framework-specific detection (e.g., Laravel, Next.js, Django)
- Interactive prompts or wizard-style configuration
- Auto-detection of source/output directories beyond defaults
- Creating actual workflow files (only outputs examples to console)
- Coverage collectors for formats not yet implemented (clover, cobertura, go cover profile) - will use LCOV fallback where available

## Dependencies

- Existing CLI infrastructure (yargs command structure)
- Existing config schema validation
- Existing metric collection runner (`src/collector/runner.ts`)
- Coverage format support depends on available collectors:
  - JavaScript/TypeScript: LCOV (available)
  - PHP: Clover XML (available via `@collect coverage-xml`)
  - Go: Go cover profile (not yet available - will use shell command fallback)
  - Python: Cobertura XML (not yet available - will document LCOV alternative via `--cov-report=lcov`)
