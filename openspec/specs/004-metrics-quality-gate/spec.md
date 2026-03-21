# Feature Specification: Metrics Quality Gate

**Feature Branch**: `004-metrics-quality-gate`  
**Created**: 2025-11-19  
**Status**: Draft  
**Input**: User description: ""Quality gate" feature. Users should be able to set threshold for each metric. A separate quality-gate action should be used in PRs to evaluate thresholds and create a comment. The comment should list how the metrics have changed (in comparison to main branch) and flag if one of them is crossing the threshold."

**Architecture**: This feature introduces a new standalone `quality-gate` GitHub Action that runs in pull request contexts, separate from the existing `track-metrics` action which runs on main branch to build the historical database.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure and enforce metric thresholds on pull requests (Priority: P1)

Repository maintainers want to ensure that key code metrics (for example, coverage or complexity) do not regress beyond agreed limits when new changes are proposed. They configure threshold rules for each important metric, enable quality gate evaluation for their metrics tracking, and rely on the automated feedback on each pull request to see whether the proposed changes respect those thresholds.

**Why this priority**: This story delivers the core value of the feature: protecting code quality by turning metrics into clear, enforceable rules on incoming changes.

**Independent Test**: Configure thresholds for several metrics, open a pull request that intentionally violates one or more thresholds, and verify that the system evaluates all configured metrics and clearly reports which ones pass or fail.

**Acceptance Scenarios**:

1. **Given** a repository with metrics tracking enabled and per-metric thresholds configured, **When** a pull request is opened or updated, **Then** the system evaluates each configured metric against its threshold and determines a pass/fail result for every metric.
2. **Given** at least one metric whose value in the pull request does not satisfy its configured threshold rule, **When** the quality gate is evaluated, **Then** the system marks that metric as failed and marks the overall quality gate as failed for that pull request.

---

### User Story 2 - See a clear summary of metric changes on pull requests (Priority: P2)

Pull request authors and reviewers want a concise, readable summary of how key metrics have changed compared with the reference branch so that they do not need to inspect logs or raw data. When the optional "post pull request comment" setting is enabled, the system posts or updates a single comment on the pull request that lists each tracked metric, its value on the reference branch, its value on the pull request, the direction of change, and whether it passes or fails its threshold.

**Why this priority**: This story focuses on communication and review efficiency, making it easy for reviewers to understand the impact of a change and spot quality issues quickly.

**Independent Test**: Enable the comment option, configure a few metrics with thresholds, open a pull request that changes those metrics, and verify that there is exactly one up-to-date comment containing the comparison table and quality gate status.

**Acceptance Scenarios**:

1. **Given** the "post pull request comment" option is enabled and the quality gate feature is configured, **When** the metrics tracking runs for a pull request, **Then** a single pull request comment is created or updated that shows for each metric: reference value, pull request value, change (improvement or regression), and pass/fail status.

---

### User Story 3 - Work safely when thresholds or baselines are missing (Priority: P3)

Teams may start using metrics tracking before they define thresholds for every metric, or they may add new metrics later that have no historical baseline on the reference branch. They still want their pull requests to run successfully and see whatever information is available, while clearly understanding when the quality gate is not yet fully configured.

**Why this priority**: This story ensures that the feature is safe to roll out gradually and does not block work when configuration is incomplete.

**Independent Test**: Configure metrics tracking with no thresholds, then with thresholds for only some metrics, and in cases where baseline data is missing. Confirm that pull requests still complete, that available metrics are shown, and that the quality gate status reflects the actual configuration.

**Acceptance Scenarios**:

1. **Given** metrics tracking is enabled but no thresholds are configured, **When** a pull request is evaluated, **Then** metrics are still collected and reported, and the quality gate status clearly indicates that no thresholds are defined.
2. **Given** thresholds are configured for some metrics but baseline data is missing for a particular metric on the reference branch, **When** a pull request is evaluated, **Then** the comment (if enabled) and any status output show the current value and indicate that no baseline comparison is available for that metric.

---

### Edge Cases

- What happens when the reference branch has no stored metrics yet for a metric that now has a threshold defined? The system should still report the current value and mark the metric as "cannot be compared" while clearly indicating that the quality gate for that metric is not fully evaluated.
- How does the system handle thresholds that are misconfigured (for example, non-numeric values or impossible rules)? The system should fail fast for invalid configurations, explain which threshold is invalid, and avoid producing misleading quality gate results.
- How does the system behave when a metric is removed or renamed in configuration between the reference branch and the pull request? The system should avoid treating removed metrics as failures and clearly show any newly added metrics as new entries without historical comparison.
- What happens when multiple runs of metrics tracking occur on the same pull request (for example, after new commits or re-runs)? The system should keep a single up-to-date source of truth (such as an updated comment) rather than creating multiple conflicting summaries.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow repository maintainers to define one or more threshold rules for each tracked metric, including at least the metric identifier, the comparison direction (for example, "must not decrease" or "must be greater than or equal to a value"), and the numeric threshold value where applicable.
- **FR-002**: The system MUST treat the designated reference branch (assumed to be the main branch unless otherwise configured) as the baseline for metric comparisons, using the most recent successful metrics data from that branch when evaluating pull requests.
- **FR-003**: When the metrics feature runs in the context of a pull request and quality gate evaluation is enabled, the system MUST compare each metric’s pull request value to its baseline and evaluate whether every configured threshold rule is satisfied.
- **FR-004**: When any metric fails its threshold rule during pull request evaluation, the system MUST clearly mark that metric as failed, including its baseline value, pull request value, direction of change, and a clear indication that the threshold was exceeded or not met.
- **FR-005**: When the optional pull request comment setting is enabled and the metrics feature runs in pull request context, the system MUST create or update a single comment on the pull request that summarizes, for each tracked metric, the baseline value, pull request value, change, and pass/fail result, along with an overall quality gate status.
- **FR-006**: When no thresholds are configured for any metrics, the system MUST still collect and report metrics without blocking or failing the evaluation, and it MUST clearly indicate that the quality gate is not configured rather than reporting a pass or fail state.
- **FR-007**: When thresholds are configured but baseline data is missing for a particular metric on the reference branch, the system MUST report the current pull request value and indicate that baseline comparison and threshold evaluation for that metric are not available, without causing the overall evaluation to be ambiguous.
- **FR-008**: When quality gate evaluation is performed for a pull request, the system MUST produce a single overall quality gate status (for example, pass or fail) that is derived from the combined results of all threshold evaluations so that teams can apply consistent merge policies based on that status.

### Key Entities *(include if feature involves data)*

- **Metric**: Represents a named quantitative measure that the team tracks over time (for example, coverage percentage or number of code smells), including its identifier, description, and the latest recorded values on the reference branch and on each pull request.
- **Threshold Rule**: Represents the conditions under which a metric is considered acceptable, including the metric identifier, comparison direction, threshold value where applicable, and whether higher or lower values are desirable.
- **Quality Gate Evaluation**: Represents the result of applying all relevant threshold rules to the metrics collected for a specific run (such as a pull request), including per-metric pass/fail results, overall status, and any explanatory messages for failed metrics.
- **Pull Request Feedback**: Represents the user-facing summary of metric changes and quality gate status associated with a pull request, including structured information that can be surfaced as a comment or status indicator for reviewers.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In user testing, at least 80% of reviewers can determine within a few seconds from the pull request feedback whether the change passes or fails the quality gate, without needing to inspect raw logs.
- **SC-002**: In test repositories where thresholds are configured, at least 95% of pull requests that intentionally violate a threshold are correctly reported as failing the quality gate, with the responsible metrics clearly identified.
- **SC-003**: In test repositories where thresholds are configured and no violations occur, at least 95% of pull requests are reported as passing the quality gate, and reviewers report that the summary provides enough information to confirm that metrics are within agreed limits.
- **SC-004**: Adding quality gate evaluation and pull request feedback MUST NOT increase the observed time to receive metrics results on a pull request by more than 10% compared with the same metrics tracking without quality gate evaluation, ensuring that feedback remains timely for developers.

## Assumptions

- The main branch is used as the default reference branch for metric comparisons unless teams explicitly configure a different reference.
- Teams are already using metrics tracking and have a basic configuration of metrics in place before enabling quality gates.
- Thresholds are defined on numeric metrics where it is meaningful to compare values between the reference branch and a pull request.
- Repository access controls and permissions for posting comments or statuses on pull requests are already managed by the hosting platform and are not changed by this feature.
- The `track-metrics` action runs on main branch to build historical database, and the `quality-gate` action runs on pull requests to evaluate thresholds (two separate actions with distinct responsibilities).

## Dependencies

- Availability of up-to-date metric data on the reference branch so that baseline comparisons reflect the current agreed standard (built by `track-metrics` action on main branch).
- Correct configuration of metrics and thresholds by repository maintainers, including clear metric identifiers and sensible threshold values.
- Continuous integration pipelines that run `track-metrics` action on the reference branch to build historical database, and `quality-gate` action on pull requests to evaluate against that baseline.
- Pull request workflows that allow automated systems to post or update comments and status indicators associated with a pull request.
- Storage backend (S3-compatible or GitHub Artifacts) accessible by both main branch and pull request workflows to share the metrics database.