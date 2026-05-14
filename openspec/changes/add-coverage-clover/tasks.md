## 1. Setup

- [x] 1.1 [P] Create Clover XML fixture files in `tests/fixtures/clover/`:
  - `sample.xml` — standard PHPUnit Clover output with partial coverage
  - `full-coverage.xml` — 100% statements, methods, and conditionals
  - `minimal.xml` — minimal valid Clover XML with just project-level metrics
  - `malformed.xml` — invalid XML for error handling
  - `parallel-report.xml` — non-overlapping Clover report (different file names)
  - `overlap-report.xml` — overlapping Clover report (same file name, partial coverage)

## 2. Foundational

- [x] 2.1 [P] Implement `src/metrics/collectors/clover.ts` with:
  - TypeScript interfaces for Clover XML structure (`CloverReport`, `CloverProject`, `CloverFile`, `CloverMetrics`)
  - `readAndParseCloverXml(sourcePath)` — read and validate Clover XML
  - `extractMetrics(report, sourcePath)` — extract `<project>/<metrics>` attributes
  - `parseCloverCoverage(sourcePath, options?)` — single-file coverage calculation
  - `mergeCloverCoverage(sourcePaths[], options?)` — multi-file merge by summing counts
  - Coverage type dispatch: line → `statements`/`coveredstatements`, function → `methods`/`coveredmethods`, branch → `conditionals`/`coveredconditionals`

**Checkpoint**: `bun test --testNamePattern="clover"` passes for single-file parsing

---

## 3. User Story 1 — CLI and @collect integration (Priority: P1)

**Goal**: The `coverage-clover` collector is fully accessible from both the CLI `collect` subcommand and the `@collect` runner

### Tests

- [x] 3.1 [P] [US1] Unit test: parse valid Clover XML returns line coverage percentage
- [x] 3.2 [P] [US1] Unit test: parse with `--type line` returns same as default
- [x] 3.3 [P] [US1] Unit test: parse with `--type function` returns function coverage
- [x] 3.4 [P] [US1] Unit test: parse with `--type branch` returns branch coverage
- [x] 3.5 [P] [US1] Unit test: parse returns 100% for full coverage report
- [x] 3.6 [P] [US1] Unit test: parse throws on malformed XML
- [x] 3.7 [P] [US1] Unit test: parse throws on empty source path
- [x] 3.8 [P] [US1] Unit test: parse throws on non-existent file
- [x] 3.9 [P] [US1] Unit test: parse throws on missing coverage data
- [x] 3.10 [P] [US1] Unit test: merge two non-overlapping Clover reports (line)
- [x] 3.11 [P] [US1] Unit test: merge two overlapping Clover reports (line)
- [x] 3.12 [P] [US1] Unit test: merge with branch coverage type
- [x] 3.13 [P] [US1] Unit test: merge with function coverage type
- [x] 3.14 [P] [US1] Unit test: merge single file matches single-file parser
- [x] 3.15 [P] [US1] Unit test: merge throws on empty file list
- [x] 3.16 [P] [US1] Unit test: merge throws on missing file
- [x] 3.17 [P] [US1] Unit test: merge throws on malformed XML
- [x] 3.18 [P] [US1] Unit test: merge throws on missing metrics data

### Implementation

- [x] 3.19 [US1] [P] Register `CoverageCloverCommand` in `src/cli/cmd/collect.ts` with variadic `<sourcePaths...>` and `--type` option
- [x] 3.20 [US1] [P] Register `coverage-clover` subcommand in `src/collector/collect-runner.ts` and add to `AVAILABLE_COLLECTORS`

**Checkpoint**: `bun run src/index.ts collect coverage-clover tests/fixtures/clover/sample.xml` outputs a coverage percentage

---

## 4. Polish & Cross-Cutting Concerns

- [ ] 4.1 [P] Update contracts in `openspec/specs/metrics/contracts/built-in-metrics.md` (archive step)
- [x] 4.2 Run `bun check` to verify lint, types, and format pass
- [x] 4.3 Run `bun test` to verify all tests pass
