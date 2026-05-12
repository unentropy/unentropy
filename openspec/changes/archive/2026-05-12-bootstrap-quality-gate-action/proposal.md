## Why

The quality-gate GitHub Action evaluates PR metrics against baseline thresholds and posts PR comments with results. This behavior is specified in spec-kit 004 but lacks a formal OpenSpec specification. This change creates `openspec/specs/actions/quality-gate/` as the canonical behavior spec for the quality-gate action workflow.

## What Changes

- Create `openspec/specs/actions/quality-gate/` as the canonical behavior specification for the quality-gate GitHub Action
- Consolidate quality-gate action behavior from spec-kit 004 (action interface, PR comment layout, PR context evaluation workflow)
- Create `contracts/action-interface.md` defining the quality-gate action inputs, outputs, and behavioral contract
- Create `contracts/comment-layout.md` defining the PR comment format and visual states

## Capabilities

### New Capabilities

- `actions/quality-gate` — GitHub Action workflow: baseline retrieval, metric collection, threshold evaluation, PR comment posting

### Modified Capabilities

- None (bootstrap of existing behavior)

## Impact

- Affected: `openspec/specs/actions/quality-gate/` and related contracts
- No source code changes
- Existing `unentropy.json` configurations remain valid

### Documentation Impact

- Contracts affect: `reference/config.md` (quality gate section), `guides/quality-gate.md`
