## Why

Users frequently need to verify which files are included in their analysis scope ("sources") without running a full metric collection or cross-referencing glob patterns manually. A command to list resolved source files gives immediate feedback on config correctness and helps debug unexpected include/exclude behavior.

## What Changes

- Add a new `sources` CLI command (`unentropy sources`) that resolves the `sources` patterns from `unentropy.json` and prints the matching file paths
- Support `--loc` flag to show lines-of-code per file in a two-column table
- Support `--sort name|loc` to control output ordering
- Support `--config` for custom config paths and `--absolute` for absolute paths
- Respect negation patterns and normalized glob expansion (same logic as existing collectors)

## Capabilities

### New Capabilities

- `sources` command in the CLI for listing analysis scope files

### Modified Capabilities

- `cli`: Add `sources` subcommand requirement to the CLI spec

## Impact

New file: `src/cli/cmd/sources.ts`. Uses the embedded `sloc` library (already a dependency) for per-file LOC when `--loc` is passed. No existing code changes needed beyond adding the command to the yargs router in `src/index.ts`.

### Documentation Impact

- [ ] No user-facing doc changes

## Non-goals

- Not a file tree browser or interactive file explorer
- No persistent metric storage — output is display-only
- No chart or report generation
