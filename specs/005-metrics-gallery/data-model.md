# Data Model: Metrics Gallery

**Feature**: 005-metrics-gallery  
**Date**: 2025-12-04  
**Updated**: 2025-12-06  
**Status**: Complete
**Version**: 4.0.0

## Overview

This document defines the data structures and entities for the Metrics Gallery feature. The feature extends the existing configuration model to support simplified metric template references with:

- Object key as the unique metric identifier
- Optional `name` field for display purposes
- Optional `command` when template provides a default
- `@collect` shortcut for in-process collector execution

## Core Entities

### 1. MetricTemplate

Represents a metric template in the registry.

```typescript
interface MetricTemplate {
  // Unique identifier used with $ref
  id: string;
  
  // Default display name (user can override)
  name: string;
  
  // What this metric measures
  description: string;
  
  // Metric type: numeric or label
  type: 'numeric' | 'label';
  
  // Semantic unit type for formatting
  unit?: UnitType;
  
  // Optional default command using @collect syntax
  command?: string;
}

type UnitType = 'percent' | 'integer' | 'bytes' | 'duration' | 'decimal';
```

**Note**: The `id` field is used with `$ref` in user configuration. The `name` field provides a default display name that users can override.

**Example**:
```typescript
{
  id: 'loc',
  name: 'Lines of Code',
  description: 'Total lines of code in the codebase',
  type: 'numeric',
  unit: 'integer',
  command: '@collect loc .'
}
```

---

### 2. MetricConfig (User Configuration)

The configuration interface for metrics, supporting both metric template references and custom metrics. The object key serves as the metric identifier.

```typescript
interface MetricConfig {
  // Optional: Reference to metric template
  $ref?: string;
  
  // Optional: Display name (defaults to template name or key)
  name?: string;
  
  // Conditional: Required when no $ref or $ref has no command
  command?: string;
  
  // Required when no $ref, inherited when $ref present
  type?: 'numeric' | 'label';
  
  // Optional properties
  description?: string;
  unit?: UnitType;
  timeout?: number;
}
```

**Validation Rules**:
- Object key must match `^[a-z0-9-]+$` (lowercase, numbers, hyphens)
- Object keys are inherently unique (JSON requirement)
- **When `$ref` is present**:
  - `command` optional if template has `command`
  - `name`, `type`, `unit`, `description` inherited from template unless overridden
- **When `$ref` is absent** (custom metric):
  - `type` and `command` are required

**Examples** (as object entries):

```typescript
// Ultra-minimal template reference
{ "loc": { $ref: 'loc' } }

// Template with custom command
{ "src-loc": { $ref: 'loc', command: '@collect loc ./src' } }

// Template with display name
{ "coverage": { $ref: 'coverage', name: 'Test Coverage', command: '...' } }

// Custom metric (no $ref)
{ "custom": { type: 'numeric', command: 'echo 42', unit: 'integer' } }
```

---

### 3. ResolvedMetricConfig

The fully resolved configuration after processing references and defaults.

```typescript
interface ResolvedMetricConfig {
  // From user config
  id: string;
  
  // Display name (from user or defaults to id)
  name: string;
  
  // Resolved command (from user or built-in default)
  command: string;
  
  // Resolved type (from user or built-in)
  type: 'numeric' | 'label';
  
  // Optional resolved properties
  description?: string;
  unit?: UnitType;
  timeout?: number;
}
```

---

## Configuration Schema

### UnentropyConfig

```typescript
interface UnentropyConfig {
  // Object of metric configurations (key is the metric identifier)
  metrics: Record<string, MetricConfig>;
  
  // Existing properties unchanged
  storage?: StorageConfig;
  qualityGate?: QualityGateConfig;
}
```

### QualityGate Thresholds

Thresholds reference metrics by their object key:

```typescript
interface MetricThresholdConfig {
  // References metric by key (matches key in metrics object)
  metric: string;
  
  mode: 'no-regression' | 'min' | 'max' | 'delta-max-drop';
  target?: number;
  tolerance?: number;
  maxDropPercent?: number;
  severity?: 'warning' | 'blocker';
}
```

---

## Data Flow

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        unentropy.json                               │
│  {                                                                  │
│    "metrics": {                                                     │
│      "src-loc": { "$ref": "loc", "command": "@collect..." }         │
│    }                                                                │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Configuration Loading                            │
│  1. Parse JSON                                                      │
│  2. Validate object keys match pattern ^[a-z0-9-]+$                 │
│  3. Keys are inherently unique (JSON requirement)                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Reference Resolution                             │
│  For each metric entry [key, config]:                               │
│  1. Set id = key                                                    │
│  2. If $ref: Look up MetricTemplate                                 │
│  3. Merge: user config overrides template defaults                  │
│  4. Set name from user, template, or default to key                 │
│  5. Set command from user or template.command                       │
│  6. Validate resolved config                                        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ResolvedMetricConfig                             │
│  {                                                                  │
│    id: 'src-loc',          // from object key                       │
│    name: 'src-loc',        // defaulted from key                    │
│    command: '@collect loc ./src',                                   │
│    type: 'numeric',        // from built-in                         │
│    unit: 'integer',        // from built-in                         │
│    description: 'Total lines of code...'                            │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Metric Collection                                │
│                                                                     │
│  ┌──────────────────────┐    ┌──────────────────────┐               │
│  │ @collect command?    │    │ Shell command        │               │
│  │                      │    │                      │               │
│  │ Parse collector name │    │ Spawn subprocess     │               │
│  │ Parse arguments      │    │ Capture stdout       │               │
│  │ Execute in-process   │    │ Parse output         │               │
│  │ ┌──────────────────┐ │    │                      │               │
│  │ │ Glob expansion   │ │    │                      │               │
│  │ │ (for size)       │ │    │                      │               │
│  │ └──────────────────┘ │    │                      │               │
│  │ Return value         │    │ Return value         │               │
│  └──────────────────────┘    └──────────────────────┘               │
│            │                           │                            │
│            └───────────┬───────────────┘                            │
│                        ▼                                            │
│              ┌──────────────────┐                                   │
│              │ Collected Value  │                                   │
│              │ numeric or label │                                   │
│              └──────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Database Storage                                 │
│                                                                     │
│  InsertMetricDefinition {                                           │
│    name: id,           // <-- id stored as name for compatibility   │
│    type: 'numeric',                                                 │
│    unit: 'integer',                                                 │
│    description: '...'                                               │
│  }                                                                  │
│                        │                                            │
│                        ▼                                            │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ metric_definitions                                          │    │
│  │ ┌────┬──────────┬─────────┬─────────┬─────────────────────┐ │    │
│  │ │ id │ name     │ type    │ unit    │ description         │ │    │
│  │ ├────┼──────────┼─────────┼─────────┼─────────────────────┤ │    │
│  │ │ 1  │ src-loc  │ numeric │ integer │ Total lines of code │ │    │
│  │ └────┴──────────┴─────────┴─────────┴─────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Quality Gate                                     │
│                                                                     │
│  Threshold: { metric: 'src-loc', mode: 'max', target: 10000 }       │
│                    │                                                │
│                    ▼                                                │
│  Lookup metric by id ('src-loc') in database                        │
│  Compare current value against threshold                            │
│  Generate pass/fail result                                          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Reports & Display                                │
│                                                                     │
│  Use `name` field for display (charts, PR comments)                 │
│  Use `id` for internal references and lookups                       │
│  Format values using `unit` type rules                              │
└─────────────────────────────────────────────────────────────────────┘
```

### Resolution Steps

1. **Load Configuration**: Parse JSON into `UnentropyConfig` structure
2. **Validate Keys**: Check object keys match pattern `^[a-z0-9-]+$`
3. **Resolve References**: For each metric entry `[key, config]`:
   - Set `id` = key
   - If `$ref` present: Look up metric template
   - If not found, throw validation error with available IDs
   - Set `name` from user config, or inherit from template, or default to key
   - Set `command` from user config, or use template's `command`
   - If no command available, throw validation error
   - Merge other template defaults with user overrides
4. **Validate Custom Metrics**: For metrics without `$ref`, ensure `type`, `command` present
5. **Validate Resolved**: Check final config against schema
6. **Return**: All metrics as `ResolvedMetricConfig` objects

### Example Resolution

**Input** (ultra-minimal for metrics with defaults):
```json
{
  "metrics": {
    "loc": { "$ref": "loc" },
    "size": { "$ref": "size" },
    "custom": { "type": "numeric", "command": "echo 42" }
  }
}
```

**Resolved Output**:
```typescript
[
  {
    id: 'loc',                // from object key
    name: 'Lines of Code',    // inherited from template
    command: '@collect loc .',  // from template.command
    type: 'numeric',
    unit: 'integer',
    description: 'Total lines of code in the codebase'
  },
  {
    id: 'size',        // from object key
    name: 'Bundle Size',      // inherited from template
    command: '@collect size ./dist',  // from template.command
    type: 'numeric',
    unit: 'bytes',
    description: 'Total size of production build artifacts'
  },
  {
    id: 'custom',             // from object key
    name: 'custom',           // defaulted from key
    command: 'echo 42',
    type: 'numeric'
  }
]
```

**Input** (with overrides):
```json
{
  "metrics": {
    "test-coverage": { "$ref": "coverage", "name": "Test Coverage", "command": "@collect coverage-lcov coverage/lcov.info" },
    "src-loc": { "$ref": "loc", "command": "@collect loc ./src" }
  }
}
```

**Resolved Output**:
```typescript
[
  {
    id: 'test-coverage',      // from object key
    name: 'Test Coverage',    // explicit override
    command: '@collect coverage-lcov coverage/lcov.info',  // explicit (required for coverage)
    type: 'numeric',
    unit: 'percent',
    description: 'Overall test coverage percentage across the codebase'
  },
  {
    id: 'src-loc',            // from object key
    name: 'Lines of Code',    // inherited from template
    command: '@collect loc ./src',  // explicit override
    type: 'numeric',
    unit: 'integer',
    description: 'Total lines of code in the codebase'
  }
]
```

---

## @collect Execution

### Simple CLI Delegation

The @collect shortcut simply delegates to the existing CLI infrastructure:

```typescript
// In runCommand() - src/collector/runner.ts
export async function runCommand(command: string, ...): Promise<CommandResult> {
  // Transform @collect commands to CLI invocations
  let commandToRun = command;
  if (command.trim().startsWith("@collect ")) {
    const collectArgs = command.trim().slice("@collect ".length);
    commandToRun = `bun src/index.ts collect ${collectArgs}`;
  }
  
  // Execute via shell (existing behavior)
  const execPromise = exec("sh", ["-c", commandToRun], { ... });
  // ...
}
```

### Execution Flow

```
User config:
  { command: "@collect loc ./src --language TypeScript" }
       ↓
runCommand() detects "@collect" prefix
       ↓
Transforms to:
  "bun src/index.ts collect loc ./src --language TypeScript"
       ↓
Executes via shell subprocess
       ↓
Existing CLI handles all parsing, validation, execution
       ↓
Returns result to collector
```

### Benefits

- **Zero Duplication**: Reuses 100% of existing CLI code
- **Perfect Consistency**: CLI and @collect are identical
- **Minimal Code**: Only 7 lines added
- **Automatic Updates**: CLI changes automatically work in @collect
- **No New Dependencies**: Uses existing shell execution infrastructure

### Glob Pattern Support

The `size` collector (in CLI) already supports glob patterns via Bun.Glob. When called via @collect, it inherits this functionality automatically.

---

## Metric Templates Registry

See [contracts/built-in-metrics.md](contracts/built-in-metrics.md) for the complete metric template definitions including all 7 templates with their metadata, recommended thresholds, and configuration examples.

---

## Error Scenarios

### 1. Same Key Used Twice

Not possible in valid JSON - object keys are inherently unique. JSON parsers will use the last value for duplicate keys.

### 2. Invalid Key Format

**Input**:
```json
{
  "metrics": {
    "My-Metric": { "$ref": "loc" }
  }
}
```

**Error**:
```
Invalid metric key "My-Metric"
Keys must be lowercase with hyphens only (pattern: ^[a-z0-9-]+$)
```

### 3. Invalid $ref

**Input**:
```json
{
  "metrics": {
    "my-metric": { "$ref": "unknown-metric" }
  }
}
```

**Error**:
```
Invalid metric reference "$ref: unknown-metric"
Available metric templates: coverage, function-coverage, loc, size, 
build-time, test-time, dependencies-count
```

### 4. Missing Command Without Default

**Input**:
```json
{
  "metrics": {
    "build-time": { "$ref": "build-time" }
  }
}
```

**Error**:
```
Metric "build-time" requires a command.
The metric template "build-time" does not have a default command.
You must provide a command appropriate for your project.
```

### 5. Unknown Collector

**Input**:
```json
{
  "metrics": {
    "my-loc": { "$ref": "loc", "command": "@collect unknown ./path" }
  }
}
```

**Error**:
```
Unknown collector "unknown" in command "@collect unknown ./path"
Available collectors: loc, size, coverage-lcov, coverage-json, coverage-xml
```

### 6. Quality Gate References Wrong Key

**Input**:
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

**Error**:
```
Threshold references non-existent metric "loc".
Available metrics: my-loc
```

### 7. Missing Required Fields (Custom Metric)

**Input**:
```json
{
  "metrics": {
    "my-metric": { "command": "echo 42" }
  }
}
```

**Error**:
```
Metric "my-metric" requires "type" field.
Custom metrics (without $ref) must specify both type and command.
```

---

## Relationship to Existing Data Model

### Database Storage

- The object key (metric id) is stored in the database as `metric_definitions.name`
- This maintains backward compatibility with existing queries
- Existing databases will have metrics under old identifiers
- New metrics are stored using their object key values

### Quality Gate Integration

- Thresholds reference metrics by object key
- Quality gate operates on resolved metrics
- No change to threshold evaluation logic

### Reports

- Charts and displays use `name` (display name) for labels
- Internal lookups use object key (id)
- Unit formatting follows `UnitType` rules

---

## Type Definitions Summary

```typescript
// Metric template
interface MetricTemplate {
  id: string;
  name: string;
  description: string;
  type: 'numeric' | 'label';
  unit?: UnitType;
  command?: string;
}

type UnitType = 'percent' | 'integer' | 'bytes' | 'duration' | 'decimal';

// User configuration (object key is the metric identifier)
interface MetricConfig {
  $ref?: string;              // Optional template reference
  name?: string;              // Optional display name (defaults to key)
  command?: string;           // Required when no $ref or template has no command
  type?: 'numeric' | 'label'; // Required when no $ref
  description?: string;
  unit?: UnitType;
  timeout?: number;
}

// Resolved configuration (all fields populated)
interface ResolvedMetricConfig {
  id: string;                 // From object key
  name: string;
  command: string;
  type: 'numeric' | 'label';
  description?: string;
  unit?: UnitType;
  timeout?: number;
}

// Collector types
interface CollectorResult {
  value: number | string;
}

interface Collector {
  name: string;
  execute: (args: string[]) => Promise<CollectorResult>;
}

// Config
interface UnentropyConfig {
  metrics: Record<string, MetricConfig>;  // Key is metric identifier
  storage?: StorageConfig;
  qualityGate?: QualityGateConfig;
}
```

---

## Implementation Notes

1. **Type Guards**:
   ```typescript
   function hasBuiltInRef(config: MetricConfig): config is MetricConfig & { $ref: string } {
     return '$ref' in config && typeof config.$ref === 'string';
   }
   
   function isCollectCommand(command: string): boolean {
     return command.startsWith('@collect ');
   }
   ```

2. **Validation Order**:
   - Validate object keys match pattern `^[a-z0-9-]+$`
   - Keys are inherently unique (JSON requirement)
   - If `$ref` present: validate exists, resolve defaults
   - If no `$ref`: validate `type` and `command` present
   - Validate resolved metric has command
   - Validate final metric against schema

3. **Export Strategy**:
   - `src/metrics/types.ts` - MetricTemplate, UnitType, CollectorResult
   - `src/metrics/registry.ts` - METRIC_TEMPLATES registry
   - `src/metrics/resolver.ts` - resolution logic
   - `src/metrics/collectors/index.ts` - collector registry and execution
   - `src/config/schema.ts` - MetricConfig schema (key-based)
