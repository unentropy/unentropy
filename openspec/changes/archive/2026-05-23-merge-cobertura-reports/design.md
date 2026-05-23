## Context

The `coverage-cobertura` collector currently accepts a single Cobertura XML file and returns a coverage percentage from root-level `line-rate`/`branch-rate` attributes or method-level function coverage. In CI workflows with parallel test jobs, each job produces its own partial coverage report. Users need to merge these to get accurate combined coverage.

The existing collector at `src/metrics/collectors/cobertura.ts` parses XML with `fast-xml-parser` and extracts root-level rate attributes. These attributes are pre-computed ratios, not raw counts. To merge accurately, we need to work with raw `lines-covered`/`lines-valid` and `branches-covered`/`branches-valid` attributes available on the root `<coverage>` element.

### Merge Algorithm

The merge algorithm uses different strategies depending on the coverage type:

**Line coverage**:

1. **Parse each XML file** into a structured representation using `fast-xml-parser`
2. **Traverse the `<package>`/`<class>` tree** from each file, extracting per-class `<lines>` elements with individual `<line number="N" hits="M">` entries
3. **Merge by unique filename across reports**: for each unique `class filename`, union all line numbers where `hits > 0`. A line is covered if any report shows it executed.
4. **Sum counts from the merged data**:
   - `totalLinesCovered = sum of covered lines across all unique files (after dedup)`
   - `totalLinesValid = sum of all lines across all unique files (after dedup)`
5. **Recompute rate**: `line-rate = totalLinesCovered / totalLinesValid`
6. **Return the percentage**: `rate * 100`

This per-class per-line dedup approach handles parallel CI jobs that produce coverage for overlapping source files. For example, if report 1 covers lines 1-50 of a file and report 2 covers lines 51-100, the merged result correctly counts 100 total lines with the union of covered lines. The union operation prevents double-counting when both reports cover the same line.

**Branch coverage**:

1. **Extract root-level raw counts** from each file: `branches-covered`, `branches-valid`
2. **Sum the counts** across all input files:
   - `totalBranchesCovered = sum of all branches-covered`
   - `totalBranchesValid = sum of all branches-valid`
3. **Recompute rate**: `branch-rate = totalBranchesCovered / totalBranchesValid`
4. **Return the percentage**: `rate * 100`

Branch coverage uses root-level summation because Cobertura XML does not provide per-branch hit data in a deduplicable format; branch condition counts are distributed across `<line>` elements as a ratio, not individual hits per branch.

**Function coverage**:

Same as before: traverse the package/class/method tree and deduplicate by (package, class, name, signature). A method is covered if `line-rate > 0` in any input report.

## Goals / Non-Goals

**Goals:**

- Accept multiple Cobertura XML file paths in both CLI and `@collect` runner
- Merge line, branch, and function coverage across reports
- Handle overlapping files (same source in multiple reports) by per-class per-line deduplication for line coverage; root-level summation for branch coverage
- Maintain backward compatibility for single-file usage

**Non-Goals:**

- Modifying LCOV or other coverage collectors
- Writing merged XML to disk
- Detecting coverage gaps or conflicts

## Decisions

### Decision: Modify existing `coverage-cobertura` collector vs. create new collector

**Chosen**: Modify existing collector to accept variadic paths

**Rationale**: The merge behavior is additive and backward-compatible — a single file input produces identical output. A new collector name would require users to learn and configure a different command, while variadic paths are a natural extension of the existing interface. The `size` collector already follows this variadic pattern.

**Alternative**: Create `coverage-cobertura-merge` — rejected as it adds unnecessary CLI surface area and user configuration complexity for what is fundamentally the same operation on multiple files.

### Decision: Merge strategy for line coverage

**Chosen**: Per-class, per-line deduplication: traverse `<package>`/`<class>` tree from each report, collect `<line number="N" hits="M">` entries per `class filename`, union line numbers with `hits > 0` across reports. Sum the union of covered and total lines across all unique files.

**Rationale**: When parallel CI jobs produce overlapping coverage for the same source files, root-level summation of `lines-covered`/`lines-valid` double-counts both the numerator and denominator for shared files, producing incorrect results. Per-class per-line dedup gives the correct union of covered lines. For example, with two reports covering the same 100-line file — one covering lines 1-50 and the other covering lines 51-100 — root-level summation would report 100/200 = 50%, while per-line dedup correctly reports 100/100 = 100%.

**Alternative**: Sum root-level `lines-covered`/`lines-valid` (old approach) — rejected because it produces inaccurate results when reports overlap. This was the initial implementation and had to be revised after testing against real-world overlapping reports.

### Decision: Merge strategy for branch coverage

**Chosen**: Sum `branches-covered`/`branches-valid` from the root `<coverage>` element of each report, then compute `totalCovered / totalValid * 100`.

**Rationale**: Cobertura XML does not provide per-branch hit data in a deduplicable format. Branch condition counts are embedded in `<line>` condition-coverage attributes as a ratio string (e.g., "50% (2/4)"), not individual hits per branch. Root-level `branches-covered`/`branches-valid` are the only reliable aggregate attributes. Summing these is mathematically correct for merging disjoint branch coverage, and branch coverage overlap across parallel jobs is rare in practice.

**Alternative**: Parse per-package/class branch data and merge by filename — rejected because Cobertura XML does not expose per-class or per-line branch hit counts, making this infeasible without external data.

### Decision: Merge strategy for function coverage

**Chosen**: Collect all methods across reports, deduplicate by (package, class, name, signature), and a method is covered if any report has `line-rate > 0`.

**Rationale**: A method is tested if at least one test suite exercises it. This is additive — running more tests can only increase or maintain method coverage, never decrease it.

### Decision: Handling missing `lines-covered`/`lines-valid` attributes

**Chosen**: If any input file lacks `lines-covered`/`lines-valid` (or `branches-covered`/`branches-valid` for branch type) on the root `<coverage>` element, fail with an error. Merge is only performed when ALL files have the raw count attributes.

**Rationale**: Without raw counts, per-file summation is impossible. Using pre-computed rates from individual files would mix summed and non-summed data, producing incorrect results. The `merge-cobertura` package makes the same assumption — all inputs must have these attributes. Standard Cobertura output from tools like Jest, Vitest, and Mocha always includes them, so this is a safe constraint.

**Alternative**: Fall back to averaging individual file rates when counts are missing — rejected because this gives incorrect results when files differ in size or overlap in source files.

### Decision: Full-parse vs. streaming for XML processing

**Chosen**: Full-parse each file individually (same approach as current single-file parser). `fast-xml-parser` is already a dependency and files are small (typically < 1MB).

**Rationale**: Simpler implementation, reuses existing parser setup. Streaming would add complexity with no measurable benefit for typical CI coverage report sizes.

## Contracts Referenced

- `contracts/cli-interface.md` — Updated CLI syntax for variadic source paths
- `contracts/built-in-metrics.md` — Updated collector syntax in metric template registry

## File Changes

- `src/metrics/collectors/cobertura.ts` — Add `mergeCoberturaCoerage()` function and intermediate types; refactor `parseCoberturaCoerage` for internal reuse
- `src/cli/cmd/collect.ts` — Change `coverage-cobertura` positional from `<sourcePath>` to `<sourcePaths...>`
- `src/collector/collect-runner.ts` — Change `coverage-cobertura` positional from `<sourcePath>` to `<sourcePaths...>`
- `tests/unit/metrics/collectors/cobertura.test.ts` — Add merge test cases
- `tests/fixtures/cobertura/` — Add overlapping and non-overlapping fixture files
