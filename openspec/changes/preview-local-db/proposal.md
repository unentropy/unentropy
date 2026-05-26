# Proposal: preview-local-db

## Why

The `preview` command currently generates HTML reports with synthetic placeholder data only. Users who collect metrics to a local SQLite database (via `sqlite-local` storage) have no CLI command to generate a real report from that data — they'd need to run a full GitHub Action workflow.

This means developers can't preview their actual metrics trends locally before pushing to CI, or generate reports from historical data stored on disk.

**Current state**: `unentropy preview` reads config only → generates synthetic HTML.

**Desired state**: `unentropy preview --db <path>` reads config + local SQLite DB → generates real HTML report. No `--db` keeps the existing synthetic behavior.

## What Changes

- Add `--db` option to `preview` command (required parameter, no default)
- When `--db` is provided: validate DB exists, open read-only, call `generateReport()` with real data
- Use `basename(process.cwd())` as the repository name for local reports
- Keep existing synthetic preview as the fallback when `--db` is omitted

## Non-goals

- This proposal does NOT add a `--repo` flag (the repository name is derived from the current directory)
- This proposal does NOT add a `collect` or `test --store` command to write to local DB (that's a separate workflow concern)
- This proposal does NOT change the GitHub Action or any storage provider behavior
- This proposal does NOT add preview toggle configuration (force on/off)

## Impact

### Affected Files

- `src/cli/cmd/preview.ts` — add `--db` option and branching logic

### User Impact

- Users with a local SQLite DB (`unentropy.db`) can now generate real reports via CLI
- Existing `preview` users are unaffected (backward compatible)

### Documentation Impact

- CLI help text for `preview` will describe the `--db` option
- If user docs exist, the `preview` section should mention local DB usage

## Risks

- **None**: This is a purely additive change with no behavioral impact on existing paths
