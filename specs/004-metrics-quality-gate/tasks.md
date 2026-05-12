---

description: "Task list for Metrics Quality Gate feature"

---

# Tasks: Metrics Quality Gate

**Input**: Design documents from `/specs/004-metrics-quality-gate/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: This feature explicitly calls for unit, integration, and contract tests; test tasks are included per user story.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Quality gate feature docs**: `specs/004-metrics-quality-gate/`
- **GitHub Action definition**: `.github/actions/track-metrics/action.yml`
- Paths shown below follow the structure defined in plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure environment and existing metrics workflow are understood before adding the quality gate

- [x] T001 Review metrics quality gate design docs in specs/004-metrics-quality-gate/
- [x] T002 [P] Verify Bun build lint typecheck and test commands in package.json
- [x] T003 [P] Review existing metrics workflow entrypoint in src/actions/track-metrics.ts

---

## Phase 2: Foundational (Diff-Only PR Comment)

**Purpose**: Core infrastructure and a simple GitHub pull request comment that starts as a basic status summary and then evolves to show metric diffs, without thresholds or gate decisions; MUST be complete before user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Implement basic pull request comment that outputs track-metrics run status and metrics count in src/actions/track-metrics.ts
- [x] T005 [P] Wire minimal enable-pr-comment and pr-comment-marker inputs for basic status comment in .github/actions/track-metrics/action.yml and src/actions/track-metrics.ts
- [x] T006 [P] Implement baseline and pull request metric history domain methods for diffs in src/storage/repository.ts (e.g., getMetricComparison)
- [x] T007 [P] Add unit tests for baseline and pull request diff repository methods in tests/unit/storage/repository.test.ts
- [x] T008 [P] Ensure pull request and reference branch context fields are exposed for diff queries in src/collector/context.ts
- [x] T009 [P] Confirm collector writes branch and pull request identifiers needed for diff queries in src/collector/collector.ts
- [x] T010 [P] Extend basic PR comment to include metric diffs when baseline data is available in src/actions/track-metrics.ts
- [ ] T011 Implement GitHub REST client helper to create or update canonical diff-aware metrics comment in src/actions/track-metrics.ts
- [ ] T012 [P] Wire max-pr-comment-metrics input and sizing defaults for diff-aware comments in .github/actions/track-metrics/action.yml and src/actions/track-metrics.ts
- [ ] T013 Add integration coverage for basic and diff-aware pull request metrics comments in tests/integration/track-metrics.test.ts

**Checkpoint**: Foundation ready - a simple metrics status/diff comment exists and user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Configure and enforce metric thresholds on pull requests (Priority: P1) 🎯 MVP

**Goal**: Enable repository maintainers to define per-metric thresholds, evaluate them for each pull request against a reference branch baseline, and derive a clear pass/fail quality gate result.

**Independent Test**: Configure thresholds for several metrics, open a pull request that intentionally violates one or more thresholds, and verify that the system evaluates all configured metrics and clearly reports which ones pass or fail.

**Architecture**: The quality gate uses a layered design:
- `src/quality-gate/`: Core library with types, evaluation logic, and sample building (pure functions, no GitHub dependencies)
- `src/actions/quality-gate.ts`: Thin action wrapper with input parsing, storage config, PR comment rendering, and orchestration

This separation enables better testability (pure functions), clearer responsibilities, and smaller files.

**Note**: The quality gate is implemented as a standalone action separate from track-metrics:
- `track-metrics` action: Main branch only, builds historical database, persists to S3
- `quality-gate` action: PR context only, downloads baseline, evaluates thresholds, posts comment

### Module Structure

```
src/quality-gate/
├── index.ts          # Re-exports public API
├── types.ts          # Types: MetricGateStatus, MetricSample, MetricEvaluationResult, QualityGateResult
├── evaluator.ts      # Pure functions: calculateMedian, evaluateThreshold, evaluateQualityGate
└── samples.ts        # Utilities: buildMetricSamples, determineReferenceBranch, calculateBuildsConsidered

src/actions/
└── quality-gate.ts   # Action entrypoint: input parsing, storage config, PR comment rendering

tests/unit/quality-gate/
├── evaluator.test.ts # Unit tests for evaluation logic
└── samples.test.ts   # Unit tests for sample building
```

### Tests for User Story 1

- [x] T014 [P] [US1] Add qualityGate schema validation tests for thresholds and baseline in tests/unit/config/schema.test.ts
- [x] T015 [P] [US1] Add loader tests ensuring UnentropyConfigWithQualityGate is returned in tests/unit/config/loader.test.ts
- [ ] T016 [P] [US1] Add unit tests for evaluator functions (calculateMedian, evaluateThreshold, evaluateQualityGate) in tests/unit/quality-gate/evaluator.test.ts
- [ ] T016b [P] [US1] Add unit tests for sample building functions in tests/unit/quality-gate/samples.test.ts

### Implementation for User Story 1

#### Core Library (src/quality-gate/)

- [x] T017 [P] [US1] Extend configuration schema with QualityGateConfig BaselineConfig and MetricThresholdConfig in src/config/schema.ts
- [x] T018 [P] [US1] Extend configuration loader to parse and default the qualityGate block in src/config/loader.ts
- [ ] T019 [P] [US1] Implement MetricGateStatus, MetricSample, MetricEvaluationResult, QualityGateOverallStatus, QualityGateResult types in src/quality-gate/types.ts
- [ ] T020 [P] [US1] Implement calculateMedian, evaluateThreshold, evaluateQualityGate functions in src/quality-gate/evaluator.ts
- [ ] T020b [P] [US1] Implement buildMetricSamples, determineReferenceBranch, calculateBuildsConsidered functions in src/quality-gate/samples.ts
- [ ] T020c [US1] Create src/quality-gate/index.ts re-exporting public API (types + public functions)

#### Action Entrypoint (src/actions/quality-gate.ts)

- [ ] T021 [US1] Create quality-gate action entrypoint that downloads baseline DB, collects PR metrics, evaluates thresholds using src/quality-gate/ library in src/actions/quality-gate.ts
- [x] T022 [P] [US1] Create quality-gate action interface with inputs and outputs in .github/actions/quality-gate/action.yml
- [ ] T023 [US1] Map quality-gate-mode input and configuration into evaluation mode selection in src/actions/quality-gate.ts
- [ ] T024 [US1] Implement PR comment rendering and GitHub API integration in src/actions/quality-gate.ts
- [ ] T024b [US1] Fail or pass job based on hard quality gate status while treating unknown as non-blocking in src/actions/quality-gate.ts

### Verification

- [ ] T024c [US1] Run bun run build, bun run typecheck, bun run lint, bun test to verify implementation

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently, with thresholds evaluated and overall gate status exposed to CI.

---

## Phase 4: User Story 2 - See a clear summary of metric changes on pull requests (Priority: P2)

**Goal**: Enhance the existing diff-only pull request comment to include threshold evaluation results and overall quality gate status while keeping the comment concise.

**Independent Test**: Enable the comment option, configure a few metrics with thresholds, open a pull request that changes those metrics, and verify that there is exactly one up-to-date comment containing the comparison table and quality gate status.

### Tests for User Story 2

- [ ] T025 [P] [US2] Add integration tests for gate-aware pull request metrics comment creation and updates in tests/integration/track-metrics.test.ts
- [ ] T026 [P] [US2] Extend contract tests for enable-pr-comment quality-gate-comment-url and gate-related outputs in tests/contract/track-metrics-config.test.ts

### Implementation for User Story 2

- [ ] T027 [P] [US2] Extend PullRequestFeedbackPayload to include QualityGateResult summaries in src/actions/track-metrics.ts
- [ ] T028 [US2] Update GitHub REST client helper to render overall gate status and per-metric pass/fail in the canonical comment in src/actions/track-metrics.ts
- [ ] T029 [US2] Respect qualityGate.maxCommentMetrics and maxCommentCharacters when selecting metrics for gate-aware display in src/actions/track-metrics.ts
- [ ] T030 [US2] Ensure diff-only behaviour remains when qualityGate is disabled or mode is off in src/actions/track-metrics.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently, with CI gate status and a single up-to-date PR comment describing metric changes and gate results.

---

## Phase 5: User Story 3 - Work safely when thresholds or baselines are missing (Priority: P3)

**Goal**: Ensure the system behaves safely and transparently when thresholds or baselines are missing or misconfigured, without blocking work unnecessarily.

**Independent Test**: Configure metrics tracking with no thresholds, then with thresholds for only some metrics, and in cases where baseline data is missing. Confirm that pull requests still complete, that available metrics are shown, and that the quality gate status reflects the actual configuration.

### Tests for User Story 3

- [ ] T031 [US3] Extend quality gate unit tests for no-thresholds and partial-thresholds scenarios in tests/unit/quality-gate/evaluator.test.ts
- [ ] T032 [US3] Add integration tests covering runs with missing baselines and mixed configured thresholds in tests/integration/track-metrics.test.ts
- [ ] T033 [US3] Add unit tests for invalid threshold configuration error messages in tests/unit/config/schema.test.ts

### Implementation for User Story 3

- [ ] T034 [US3] Implement behaviour when no thresholds are configured returning overall unknown gate status in src/quality-gate/evaluator.ts
- [ ] T035 [US3] Implement missing baseline handling marking metrics as unknown with baselineInfo populated in src/quality-gate/evaluator.ts
- [ ] T036 [US3] Harden validation for MetricThresholdConfig fields with user friendly errors in src/config/schema.ts
- [ ] T037 [US3] Ensure track-metrics treats evaluation exceptions and unknown results as soft outcomes that do not fail CI in src/actions/track-metrics.ts

**Checkpoint**: All three user stories should now be independently functional, including safe behaviour when thresholds or baselines are incomplete.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T038 [P] Document quality gate usage and examples in README.md
- [ ] T039 [P] Update quickstart guide to reflect implemented phases and current defaults in specs/004-metrics-quality-gate/quickstart.md
- [ ] T040 [P] Review and optimize quality gate queries and add indexes if needed in src/storage/migrations.ts
- [ ] T041 [P] Add additional edge case tests for comment truncation and metric selection in tests/unit/reporter/generator.test.ts
- [ ] T042 Run bun run build bun run typecheck bun run lint and bun test using scripts in package.json

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories and establishes the basic and diff-only PR comment
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1 - Configure thresholds and gate)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2 - Gate-aware PR summary comment)**: Can start after Foundational (Phase 2) and reads gate results from US1 while building on the diff-only comment
- **User Story 3 (P3 - Safe behaviour without thresholds/baselines)**: Can start after Foundational (Phase 2) and builds on evaluation logic from US1 but focuses on configuration and error-handling paths

### Within Each User Story

- Tests MUST be written and run for the story’s scenarios
- Configuration and types before evaluation logic
- Evaluation logic before GitHub Action wiring
- Core implementation before integration and PR comments
- Story complete before moving to next priority for MVP

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Tests for a user story marked [P] can be implemented in parallel across different files
- Implementation tasks for different user stories can be developed in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch key tests for User Story 1 together:
Task: "T014 [US1] Add qualityGate schema validation tests in tests/unit/config/schema.test.ts"
Task: "T015 [US1] Add loader tests for qualityGate block in tests/unit/config/loader.test.ts"
Task: "T016 [US1] Add unit tests for evaluator functions in tests/unit/quality-gate/evaluator.test.ts"
Task: "T016b [US1] Add unit tests for sample building in tests/unit/quality-gate/samples.test.ts"

# Launch core library implementation tasks together (different files):
Task: "T017 [US1] Extend QualityGateConfig schema in src/config/schema.ts"
Task: "T018 [US1] Extend configuration loader in src/config/loader.ts"
Task: "T019 [US1] Implement types in src/quality-gate/types.ts"
Task: "T020 [US1] Implement evaluator functions in src/quality-gate/evaluator.ts"
Task: "T020b [US1] Implement sample building in src/quality-gate/samples.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational basic and diff-only PR comment (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (threshold configuration, evaluation, and gate status outputs)
   - Core library first: types.ts → evaluator.ts → samples.ts → index.ts
   - Action wrapper: quality-gate.ts imports from library
4. **STOP and VALIDATE**: Test User Story 1 independently using tests in tests/unit/config/, tests/unit/quality-gate/, and tests/integration/track-metrics.test.ts
5. Integrate quality gate outputs into CI policies if desired

### Incremental Delivery

1. Complete Setup + Foundational → Basic and diff-only PR comment and queries ready
2. Add User Story 1 → Test independently → Enable soft gates in CI
3. Add User Story 2 → Test independently → Enrich PR comments with gate status for reviewers
4. Add User Story 3 → Test independently → Harden behaviour for missing thresholds and baselines
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (including basic and diff-only PR comment)
2. Once Foundational is done:
   - Developer A: User Story 1 (quality gate configuration and evaluation)
   - Developer B: User Story 2 (gate-aware PR comment construction and GitHub API integration)
   - Developer C: User Story 3 (safe behaviour and configuration validation)
3. Stories complete and integrate independently while sharing the same storage and configuration infrastructure

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests should be updated so that failing scenarios are covered before implementation is finalised
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
- Avoid: vague tasks, same file conflicts between [P] tasks, or cross-story dependencies that break independence
