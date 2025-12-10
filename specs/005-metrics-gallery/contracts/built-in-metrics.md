# Built-in Metrics Registry Contract

**Feature**: 005-metrics-gallery  
**Version**: 4.0.0  
**Last Updated**: 2025-12-06

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
  ↓ becomes ↓
bun src/index.ts collect loc ./src
```

This provides:
- Consistent behavior with standalone CLI usage
- All CLI features automatically available
- No code duplication

### Available Collectors

| Collector | Syntax | Description |
|-----------|--------|-------------|
| `loc` | `@collect loc <path> [options]` | Count lines of code using SCC |
| `size` | `@collect size <path\|glob>` | Calculate file/directory size |
| `coverage-lcov` | `@collect coverage-lcov <path> [options]` | Parse LCOV coverage reports |
| `coverage-cobertura` | `@collect coverage-cobertura <path> [options]` | Parse Cobertura XML coverage reports |

### Collector Options

#### `loc` Options
- `--language <lang>` - Filter by specific language (e.g., TypeScript, Python)
- `--exclude <patterns>` - Exclude directories from count

#### `size` Options
- Supports glob patterns (e.g., `./dist/*.js`, `.github/actions/*/dist/*.js`)
- `--followSymlinks` - Follow symbolic links

#### `coverage-lcov` Options
- `--type <line|branch|function>` - Coverage type to extract (default: `line`)

#### `coverage-cobertura` Options
- `--type <line|branch|function>` - Coverage type to extract (default: `line`)

**Note:** When a collector fails (missing files, parse errors), execution stops with an error rather than returning a fallback value.

## Command Strategy

Metric templates fall into two categories:

**With default commands:**
- `loc`: `@collect loc .` - sensible default for entire project
- `size`: `@collect size ./dist` - common convention

**Without default commands** (require user configuration):
- `coverage`: Technology-specific (Jest, Vitest, c8, etc.) - use `coverage-lcov` or `coverage-cobertura` collectors
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
    // LCOV format (common with Jest, Vitest, c8)
    "coverage": { "$ref": "coverage", "command": "@collect coverage-lcov ./coverage/lcov.info" },

    // Cobertura XML format (common with Istanbul, coverage.py)
    "coverage": { "$ref": "coverage", "command": "@collect coverage-cobertura ./coverage.xml" },

    // With custom key and display name
    "test-coverage": { "$ref": "coverage", "name": "Test Coverage", "command": "@collect coverage-lcov coverage/lcov.info" },

    // Branch coverage using --type option
    "branch-coverage": { "$ref": "coverage", "name": "Branch Coverage", "command": "@collect coverage-lcov coverage/lcov.info --type branch" },

    // Function coverage using --type option
    "fn-coverage": { "$ref": "coverage", "name": "Function Coverage", "command": "@collect coverage-cobertura coverage.xml --type function" }
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
    // Ultra-minimal (counts all code in project)
    "loc": { "$ref": "loc" },

    // Specific directory
    "src-loc": { "$ref": "loc", "command": "@collect loc ./src" },

    // TypeScript only
    "ts-loc": { "$ref": "loc", "command": "@collect loc ./src --language TypeScript" },

    // With exclusions
    "app-loc": { "$ref": "loc", "command": "@collect loc . --exclude node_modules dist .git" },

    // Multiple metrics from same built-in (use different keys)
    "test-loc": { "$ref": "loc", "command": "@collect loc ./tests --language TypeScript" },
    "specs-loc": { "$ref": "loc", "command": "@collect loc ./specs --language Markdown" }
  }
}
```

**SCC Requirement**: The `loc` collector uses SCC (Sloc Cloc and Code). Install with:
- macOS: `brew install scc`
- Linux: Download from https://github.com/boyter/scc/releases

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
    // Ultra-minimal (measures ./dist directory)
    "size": { "$ref": "size" },

    // Specific file
    "main-bundle": { "$ref": "size", "command": "@collect size ./dist/main.js" },

    // Glob pattern
    "js-bundles": { "$ref": "size", "command": "@collect size ./dist/*.js" },

    // Multiple directories with glob
    "actions-bundle": { "$ref": "size", "command": "@collect size .github/actions/*/dist/*.js" }
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

**Configuration Examples**:

```json
{
  "metrics": {
    // Custom command required (no default)
    "build-time": { 
      "$ref": "build-time", 
      "command": "(time bun run build) 2>&1 | grep real | awk '{print $2}' | sed 's/[^0-9.]//g'"
    }
  }
}
```

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

**Configuration Examples**:

```json
{
  "metrics": {
    // Custom command required (no default)
    "test-time": { 
      "$ref": "test-time", 
      "command": "(time bun test) 2>&1 | grep real | awk '{print $2}' | sed 's/[^0-9.]//g'"
    }
  }
}
```

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

**Configuration Examples**:

```json
{
  "metrics": {
    // Node.js
    "deps-count": { 
      "$ref": "dependencies-count", 
      "command": "cat package.json | jq '.dependencies | length'"
    },

    // With dev dependencies
    "all-deps": { 
      "$ref": "dependencies-count", 
      "command": "cat package.json | jq '(.dependencies | length) + (.devDependencies | length)'"
    }
  }
}
```

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

## Version History

**4.0.0** (2025-12-10):
- Removed `function-coverage` metric template (use `--type function` option instead)
- Replaced `coverage-json` and `coverage-xml` collectors with `coverage-cobertura`
- Added `--type` option to coverage collectors for line/branch/function coverage
- Reduced metric templates from 7 to 6

**3.0.0** (2025-12-04):
- Renamed `defaultCommand` to `command` in MetricTemplate for simplicity
- Standardized terminology on "metric templates"
- Streamlined @collect documentation
- Added Command Strategy section
- Removed redundant Metrics Summary table
- Updated all examples and references

**2.0.0** (2025-12-04):
- Updated MetricTemplate to include `id` and `name` fields
- Added `command` field for template defaults
- Added `@collect` shortcut documentation
- Added glob pattern support for `size` collector
- Updated all examples to use new `id` field syntax in user config

**1.0.0** (2025-11-22):
- Initial registry with 7 metric templates
- Coverage: coverage, function-coverage
- Size: loc, size
- Performance: build-time, test-time
- Dependencies: dependencies-count
