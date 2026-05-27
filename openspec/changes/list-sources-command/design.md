## Context

Unentropy's `sources` config defines the analysis scope via glob patterns (e.g., `["src", "tests", "!node_modules"]`). These patterns are normalized in `src/config/loader.ts:nomalizeSourcesPatterns()` and consumed by collectors via fast-glob. Currently there is no standalone command to resolve and preview the matched files — users must infer scope from collector behavior.

## Goals / Non-Goals

**Goals:**

- Add a `sources` CLI command that resolves `sources` patterns and prints matching file paths
- Support `--loc` flag for per-file LOC counts using the embedded `sloc` library
- Support `--sort name|loc` for output ordering
- Reuse existing config loading and sources normalization logic
- Use fast-glob for file discovery (same library as collectors)

**Non-Goals:**

- No changes to existing collectors or config schema
- No persistent metric storage — output is display-only

## Decisions

**New command file vs. subcommand**: `sources` gets its own top-level command file (`src/cli/cmd/sources.ts`) following the `cmd()` helper pattern used by `verify`, `test`, `init`, etc. This is simpler than adding to the `collect` subcommand tree and keeps the CLI discoverable.

**Glob resolution reuse**: The command calls `loadConfig()` (which normalizes sources) then passes the normalized patterns directly to fast-glob. This reuses the same normalization pipeline as collectors, guaranteeing consistent behavior.

**Output**: One path per line (default) or two-column table with `--loc`. Relative paths by default, absolute with `--absolute`. Default sort is alphabetical; `--sort loc` requires `--loc` and sorts ascending.

**LOC counting reuse**: When `--loc` is set, the command reads each discovered file and passes it through `sloc` (same library used by the `loc` collector). Files with extensions unsupported by `sloc` fall back to counting non-empty lines. This reuses the same counting infrastructure as collectors, guaranteeing consistent LOC numbers.

**No glob pattern validation beyond what `loadConfig` and fast-glob provide**: Invalid patterns produce fast-glob errors surfaced to the user.

**Per-file LOC is opt-in**: The basic `sources` command without `--loc` stays fast (just glob + print). The `--loc` flag adds a sequential file scan, which may be slower on large trees. A progress indicator or spinner is appropriate when `--loc` is active.

## Risks / Trade-offs

- Large source trees may produce many lines of output → no mitigation needed (pipe to `less` or `grep` as usual)
- Config loading errors (file not found, parse errors) reuse existing error messages from `loadConfig` → consistent with other commands
- `--loc` on large source trees (1000+ files) will be noticeably slower due to sequential file reads + `sloc` parsing → acceptable for a debugging tool; users can omit `--loc` for fast listing
- Individual file read errors with `--loc` (permissions, binary files) → skip with a warning rather than aborting the entire command

## Contracts Referenced

- `contracts/cli-interface.md`

## File Changes

- `src/cli/cmd/sources.ts` (new)
- `src/index.ts` (modified — register SourcesCommand)
- `tests/unit/cli/cmd/sources.test.ts` (new)
