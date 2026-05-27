## Why

Built-in collectors (`loc`, `size`, `coverage-*`) currently require explicit paths in every metric command string. There is no centralized way to define "this project's code lives in `src/` and `tests/`; ignore `node_modules`". Users must repeat path and exclude logic across multiple metrics, leading to duplication and inconsistency.

## What Changes

- Add a top-level `sources` field to `unentropy.json` that accepts an array of micromatch patterns.
- When `sources` is configured, built-in collectors that do **not** receive explicit path arguments use it as their default search scope.
- Collectors that receive explicit path arguments ignore `sources` completely (backward compatible).
- Coverage parsers (`lcov`, `cobertura`, `clover`) always filter parsed source file paths through `sources`.
- Bare directory literals in `sources` are auto-expanded to `/**` globs for ergonomics.
- Negation patterns (`!node_modules/**`) are supported for exclusion.

## Capabilities

### New Capabilities

- `sources-config`: Top-level project scoping via micromatch pattern arrays.

### Modified Capabilities

- `loc-collector`: Supports `sources`-driven file discovery when no `<path>` argument is provided.
- `size-collector`: Supports `sources`-driven file discovery when no `<paths>` argument is provided.
- `coverage-lcov`: Filters parsed source file records through `sources` before computing coverage.
- `coverage-cobertura`: Filters parsed class file data through `sources`; recalculates aggregates from filtered file-level data.
- `coverage-clover`: Filters parsed file entries through `sources`; recalculates aggregates from filtered file-level data.

## Impact

- **Config schema** (`src/config/schema.ts`, `src/config/loader.ts`): New `sources` field, normalization of shorthand arrays.
- **Collect runner** (`src/collector/collect-runner.ts`): Detects explicit vs absent path arguments; injects `sources` when needed.
- **Runner & collector** (`src/collector/runner.ts`, `src/collector/collector.ts`): Thread `sources` through the pipeline.
- **Built-in collectors** (`src/metrics/collectors/*`): `loc` and `size` use `fast-glob` for discovery; coverage parsers compute from filtered file-level data.
- **Actions & CLI** (`src/actions/*`, `src/cli/cmd/*`): Pass `config.sources` into collection.
- **Tests**: New unit and integration tests for schema validation, override logic, and filtering behavior.
- **Example config** (`unentropy.json`): Updated to demonstrate `sources` usage.

### Documentation Impact

- [x] Contracts affect: `unentropy.json` configuration reference
- [x] Contracts affect: Built-in collector usage docs

## Non-goals

- No implicit defaults when `sources` is absent (behavior unchanged from today).
- No per-metric `sources` override (override happens only via explicit command arguments).
- No `.gitignore` or `git ls-files` auto-detection.
- No support for `sources` in custom (non-built-in) metric commands.
- No inode-level deduplication in size calculation (simple `lstat` summation).
