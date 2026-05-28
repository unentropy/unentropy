# CLI Interface (Delta)

**Domain**: cli
**Extends**: `openspec/specs/cli/contracts/cli-interface.md`

## Overview

Adds one subcommand under the existing `unentropy import` tree: `seed-workflow`. It emits the canonical seed-workflow YAML used by the disposable-branch seeding ceremony for the `sqlite-artifact` storage backend. No other CLI surface changes.

## Command

```
unentropy import seed-workflow
  [--output <path>]            Write YAML to <path> instead of stdout.
  [--force]                    Overwrite <path> if it exists. Ignored without --output.
  [--config <path>]            Path to unentropy.json (default: ./unentropy.json).
```

## Behavior

- Reads `storage.type` and (when present) `storage.artifact.name` from `unentropy.json`.
- Refuses to emit if `storage.type` is not `sqlite-artifact` (exit 1 with a clear message).
- Substitutes the configured `artifactName` into the upload step's `name:` field. Defaults to `unentropy-metrics` when unspecified.
- Writes YAML to stdout when `--output` is omitted; to the path otherwise. With `--force`, overwrites an existing file at the path.
- Creates parent directories under `--output` when missing.

## Exit Codes

| Code | Meaning                                                                              |
| ---- | ------------------------------------------------------------------------------------ |
| 0    | YAML written successfully (to stdout or file).                                       |
| 1    | Wrong storage type, missing config, existing file without `--force`, or I/O failure. |

## Emitted YAML (canonical form)

```yaml
name: unentropy seed
on:
  push:
    branches: ["unentropy-import-*"]

permissions:
  contents: read

jobs:
  upload-seed:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/upload-artifact@v4
        with:
          name: <artifactName>
          path: seed.db
          if-no-files-found: error
          retention-days: 90
```

The branch pattern `unentropy-import-*` is fixed by convention so the agent skill driving the ceremony and the user inspecting the workflow agree on which branches the workflow runs against. The path `seed.db` is also fixed — the agent skill is responsible for placing the local database at that path on the disposable branch before pushing.

## Sample Stdout (default config)

```yaml
name: unentropy seed
on:
  push:
    branches: ["unentropy-import-*"]

permissions:
  contents: read

jobs:
  upload-seed:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/upload-artifact@v4
        with:
          name: unentropy-metrics
          path: seed.db
          if-no-files-found: error
          retention-days: 90
```

## Sample Refusal (wrong storage type)

```
error: 'seed-workflow' only applies to the sqlite-artifact backend
       current storage.type: sqlite-s3
       for sqlite-s3, upload your database directly with the AWS CLI or your existing tooling
```

## Common Behaviors

- Missing config produces the standard error: `Error: Config file not found: unentropy.json` (exit 1).
- No network calls. The command reads `unentropy.json` and writes YAML. Nothing else.
- Output format is stable: the YAML is byte-for-byte deterministic given the same configured `artifactName`, suitable for committing to a branch from an agent skill without diff churn.
