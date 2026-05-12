## Context

This change consolidates metric-related behavior from spec-kit into OpenSpec format. The behavior spans two original specs:

- **001-metrics-tracking-poc**: Custom metric definition, configuration validation
- **005-metrics-gallery**: Built-in metric templates, `$ref` syntax, `@collect` shortcuts

The implementation is already complete and in active use. This is a retroactive specification.

## Goals / Non-Goals

**Goals:**

- Establish `openspec/specs/metrics/` as the canonical behavior specification for metric definition and collection
- Create discrete contracts for the metrics config schema and built-in metrics registry
- Enable future metric-related changes to use OpenSpec delta specs

**Non-Goals:**

- Modify any implementation code
- Add new metric templates or collectors
- Change the configuration schema

## Decisions

### Decision: Single Domain Spec

**Chosen**: Merge 001 (custom metrics) and 005 (built-in templates) into a single `metrics/` domain.

**Rationale**: Both describe the same user capability — defining what to track. Built-in templates are just a convenience layer on top of custom metric definition. Splitting them would create artificial boundaries.

**Alternative**: Keep 001 and 005 as separate specs — rejected because it preserves the legacy chronological structure rather than organizing by behavior.

### Decision: Config Schema Sliced by Domain

**Chosen**: The metrics domain owns the `metrics` block of `unentropy.json`.

**Rationale**: Each OpenSpec domain owns its configuration slice. The full schema is assembled from domain contracts at documentation generation time.

## Risks / Trade-offs

- [Risk] Full config schema is fragmented across domains → Mitigation: Documentation generator reads all domain contracts and assembles the complete schema
- [Risk] Cross-domain references (e.g., thresholds reference metric keys) are hard to trace → Mitigation: Contracts explicitly list referenced domains

## Contracts Referenced

- `contracts/config-schema.md` — metrics block of `unentropy.json`
- `contracts/built-in-metrics.md` — template registry and `@collect` syntax

## File Changes

No source code changes.

## Open Questions

None.
