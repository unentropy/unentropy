## 1. Setup

- [x] 1.1 [P] Add `micromatch` as a direct dependency in `package.json`

## 2. Foundational

- [x] 2.1 [P] Add `SourcesConfigSchema` to `src/config/schema.ts`
- [x] 2.2 [P] Add `sources` field to `UnentropyConfigSchema`
- [x] 2.3 [P] Add `sources` normalization (bare directory auto-expansion) to `src/config/loader.ts`
- [x] 2.4 [P] Add `sources` to `ResolvedUnentropyConfig` in `src/config/loader.ts`
- [x] 2.5 [P] Create `src/metrics/collectors/sources-filter.ts` with `matchesSources` utility
- [x] 2.6 [P] Add schema validation tests for `sources` in `tests/unit/config/schema.test.ts`
- [x] 2.7 [P] Add loader normalization tests for `sources` in `tests/unit/config/loader.test.ts`
- [x] 2.8 [P] Add unit tests for `matchesSources` in `tests/unit/metrics/collectors/sources-filter.test.ts`

**Checkpoint**: Config schema and shared filtering utility are complete and tested

---

## 3. User Story 1 - Loc and Size Collectors Respect Sources (Priority: P1)

**Goal**: `loc` and `size` collectors use `sources` when no explicit paths are provided; explicit paths override `sources`.

### Tests

- [x] 3.1 [P] [US1] Add `collect-runner` tests for `loc` with sources (no path arg)
- [x] 3.2 [P] [US1] Add `collect-runner` tests for `loc` explicit path ignoring sources
- [x] 3.3 [P] [US1] Add `collect-runner` tests for `size` with sources (no path arg)
- [x] 3.4 [P] [US1] Add `collect-runner` tests for `size` explicit path ignoring sources
- [x] 3.5 [P] [US1] Add `loc` collector tests for `paths` option with `fast-glob`
- [x] 3.6 [P] [US1] Add `size` collector tests for `collectSize` function

### Implementation

- [x] 3.7 [US1] Update `src/collector/collect-runner.ts`: accept `sources`, make `loc`/`size` paths optional, inject sources when absent
- [x] 3.8 [US1] Update `src/collector/runner.ts`: accept and forward `sources`
- [x] 3.9 [US1] Update `src/collector/collector.ts`: accept `sources`, forward to `runCommand`
- [x] 3.10 [US1] Update `src/metrics/collectors/loc.ts`: add `paths` option, use `fast-glob` when `paths` provided
- [x] 3.11 [US1] Update `src/metrics/collectors/size.ts`: add `collectSize(paths, options)` function
- [x] 3.12 [US1] Update `src/cli/cmd/collect.ts`: make `loc` path and `size` paths optional
- [x] 3.13 [US1] Update `src/cli/cmd/test.ts`: pass `config.sources` to `runCommand`
- [x] 3.14 [US1] Update `src/actions/track-metrics.ts`: pass `config.sources` to `collectMetrics`
- [x] 3.15 [US1] Update `src/actions/quality-gate.ts`: pass `config.sources` to `collectMetrics`

**Checkpoint**: `loc` and `size` collectors fully support sources; all tests pass

---

## 4. User Story 2 - LCOV Coverage Filtering (Priority: P1)

**Goal**: `coverage-lcov` filters parsed source files through `sources` before computing coverage.

### Tests

- [x] 4.1 [P] [US2] Add LCOV collector tests for sources filtering (include only matching files)
- [x] 4.2 [P] [US2] Add LCOV collector tests for sources filtering with negation
- [x] 4.3 [P] [US2] Add LCOV collector tests when all files are excluded (returns 0)

### Implementation

- [x] 4.4 [US2] Update `src/metrics/collectors/lcov.ts`: accept `sources`, filter records before `generateSummary`
- [x] 4.5 [US2] Update `src/collector/collect-runner.ts`: pass `sources` to `parseLcovCoverage`

**Checkpoint**: LCOV coverage respects sources; tests pass

---

## 5. User Story 3 - Cobertura Coverage Filtering (Priority: P2)

**Goal**: `coverage-cobertura` filters classes by filename and recalculates coverage from file-level data.

### Tests

- [x] 5.1 [P] [US3] Add Cobertura single-file tests for line coverage with sources filtering
- [x] 5.2 [P] [US3] Add Cobertura single-file tests for branch coverage with sources filtering
- [x] 5.3 [P] [US3] Add Cobertura single-file tests for function coverage with sources filtering
- [x] 5.4 [P] [US3] Add Cobertura merge tests for line coverage with sources filtering
- [x] 5.5 [P] [US3] Add Cobertura merge tests for branch coverage with sources filtering
- [x] 5.6 [P] [US3] Add Cobertura merge tests for function coverage with sources filtering

### Implementation

- [x] 5.7 [US3] Refactor `src/metrics/collectors/cobertura.ts`:
  - `parseCoberturaCoerage`: accept `sources`, compute line/branch/function from filtered class data
  - `mergeCoberturaCoerage`: accept `sources`, filter `fileMap` and method lists before computing
- [x] 5.8 [US3] Update `src/collector/collect-runner.ts`: pass `sources` to cobertura functions

**Checkpoint**: Cobertura coverage respects sources for all coverage types; tests pass

---

## 6. User Story 4 - Clover Coverage Filtering (Priority: P2)

**Goal**: `coverage-clover` filters files by name and recalculates coverage from file-level data.

### Tests

- [x] 6.1 [P] [US4] Add Clover single-file tests for line coverage with sources filtering
- [x] 6.2 [P] [US4] Add Clover single-file tests for branch coverage with sources filtering
- [x] 6.3 [P] [US4] Add Clover single-file tests for function coverage with sources filtering
- [x] 6.4 [P] [US4] Add Clover merge tests for line coverage with sources filtering
- [x] 6.5 [P] [US4] Add Clover merge tests for branch/function coverage with sources filtering

### Implementation

- [x] 6.6 [US4] Refactor `src/metrics/collectors/clover.ts`:
  - `parseCloverCoverage`: accept `sources`, compute from filtered file-level data
  - `mergeCloverCoverage`: accept `sources`, filter `fileMap` and per-file metrics before computing
- [x] 6.7 [US4] Update `src/collector/collect-runner.ts`: pass `sources` to clover functions

**Checkpoint**: Clover coverage respects sources for all coverage types; tests pass

---

## 7. Polish & Cross-Cutting Concerns

- [x] 7.1 [P] Update `unentropy.json` with `sources` example configuration
- [x] 7.2 [P] Update test files that cast `ResolvedUnentropyConfig` to include `sources`
- [x] 7.3 [P] Run `bun check` and fix any lint/type/format issues
- [x] 7.4 [P] Run `bun test` and ensure all tests pass
- [x] 7.5 [P] Update `openspec/specs/metrics/contracts/config-schema.md` with `sources` field
- [x] 7.6 [P] Update `openspec/specs/metrics/contracts/built-in-metrics.md` with sources behavior
