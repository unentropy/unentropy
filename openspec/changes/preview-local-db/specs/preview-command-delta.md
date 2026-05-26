# Spec Delta: Preview Command

This file contains specification changes for the `preview` CLI command.

## ADDED Requirements

### Requirement: Local database preview
WHEN the `--db` option is provided to the `preview` command,
the system SHALL generate an HTML report using real metric data from the specified SQLite database instead of synthetic placeholder data.

#### Scenario: Successful report from local DB
GIVEN a valid `unentropy.json` config file
AND a SQLite database file at the path specified by `--db` containing metric data
WHEN the user runs `unentropy preview --db ./unentropy.db`
THEN the system opens the config file
AND checks that the database file exists
AND opens the database in read-only mode
AND generates a complete HTML report with real metric data, charts, and statistics
AND writes the report to the output directory
AND opens the report in the default browser

#### Scenario: Non-existent database file
GIVEN a valid `unentropy.json` config file
AND no SQLite database file at the path specified by `--db`
WHEN the user runs `unentropy preview --db ./nonexistent.db`
THEN the system prints an error message: "Error: Database not found: ./nonexistent.db"
AND prints a hint: "Run metric collection first, or check the path."
AND exits with a non-zero exit code
AND does not generate any report

#### Scenario: Empty database
GIVEN a valid `unentropy.json` config file
AND a SQLite database file at the path specified by `--db` that exists but contains no build data
WHEN the user runs `unentropy preview --db ./unentropy.db`
THEN the system generates a report with zero build count
AND shows preview toggle for synthetic data (since buildCount < 10)

### Requirement: Repository name derivation
WHEN the `preview` command generates a report from a local database,
the system SHALL use `basename(process.cwd())` as the repository name in the report metadata.

#### Scenario: Report header shows directory name
GIVEN the current working directory is `/Users/alice/projects/my-app`
WHEN the user runs `unentropy preview --db ./unentropy.db`
THEN the generated report displays "my-app" as the repository name

## MODIFIED Requirements

### Requirement: Preview command behavior
**Previous**: The `preview` command always generated HTML reports with synthetic placeholder data from config only.

WHEN the user runs `unentropy preview` without the `--db` option,
the system SHALL generate an HTML report with synthetic placeholder data from the config file.

WHEN the user runs `unentropy preview --db <path>` with the `--db` option,
the system SHALL generate an HTML report with real data from the specified SQLite database.

#### Scenario: Preview without --db (existing behavior)
GIVEN a valid `unentropy.json` config file
WHEN the user runs `unentropy preview`
THEN the system generates a synthetic preview report
AND opens it in the browser
(unchanged from current behavior)
