## Overview

Delta specification for the Metrics capability. This change clarifies that all in-process collectors and metric command execution resolve relative file paths against the config root directory when `--config` is used, rather than the current working directory.

## ADDED Requirements

### Requirement: Collector Path Resolution Against Config Root

As a user with metrics configured in a project directory, I want my `@collect` commands to find files relative to my config file so that I can run unentropy from any working directory.

The system SHALL resolve all relative paths passed to `@collect` collectors against the config root directory. The config root directory SHALL be the directory containing the loaded `unentropy.json` file when `--config` is provided, or the current working directory otherwise.

#### Scenario: LOC collector resolves path against config root

- **GIVEN** a config at `/home/user/project/unentropy.json` with metric command `@collect loc ./src`
- **WHEN** the user runs `bunx unentropy test --config /home/user/project/unentropy.json` from `/tmp`
- **THEN** the system counts lines of code in `/home/user/project/src`

#### Scenario: Size collector resolves glob against config root

- **GIVEN** a config at `/home/user/project/unentropy.json` with metric command `@collect size ./dist/*.js`
- **WHEN** the user runs `bunx unentropy test --config /home/user/project/unentropy.json` from `/tmp`
- **THEN** the system sums sizes of all `.js` files in `/home/user/project/dist`

#### Scenario: Coverage collector resolves file path against config root

- **GIVEN** a config at `/home/user/project/unentropy.json` with metric command `@collect coverage-lcov ./coverage/lcov.info`
- **WHEN** the user runs `bunx unentropy test --config /home/user/project/unentropy.json` from `/tmp`
- **THEN** the system parses `/home/user/project/coverage/lcov.info`

## MODIFIED Requirements

### Requirement: In-Process Collectors

The system SHALL support `@collect` commands that execute collectors in-process without spawning subprocesses, providing consistent behavior and better performance than equivalent shell commands. All relative paths passed as arguments to collectors SHALL be resolved against the config root directory before file system operations.

#### Scenario: Lines of code collection

- **GIVEN** a metric with command `@collect loc ./src`
- **WHEN** the metric is collected with config root `/home/user/project`
- **THEN** the system invokes the `loc` collector in-process, passing `./src` resolved against `/home/user/project` as the target directory

#### Scenario: Bundle size with glob

- **GIVEN** a metric with command `@collect size ./dist/*.js`
- **WHEN** the metric is collected with config root `/home/user/project`
- **THEN** the system sums the size of all matching JavaScript files resolved against `/home/user/project`

#### Scenario: Coverage from LCOV

- **GIVEN** a metric with command `@collect coverage-lcov ./coverage/lcov.info`
- **WHEN** the metric is collected with config root `/home/user/project`
- **THEN** the system parses the LCOV file at `/home/user/project/coverage/lcov.info` and returns the line coverage percentage

#### Scenario: Collector failure

- **GIVEN** a metric with command `@collect size ./nonexistent/*.js`
- **WHEN** the metric is collected
- **THEN** the system fails with an error message rather than returning a fallback value of zero

## REMOVED Requirements

## Key Entities

- **Config root directory**: The base directory from which collector paths are resolved when `--config` is provided.

## Related

- `config-directory-context/` — Config root directory establishment
- `cli/` — CLI command execution that passes config root to collectors
