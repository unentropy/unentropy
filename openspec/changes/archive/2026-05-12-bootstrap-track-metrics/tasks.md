## 1. Create Spec

- [ ] 1.1 Write `specs/track-metrics/spec.md` with ADDED requirements covering unified workflow orchestration, phase execution, error handling, data preservation, composite action structure, and storage workflow variants
- [ ] 1.2 Verify spec covers behavior from 003-unified-s3-action (User Stories 2-3, FR-009-FR-014, FR-025-FR-030)

## 2. Create Contracts

- [ ] 2.1 Write `contracts/action-interface.md` with inputs, outputs, configuration precedence, usage examples, security, and permissions
- [ ] 2.2 Verify contract is self-contained and documentation-ready

## 3. Create Supporting Artifacts

- [ ] 3.1 Write `proposal.md`
- [ ] 3.2 Write `design.md`
- [ ] 3.3 Write `.openspec.yaml`
- [ ] 3.4 Write `tasks.md`

## 4. Validate and Archive

- [ ] 4.1 Run `openspec validate bootstrap-track-metrics`
- [ ] 4.2 Run `openspec archive bootstrap-track-metrics --yes`
- [ ] 4.3 Copy contracts to final location: `cp -r openspec/changes/archive/2026-05-12-bootstrap-track-metrics/contracts/* openspec/specs/actions/track-metrics/contracts/`
- [ ] 4.4 Create final spec at `openspec/specs/actions/track-metrics/spec.md` with title, purpose, and consolidated requirements
- [ ] 4.5 Run `bun run format`
