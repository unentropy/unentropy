## Context

The `import-external-metrics` change deliberately stopped at "produce a local SQLite file." Moving that file into the `sqlite-artifact` backend was punted to "an agent skill driving a disposable-PR ceremony." A closer look at the existing artifact provider reveals that the ceremony has a subtle blocker we did not call out at the time: the provider's search filter on `workflow_run.head_branch === branchFilter` means a seed uploaded from any branch other than the configured one is silently invisible to the next CI run on that configured branch.

This change resolves that blocker with the smallest possible product-side intervention, keeps orchestration outside the product, and avoids publishing a new GitHub Action. The seeding ceremony itself simplifies in the process — the originally-considered "disposable PR open and close" dance is replaced by a plain "push branch, wait, delete branch" flow, since the only purpose of the PR was to be observable, and a remote branch is already observable in GitHub's UI.

## Goals / Non-Goals

**Goals**

- Let a locally-built seed database reach the `sqlite-artifact` backend without permanent footprint on the configured branch.
- Use only `actions/upload-artifact@v4` and the user's existing `GITHUB_TOKEN` — no new published action, no PAT with workflow scope.
- Keep the product change to the smallest piece that genuinely needs to live inside unentropy: the provider's first-run search relaxation, plus a workflow YAML emitter to keep the template synchronized across documentation and tooling.
- Keep the disposable-branch ceremony simple enough that an agent skill can drive it reliably and a human can complete it manually if needed.

**Non-Goals**

- A dedicated `unentropy/seed-artifact` GitHub Action.
- Disposable _pull request_ ceremony (with open/close steps).
- Orchestration of branch creation, push, polling, and cleanup inside the product CLI.
- Cross-source merging, multi-branch seeding, or incremental syncing.
- Solving "seeding" for the `sqlite-s3` backend (users there can upload directly with the AWS CLI; no GitHub-runtime constraint applies).

## Decisions

### D1. Loosen the artifact search, do not change the upload path.

When `findLatestArtifactByName` finds nothing on the configured branch, fall back to the most recent artifact with the same name from any branch. Log the fallback at INFO level identifying source branch and run id.

**Why this over a marker convention (`unentropy-metrics-seed` suffix):** the marker approach is more explicit but costs us a second GitHub API call and adds a name to document for users who write their own seed workflows. The relaxed-search approach is one filter change with a single log line; it adds no new vocabulary. The only theoretical downside — a rogue branch uploading a same-named artifact and being picked up by mistake — is constrained by the fact that nothing else in the unentropy ecosystem produces artifacts under that name, and that fallback only fires when the configured branch has _zero_ matching artifacts (so the canonical case is unaffected).

**Why this over a stricter scheme involving artifact metadata:** GitHub Actions artifacts have no first-class "tag" or "label" surface. Filtering on `workflow_run.head_branch` is what we already do, and a fallback to "any branch" is the smallest tweak that solves the problem.

### D2. Do not write a new GitHub Action.

`actions/upload-artifact@v4` is exactly the primitive we need. Wrapping it in our own composite action (`unentropy/seed-artifact`) would add a release surface, a version-pinning concern, and approximately zero functional value. The seed workflow YAML is 16 lines including comments; users can read it, and an agent can emit it.

### D3. The seed workflow YAML is canonical and emitted by the CLI.

A hand-authored snippet in documentation drifts. A snippet in an agent skill couples that skill to a specific unentropy version. Emitting the YAML from the product via `unentropy import seed-workflow` makes the product the single source of truth: any agent skill, blog post, or human user gets the YAML in lockstep with whatever artifact name and workflow conventions the installed unentropy version expects.

**Why include this in the product even though orchestration lives outside it:** the YAML _is_ a contract between the product (artifact name, branch trigger pattern) and the seeding actor. A contract should be emitted, not duplicated.

### D4. Push, do not open a PR.

The earlier sketch involved a disposable PR opened and closed without merging. The PR's purpose was observability: a closed PR leaves a visible artifact in the project's history. But pushing a branch is equally visible in GitHub's UI (under Branches), and deleting that branch is a single API call. Removing the PR step trims four orchestration steps from the agent skill (create PR, wait, comment-and-close, delete branch) down to two (push, delete branch). The branch trigger pattern (`unentropy-import-*`) gives the same "is this a seed event?" filter that a PR title prefix would have given.

### D5. Workflow triggers on `push`, with a branch pattern that hardens it against accidental reuse.

`on: push: branches: ["unentropy-import-*"]` ensures:

- Pushing the disposable branch fires the workflow immediately (no separate dispatch step).
- The workflow file landing on any other branch by accident (rebase mistakes, a user committing it to `main` by hand) does not fire the workflow there.
- A human reading the workflow can see, at the top of the file, exactly which branch names will trigger it.

### D6. `seed.db` lives at the repo root on the disposable branch.

Convention. The agent skill places it there before commit/push; the workflow reads it from there. Hardcoding the path keeps the emitted YAML deterministic (good for diffs and idempotency) and means there is one fewer flag to pass.

## Risks / Trade-offs

- **A rogue branch uploads an artifact named `unentropy-metrics`** → on a first-run with no canonical-branch artifact, the rogue could be picked up. Mitigation: the fallback fires only on first-run misses; once any canonical-branch artifact exists, the canonical artifact always wins. The log line identifies the source branch so an unexpected fallback is auditable. In practice nothing else in the ecosystem produces artifacts under that name.
- **Seed never gets promoted because the configured-branch CI does not run** → after GitHub's retention window (90 days default), the seed expires silently. Mitigation: document this in the seed-workflow's emitted YAML as a comment block, and in the seeding-protocol contract.
- **Seed workflow gets disabled at the org level by branch protection rules** → workflow does not run on the disposable branch, so no upload. Mitigation: out of our hands; agent skill surfaces the workflow failure clearly and the user fixes org policy.
- **Agent skill drift** → because orchestration lives outside the product, an old skill version might generate the wrong YAML. Mitigation: the skill calls `unentropy import seed-workflow` rather than carrying its own template, so the product is the single source of truth.
- **Artifact retention defaults differ across orgs** → some users may have shorter retentions; the seed could expire faster than they expect. Mitigation: the emitted YAML pins `retention-days: 90`, which is GH's default; users with custom defaults can edit the file if needed.

## Contracts Referenced

- `contracts/storage/storage-provider-interface.md` — the relaxed search behavior.
- `contracts/cli/cli-interface.md` — the `seed-workflow` subcommand.
- `contracts/metric-import/seeding-protocol.md` — the end-to-end ceremony.

## File Changes

**New**

- `src/cli/cmd/import-seed-workflow.ts` (or a function added under `src/cli/cmd/import.ts` and registered as a subcommand) — emits the canonical YAML.
- `tests/unit/cli/import-seed-workflow.test.ts` — YAML emission with default and custom artifact names, refusal on non-artifact storage, stdout vs file output, parent-dir creation, refuse-without-force.
- `tests/integration/cli-import-seed-workflow.test.ts` — invoking the subcommand against a fixture `unentropy.json`, verifying the YAML parses and contains the expected `name:` and `path:` values.
- `tests/unit/storage/providers/sqlite-artifact-seed-fallback.test.ts` — given a mocked artifact listing with no rows on the configured branch and rows on a seeding branch, assert the fallback returns the seed and logs the expected line.

**Modified**

- `src/storage/providers/sqlite-artifact.ts` — broaden `findLatestArtifactByName` per `contracts/storage/storage-provider-interface.md`. Add the INFO log when the fallback fires.
- `src/cli/cmd/import.ts` — register the `seed-workflow` subcommand on the existing `import` builder.
- `README.md` — one-line pointer in the "Importing history" section: "for the artifact backend, also see `unentropy import seed-workflow --help`."

**Documentation (not code)**

- The agent skill that orchestrates the ceremony lives outside this repo (in whatever plugin marketplace ships it). Out of scope for these tasks; coordinated separately.
