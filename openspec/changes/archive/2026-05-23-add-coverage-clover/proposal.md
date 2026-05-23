## Why

PHP projects using PHPUnit with `--coverage-clover` produce Clover XML coverage reports, but Unentropy has no collector for this format. The built-in PHP init template already references `--coverage-clover`, yet the generated reports cannot be consumed. Adding a `coverage-clover` collector fills this gap, enabling PHP coverage tracking alongside the existing Cobertura (JS/Java) and LCOV support.

## What Changes

- Add a new `coverage-clover` collector that parses Clover XML reports (PHPUnit output, OpenClover format)
- Support line coverage (via `statements`/`coveredstatements`), function coverage (via `methods`/`coveredmethods`), and branch coverage (via `conditionals`/`coveredconditionals`)
- Support merging multiple Clover XML files from parallel CI test jobs by summing covered/valid counts
- Register `coverage-clover` in both the CLI (`collect` subcommand) and `@collect` runner
- Add test fixtures with Clover XML examples

## Capabilities

### New Capabilities

- `metrics`: New built-in collector `coverage-clover` supporting Clover XML format with line, branch, and function coverage types, including multi-file merge.

### Modified Capabilities

_(No existing capabilities change — this is purely additive.)_

## Impact

- `src/metrics/collectors/clover.ts` — new Clover XML parser with `parseCloverCoverage()` and `mergeCloverCoverage()`
- `src/cli/cmd/collect.ts` — new `coverage-clover` subcommand with variadic `<sourcePaths...>`
- `src/collector/collect-runner.ts` — new `coverage-clover` subcommand registered in `@collect` runner and `AVAILABLE_COLLECTORS`
- `src/metrics/registry.ts` — no change needed (reuses existing `coverage` and `function-coverage` templates)
- `tests/unit/metrics/collectors/clover.test.ts` — unit tests for single-file and merge behavior
- `tests/fixtures/clover/` — fixture XML files (sample, full-coverage, no-coverage, minimal, malformed, overlap, non-overlap)

### Documentation Impact

- [x] Contracts affect: `built-in-metrics.md` — add `coverage-clover` to the built-in collectors list
- [x] Contracts affect: `cli-interface.md` — add `coverage-clover` CLI subcommand syntax

## Non-goals

- Modifying the existing Cobertura or LCOV collectors
- Writing merged Clover XML output to disk
- Supporting the full OpenClover XML schema (e.g., `testproject`, `package` elements with per-package metrics) — only the PHPUnit Clover subset used in CI
- Supporting Clover's `element`/`coveredelement` metrics as a separate coverage type (covered by line+function+conditionals already)
