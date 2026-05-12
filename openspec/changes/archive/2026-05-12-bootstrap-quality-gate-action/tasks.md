## 1. Create Spec

- [ ] 1.1 Write `specs/actions/quality-gate/spec.md` with requirements covering quality-gate action workflow
- [ ] 1.2 Verify spec covers all action behavior from 004 (action interface, PR comments, missing baseline handling)

## 2. Create Contracts

- [ ] 2.1 Write `contracts/action-interface.md` with quality-gate action inputs, outputs, and behavioral contract
- [ ] 2.2 Write `contracts/comment-layout.md` with PR comment format and visual states
- [ ] 2.3 Verify contracts are self-contained and documentation-ready

## 3. Create Supporting Artifacts

- [ ] 3.1 Write `proposal.md`
- [ ] 3.2 Write `design.md`
- [ ] 3.3 Write `tasks.md`

## 4. Validate and Archive

- [ ] 4.1 Run `openspec validate bootstrap-quality-gate-action`
- [ ] 4.2 Run `openspec archive bootstrap-quality-gate-action --yes`
- [ ] 4.3 Copy contracts to `openspec/specs/actions/quality-gate/contracts/`
- [ ] 4.4 Run `bun run format`
