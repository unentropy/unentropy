## Why

The `unentropy import` command produces a local SQLite database. Users on the `sqlite-artifact` storage backend then need that database to land as the first GitHub Actions artifact so subsequent CI runs continue from it. GitHub Actions artifacts can only be created from inside a workflow run, and the existing artifact provider only finds artifacts uploaded from a workflow run whose `head_branch` matches the configured trend branch. A throwaway workflow on a disposable branch can upload the seed but its `head_branch` will never be `main`, so the seed is silently invisible to the next CI run on `main`.

This change closes that gap without introducing a new GitHub Action, new auth scope, or any permanent footprint on the user's default branch.

## What Changes

- Loosen the artifact provider's first-run search: when no artifact matching the configured `artifactName` is found on the configured `branchFilter`, fall back to the most recent artifact with that name from _any_ branch. The first successful CI run on the configured branch re-uploads with the correct `head_branch`, "promoting" the seed; the orphan ages out via GitHub's retention.
- Log the fallback path explicitly when it triggers, so the behavior is observable in run logs.
- Add a CLI helper subcommand `unentropy import seed-workflow` that prints a ready-to-commit workflow YAML for the disposable-branch seeding ceremony. No new code paths in the import pipeline.
- Document the ceremony (disposable branch → push → workflow uploads via `actions/upload-artifact@v4` → delete branch) in the README and in the design doc. The orchestration of branch creation, push, watch, and cleanup lives in a separate agent skill, not in the product.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `storage`: relax the artifact provider's first-run search to fall back across branches when the configured branch has no matching artifact.
- `cli`: add the `unentropy import seed-workflow` helper that emits the seed workflow YAML.

## Impact

- **Code:** ~10 lines in `src/storage/providers/sqlite-artifact.ts` (search fallback + log); a small `seed-workflow.ts` template + subcommand wiring under `src/cli/cmd/import.ts`. No schema change. No dependency change.
- **Database:** no changes.
- **GitHub Actions surface:** no new published action. The seed workflow uses `actions/upload-artifact@v4` directly.
- **Behavior change for existing users:** a tightened reading of the previous behavior (which never documented the cross-branch case) loosens by one rung. Quality gate / reporter consumers are unaffected because they read from the _download_ path; the change is only about which artifact gets downloaded on first run.

### Documentation Impact

- [ ] No user-facing doc changes
- [x] Contracts affect: `storage-provider-interface.md` (note the fallback), README (brief "seeding the artifact backend" pointer), and the canonical-import-format contract gets a forward link to the seed workflow contract.

## Non-goals

- A dedicated `unentropy/seed-artifact` GitHub Action. `actions/upload-artifact@v4` is sufficient; wrapping it in our own action would add nothing functional.
- A disposable _pull request_ ceremony. The originally-considered PR open/close dance is replaced by a simpler "push branch, wait, delete branch" flow.
- Orchestration of the seeding ceremony (branch creation, push, polling, cleanup). That lives in an agent skill, not in the product CLI.
- Cross-source merging during seeding. A user re-running `unentropy import` against the same DB simply re-pushes the seed; the previous seed is overwritten when promoted.
- Multi-branch seeding (e.g., separate seeds for `main` and `develop`). The fallback only fires when the configured branch has _no_ artifact; a configured-branch artifact always wins.
