## Overview

Loosens the artifact storage provider's first-run search so that a database uploaded as an artifact from a non-canonical branch (e.g., a disposable seeding branch) can still be picked up when no artifact yet exists on the configured branch. Once a normal CI run uploads from the configured branch, that artifact wins on all subsequent reads — the fallback only fires when there is genuinely nothing on the configured branch to find.

## MODIFIED Requirements

### Requirement: Artifact Storage Behavior

The system SHALL provide a GitHub Artifacts storage provider that searches for, downloads, and uploads the metrics database using the GitHub REST API.

#### Scenario: Search and download latest artifact

- **GIVEN** a storage configuration with `type: "sqlite-artifact"`
- **WHEN** the provider initializes
- **THEN** it searches for the most recent database artifact from successful workflow runs on the configured branch, downloads it, and extracts it to a temporary location

#### Scenario: First run with no existing artifact on any branch

- **GIVEN** a storage configuration with `type: "sqlite-artifact"` and no previous artifact exists in the repository under the configured `artifactName`
- **WHEN** the provider initializes
- **THEN** it creates a new empty database without attempting to download

#### Scenario: First run picks up seed from non-canonical branch

- **GIVEN** a storage configuration with `type: "sqlite-artifact"`, configured `branchFilter` (default `main`), and no artifact uploaded from that branch exists, **AND** an artifact with the configured `artifactName` was uploaded from any other branch (typically a disposable seeding branch like `unentropy-import-*`)
- **WHEN** the provider initializes
- **THEN** it falls back to the most recent artifact of that name from any branch, logs the fallback explicitly identifying the source branch and run id, and uses it as the starting database

#### Scenario: Configured-branch artifact always wins over a stale seed

- **GIVEN** an artifact has previously been uploaded from the configured branch by a normal CI run, **AND** an older seed artifact from a non-canonical branch also still exists
- **WHEN** the provider initializes
- **THEN** it uses the configured-branch artifact and does not consult the seed; the seed is left to age out via GitHub's retention

#### Scenario: Upload updated database as artifact

- **GIVEN** an artifact storage provider with metrics collected
- **WHEN** `persist()` is called
- **THEN** it uploads the updated database as a new artifact with the configured name, non-destructively (does not delete previous artifacts)

#### Scenario: Auto-detect environment for artifact operations

- **GIVEN** a storage configuration with `type: "sqlite-artifact"`
- **WHEN** the provider initializes
- **THEN** it auto-detects `GITHUB_TOKEN` and `GITHUB_REPOSITORY` from the environment for GitHub API calls

#### Scenario: Configurable artifact name

- **GIVEN** a user sets `"artifact": { "name": "custom-metrics" }` in storage config
- **WHEN** the provider searches for or uploads artifacts
- **THEN** it uses `custom-metrics` as the artifact name instead of the default `unentropy-metrics`

#### Scenario: Configurable branch filter

- **GIVEN** a user sets `"artifact": { "branchFilter": "develop" }` in storage config
- **WHEN** the provider searches for previous artifacts
- **THEN** it filters search results to only include artifacts from the `develop` branch (and falls back across branches only when nothing on `develop` is found)

## Key Entities

- **Seed artifact**: An artifact uploaded from a disposable branch outside the normal CI flow, intended to be picked up by the first canonical-branch run and then naturally replaced. Has the same name and shape as a normal artifact — the only difference is its `workflow_run.head_branch`.

## Related

- `metric-import/` — the import pipeline produces the local SQLite that becomes a seed.
- `cli/` — surfaces the seeding helper subcommand.
