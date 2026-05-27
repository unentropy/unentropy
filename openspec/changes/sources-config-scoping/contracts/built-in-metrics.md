# Built-in Metrics Registry Contract (Sources Update)

**Domain**: metrics

**Extends**: `openspec/specs/metrics/contracts/built-in-metrics.md`

## Overview

This contract updates the built-in collector signatures and behavior to support the `sources` configuration field.

## Updated Collector Signatures

### `loc` Collector

**Syntax**: `@collect loc [path] [options]`

**Changes**:

- `<path>` is now optional when `sources` is configured
- When `path` is omitted, discovers files using `fast-glob` with the `sources` pattern array
- When `path` is provided, behavior is unchanged (uses explicit path, ignores `sources`)

**Options** (unchanged):

- `--language <lang>` - Filter by specific language
- `--exclude <patterns>` - Exclude directories (applied in addition to `sources` exclusions)

**Example**:

```json
{
  "sources": ["src/**", "tests/**"],
  "metrics": {
    "loc": { "$ref": "loc", "command": "@collect loc" },
    "src-loc": { "$ref": "loc", "command": "@collect loc ./src" }
  }
}
```

---

### `size` Collector

**Syntax**: `@collect size [paths...]`

**Changes**:

- `<paths...>` is now optional when `sources` is configured
- When no paths are provided, discovers files using `fast-glob` with the `sources` pattern array and sums file sizes
- When paths are provided, behavior is unchanged (uses explicit paths, ignores `sources`)

**Example**:

```json
{
  "sources": ["dist/**"],
  "metrics": {
    "bundle-size": { "$ref": "size", "command": "@collect size" },
    "main-bundle": { "$ref": "size", "command": "@collect size ./dist/main.js" }
  }
}
```

---

### `coverage-lcov` Collector

**Syntax**: `@collect coverage-lcov <sourcePath> [options]`

**Changes**:

- `<sourcePath>` remains required (path to LCOV file)
- After parsing, source file paths (`SF:` records) are filtered through `sources`
- Files not matching `sources` are excluded from coverage calculation
- When `sources` is absent, all files in the report are included (unchanged behavior)

**Example**:

```json
{
  "sources": ["src/**"],
  "metrics": {
    "coverage": { "$ref": "coverage", "command": "@collect coverage-lcov ./coverage/lcov.info" }
  }
}
```

---

### `coverage-cobertura` Collector

**Syntax**: `@collect coverage-cobertura <sourcePaths...> [options]`

**Changes**:

- `<sourcePaths...>` remains required (paths to Cobertura XML files)
- After parsing, class file paths are filtered through `sources`
- Coverage percentage is recalculated from remaining file-level data (not from XML aggregates)
- When `sources` is absent, all classes are included (unchanged behavior)

**Example**:

```json
{
  "sources": ["src/**"],
  "metrics": {
    "coverage": {
      "$ref": "coverage",
      "command": "@collect coverage-cobertura ./coverage/report.xml"
    }
  }
}
```

---

### `coverage-clover` Collector

**Syntax**: `@collect coverage-clover <sourcePaths...> [options]`

**Changes**:

- `<sourcePaths...>` remains required (paths to Clover XML files)
- After parsing, file paths are filtered through `sources`
- Coverage percentage is recalculated from remaining file-level data (not from project aggregates)
- When `sources` is absent, all files are included (unchanged behavior)

**Example**:

```json
{
  "sources": ["src/**"],
  "metrics": {
    "coverage": { "$ref": "coverage", "command": "@collect coverage-clover ./coverage/clover.xml" }
  }
}
```

## Sources Filtering Behavior

### Matching Algorithm

For coverage filtering, each source file path from the report is tested against the `sources` pattern array using `micromatch.match()`:

```typescript
const isIncluded = micromatch.match([filePath], sourcesPatterns).length > 0;
```

This respects:

- Pattern ordering (last match wins)
- Negation patterns (`!`)
- Glob characters (`*`, `**`, `?`, `[...]`)

### Path Normalization

Before matching, paths are normalized:

1. Backslashes converted to forward slashes
2. Leading `./` removed

### Recalculation Strategy

When files are excluded, coverage percentages must be recalculated:

| Collector            | Type     | Recalculation Method                                          |
| -------------------- | -------- | ------------------------------------------------------------- |
| `coverage-lcov`      | line     | Filter `SF` records, regenerate summary                       |
| `coverage-cobertura` | line     | Filter `fileMap` entries, recompute union of covered lines    |
| `coverage-cobertura` | branch   | Filter class-level branch data, recompute totals              |
| `coverage-cobertura` | function | Filter methods by class filename, recompute covered ratio     |
| `coverage-clover`    | line     | Filter file entries, recompute union of covered stmt lines    |
| `coverage-clover`    | branch   | Filter file entries, sum `conditionals`/`coveredconditionals` |
| `coverage-clover`    | function | Filter file entries, sum `methods`/`coveredmethods`           |

## Error Handling

**Sources configured but collector receives no paths**:

- `loc` and `size` without explicit paths: use `sources` (no error)
- Coverage without report path: error (report path is always required)

**All files excluded by sources**:

- Returns `0` for coverage percentage
- Returns `0` for size
- Returns `0` for LOC

**Sources pattern matches no files**:

- `loc`: returns `0`
- `size`: returns `0`
