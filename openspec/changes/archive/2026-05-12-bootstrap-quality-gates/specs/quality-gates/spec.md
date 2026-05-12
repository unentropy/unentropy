# Quality Gates Specification

## Purpose

Evaluate metric thresholds against baseline data to produce pass/fail status for pull request changes.

## ADDED Requirements

### Requirement: Threshold Rule Definition
The system SHALL allow repository maintainers to define one or more threshold rules for each tracked metric, specifying the metric identifier, comparison direction, and numeric threshold value.

#### Scenario: No-regression threshold
- **GIVEN** a repository with a "coverage" metric configured
- **WHEN** a maintainer adds `{ "metric": "coverage", "mode": "no-regression", "tolerance": 0.5 }` to the thresholds array
- **THEN** the system stores a rule that the coverage metric must not decrease by more than 0.5 points compared to the baseline

#### Scenario: Minimum value threshold
- **GIVEN** a repository with a "coverage" metric configured
- **WHEN** a maintainer adds `{ "metric": "coverage", "mode": "min", "target": 80 }` to the thresholds array
- **THEN** the system stores a rule that the coverage metric must be at least 80

#### Scenario: Maximum value threshold
- **GIVEN** a repository with a "size" metric configured
- **WHEN** a maintainer adds `{ "metric": "size", "mode": "max", "target": 500 }` to the thresholds array
- **THEN** the system stores a rule that the size metric must not exceed 500

#### Scenario: Delta max drop threshold
- **GIVEN** a repository with a "perf-score" metric configured
- **WHEN** a maintainer adds `{ "metric": "perf-score", "mode": "delta-max-drop", "maxDropPercent": 10 }` to the thresholds array
- **THEN** the system stores a rule that the perf-score metric must not drop by more than 10% relative to the baseline

#### Scenario: Invalid threshold configuration
- **GIVEN** a threshold rule without a required field (e.g., `mode: "min"` without `target`)
- **WHEN** the system validates the configuration
- **THEN** it rejects the configuration with a clear error message identifying the invalid threshold

---

### Requirement: Baseline Comparison
The system SHALL use the most recent successful metrics data from the designated reference branch as the baseline for comparing pull request values.

#### Scenario: Default reference branch
- **GIVEN** a repository with metrics tracking enabled and no explicit reference branch configured
- **WHEN** the quality gate evaluates thresholds
- **THEN** the system uses the repository's default branch (typically `main`) as the baseline reference

#### Scenario: Custom reference branch
- **GIVEN** a repository with `"baseline": { "referenceBranch": "develop" }` configured
- **WHEN** the quality gate evaluates thresholds
- **THEN** the system retrieves the most recent successful metric values from the `develop` branch

#### Scenario: Stale baseline
- **GIVEN** a repository with `"baseline": { "maxAgeDays": 90 }` configured
- **WHEN** the most recent successful build on the reference branch is older than 90 days
- **THEN** the system treats the baseline as unavailable for that metric

---

### Requirement: Evaluation Logic
The system SHALL compare each metric's pull request value to its baseline and evaluate whether every configured threshold rule is satisfied.

#### Scenario: Metric passes all thresholds
- **GIVEN** a "coverage" metric with baseline value 85 and threshold `{ "mode": "no-regression", "tolerance": 0.5 }`
- **WHEN** the pull request value is 86
- **THEN** the system marks the metric as passing because 86 >= (85 - 0.5)

#### Scenario: Metric fails no-regression threshold
- **GIVEN** a "coverage" metric with baseline value 85 and threshold `{ "mode": "no-regression", "tolerance": 0.5 }`
- **WHEN** the pull request value is 84
- **THEN** the system marks the metric as failing because 84 < (85 - 0.5)

#### Scenario: Metric fails min threshold
- **GIVEN** a "coverage" metric with threshold `{ "mode": "min", "target": 80 }`
- **WHEN** the pull request value is 78
- **THEN** the system marks the metric as failing because 78 < 80

#### Scenario: Metric fails max threshold
- **GIVEN** a "size" metric with threshold `{ "mode": "max", "target": 500 }`
- **WHEN** the pull request value is 520
- **THEN** the system marks the metric as failing because 520 > 500

#### Scenario: Metric fails delta-max-drop threshold
- **GIVEN** a "perf-score" metric with baseline value 100 and threshold `{ "mode": "delta-max-drop", "maxDropPercent": 10 }`
- **WHEN** the pull request value is 85
- **THEN** the system marks the metric as failing because the 15% drop exceeds the 10% maximum

---

### Requirement: Pass/Fail Status
The system SHALL produce both per-metric pass/fail results and an overall quality gate status derived from the combined results of all threshold evaluations.

#### Scenario: All metrics pass
- **GIVEN** two metrics each with passing threshold evaluations
- **WHEN** the quality gate evaluation completes
- **THEN** the overall status is "pass" and each metric shows "pass"

#### Scenario: One metric fails
- **GIVEN** one metric passing and one metric failing their threshold evaluations
- **WHEN** the quality gate evaluation completes
- **THEN** the overall status is "fail" and each metric shows its individual status with the failing metric's baseline value, pull request value, and direction of change

#### Scenario: Per-metric result details
- **GIVEN** a failed metric evaluation
- **WHEN** the system produces the result
- **THEN** the result includes the baseline value, pull request value, direction of change, and a clear indication that the threshold was exceeded

---

### Requirement: Missing Thresholds Handling
The system SHALL operate safely when no thresholds are configured, collecting and reporting metrics without blocking or failing, and clearly indicating that the quality gate is not configured.

#### Scenario: No thresholds configured
- **GIVEN** metrics tracking is enabled without any threshold rules
- **WHEN** the quality gate is evaluated
- **THEN** the system reports that no thresholds are defined rather than reporting a pass or fail state

#### Scenario: Partial thresholds configured
- **GIVEN** thresholds are configured for only 2 out of 5 tracked metrics
- **WHEN** the quality gate is evaluated
- **THEN** configured metrics are evaluated normally and metrics without thresholds are reported as not having a threshold rule

---

### Requirement: Missing Baseline Handling
The system SHALL handle cases where baseline data is unavailable for a particular metric, reporting the current value and indicating that baseline comparison is not available.

#### Scenario: Metric without baseline data
- **GIVEN** a threshold is configured for a metric but no historical data exists on the reference branch
- **WHEN** the quality gate is evaluated
- **THEN** the system reports the current pull request value and indicates that baseline comparison is not available for that metric

#### Scenario: New metric without history
- **GIVEN** a newly added metric with no baseline data on the reference branch and no historical values
- **WHEN** the quality gate is evaluated
- **THEN** the system treats the metric as unevaluated and does not produce a pass or fail result for it

---

## Edge Cases

- What happens when the reference branch has no stored metrics for a metric that has a threshold defined? The system reports the current value and marks the metric as unevaluated without producing a pass or fail result.
- What happens when thresholds reference a metric key that does not exist in the `metrics` configuration? The system rejects the configuration during validation.
- What happens when a metric is removed from configuration between the reference branch and the pull request? Removed metrics are not evaluated and do not affect the overall status.
- What happens when a threshold rule has contradictory or impossible values (e.g., negative `maxDropPercent`)? The system rejects the configuration with a clear error message.
- What happens when a non-numeric metric has a threshold rule configured? The system rejects the configuration since thresholds only apply to numeric metrics.

## Assumptions

- The reference branch is the repository's default branch (typically `main`) unless explicitly configured otherwise.
- Teams already have metrics tracking configured before enabling quality gates.
- Thresholds are only meaningful for numeric metrics where comparison between values is well-defined.
- The `track-metrics` action runs on the reference branch to build the historical database, and the `quality-gate` action runs on pull requests to evaluate thresholds.

## Dependencies

- Up-to-date metric data on the reference branch must be available (produced by `track-metrics` action on the reference branch).
- Correct configuration of metrics and thresholds by repository maintainers.
- Storage backend accessible by both reference branch and pull request workflows to share the metrics database.
- Metric identifiers in threshold rules must match keys in the `metrics` configuration object.

## Scope Boundaries

### In Scope

- Threshold rule definition and configuration
- Baseline retrieval from reference branch
- Evaluation logic (compare PR value to baseline, apply threshold rules)
- Per-metric pass/fail determination
- Overall quality gate status derivation
- Missing thresholds and missing baseline handling

### Out of Scope

- PR comment posting or formatting (see `actions/quality-gate/` spec)
- Baseline database download orchestration (see `actions/quality-gate/` spec)
- Metric definition and collection (see `metrics/` spec)
- Storage backend configuration and data persistence (see `storage/` spec)
- Action workflow orchestration (see `actions/` spec)

## Foundational Contracts

| Contract | Location | Referenced By |
|----------|----------|---------------|
| Quality Gate Config Schema | `contracts/config-schema.md` | `actions/quality-gate/` |
