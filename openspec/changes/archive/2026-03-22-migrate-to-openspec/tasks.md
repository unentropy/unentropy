# Tasks: Migrate from SpecKit to OpenSpec

## Phase 0: Prerequisites

- [ ] T000 Ensure OpenSpec is installed and configured (openspec init completed)
- [ ] T001 Verify current SpecKit structure is backed up (optional but recommended)

## Phase 1: Setup OpenSpec Infrastructure

- [ ] T002 [P] Update openspec/config.yaml with project context (completed)
- [ ] T003 [P] Verify OpenSpec skills are installed in .opencode/skills/ (completed)
- [ ] T004 [P] Verify OpenSpec commands are available (/opsx:propose, etc.) (completed)

## Phase 2: Migrate SpecKit Features (Repeat for each feature)

### For each feature in specs/ (e.g., 001-metrics-tracking-poc, 003-unified-s3-action, etc.):

- [ ] T005 [P] Create OpenSpec change for the feature (if not already done): `openspec new change "<feature-name>"`
- [ ] T006 [P] Copy SpecKit spec.md to openspec/specs/<feature-name>/spec.md (as source of truth)
- [ ] T007 [P] For each contract file in specs/<feature>/contracts/:
  - Determine appropriate OpenSpec artifact (proposal, design, tasks, or delta spec)
  - Copy content to the appropriate location in the OpenSpec change or specs directory
  - Convert technical specifications to behavior-focused requirements where appropriate
- [ ] T008 [P] Move any research.md, plan.md, quickstart.md, checklists/ to appropriate locations (consider if they belong in proposal, design, or as supporting documentation)
- [ ] T009 [P] Verify all content from the SpecKit feature directory has been migrated to OpenSpec structure
- [ ] T010 [P] Run verification: Check that no content is lost and that OpenSpec structure is correct

## Phase 3: Update Documentation Generation

- [ ] T011 [P] Update documentation generation scripts to read from openspec/specs/ instead of specs/
- [ ] T012 [P] Update documentation generation to handle OpenSpec artifact structure (proposal, design, tasks, delta specs)
- [ ] T013 [P] Test documentation generation with migrated specs
- [ ] T014 [P] Ensure upcoming features (in changes/) are reflected in documentation as "coming soon" or similar

## Phase 4: Verification and Cleanup

- [ ] T015 [P] Run full build: bun run build, bun run typecheck, bun run lint, bun test
- [ ] T016 [P] Verify documentation site generates correctly from OpenSpec structure
- [ ] T017 [P] Confirm all SpecKit-specific files are ready for removal (but do not remove yet)
- [ ] T018 [P] Validate that OpenSpec workflow works correctly with the migrated content
- [ ] T019 [P] Remove SpecKit-specific directories and files (specs/ directory contracts, research.md, plan.md, quickstart.md, checklists/, etc. but preserve the migrated spec.md files in openspec/specs/)
- [ ] T020 [P] Final verification: Ensure system works with OpenSpec only and documentation is generated correctly

## Phase 5: Archive Migration Change

- [ ] T021 [P] Archive the migration change: `/opsx:archive migrate-to-openspec`
- [ ] T022 [P] Verify the change is moved to openspec/changes/archive/ and specs are updated if needed
