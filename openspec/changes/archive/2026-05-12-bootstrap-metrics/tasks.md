## 1. Create Spec

- [ ] 1.1 Write `specs/metrics/spec.md` with ADDED requirements, user stories, edge cases
- [ ] 1.2 Verify spec covers all behavior from 001 (custom metrics) and 005 (built-in templates)

## 2. Create Contracts

- [ ] 2.1 Write `contracts/config-schema.md` with metrics block definition
- [ ] 2.2 Write `contracts/built-in-metrics.md` with 6 templates and `@collect` syntax
- [ ] 2.3 Verify contracts are self-contained and documentation-ready

## 3. Create Supporting Artifacts

- [ ] 3.1 Write `proposal.md`
- [ ] 3.2 Write `design.md`
- [ ] 3.3 Write `tasks.md`

## 4. Validate and Archive

- [ ] 4.1 Run `openspec validate bootstrap-metrics`
- [ ] 4.2 Run `openspec archive bootstrap-metrics`
- [ ] 4.3 Verify `openspec/specs/metrics/` exists with spec.md and contracts/
