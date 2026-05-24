# actions/quality-gate Specification

## Purpose

The quality-gate GitHub Action orchestrates the evaluation of pull request code metrics against baseline thresholds and posts results as a PR comment. It handles the workflow lifecycle: baseline database retrieval from storage, metric collection on the PR branch, threshold evaluation, and PR comment creation or update.

## User Stories

### See clear summary of metric changes on pull requests (P2)

PR authors and reviewers want a concise, readable summary of how key metrics have changed compared with the reference branch. When the optional PR comment setting is enabled, the system posts or updates a single comment on the pull request that lists each tracked metric, its value on the reference branch, its value on the PR, the direction of change, and whether it passes or fails its threshold.

#### Scenario: PR comment created with metric comparison table
- **GIVEN** the PR comment option is enabled and quality gate is configured
- **WHEN** the quality-gate action runs for a pull request
- **THEN** a single PR comment is created or updated showing for each metric: reference value, PR value, change (improvement or regression), and pass/fail status

#### Scenario: Single comment maintained per PR
- **GIVEN** the quality-gate action has already posted a comment on a PR
- **WHEN** the action runs again on the same PR (new commits or re-run)
- **THEN** the existing comment is updated in place rather than creating a new one

### Work safely when baselines are missing (P3)

Teams may use quality gates before baseline data exists on the reference branch. The action should handle this gracefully.

#### Scenario: Missing baseline database
- **GIVEN** no baseline database exists in configured storage (first-time setup)
- **WHEN** the quality-gate action runs
- **THEN** it returns `quality-gate-status` of `unknown`, posts a helpful PR comment explaining no baseline data is available, and exits with code 0

#### Scenario: Missing baseline for specific metric
- **GIVEN** thresholds are configured for some metrics but baseline data is missing for a particular metric on the reference branch
- **WHEN** the quality-gate action evaluates the PR
- **THEN** the comment shows the current value and indicates no baseline comparison is available for that metric

## Requirements

### Requirement: Action Context
The action SHALL run in the GitHub pull request context (`pull_request` event).

#### Scenario: Pull request trigger
- **GIVEN** a repository with the quality-gate action configured
- **WHEN** a pull request is opened or updated
- **THEN** the action executes in response to the pull_request event

---

### Requirement: Baseline Database Retrieval
The action SHALL download the baseline metrics database from the configured storage backend at the start of execution. The action operates in read-only mode on the baseline database and MUST NOT persist any changes.

#### Scenario: Download baseline from storage
- **GIVEN** a configured storage backend with a baseline database
- **WHEN** the action initializes
- **THEN** it downloads the baseline database from the configured storage (delegating to the storage provider)

---

### Requirement: Metric Collection
The action SHALL collect metrics on the PR branch using the configured metrics definitions.

#### Scenario: Collect PR metrics
- **GIVEN** metrics are defined in the configuration
- **WHEN** the action runs on a PR branch
- **THEN** it collects all configured metrics (delegating to the metrics system)

---

### Requirement: Threshold Evaluation
The action SHALL evaluate each metric's PR value against configured thresholds using baseline values from the reference branch.

#### Scenario: Evaluate thresholds
- **GIVEN** thresholds are configured and baseline data is available
- **WHEN** the action evaluates metrics
- **THEN** each metric is compared against its threshold and produces a pass/fail result (delegating to the quality-gates system)

---

### Requirement: PR Comment Posting
The action SHALL post or update a single PR comment summarizing quality gate results when enabled.

#### Scenario: Find existing comment by marker
- **GIVEN** a previous quality gate comment exists on the PR
- **WHEN** the action needs to post results
- **THEN** it locates the existing comment by searching for the configured marker string in the comment body

#### Scenario: Create new comment
- **GIVEN** no existing quality gate comment is found on the PR
- **WHEN** the action needs to post results
- **THEN** it creates a new PR comment with the quality gate results

#### Scenario: Update existing comment
- **GIVEN** an existing quality gate comment is found on the PR
- **WHEN** the action needs to post results
- **THEN** it updates the existing comment in place with the latest results

---

### Requirement: Comment Format
The PR comment SHALL follow a defined layout including status badge, metric comparison table, and violations section.

#### Scenario: Status badge in header
- **GIVEN** the action posts a PR comment
- **WHEN** the comment is rendered
- **THEN** the header shows a status badge: PASS, FAIL, or UNKNOWN with corresponding emoji

#### Scenario: Metric comparison table
- **GIVEN** metrics with threshold evaluation results
- **WHEN** the comment is rendered
- **THEN** a table shows each metric with inline status icon, reference value, PR value, delta, and pass/fail indication

#### Scenario: Violations section
- **GIVEN** at least one metric fails its threshold
- **WHEN** the comment is rendered
- **THEN** failed metrics are clearly highlighted

---

### Requirement: Missing Baseline Handling
The action SHALL handle missing baseline data gracefully by returning an "unknown" status and posting a helpful message rather than failing the job.

#### Scenario: First-run message
- **GIVEN** no baseline database exists
- **WHEN** the action evaluates
- **THEN** it returns status `unknown`, posts a comment explaining the situation, lists collected metrics if available, and exits with code 0

#### Scenario: Exit code 0 on missing baseline
- **GIVEN** no baseline data is available
- **WHEN** the action completes
- **THEN** it exits with code 0 to avoid blocking the PR

---

### Requirement: Job Summary Output
The action SHALL produce a job summary when a PR comment cannot be posted (e.g., not in PR context, missing token, API error).

#### Scenario: Fallback to job summary
- **GIVEN** the action cannot post a PR comment (not in PR context or API error)
- **WHEN** results are ready
- **THEN** the results are written to the GitHub job summary instead

---

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

---

### Requirement: Quality Gate Modes
The action SHALL support three quality gate modes: `off`, `soft`, and `hard`.

#### Scenario: Mode off
- **GIVEN** `quality-gate-mode` is `off`
- **WHEN** the action runs
- **THEN** threshold evaluation is skipped, status is `unknown`, and the job is not affected

#### Scenario: Mode soft
- **GIVEN** `quality-gate-mode` is `soft`
- **WHEN** thresholds are evaluated and some fail
- **THEN** failing metrics are exposed via outputs and comment, but the job does not fail

#### Scenario: Mode hard
- **GIVEN** `quality-gate-mode` is `hard`
- **WHEN** a blocking metric fails its threshold
- **THEN** status is `fail` and the action fails the job with a non-zero exit code

#### Scenario: Mode hard with missing baseline
- **GIVEN** `quality-gate-mode` is `hard` and baseline is missing
- **WHEN** the action evaluates
- **THEN** status is `unknown` and exit code is 0 (missing baseline never blocks PRs)

---

### Requirement: Security
The action SHALL use `GITHUB_TOKEN` for GitHub API interactions and follow fork-safe behavior.

#### Scenario: GITHUB_TOKEN usage
- **GIVEN** the action needs to post a PR comment
- **WHEN** it makes GitHub API calls
- **THEN** it uses the `GITHUB_TOKEN` available in the environment

#### Scenario: Fork-safe behavior
- **GIVEN** a pull request from a fork
- **WHEN** the action attempts to post a comment
- **THEN** it follows GitHub's recommendations for safe `GITHUB_TOKEN` usage and does not execute untrusted code with elevated permissions

#### Scenario: No new secrets
- **GIVEN** the action requires authentication
- **WHEN** validation runs
- **THEN** no new secret types beyond `GITHUB_TOKEN` and existing S3 credentials are introduced; sensitive values are never logged

---

### Requirement: Idempotent Comments
Multiple runs on the same PR SHALL result in a single up-to-date comment rather than multiple conflicting summaries.

#### Scenario: Re-run updates existing comment
- **GIVEN** a quality gate comment already exists on the PR
- **WHEN** the action runs again (re-run or new commit)
- **THEN** the existing comment is updated with the latest results

---

### Requirement: Comment Update Graceful Failure
Comment update failures (e.g., permissions, API errors) SHALL NOT cause the gate to fail; results remain available in the job summary.

#### Scenario: API error during comment post
- **GIVEN** the GitHub API returns an error when posting/updating the comment
- **WHEN** the action handles the error
- **THEN** a warning is logged and results are written to the job summary instead

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

## Edge Cases

- What happens when `enable-pr-comment` is `false`? The action still evaluates thresholds and exposes outputs, but no PR comment is posted. Results are available via job summary.
- What happens when the workflow is not in a `pull_request` context? PR comment posting is skipped with a warning; results are written to the job summary.
- What happens when the comment marker is not found in any existing comment? A new comment is created.
- What happens when multiple quality gate comments exist (e.g., from manual editing)? The first comment found with the marker is used.
- What happens with empty metrics after collection? The comment shows a "no baseline" state if no metrics were collected.
- What happens when the max PR comment metrics limit is exceeded? The table is truncated with a message indicating additional metrics exist.

## Assumptions

- The main branch is used as the default reference branch for baseline comparisons.
- The `track-metrics` action runs on the main branch to build the historical database before the quality-gate action runs on PRs.
- Repository access controls for posting PR comments are managed by the hosting platform.
- The `GITHUB_TOKEN` has sufficient permissions to read/write PR comments.
- Teams configure thresholds before expecting meaningful quality gate results.

## Dependencies

- Storage provider interface for baseline database retrieval (see `storage/` spec)
- Metric collection system for PR branch metrics (see `metrics/` spec)
- Quality gate evaluation logic for threshold comparison (see `quality-gates/` spec)
- GitHub REST API for PR comment operations (`octokit`)
- Continuous integration pipelines that run both `track-metrics` on main and `quality-gate` on PRs

## Scope Boundaries

### In Scope

- Quality-gate action workflow orchestration (baseline retrieval → collect → evaluate → comment)
- PR comment posting, finding, and updating
- Action input/output parameter interface
- Quality gate mode selection (off/soft/hard)
- Missing baseline and missing threshold handling in the action context
- Job summary fallback when comment cannot be posted
- Structured JSON output file and step outputs

### Out of Scope

- Threshold evaluation logic (see `quality-gates/` spec)
- Metric collection implementation (see `metrics/` spec)
- Storage backend implementation (see `storage/` spec)
- Dashboard/report generation (see `reporting/` spec)
- CLI commands (see `cli/` spec)
- The `track-metrics` action behavior (see `actions/track-metrics/` spec)
- GitHub Actions workflow YAML validation

## Foundational Contracts

| Contract | Location | Referenced By |
|----------|----------|---------------|
| Action Interface | `contracts/action-interface.md` | — |
| Comment Layout | `contracts/comment-layout.md` | — |
