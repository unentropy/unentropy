# Research: Metrics Quality Gate

**Feature**: 004-metrics-quality-gate  
**Date**: 2025-11-19  
**Status**: Complete

This document consolidates design decisions for the Metrics Quality Gate feature and resolves the technical unknowns identified in the implementation plan.

## Decisions

### Decision 1: Performance budgets for gate evaluation and PR comments

**Decision**: Cap quality gate evaluation (including computing deltas and reading history) plus optional pull request comment updates at ≤5 seconds for small repositories and ≤10 seconds for medium repositories, with a target of 1–2 seconds and 3–4 seconds respectively and never exceeding roughly 10% of the existing metrics step duration.

**Rationale**: Keeping the gate at or below 10% of the existing metrics step makes the additional feedback effectively "free" from a developer experience perspective while leaving enough room for a batched SQLite query and a single GitHub API call. This mirrors how coverage and static-analysis gates are layered on top of existing reports without re-running heavy computations.

**Alternatives considered**:
- Allowing looser budgets in the 15–30 second range was rejected as noticeably inflating CI latency and encouraging overly complex gate logic.
- Tying budgets only to absolute time without the 10% rule was rejected because it would behave poorly across both very fast and very slow pipelines.

---

### Decision 2: Baseline window and statistic for comparisons

**Decision**: Use the last 20 successful reference-branch builds as the default baseline window for each metric (with a minimum of 5 builds and a maximum age of 90 days), and compare pull request values against the median of that window rather than the last single build.

**Rationale**: A fixed, small history window is easy to understand and implement in SQLite, while the median provides a robust sense of "typical" behaviour that is less sensitive to outliers or flaky spikes than the last build or a simple mean. This supports the spec’s goal of stable, predictable gates that do not flap on noise.

**Alternatives considered**:
- Using only the last build as baseline was rejected as too noisy and fragile in the face of occasional regressions or flaky runs.
- Using an unbounded or very large history window was rejected because it overweights legacy behaviour and can make deliberate step changes hard to adopt.
- Using more complex statistics (e.g., EWMA, z-scores) was rejected for conceptual and implementation complexity not justified for this use case.

---

### Decision 3: Metrics scale and history retention

**Decision**: Optimise the feature for repositories with roughly 20–500 metrics and support up to 1,000 metrics per repository comfortably, with a configurable hard cap defaulting to 2,000 metrics per run; design for up to ~20,000 builds and ~10,000 pull requests in the database without special scaling, while gate queries operate only over a recent window (for example, last 200 builds or last 90 days).

**Rationale**: This range covers typical and moderately large monorepos while keeping SQLite performance predictable on GitHub-hosted runners. Limiting queries to a recent window keeps evaluation time effectively constant even as the database grows, and a per-run metric cap prevents accidental explosion (for example, auto-generated metrics per file).

**Alternatives considered**:
- Allowing unbounded numbers of metrics and unbounded history was rejected as a risk for CI stability and performance over time.
- Enforcing a very low global cap (for example, 200 metrics) was rejected as too restrictive for larger teams.

---

### Decision 4: Safeguards for very large monorepos

**Decision**: Provide simple configuration safeguards for very large repositories: a `maxMetricsPerRun` limit (default 2,000 with a hard upper limit around 5,000), history retention controls (for example, `maxBuildsRetained` or `retentionDays` with defaults such as 5,000 builds or 365 days), and guidance to shard metrics and gates by subsystem when needed.

**Rationale**: These safeguards keep the current SQLite-based architecture viable without requiring a more complex storage backend. Sharding by subsystem and using GitHub’s `concurrency` controls help avoid SQLite write contention and unbounded DB growth while still supporting very active monorepos.

**Alternatives considered**:
- Introducing new external databases or services for the gate was rejected as incompatible with the serverless GitHub Actions constraint and unnecessary for the expected scales.
- Relying purely on documentation without enforceable caps was rejected as too error-prone for large teams.

---

### Decision 5: PR comment size, structure, and metric visibility

**Decision**: Structure the pull request comment as a single canonical summary comment with a short heading, one-line overall status, and a compact table showing at most ~30 metrics (prioritising the most important or most changed ~10), targeting a total comment size under ~8,000 characters and linking to a full HTML report or artifact for deeper detail.

**Rationale**: A single, compact comment is easy to skim, keeps PRs tidy, and stays well below GitHub’s comment limits even when combined with other bots. Highlighting the most relevant metrics preserves context without overwhelming reviewers; linking to a full report handles long tails.

**Alternatives considered**:
- Showing all metrics with no cap was rejected as unreadable on large projects and more likely to hit practical comment size limits.
- Splitting information across multiple comments was rejected as noisy and confusing about which comment reflects the latest gate result.

---

### Decision 6: Comment lifecycle and anti-spam behaviour

**Decision**: Always maintain a single canonical "Unentropy Metrics" comment per pull request, identified by a stable heading or hidden marker, and update it in place on each run rather than posting new comments; treat failures to update the comment as non-fatal, with results still available in job summaries.

**Rationale**: Updating a single comment avoids spamming PR threads while still keeping a visible history of the latest gate result. Treating comment failures as non-fatal ensures the quality gate does not break workflows purely because of transient API or permission issues.

**Alternatives considered**:
- Posting a new comment for every run was rejected for creating noisy PRs and making it hard to know the authoritative gate result.
- Making comment posting mandatory for the gate outcome (failing the job if the comment cannot be updated) was rejected as too brittle.

---

### Decision 7: Threshold strategy and soft vs hard gates

**Decision**: Default to soft (informational) gates that report threshold results without failing the job, with explicit configuration to switch individual metrics or whole gates to hard-fail mode (especially on protected branches) once thresholds and data have stabilised; treat gate evaluation errors and missing baselines as soft "unknown" outcomes.

**Rationale**: This mirrors adoption patterns from coverage and static-analysis tools, allowing teams to observe and tune thresholds before making them blocking. Treating infrastructure problems as soft failures preserves CI reliability and avoids incentives to disable the gate.

**Alternatives considered**:
- Making all gates hard-fail by default was rejected as too disruptive for new adopters and noisy metrics.
- Permanently limiting gates to soft mode was rejected because many teams need enforceable quality policies on critical branches.

---

### Decision 8: Best practices for expressing and evolving thresholds

**Decision**: Express thresholds primarily as "no significant regression" rules relative to the recent baseline (with small configurable tolerance bands) rather than fixed global targets, and support staged adoption for new metrics (observe-only → warn-only → blocking) with configuration stored under version control.

**Rationale**: Relative thresholds aligned to current behaviour are easier to adopt incrementally and do not immediately penalise existing technical debt. Staged adoption and tolerance bands help avoid flakiness and let teams tighten rules over time.

**Alternatives considered**:
- Requiring hard global thresholds from day one was rejected as unrealistic for teams with legacy debt and volatile metrics.
- Keeping thresholds entirely informal (no configuration, just comments) was rejected as insufficiently enforceable for teams that want clear quality policies.
