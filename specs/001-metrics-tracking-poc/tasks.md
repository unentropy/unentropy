# Tasks: Metrics Tracking PoC

**Feature**: 001-metrics-tracking-poc
**Status**: Implemented (97/123 tasks completed - 79%)

**Note**: This task list documents the original PoC implementation. The 3-action architecture (collect-metrics, generate-report, find-database) has been superseded by the unified `track-metrics` action in spec 003. Core platform tasks (configuration, storage, reporting) remain relevant as foundational infrastructure.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- Single project at repository root: `src/`, `tests/`
- GitHub Actions: `.github/actions/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependencies

- [x] T001 Install dependencies: zod, @actions/core, @actions/github, yargs, @types/yargs
- [x] T002 [P] Create directory structure: src/config/, src/storage/, src/storage/providers/, src/storage/adapters/, src/collector/, src/reporter/, src/actions/, src/cli/, src/cli/cmd/
- [x] T003 [P] Create directory structure: tests/unit/config/, tests/unit/storage/, tests/unit/storage/providers/, tests/unit/storage/adapters/, tests/unit/collector/, tests/unit/reporter/, tests/unit/cli/
- [x] T004 [P] Create directory structure: tests/integration/, tests/contract/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Storage Architecture (Three-Layer Separation)

**Architecture**: The storage layer implements a three-layer separation of concerns:

1. **StorageProvider** (`providers/`): Manages database lifecycle and storage location (WHERE to store)
   - Handles initialization, persistence, and cleanup
   - Types: 'sqlite-local', 'sqlite-s3', 'postgres'
   
2. **DatabaseAdapter** (`adapters/`): Abstracts database query execution (WHAT queries to run)
   - Provides query methods independent of storage location
   - SQLite adapter provides SQL-based operations
   - Future: PostgreSQL adapter for different database engine
   
3. **MetricsRepository** (`repository.ts`): Exposes domain-specific operations (WHY - business logic)
   - Business operations: `recordBuild()`, `getMetricComparison()`, `getMetricHistory()`
   - Uses adapter internally
   - Clean API for application code
   
4. **Storage** (`storage.ts`): Orchestration layer
   - Coordinates provider, adapter, and repository
   - Provides unified API to rest of application

This separation enables:
- Future database engines (PostgreSQL) via new adapters
- Alternative storage locations (S3, Artifacts) via new providers
- Clean business logic without coupling to SQL or storage details
- Independent testing of each layer

- [x] T005 Create TypeScript types for storage entities in src/storage/types.ts
- [x] T006 Define StorageProvider interface in src/storage/providers/interface.ts
  - Define StorageProvider interface (initialize, persist, cleanup, isInitialized)
  - Define StorageProviderConfig type with types: 'sqlite-local', 'sqlite-s3', 'postgres'
  - Add config fields: path (sqlite-local), s3Bucket/s3Key (sqlite-s3), connectionString (postgres)
  
- [x] T007 Implement SqliteLocalStorageProvider in src/storage/providers/sqlite-local.ts
  - initialize(): Opens SQLite database at config.path using `new Database(path, options)`
  - persist(): No-op for local storage (writes are immediate to disk)
  - cleanup(): Closes database via db.close()
  
- [x] T007b Implement SqliteS3StorageProvider in src/storage/providers/sqlite-s3.ts
  - initialize(): Downloads database from S3, opens locally
  - persist(): Uploads modified database back to S3
  - cleanup(): Closes database, cleans up temp file
  
- [x] T008 Create provider factory in src/storage/providers/factory.ts
  - createStorageProvider(config: StorageProviderConfig): Promise<StorageProvider>
  - Handles 'sqlite-local' and 'sqlite-s3' types
  - Throws error for unsupported types with clear message
  
- [x] T008b Define DatabaseAdapter interface in src/storage/adapters/interface.ts
  - Define query methods: insertBuildContext, upsertMetricDefinition, insertMetricValue
  - Define query methods: getMetricTimeSeries, getAllMetricDefinitions, getBuildContext, etc.
  - Database-agnostic interface
  
- [x] T008c Implement SqliteDatabaseAdapter in src/storage/adapters/sqlite.ts
  - Implements DatabaseAdapter interface
  - Uses db.query() to create prepared statements
  - SQLite-specific SQL queries
  
- [x] T009 Implement MetricsRepository in src/storage/repository.ts
  - Domain operations: recordBuild(), getMetricComparison(), getMetricHistory()
  - Uses DatabaseAdapter internally
  - Clean business API (no SQL exposed)
  - Exposes `repository.queries` accessor for test assertions
  
- [x] T009b Implement Storage orchestrator in src/storage/storage.ts
  - Uses StorageProvider to manage database lifecycle
  - Uses DatabaseAdapter for queries
  - Uses MetricsRepository for domain operations
  - configureConnection() uses db.run("PRAGMA ...") for SQLite configuration
  - Methods: initialize(), close(), getRepository(), transaction()
  
- [x] T010 Implement storage schema initialization in src/storage/migrations.ts
  - Uses Database.exec() for schema creation
  - Tables: metric_definitions, build_contexts, metric_values, schema_version
  - Proper indexes and foreign keys

### Tests for Storage Layer

- [x] T012 [P] Write unit tests for SqliteLocalStorageProvider in tests/unit/storage/providers/sqlite-local.test.ts
- [x] T012b [P] Write unit tests for SqliteS3StorageProvider in tests/unit/storage/providers/sqlite-s3.test.ts
- [x] T013 [P] Write unit tests for provider factory in tests/unit/storage/providers/factory.test.ts
- [x] T013b [P] Write unit tests for SqliteDatabaseAdapter in tests/unit/storage/adapters/sqlite.test.ts
- [x] T014 [P] Write unit tests for MetricsRepository in tests/unit/storage/repository.test.ts
- [x] T015 [P] Write unit tests for Storage orchestrator in tests/unit/storage/storage.test.ts
- [x] T016 [P] Write unit tests for schema initialization in tests/unit/storage/migrations.test.ts

**Checkpoint**: Storage layer ready with three-layer architecture - user story implementation can now begin

---

## Phase 3: User Story 1.5 - Validate Configuration via CLI (Priority: P1.5)

**Goal**: Users can validate their unentropy.json configuration file locally before committing it, so they can catch configuration errors early and avoid CI pipeline failures

**Independent Test**: Run the CLI verify command against various configuration files (valid, invalid, malformed) and verify appropriate success/error responses, delivering value by providing immediate feedback on configuration correctness

### Tests for User Story 1.5

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T017.5 [P] [US1.5] Write unit test for CLI verify command with default config in tests/unit/cli/verify.test.ts
- [ ] T018.5 [P] [US1.5] Write unit test for CLI verify command with custom config path in tests/unit/cli/verify.test.ts
- [ ] T019.5 [P] [US1.5] Write unit test for CLI verify success exit code (0) in tests/unit/cli/verify.test.ts
- [ ] T020.5 [P] [US1.5] Write unit test for CLI verify error exit code (1) in tests/unit/cli/verify.test.ts
- [ ] T021.5 [P] [US1.5] Write unit test for CLI verify error message formatting in tests/unit/cli/verify.test.ts
- [ ] T022.5 [P] [US1.5] Write unit test for CLI verify file not found handling in tests/unit/cli/verify.test.ts

### Implementation for User Story 1.5

- [x] T023.5 [US1.5] Implement CLI command builder in src/cli/cmd/cmd.ts
- [x] T024.5 [US1.5] Implement CLI verify command in src/cli/cmd/verify.ts
- [x] T025.5 [US1.5] Implement CLI entrypoint in src/index.ts

**Checkpoint**: Users can validate configurations locally with clear feedback ✅

---

**Key Design Decisions**:
- ✓ Three-layer separation: Provider (WHERE), Adapter (WHAT), Repository (WHY)
- ✓ Provider manages database lifecycle and location
- ✓ Adapter abstracts query execution (enables future PostgreSQL support)
- ✓ Repository exposes clean domain API (recordBuild, getMetricComparison)
- ✓ Storage orchestrates all three layers
- ✓ Type naming: 'sqlite-local', 'sqlite-s3', 'postgres'
- ✓ Repository exposes `queries` accessor for test assertions

---

## Phase 4: User Story 1 - Define Custom Metrics via Configuration (Priority: P1) 🎯 MVP

**Goal**: Users can define what code metrics they want to track through an `unentropy.json` configuration file, with validation that provides clear error messages

**Independent Test**: Create a configuration file with metric definitions and verify the system correctly reads and validates it, rejecting invalid configurations with actionable error messages

### Tests for User Story 1

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T017 [P] [US1] Write unit test for valid config parsing in tests/unit/config/loader.test.ts
- [x] T018 [P] [US1] Write unit test for invalid metric names in tests/unit/config/schema.test.ts
- [x] T019 [P] [US1] Write unit test for duplicate metric names in tests/unit/config/schema.test.ts
- [x] T020 [P] [US1] Write unit test for type mismatches in tests/unit/config/schema.test.ts
- [x] T021 [P] [US1] Write unit test for empty/missing required fields in tests/unit/config/schema.test.ts
- [x] T022 [P] [US1] Write unit test for clear error messages in tests/unit/config/schema.test.ts

### Implementation for User Story 1

- [x] T023 [US1] Define Zod schemas in src/config/schema.ts (MetricConfigSchema, UnentropyConfigSchema)
- [x] T024 [US1] Export inferred TypeScript types in src/config/schema.ts
- [x] T025 [US1] Implement config file loader with validation in src/config/loader.ts
- [x] T026 [US1] Implement custom error formatter for validation errors in src/config/loader.ts

**Checkpoint**: Users can create unentropy.json with metrics and get validation feedback ✅

---

## Phase 5: User Story 2 - Collect Metrics in CI/CD Pipeline (Priority: P2)

**Goal**: CI/CD pipeline automatically collects defined metrics, stores them with timestamps and build metadata, handling partial failures gracefully

**Independent Test**: Run the data collection action in a CI environment with predefined metrics, verify data is captured and stored correctly with commit SHA, timestamps, and build context

### Tests for User Story 2

- [x] T027 [P] [US2] Write unit test for build context extraction in tests/unit/collector/context.test.ts
- [x] T028 [P] [US2] Write unit test for command execution in tests/unit/collector/runner.test.ts
- [x] T029 [P] [US2] Write unit test for command timeout handling in tests/unit/collector/runner.test.ts
- [x] T030 [P] [US2] Write unit test for environment variable passing in tests/unit/collector/runner.test.ts
- [x] T031 [P] [US2] Write unit test for numeric value parsing in tests/unit/collector/collector.test.ts
- [x] T032 [P] [US2] Write unit test for label value parsing in tests/unit/collector/collector.test.ts
- [x] T033 [P] [US2] Write unit test for partial failure handling in tests/unit/collector/collector.test.ts
- [x] T034 [US2] Write integration test for end-to-end collection workflow in tests/integration/collection.test.ts

### Implementation for User Story 2

- [x] T035 [P] [US2] Implement build context extraction in src/collector/context.ts
- [x] T036 [P] [US2] Implement command execution with timeout using Bun.spawn() in src/collector/runner.ts
- [x] T037 [US2] Implement metric value parser (numeric/label) in src/collector/collector.ts
- [x] T038 [US2] Implement main collection orchestration with retry logic in src/collector/collector.ts
- [x] T039 [US2] Implement error handling for partial metric failures in src/collector/collector.ts

**Checkpoint**: Metrics are collected and stored in SQLite storage with build metadata

---

## Phase 6: User Story 3 - View Metric Trends in HTML Reports (Priority: P3)

**Goal**: Generate self-contained HTML reports showing metric trends over time with visual charts, viewable in any browser without external dependencies

**Independent Test**: Generate an HTML report from stored metric data, verify charts and trends display correctly in a browser, report works offline

**Independent Test**: Generate an HTML report from stored metric data, verify charts and trends display correctly in a browser, report works offline

### Tests for User Story 3

- [x] T040 [P] [US3] Write unit test for time-series data query in tests/unit/reporter/generator.test.ts
- [x] T041 [P] [US3] Write unit test for Chart.js config builder (numeric) in tests/unit/reporter/charts.test.ts
- [x] T042 [P] [US3] Write unit test for Chart.js config builder (label) in tests/unit/reporter/charts.test.ts
- [x] T043 [P] [US3] Write unit test for HTML template rendering in tests/unit/reporter/templates.test.ts
- [x] T044 [P] [US3] Write unit test for self-contained output validation in tests/unit/reporter/templates.test.ts
- [x] T045 [P] [US3] Write unit test for empty data handling in tests/unit/reporter/generator.test.ts
- [x] T046 [P] [US3] Write unit test for sparse data handling in tests/unit/reporter/generator.test.ts
- [x] T047 [US3] Write integration test for report generation workflow in tests/integration/reporting.test.ts
- [x] T048 [US3] Write unit test for XSS sanitization in metric names/descriptions in tests/unit/reporter/templates.test.ts
- [x] T049 [US3] Write unit test for summary statistics calculation (min/max/avg/trend) in tests/unit/reporter/generator.test.ts
- [x] T050 [US3] Write unit test for responsive breakpoint data attributes in tests/unit/reporter/templates.test.ts

### Implementation for User Story 3

- [x] T051 [P] [US3] Implement time-series query methods in DatabaseAdapter (src/storage/adapters/sqlite.ts)
- [x] T052 [US3] Implement getAllBuildContexts query in DatabaseAdapter (for report metadata)
- [x] T053 [P] [US3] Implement Chart.js configuration builder in src/reporter/charts.ts
- [x] T054 [US3] Implement HTML template with Tailwind CSS and embedded Chart.js in src/reporter/templates.ts
- [x] T055 [US3] Implement report generator orchestration in src/reporter/generator.ts
- [x] T056 [US3] Add error handling for missing/invalid data in src/reporter/generator.ts
- [x] T057 [US3] Implement XSS sanitization for user-provided content in src/reporter/templates.ts
- [x] T058 [US3] Implement summary statistics calculator (min/max/avg/trend) in src/reporter/generator.ts
- [x] T059 [US3] Add responsive layout with Tailwind classes (mobile/tablet/desktop) in src/reporter/templates.ts
- [x] T060 [US3] Add dark mode support using Tailwind dark: variants in src/reporter/templates.ts
- [x] T061 [US3] Add print stylesheet for PDF export in src/reporter/templates.ts
- [x] T062 [US3] Add accessibility features (ARIA labels, semantic HTML) in src/reporter/templates.ts

### Visual Acceptance Testing for User Story 3

**Purpose**: Manual quality assurance for HTML template design, usability, and accessibility

- [x] T063 [US3] Create test fixture: minimal data (unentropy.json + 5 data points) in tests/fixtures/visual-review/minimal/
- [x] T064 [US3] Create test fixture: full-featured (4 metrics + 100 data points) in tests/fixtures/visual-review/full-featured/
- [x] T065 [US3] Create test fixture: sparse data (2 metrics + 3 data points) in tests/fixtures/visual-review/sparse-data/
- [x] T066 [US3] Create test fixture: edge cases (special chars, extreme values) in tests/fixtures/visual-review/edge-cases/
- [x] T067 [US3] Implement fixture generation script (generate-fixture command) in scripts/generate-fixture.ts
- [x] T068 [US3] Generate HTML reports from all 4 test fixtures
- [x] T069 [US3] Manual visual review: Complete all checklist items from contracts/visual-acceptance-criteria.md
- [x] T070 [US3] Document review findings and capture screenshots for documentation

**Checkpoint**: HTML reports can be generated from collected data and viewed in browser

---

## Phase 7: User Story 4 - Unentropy Self-Monitoring (Priority: P4)

**Goal**: Implement self-monitoring for Unentropy project to track test coverage and lines of code, serving as both demonstration and genuine project health monitoring

**Independent Test**: Implement the self-monitoring configuration in the Unentropy repository itself, verify metric collection works in CI, and generate reports showing actual project trends

### Testing Strategy for User Story 4

**Note**: Traditional unit/integration tests are not included for User Story 4 as they would be fragile and redundant. The self-monitoring workflow will be tested automatically through CI/CD execution:

**How User Story 4 Will Be Tested**:
1. **Configuration Validation**: The existing configuration validation tests (T012-T017) will validate the self-monitoring unentropy.json when CI runs
2. **Metric Collection**: CI workflow will execute the actual collection commands and verify they return valid numeric values
3. **Storage Persistence**: Existing storage tests (T009-T011) ensure data persistence works correctly
4. **Report Generation**: Existing report tests (T036-T048) validate HTML generation from the collected data
5. **End-to-End Validation**: Each CI run will demonstrate the complete workflow working with real project data
6. **Visual Verification**: Generated reports will be available as CI artifacts for manual review

**Benefits of This Approach**:
- Tests real-world execution environment (GitHub Actions runners)
- Validates actual commands against real codebase
- No mock data - uses genuine project metrics
- Continuous validation with every commit
- Demonstrates Unentropy capabilities authentically

### Implementation for User Story 4

- [x] T071 [P] [US4] Create unentropy.json configuration in repository root with test coverage and LoC metrics
- [x] T072 [US4] Implement test coverage collection command in unentropy.json
- [x] T073 [US4] Implement lines of code collection command in unentropy.json
- [x] T074 [US4] Create .github/workflows/metrics.yml to include metric collection step
- [x] T075 [US4] Add storage artifact persistence to CI workflow
- [x] T076 [US4] Add report generation step to CI workflow
- [x] T077 [US4] Configure report artifact upload or PR comment integration
- [x] T078 [US4] Add workflow triggers for self-monitoring (on push, pull_request)
- [x] T079 [US4] Add documentation for self-monitoring setup in README.md
- [x] T080 [US4] Validate self-monitoring configuration works with existing test suite
- [x] T081 [US4] Test report generation with actual project data
- [x] T082 [US4] Ensure self-monitoring demonstrates Unentropy capabilities effectively

**Checkpoint**: Self-monitoring implementation complete and serving as live example

---

## Phase 8: GitHub Actions Integration

**Purpose**: Package functionality as GitHub Actions for easy CI/CD integration

### Tests for GitHub Actions

- [x] T083 [P] Write contract test for collect-metrics action inputs in tests/contract/collect-action.test.ts
- [x] T084 [P] Write contract test for collect-metrics action outputs in tests/contract/collect-action.test.ts
- [x] T085 [P] Write contract test for generate-report action inputs in tests/contract/report-action.test.ts
- [x] T086 [P] Write contract test for generate-report action outputs in tests/contract/report-action.test.ts
- [ ] T087 [P] Write integration test for artifact upload/download in tests/integration/artifacts.test.ts

### GitHub Action: collect-metrics

- [x] T088 Create action metadata file .github/actions/collect-metrics/action.yml
- [x] T089 Implement action entrypoint with metric collection in src/actions/collect.ts
- [x] T090 Add input validation and error handling in src/actions/collect.ts
- [x] T091 Add output setting (metrics-collected, metrics-failed, storage-path, build-id) in src/actions/collect.ts
- [x] T092 Create build script for action distribution in package.json

### GitHub Action: generate-report

- [x] T093 Create action metadata file .github/actions/generate-report/action.yml
- [x] T094 Implement action entrypoint with report generation in src/actions/report.ts
- [x] T095 Add time-range filtering logic in src/actions/report.ts
- [x] T096 Add output setting (report-path, metrics-count, data-points, time-range-start, time-range-end) in src/actions/report.ts
- [x] T097 Create build script for action distribution in package.json

**Checkpoint**: Both GitHub Actions are functional (collect-metrics, generate-report).

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T098 [P] Add comprehensive logging throughout all modules
- [x] T099 [P] Optimize storage queries with proper indexes
- [ ] T100 [P] Add storage VACUUM operation for maintenance
- [ ] T101 [P] Add SRI hashes to CDN resources in HTML template
- [ ] T102 [P] Create example unentropy.json configurations
- [ ] T103 [P] Create example GitHub Actions workflows
- [x] T104 Update main exports in src/index.ts
- [x] T105 Run bun run lint and fix any issues
- [x] T106 Run bun run typecheck and fix any issues
- [x] T107 Run bun test and ensure all tests pass
- [x] T108 Run bun run build and verify output
- [ ] T109 Validate against quickstart.md acceptance criteria

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
  - **Critical**: Three-layer storage architecture must be implemented correctly
  - Provider manages database lifecycle and location
  - Adapter abstracts query execution
  - Repository provides domain operations
  - Storage orchestrates all three layers
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P1.5 → P2 → P3)
- **User Story 4 (Phase 7)**: Depends on User Stories 1, 1.5, 2, and 3 being complete
- **GitHub Actions (Phase 8)**: Depends on User Stories 2 and 3 being complete
  - collect-metrics action: Depends on User Stories 1, 1.5, 2 (config + CLI verification + collection)
  - generate-report action: Depends on User Story 3 (reporting)
- **Polish (Phase 9)**: Depends on all phases being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 1.5 (P1.5)**: Can start after Foundational (Phase 2) + User Story 1 complete (needs config loading)
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) + User Story 1.5 complete (needs CLI verification)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) + User Story 2 complete (needs data collection)
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) + User Stories 1, 1.5, 2, and 3 complete (needs complete workflow)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Core types before implementation
- Implementation in order: data layer → business logic → integration
- Story complete before moving to next priority

### Parallel Opportunities

#### Phase 3 (CLI Verification - Tests)
- T017.5, T018.5, T019.5, T020.5, T021.5, T022.5 can run in parallel (different test scenarios)

#### Phase 8 (GitHub Actions - Tests)
- T049, T050, T051, T052, T053 can run in parallel (different test files)

#### Phase 9 (Polish)
- T064, T065, T066, T067, T068, T069 can all run in parallel (different concerns)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Write unit test for valid config parsing in tests/unit/config/loader.test.ts"
Task: "Write unit test for invalid metric names in tests/unit/config/schema.test.ts"
Task: "Write unit test for duplicate metric names in tests/unit/config/schema.test.ts"
Task: "Write unit test for type mismatches in tests/unit/config/schema.test.ts"
Task: "Write unit test for empty/missing required fields in tests/unit/config/schema.test.ts"
Task: "Write unit test for clear error messages in tests/unit/config/schema.test.ts"
```

## Parallel Example: GitHub Actions Workflow

```bash
# Launch all GitHub Actions tests together:
Task: "Write contract test for collect-metrics action inputs in tests/contract/collect-action.test.ts"
Task: "Write contract test for collect-metrics action outputs in tests/contract/collect-action.test.ts"
Task: "Write contract test for generate-report action inputs in tests/contract/report-action.test.ts"
Task: "Write contract test for generate-report action outputs in tests/contract/report-action.test.ts"
Task: "Write integration test for artifact upload/download in tests/integration/artifacts.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 1.5 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. Complete Phase 4: User Story 1.5
5. **STOP and VALIDATE**: Test User Stories 1 and 1.5 independently
6. Review and refine before continuing

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (T001-T011)
2. Add User Story 1 → Test independently → Validate config system (T012-T021)
3. Add User Story 1.5 → Test independently → Validate CLI verification (T017.5-T026.5)
4. Add User Story 2 → Test independently → Validate collection (T022-T035)
5. Add User Story 3 → Test independently → Validate reporting (T036-T048)
6. Add User Story 4 → Implement self-monitoring → Validate via CI/CD (T075-T086)
7. Add GitHub Actions → Integrate with CI/CD (T049-T063)
8. Polish and optimize → Production ready (T064-T075)

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T011)
2. Once Foundational is done:
   - Developer A: User Story 1 (T012-T021)
   - Developer B: User Story 1.5 (T017.5-T026.5) - Can run in parallel with US1
   - After US1: Developer A continues to User Story 2 (T022-T035)
   - After US1.5: Developer B continues to User Story 3 (T036-T048)
3. Once User Stories complete:
   - Developer B: User Story 4 (T075-T086)
   - Developer A: GitHub Actions (T049-T063)
4. Once US4 and Actions complete:
   - Developer A: Polish (T064-T075)

**Note**: This feature has sequential dependencies (US2 needs US1, US3 needs US2), so parallel team strategy is limited. Best approach is sequential with occasional parallel opportunities on tests and independent modules.

---

## Task Summary

- **Total Tasks**: 116
- **Phase 1 (Setup)**: 4 tasks
- **Phase 2 (Foundational - Three-Layer Architecture)**: 23 tasks (13 implementation + 7 tests + 3 additional layers) **← BLOCKING**
- **Phase 3 (User Story 1)**: 10 tasks (6 tests + 4 implementation)
- **Phase 4 (User Story 2)**: 13 tasks (8 tests + 5 implementation)
- **Phase 5 (User Story 3)**: 31 tasks (11 tests + 12 implementation + 8 visual acceptance)
- **Phase 6 (User Story 4)**: 12 tasks (0 tests + 12 implementation) - Tested via CI/CD execution
- **Phase 7 (GitHub Actions)**: 15 tasks (5 tests + 10 implementation)
- **Phase 8 (Polish)**: 12 tasks

### Current Status: 96/116 tasks completed (83%)

### Storage Architecture (Phase 2)

**Key Changes - Three-Layer Separation**:
- ✓ **StorageProvider** (`providers/`): Manages database lifecycle and location (WHERE to store)
- ✓ **DatabaseAdapter** (`adapters/`): Abstracts query execution (WHAT queries to run)
- ✓ **MetricsRepository** (`repository.ts`): Provides domain operations (WHY - business logic)
- ✓ **Storage** (`storage.ts`): Orchestrates provider, adapter, and repository
- ✓ Type naming: 'sqlite-local', 'sqlite-s3', 'postgres'
- ✓ Clean separation enables future PostgreSQL support
- ✓ Repository exposes `queries` accessor for test assertions

### Parallel Opportunities

- **16 parallel opportunities** in tests across all user stories
- **12 parallel opportunities** in implementation across different modules  
- **6 parallel opportunities** in polish phase

### MVP Scope (Recommended)

**Minimum Viable Product** = Phase 1 + Phase 2 + Phase 3 (User Story 1 only)

This delivers:
- ✓ Three-layer storage architecture (provider + adapter + repository)
- ✓ Configuration file support
- ✓ Metric definition and validation
- ✓ Clear error messages
- ✓ Foundation for metrics system
- ✗ Collection (Phase 4)
- ✗ Reporting (Phase 5)
- ✗ GitHub Actions (Phase 7)

**Realistic MVP** = Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5 + Phase 6 + Phase 7

This delivers complete end-to-end functionality:
- ✓ Three-layer storage architecture (extensible for PostgreSQL)
- ✓ Configuration system
- ✓ Metric collection in CI/CD
- ✓ HTML report generation
- ✓ Self-monitoring demonstration
- ✓ GitHub Actions integration
- ✓ All user stories functional

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently testable at its checkpoint
- Verify tests fail before implementing (TDD approach)
- Run lint/typecheck frequently during development
- Commit after each logical group of tasks
- Stop at any checkpoint to validate story independently
- Storage Provider Pattern is foundational and blocks all stories
- User stories have sequential dependencies in this feature
- User Story 4 (self-monitoring) serves as both demonstration and genuine project monitoring

## Three-Layer Storage Architecture - Key Principles

**Design Philosophy**:
- **Provider** abstracts WHERE database is stored (location/access method)
- **Drizzle ORM** provides type-safe queries (replacing raw SQL adapters)
- **Repository** abstracts WHY (domain operations like recordBuild)
- **Storage** orchestrates all three layers
- Type naming convention: `<database-engine>-<storage-location>`

**Current Implementation**:
- Providers: 'sqlite-local' (local file), 'sqlite-s3' (S3-compatible storage)
- Query Layer: Drizzle ORM with bun-sqlite dialect
- Repository: MetricsRepository (domain operations using Drizzle)
- Storage: Coordinates provider + Drizzle + repository

**Future Extensibility**:
- PostgreSQL support via Drizzle dialect change
- New providers: 'postgres' (remote database connection)
- Repository stays the same (clean domain API)

**Benefits**:
- Type-safe queries with compile-time checking
- Schema as single source of truth
- Future PostgreSQL support via dialect change
- Easy to test (mock each layer independently)
- Repository API never changes when adding new databases

---

## Phase 10: Drizzle ORM Migration (Active Enhancement)

**Purpose**: Replace raw SQL queries with type-safe Drizzle ORM while maintaining backward compatibility

**Goal**: Improve maintainability and enable future PostgreSQL support through Drizzle's dialect abstraction

**Architecture Change**:
```
Before: Storage → Provider → DatabaseAdapter (raw SQL) → bun:sqlite
After:  Storage → Provider → Drizzle ORM → bun:sqlite
```

### Phase 10.1: Preparation & Test Coverage

- [x] T110 [P] Create integration tests for storage query contracts in tests/integration/storage-queries.test.ts
  - Tests verify column names (snake_case), NULL handling, query results
  - 28 tests covering all repository methods
  - Critical for ensuring migration doesn't break existing behavior

### Phase 10.2: Drizzle Schema & Setup

- [x] T111 Install drizzle-orm and drizzle-kit dependencies
- [x] T112 Create Drizzle schema in src/storage/schema.ts
  - Define metricDefinitions table with columns: id, type, unit, description
  - Define buildContexts table with columns and indexes
  - Define metricValues table with foreign keys and indexes
  - Schema must produce identical SQL to existing raw SQL schema
- [x] T113 Add Drizzle type exports in src/storage/types.ts
  - Export InferSelectModel and InferInsertModel types from schema
  - Ensure backward compatibility with existing type names

### Phase 10.3: Repository Migration

- [x] T114 Update Storage class to initialize Drizzle in src/storage/storage.ts
  - Wrap bun:sqlite Database with drizzle({ client: db })
  - Pass Drizzle instance to MetricsRepository
- [x] T115 Migrate MetricsRepository.recordBuild() to Drizzle in src/storage/repository.ts
  - Use db.insert().values().returning() for build context
  - Use db.insert().onConflictDoUpdate() for metric definitions
  - Use db.insert().values() for metric values
- [x] T116 Migrate MetricsRepository.getMetricTimeSeries() to Drizzle
  - Use db.select().from().innerJoin().where().orderBy()
  - Ensure column aliases match existing output (build_timestamp)
- [x] T117 Migrate MetricsRepository.getBaselineMetricValue() to Drizzle
  - Use sql template literal for datetime() function
  - Ensure NULL filtering works correctly
- [x] T118 Migrate remaining repository methods to Drizzle
  - getAllMetricDefinitions, getAllBuildContexts, getAllMetricValues
  - getMetricValuesByBuildId, getMetricDefinition

### Phase 10.4: Cleanup & Verification

- [x] T119 Remove DatabaseAdapter interface and SqliteDatabaseAdapter
  - Delete src/storage/adapters/interface.ts
  - Delete src/storage/adapters/sqlite.ts
  - Update imports throughout codebase
- [x] T120 Run all tests and verify no regressions
  - bun test (all 522 tests pass)
  - bun check (lint, typecheck, format)
- [x] T121 Update documentation
  - Update spec files to reflect Drizzle architecture (completed)
  - Update code comments if needed

### Phase 10.5: Future Considerations (Out of Scope)

- [ ] T122 [Future] Evaluate Drizzle Kit for migration management
- [ ] T123 [Future] Add PostgreSQL support via Drizzle dialect

**Checkpoint**: Storage layer uses Drizzle ORM with full type safety, all tests pass

---

## Task Summary Update

- **Total Tasks**: 123 (was 116)
- **Phase 10 (Drizzle Migration)**: 14 tasks (1 completed, 10 implementation, 3 future)

### Drizzle Migration Status: 11/11 tasks completed (100%)

**Completed**:
- [x] T110: Integration tests for storage query contracts (28 tests)

**Next Steps**:
1. T111: Install drizzle-orm dependency
2. T112: Create Drizzle schema
3. T114-T118: Migrate repository methods one-by-one
4. T119-T121: Cleanup and verification

