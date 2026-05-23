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

Differentiated by coverage type:

- **Line coverage**: Per-file, per-statement-line deduplication. Parse `<line type="stmt">` elements from each `<file>`, merge by unique filename across reports — a line is covered if any report shows `count > 0`. Sum the union of covered and total lines across all unique files.
- **Branch & function coverage**: Project-level aggregation. Parse `<project>/<metrics>` attributes (`conditionals`/`coveredconditionals`, `methods`/`coveredmethods`), sum counts across reports. These use aggregate attributes because Clover XML has no per-line branch or function data available for dedup.

### Key Constraints

- Use existing `fast-xml-parser` dependency (already used by Cobertura)
- New collector must follow the same patterns as `coverage-cobertura` for CLI and `@collect` runner registration
- The Clover format's `conditionals` attribute represents 2x the number of branches (each condition has true/false paths), consistent with the OpenClover specification

## Goals / Non-Goals

**Goals:**

- Parse Clover XML coverage reports (PHPUnit `--coverage-clover` output)
- Support line coverage (from `statements`/`coveredstatements`), function coverage (from `methods`/`coveredmethods`), and branch coverage (from `conditionals`/`coveredconditionals`)
- Accept multiple file paths and merge by per-file per-statement-line deduplication for line coverage; project-level aggregation for branch and function
- Register `coverage-clover` in both the `collect` CLI subcommand and `@collect` runner
- Add comprehensive test coverage and Clover XML fixtures

**Non-Goals:**

- Modifying existing Cobertura, LCOV, or other collectors
- Writing merged XML output to disk
- Per-class or per-method deduplication for branch/function coverage (uses project-level aggregates)

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

### Decision: Merge strategy for line coverage

**Chosen**: Per-file, per-statement-line deduplication: parse `<line type="stmt">` elements from each `<file>`, group by unique filename, union line numbers across reports. A line is counted once per file; it is covered if any report shows `count > 0`. Sum the union across all unique files and compute `totalCovered / totalValid * 100`.

**Rationale**: When parallel CI jobs produce coverage for overlapping source files, summing project-level aggregates overcounts both covered and total lines for shared files. Per-line dedup avoids double-counting: if PHPUnit covers lines 1-50 of a file and Behat covers lines 51-100, the merged result correctly counts all 100 lines with their combined covered set. This matches how the `@connectis/coverage-merger` library handles Clover reports.

**Alternative**: Project-level summation (old approach) — rejected because it produces inaccurate results when reports overlap (e.g., aggregated 59% vs corrected 80% on real-world data).

### Decision: Merge strategy for branch and function coverage

**Chosen**: Parse `<project>/<metrics>` elements from each file, sum the relevant attributes (`conditionals`/`coveredconditionals`, `methods`/`coveredmethods`), and compute `totalCovered / totalValid * 100`.

**Rationale**: Clover XML does not provide per-line branch or per-method coverage data in a deduplicable format. Branch data exists only as aggregate counts on `<metrics>`, and function coverage is similarly aggregate-only. Summing project-level aggregates is the only viable approach for these types.

**Alternative**: Parse per-file `<metrics>` and deduplicate by filename — rejected because this adds complexity without benefit; branch/function are typically measured on disjoint test configurations and overlap is rare.

### Decision: XML parsing approach

**Chosen**: Use `fast-xml-parser` with the same configuration as Cobertura (`ignoreAttributes: false`, `attributeNamePrefix: "@_"`).

**Rationale**: `fast-xml-parser` is already a project dependency. Using the same configuration ensures consistent behavior and minimizes setup code. The Clover XML structure is straightforward attribute-based metrics.

### Decision: Handling missing metrics attributes

**Chosen**: If any input file lacks the required `<project>/<metrics>` element or the relevant covered/valid attributes for the requested coverage type, fail with an error.

**Rationale**: Without required attributes, coverage percentage cannot be computed. Standard PHPUnit Clover output always includes `statements`, `coveredstatements`, `methods`, and `coveredmethods`. The `conditionals` and `coveredconditionals` attributes may be zero but should exist.

## Risks / Trade-offs

- [**Line-level dedup only for line coverage**] → Branch and function coverage still use project-level summing and may overcount if reports overlap for the same classes. Acceptable because branch/function overlap across parallel CI jobs is rare in practice.
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
