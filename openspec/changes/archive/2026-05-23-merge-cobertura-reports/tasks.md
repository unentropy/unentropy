## 1. Cleanup — Remove `--fallback` from existing `coverage-cobertura`

- [x] 1.1 [P] Remove `--fallback` option from `coverage-cobertura` CLI command definition in `src/cli/cmd/collect.ts`
- [x] 1.2 [P] Remove `--fallback` option from `coverage-cobertura` runner definition in `src/collector/collect-runner.ts`
- [x] 1.3 [P] Remove `fallback` from `CoberturaOptions` interface in `src/metrics/collectors/cobertura.ts`
- [x] 1.4 [P] Replace all `return options.fallback ?? 0` in `src/metrics/collectors/cobertura.ts` with thrown errors
- [x] 1.5 [P] Update existing fallback tests in `tests/unit/metrics/collectors/cobertura.test.ts` to expect thrown errors instead of fallback values

**Checkpoint**: Existing tests pass, `coverage-cobertura` fails on any parse error instead of silently falling back

---

## 2. Setup

- [x] 2.1 [P] Add overlapping and non-overlapping Cobertura XML fixtures to `tests/fixtures/cobertura/`

## 3. Foundational

- [x] 3.1 [P] Refactor `src/metrics/collectors/cobertura.ts` — extract single-file parsing into a shared internal function that returns raw counts (`CoberturaParseResult`), separate from the percentage calculation

**Checkpoint**: Existing single-file parsing still works after refactor

---

## 4. User Story 1 - Multi-file merge support (Priority: P1)

**Goal**: The `coverage-cobertura` collector accepts multiple file paths and returns merged coverage

### Tests

- [x] 4.1 [P] [US1] Unit test: merge two non-overlapping Cobertura reports (line coverage)
- [x] 4.2 [P] [US1] Unit test: merge two overlapping Cobertura reports (same file in both)
- [x] 4.3 [P] [US1] Unit test: merge with branch coverage type
- [x] 4.4 [P] [US1] Unit test: merge with function coverage type
- [x] 4.5 [P] [US1] Unit test: merge single file matches single-file parser output
- [x] 4.6 [P] [US1] Unit test: merge fails with error on missing file
- [x] 4.7 [P] [US1] Unit test: merge fails with error on empty file list
- [x] 4.8 [P] [US1] Unit test: merge fails with error on malformed XML
- [x] 4.9 [P] [US1] Unit test: merge fails with error on file missing required attributes

### Implementation

- [x] 4.10 [US1] [P] Implement `mergeCoberturaCoerage(paths, options?)` in `src/metrics/collectors/cobertura.ts`
- [x] 4.11 [US1] [P] Update `src/cli/cmd/collect.ts` — change `coverage-cobertura` positional from `<sourcePath>` to `<sourcePaths...>`, wire up merge logic
- [x] 4.12 [US1] [P] Update `src/collector/collect-runner.ts` — change `coverage-cobertura` positional from `<sourcePath>` to `<sourcePaths...>`, wire up merge logic

**Checkpoint**: `bun run src/index.ts collect coverage-cobertura file1.xml file2.xml` works and produces merged results

---

## 5. Polish & Cross-Cutting Concerns

- [x] 5.1 [P] Update contracts in `openspec/specs/metrics/contracts/built-in-metrics.md` (archive step)
- [x] 5.2 Run `bun check` to verify lint, types, and format pass
- [x] 5.3 Run `bun test` to verify all tests pass
