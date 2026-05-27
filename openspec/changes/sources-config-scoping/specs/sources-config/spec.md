## Overview

The `sources` configuration provides a top-level, project-wide scoping mechanism for built-in collectors. It allows users to define which files and directories are part of their project using micromatch patterns, eliminating the need to repeat path and exclude logic across multiple metric commands.

## ADDED Requirements

### Requirement: Sources Configuration

As a user tracking multiple metrics on the same codebase, I want to define my project's source scope once so that all built-in collectors automatically respect it without repeating paths in every metric command.

The system SHALL accept a top-level `sources` field in `unentropy.json` containing an array of micromatch patterns. Patterns are processed in order; non-negated patterns include files, and `!`-prefixed patterns exclude files. The last matching pattern wins.

#### Scenario: Basic sources with include and exclude

- **GIVEN** `"sources": ["src/**", "tests/**", "!node_modules/**"]` in `unentropy.json`
- **WHEN** a built-in collector runs without explicit path arguments
- **THEN** it discovers and processes only files matching the final resolved pattern set

#### Scenario: Sources with negation-only exclusion

- **GIVEN** `"sources": ["**/*", "!dist/**", "!coverage/**"]`
- **WHEN** a collector runs without explicit paths
- **THEN** it includes all files except those in `dist/` and `coverage/`

#### Scenario: Sources auto-expands bare directories

- **GIVEN** `"sources": ["src", "tests"]` where `src/` and `tests/` are directories
- **WHEN** configuration is loaded
- **THEN** the system normalizes the patterns to `src/**` and `tests/**` before use

#### Scenario: Sources preserves file literals

- **GIVEN** `"sources": ["src/index.ts", "lib/helpers.ts"]`
- **WHEN** configuration is loaded
- **THEN** the system keeps the patterns as literal file paths without appending `/**`

#### Scenario: Sources preserves existing globs

- **GIVEN** `"sources": ["src/**/*.ts", "!src/**/*.test.ts"]`
- **WHEN** configuration is loaded
- **THEN** the system does not modify the patterns

#### Scenario: Empty sources is invalid

- **GIVEN** `"sources": []`
- **WHEN** configuration validation runs
- **THEN** the system rejects the empty array with a clear error

### Requirement: Collector Sources Override

As a user with a default project scope, I want to override it for specific metrics so that I can measure things outside the normal scope when needed.

The system SHALL ignore `sources` for the `loc` and `size` collectors when their commands contain explicit path or glob arguments. Coverage collectors always filter their parsed contents through `sources` regardless of command arguments.

#### Scenario: Loc with explicit path ignores sources

- **GIVEN** `"sources": ["src/**"]` and a metric with command `@collect loc ./tests`
- **WHEN** the metric is collected
- **THEN** the system counts lines in `./tests`, ignoring `sources`

#### Scenario: Loc without path uses sources

- **GIVEN** `"sources": ["src/**", "tests/**"]` and a metric with command `@collect loc`
- **WHEN** the metric is collected
- **THEN** the system counts lines in all files matching `sources`

#### Scenario: Size with explicit path ignores sources

- **GIVEN** `"sources": ["src/**"]` and a metric with command `@collect size dist/bundle.js`
- **WHEN** the metric is collected
- **THEN** the system measures `dist/bundle.js`, ignoring `sources`

#### Scenario: Size without paths uses sources

- **GIVEN** `"sources": ["dist/**"]` and a metric with command `@collect size`
- **WHEN** the metric is collected
- **THEN** the system measures all files matching `dist/**`

#### Scenario: Coverage always filters through sources

- **GIVEN** `"sources": ["src/**"]` and a metric with command `@collect coverage-lcov ./coverage/lcov.info`
- **WHEN** the metric is collected
- **THEN** the system parses the LCOV file but only includes source files under `src/` in the coverage calculation

#### Scenario: No sources means no filtering

- **GIVEN** no `sources` field in `unentropy.json`
- **WHEN** any collector runs
- **THEN** behavior is identical to pre-sources behavior (explicit paths required for loc/size; coverage parses entire report)

### Requirement: Coverage Sources Filtering

As a user with generated or vendored files in my coverage reports, I want to filter coverage data through my project scope so that only relevant source files contribute to the metric.

The system SHALL filter source file paths from coverage reports through `sources` before computing coverage percentages. When files are excluded, the system recalculates coverage from the remaining file-level data rather than using pre-computed report aggregates.

#### Scenario: LCOV filters excluded files

- **GIVEN** an LCOV report containing `SF:src/app.ts` and `SF:node_modules/lib.ts`, with `"sources": ["src/**"]`
- **WHEN** line coverage is computed
- **THEN** only `src/app.ts` contributes to the percentage

#### Scenario: Cobertura recalculates after filtering

- **GIVEN** a Cobertura report with classes in `src/` and `generated/`, with `"sources": ["src/**"]`
- **WHEN** line coverage is computed
- **THEN** the percentage is recalculated from `src/` class data only, not from the report's root `@_line-rate`

#### Scenario: Clover recalculates after filtering

- **GIVEN** a Clover report with files in `src/` and `vendor/`, with `"sources": ["src/**"]`
- **WHEN** line coverage is computed
- **THEN** the percentage is recalculated from `src/` file data only, not from the project's pre-computed metrics

#### Scenario: All coverage files excluded

- **GIVEN** a coverage report where every source file is excluded by `sources`
- **WHEN** coverage is computed
- **THEN** the system returns 0

## Key Entities

- **`sources`**: A top-level `unentropy.json` field containing an ordered array of micromatch patterns that define the project's scope.
- **Micromatch pattern**: A glob pattern supporting `*`, `**`, `?`, character classes, and `!` negation prefixes.
- **Bare directory literal**: A pattern without glob characters that resolves to an existing directory on disk; auto-expanded to `/**` for recursive matching.

## Related

- `metrics/` — The built-in collectors that consume `sources` for scoping.
