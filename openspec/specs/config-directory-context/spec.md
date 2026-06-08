# Config Directory Context Specification

## Purpose

Establish the root directory from which all relative paths in metric commands and collector arguments are resolved, ensuring consistent metric collection regardless of where the command is run.

## Overview

Config directory context establishes the root directory from which all relative paths in metric commands and collector arguments are resolved. When a user invokes unentropy with `--config` pointing to a config file outside the current working directory, the system must resolve paths relative to the config file's location rather than the invocation directory, ensuring consistent metric collection regardless of where the command is run.

## Requirements

### Requirement: Config Root Directory Establishment

As a user running unentropy from a different directory than my project root, I want relative paths in my config to resolve against the config file's location so that metric collection works correctly regardless of my current working directory.

The system SHALL derive a config root directory from the resolved path of the loaded `unentropy.json` file. When the `--config` option is provided, the system SHALL use the directory containing the specified config file as the config root directory. When no `--config` option is provided, the system SHALL use the current working directory as the config root directory.

#### Scenario: Config root from --config path

- **GIVEN** a config file at `/home/user/project/unentropy.json`
- **WHEN** the user runs `bunx unentropy test --config /home/user/project/unentropy.json` from `/tmp`
- **THEN** the config root directory is `/home/user/project`

#### Scenario: Config root defaults to cwd

- **GIVEN** no `--config` option is provided
- **WHEN** the user runs `bunx unentropy test` from `/home/user/project`
- **THEN** the config root directory is `/home/user/project`

#### Scenario: Config root with relative --config path

- **GIVEN** a config file at `./config/unentropy.json` relative to the current working directory
- **WHEN** the user runs `bunx unentropy test --config ./config/unentropy.json`
- **THEN** the config root directory is the absolute path to `./config`

## Key Entities

- **Config root directory**: The base directory from which all relative paths in metric commands and collector arguments are resolved. Derived from the config file's location.
- **Invocation directory**: The current working directory at the time unentropy is executed.

## Related

- `cli/` — Config root directory is established during CLI command execution and passed to metric collection
- `metrics/` — Collectors and shell commands resolve relative paths against the config root directory
