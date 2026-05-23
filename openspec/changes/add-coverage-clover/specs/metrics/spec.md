## Overview

This delta extends the Metrics Specification with support for Clover XML coverage reports, adding a new built-in collector `coverage-clover` alongside the existing Cobertura and LCOV collectors.

## ADDED Requirements

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

- **Clover XML report**: An XML format produced by PHPUnit (`--coverage-clover`) and OpenClover containing coverage metrics organized as a project hierarchy with per-file `<metrics>` elements
- **Coverage type**: The aspect of coverage being measured — line (via `statements`), function (via `methods`), or branch (via `conditionals`)
