# Tasks: Unentropy Publishing & Distribution

**Input**: Design documents from `/specs/007-publishing/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Approach**: Hybrid automation (Option C) - Tag-based publishing with streamlined version management

**Tests**: No test tasks included (not explicitly requested in spec).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `scripts/`, `.github/` at repository root
- Paths shown below follow plan.md structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project configuration and package.json updates for publishing

- [x] T001 Update package.json with `bin` field pointing to `./dist/index.js`
- [x] T002 Update package.json with `files` array: `["dist", "README.md"]`
- [x] T003 [P] Update package.json with `engines` field: `{ "node": ">=18.0.0" }`
- [x] T004 [P] Update package.json with npm discovery keywords in `keywords` array
- [x] T005 [P] Verify package.json has required fields: `name`, `version`, `description`, `license`, `homepage`, `repository`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build infrastructure that MUST be complete before ANY publishing can occur

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create CLI build script in scripts/build-cli.ts using Bun bundler with `target: "node"`, `banner: "#!/usr/bin/env node"`, output to dist/index.js
- [x] T007 Add `build:cli` npm script to package.json that runs scripts/build-cli.ts
- [x] T008 [P] Verify existing build:actions script in scripts/build-actions.ts works correctly
- [x] T009 Create publish workflow skeleton in .github/workflows/publish.yml with trigger on tag push (v* pattern)
- [ ] T009b Update scripts/build-cli.ts to use `target: "node"` instead of `target: "bun"` for cross-runtime compatibility
- [x] T009c Add version helper scripts to package.json: `version:patch`, `version:minor`, `version:major` that run `bun pm version X && git push --follow-tags`

**Checkpoint**: Build infrastructure ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Install CLI via npm (Priority: P1) MVP

**Goal**: Enable users to run `bunx unentropy init` to scaffold configuration

**Independent Test**: Run `bunx unentropy@<version> init` in a fresh directory and verify it generates valid unentropy.json

### Implementation for User Story 1

- [x] T010 [US1] Update .github/workflows/publish.yml trigger to `on.push.tags: ['v*']` instead of release.published
- [x] T011 [US1] Add semver tag validation step to .github/workflows/publish.yml (validate tag matches vMAJOR.MINOR.PATCH format)
- [x] T012 [US1] Add version match validation step to .github/workflows/publish.yml (package.json version must match tag version)
- [x] T013 [US1] Add CLI build step to .github/workflows/publish.yml (run bun run build:cli)
- [x] T014 [US1] Add npm idempotency check to .github/workflows/publish.yml (skip if version already published)
- [x] T015 [US1] Add npm publish step to .github/workflows/publish.yml with NPM_TOKEN secret
- [x] T016 [US1] Add beta dist-tag logic to .github/workflows/publish.yml (use --tag beta for 0.x versions)
- [x] T017 [US1] Add GitHub release creation step to .github/workflows/publish.yml (create release from tag automatically)
- [x] T018 [US1] Document NPM_TOKEN secret requirement in specs/007-publishing/quickstart.md (already done, just verify)

**Checkpoint**: User Story 1 complete - `bunx unentropy init` works after release is published

---

## Phase 4: User Story 2 - Use Actions with Clean Syntax (Priority: P2)

**Goal**: Enable users to reference actions as `uses: unentropy/track-metrics@v0`

**Independent Test**: Create a workflow using `uses: unentropy/track-metrics@v0` and verify it executes

### Implementation for User Story 2

- [ ] T019 [US2] Add actions build step to .github/workflows/publish.yml (run bun run build:actions)
- [ ] T020 [US2] Add job for publishing track-metrics action to .github/workflows/publish.yml
- [ ] T021 [P] [US2] Add job for publishing quality-gate action to .github/workflows/publish.yml
- [ ] T022 [US2] Implement clone target repo step in publish workflow (use ACTIONS_PUBLISH_TOKEN for auth)
- [ ] T023 [US2] Implement clear existing files step in publish workflow (remove all except .git/)
- [ ] T024 [US2] Implement copy files step in publish workflow (action.yml, dist/, README.md)
- [ ] T025 [US2] Implement commit step in publish workflow with traceability message
- [ ] T026 [US2] Implement tag creation step in publish workflow (exact version tag)
- [ ] T027 [US2] Implement floating tag update step in publish workflow (v0, v0.1 force-push)
- [ ] T028 [US2] Implement push step in publish workflow (commits + tags with --force)
- [ ] T029 [US2] Document ACTIONS_PUBLISH_TOKEN secret requirement in specs/007-publishing/quickstart.md (already done, just verify)
- [ ] T030 [P] [US2] Create README.md for .github/actions/track-metrics/ with usage examples
- [ ] T031 [P] [US2] Create README.md for .github/actions/quality-gate/ with usage examples

**Checkpoint**: User Story 2 complete - `uses: unentropy/track-metrics@v0` works after release

---

## Phase 5: User Story 3 - Discover Actions on GitHub Marketplace (Priority: P3)

**Goal**: Actions appear in GitHub Marketplace search results

**Independent Test**: Search GitHub Marketplace for "metrics" and verify actions appear

**Note**: First Marketplace publication is manual (requires accepting GitHub Developer Agreement). This phase prepares the prerequisites.

### Implementation for User Story 3

- [ ] T032 [US3] Verify action.yml branding fields (icon, color) are set in .github/actions/track-metrics/action.yml
- [ ] T033 [P] [US3] Verify action.yml branding fields (icon, color) are set in .github/actions/quality-gate/action.yml
- [ ] T034 [US3] Document manual Marketplace listing steps in specs/007-publishing/quickstart.md

**Checkpoint**: Prerequisites ready for manual Marketplace listing

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T035 Add workflow timeout settings to .github/workflows/publish.yml (15 min overall, 5 min per step)
- [ ] T036 [P] Add error handling with clear messages for common failures in publish workflow
- [ ] T037 [P] Update main README.md with installation instructions (`bunx unentropy init`)
- [ ] T038 [P] Add section to quickstart.md explaining migration path to changesets (post-beta)
- [ ] T039 Run quickstart.md validation (manual walkthrough of publishing process)
- [ ] T040 Update specs/007-publishing/tasks.md to mark all tasks complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2)
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) - can run parallel to US1
- **User Story 3 (Phase 5)**: Depends on User Story 2 (needs action repos published first)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent of US1
- **User Story 3 (P3)**: Requires US2 complete (actions must exist in target repos)

### Within Each User Story

- Workflow steps must be added in logical order (validation → build → publish)
- Documentation tasks can run parallel to implementation

### Parallel Opportunities

**Phase 1 (Setup):**
- T003, T004, T005 can run in parallel (different package.json fields)

**Phase 2 (Foundational):**
- T008 can run parallel to T006, T007

**Phase 3 (US1):**
- All tasks are sequential (building workflow step by step)

**Phase 4 (US2):**
- T018, T019 can run in parallel (different action jobs)
- T028, T029 can run in parallel (different README files)

**Phase 5 (US3):**
- T030, T031 can run in parallel (different action.yml files)

**Phase 6 (Polish):**
- T034, T035 can run in parallel (different files)

---

## Parallel Example: User Story 2 Actions Publishing

```bash
# Launch both action publish jobs in parallel:
Task: "Add job for publishing track-metrics action to .github/workflows/publish.yml"
Task: "Add job for publishing quality-gate action to .github/workflows/publish.yml"

# Launch both README files in parallel:
Task: "Create README.md for .github/actions/track-metrics/"
Task: "Create README.md for .github/actions/quality-gate/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (package.json updates)
2. Complete Phase 2: Foundational (build scripts + workflow skeleton)
3. Complete Phase 3: User Story 1 (npm publishing)
4. **STOP and VALIDATE**: Create a release and verify `bunx unentropy@<version> init` works
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Build infrastructure ready
2. Add User Story 1 → Test npm publishing → MVP delivered!
3. Add User Story 2 → Test action publishing → Actions usable!
4. Add User Story 3 → Prepare for Marketplace → Future growth enabled
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (npm publishing)
   - Developer B: User Story 2 (actions publishing)
3. User Story 3 after US2 completes

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The publish workflow builds incrementally - each task adds steps to the same file
- Secrets (NPM_TOKEN, ACTIONS_PUBLISH_TOKEN) must be configured before first publish
