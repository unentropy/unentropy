## Overview

Delta spec for the quality-gate-action: adds structured JSON output to make results consumable by AI agents and automation tools. The action will now write a complete results JSON file to a configurable path in the workspace and expose the full result as a serialized JSON step output.

## ADDED Requirements

### Requirement: Structured JSON Output

As a CI/CD pipeline or AI agent consuming quality gate results, I want a complete, machine-readable JSON representation of all evaluation data so that I can programmatically analyze metric changes, deltas, and pass/fail status without parsing human-targeted output.

The action SHALL produce a structured JSON output file containing the full quality gate result and SHALL expose the serialized result as a GitHub Action step output.

#### Scenario: JSON file written to workspace

- **GIVEN** the quality gate action has completed evaluation
- **WHEN** results are available
- **THEN** a JSON file is written to the path specified by the `output-file` input (default: `.unentropy/quality-gate-results.json`)

#### Scenario: JSON file contains complete evaluation data

- **GIVEN** the JSON output file has been written
- **WHEN** the file is read
- **THEN** it contains the `QualityGateResult` (status, mode, all per-metric evaluations with baselines, deltas, thresholds, pass/fail status, summary) wrapped in a thin envelope with timestamp, duration, collection stats, and PR comment URL

#### Scenario: JSON step output set

- **GIVEN** the quality gate action has completed evaluation
- **WHEN** the action sets its outputs
- **THEN** `quality-gate-results-json` is set to the full serialized JSON string of the quality gate result, and `quality-gate-results-path` is set to the absolute path of the written JSON file

#### Scenario: JSON file path is configurable

- **GIVEN** a workflow with the quality gate action configured
- **WHEN** the user sets the `output-file` input to a custom path (e.g., `reports/gate-results.json`)
- **THEN** the JSON file is written to that custom path instead of the default

#### Scenario: JSON output when gate mode is off

- **GIVEN** `quality-gate-mode` is `off`
- **WHEN** the action runs
- **THEN** the JSON file is still written with status `unknown` and no metric evaluations, maintaining a consistent output format

#### Scenario: JSON output on error

- **GIVEN** the action encounters an error before evaluation completes
- **WHEN** the action fails
- **THEN** the JSON output file is not written (or contains only available data if partial), and the error is communicated via `core.setFailed` and exit code

## MODIFIED Requirements

### Requirement: Action Inputs and Outputs

The action SHALL accept documented input parameters and expose documented output parameters.

#### Scenario: Input parameters available

- **GIVEN** a user configures the quality-gate action in a workflow
- **WHEN** the workflow runs
- **THEN** the action accepts storage configuration, quality gate mode, PR comment settings, and output file path as inputs

#### Scenario: Output parameters exposed

- **GIVEN** the action has completed
- **WHEN** subsequent workflow steps reference action outputs
- **THEN** outputs such as `quality-gate-status`, `quality-gate-mode`, `quality-gate-failing-metrics`, `quality-gate-results-path`, and `quality-gate-results-json` are available

## Key Entities

- **JSON Output File**: A file at a configurable path containing the `QualityGateResult` wrapped in a thin envelope (timestamp, duration, collection stats, PR comment URL)
- **JSON Step Output**: A `quality-gate-results-json` action output containing the same envelope as a JSON string, usable with `fromJSON()` in workflow expressions

## Related (optional)

- `storage/` — No change, baseline storage behavior is unaffected
- `quality-gates/` — No change, evaluation logic is unaffected
