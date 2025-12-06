# Tasks: Init Scaffolding & Test Commands

**Input**: Design documents from `/specs/008-init-scaffolding/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: No explicit test tasks included unless TDD approach is requested. Implementation tasks focus on production code with integration/unit testing as part of the build process.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single project: `src/`, `tests/` at repository root
- Follow existing structure under `src/cli/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for init/test commands

- [X] T001 Create init command directory structure at src/cli/init/ with detector.ts, templates.ts, output.ts
- [X] T002 Create test command directory structure at src/cli/cmd/test.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 [P] Define ProjectType constants and detection rules in src/cli/init/detector.ts
- [ ] T004 [P] Define ConfigTemplate types and interfaces in src/cli/init/templates.ts
- [ ] T005 [P] Define WorkflowExample types and interfaces in src/cli/init/output.ts
- [ ] T006 Implement project type detection logic (detectProjectType function) in src/cli/init/detector.ts
- [ ] T007 [P] Create config templates for JavaScript/TypeScript in src/cli/init/templates.ts
- [ ] T008 [P] Create config templates for PHP in src/cli/init/templates.ts
- [ ] T009 [P] Create config templates for Go in src/cli/init/templates.ts
- [ ] T010 [P] Create config templates for Python in src/cli/init/templates.ts
- [ ] T011 Implement template selector (getTemplateForProjectType function) in src/cli/init/templates.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Quick Start with Auto-Detection (Priority: P1) 🎯 MVP

**Goal**: Users can run `bunx unentropy init` and automatically get a valid configuration for their project type

**Independent Test**: Run `bunx unentropy init` in a directory with `package.json` and verify `unentropy.json` is created with JavaScript/TypeScript metrics (lines-of-code, test-coverage, size)

### Implementation for User Story 1

- [ ] T012 [US1] Create InitCommand with basic command structure and arguments interface (InitArgs) in src/cli/cmd/init.ts
- [ ] T013 [US1] Implement init command handler with project type detection flow in src/cli/cmd/init.ts
- [ ] T014 [US1] Add config file generation logic (write JSON to disk) in src/cli/cmd/init.ts
- [ ] T015 [US1] Add detection result display (which project type and files found) in src/cli/cmd/init.ts
- [ ] T016 [US1] Add metrics list display to console output in src/cli/cmd/init.ts
- [ ] T017 [US1] Register InitCommand in src/index.ts
- [ ] T018 [US1] Create integration test for JavaScript project init in tests/integration/cli-init.test.ts
- [ ] T019 [US1] Create integration test for PHP project init in tests/integration/cli-init.test.ts
- [ ] T020 [US1] Create integration test for Go project init in tests/integration/cli-init.test.ts
- [ ] T021 [US1] Create integration test for Python project init in tests/integration/cli-init.test.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - users can run init and get auto-detected config

---

## Phase 4: User Story 2 - Force Project Type Override (Priority: P2)

**Goal**: Users can override auto-detection with `--type` flag when needed

**Independent Test**: Run `bunx unentropy init --type php` in a directory with `package.json` and verify PHP configuration is generated instead of JavaScript

### Implementation for User Story 2

- [ ] T022 [US2] Add --type option to InitCommand options in src/cli/cmd/init.ts
- [ ] T023 [US2] Implement forced type logic (skip detection if --type provided) in src/cli/cmd/init.ts
- [ ] T024 [US2] Add validation for --type values (javascript, php, go, python) in src/cli/cmd/init.ts
- [ ] T025 [US2] Add forced type display to console output in src/cli/cmd/init.ts
- [ ] T026 [US2] Create integration test for --type override in tests/integration/cli-init.test.ts
- [ ] T027 [US2] Create integration test for invalid --type value error in tests/integration/cli-init.test.ts

**Checkpoint**: User Story 2 complete - users can override detection with --type flag

---

## Phase 5: User Story 3 - GitHub Actions Workflow Guidance (Priority: P2)

**Goal**: After generating config, users see ready-to-use GitHub Actions workflow examples

**Independent Test**: Run `bunx unentropy init` and verify console output contains valid GitHub Actions YAML snippets for both metrics tracking and quality gate

### Implementation for User Story 3

- [ ] T028 [P] [US3] Implement workflow template generator for JavaScript/TypeScript in src/cli/init/output.ts
- [ ] T029 [P] [US3] Implement workflow template generator for PHP in src/cli/init/output.ts
- [ ] T030 [P] [US3] Implement workflow template generator for Go in src/cli/init/output.ts
- [ ] T031 [P] [US3] Implement workflow template generator for Python in src/cli/init/output.ts
- [ ] T032 [US3] Implement generateWorkflowExamples function (metrics + quality gate) in src/cli/init/output.ts
- [ ] T033 [US3] Add workflow examples output to init command handler in src/cli/cmd/init.ts
- [ ] T034 [US3] Add "next steps" instructions to console output in src/cli/cmd/init.ts
- [ ] T035 [US3] Create unit test for workflow template generation in tests/unit/cli/init/output.test.ts
- [ ] T036 [US3] Create integration test verifying workflow output in tests/integration/cli-init.test.ts

**Checkpoint**: User Story 3 complete - users get actionable CI/CD integration guidance

---

## Phase 6: User Story 4 - Safe File Handling (Priority: P3)

**Goal**: Prevent accidental overwrites of existing configuration files

**Independent Test**: Create an `unentropy.json` file, run `bunx unentropy init`, and verify command exits with error without modifying the file

### Implementation for User Story 4

- [ ] T037 [US4] Add --force option to InitCommand options in src/cli/cmd/init.ts
- [ ] T038 [US4] Add --dry-run option to InitCommand options in src/cli/cmd/init.ts
- [ ] T039 [US4] Implement file exists check and error display in src/cli/cmd/init.ts
- [ ] T040 [US4] Implement --force override logic in src/cli/cmd/init.ts
- [ ] T041 [US4] Implement --dry-run preview logic (display without writing) in src/cli/cmd/init.ts
- [ ] T042 [US4] Create integration test for file exists error in tests/integration/cli-init.test.ts
- [ ] T043 [US4] Create integration test for --force overwrite in tests/integration/cli-init.test.ts
- [ ] T044 [US4] Create integration test for --dry-run preview in tests/integration/cli-init.test.ts

**Checkpoint**: User Story 4 complete - file safety features working correctly

---

## Phase 7: User Story 5 - Storage Type Selection (Priority: P3)

**Goal**: Users can specify storage backend during initialization

**Independent Test**: Run `bunx unentropy init --storage s3` and verify generated config uses `sqlite-s3` storage type

### Implementation for User Story 5

- [ ] T045 [US5] Add --storage option to InitCommand options in src/cli/cmd/init.ts
- [ ] T046 [US5] Implement storage type mapping (artifact→sqlite-artifact, s3→sqlite-s3, local→sqlite-local) in src/cli/cmd/init.ts
- [ ] T047 [US5] Add storage type validation in src/cli/cmd/init.ts
- [ ] T048 [US5] Implement S3 secrets instructions generator in src/cli/init/output.ts
- [ ] T049 [US5] Add S3 instructions to workflow output when storage=s3 in src/cli/cmd/init.ts
- [ ] T050 [US5] Create integration test for S3 storage selection in tests/integration/cli-init.test.ts
- [ ] T051 [US5] Create integration test for local storage selection in tests/integration/cli-init.test.ts

**Checkpoint**: User Story 5 complete - storage type selection working with appropriate guidance

---

## Phase 8: User Story 6 - Verify Metric Collection Locally (Priority: P2)

**Goal**: Users can validate their configuration locally before pushing to CI using `bunx unentropy test`

**Independent Test**: Run `bunx unentropy test` in a project with valid `unentropy.json` and verify all metrics are collected and displayed with their values

### Implementation for User Story 6

- [x] T052 [US6] Create TestCommand with command structure and arguments interface (TestArgs) in src/cli/cmd/test.ts
- [x] T053 [US6] Implement config loading and schema validation in src/cli/cmd/test.ts
- [x] T054 [US6] Implement sequential metric collection logic (reuse collector/runner.ts) in src/cli/cmd/test.ts
- [x] T055 [US6] Implement CollectionResult formatting and display in src/cli/cmd/test.ts
- [x] T056 [US6] Add --config option for custom config file path in src/cli/cmd/test.ts
- [x] T057 [US6] Add --verbose option to show commands executed in src/cli/cmd/test.ts
- [x] T058 [US6] Add --timeout option for custom per-metric timeout in src/cli/cmd/test.ts
- [x] T059 [US6] Implement exit code logic (0=success, 1=config error, 2=collection failure) in src/cli/cmd/test.ts
- [x] T060 [US6] Implement TestSummary display (success/failure counts) in src/cli/cmd/test.ts
- [x] T061 [US6] Register TestCommand in src/index.ts
- [ ] T062 [US6] Add "run bunx unentropy test" suggestion to init output in src/cli/cmd/init.ts
- [x] T063 [US6] Create integration test for successful test command in tests/integration/cli-test.test.ts
- [x] T064 [US6] Create integration test for config validation failure in tests/integration/cli-test.test.ts
- [x] T065 [US6] Create integration test for metric collection failure in tests/integration/cli-test.test.ts
- [x] T066 [US6] Create integration test for verbose mode output in tests/integration/cli-test.test.ts

**Checkpoint**: User Story 6 complete - users can validate metric collection locally

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T067 [P] Create unit tests for project type detector in tests/unit/cli/init/detector.test.ts
- [ ] T068 [P] Create unit tests for config templates in tests/unit/cli/init/templates.test.ts
- [ ] T069 [P] Create unit tests for test command result formatter in tests/unit/cli/test/test-command.test.ts
- [ ] T070 Verify all generated configs pass `bunx unentropy verify`
- [ ] T071 Run complete integration test suite with all project types
- [ ] T072 Validate quickstart.md scenarios match implementation
- [ ] T073 Run build, lint, typecheck, and full test suite

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1 (P1) - MVP, must complete first
  - US2, US3, US6 (P2) - Can proceed after US1, recommended for complete MVP experience
  - US4, US5 (P3) - Can proceed after US1, nice-to-have features
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories - **MVP MINIMUM**
- **User Story 2 (P2)**: Can start after US1 - Extends init command - Independently testable
- **User Story 3 (P2)**: Can start after US1 - Adds output formatting - Independently testable
- **User Story 4 (P3)**: Can start after US1 - Adds safety features - Independently testable
- **User Story 5 (P3)**: Can start after US1 - Adds storage options - Independently testable
- **User Story 6 (P2)**: Can start after Foundational (Phase 2) - Completely independent of init command - Parallel to US1

### Within Each User Story

- Setup tasks before implementation
- Core functionality before options/flags
- Implementation before tests (though TDD approach could reverse this)
- Integration tests after implementation complete

### Parallel Opportunities

- **Setup Phase**: T001 and T002 can run in parallel (different directories)
- **Foundational Phase**: T003, T004, T005 can run in parallel (different files); T007-T010 can run in parallel (different project types)
- **After US1 Complete**: US2, US3, US4, US5 can all proceed in parallel (different features)
- **US6 Independent**: Can be developed completely in parallel to US1-US5 (separate command)
- **Within US3**: T028-T031 can run in parallel (different project types)
- **Polish Phase**: T067-T069 can run in parallel (different test files)

---

## Parallel Example: Foundational Phase (After Setup)

```bash
# Launch all type definitions in parallel:
Task: "Define ProjectType constants and detection rules in src/cli/init/detector.ts"
Task: "Define ConfigTemplate types and interfaces in src/cli/init/templates.ts"
Task: "Define WorkflowExample types and interfaces in src/cli/init/output.ts"

# Then launch all template creation in parallel:
Task: "Create config templates for JavaScript/TypeScript in src/cli/init/templates.ts"
Task: "Create config templates for PHP in src/cli/init/templates.ts"
Task: "Create config templates for Go in src/cli/init/templates.ts"
Task: "Create config templates for Python in src/cli/init/templates.ts"
```

## Parallel Example: Workflow Templates (US3)

```bash
# Launch all workflow generators in parallel:
Task: "Implement workflow template generator for JavaScript/TypeScript in src/cli/init/output.ts"
Task: "Implement workflow template generator for PHP in src/cli/init/output.ts"
Task: "Implement workflow template generator for Go in src/cli/init/output.ts"
Task: "Implement workflow template generator for Python in src/cli/init/output.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 6)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (auto-detection and config generation)
4. Complete Phase 8: User Story 6 (test command for validation)
5. **STOP and VALIDATE**: Test both commands work together
6. Deploy/demo if ready

**Rationale**: US1 + US6 provide complete onboarding flow: generate config → validate it works. This is the minimum viable experience.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Basic init works (minimal MVP)
3. Add User Story 6 → Test independently → Complete validation workflow (recommended MVP)
4. Add User Story 3 → Test independently → Users get CI/CD guidance
5. Add User Story 2 → Test independently → Override detection when needed
6. Add User Story 4 → Test independently → Protect from overwrites
7. Add User Story 5 → Test independently → Support different storage backends
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers after Foundational phase completes:

**Track A - Init Command**:
- Developer A: User Story 1 (P1) - Core init functionality
- Then add: US2, US3, US4, US5 in priority order

**Track B - Test Command**:
- Developer B: User Story 6 (P2) - Test command (completely independent)

Both tracks can proceed in parallel, then integrate at the end.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Integration tests created alongside implementation to validate story completion
- US6 (test command) is completely independent of init command - can be developed in parallel
- Run `bunx unentropy verify` frequently to ensure generated configs are valid
- Follow existing CLI patterns from verify.ts and collect.ts
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
