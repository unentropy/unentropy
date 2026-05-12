## Context

This change consolidates track-metrics action behavior from spec-kit 003 into a single OpenSpec domain.

The source material:

- **003-unified-s3-action**: Unified action orchestration (User Story 2), error handling for action execution (User Story 3), and the full action interface (FR-009-FR-014, FR-025-FR-030, action-interface contract)

The implementation is already complete and in active use. This is a retroactive specification.

## Goals / Non-Goals

**Goals:**

- Establish `openspec/specs/track-metrics/` as the canonical behavior specification for the track-metrics action
- Create a discrete contract for the action interface (inputs, outputs, configuration, usage)
- Consolidate action orchestration behavior into a single domain separate from storage concerns

**Non-Goals:**

- Modify any implementation code
- Specify storage backend configuration or behavior (see `storage/` spec)
- Define metric collection or report generation internals

## Decisions

### Decision: Action Domain Separated from Storage

**Chosen**: The track-metrics action specification lives in its own `track-metrics` domain, separate from `storage/`.

**Rationale**: The action orchestrates storage providers but does not define storage behavior. Keeping them separate follows the separation of concerns — the storage domain owns provider interfaces, configuration, and schema; the actions domain owns workflow sequencing, error handling at the action level, and the action's external interface.

**Alternative**: Merge action orchestration into the storage spec — rejected because it would blur the boundary between storage behavior and workflow orchestration.

### Decision: Action Interface as a Foundational Contract

**Chosen**: The action inputs, outputs, configuration precedence, and usage examples are defined in `contracts/action-interface.md`.

**Rationale**: The action interface is the primary consumer-facing contract. It is referenced by documentation, testing, and any code that invokes the action programmatically.

### Decision: Error Handling Scoped to Action Level

**Chosen**: Error handling in this spec covers failures the action observes and responds to (authentication errors, network failures, data integrity issues). It references the storage provider contract for error types but does not redefine storage-level error handling.

**Rationale**: The action is the orchestration layer — it handles errors by deciding whether to retry, fail, or continue (data preservation). The storage provider handles the actual retry mechanics and error reporting.

## Risks / Trade-offs

- [Risk] Action interface changes (new inputs/outputs) require updating the contract and the action implementation in sync → Mitigation: The Foundational Contracts table tracks all consumers of the action interface
- [Risk] Storage-level error behavior changes could affect action error handling → Mitigation: The action depends on the storage provider interface contract, not implementation details
- [Risk] New storage backends require action changes to support new workflow variants → Mitigation: The action is storage-type-agnostic via the StorageProvider abstraction

## Contracts Referenced

- `contracts/action-interface.md` — action inputs, outputs, configuration, usage, security
- `../storage/contracts/storage-provider-interface.md` — storage provider interface consumed by the action
- `../storage/contracts/config-schema.md` — storage configuration consumed by the action for backend selection

## File Changes

No source code changes.

## Open Questions

None.
