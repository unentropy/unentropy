## Overview

Delta specification for the CLI capability. This change adds config directory context awareness to CLI commands so that relative paths in metric commands are resolved against the config file's directory when `--config` is provided.

## ADDED Requirements

### Requirement: Config Directory Context in Test Command

As a user running `unentropy test` from a different directory with `--config`, I want metric shell commands to execute in the config file's directory so that relative file paths in those commands resolve correctly.

The system SHALL establish a config root directory before executing metric commands. All shell commands defined in the metrics configuration SHALL be executed with the config root directory as the working directory. `@collect` commands SHALL resolve their arguments relative to the config root directory.

#### Scenario: Shell command resolves relative to config directory

- **GIVEN** a config at `/home/user/project/unentropy.json` containing a metric with command `cat ./coverage/lcov.info`
- **WHEN** the user runs `bunx unentropy test --config /home/user/project/unentropy.json` from `/tmp`
- **THEN** the shell command executes in `/home/user/project` and successfully reads `/home/user/project/coverage/lcov.info`

#### Scenario: @collect resolves relative to config directory

- **GIVEN** a config at `/home/user/project/unentropy.json` containing a metric with command `@collect loc ./src`
- **WHEN** the user runs `bunx unentropy test --config /home/user/project/unentropy.json` from `/tmp`
- **THEN** the `loc` collector analyzes `/home/user/project/src`

#### Scenario: Absolute paths unaffected by config directory

- **GIVEN** a config containing a metric with command `cat /absolute/path/to/file.xml`
- **WHEN** the metric is collected from any working directory
- **THEN** the absolute path is used as-is without modification

## MODIFIED Requirements

### Requirement: Test Command

The system SHALL provide a `test` command that validates the config schema and runs all metric collections sequentially without persisting data. When the `--config` option is provided, the system SHALL establish a config root directory from the specified config file's location and execute all metric commands with that directory as the working directory.

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
- **THEN** the system uses the specified config file and establishes the config root directory from its location

#### Scenario: Per-metric timeout override with --timeout

- **GIVEN** a metric that takes a long time
- **WHEN** the user runs `bunx unentropy test --timeout 60000`
- **THEN** the system uses 60000ms as the per-metric timeout instead of the default 30000ms

## REMOVED Requirements

## Key Entities

- **Config root directory**: The directory containing the loaded config file, used as the working directory for metric command execution.

## Related

- `config-directory-context/` — Config root directory establishment
- `metrics/` — Metric command execution and collector path resolution
