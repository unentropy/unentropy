# Data Model: Metrics Gallery

**Feature**: 005-metrics-gallery  
**Date**: 2025-12-04  
**Status**: Complete
**Version**: 2.0.0

## Overview

This document defines the data structures and entities for the Metrics Gallery feature. The feature extends the existing configuration model to support simplified built-in metric references with:

- Required `id` field as the unique identifier
- Optional `name` field for display purposes
- Optional `command` when built-in provides a default
- `@collect` shortcut for in-process collector execution

## Core Entities

### 1. MetricTemplate (Built-in Metric Definition)

Represents a built-in metric template in the registry.

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
  defaultCommand?: string;
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
  defaultCommand: '@collect loc .'
}
```

---

### 2. MetricConfig (User Configuration)

The configuration interface for metrics, supporting both built-in references and custom metrics.

```typescript
interface MetricConfig {
  // Conditional: Required for custom metrics, optional with $ref (inherits from template)
  id?: string;
  
  // Optional: Reference to built-in metric template
  $ref?: string;
  
  // Optional: Display name (defaults to template name or id)
  name?: string;
  
  // Conditional: Required when no $ref or $ref has no defaultCommand
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
- **When `$ref` is present**:
  - `id` optional - inherits from template if not provided
  - `command` optional if built-in has `defaultCommand`
  - `name`, `type`, `unit`, `description` inherited from built-in unless overridden
- **When `$ref` is absent** (custom metric):
  - `id`, `type`, and `command` are required
- `id` must be unique across all metrics after resolution
- `id` must match `^[a-z0-9-]+$`

**Examples**:

```typescript
// Ultra-minimal built-in reference (id inherited as 'loc')
{ $ref: 'loc' }

// Explicit id (same as above, but explicit)
{ id: 'loc', $ref: 'loc' }

// Built-in with custom command and explicit id
{ id: 'src-loc', $ref: 'loc', command: '@collect loc ./src' }

// Built-in with display name (id inherited as 'coverage')
{ $ref: 'coverage', name: 'Test Coverage' }

// Custom metric (no $ref - id required)
{ id: 'custom', type: 'numeric', command: 'echo 42', unit: 'integer' }
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
  // Array of metric configurations
  metrics: MetricConfig[];
  
  // Existing properties unchanged
  storage?: StorageConfig;
  qualityGate?: QualityGateConfig;
}
```

### QualityGate Thresholds

Thresholds reference metrics by their `id`:

```typescript
interface MetricThresholdConfig {
  // References metric by id (not name)
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
│    "metrics": [                                                     │
│      { "id": "src-loc", "$ref": "loc", "command": "@collect..." }   │
│    ]                                                                │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Configuration Loading                            │
│  1. Parse JSON                                                      │
│  2. Validate against MetricConfigSchema                             │
│  3. Check id uniqueness                                             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Reference Resolution                             │
│  For each metric with $ref:                                         │
│  1. Look up MetricTemplate by $ref key                              │
│  2. Merge: user config overrides template defaults                  │
│  3. Set name = id if not provided                                   │
│  4. Set command from user or template.defaultCommand                │
│  5. Validate resolved config                                        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ResolvedMetricConfig                             │
│  {                                                                  │
│    id: 'src-loc',                                                   │
│    name: 'src-loc',        // defaulted from id                     │
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
2. **Validate Schema**: Check required fields and formats
3. **Resolve References**: For each metric with `$ref`:
   - Look up built-in metric by key
   - If not found, throw validation error with available IDs
   - Set `id` from user config, or inherit from template
   - Set `name` from user config, or inherit from template, or default to `id`
   - Set `command` from user config, or use template's `defaultCommand`
   - If no command available, throw validation error
   - Merge other built-in defaults with user overrides
4. **Check Uniqueness**: Ensure all resolved `id` values are unique
5. **Validate Custom Metrics**: For metrics without `$ref`, ensure `id`, `type`, `command` present
6. **Validate Resolved**: Check final config against schema
7. **Return**: All metrics as `ResolvedMetricConfig` objects

### Example Resolution

**Input** (ultra-minimal for metrics with defaults):
```json
{
  "metrics": [
    { "$ref": "loc" },
    { "$ref": "bundle-size" },
    { "id": "custom", "type": "numeric", "command": "echo 42" }
  ]
}
```

**Resolved Output**:
```typescript
[
  {
    id: 'loc',                // inherited from template
    name: 'Lines of Code',    // inherited from template
    command: '@collect loc .',  // from defaultCommand
    type: 'numeric',
    unit: 'integer',
    description: 'Total lines of code in the codebase'
  },
  {
    id: 'bundle-size',        // inherited from template
    name: 'Bundle Size',      // inherited from template
    command: '@collect size ./dist',  // from defaultCommand
    type: 'numeric',
    unit: 'bytes',
    description: 'Total size of production build artifacts'
  },
  {
    id: 'custom',
    name: 'custom',           // defaulted from id
    command: 'echo 42',
    type: 'numeric'
  }
]
```

**Input** (with overrides):
```json
{
  "metrics": [
    { "id": "test-coverage", "$ref": "coverage", "name": "Test Coverage", "command": "@collect coverage-lcov coverage/lcov.info" },
    { "id": "src-loc", "$ref": "loc", "command": "@collect loc ./src" }
  ]
}
```

**Resolved Output**:
```typescript
[
  {
    id: 'test-coverage',      // explicit override
    name: 'Test Coverage',    // explicit override
    command: '@collect coverage-lcov coverage/lcov.info',  // explicit (required for coverage)
    type: 'numeric',
    unit: 'percent',
    description: 'Overall test coverage percentage across the codebase'
  },
  {
    id: 'src-loc',            // explicit override
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

### Collector Registry

```typescript
interface CollectorResult {
  value: number | string;
}

interface Collector {
  name: string;
  execute: (args: string[]) => Promise<CollectorResult>;
}

const collectors: Record<string, Collector> = {
  'loc': { name: 'loc', execute: executeLocCollector },
  'size': { name: 'size', execute: executeSizeCollector },
  'coverage-lcov': { name: 'coverage-lcov', execute: executeLcovCollector },
  'coverage-json': { name: 'coverage-json', execute: executeJsonCollector },
  'coverage-xml': { name: 'coverage-xml', execute: executeXmlCollector },
};
```

### Execution Flow

```typescript
async function executeCollectCommand(command: string): Promise<CollectorResult> {
  // 1. Parse command: "@collect loc ./src --language TypeScript"
  const [, collectorName, ...args] = command.split(/\s+/);
  
  // 2. Look up collector
  const collector = collectors[collectorName];
  if (!collector) {
    throw new Error(`Unknown collector: ${collectorName}`);
  }
  
  // 3. Execute collector with parsed args
  return collector.execute(args);
}
```

### Glob Pattern Support

The `size` collector supports glob patterns:

```typescript
async function executeSizeCollector(args: string[]): Promise<CollectorResult> {
  const pattern = args[0];
  
  // Expand glob pattern
  const glob = new Bun.Glob(pattern);
  const files = await Array.fromAsync(glob.scan());
  
  // Sum sizes
  let totalSize = 0;
  for (const file of files) {
    totalSize += await getFileSize(file);
  }
  
  return { value: totalSize };
}
```

---

## Built-in Metrics Registry

```typescript
const BUILT_IN_METRICS: Record<string, MetricTemplate> = {
  'coverage': {
    id: 'coverage',
    name: 'Coverage',
    description: 'Overall test coverage percentage across the codebase',
    type: 'numeric',
    unit: 'percent'
    // No defaultCommand - too technology-specific
  },
  'function-coverage': {
    id: 'function-coverage',
    name: 'Function Coverage',
    description: 'Percentage of functions covered by tests',
    type: 'numeric',
    unit: 'percent'
    // No defaultCommand - too technology-specific
  },
  'loc': {
    id: 'loc',
    name: 'Lines of Code',
    description: 'Total lines of code in the codebase',
    type: 'numeric',
    unit: 'integer',
    defaultCommand: '@collect loc .'
  },
  'bundle-size': {
    id: 'bundle-size',
    name: 'Bundle Size',
    description: 'Total size of production build artifacts',
    type: 'numeric',
    unit: 'bytes',
    defaultCommand: '@collect size ./dist'
  },
  'build-time': {
    id: 'build-time',
    name: 'Build Time',
    description: 'Time taken to complete the build',
    type: 'numeric',
    unit: 'duration'
    // No defaultCommand - too project-specific
  },
  'test-time': {
    id: 'test-time',
    name: 'Test Time',
    description: 'Time taken to run all tests',
    type: 'numeric',
    unit: 'duration'
    // No defaultCommand - too project-specific
  },
  'dependencies-count': {
    id: 'dependencies-count',
    name: 'Dependencies Count',
    description: 'Total number of direct dependencies',
    type: 'numeric',
    unit: 'integer'
    // No defaultCommand - varies by package manager
  }
};
```

---

## Error Scenarios

### 1. Duplicate Implicit IDs

**Input**:
```json
[
  { "$ref": "loc" },
  { "$ref": "loc" }
]
```

**Error**:
```
Duplicate metric id "loc" found.
When using the same $ref multiple times, provide explicit id values.
```

### 2. Explicit ID Conflicts with Implicit ID

**Input**:
```json
[
  { "$ref": "loc" },
  { "id": "loc", "$ref": "coverage" }
]
```

**Error**:
```
Duplicate metric id "loc" found.
Metric ids must be unique within the configuration.
```

### 3. Custom Metric Missing ID

**Input**:
```json
{ "type": "numeric", "command": "echo 42" }
```

**Error**:
```
Custom metrics (without $ref) require an "id" field.
```

### 4. Invalid $ref

**Input**:
```json
{ "$ref": "unknown-metric" }
```

**Error**:
```
Invalid metric reference "$ref: unknown-metric"
Available built-in metrics: coverage, function-coverage, loc, bundle-size, 
build-time, test-time, dependencies-count
```

### 5. Missing Command Without Default

**Input**:
```json
{ "$ref": "build-time" }
```

**Error**:
```
Metric "build-time" requires a command.
The built-in metric "build-time" does not have a default command.
You must provide a command appropriate for your project.
```

### 6. Unknown Collector

**Input**:
```json
{ "$ref": "loc", "command": "@collect unknown ./path" }
```

**Error**:
```
Unknown collector "unknown" in command "@collect unknown ./path"
Available collectors: loc, size, coverage-lcov, coverage-json, coverage-xml
```

### 7. Quality Gate References Overridden ID

**Input**:
```json
{
  "metrics": [{ "id": "my-loc", "$ref": "loc" }],
  "qualityGate": {
    "thresholds": [{ "metric": "loc", "mode": "max", "target": 10000 }]
  }
}
```

**Error**:
```
Threshold references non-existent metric "loc".
Metric must be defined in the metrics array with a matching id.
```

---

## Relationship to Existing Data Model

### Database Storage

- The `id` field is stored in the database as `metric_definitions.name`
- This maintains backward compatibility with existing queries
- Existing databases will have metrics under old `name` values
- New metrics appear with `id` values

### Quality Gate Integration

- Thresholds reference metrics by `id`
- Quality gate operates on resolved metrics
- No change to threshold evaluation logic

### Reports

- Charts and displays use `name` (display name) for labels
- Internal lookups use `id`
- Unit formatting follows `UnitType` rules

---

## Type Definitions Summary

```typescript
// Built-in metric template
interface MetricTemplate {
  id: string;
  name: string;
  description: string;
  type: 'numeric' | 'label';
  unit?: UnitType;
  defaultCommand?: string;
}

type UnitType = 'percent' | 'integer' | 'bytes' | 'duration' | 'decimal';

// User configuration
interface MetricConfig {
  id: string;                 // Required unique identifier
  $ref?: string;              // Optional built-in reference
  name?: string;              // Optional display name
  command?: string;           // Required when no $ref default
  type?: 'numeric' | 'label'; // Required when no $ref
  description?: string;
  unit?: UnitType;
  timeout?: number;
}

// Resolved configuration (all fields populated)
interface ResolvedMetricConfig {
  id: string;
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

// Registry
type BuiltInMetricsRegistry = Record<string, MetricTemplate>;

// Config (unchanged signature)
interface UnentropyConfig {
  metrics: MetricConfig[];
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
   - Check `id` is present and valid
   - Check `id` uniqueness
   - If `$ref` present: validate exists, resolve defaults
   - If no `$ref`: validate `type` and `command` present
   - Validate resolved metric has command
   - Validate final metric against schema

3. **Export Strategy**:
   - `src/metrics/types.ts` - MetricTemplate, UnitType, CollectorResult
   - `src/metrics/registry.ts` - BUILT_IN_METRICS registry
   - `src/metrics/resolver.ts` - resolution logic
   - `src/metrics/collectors/index.ts` - collector registry and execution
   - `src/config/schema.ts` - MetricConfig schema with id field
