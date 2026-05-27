# Configuration Schema: Sources Block

**Domain**: sources-config

**Extends**: `openspec/specs/metrics/contracts/config-schema.md`

## Overview

This contract adds the top-level `sources` field to `unentropy.json`. It defines how users scope built-in collectors using micromatch patterns.

## Schema Definition

### Root Configuration Object (Sources Block)

```typescript
interface UnentropyConfig {
  // ... existing fields (metrics, storage, qualityGate, report)

  // NEW: Project scope for built-in collectors
  sources?: string[];
}
```

### Sources Field

```typescript
// Each element is a micromatch pattern.
// Non-negated patterns include files; `!`-prefixed patterns exclude.
// Order matters — last matching pattern wins.
type SourcesConfig = string[];
```

**Field Specifications**:

| Field     | Type       | Required | Constraints                      | Description                                                  |
| --------- | ---------- | -------- | -------------------------------- | ------------------------------------------------------------ |
| `sources` | `string[]` | No       | Min 1 element<br>Max 50 elements | Ordered array of micromatch patterns defining project scope. |

**Pattern Rules**:

| Pattern Form                    | Example               | Resolved Behavior                                         |
| ------------------------------- | --------------------- | --------------------------------------------------------- |
| Bare directory (exists on disk) | `"src"`               | Auto-expanded to `"src/**"`                               |
| Bare file (exists on disk)      | `"package.json"`      | Kept as literal `"package.json"`                          |
| Glob                            | `"src/**/*.ts"`       | Used as-is                                                |
| Negated glob                    | `"!src/**/*.test.ts"` | Used as-is                                                |
| Negated directory               | `"!node_modules"`     | Auto-expanded to `"!node_modules/**"` if directory exists |

## Validation Rules

- `sources` must be a non-empty array if present
- Each pattern must be a non-empty string
- Maximum 50 patterns
- Duplicate patterns are allowed but have no effect

## Collector Integration

### `loc` Collector

When `sources` is configured:

```
@collect loc           → discovers files via fast-glob(sources)
@collect loc ./src     → uses ./src, ignores sources
```

### `size` Collector

When `sources` is configured:

```
@collect size          → discovers files via fast-glob(sources), sums sizes
@collect size ./dist   → uses ./dist, ignores sources
```

### Coverage Collectors

Coverage collectors always filter parsed source files through `sources`:

```
@collect coverage-lcov ./coverage/lcov.info
  → parses lcov.info, includes only source files matching sources
```

## Example Configurations

### Minimal Sources

```json
{
  "sources": ["src", "tests"],
  "metrics": {
    "loc": { "$ref": "loc", "command": "@collect loc" }
  }
}
```

### Sources with Exclusions

```json
{
  "sources": ["src/**", "tests/**", "!node_modules/**", "!dist/**", "!coverage/**"],
  "metrics": {
    "loc": { "$ref": "loc", "command": "@collect loc" },
    "size": { "$ref": "size", "command": "@collect size" },
    "coverage": { "$ref": "coverage", "command": "@collect coverage-lcov ./coverage/lcov.info" }
  }
}
```

### Sources with Negation-Only

```json
{
  "sources": ["**/*", "!node_modules/**", "!.git/**"],
  "metrics": {
    "loc": { "$ref": "loc", "command": "@collect loc" }
  }
}
```

### Explicit Override

```json
{
  "sources": ["src/**"],
  "metrics": {
    "src-loc": { "$ref": "loc", "command": "@collect loc" },
    "test-loc": { "$ref": "loc", "command": "@collect loc ./tests" }
  }
}
```

In this example, `src-loc` uses `sources`, while `test-loc` ignores `sources` because `./tests` is explicitly provided.

## Validation Error Messages

**Empty sources array**:

```
Error: sources must contain at least one pattern
```

**Empty pattern**:

```
Error: sources pattern at index 2 cannot be empty
```

**Too many patterns**:

```
Error: sources cannot contain more than 50 patterns
```
