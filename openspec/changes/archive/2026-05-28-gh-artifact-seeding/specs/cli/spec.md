## Overview

Adds a small helper subcommand `unentropy import seed-workflow` that prints a ready-to-commit GitHub Actions workflow YAML used by the disposable-branch seeding ceremony for the artifact backend. The command does not run the ceremony — it only emits the workflow text. The ceremony itself (branch creation, push, watch, cleanup) is driven by an external agent skill.

## ADDED Requirements

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
