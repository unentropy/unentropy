# Storage Provider Interface (Delta)

**Domain**: storage
**Extends**: `openspec/specs/storage/contracts/storage-provider-interface.md`

## Overview

The `StorageProvider` interface and its lifecycle (`initialize()`, `persist()`, `cleanup()`) are unchanged. This delta only refines the _internal_ search behavior of `SqliteArtifactStorageProvider.initialize()` to handle the seeding case.

## Behavior Refinement (Artifact Provider)

The artifact search inside `initialize()` follows a two-step lookup:

1. List artifacts in the repo matching the configured `artifactName`. Filter to those whose `workflow_run.head_branch === branchFilter`. If any match, use the most recent.
2. If step 1 yielded nothing, **and** there is at least one artifact in the repo matching `artifactName` from any branch, use the most recent of those. Log a single informational line at INFO level identifying the fallback source branch and run id:

   ```
   No '<artifactName>' artifact on '<branchFilter>'; using seed from '<source-branch>' (run <run-id>).
   ```

3. If step 1 and step 2 both yield nothing, proceed with the existing `firstRun` path (create an empty database).

Pseudocode (added to the existing `tryDownloadLatestArtifact`):

```ts
const all = await listArtifactsByName(this.artifactName);
const onBranch = all.filter((a) => a.workflow_run?.head_branch === this.branchFilter);
const chosen = onBranch[0] ?? all[0]; // most recent on branch, else most recent anywhere
if (!chosen) return false;

if (!onBranch[0] && chosen) {
  console.log(
    `No '${this.artifactName}' artifact on '${this.branchFilter}'; ` +
      `using seed from '${chosen.workflow_run?.head_branch}' (run ${chosen.workflow_run?.id}).`
  );
}

return this.downloadArtifact(this.token, this.repository, chosen.id);
```

## Invariants Preserved

- An artifact from the configured branch always wins over any non-canonical artifact. The fallback only fires when the configured branch has _zero_ matching artifacts.
- No new auth scope; uses the same `GITHUB_TOKEN` the provider already requires.
- The fallback is bounded by GitHub's artifact retention (default 90 days). After that window, an unpromoted seed silently expires and a fresh first-run is required.
- `persist()` behavior is unchanged: the provider's no-op + the composite action's `actions/upload-artifact@v4` step continue to handle uploads from CI runs.

## Compatibility

- Existing CI flows (artifact uploaded from the configured branch, found from the configured branch) are byte-for-byte unchanged.
- Repositories that have never been seeded see no behavior change unless an artifact from another branch happens to exist with the matching name — in which case the new fallback uses it, which is the desired seeding outcome.
- Tests that fixture an empty artifact listing continue to pass through to `firstRun=true`.
