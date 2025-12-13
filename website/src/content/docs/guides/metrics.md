---
title: Metrics
description: Track built-in and custom metrics to monitor your codebase health
sidebar:
  order: 1
unentropy_docs:
  generated: 2025-12-08T14:32:00Z
  sources:
    - specs/005-metrics-gallery/spec.md
    - specs/001-metrics-tracking-poc/spec.md
  scope: all
---

Unentropy helps you track code metrics that matter to your project. Use built-in metrics for common indicators like coverage and bundle size, or define custom metrics specific to your needs.

## Built-in Metrics

Unentropy includes pre-configured metric templates that work out of the box. Reference them with minimal configuration using the `$ref` property:

```json
{
  "metrics": {
    "loc": {
      "$ref": "loc"
    },
    "coverage": {
      "$ref": "coverage",
      "command": "@collect coverage-lcov ./coverage/lcov.info"
    }
  }
}
```

This will generate reports with two metrics: lines of code (calculated from the whole repository) and test coverage (you need to run tests first with appropriate flags).

The `command` property can be any shell command that outputs a single number to be tracked. `@collect` is a shortcut for running built-in collectors.

### Coverage Metrics

#### Test Coverage

Track overall test coverage percentage across your codebase:

```json
{
  "metrics": {
    "coverage": {
      "$ref": "coverage",
      "command": "@collect coverage-lcov ./coverage/lcov.info"
    }
  }
}
```

- **Unit**: Percent (displays as `87.5%`)
- **Note**: Requires coverage report generation before metric collection

#### Branch and Function Coverage

Track branch or function coverage using the `--type` option:

```json
{
  "metrics": {
    "branch-coverage": {
      "$ref": "coverage",
      "name": "Branch Coverage",
      "command": "@collect coverage-lcov ./coverage/lcov.info --type branch"
    },
    "func-coverage": {
      "$ref": "coverage",
      "name": "Function Coverage",
      "command": "@collect coverage-lcov ./coverage/lcov.info --type function"
    }
  }
}
```

- **Unit**: Percent
- **Available types**: `line` (default), `branch`, `function`

### Code Size Metrics

#### Lines of Code

Count lines of code in your project:

```json
{
  "metrics": {
    "loc": {
      "$ref": "loc"
    }
  }
}
```

This uses the default command `@collect loc .` which counts all lines in your project. 
Internally, Unentropy uses the [scc](https://github.com/boyter/scc) tool to do the counting.

**Customize the path or language:**

```json
{
  "metrics": {
    "src-loc": {
      "$ref": "loc",
      "command": "@collect loc ./src --language TypeScript"
    }
  }
}
```

- **Unit**: Integer (displays as `4,521`)

#### Bundle Size

Track production build artifact size:

```json
{
  "metrics": {
    "bundle": {
      "$ref": "size",
      "command": "@collect size ./dist"
    }
  }
}
```

Supports glob patterns for specific files:

```json
{
  "metrics": {
    "js-bundle": {
      "$ref": "size",
      "command": "@collect size ./dist/**/*.js"
    }
  }
}
```

- **Unit**: Bytes (auto-scales to KB, MB, GB)

### Performance Metrics

#### Build Time

Track how long your builds take:

```json
{
  "metrics": {
    "build-time": {
      "$ref": "build-time",
      "command": "command-that-outputs-milliseconds"
    }
  }
}
```

- **Unit**: Duration (auto-scales to ms, s, m, h)
- **Note**: No default command - too project-specific

#### Test Suite Duration

Track test execution time:

```json
{
  "metrics": {
    "test-time": {
      "$ref": "test-time",
      "command": "command-that-outputs-test-duration-ms"
    }
  }
}
```

- **Unit**: Duration

### Dependency Metrics

#### Dependency Count

Track the number of direct dependencies:

```json
{
  "metrics": {
    "deps": {
      "$ref": "dependencies-count",
      "command": "jq '.dependencies | length' package.json"
    }
  }
}
```

- **Unit**: Integer

## Custom Metrics

You can define metrics specific to your project needs:

```json
{
  "metrics": {
    "api-endpoints": {
      "type": "numeric",
      "name": "API Endpoints",
      "description": "Number of exported API functions",
      "unit": "integer",
      "command": "grep -r 'export.*function' src/api | wc -l"
    }
  }
}
```

### Custom Metric Properties

- **type**: `numeric` (required)
- **name**: Display name in reports (required)
- **description**: What this metric tracks (optional)
- **unit**: How to format values (optional, see [Unit Types](#unit-types))
- **command**: Shell command that outputs the metric value (required)

### Unit Types

Choose the right unit for proper formatting:

| Unit       | Example  | Use Case            |
| ---------- | -------- | ------------------- |
| `percent`  | `85.5%`  | Coverage, ratios    |
| `integer`  | `1,234`  | Counts, LOC         |
| `bytes`    | `1.5 MB` | File sizes, bundles |
| `duration` | `1m 30s` | Build/test time     |
| `decimal`  | `3.14`   | Generic numbers     |

## Customizing built-in metrics 

### Override Display Name

Customize how metrics appear in reports:

```json
{
  "metrics": {
    "test-coverage": {
      "$ref": "coverage",
      "name": "Test Coverage",
      "command": "@collect coverage-lcov ./coverage/lcov.info"
    }
  }
}
```

### Multiple Variations

Track the same type of metric for different paths:

```json
{
  "metrics": {
    "src-loc": {
      "$ref": "loc",
      "name": "Source Code Lines",
      "command": "@collect loc ./src"
    },
    "test-loc": {
      "$ref": "loc",
      "name": "Test Code Lines",
      "command": "@collect loc ./tests"
    }
  }
}
```

Each gets a unique ID from its object key, so they can be tracked separately in reports and quality gates.

## The `@collect` Shortcut

Built-in collectors run faster than shell commands because they execute in-process.

### Available Collectors

#### `@collect loc <path>`

Count lines of code using the SCC tool:

```bash
@collect loc ./src
@collect loc . --language TypeScript
@collect loc ./app --language "PHP,JavaScript"
```

#### `@collect size <path1> [<path2>] [<path3>] [...]`

Calculate total file size (supports glob patterns):

```bash
@collect size ./dist
@collect size ./dist/**/*.js
@collect size ./build/*.wasm
@collect size ./build ./dist
```

#### `@collect coverage-lcov <path>`

Extract coverage from LCOV format:

```bash
@collect coverage-lcov ./coverage/lcov.info
@collect coverage-lcov ./coverage/lcov.info --type branch
@collect coverage-lcov ./coverage/lcov.info --type function
```

**Options**:

- `--type <line|branch|function>` - Coverage type to extract (default: `line`)

#### `@collect coverage-cobertura <path>`

Extract coverage from Cobertura XML format:

```bash
@collect coverage-cobertura ./coverage/coverage.xml
@collect coverage-cobertura ./coverage/coverage.xml --type branch
@collect coverage-cobertura ./coverage/coverage.xml --type function
```

**Options**:

- `--type <line|branch|function>` - Coverage type to extract (default: `line`)

## Example Configurations

### JavaScript/TypeScript Project

```json
{
  "metrics": {
    "loc": {
      "$ref": "loc",
      "command": "@collect loc ./src --language TypeScript"
    },
    "coverage": {
      "$ref": "coverage",
      "command": "@collect coverage-lcov ./coverage/lcov.info"
    },
    "bundle": {
      "$ref": "size",
      "command": "@collect size ./dist/**/*.js"
    }
  }
}
```

### PHP Project

```json
{
  "metrics": {
    "loc": {
      "$ref": "loc",
      "command": "@collect loc ./src --language PHP"
    },
    "coverage": {
      "$ref": "coverage",
      "command": "@collect coverage-cobertura ./coverage/coverage.xml"
    }
  }
}
```

### Go Project

```json
{
  "metrics": {
    "loc": {
      "$ref": "loc",
      "command": "@collect loc . --language Go"
    },
    "binary-size": {
      "$ref": "size",
      "command": "@collect size ./bin/app"
    }
  }
}
```

## Validating Configuration

Check your configuration before pushing to CI:

```bash
bunx unentropy verify
```

This validates:

- JSON syntax
- Required fields present
- Valid metric references
- Unit types correct

## Testing Metric Collection

Verify all metrics collect successfully:

```bash
bunx unentropy test
```

Example output:

```
✓ Config schema valid

Collecting metrics:

  ✓ loc (integer)         4,521         0.8s
  ✓ coverage (percent)    87.3%         2.1s
  ✓ bundle (bytes)        240 KB        0.2s

All 3 metrics collected successfully.
```

Note that `test` runs locally, so - depending on your configuration - you may need to run tests or build artifacts first. Code size (loc) metrics require the scc tool to be installed.

## Related Resources

- [Configuration Reference](../reference/config.md) - Complete config schema
- [Quality Gates Guide](quality-gates.md) - Set thresholds for metrics
- [CLI Commands Reference](../reference/cli.md) - Test and verify commands
