## Overview

Delta specification for the `metrics` capability. Modifies in-process collector behavior to support the new top-level `sources` configuration for scoping.

## MODIFIED Requirements

### Requirement: In-Process Collectors

The system SHALL support `@collect` commands that execute collectors in-process without spawning subprocesses, providing consistent behavior and better performance than equivalent shell commands. When the `sources` configuration is present, collectors that do not receive explicit path arguments SHALL use `sources` as their default search scope.

#### Scenario: Lines of code collection with explicit path

- **GIVEN** a metric with command `@collect loc ./src`
- **WHEN** the metric is collected
- **THEN** the system invokes the `loc` collector in-process, passing `./src` as the target directory, ignoring any configured `sources`

#### Scenario: Lines of code collection using sources

- **GIVEN** `"sources": ["src/**", "tests/**"]` and a metric with command `@collect loc`
- **WHEN** the metric is collected
- **THEN** the system discovers files matching `sources` and counts their lines

#### Scenario: Bundle size with explicit glob ignores sources

- **GIVEN** `"sources": ["src/**"]` and a metric with command `@collect size ./dist/*.js`
- **WHEN** the metric is collected
- **THEN** the system sums the size of the matching JavaScript files, ignoring `sources`

#### Scenario: Bundle size using sources

- **GIVEN** `"sources": ["dist/**"]` and a metric with command `@collect size`
- **WHEN** the metric is collected
- **THEN** the system discovers files matching `dist/**` and sums their sizes

#### Scenario: Coverage from LCOV with sources filtering

- **GIVEN** a metric with command `@collect coverage-lcov ./coverage/lcov.info` and `"sources": ["src/**"]`
- **WHEN** the metric is collected
- **THEN** the system parses the LCOV file and returns the line coverage percentage for source files matching `src/**` only

#### Scenario: Collector failure

- **GIVEN** a metric with command `@collect size ./nonexistent/*.js`
- **WHEN** the metric is collected
- **THEN** the system fails with an error message rather than returning a fallback value of zero

### Requirement: Multi-File Coverage Collection

As a user running tests in parallel CI jobs, I want to merge multiple Cobertura XML files so that I get one consolidated coverage metric representing the full test suite.

The system SHALL accept multiple Cobertura XML file paths to the `coverage-cobertura` collector, parse each one, compute a merged coverage percentage across all reports, and filter source files through `sources` before computing the final percentage.

#### Scenario: Merge two non-overlapping reports with sources

- **GIVEN** two Cobertura XML files covering different source files, with `"sources": ["src/**"]`
- **WHEN** the merge operation runs
- **THEN** the returned coverage includes only files under `src/` from both reports

#### Scenario: Merge with line coverage type and sources

- **GIVEN** multiple Cobertura XML files and `--type line` (or default), with `"sources": ["src/**"]`
- **WHEN** the merge operation runs
- **THEN** the result is the combined line coverage percentage of `src/` files only

#### Scenario: Merge with branch coverage type and sources

- **GIVEN** multiple Cobertura XML files and `--type branch`, with `"sources": ["src/**"]`
- **WHEN** the merge operation runs
- **THEN** the result is the combined branch coverage percentage of `src/` files only

#### Scenario: Merge with function coverage type and sources

- **GIVEN** multiple Cobertura XML files and `--type function`, with `"sources": ["src/**"]`
- **WHEN** the merge operation runs
- **THEN** the result is the combined function coverage percentage of `src/` classes only

#### Scenario: Single file with merge syntax and sources

- **GIVEN** only one Cobertura XML file path is provided to the merge-capable collector, with `"sources": ["src/**"]`
- **WHEN** the merge operation runs
- **THEN** the result matches what the single-file parser would return for that file, filtered to `src/` files

#### Scenario: Overlapping partial coverage with sources

- **GIVEN** two reports where file A (under `src/`) has lines 1-50 covered out of 100 lines in report 1, and lines 51-80 covered out of 100 lines in report 2, with `"sources": ["src/**"]`
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

### Requirement: Clover XML Coverage Collection

As a user of a PHP project (or any project that produces Clover XML reports), I want to collect coverage metrics from `clover.xml` files so that I can track PHPUnit coverage in Unentropy.

The system SHALL provide a `coverage-clover` built-in collector that parses Clover XML coverage reports, filters source files through `sources`, and returns a coverage percentage recalculated from the remaining file-level data.

#### Scenario: Line coverage from PHPUnit Clover report with sources

- **GIVEN** a PHP project that produces a Clover XML report via `phpunit --coverage-clover`, with `"sources": ["src/**"]`
- **WHEN** a user configures `"coverage": { "$ref": "coverage", "command": "@collect coverage-clover clover.xml" }`
- **THEN** the system parses the Clover XML file and returns the line coverage percentage calculated only from `src/` files

#### Scenario: Function coverage from Clover report with sources

- **GIVEN** a Clover XML report containing method coverage data, with `"sources": ["src/**"]`
- **WHEN** a user specifies `--type function` with the `coverage-clover` collector
- **THEN** the system returns the function coverage percentage of `src/` files only

#### Scenario: Branch coverage from Clover report with sources

- **GIVEN** a Clover XML report with conditional coverage data, with `"sources": ["src/**"]`
- **WHEN** a user specifies `--type branch` with the `coverage-clover` collector
- **THEN** the system returns the branch coverage percentage of `src/` files only

#### Scenario: Multi-file merge with sources

- **GIVEN** multiple Clover XML file paths to `coverage-clover`, with `"sources": ["src/**"]`
- **THEN** the system merges coverage for `src/` files only: for line type, per-file per-statement-line deduplication via union of covered lines from `<line type="stmt">` elements; for function and branch types, project-level summation of `methods`/`coveredmethods` and `conditionals`/`coveredconditionals` across `src/` files only before computing the percentage

#### Scenario: Malformed XML

- **GIVEN** a Clover XML file with invalid XML content
- **WHEN** the `coverage-clover` collector attempts to parse it
- **THEN** the system fails with an error describing the parse failure

#### Scenario: Missing coverage data

- **GIVEN** a Clover XML file that is valid XML but lacks expected coverage attributes
- **WHEN** the `coverage-clover` collector attempts to parse it
- **THEN** the system fails with an error indicating missing coverage data

## Key Entities

- **`sources`**: A top-level `unentropy.json` field containing an ordered array of micromatch patterns. See `sources-config/` spec for full definition.

## Related

- `sources-config/` — Defines the `sources` configuration schema and behavior.
