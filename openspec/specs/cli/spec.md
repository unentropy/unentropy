# cli Specification

## Purpose
Provide a command-line interface for project initialization, metric collection testing, report preview generation, and configuration validation.
## Requirements
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

WHEN the user runs `unentropy preview` without the `--db` option,
the system SHALL generate an HTML report with synthetic placeholder data from the config file.

WHEN the user runs `unentropy preview --db <path>` with the `--db` option,
the system SHALL generate an HTML report with real data from the specified SQLite database.

#### Scenario: Preview with synthetic data

- **GIVEN** a valid `unentropy.json` with 3 metrics
- **WHEN** the user runs `bunx unentropy preview`
- **THEN** an HTML report is generated in `unentropy-preview/index.html` showing all 3 metrics with synthetic placeholder data and opens in default browser

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

#### Scenario: Successful report from local DB

- **GIVEN** a valid `unentropy.json` config file
- **AND** a SQLite database file at the path specified by `--db` containing metric data
- **WHEN** the user runs `bunx unentropy preview --db ./unentropy.db`
- **THEN** the system opens the config file
- **AND** checks that the database file exists
- **AND** opens the database in read-only mode
- **AND** generates a complete HTML report with real metric data, charts, and statistics
- **AND** writes the report to the output directory
- **AND** opens the report in the default browser

#### Scenario: Non-existent database file

- **GIVEN** a valid `unentropy.json` config file
- **AND** no SQLite database file at the path specified by `--db`
- **WHEN** the user runs `bunx unentropy preview --db ./nonexistent.db`
- **THEN** the system prints an error message: "Error: Database not found: ./nonexistent.db"
- **AND** prints a hint: "Run metric collection first, or check the path."
- **AND** exits with a non-zero exit code
- **AND** does not generate any report

#### Scenario: Empty database

- **GIVEN** a valid `unentropy.json` config file
- **AND** a SQLite database file at the path specified by `--db` that exists but contains no build data
- **WHEN** the user runs `bunx unentropy preview --db ./unentropy.db`
- **THEN** the system generates a report with zero build count
- **AND** shows preview toggle for synthetic data (since buildCount < 10)

#### Scenario: Report header shows directory name

- **GIVEN** the current working directory is `/Users/alice/projects/my-app`
- **WHEN** the user runs `bunx unentropy preview --db ./unentropy.db`
- **THEN** the generated report displays "my-app" as the repository name

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

---

### Requirement: Import Command

The system SHALL provide `unentropy import <jsonl-path>` which validates and ingests the file into the SQLite database at `--output`, creating the database if it does not exist. The command SHALL operate purely on local files and SHALL NOT make any network calls.

#### Scenario: Import into a new database

- **GIVEN** a valid JSONL file and a non-existent `--output` path
- **WHEN** the user runs `bunx unentropy import ./data.jsonl --output ./scratch.db`
- **THEN** the database is created with the current schema, the records are inserted, and the command exits 0

#### Scenario: Import into an existing database

- **GIVEN** an existing SQLite database (CI-produced or from a prior import)
- **WHEN** the user runs the import command with `--output` pointing at it
- **THEN** the new records are inserted alongside existing rows; nothing pre-existing is modified

#### Scenario: Dry-run validates without writing

- **GIVEN** a JSONL file
- **WHEN** the user runs `bunx unentropy import ./data.jsonl --output ./scratch.db --dry-run`
- **THEN** the system performs full validation and commit-resolution, prints a summary (record count, metric ids, date range, per-source counts, per-tier resolution counts), and writes nothing to the database

#### Scenario: Strict mode aborts on first invalid record

- **GIVEN** a JSONL file containing any invalid record
- **WHEN** the user passes `--strict`
- **THEN** the command exits 1 with the file/line/reason of the failure and writes no records

#### Scenario: Custom trend branch for commit resolution

- **GIVEN** a repository whose integration branch is `develop`
- **WHEN** the user runs the import command with `--trend-branch develop`
- **THEN** the commit resolver uses `develop` for nearest-by-timestamp lookups instead of the default `main`

#### Scenario: Validation errors with file/line context

- **GIVEN** a JSONL file containing one malformed line
- **WHEN** the user runs the command without `--strict`
- **THEN** the system prints the path, line number, and reason; skips that record; continues; and exits 0

---

### Requirement: Import Command Error Handling

The system SHALL exit with appropriate codes and clear messages for error conditions in the import command, in line with the conventions used by other CLI commands.

#### Scenario: Config file not found

- **GIVEN** no `unentropy.json` exists in the current directory and the user has not passed `--config`
- **WHEN** the user runs the import command
- **THEN** the system prints "Error: Config file not found: unentropy.json" with a suggestion to run init and exits with code 1

#### Scenario: JSONL file missing

- **GIVEN** the JSONL path passed as the positional argument does not exist
- **WHEN** the import command runs
- **THEN** the system prints "Error: JSONL file not found: <path>" and exits with code 1

#### Scenario: Database write conflicts with locked file

- **GIVEN** another process holds a write lock on the target SQLite database
- **WHEN** the import command attempts to write
- **THEN** the system reports the lock and exits with code 1 without producing a partial database

#### Scenario: Shallow clone error

- **GIVEN** the local repository was cloned without full history and the JSONL has records that need nearest-by-timestamp resolution
- **WHEN** the import command runs
- **THEN** the system prints a single error explaining the requirement (`git fetch --unshallow`, or `fetch-depth: 0` in CI) and exits with code 1 before writing any records

### Requirement: Seed-Workflow Emission

As a user (or agent acting on a user's behalf) seeding the `sqlite-artifact` storage backend, I want a single command that prints the exact workflow YAML I need to commit to a disposable branch, so that I do not have to keep the seed-workflow template synchronized by hand across documentation, blog posts, and agent skills.

The system SHALL provide `unentropy import seed-workflow` which writes a canonical seed-workflow YAML to stdout (or to a path passed via `--output`), parameterized by the configured `artifactName` read from `unentropy.json`.

#### Scenario: Emit workflow to stdout

- **GIVEN** a project with `unentropy.json` configured for `sqlite-artifact` storage with the default `artifactName` of `unentropy-metrics`
- **WHEN** the user runs `unentropy import seed-workflow`
- **THEN** the system writes the seed workflow YAML to stdout, with the `actions/upload-artifact@v4` step's `name:` set to `unentropy-metrics`, and exits 0

#### Scenario: Emit workflow with a custom artifact name

- **GIVEN** `unentropy.json` sets `storage.artifact.name` to `custom-metrics`
- **WHEN** the user runs `unentropy import seed-workflow`
- **THEN** the emitted YAML's upload step references `name: custom-metrics`

#### Scenario: Write workflow to a file

- **GIVEN** any valid configuration
- **WHEN** the user runs `unentropy import seed-workflow --output .github/workflows/unentropy-seed.yml`
- **THEN** the file is written at that path; if the parent directory does not exist the system creates it; if the file already exists the system refuses unless `--force` is passed and exits 1 with an actionable message

#### Scenario: Refuses on non-artifact storage

- **GIVEN** `unentropy.json` configures storage as `sqlite-local` or `sqlite-s3`
- **WHEN** the user runs `unentropy import seed-workflow`
- **THEN** the system prints a clear message that the helper is only meaningful for the `sqlite-artifact` backend, suggests publishing the local SQLite directly for those backends, and exits 1

#### Scenario: Config file not found

- **GIVEN** no `unentropy.json` exists in the working directory
- **WHEN** the user runs `unentropy import seed-workflow`
- **THEN** the system prints `Error: Config file not found: unentropy.json` and exits 1, consistent with the rest of the import command tree

