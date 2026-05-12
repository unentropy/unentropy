# Implementation Plan: Metrics Quality Gate

**Branch**: `004-metrics-quality-gate` | **Date**: 2025-11-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/004-metrics-quality-gate/spec.md`

## Summary

This feature adds a "metrics quality gate" delivered as a **standalone GitHub Action** separate from the existing `track-metrics` action. Repository maintainers will be able to configure per-metric thresholds and have pull requests automatically evaluated against those thresholds, using the main branch (or configured reference) as the baseline.

**Architecture**: Two-Action Design
- **`track-metrics` action**: Runs on main branch to build and persist historical metrics database
- **`quality-gate` action** (NEW): Runs on pull requests to download baseline, evaluate thresholds, and post results

At a high level, the implementation will:
- Create a new `quality-gate` action that downloads the baseline database from S3 in read-only mode.
- Collect metrics for the current pull request commit.
- Use existing evaluation logic to compare PR metrics against baseline with configured thresholds.
- Post or update a single pull request comment with gate results, threshold violations, and metric comparisons.
- Expose gate status via action outputs and optionally fail the job in hard mode with blocking violations.
- Keep `track-metrics` action unchanged (main branch database building only).

## Technical Context

**Language/Version**: Bun runtime with TypeScript (aligned with existing Unentropy codebase).  
**Primary Dependencies**: Bun runtime, TypeScript, SQLite (metrics store), GitHub Actions runtime, GitHub REST API client for pull request comments, Chart.js for existing visual reports.  
**Storage**: Existing SQLite database managed via the storage provider abstraction (local, artifact, or S3-compatible backends).  
**Testing**: `bun test` for unit, integration, and contract tests; `bun run lint` and `bun run typecheck` in CI; new tests added alongside existing collector, action, storage, and reporter tests.  
**Target Platform**: GitHub Actions runners on Linux (CI workflows triggered by push and pull_request events).  
**Project Type**: Single project repository with CLI-style GitHub Actions implemented in TypeScript under `src/`.
**Performance Goals**: Quality gate evaluation and comment posting MUST keep end-to-end feedback within the specification limit of at most 10% additional latency compared with the existing metrics tracking workflow without the quality gate, with a practical target of 1–2 seconds total for small repositories and 3–4 seconds for medium repositories, and hard caps of 5 seconds and 10 seconds respectively.  
**Constraints**: All behaviour must remain serverless within GitHub Actions, avoid introducing persistent services, and respect security guidance (no logging of secrets and minimal external surface area). The gate will read from a bounded recent history window per metric (defaulting to the last 20 successful reference-branch builds, with a minimum of 5 and a maximum age around 90 days), enforce a per-run metric count cap (typically 2,000 metrics, with an upper bound around 5,000), and keep pull request comments compact (at most ~30 metrics visible and ~8,000 characters total, linking to full HTML reports when more detail is needed).  
**Scale/Scope**: Designed for small-to-medium repositories (roughly 20–500 metrics and thousands of builds per repository), while comfortably supporting up to ~1,000 metrics per repository and on the order of 20,000 builds and 10,000 pull requests without special scaling, with configuration safeguards (metric caps, retention settings, and optional sharding of gates by subsystem) recommended for very large monorepos.

## Action Architecture

**Decision**: The quality gate feature is delivered as a **standalone GitHub Action** separate from `track-metrics`.

**Rationale**:
- **Separation of Concerns**: `track-metrics` builds historical database (main branch), `quality-gate` evaluates PRs (read-only)
- **Database Safety**: PRs never write to baseline database, preventing data pollution
- **Simpler Testing**: Each action tested independently with clear boundaries
- **Clearer Mental Model**: No conditional "am I in PR or main?" logic
- **Independent Evolution**: Can update gate logic without touching metrics collection

**Action Responsibilities**:
- `track-metrics`: Collect → Record → Report → Persist to S3 (main branch only)
- `quality-gate`: Download baseline → Collect PR metrics → Evaluate → Comment → Pass/Fail (PRs only)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Based on `.specify/memory/constitution.md`, this feature must satisfy the following gates:

1. **Serverless Architecture**  
   - Gate: All new functionality must run entirely inside GitHub Actions workflows with no long-lived servers or external orchestration services.  
   - Plan: Implement quality gate evaluation and pull request comments as part of the existing Bun-based GitHub Actions (primarily the `track-metrics` action), reusing current storage and reporter components without introducing new hosted services.  
   - Status: PASS (no serverful components planned).

2. **Technology Stack Consistency**  
   - Gate: Use Bun with TypeScript, SQLite for storage, and Chart.js for reporting; avoid introducing divergent runtimes or databases.  
   - Plan: Extend existing TypeScript modules under `src/` and reuse the established SQLite schema and storage providers; visual changes (if any) will reuse current Chart.js-based reporting. No new runtime or database technologies are introduced.  
   - Status: PASS (stack remains consistent).

3. **Code Quality Standards**  
   - Gate: Maintain strict TypeScript, Prettier formatting, and minimal comments while following existing conventions.  
   - Plan: Implement quality gate logic with strict types (including explicit types for thresholds and evaluation results), keep modules small and coherent, and rely on existing linting and formatting tooling.  
   - Status: PASS (no deviations required).

4. **Security Best Practices**  
   - Gate: Never log or expose secrets; keep error messages and outputs free of sensitive data.  
   - Plan: When interacting with GitHub APIs or environment variables, avoid logging raw tokens or payloads; ensure pull request comments and logs only contain metric values and high-level status, never secrets.  
   - Status: PASS (no security exceptions planned).

5. **Testing Discipline**  
   - Gate: Add or update unit, integration, and contract tests; ensure build, lint, typecheck, and tests run in CI.  
   - Plan: Extend existing tests for `track-metrics`, storage queries, and reporter logic, and add new contract tests for the action inputs/outputs and quality gate behaviour.  
   - Status: PASS (test coverage planned as part of implementation).

No constitution violations are currently anticipated, so the Complexity Tracking section remains informational only. If later design choices would violate any gate, they must be documented and justified there before implementation.

## Project Structure

### Documentation (this feature)

```text
specs/004-metrics-quality-gate/
├── spec.md              # Feature specification (already written)
├── plan.md              # This implementation plan (/speckit.plan output)
├── research.md          # Phase 0 research decisions (/speckit.plan output)
├── data-model.md        # Phase 1 data model (/speckit.plan output)
├── quickstart.md        # Phase 1 implementation quickstart (/speckit.plan output)
├── contracts/           # Phase 1 contracts (/speckit.plan output)
│   ├── action-interface.md    # GitHub Action interface for quality gate
│   └── config-schema.md       # Config schema extension for thresholds/gate
└── checklists/
    └── requirements.md  # Specification quality checklist (existing)
    # tasks.md will be created later by /speckit.tasks, not by /speckit.plan
```

### Source Code (repository root)

```text
src/
├── actions/
│   ├── collect.ts              # Existing metrics collection entrypoint
│   ├── track-metrics.ts        # Existing - main branch only (unchanged)
│   ├── quality-gate.ts         # Action entrypoint + PR comment rendering (~350 lines)
│   ├── find-database.ts        # Database discovery for reporting workflows
│   └── report.ts               # Report generation entrypoint
├── quality-gate/               # Core quality gate library (extracted from action)
│   ├── index.ts                # Re-exports public API
│   ├── types.ts                # Types: MetricSample, MetricEvaluationResult, QualityGateResult
│   ├── evaluator.ts            # Pure evaluation: calculateMedian, evaluateThreshold, evaluateQualityGate
│   └── samples.ts              # Sample building: buildMetricSamples, determineReferenceBranch
├── collector/
│   ├── collector.ts      # Metric collection orchestration
│   ├── context.ts        # Build context extraction
│   └── runner.ts         # Command execution for metrics
├── config/
│   ├── loader.ts         # unentropy.json loading and validation
│   └── schema.ts         # Core configuration schema (extended for thresholds/gate)
├── reporter/
│   ├── generator.ts      # HTML report generation
│   ├── charts.ts         # Chart configuration helpers
│   └── templates/...     # HTML/React templates for reports
└── storage/
    ├── storage.ts        # Storage orchestration and provider selection
    ├── repository.ts     # Domain operations (metric history, comparison)
    ├── adapters/
    │   ├── interface.ts  # DatabaseAdapter interface
    │   └── sqlite.ts     # SQLite adapter implementation
    ├── providers/
    │   ├── interface.ts  # StorageProvider interface
    │   ├── factory.ts    # Provider factory
    │   ├── sqlite-local.ts  # Local file provider
    │   └── sqlite-s3.ts     # S3-compatible provider
    ├── migrations.ts     # Schema initialization
    ├── queries.ts        # Low-level SQL queries (used by adapter)
    └── types.ts          # Storage entity types

tests/
├── contract/
│   └── track-metrics-config.test.ts   # Config contract (extended for thresholds/gate)
├── integration/
│   ├── track-metrics.test.ts          # End-to-end metrics workflow (extended for gate)
│   ├── collection.test.ts
│   ├── reporting.test.ts
│   └── storage-selection.test.ts
└── unit/
    ├── collector/
    ├── config/
    ├── quality-gate/           # Unit tests for quality gate library
    │   ├── evaluator.test.ts   # Tests for evaluation logic
    │   └── samples.test.ts     # Tests for sample building
    ├── reporter/
    └── storage/
```

**Structure Decision**: The quality gate feature follows a layered architecture:
- **`src/quality-gate/`**: Core library with pure evaluation logic, types, and sample building utilities. This module has no GitHub Action dependencies and is easily unit-testable.
- **`src/actions/quality-gate.ts`**: Thin action wrapper (~350 lines) handling input parsing, storage configuration, PR comment rendering, and orchestration. Imports core logic from `src/quality-gate/`.

This separation enables:
- **Better testability**: Pure functions in `evaluator.ts` can be unit tested without mocking GitHub Actions
- **Clearer responsibilities**: Types and evaluation logic separate from GitHub-specific concerns
- **Smaller files**: Action file reduced from ~745 lines to ~350 lines

Configuration extensions are in `src/config/schema.ts` (already implemented). The action leverages the existing three-layer storage architecture in read-only mode and reuses the metrics collection infrastructure. No changes to `track-metrics` action are required. Documentation and contracts for this feature live exclusively under `specs/004-metrics-quality-gate/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|---------------------------------------|
| *(none)* | No constitution violations are currently planned for this feature. | N/A |
