## Context

Built-in collectors (`loc`, `size`, `coverage-*`) currently require explicit paths in every metric command. There is no centralized scoping mechanism. The `loc` collector uses a custom `readdirSync` walker with basename-only exclude matching. The `size` collector uses `fast-glob` for glob patterns but has no exclude support in its CLI. Coverage parsers trust pre-computed XML aggregates, making post-parse filtering impossible without recalculation.

This design adds a top-level `sources` field to `unentropy.json` that all built-in collectors respect, using `fast-glob` for file discovery and `micromatch` for coverage filtering.

## Goals / Non-Goals

**Goals:**

- Add `sources` to config schema with micromatch pattern support and bare-directory auto-expansion.
- Thread `sources` through the collection pipeline (actions, CLI, collect runner).
- Make `loc` and `size` collectors use `sources` when no explicit paths are provided.
- Make all coverage parsers filter and recalculate from file-level data.
- Maintain 100% backward compatibility when `sources` is absent.

**Non-Goals:**

- No implicit defaults when `sources` is absent.
- No per-metric `sources` override (only explicit command args).
- No `.gitignore` or `git ls-files` integration.
- No inode deduplication in `collectSize` (simple `lstat` summation).
- No changes to custom metric command execution.

## Decisions

### 1. Unified Micromatch Pattern Array (vs Include/Exclude Object)

**Decision**: `sources` is a single `string[]` of micromatch patterns with negation (`!`), not an `{ include, exclude }` object.

**Rationale**: Jest, ESLint, and `fast-glob` all use this pattern. A single array is less verbose and leverages ecosystem familiarity. Order matters: last match wins.

**Alternative considered**: `{ include: string[], exclude: string[] }` — rejected as more verbose and doesn't match how `fast-glob`/`micromatch` natively work.

### 2. Auto-Expansion of Bare Directories

**Decision**: Patterns without glob characters that resolve to existing directories are auto-expanded with `/**`.

**Rationale**: `"sources": ["src", "tests"]` is the intuitive user expectation. Requiring `"src/**"` adds friction.

**Alternative considered**: No auto-expansion — rejected as too unfriendly for the common case.

**Implementation**: Config loader normalizes patterns at load time using `fs.existsSync` + `fs.statSync`.

### 3. `fast-glob` for `loc` File Discovery

**Decision**: When `sources` drives `loc`, use `fast-glob` instead of the custom walker.

**Rationale**: The custom walker only supports basename exclude matching (e.g. `node_modules`). `sources.exclude` may contain paths like `src/generated` or globs like `**/*.test.ts`. `fast-glob` handles these natively.

**Trade-off**: `loc` currently reads every file unconditionally. `fast-glob` is fast but this is still a behavior change. The `languageFilter` is applied post-discovery, same as before.

### 4. Coverage Recalculation from File-Level Data

**Decision**: When `sources` filters coverage files, recalculate percentages from per-file data rather than using XML aggregates.

**Rationale**: XML aggregate attributes (`@_line-rate`, `@_lines-covered`) include excluded files. There is no way to derive the correct percentage post-filter without recomputing.

**Implementation complexity**:

- **LCOV**: Trivial — filter `SF` records, pass to existing `generateSummary`.
- **Cobertura**: Moderate — refactor `calcSingleFileCoverage` to use `extractFileLineData` for line type, add per-class branch extraction for branch type, filter `extractMethods` for function type.
- **Clover**: Moderate — for line type, already uses per-file `fileMap` (just filter keys). For branch/function types, extract from per-file `metrics` instead of project-level `metrics`.

### 5. No Inode Deduplication in `collectSize`

**Decision**: `collectSize` uses `fast-glob` + `fs.lstat` + simple size summation.

**Rationale**: Hard links are extremely rare in JS/TS projects. The simplicity gain outweighs the edge-case correctness. Symlinks are not followed (`lstat`), which is the safe default.

**Alternative considered**: Track `Set<bigint>` of inodes — rejected as unnecessary complexity for this feature.

## Risks / Trade-offs

- **[Risk] Coverage recalculation changes existing percentages for users with `sources`** → **Mitigation**: Only affects users who explicitly add `sources`. Existing configs are unchanged.
- **[Risk] `fast-glob` performance on very large repos** → **Mitigation**: `fast-glob` is widely used and optimized. Users can narrow patterns if needed.
- **[Risk] Auto-expansion behavior surprises users who intended literal file matching** → **Mitigation**: Only directories are expanded; files are kept as-is. Documented in contracts.
- **[Risk] Backward compatibility break if `loc <path>` positional becomes optional** → **Mitigation**: Yargs `demandOption` is removed only for the `sources`-aware path; if `sources` is absent and path is missing, the collector errors.

## Contracts Referenced

- `contracts/config-schema.md` — `sources` field schema and validation rules.
- `contracts/built-in-metrics.md` — Updated collector signatures and filtering behavior.

## File Changes

### New Files

- `src/metrics/collectors/sources-filter.ts` — Shared `matchesSources` utility using `micromatch`.
- `tests/unit/metrics/collectors/sources-filter.test.ts` — Unit tests for filtering logic.

### Modified Files

**Config**

- `src/config/schema.ts` — Add `SourcesConfigSchema`, add `sources` to `UnentropyConfigSchema`.
- `src/config/loader.ts` — Normalize bare directories in `sources`, include in `ResolvedUnentropyConfig`.
- `src/config/types.ts` (if separate from schema) — Add `SourcesConfig` type.

**Collection Pipeline**

- `src/collector/collect-runner.ts` — Accept `sources` param; make `loc`/`size` path args optional; inject `sources` when absent.
- `src/collector/runner.ts` — Accept and forward `sources` to `executeCollect`.
- `src/collector/collector.ts` — Accept `sources` param, forward to `runCommand`.

**Collectors**

- `src/metrics/collectors/loc.ts` — Add `paths` option; use `fast-glob` when `paths` provided.
- `src/metrics/collectors/size.ts` — Add `collectSize(paths, options)` function.
- `src/metrics/collectors/lcov.ts` — Accept `sources`, filter records before summary.
- `src/metrics/collectors/cobertura.ts` — Accept `sources`; refactor all coverage types to compute from filtered file-level data.
- `src/metrics/collectors/clover.ts` — Accept `sources`; compute from filtered file-level data for all coverage types.

**Actions & CLI**

- `src/actions/track-metrics.ts` — Pass `config.sources` to `collectMetrics`.
- `src/actions/quality-gate.ts` — Pass `config.sources` to `collectMetrics`.
- `src/cli/cmd/test.ts` — Pass `config.sources` to `runCommand`.
- `src/cli/cmd/collect.ts` — Update `loc` and `size` commands to make paths optional.

**Tests**

- `tests/unit/config/schema.test.ts` — Add `sources` validation tests.
- `tests/unit/config/loader.test.ts` — Add `sources` normalization tests.
- `tests/unit/collector/collect-runner.test.ts` — Add override and sources-driven tests.
- `tests/unit/collector/collector.test.ts` — Update `collectMetrics` calls.
- `tests/unit/metrics/collectors/loc.test.ts` — Add `paths` and `sources` tests.
- `tests/integration/cli-helpers.test.ts` — Add `collectSize` tests.
- `tests/unit/metrics/collectors/lcov.test.ts` — Add filtering tests.
- `tests/unit/metrics/collectors/cobertura.test.ts` — Add filtering + recalculation tests.
- `tests/unit/metrics/collectors/clover.test.ts` — Add filtering + recalculation tests.

**Config Examples**

- `unentropy.json` — Update with `sources` example.

## Migration Plan

No migration required. This is a purely additive feature. Existing configurations without `sources` behave identically.

## Open Questions

None. All design decisions have been resolved during exploration.
