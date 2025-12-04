# Configuration Schema Contract: Metrics Gallery

**Feature**: 005-metrics-gallery  
**File**: `unentropy.json`  
**Version**: 4.0.0  
**Last Updated**: 2025-12-06

## Overview

This document extends the base configuration schema from 001-mvp-metrics-tracking to support simplified metric template references. The extension adds:

1. **Object key as identifier**: The metrics object key serves as the unique metric identifier
2. **`name` field**: Optional display name (defaults to key or template name)
3. **Optional `command`**: When using `$ref`, command can be omitted to use template defaults
4. **`@collect` shortcut**: Direct in-process execution of built-in collectors

## Schema Changes

### Base Schema Reference

The base configuration schema is defined in `/specs/001-mvp-metrics-tracking/contracts/config-schema.md` and covers:
- `metrics`: Object of metric definitions (keyed by metric id)
- `storage`: Optional storage configuration (from 003-unified-s3-action)
- `qualityGate`: Optional quality gate configuration (from 004-metrics-quality-gate)

### Extension: MetricConfig with Optional Command

```typescript
type UnitType = 'percent' | 'integer' | 'bytes' | 'duration' | 'decimal';

interface MetricConfig {
  // Optional reference to built-in metric template
  $ref?: string;
  
  // Optional display name (defaults to template name or key)
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

### Metrics Object

```typescript
interface UnentropyConfig {
  metrics: Record<string, MetricConfig>;  // Key is the metric identifier
  storage?: StorageConfig;
  qualityGate?: QualityGateConfig;
}
```

## Field Specifications

### Object Key (Metric Identifier)

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| *(key)* | string | Yes | Pattern: `^[a-z0-9-]+$`, Length: 1-64 chars | Object key serves as the unique metric identifier, used in thresholds, database storage, and internal references |

**Validation Rules**:
- Must be lowercase with hyphens only
- Object keys are inherently unique (JSON requirement)
- Used as the primary key for quality gate thresholds
- Stored as `name` in database for backward compatibility

### $ref (Optional)

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `$ref` | string | No | Must match a metric template ID | References a metric template |

**Available Metric Template IDs** (v4.0.0):
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
- If no `$ref` and `name` is omitted, defaults to the object key
- No regex constraint (can contain spaces, capitals, etc.)
- Used for display purposes only (charts, PR comments)

### command (Conditionally Required)

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `command` | string | Conditional | Max 1024 characters | Command to execute for metric collection |

**Requirement Rules**:
- **Required** when no `$ref` is provided
- **Optional** when `$ref` is provided and the template has a `command`
- If `$ref` is provided but template has no `command`, command is required

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
{
  "metrics": {
    "src-loc": { "$ref": "loc", "command": "@collect loc ./src --language TypeScript" },
    "bundle": { "$ref": "bundle-size", "command": "@collect size .github/actions/*/dist/*.js" }
  }
}
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
      "type": "object",
      "minProperties": 1,
      "maxProperties": 50,
      "propertyNames": {
        "pattern": "^[a-z0-9-]+$",
        "minLength": 1,
        "maxLength": 64
      },
      "additionalProperties": {
        "oneOf": [
          {
            "type": "object",
            "description": "Built-in metric reference",
            "required": ["$ref"],
            "properties": {
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
            "description": "Custom metric definition",
            "required": ["type", "command"],
            "properties": {
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

### 1. Ultra-Minimal Configuration

For metrics with default commands (`loc`, `bundle-size`):

```json
{
  "metrics": {
    "loc": { "$ref": "loc" },
    "bundle-size": { "$ref": "bundle-size" }
  }
}
```

**Note**: Metrics like `coverage` require a command (too technology-specific for defaults).

**See [../data-model.md](../data-model.md#example-resolution) for detailed resolution examples with input/output configurations.**

### 2. Built-in Metrics with @collect Commands

```json
{
  "metrics": {
    "coverage": { "$ref": "coverage", "command": "@collect coverage-lcov coverage/lcov.info" },
    "src-loc": { "$ref": "loc", "command": "@collect loc ./src --language TypeScript" },
    "test-loc": { "$ref": "loc", "command": "@collect loc ./tests --language TypeScript" },
    "bundle": { "$ref": "bundle-size", "command": "@collect size ./dist/*.js" }
  }
}
```

### 3. Built-in Metrics with Display Names

```json
{
  "metrics": {
    "test-coverage": {
      "$ref": "coverage",
      "name": "Test Coverage",
      "command": "@collect coverage-lcov coverage/lcov.info"
    },
    "src-size": {
      "$ref": "loc",
      "name": "Source Lines of Code",
      "command": "@collect loc ./src"
    }
  }
}
```

### 4. Mixed Built-in and Custom Metrics

```json
{
  "metrics": {
    "coverage": { "$ref": "coverage", "command": "@collect coverage-lcov coverage/lcov.info" },
    "loc": { "$ref": "loc" },
    "custom-score": {
      "type": "numeric",
      "command": "./scripts/calculate-score.sh",
      "unit": "decimal"
    }
  }
}
```

### 5. Complete Configuration with Quality Gate

```json
{
  "metrics": {
    "coverage": { "$ref": "coverage", "command": "@collect coverage-lcov coverage/lcov.info" },
    "bundle-size": { "$ref": "bundle-size" }
  },
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
  "metrics": {
    "actions-bundle": {
      "$ref": "bundle-size",
      "command": "@collect size .github/actions/*/dist/*.js"
    }
  }
}
```

## Validation Rules

### Key Validation

1. **Required**: Every metric must have an object key
2. **Format**: Must match `^[a-z0-9-]+$` (lowercase, numbers, hyphens)
3. **Length**: 1-64 characters
4. **Unique**: Object keys are inherently unique (JSON requirement)

### Reference Validation

1. **Valid $ref**: Must match one of the metric template IDs (case-sensitive)
2. **Command resolution**: If `$ref` has no `command` and no user `command`, fail validation
3. **No type override**: Type is inherited from metric template and cannot be overridden

### Custom Metric Validation

1. **Required fields**: `type` and `command` are required when no `$ref`
2. **Type values**: Must be either `'numeric'` or `'label'`

### Quality Gate Threshold Validation

1. **Metric reference**: Threshold `metric` field must match a key in the `metrics` object
2. **Existence check**: Referenced metric must exist in configuration

## Edge Cases

### 1. Same Key Used Twice

Not possible in valid JSON - object keys are inherently unique. JSON parsers will use the last value for duplicate keys, but this is considered invalid configuration.

### 2. Key Matches Template ID (Valid)

**Configuration**:
```json
{
  "metrics": {
    "loc": { "$ref": "loc" }
  }
}
```

**Behavior**: Valid. Key matches the template id - this is the intended minimal usage.

### 3. Custom Metric

**Configuration**:
```json
{
  "metrics": {
    "my-metric": { "type": "numeric", "command": "echo 42" }
  }
}
```

**Behavior**: Valid. Object key `"my-metric"` serves as the metric identifier.

### 4. Quality Gate References Key

**Configuration**:
```json
{
  "metrics": {
    "src-loc": { "$ref": "loc" }
  },
  "qualityGate": {
    "thresholds": [{ "metric": "src-loc", "mode": "max", "target": 10000 }]
  }
}
```

**Behavior**: Valid. Threshold references `"src-loc"` which matches the object key.

### 5. Quality Gate References Wrong Key

**Configuration**:
```json
{
  "metrics": {
    "my-loc": { "$ref": "loc" }
  },
  "qualityGate": {
    "thresholds": [{ "metric": "loc", "mode": "max", "target": 10000 }]
  }
}
```

**Behavior**: Error. Threshold references `"loc"` but the object key is `"my-loc"`.

**Error Message**:
```
Threshold references non-existent metric "loc".
Available metrics: my-loc
```

## Error Messages

### Invalid Key Format

```
Error: Invalid metric key "My-Metric"
Keys must be lowercase with hyphens only (pattern: ^[a-z0-9-]+$)
```

### Invalid $ref

```
Error: Invalid metric reference "$ref: unknown-metric"
Available metric templates: coverage, function-coverage, loc, bundle-size, 
build-time, test-time, dependencies-count
```

### Missing Command Without Default

```
Error: Metric "build-time" requires a command
The metric template "build-time" does not have a default command.
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
Available metrics: coverage, bundle-size
```

### Missing Required Fields (Custom Metric)

```
Error: Metric "my-metric" requires "type" and "command" fields
Custom metrics (without $ref) must specify both type and command.
```

## Data Flow

```
unentropy.json (User Configuration)
         |
         v
+------------------+
| MetricConfig     |
| - key (id)       |  <- Object key is the identifier
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
| - id (from key)      |
| - name (display)     |  <- From template or defaults to key
| - command            |  <- From template.command if not provided
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
| - name = id (key)    |<-- key stored as name in DB
| - type               |
| - unit               |
| - description        |
+----------------------+
         |
         v
+----------------------+
| Database             |
| metric_definitions   |
| - name (= key)       |
| - type               |
| - unit               |
+----------------------+
```

## Versioning

**Version 4.0.0**:
- Changed `metrics` from array to object (key-based)
- Object key serves as metric identifier (replaces `id` field)
- Removed `id` field from MetricConfig
- Aligned with spec 001 v2.0.0

**Version 3.0.0**:
- `id` field as primary identifier
- `@collect` shortcut for in-process collector execution
- Optional `id` when `$ref` provided (inherits from template)

**Future Compatibility**:
- New metric templates may be added in minor versions
- New collectors may be added in minor versions
- Schema structure will remain stable
