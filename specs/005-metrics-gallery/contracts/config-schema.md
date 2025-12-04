# Configuration Schema Contract: Metrics Gallery

**Feature**: 005-metrics-gallery  
**File**: `unentropy.json`  
**Version**: 3.0.0  
**Last Updated**: 2025-12-04

## Overview

This document extends the base configuration schema from 001-mvp-metrics-tracking to support simplified built-in metric references. The extension adds:

1. **`id` field**: Unique identifier for metrics (optional when `$ref` is provided - inherits from template)
2. **`name` field**: Optional display name (defaults to template name or id)
3. **Optional `command`**: When using `$ref`, command can be omitted to use built-in defaults
4. **`@collect` shortcut**: Direct in-process execution of built-in collectors

## Schema Changes

### Base Schema Reference

The base configuration schema is defined in `/specs/001-mvp-metrics-tracking/contracts/config-schema.md` and covers:
- `metrics`: Array of metric definitions
- `storage`: Optional storage configuration (from 003-unified-s3-action)
- `qualityGate`: Optional quality gate configuration (from 004-metrics-quality-gate)

### Extension: MetricConfig with Optional id and Command

```typescript
type UnitType = 'percent' | 'integer' | 'bytes' | 'duration' | 'decimal';

interface MetricConfig {
  // Unique identifier - required for custom metrics, optional with $ref (inherits from template)
  id?: string;
  
  // Optional reference to built-in metric template
  $ref?: string;
  
  // Optional display name (defaults to template name or id)
  name?: string;
  
  // Required when no $ref, optional when $ref provides default
  command?: string;
  
  // Required when no $ref, inherited when $ref present
  type?: 'numeric' | 'label';
  
  // Optional properties
  description?: string;
  unit?: UnitType;
  timeout?: number;
}
```

### Metrics Array (Unchanged Interface)

```typescript
interface UnentropyConfig {
  metrics: MetricConfig[];  // Accepts MetricConfig with id and optional $ref
  storage?: StorageConfig;
  qualityGate?: QualityGateConfig;
}
```

## Field Specifications

### id (Conditionally Required)

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | Conditional | Pattern: `^[a-z0-9-]+$`, Length: 1-64 chars | Unique identifier for this metric, used in thresholds, database storage, and internal references |

**Requirement Rules**:
- **Required** when no `$ref` is provided (custom metrics)
- **Optional** when `$ref` is provided - inherits `id` from the built-in template

**Validation Rules**:
- Must be lowercase with hyphens only
- Must be unique across all metrics after resolution
- Used as the primary key for quality gate thresholds
- Stored as `name` in database for backward compatibility

**Inheritance Behavior**:
- When `$ref` is provided and `id` is omitted, the template's `id` is used
- Example: `{ "$ref": "loc" }` resolves to `id: "loc"`

### $ref (Optional)

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `$ref` | string | No | Must match a built-in metric template ID | References a built-in metric template |

**Available Built-in Metric IDs** (v3.0.0):
- `coverage` - Test coverage percentage
- `function-coverage` - Function coverage percentage
- `loc` - Lines of code
- `bundle-size` - Production bundle size
- `build-time` - Build duration
- `test-time` - Test suite duration
- `dependencies-count` - Dependency count

### name (Optional Display Name)

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `name` | string | No | Max 256 characters | Human-readable display name for reports and charts |

**Default Behavior**:
- If `$ref` is provided and `name` is omitted, inherits from template's `name`
- If no `$ref` and `name` is omitted, defaults to `id`
- No regex constraint (can contain spaces, capitals, etc.)
- Used for display purposes only (charts, PR comments)

### command (Conditionally Required)

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `command` | string | Conditional | Max 1024 characters | Command to execute for metric collection |

**Requirement Rules**:
- **Required** when no `$ref` is provided
- **Optional** when `$ref` is provided and the built-in has a `defaultCommand`
- If `$ref` is provided but built-in has no `defaultCommand`, command is required

### @collect Shortcut

Commands starting with `@collect` are executed directly in-process without spawning a subprocess:

```
@collect <collector> <args...>
```

**Available Collectors**:
- `@collect loc <path> [--language <lang>] [--exclude <patterns>]`
- `@collect size <path|glob>` - Supports glob patterns
- `@collect coverage-lcov <path>`
- `@collect coverage-json <path>`
- `@collect coverage-xml <path>`

**Benefits**:
- Faster execution (no subprocess overhead)
- Consistent behavior across environments
- Glob pattern support for file matching

**Example**:
```json
{ "id": "src-loc", "$ref": "loc", "command": "@collect loc ./src --language TypeScript" }
{ "id": "bundle", "$ref": "bundle-size", "command": "@collect size .github/actions/*/dist/*.js" }
```

### Unit Types

The `unit` field accepts a semantic unit type that determines how metric values are formatted in reports and PR comments.

```typescript
type UnitType = 'percent' | 'integer' | 'bytes' | 'duration' | 'decimal';
```

| UnitType | Display Example | Description |
|----------|-----------------|-------------|
| `percent` | `85.5%` | Percentage values with 1 decimal |
| `integer` | `1,234` | Whole numbers with thousands separator |
| `bytes` | `1.5 MB` | Auto-scaling file sizes (B -> KB -> MB -> GB) |
| `duration` | `1m 30s` | Auto-scaling time (ms -> s -> m -> h) |
| `decimal` | `3.14` | Generic floating-point with 2 decimals |

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["metrics"],
  "properties": {
    "metrics": {
      "type": "array",
      "minItems": 1,
      "maxItems": 50,
      "items": {
        "oneOf": [
          {
            "type": "object",
            "description": "Built-in metric reference (id optional, inherits from template)",
            "required": ["$ref"],
            "properties": {
              "id": {
                "type": "string",
                "pattern": "^[a-z0-9-]+$",
                "minLength": 1,
                "maxLength": 64
              },
              "$ref": {
                "type": "string",
                "enum": [
                  "coverage",
                  "function-coverage",
                  "loc",
                  "bundle-size",
                  "build-time",
                  "test-time",
                  "dependencies-count"
                ]
              },
              "name": {
                "type": "string",
                "maxLength": 256
              },
              "description": {
                "type": "string",
                "maxLength": 256
              },
              "command": {
                "type": "string",
                "minLength": 1,
                "maxLength": 1024
              },
              "unit": {
                "type": "string",
                "enum": ["percent", "integer", "bytes", "duration", "decimal"]
              },
              "timeout": {
                "type": "number",
                "minimum": 1,
                "maximum": 300000
              }
            },
            "additionalProperties": false
          },
          {
            "type": "object",
            "description": "Custom metric definition (id required)",
            "required": ["id", "type", "command"],
            "properties": {
              "id": {
                "type": "string",
                "pattern": "^[a-z0-9-]+$",
                "minLength": 1,
                "maxLength": 64
              },
              "name": {
                "type": "string",
                "maxLength": 256
              },
              "type": {
                "type": "string",
                "enum": ["numeric", "label"]
              },
              "description": {
                "type": "string",
                "maxLength": 256
              },
              "command": {
                "type": "string",
                "minLength": 1,
                "maxLength": 1024
              },
              "unit": {
                "type": "string",
                "enum": ["percent", "integer", "bytes", "duration", "decimal"]
              },
              "timeout": {
                "type": "number",
                "minimum": 1,
                "maximum": 300000
              }
            },
            "additionalProperties": false
          }
        ]
      }
    },
    "storage": {
      "$comment": "Unchanged from existing schema"
    },
    "qualityGate": {
      "$comment": "Unchanged from existing schema"
    }
  }
}
```

## Example Configurations

### 1. Ultra-Minimal Configuration (id Inherited)

For metrics with default commands (`loc`, `bundle-size`):

```json
{
  "metrics": [
    { "$ref": "loc" },
    { "$ref": "bundle-size" }
  ]
}
```

This is equivalent to:
```json
{
  "metrics": [
    { "id": "loc", "$ref": "loc" },
    { "id": "bundle-size", "$ref": "bundle-size" }
  ]
}
```

**Note**: Metrics like `coverage` require a command (too technology-specific for defaults).

### 2. Built-in Metrics with @collect Commands

```json
{
  "metrics": [
    { "$ref": "coverage", "command": "@collect coverage-lcov coverage/lcov.info" },
    { "id": "src-loc", "$ref": "loc", "command": "@collect loc ./src --language TypeScript" },
    { "id": "test-loc", "$ref": "loc", "command": "@collect loc ./tests --language TypeScript" },
    { "id": "bundle", "$ref": "bundle-size", "command": "@collect size ./dist/*.js" }
  ]
}
```

### 3. Built-in Metrics with Display Names

```json
{
  "metrics": [
    { 
      "id": "test-coverage", 
      "$ref": "coverage", 
      "name": "Test Coverage",
      "command": "@collect coverage-lcov coverage/lcov.info"
    },
    { 
      "id": "src-size", 
      "$ref": "loc", 
      "name": "Source Lines of Code",
      "command": "@collect loc ./src"
    }
  ]
}
```

### 4. Mixed Built-in and Custom Metrics

```json
{
  "metrics": [
    { "$ref": "coverage", "command": "@collect coverage-lcov coverage/lcov.info" },
    { "$ref": "loc" },
    { 
      "id": "custom-score", 
      "type": "numeric", 
      "command": "./scripts/calculate-score.sh",
      "unit": "decimal"
    }
  ]
}
```

### 5. Complete Configuration with Quality Gate

```json
{
  "metrics": [
    { "$ref": "coverage", "command": "@collect coverage-lcov coverage/lcov.info" },
    { "$ref": "bundle-size" }
  ],
  "storage": {
    "type": "sqlite-s3"
  },
  "qualityGate": {
    "mode": "soft",
    "thresholds": [
      {
        "metric": "coverage",
        "mode": "no-regression",
        "tolerance": 0.5
      },
      {
        "metric": "bundle-size",
        "mode": "delta-max-drop",
        "maxDropPercent": 5
      }
    ]
  }
}
```

### 6. Using Glob Patterns

```json
{
  "metrics": [
    { 
      "id": "actions-bundle", 
      "$ref": "bundle-size", 
      "command": "@collect size .github/actions/*/dist/*.js"
    }
  ]
}
```

## Validation Rules

### id Validation

1. **Conditionally Required**: Required when no `$ref`, optional when `$ref` provided
2. **Inheritance**: When `$ref` provided and `id` omitted, inherits from template
3. **Unique**: No duplicate `id` values allowed after resolution
4. **Format**: Must match `^[a-z0-9-]+$` (lowercase, numbers, hyphens)
5. **Length**: 1-64 characters

### Reference Validation

1. **Valid $ref**: Must match one of the built-in metric IDs (case-sensitive)
2. **Command resolution**: If `$ref` has no `defaultCommand` and no user `command`, fail validation
3. **No type override**: Type is inherited from built-in metric and cannot be overridden

### Custom Metric Validation

1. **Required fields**: `id`, `type`, and `command` are all required when no `$ref`
2. **Type values**: Must be either `'numeric'` or `'label'`

### Quality Gate Threshold Validation

1. **Metric reference**: Threshold `metric` field must match a metric's resolved `id`
2. **Existence check**: Referenced metric must exist in configuration

## Edge Cases

### 1. Duplicate Implicit IDs

**Configuration**:
```json
{ "$ref": "loc" }
{ "$ref": "loc" }
```

**Behavior**: Both inherit `id: "loc"` -> duplicate error.

**Error Message**:
```
Duplicate metric id "loc" found.
When using the same $ref multiple times, provide explicit id values.
```

**Solution**:
```json
{ "id": "src-loc", "$ref": "loc", "command": "@collect loc ./src" }
{ "id": "test-loc", "$ref": "loc", "command": "@collect loc ./tests" }
```

### 2. Explicit ID Matches Another's Implicit ID

**Configuration**:
```json
{ "$ref": "loc" }
{ "id": "loc", "$ref": "coverage" }
```

**Behavior**: First inherits `id: "loc"`, second explicitly sets `id: "loc"` -> duplicate error.

**Error Message**:
```
Duplicate metric id "loc" found.
Metric ids must be unique within the configuration.
```

### 3. Explicit ID Matches Template ID (Valid)

**Configuration**:
```json
{ "id": "loc", "$ref": "loc" }
```

**Behavior**: Valid. Explicit id matches what would be inherited - no conflict.

### 4. Custom Metric Without ID

**Configuration**:
```json
{ "type": "numeric", "command": "echo 42" }
```

**Behavior**: No `$ref` to inherit from -> error.

**Error Message**:
```
Custom metrics (without $ref) require an "id" field.
```

### 5. Quality Gate References Inherited ID

**Configuration**:
```json
{
  "metrics": [{ "$ref": "loc" }],
  "qualityGate": {
    "thresholds": [{ "metric": "loc", "mode": "max", "target": 10000 }]
  }
}
```

**Behavior**: Valid. Threshold references `"loc"` which matches the inherited id.

### 6. Quality Gate References Template ID When Overridden

**Configuration**:
```json
{
  "metrics": [{ "id": "my-loc", "$ref": "loc" }],
  "qualityGate": {
    "thresholds": [{ "metric": "loc", "mode": "max", "target": 10000 }]
  }
}
```

**Behavior**: Error. User overrode id to `"my-loc"`, but threshold references `"loc"`.

**Error Message**:
```
Threshold references non-existent metric "loc".
Metric must be defined in the metrics array with a matching id.
```

**Solution**: Match threshold to the actual id:
```json
"thresholds": [{ "metric": "my-loc", "mode": "max", "target": 10000 }]
```

## Error Messages

### Missing id Field (Custom Metric)

```
Error: Custom metrics (without $ref) require an "id" field
Each metric requires a unique identifier for quality gate thresholds and database storage.
```

### Duplicate id

```
Error: Duplicate metric id "loc" found
When using the same $ref multiple times, provide explicit id values.
```

### Invalid $ref

```
Error: Invalid metric reference "$ref: unknown-metric"
Available built-in metrics: coverage, function-coverage, loc, bundle-size, 
build-time, test-time, dependencies-count
```

### Missing Command Without Default

```
Error: Metric "build-time" requires a command
The built-in metric "build-time" does not have a default command.
You must provide a command appropriate for your project.
```

### Invalid @collect Command

```
Error: Unknown collector "unknown" in command "@collect unknown ./path"
Available collectors: loc, size, coverage-lcov, coverage-json, coverage-xml
```

### Invalid Threshold Reference

```
Error: Threshold references non-existent metric "typo-coverage"
Metric must be defined in the metrics array with a matching id.
```

## Data Flow

```
unentropy.json (User Configuration)
         |
         v
+------------------+
| MetricConfig     |
| - id?            |  <- Optional with $ref (inherits from template)
| - $ref?          |
| - name?          |
| - command?       |
| - type?          |
| - unit?          |
+------------------+
         |
         v (Resolver)
+----------------------+
| ResolvedMetricConfig |
| - id                 |  <- Inherited from template if not provided
| - name (display)     |  <- Inherited from template if not provided
| - command            |  <- From defaultCommand if not provided
| - type               |
| - unit               |
| - description        |
+----------------------+
         |
         v (Collector)
         |
    +----+----+
    |         |
    v         v
@collect   Shell Command
(in-process)  (subprocess)
    |         |
    +----+----+
         |
         v
+----------------------+
| InsertMetricDef      |
| - name = id          |<-- id stored as name in DB
| - type               |
| - unit               |
| - description        |
+----------------------+
         |
         v
+----------------------+
| Database             |
| metric_definitions   |
| - name (= id)        |
| - type               |
| - unit               |
+----------------------+
```

## Backward Compatibility

### Breaking Changes from v2.0.0

1. **`id` field**: Now the primary identifier (optional with `$ref`, required for custom metrics)
2. **`name` repurposed**: `name` is now optional display name, not identifier
3. **Threshold references**: Quality gate thresholds must reference resolved `id`, not `name`

### Migration Path

**Before (v2.0.0)**:
```json
{
  "metrics": [
    { "$ref": "coverage", "name": "test-coverage", "command": "..." }
  ],
  "qualityGate": {
    "thresholds": [{ "metric": "test-coverage", "mode": "min", "target": 80 }]
  }
}
```

**After (v3.0.0)** - Option A (explicit id):
```json
{
  "metrics": [
    { "id": "test-coverage", "$ref": "coverage", "command": "..." }
  ],
  "qualityGate": {
    "thresholds": [{ "metric": "test-coverage", "mode": "min", "target": 80 }]
  }
}
```

**After (v3.0.0)** - Option B (inherited id, minimal):
```json
{
  "metrics": [
    { "$ref": "coverage" }
  ],
  "qualityGate": {
    "thresholds": [{ "metric": "coverage", "mode": "min", "target": 80 }]
  }
}
```

### Database Compatibility

- The database `metric_definitions.name` column stores the `id` value
- Existing databases will have metrics stored under old `name` values
- New runs will store metrics under `id` values
- No automatic migration; metrics with new `id` values appear as new metrics

## Versioning

**Version**: 3.0.0 (major version bump for breaking changes)

**Breaking Changes**:
- `id` field is now the primary identifier (replaces `name` for references)
- `name` repurposed as optional display name
- Quality gate thresholds reference `id` instead of `name`

**New Features**:
- `@collect` shortcut for in-process collector execution
- Glob pattern support in `@collect size`
- Optional `command` when `$ref` provides default
- Optional `id` when `$ref` provided (inherits from template)
- Ultra-minimal configuration: `{ "$ref": "loc" }`

**Future Compatibility**:
- New built-in metrics may be added in minor versions
- New collectors may be added in minor versions
- Schema structure will remain stable
