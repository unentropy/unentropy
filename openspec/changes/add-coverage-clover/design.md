## Context

The existing codebase supports three coverage collectors: `coverage-lcov`, `coverage-cobertura`, and placeholder commands for `coverage-json`/`coverage-xml`. PHP projects using PHPUnit produce Clover XML reports via `--coverage-clover`, but there is no parser for this format. The init template for PHP already references `--coverage-clover`, making this a natural extension.

### Clover vs. Cobertura Format Differences

| Aspect            | Cobertura                                                   | Clover (PHPUnit)                                                  |
| ----------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| Root element      | `<coverage line-rate="..." ...>`                            | `<coverage generated="..." phpunit="...">`                        |
| Hierarchy         | `<packages>/<package>/<classes>/<class>/<methods>/<method>` | `<project>/<file>/<class>/<metrics>`                              |
| Line coverage     | `lines-covered`/`lines-valid` attributes on root            | `statements`/`coveredstatements` on `<metrics>`                   |
| Branch coverage   | `branches-covered`/`branches-valid` on root                 | `conditionals`/`coveredconditionals` on `<metrics>` (2x branches) |
| Function coverage | Calculated by traversing method elements                    | `methods`/`coveredmethods` on `<metrics>`                         |
| Aggregate metrics | At root `<coverage>` level as attributes                    | At `<metrics>` elements on `<project>` and `<file>` levels        |

### Merge Algorithm

Same additive approach as Cobertura: parse project-level `<metrics>` attributes from each file, sum covered/valid counts, and compute the percentage. For parallel CI runs producing disjoint coverage files, this is mathematically correct.

### Key Constraints

- Use existing `fast-xml-parser` dependency (already used by Cobertura)
- New collector must follow the same patterns as `coverage-cobertura` for CLI and `@collect` runner registration
- The Clover format's `conditionals` attribute represents 2x the number of branches (each condition has true/false paths), consistent with the OpenClover specification

## Goals / Non-Goals

**Goals:**

- Parse Clover XML coverage reports (PHPUnit `--coverage-clover` output)
- Support line coverage (from `statements`/`coveredstatements`), function coverage (from `methods`/`coveredmethods`), and branch coverage (from `conditionals`/`coveredconditionals`)
- Accept multiple file paths and merge by summing aggregate counts
- Register `coverage-clover` in both the `collect` CLI subcommand and `@collect` runner
- Add comprehensive test coverage and Clover XML fixtures

**Non-Goals:**

- Modifying existing Cobertura, LCOV, or other collectors
- Writing merged XML output to disk
- Per-file deduplication in merge (uses project-level aggregates, same approach as Cobertura)
- Supporting OpenClover line-level detail (`<line>` elements) — only aggregate `<metrics>` attributes
- Supporting Clover test metrics (`testduration`, `testfailures`, `testpasses`, `testruns` on `<metrics>`)

## Decisions

### Decision: Create new file vs. extend existing Cobertura collector

**Chosen**: Create `src/metrics/collectors/clover.ts` as a new collector file, separate from the Cobertura implementation.

**Rationale**: Despite both being XML coverage formats, Clover and Cobertura have fundamentally different XML structures (root element, hierarchy, attribute names). Combining them in one file would increase complexity with conditionals for format detection. A separate file follows the existing pattern (each collector in its own file) and keeps each module focused.

**Alternative**: Add Clover parsing to the Cobertura file with auto-detection — rejected because auto-detection adds complexity and fragility.

### Decision: Coverage type calculation

**Chosen**: Define three coverage types that map directly to Clover `<metrics>` attributes:

| Coverage Type | Covered Attribute     | Valid Attribute |
| ------------- | --------------------- | --------------- |
| `line`        | `coveredstatements`   | `statements`    |
| `branch`      | `coveredconditionals` | `conditionals`  |
| `function`    | `coveredmethods`      | `methods`       |

Each type computes `covered / valid * 100`.

**Rationale**: These attributes are always present at the project level in PHPUnit's Clover output. The mapping is straightforward and matches user expectations: "line" maps to statements, "function" maps to methods, and "branch" maps to conditionals. Note that Clover's `conditionals` is already 2x actual branches (one per true/false path), so the percentage calculation works correctly without adjustment.

**Alternative**: Compute percentages from lower-level data (e.g., count `<line type="stmt">` elements with `count > 0`) — rejected because project-level aggregates are already correct, simpler, and consistent with the Cobertura approach.

### Decision: Merge strategy using project-level metrics

**Chosen**: Parse `<project>/<metrics>` element from each file, sum the relevant covered/valid attributes, and compute `totalCovered / totalValid * 100`.

**Rationale**: The project-level `<metrics>` in Clover XML reports is the sum of all file-level metrics. For parallel CI runs with disjoint file sets, summing project-level aggregates across reports gives the correct merged coverage. This is the same additive approach used by the existing Cobertura collector for line/branch coverage.

**Alternative**: Parse per-file `<metrics>` and deduplicate by filename — rejected because this adds complexity without benefit for the common parallel-CI use case, and the Cobertura collector already accepts the same limitation.

### Decision: XML parsing approach

**Chosen**: Use `fast-xml-parser` with the same configuration as Cobertura (`ignoreAttributes: false`, `attributeNamePrefix: "@_"`).

**Rationale**: `fast-xml-parser` is already a project dependency. Using the same configuration ensures consistent behavior and minimizes setup code. The Clover XML structure is straightforward attribute-based metrics.

### Decision: Handling missing metrics attributes

**Chosen**: If any input file lacks the required `<project>/<metrics>` element or the relevant covered/valid attributes for the requested coverage type, fail with an error.

**Rationale**: Without required attributes, coverage percentage cannot be computed. Standard PHPUnit Clover output always includes `statements`, `coveredstatements`, `methods`, and `coveredmethods`. The `conditionals` and `coveredconditionals` attributes may be zero but should exist.

## Risks / Trade-offs

- [**No per-file deduplication**] → Merge assumes disjoint file sets across parallel reports; overlapping files would overcount. Same trade-off as Cobertura merge, accepted for simplicity.
- [**Conditionals semantics**] → Clover's `conditionals` is 2x branches, unlike Cobertura's `branches-covered`/`branches-valid` which count unique branches. This means `--type branch` percentages may differ between Clover and Cobertura for the same codebase. Document this difference.
- [**Non-standard Clover XML**] → Some tools produce Clover-like XML that deviates from PHPUnit's output. The parser validates the presence of expected elements and fails fast with descriptive errors.

## Contracts Referenced

- `contracts/cli-interface.md` — CLI syntax and options for `coverage-clover`
- `contracts/built-in-metrics.md` — Available collectors table update

## File Changes

- `src/metrics/collectors/clover.ts` — new Clover XML collector with `parseCloverCoverage()` and `mergeCloverCoverage()`
- `src/cli/cmd/collect.ts` — add `CoverageCloverCommand` subcommand
- `src/collector/collect-runner.ts` — add `coverage-clover` subcommand to `@collect` runner and `AVAILABLE_COLLECTORS`
- `tests/unit/metrics/collectors/clover.test.ts` — new test file with single-file and merge test cases
- `tests/fixtures/clover/` — new fixture directory with sample, full-coverage, minimal, malformed, overlap, and non-overlap XML files
