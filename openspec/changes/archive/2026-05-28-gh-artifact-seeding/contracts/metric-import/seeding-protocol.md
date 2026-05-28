# Disposable-Branch Seeding Protocol

**Domain**: metric-import

## Overview

Describes the full end-to-end ceremony that gets a locally-built `seed.db` from a developer's machine into a `sqlite-artifact` storage backend so the next CI run on the configured branch picks it up. The product's contribution to this protocol is intentionally small: the artifact provider's relaxed search, the `unentropy import seed-workflow` YAML emitter, and this document. Orchestration is owned by an external agent skill.

## Roles

- **User** — runs commands, approves remote actions.
- **Agent skill** — drives the multi-step ceremony non-interactively where possible, surfaces decisions where required. Lives outside the product (in a Claude Code / Copilot CLI plugin, in a shell script, etc.). NOT shipped as part of unentropy itself.
- **Product CLI** — provides `unentropy import` (already in `import-external-metrics`) and `unentropy import seed-workflow` (new in this change).
- **GitHub Actions** — runs the disposable-branch workflow and uploads the artifact via `actions/upload-artifact@v4`.
- **Artifact provider** — on the next CI run on the configured branch, discovers the seed via the relaxed search and downloads it.

## Sequence

```
laptop                                          github
──────                                          ──────
seed.db built via `unentropy import …` ─────────► (none)

agent skill orchestrates:
  1. unentropy import seed-workflow
     → .github/workflows/unentropy-seed.yml
  2. git checkout -b unentropy-import-<ts>
  3. mv built-db seed.db
  4. git add seed.db .github/workflows/unentropy-seed.yml
  5. git commit -m "chore(unentropy): seed (do not merge)"
  6. git push                                   ─►
                                                   workflow triggered (push event)
                                                   actions/upload-artifact@v4
                                                   uploads 'unentropy-metrics' artifact
                                                   workflow_run.head_branch = unentropy-import-<ts>
                                                ◄─ status: success
  7. delete remote branch                       ─►
  8. delete local branch
                                                   artifact persists; main is untouched

next push to main (normal CI):
  unentropy track-metrics action runs
  artifact provider searches 'unentropy-metrics' on 'main'    → none
  artifact provider falls back to any branch                  → finds seed
  downloads, uses as starting DB
  collects new metrics, persists                  ─►
                                                   actions/upload-artifact@v4
                                                   uploads 'unentropy-metrics' artifact
                                                   workflow_run.head_branch = main
                                                   (the canonical artifact from this point on)
```

## What the agent skill is responsible for

- Verifying `gh auth status` and that the working tree is clean.
- Generating the disposable branch name (timestamped, matching the `unentropy-import-*` pattern from the workflow's trigger).
- Calling `unentropy import seed-workflow --output .github/workflows/unentropy-seed.yml` to materialize the workflow.
- Placing the built database at `seed.db` at the repo root.
- Committing, pushing, polling the workflow run, and deleting the branch on success.
- Surfacing failures clearly: workflow timeout, push rejection, missing `gh` auth, etc.

## What the product is responsible for

- Emitting a deterministic seed-workflow YAML via the CLI helper.
- The artifact provider's relaxed search at first-run time.
- Logging the fallback when it fires so users (and agents) can verify the seed was picked up on the next CI run.

## Idempotency

- Re-running the ceremony before promotion: the agent skill detects an existing `unentropy-import-*` branch on the remote and either resumes (re-pushes if local seed differs, re-polls if workflow still pending) or refuses with guidance.
- Re-running after promotion: the canonical artifact already exists on the configured branch, so even if a stale seed lingers from a previous run, the artifact provider prefers the configured-branch artifact and the seed harmlessly ages out.

## Failure Modes

| Failure                                                         | Behavior                                                                                                                                                             |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Push rejected                                                   | Agent skill surfaces the remote message and aborts.                                                                                                                  |
| Workflow does not trigger within N seconds                      | Agent skill prints `gh run list --branch <disposable>` and exits 1.                                                                                                  |
| Workflow fails                                                  | Branch is left in place for inspection. Agent skill prints failure summary and aborts.                                                                               |
| User interrupts after push but before delete                    | Branch and uploaded artifact persist. The artifact will be picked up on next canonical CI run regardless; the orphan branch is cosmetic and can be deleted manually. |
| Seed never gets promoted (no CI runs against configured branch) | Seed ages out after retention window. User re-runs the ceremony with a fresh DB.                                                                                     |

## Notes

The workflow file lives only on the disposable branch. It is _never_ merged into the configured branch and leaves no permanent footprint. This is enforced by the branch-name trigger pattern (`unentropy-import-*`) — even if a user accidentally retained the file on another branch, the workflow would not fire for non-matching branch names.
