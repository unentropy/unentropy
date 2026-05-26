## Why

The current `parseSize` implementation in `src/metrics/collectors/size.ts` uses a naive recursive walk via `readdir`/`stat` that has several bugs and edge-case gaps: it never calls `lstat` (both branches of the ternary on line 11 are `stat`), has no protection against permission errors (crashes on EACCES), no inode deduplication for hard links, and is single-threaded. Replacing it with the well-tested `get-folder-size` library eliminates these issues without reinventing the wheel.

## What Changes

- Replace the custom `getPathSize` / `parseSize` functions with the `get-folder-size` npm library (v5, zero dependencies)
- Remove the `--followSymlinks` CLI option from the `size` collector — symlinks are edge cases in CI build artifact measurement, and the library's `lstat`-based approach (always counting symlink inodes rather than following) is the correct default for our use case
- Update the contract documentation in `metrics/contracts/built-in-metrics.md` to reflect the removed option
- Update the CLI interface contract (`cli/contracts/cli-interface.md`) if it references this option

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `metrics`: The `size` collector's `--followSymlinks` option is removed. The collector always uses `lstat` semantics (symlinks are counted by their link entry size, not followed).

## Impact

- `src/metrics/collectors/size.ts` — full rewrite
- `src/cli/cmd/collect.ts` — remove `followSymlinks` option from `size` subcommand
- `src/collector/collect-runner.ts` — remove `followSymlinks` from size command handler
- `tests/integration/cli-helpers.test.ts` — adjust symlink test expectations
- `package.json` — add `get-folder-size` dependency, remove no deps
- `openspec/specs/metrics/contracts/built-in-metrics.md` — remove `--followSymlinks` from size options docs

### Documentation Impact

- [ ] No user-facing doc changes
- [x] Contracts affect: `built-in-metrics.md` (remove `--followSymlinks` option)

## Non-goals

- No changes to any other collector (loc, coverage-lcov, etc.)
- No changes to the `size` metric template in the registry — only the underlying collector implementation
- No performance optimization beyond what `get-folder-size` provides (parallelism via `Promise.all` is a bonus)
- No changes to the `@collect size` CLI syntax or output format
