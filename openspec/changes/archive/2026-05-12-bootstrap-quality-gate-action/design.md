## Context

This change consolidates quality-gate action behavior from spec-kit 004 into a single OpenSpec domain.

The behavior originates from:

- **004-metrics-quality-gate**: Quality gate action interface, PR comment layout, PR context evaluation workflow (all user stories, functional requirements)

The implementation is already complete and in active use. This is a retroactive specification.

## Goals / Non-Goals

**Goals:**

- Establish `openspec/specs/actions/quality-gate/` as the canonical behavior specification for the quality-gate GitHub Action
- Create discrete contracts for the action interface and PR comment layout
- Consolidate quality-gate action behavior from spec-kit 004
- Enable future quality-gate-related changes to use OpenSpec delta specs

**Non-Goals:**

- Modify any implementation code
- Define threshold evaluation logic (see `quality-gates/` spec)
- Define metric collection behavior (see `metrics/` spec)
- Define storage provider behavior (see `storage/` spec)

## Decisions

### Decision: Separate Action Domain from Threshold Logic

**Chosen**: The quality-gate action workflow (baseline retrieval, orchestration, PR comments) lives in `actions/quality-gate/`, separate from threshold evaluation logic in `quality-gates/`.

**Rationale**: The action spec describes _workflow orchestration_ — downloading databases, running collection, calling the evaluator, posting comments. Threshold evaluation is a pure computation consumed by the action. Separating them keeps each spec focused and allows the threshold logic to evolve independently.

### Decision: PR Comment Format as Contract

**Chosen**: The PR comment layout is specified as a standalone contract (`contracts/comment-layout.md`) within the actions/quality-gate domain.

**Rationale**: The comment format is a visual and behavioral contract that multiple components (action, evaluator, future UI tools) may need to reference. Documenting it as a contract makes it independently reviewable and testable.

### Decision: Action Interface as Contract

**Chosen**: The action inputs, outputs, and behavioral contract are specified as a standalone contract (`contracts/action-interface.md`).

**Rationale**: The action interface defines the public API surface of the GitHub Action. Documenting it as a contract provides a single source of truth for workflow authors and downstream consumers.

## Risks / Trade-offs

- [Risk] Action interface changes require coordinated updates to the `track-metrics` action if they share storage configuration patterns → Mitigation: Both actions use the same storage input parameters; changes to storage inputs are managed in the `storage/` spec
- [Risk] PR comment format changes could break users who parse the comment → Mitigation: Comment marker provides stable identification; format changes are versioned via the contract
- [Risk] Cross-domain dependencies (storage, metrics, quality-gates) create implicit coupling → Mitigation: Each domain's contract is independently versioned; actions depend on interfaces not implementations

## Contracts Referenced

- `contracts/action-interface.md` — quality-gate action inputs, outputs, and behavioral contract
- `contracts/comment-layout.md` — PR comment format and visual states

### External Domain References

- `../storage/contracts/storage-provider-interface.md` — storage provider interface for baseline database retrieval
- `../../quality-gates/contracts/config-schema.md` — threshold configuration schema (future domain)

## File Changes

No source code changes.

## Open Questions

None.
