# Built-in Metrics Registry Contract

**Domain**: metrics

## Overview

This contract defines the metric templates available in the Metrics Gallery. Each template provides metadata (description, type, unit) and optionally a default command using the `@collect` shortcut. Users can reference these templates and override any property as needed.

## Metric Template Structure

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
  command?: string;
}
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

Commands starting with `@collect` are transformed into CLI invocations:

```
@collect loc ./src
  becomes
bun src/index.ts collect loc ./src
```

This provides:
- Consistent behavior with standalone CLI usage
- All CLI features automatically available
- No code duplication

### Available Collectors

| Collector | Syntax | Description |
|-----------|--------|-------------|
| `loc` | `@collect loc <path> [options]` | Count lines of code using the embedded `sloc` library |
| `size` | `@collect size <path\|glob>` | Calculate file/directory size |
| `coverage-lcov` | `@collect coverage-lcov <path> [options]` | Parse LCOV coverage reports |
| `coverage-clover` | `@collect coverage-clover <paths...> [options]` | Parse Clover XML coverage reports (PHPUnit format) |
| `coverage-cobertura` | `@collect coverage-cobertura <paths...> [options]` | Parse and merge Cobertura XML coverage reports |

### Collector Options

#### `loc` Options
- `--language <lang>` - Filter by specific language (e.g., TypeScript, Python)
- `--exclude <patterns>` - Exclude directories from count

#### `size` Options
- Supports glob patterns (e.g., `./dist/*.js`, `.github/actions/*/dist/*.js`)
- Symbolic links are counted by their link entry size (via `lstat`) rather than being followed

#### `coverage-lcov` Options
- `--type <line|branch|function>` - Coverage type to extract (default: `line`)

#### `coverage-clover` Options
- `--type <line|branch|function>` — Coverage type to extract (default: `line`)

#### `coverage-cobertura` Options
- `--type <line|branch|function>` — Coverage type to extract (default: `line`)

**Note:** When a collector fails (missing files, parse errors), execution stops with an error rather than returning a fallback value.

## Command Strategy

Metric templates fall into two categories:

**With default commands:**
- `loc`: `@collect loc .` - sensible default for entire project
- `size`: `@collect size ./dist` - common convention

**Without default commands** (require user configuration):
- `coverage`: Technology-specific (Jest, Vitest, c8, PHPUnit, etc.) - use `coverage-lcov`, `coverage-cobertura`, or `coverage-clover` collectors
- `build-time`: Project-specific timing approach
- `test-time`: Project-specific timing approach
- `dependencies-count`: Package manager-specific (npm, bun, pnpm, yarn)

## Metric Templates

### Coverage Metrics

#### 1. coverage

```typescript
{
  id: 'coverage',
  name: 'Coverage',
  description: 'Overall test coverage percentage across the codebase',
  type: 'numeric',
  unit: 'percent'
  // command: not provided (technology-specific)
}
```

**Recommended Threshold**: `no-regression` with tolerance 0.5%

**Configuration Examples**:

```json
{
  "metrics": {
    "coverage": { "$ref": "coverage", "command": "@collect coverage-lcov ./coverage/lcov.info" },
    "test-coverage": { "$ref": "coverage", "name": "Test Coverage", "command": "@collect coverage-lcov coverage/lcov.info" },
    "branch-coverage": { "$ref": "coverage", "name": "Branch Coverage", "command": "@collect coverage-lcov coverage/lcov.info --type branch" },
    "cobertura-coverage": { "$ref": "coverage", "command": "@collect coverage-cobertura ./coverage/report1.xml ./coverage/report2.xml" },
    "clover-coverage": { "$ref": "coverage", "name": "Clover Coverage", "command": "@collect coverage-clover ./coverage/clover.xml" }
  }
}
```

With glob pattern (shell expands before unentropy sees it):

```json
{
  "metrics": {
    "cobertura-coverage": { "$ref": "coverage", "name": "Cobertura Coverage", "command": "@collect coverage-cobertura ./coverage/*-cobertura.xml" }
  }
}
```

---

### Code Size Metrics

#### 2. loc

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

**Recommended Threshold**: None (informational metric)

**Configuration Examples**:

```json
{
  "metrics": {
    "loc": { "$ref": "loc" },
    "src-loc": { "$ref": "loc", "command": "@collect loc ./src" },
    "ts-loc": { "$ref": "loc", "command": "@collect loc ./src --language TypeScript" }
  }
}
```

---

#### 3. size

```typescript
{
  id: 'size',
  name: 'Bundle Size',
  description: 'Total size of production build artifacts',
  type: 'numeric',
  unit: 'bytes',
  command: '@collect size ./dist'
}
```

**Recommended Threshold**: `delta-max-drop` with 5% maximum increase

**Configuration Examples**:

```json
{
  "metrics": {
    "size": { "$ref": "size" },
    "main-bundle": { "$ref": "size", "command": "@collect size ./dist/main.js" },
    "js-bundles": { "$ref": "size", "command": "@collect size ./dist/*.js" }
  }
}
```

---

### Performance Metrics

#### 4. build-time

```typescript
{
  id: 'build-time',
  name: 'Build Time',
  description: 'Time taken to complete the build',
  type: 'numeric',
  unit: 'duration'
  // command: not provided (project-specific)
}
```

**Recommended Threshold**: `delta-max-drop` with 10% maximum increase

---

#### 5. test-time

```typescript
{
  id: 'test-time',
  name: 'Test Time',
  description: 'Time taken to run all tests',
  type: 'numeric',
  unit: 'duration'
  // command: not provided (project-specific)
}
```

**Recommended Threshold**: `delta-max-drop` with 10% maximum increase

---

### Dependency Metrics

#### 6. dependencies-count

```typescript
{
  id: 'dependencies-count',
  name: 'Dependencies Count',
  description: 'Total number of direct dependencies',
  type: 'numeric',
  unit: 'integer'
  // command: not provided (package manager-specific)
}
```

**Recommended Threshold**: None (monitoring only)

---

## Validation Requirements

### Metric Template Validation

Metric templates must:
1. Include a clear `description` explaining what the metric measures
2. Specify correct `type` (numeric or label)
3. Include appropriate `unit` (must be a valid `UnitType`)
4. If providing `command`, it must use `@collect` syntax

### User Configuration Validation

When users reference metric templates:
1. The `$ref` must match an existing template ID
2. The object key serves as the unique metric identifier
3. If template has no `command`, user must provide `command`
4. Command output must match the metric type (numeric value for numeric metrics)
5. All standard MetricConfig validation rules apply

### Error Handling

When `@collect` commands fail:
1. Execution stops immediately with an error
2. No fallback value is returned
3. Error message includes the specific failure reason
4. Missing files, invalid paths, and parse errors all cause failures

## Extensibility

### Future Metric Templates

New metric templates may be added following these guidelines:

1. **ID Convention**: lowercase-with-hyphens
2. **Category Grouping**: coverage, size, quality, security, performance, dependencies
3. **Clear Description**: Explain what the metric measures and why it's useful
4. **Default Command**: Provide `@collect` command if a sensible default exists
5. **Documentation**: Include recommended thresholds and configuration examples
6. **Backward Compatibility**: New templates don't affect existing IDs

### Future Collectors

New `@collect` collectors may be added:

1. **Naming**: lowercase-with-hyphens (e.g., `coverage-clover`)
2. **Arguments**: Follow existing patterns for paths and options
3. **Output**: Return numeric or string value to stdout
4. **Errors**: Fail fast with clear error messages


