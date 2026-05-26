## Context

`src/metrics/collectors/size.ts` implements directory size calculation using a custom recursive `readdir`/`stat` loop. Analysis revealed bugs (line 11 never calls `lstat`, both branches use `stat`) and gaps: no permission error handling, no inode deduplication, sequential traversal. The `--followSymlinks` option is fragile — symlinks to directories are silently miscounted as single file inodes.

## Goals / Non-Goals

**Goals:**

- Replace the custom recursive implementation with the `get-folder-size` library
- Remove the `--followSymlinks` CLI option from the `size` collector
- Keep the external API identical: `@collect size <path|glob>` returns a number of bytes
- Keep glob support working (handled by existing `fast-glob` dependency)

**Non-Goals:**

- No changes to the `size` metric template in the registry
- No changes to any other collector
- No changes to CLI output format or exit codes

## Decisions

### Decision 1: Use `get-folder-size` v5

**Chosen**: `get-folder-size` (zero dependencies, ESM, last published Jul 2024).

**Alternatives considered:**

- **`readdirp` + manual sum**: More flexible but requires additional summing logic and error handling.
- **`fast-glob` + stat**: Already a dependency, but no inode dedup and stat-based approach still needs error wrapping.
- **Keep custom implementation and fix bugs**: Would need to add inode tracking, error handling, concurrency — essentially reimplement the library.

**Rationale**: `get-folder-size` handles all identified edge cases — `lstat`-based (safe from circular symlinks), inode deduplication via `Set`, `Promise.all` concurrency, error accumulation in loose mode, BigInt overflow protection. Zero dependencies keeps the footprint minimal.

### Decision 2: Remove `--followSymlinks` entirely

**Rationale**: The option was a premature abstraction. In CI build artifact measurement, symlinks are rare edge cases. The library's default `lstat` behavior (counting the symlink entry size rather than following) is the correct default. Users who need to follow symlinks can use a shell command with `du` instead.

### Decision 3: Keep glob support via `fast-glob`

`get-folder-size` accepts a single path. For glob patterns, the existing `fast-glob` call enumerates matches, then `get-folder-size` is called per match. This separation keeps each concern clean — glob expansion in one layer, size calculation in another.

## Risks / Trade-offs

- **[Breaking change]** Removing `--followSymlinks` could affect users who explicitly set it. → Mitigation: Search the codebase shows no internal use with the option enabled. Document removal in the contract delta.
- **[Accuracy]** `get-folder-size` returns actual size (sum of `st_size`) not disk usage (`st_blocks * block size`). → Same behavior as current implementation — this is expected for CI metrics.
- **[BigInt]** `get-folder-size` returns BigInt for folders ≥ 2^53 bytes. → Convert to Number for downstream compatibility; size collector output must be numeric for storage.

## Contracts Referenced

- `contracts/metrics/built-in-metrics.md` — `--followSymlinks` removal from size options

## File Changes

- `src/metrics/collectors/size.ts` — rewrite to use `get-folder-size`
- `src/cli/cmd/collect.ts` — remove `followSymlinks` option from `size` subcommand
- `src/collector/collect-runner.ts` — remove `followSymlinks` from `size` command handler
- `tests/integration/cli-helpers.test.ts` — update symlink test to match `lstat` behavior
- `package.json` — add `get-folder-size` dependency
- `openspec/specs/metrics/contracts/built-in-metrics.md` — remove `--followSymlinks` docs
