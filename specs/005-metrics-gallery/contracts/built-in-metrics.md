# Built-in Metrics Registry Contract

**Feature**: 005-metrics-gallery  
**Version**: 2.0.0  
**Last Updated**: 2025-12-04

## Overview

This contract defines the built-in metrics available in the Metrics Gallery. Each metric provides metadata (description, type, unit) and optionally a default command using the `@collect` shortcut. Users can override the command or use custom commands as needed.

## Registry Structure

```typescript
interface MetricTemplate {
  // Unique identifier used with $ref
  id: string;
  
  // Default display name (user can override with 'name' field)
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

type BuiltInMetricsRegistry = Record<string, MetricTemplate>;
```

**Note**: The `id` field is the key used with `$ref` in user configuration. The `name` field provides a default display name that users can override.

## Unit Types

Units are semantic types that define how metric values are formatted and displayed consistently across HTML reports and PR comments.

```typescript
type UnitType = 'percent' | 'integer' | 'bytes' | 'duration' | 'decimal';
```

### Unit Type Specifications

| UnitType | Display Example | Decimals | Auto-scale | Use Case |
|----------|-----------------|----------|------------|----------|
| `percent` | `85.5%` | 1 | No | Coverage metrics |
| `integer` | `1,234` | 0 | No | LOC, counts |
| `bytes` | `1.5 MB` | 1 | Yes (B -> KB -> MB -> GB) | Bundle size |
| `duration` | `1m 30s` | 0 | Yes (ms -> s -> m -> h) | Build/test time |
| `decimal` | `3.14` | 2 | No | Generic numeric |

### Formatting Rules

#### `percent`
- Appends `%` suffix
- Shows 1 decimal place (or 0 if whole number)
- Example: `85.5%`, `100%`

#### `integer`
- No decimal places
- Uses thousands separator (US locale)
- Example: `1,234`, `1,234,567`

#### `bytes` (auto-scaling)
- Automatically scales to appropriate unit
- Thresholds: < 1024 -> B, < 1024^2 -> KB, < 1024^3 -> MB, else GB
- Shows 1 decimal place for KB/MB/GB
- Example: `500 B`, `1.5 KB`, `2.3 MB`, `1.1 GB`

#### `duration` (auto-scaling)
- Input is in seconds
- Automatically scales to human-readable format
- Thresholds: < 1 -> ms, < 60 -> s, < 3600 -> m+s, else h+m
- Example: `500ms`, `45s`, `1m 30s`, `1h 5m`

#### `decimal`
- Generic floating-point display
- Shows 2 decimal places
- Example: `3.14`, `99.99`

### Delta Formatting

When displaying changes between values, the same unit rules apply with sign prefix:
- `+2.5%` (percent increase)
- `-256 KB` (bytes decrease)
- `+1m 15s` (duration increase)
- `+150` (integer increase)

## @collect Shortcut

The `@collect` prefix indicates a command that runs directly in-process without spawning a subprocess. This provides faster execution and consistent behavior across environments.

### Available Collectors

| Collector | Syntax | Description |
|-----------|--------|-------------|
| `loc` | `@collect loc <path> [options]` | Count lines of code using SCC |
| `size` | `@collect size <path\|glob>` | Calculate file/directory size |
| `coverage-lcov` | `@collect coverage-lcov <path>` | Parse LCOV coverage reports |
| `coverage-json` | `@collect coverage-json <path>` | Parse JSON coverage reports |
| `coverage-xml` | `@collect coverage-xml <path>` | Parse XML coverage reports |

### Collector Options

#### `loc` Options
- `--language <lang>` - Filter by specific language (e.g., TypeScript, Python)
- `--exclude <patterns>` - Exclude directories from count

#### `size` Options
- Supports glob patterns (e.g., `./dist/*.js`, `.github/actions/*/dist/*.js`)
- `--followSymlinks` - Follow symbolic links

### Execution Flow

When a command starts with `@collect`:
1. Command is parsed to extract collector name and arguments
2. Collector function is invoked directly (no subprocess)
3. Glob patterns are expanded (for `size` collector)
4. Result is returned as numeric or string value
5. If collector fails, execution stops with error (no fallback)

## Built-in Metrics

### Coverage Metrics

#### 1. coverage

```typescript
{
  id: 'coverage',
  name: 'Coverage',
  description: 'Overall test coverage percentage across the codebase',
  type: 'numeric',
  unit: 'percent'
  // No defaultCommand - too technology-specific
}
```

**Recommended Threshold**: `no-regression` with tolerance 0.5%

**Configuration Examples**:

```json
// LCOV format (common with Jest, Vitest, c8)
{ "$ref": "coverage", "command": "@collect coverage-lcov ./coverage/lcov.info" }

// JSON format
{ "$ref": "coverage", "command": "@collect coverage-json ./coverage/coverage.json" }

// With custom id and display name
{ "id": "test-coverage", "$ref": "coverage", "name": "Test Coverage", "command": "@collect coverage-lcov coverage/lcov.info" }
```

---

#### 2. function-coverage

```typescript
{
  id: 'function-coverage',
  name: 'Function Coverage',
  description: 'Percentage of functions covered by tests',
  type: 'numeric',
  unit: 'percent'
  // No defaultCommand - requires specific setup
}
```

**Recommended Threshold**: `no-regression` with tolerance 0.5%

**Configuration Examples**:

```json
// Custom command required (no default)
{ 
  "id": "fn-coverage", 
  "$ref": "function-coverage", 
  "command": "bun test --coverage --coverage-reporter=json | jq -r '.total.functions.pct'"
}
```

---

### Code Size Metrics

#### 3. loc

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

**Recommended Threshold**: None (informational metric)

**Configuration Examples**:

```json
// Ultra-minimal (counts all code in project)
{ "$ref": "loc" }

// Specific directory (explicit id since we're customizing)
{ "id": "src-loc", "$ref": "loc", "command": "@collect loc ./src" }

// TypeScript only
{ "id": "ts-loc", "$ref": "loc", "command": "@collect loc ./src --language TypeScript" }

// With exclusions
{ "id": "app-loc", "$ref": "loc", "command": "@collect loc . --exclude node_modules dist .git" }

// Multiple metrics from same built-in (explicit ids required)
[
  { "id": "src-loc", "$ref": "loc", "command": "@collect loc ./src --language TypeScript" },
  { "id": "test-loc", "$ref": "loc", "command": "@collect loc ./tests --language TypeScript" },
  { "id": "specs-loc", "$ref": "loc", "command": "@collect loc ./specs --language Markdown" }
]
```

**SCC Requirement**: The `loc` collector uses SCC (Sloc Cloc and Code). Install with:
- macOS: `brew install scc`
- Linux: Download from https://github.com/boyter/scc/releases

---

#### 4. bundle-size

```typescript
{
  id: 'bundle-size',
  name: 'Bundle Size',
  description: 'Total size of production build artifacts',
  type: 'numeric',
  unit: 'bytes',
  defaultCommand: '@collect size ./dist'
}
```

**Recommended Threshold**: `delta-max-drop` with 5% maximum increase

**Configuration Examples**:

```json
// Ultra-minimal (measures ./dist directory)
{ "$ref": "bundle-size" }

// Specific file
{ "id": "main-bundle", "$ref": "bundle-size", "command": "@collect size ./dist/main.js" }

// Glob pattern
{ "id": "js-bundles", "$ref": "bundle-size", "command": "@collect size ./dist/*.js" }

// Multiple directories with glob
{ "id": "actions-bundle", "$ref": "bundle-size", "command": "@collect size .github/actions/*/dist/*.js" }
```

---

### Performance Metrics

#### 5. build-time

```typescript
{
  id: 'build-time',
  name: 'Build Time',
  description: 'Time taken to complete the build',
  type: 'numeric',
  unit: 'duration'
  // No defaultCommand - too project-specific
}
```

**Recommended Threshold**: `delta-max-drop` with 10% maximum increase

**Configuration Examples**:

```json
// Custom command required (no default)
{ 
  "id": "build-time", 
  "$ref": "build-time", 
  "command": "(time bun run build) 2>&1 | grep real | awk '{print $2}' | sed 's/[^0-9.]//g'"
}
```

---

#### 6. test-time

```typescript
{
  id: 'test-time',
  name: 'Test Time',
  description: 'Time taken to run all tests',
  type: 'numeric',
  unit: 'duration'
  // No defaultCommand - too project-specific
}
```

**Recommended Threshold**: `delta-max-drop` with 10% maximum increase

**Configuration Examples**:

```json
// Custom command required (no default)
{ 
  "id": "test-time", 
  "$ref": "test-time", 
  "command": "(time bun test) 2>&1 | grep real | awk '{print $2}' | sed 's/[^0-9.]//g'"
}
```

---

### Dependency Metrics

#### 7. dependencies-count

```typescript
{
  id: 'dependencies-count',
  name: 'Dependencies Count',
  description: 'Total number of direct dependencies',
  type: 'numeric',
  unit: 'integer'
  // No defaultCommand - varies by package manager
}
```

**Recommended Threshold**: None (monitoring only)

**Configuration Examples**:

```json
// Node.js
{ 
  "id": "deps-count", 
  "$ref": "dependencies-count", 
  "command": "cat package.json | jq '.dependencies | length'"
}

// With dev dependencies
{ 
  "id": "all-deps", 
  "$ref": "dependencies-count", 
  "command": "cat package.json | jq '(.dependencies | length) + (.devDependencies | length)'"
}
```

---

## Metrics Summary

| ID | Default Command | Unit | Requires Custom Command |
|----|-----------------|------|------------------------|
| `coverage` | - | percent | Yes (technology-specific) |
| `function-coverage` | - | percent | Yes (technology-specific) |
| `loc` | `@collect loc .` | integer | No |
| `bundle-size` | `@collect size ./dist` | bytes | No |
| `build-time` | - | duration | Yes (project-specific) |
| `test-time` | - | duration | Yes (project-specific) |
| `dependencies-count` | - | integer | Yes (package manager-specific) |

## Validation Requirements

### Metric Definition Validation

Built-in metric templates must:
1. Include a clear `description` explaining what the metric measures
2. Specify correct `type` (numeric or label)
3. Include appropriate `unit` (must be a valid `UnitType`)
4. If providing `defaultCommand`, it must use `@collect` syntax

### User Configuration Validation

When users reference built-in metrics:
1. The `$ref` must match an existing built-in metric ID
2. An `id` field must be provided (unique identifier)
3. If built-in has no `defaultCommand`, user must provide `command`
4. Command output must match the metric type (numeric value for numeric metrics)
5. All standard MetricConfig validation rules apply

### Error Handling

When `@collect` commands fail:
1. Execution stops immediately with an error
2. No fallback value is returned
3. Error message includes the specific failure reason
4. Missing files, invalid paths, and parse errors all cause failures

## Extensibility

### Future Metrics

New built-in metrics may be added following these guidelines:

1. **ID Convention**: lowercase-with-hyphens
2. **Category Grouping**: coverage, size, quality, security, performance, dependencies
3. **Clear Description**: Explain what the metric measures and why it's useful
4. **Default Command**: Provide `@collect` command if a sensible default exists
5. **Documentation**: Include recommended thresholds and configuration examples
6. **Backward Compatibility**: New metrics don't affect existing IDs

### Future Collectors

New `@collect` collectors may be added:

1. **Naming**: lowercase-with-hyphens (e.g., `coverage-cobertura`)
2. **Arguments**: Follow existing patterns for paths and options
3. **Output**: Return numeric or string value to stdout
4. **Errors**: Fail fast with clear error messages

## Version History

**2.0.0** (2025-12-04):
- Updated MetricTemplate to include `id` and `name` fields
- Added `defaultCommand` field for built-in defaults (replaces `command`)
- Added `@collect` shortcut documentation
- Added glob pattern support for `size` collector
- Updated all examples to use new `id` field syntax in user config

**1.0.0** (2025-11-22):
- Initial registry with 7 built-in metrics
- Coverage: coverage, function-coverage
- Size: loc, bundle-size
- Performance: build-time, test-time
- Dependencies: dependencies-count
