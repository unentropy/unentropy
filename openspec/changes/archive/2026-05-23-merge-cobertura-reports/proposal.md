## Why

When running test suites in CI, developers often split tests across parallel jobs to speed up execution. Each job produces its own Cobertura XML coverage report with partial coverage data. Currently, the `coverage-cobertura` collector only accepts a single XML file, so teams cannot aggregate coverage from parallel test runs into one consolidated metric. Adding merge support enables accurate coverage tracking in matrix/parallel CI workflows.

## What Changes

- Add merge support to the `coverage-cobertura` collector to accept multiple Cobertura XML files and merge their coverage data
- When files overlap (same source file appears in multiple reports), merge by summing covered and valid counts rather than averaging rates
- Support the same coverage types as the single-file collector (`line`, `branch`, `function`)
- Update CLI and `@collect` runner to accept multiple source paths

## Capabilities

### Modified Capabilities

- `metrics`: New requirement "Multi-File Coverage Collection" added — the `coverage-cobertura` collector now accepts variadic source paths and merges results

## Impact

- `src/metrics/collectors/cobertura.ts` — new merge logic, refactored parser for reuse
- `src/cli/cmd/collect.ts` — variadic source path for `coverage-cobertura`
- `src/collector/collect-runner.ts` — variadic source path for `coverage-cobertura` subcommand
- `tests/unit/metrics/collectors/cobertura.test.ts` — new merge tests
- `tests/fixtures/cobertura/` — additional fixtures for merge scenarios

### Documentation Impact

- [ ] No user-facing doc changes
- [x] Contracts affect: `built-in-metrics.md` — update `coverage-cobertura` syntax to show variadic paths

## Non-goals

- Merging LCOV or other coverage formats (Cobertura only)
- Writing merged XML output to disk (the collector returns a single percentage value as all others do)
- Detecting or warning about non-overlapping coverage gaps (the merge is purely additive)
