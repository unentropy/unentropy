## MODIFIED Requirements

### Requirement: Sources Command

The system SHALL provide a `sources` command that resolves the `sources` patterns from the project configuration and lists all matching files, with optional per-file LOC display and sorting.

#### Scenario: Default sources listing

- **GIVEN** a project with `"sources": ["src", "tests", "!node_modules"]`
- **WHEN** the user runs `bunx unentropy sources`
- **THEN** the system resolves config from `unentropy.json`
- **AND** lists all files matching `src/**` and `tests/**` excluding `node_modules/**`
- **AND** each path is printed relative to the project root, one per line

#### Scenario: Respects negation patterns

- **GIVEN** a project with `"sources": ["src", "!src/generated"]`
- **WHEN** the user runs `bunx unentropy sources`
- **THEN** files under `src/generated/` are excluded from the output

#### Scenario: Custom config path with --config

- **GIVEN** a config at `custom-config.json`
- **WHEN** the user runs `bunx unentropy sources --config custom-config.json`
- **THEN** the system resolves sources from the specified config file

#### Scenario: Absolute paths with --absolute

- **GIVEN** a project with `"sources": ["src"]`
- **WHEN** the user runs `bunx unentropy sources --absolute`
- **THEN** the printed paths are absolute rather than relative

#### Scenario: LOC per file with --loc

- **GIVEN** a project with source files
- **WHEN** the user runs `bunx unentropy sources --loc`
- **THEN** the output is a two-column table with file path and LOC count

#### Scenario: Sort by name with --sort name

- **GIVEN** a project with multiple source files
- **WHEN** the user runs `bunx unentropy sources --sort name`
- **THEN** files are listed in alphabetical order by path (default behavior)

#### Scenario: Sort by LOC with --sort loc

- **GIVEN** a project with source files of varying sizes
- **WHEN** the user runs `bunx unentropy sources --loc --sort loc`
- **THEN** files are listed in ascending order by line count

#### Scenario: Config file not found

- **GIVEN** no config file exists at the resolved path
- **WHEN** the user runs `bunx unentropy sources`
- **THEN** the system exits with code 1 and displays a message suggesting to run `unentropy init`

#### Scenario: No sources configured

- **GIVEN** a config file without a `sources` field
- **WHEN** the user runs `bunx unentropy sources`
- **THEN** the system exits with code 1 and displays a message indicating no sources are configured
