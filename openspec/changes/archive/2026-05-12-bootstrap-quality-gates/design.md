## Context

This change creates a new OpenSpec domain for quality gate threshold evaluation, consolidating behavior from spec-kit 004-metrics-quality-gate.

The spec-kit 004 document describes two concerns that should be separate in OpenSpec:

- **Threshold evaluation logic** (what this domain covers): threshold rules, baseline comparison, evaluation, pass/fail status
- **Action workflow orchestration**: PR comment posting, baseline DB download — deferred to `actions/quality-gate/`

Only the threshold evaluation logic is specified here. Action-level concerns belong in the action's own spec.

## Goals / Non-Goals

**Goals:**

- Establish `openspec/specs/quality-gates/` as the canonical behavior specification for threshold evaluation
- Create a discrete contract for the `qualityGate` config block
- Enable future quality-gate changes to use OpenSpec delta specs

**Non-Goals:**

- Modify any implementation code
- Specify PR comment layout or formatting
- Specify workflow orchestration (download baseline, run evaluation, post results)

## Decisions

### Decision: Threshold Logic Only

**Chosen**: The quality-gates domain covers only threshold evaluation logic — rule definition, baseline comparison, evaluation, and pass/fail status.

**Rationale**: The 004 spec mixes evaluation logic with action orchestration. Separating them follows OpenSpec's principle of organizing by behavior. The action orchestration belongs in `actions/quality-gate/`.

**Alternative**: Include action workflow in this spec — rejected because it would create cross-cutting concerns and make the spec harder to maintain.

### Decision: Config Schema Sliced by Domain

**Chosen**: The quality-gates domain owns the `qualityGate` block of `unentropy.json`.

**Rationale**: Each OpenSpec domain owns its configuration slice. The full schema is assembled from domain contracts at documentation generation time.

## Risks / Trade-offs

- [Risk] Threshold evaluation depends on baseline data from the storage domain → Mitigation: Dependencies explicitly listed in spec; storage contract is a foundational contract
- [Risk] Threshold rules reference metric keys defined in the metrics domain → Mitigation: Config validation cross-references metric keys at validation time

## Contracts Referenced

- `contracts/config-schema.md` — qualityGate block of `unentropy.json`

## File Changes

No source code changes.

## Open Questions

None.
