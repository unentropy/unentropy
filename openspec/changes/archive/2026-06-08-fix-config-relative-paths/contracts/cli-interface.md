**Domain**: cli

Extends: `openspec/specs/cli/contracts/cli-interface.md`

# Config Directory Context

## Overview

When the `--config` option is provided to any unentropy command that loads a configuration file, the system establishes a **config root directory** from which all relative paths in metric commands and collector arguments are resolved. This enables users to run unentropy from any working directory while maintaining correct path resolution for project-specific files.

## Config Root Directory

### Derivation

| Condition                  | Config Root Directory                                                         |
| -------------------------- | ----------------------------------------------------------------------------- |
| `--config <path>` provided | `dirname(resolve(path))` — the directory containing the specified config file |
| No `--config` provided     | `process.cwd()` — the current working directory                               |

### TypeScript Interface

```typescript
export interface ResolvedUnentropyConfig {
  // ... existing fields ...
  basePath?: string; // Config root directory, absolute path
}
```

## Affected Commands

The following commands establish a config root directory when loading configuration:

- `unentropy test`
- `unentropy preview`
- `unentropy verify`
- `unentropy import`

## Path Resolution Behavior

### Shell Commands

When executing metric commands that are shell commands (not starting with `@collect`), the command SHALL be executed with the config root directory as the working directory (`cwd`).

**Example:**

Given config at `/home/user/project/unentropy.json`:

```json
{
  "metrics": {
    "coverage": {
      "type": "numeric",
      "command": "cat ./coverage/lcov.info | grep -c 'SF:'"
    }
  }
}
```

When run from `/tmp`:

```bash
bunx unentropy test --config /home/user/project/unentropy.json
```

The shell command executes in `/home/user/project`, resolving `./coverage/lcov.info` to `/home/user/project/coverage/lcov.info`.

### @collect Commands

All `@collect` collectors resolve their file/directory arguments against the config root directory before file system access.

**Example:**

Given config at `/home/user/project/unentropy.json`:

```json
{
  "metrics": {
    "lines-of-code": {
      "$ref": "loc",
      "command": "@collect loc ./src"
    }
  }
}
```

When run from `/tmp`:

```bash
bunx unentropy test --config /home/user/project/unentropy.json
```

The `loc` collector receives `./src` resolved to `/home/user/project/src`.

### Absolute Paths

Absolute paths (starting with `/` on Unix or a drive letter on Windows) are never modified and are used as-is regardless of config root directory.

### Environment Variables in Paths

Paths containing environment variable references (e.g., `$COVERAGE_DIR/lcov.info`) are resolved by the shell and are not modified by the config root directory logic.
