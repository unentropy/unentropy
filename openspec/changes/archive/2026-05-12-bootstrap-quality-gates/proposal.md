## Why

Quality gate threshold evaluation is implemented but lacks a formal OpenSpec specification. The existing spec-kit document (004-metrics-quality-gate) describes the behavior but uses a legacy chronological format. This change creates `openspec/specs/quality-gates/` as the canonical behavior spec for threshold evaluation logic.

## What Changes

- Create `openspec/specs/quality-gates/` as the canonical behavior specification for threshold evaluation
- Consolidate quality-gate behavior from spec-kit 004 (threshold rules, baseline comparison, evaluation logic)
- Create `contracts/config-schema.md` defining the `qualityGate` block of `unentropy.json`
- No code changes — this is a specification-only bootstrap

## Capabilities

### New Capabilities

- `quality-gates`: Evaluate metric thresholds against baseline, produce pass/fail status

### Modified Capabilities

- None (bootstrap of existing behavior)

## Impact

- Affected: `openspec/specs/quality-gates/` and related contracts
- No source code, APIs, or user-facing behavior changes
- Existing `unentropy.json` configurations remain valid

### Documentation Impact

- Contracts affect: `reference/config.md` (qualityGate section), `guides/quality-gates.md`

## Non-goals

- PR comment posting or layout format (see `actions/quality-gate/` spec)
- Baseline database download orchestration (see `actions/quality-gate/` spec)
- Metric collection or storage (see `metrics/` and `storage/` specs)
