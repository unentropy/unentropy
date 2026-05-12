## 1. Create Spec

- [ ] 1.1 Write `specs/reporting/spec.md` with ADDED requirements covering all user stories from 006 and basic report behavior from 001
- [ ] 1.2 Verify spec covers all behavior from 001 (basic report rendering) and 006 (preview toggle, synchronized crosshair, zoom, date filters, export)

## 2. Create Contracts

- [ ] 2.1 Write `contracts/report-data-schema.md` with ChartsData interface, feature flags, CDN dependencies
- [ ] 2.2 Write `contracts/report-layout.md` with visual structure, component specs, interaction flows, accessibility
- [ ] 2.3 Write `contracts/visual-acceptance-criteria.md` with test fixtures, review checklist, browser compatibility
- [ ] 2.4 Verify contracts are self-contained and documentation-ready

## 3. Create Supporting Artifacts

- [ ] 3.1 Write `proposal.md`
- [ ] 3.2 Write `design.md`
- [ ] 3.3 Write `tasks.md`

## 4. Validate, Archive and Copy

- [ ] 4.1 Run `openspec validate bootstrap-reporting`
- [ ] 4.2 Run `openspec archive bootstrap-reporting --yes`
- [ ] 4.3 Verify `openspec/specs/reporting/` exists with spec.md and contracts/
