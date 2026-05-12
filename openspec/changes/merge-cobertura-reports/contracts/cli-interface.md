# CLI Interface Contract

**Domain**: cobertura-merge

## Overview

The `coverage-cobertura` CLI subcommand is enhanced to accept multiple source paths, merging their coverage data into a single result.

## Command: `collect coverage-cobertura`

### Syntax

```
unentropy collect coverage-cobertura <sourcePaths...> [options]
```

### Positional Arguments

| Argument      | Type       | Description                                         |
| ------------- | ---------- | --------------------------------------------------- |
| `sourcePaths` | `string[]` | One or more paths to Cobertura XML files (variadic) |

### Options

| Option       | Alias | Type     | Default | Description                                    |
| ------------ | ----- | -------- | ------- | ---------------------------------------------- |
| `--type`     | `-t`  | `string` | `line`  | Coverage type: `line`, `branch`, or `function` |
| `--fallback` |       | `number` | `0`     | Fallback value if all files fail to parse      |

### Exit Codes

| Code | Condition                                                     |
| ---- | ------------------------------------------------------------- |
| `0`  | Success — coverage value printed to stdout                    |
| `1`  | Error — no valid files provided, parse error without fallback |

### Output

Prints a single numeric coverage value (0–100) to stdout.

### Usage Examples

#### Single file (backward compatible)

```bash
unentropy collect coverage-cobertura ./coverage/cobertura.xml
```

#### Multiple files

```bash
unentropy collect coverage-cobertura ./coverage/report1.xml ./coverage/report2.xml
```

#### With glob pattern (shell-expanded)

```bash
unentropy collect coverage-cobertura ./coverage/*-cobertura.xml
```

#### With type option

```bash
unentropy collect coverage-cobertura ./coverage/report1.xml ./coverage/report2.xml --type branch
```

### Error Behavior

- If any file path does not exist or is unreadable, execution stops with an error identifying the problematic file
- If zero source paths are provided, execution fails with an error
- With `--fallback`, return the fallback value only if all files fail; if any file succeeds, use the merge result
