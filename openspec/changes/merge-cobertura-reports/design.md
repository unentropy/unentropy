## Context

The `coverage-cobertura` collector currently accepts a single Cobertura XML file and returns a coverage percentage from root-level `line-rate`/`branch-rate` attributes or method-level function coverage. In CI workflows with parallel test jobs, each job produces its own partial coverage report. Users need to merge these to get accurate combined coverage.

The existing collector at `src/metrics/collectors/cobertura.ts` parses XML with `fast-xml-parser` and extracts root-level rate attributes. These attributes are pre-computed ratios, not raw counts. To merge accurately, we need to work with raw `lines-covered`/`lines-valid` and `branches-covered`/`branches-valid` attributes available on the root `<coverage>` element.

### Merge Algorithm (validated against `merge-cobertura`)

The merge algorithm follows the industry-standard approach used by `merge-cobertura` (https://github.com/Teamop/merge-cobertura):

1. **Parse each XML file** into a structured representation using `fast-xml-parser`
2. **Extract root-level raw counts** from each file: `lines-covered`, `lines-valid`, `branches-covered`, `branches-valid`
3. **Sum the counts** across all input files:
   - `totalLinesCovered = sum of all lines-covered`
   - `totalLinesValid = sum of all lines-valid`
   - `totalBranchesCovered = sum of all branches-covered`
   - `totalBranchesValid = sum of all branches-valid`
4. **Recompute rates from the summed counts**:
   - `line-rate = totalLinesCovered / totalLinesValid`
   - `branch-rate = totalBranchesCovered / totalBranchesValid`
5. **Return the percentage**: `rate * 100`

This summation approach is mathematically correct because coverage is a ratio of covered-to-total items. Summing numerators and denominators separately before dividing gives a properly weighted combined rate. For example, if file A has 50/100 lines covered (50%) and file B has 90/100 lines covered (90%), averaging rates gives 70%, but the true combined rate is (50+90)/(100+100) = 70% — same result when files are equal size. When files differ in size, summation correctly weights larger files more heavily: 50/100 (50%) + 90/200 (45%) summed gives (50+90)/(100+200) = 46.7%, while averaging rates would incorrectly give 47.5%.

For **function coverage**, there are no root-level function count attributes in Cobertura XML. Instead, we traverse the package/class/method tree and deduplicate by (package, class, name, signature). A method is covered if `line-rate > 0` in any input report.

## Goals / Non-Goals

**Goals:**

- Accept multiple Cobertura XML file paths in both CLI and `@collect` runner
- Merge line, branch, and function coverage across reports
- Handle overlapping files (same source in multiple reports) by summing covered/valid counts
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

### Decision: Merge strategy for line/branch coverage

**Chosen**: Sum `lines-covered`/`lines-valid` (and `branches-covered`/`branches-valid`) from the root `<coverage>` element of each report, then compute `totalCovered / totalValid * 100`.

**Rationale**: Cobertura XML provides these aggregate attributes. Summing counts is mathematically correct for merging — it weights each file's contribution by its number of lines. Using root-level aggregates avoids the complexity of traversing the package/class tree for line/branch coverage.

**Alternative**: Parse per-package/class data and merge by filename — rejected because root-level sums produce identical results with simpler code for typical use cases.

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

### Decision: Fallback behavior with multiple files

**Chosen**: If any file fails to parse and `--fallback` is set, use the fallback only when ALL files fail. If at least one file parses successfully, return the merged result of successful parses.

**Rationale**: A single bad file shouldn't discard valid coverage data from other reports. This matches the user's likely intent when running against multiple report files from parallel jobs.

## Contracts Referenced

- `contracts/cli-interface.md` — Updated CLI syntax for variadic source paths
- `contracts/built-in-metrics.md` — Updated collector syntax in metric template registry

## File Changes

- `src/metrics/collectors/cobertura.ts` — Add `mergeCoberturaCoerage()` function and intermediate types; refactor `parseCoberturaCoerage` for internal reuse
- `src/cli/cmd/collect.ts` — Change `coverage-cobertura` positional from `<sourcePath>` to `<sourcePaths...>`
- `src/collector/collect-runner.ts` — Change `coverage-cobertura` positional from `<sourcePath>` to `<sourcePaths...>`
- `tests/unit/metrics/collectors/cobertura.test.ts` — Add merge test cases
- `tests/fixtures/cobertura/` — Add overlapping and non-overlapping fixture files
