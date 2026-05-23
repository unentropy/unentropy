## ADDED Requirements

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

## Key Entities

- **Cobertura XML Report**: A standard Cobertura XML coverage document containing package, class, and line/branch coverage data
- **Consolidated Coverage**: The merged result computed by per-class per-line deduplication for line coverage (union of covered lines), root-level summation for branch coverage, and method-key deduplication for function coverage
