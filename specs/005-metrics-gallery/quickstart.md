# Quickstart: Metrics Gallery

**Feature**: 005-metrics-gallery  
**Audience**: Developers setting up metrics tracking  
**Time**: 5 minutes  
**Updated**: 2025-12-06

## What is the Metrics Gallery?

The Metrics Gallery provides metric templates you can add to your project with a simple reference, instead of writing custom collection commands. Each metric template includes:

- Default collection command using `@collect` (delegates to CLI for simplicity)
- Semantic unit type for consistent formatting (`percent`, `bytes`, `duration`, etc.)
- Sensible defaults for thresholds
- Well-tested implementation

## Basic Usage

### 1. Ultra-Minimal Configuration

For templates with default commands, just reference the metric template. The object key becomes the metric id:

```json
{
  "metrics": {
    "loc": { "$ref": "loc" },
    "size": { "$ref": "size" }
  }
}
```

This automatically:
- Uses the object key as the metric id (e.g., `"loc"`, `"size"`)
- Uses the default `@collect` command from the template
- Applies the correct unit type for formatting

**Note**: Some templates like `coverage` require a command (too technology-specific for defaults).

### 2. Multiple Uses of Same Template

When using the same metric template multiple times, just use different object keys:

```json
{
  "metrics": {
    "src-loc": { "$ref": "loc", "command": "@collect loc ./src" },
    "test-loc": { "$ref": "loc", "command": "@collect loc ./tests" }
  }
}
```

### 3. Override with @collect Commands

Customize the collection path or options while keeping other defaults:

```json
{
  "metrics": {
    "loc": { "$ref": "loc", "command": "@collect loc ./src --language TypeScript" },
    "coverage": { "$ref": "coverage", "command": "@collect coverage-lcov ./reports/lcov.info" },
    "size": { "$ref": "size", "command": "@collect size ./dist/*.js" }
  }
}
```

### 4. Custom Display Names

Add human-readable names for reports and charts:

```json
{
  "metrics": {
    "test-coverage": {
      "$ref": "coverage",
      "name": "Test Coverage",
      "command": "@collect coverage-lcov coverage/lcov.info"
    }
  }
}
```

### 5. Mix Metric Templates and Custom Metrics

```json
{
  "metrics": {
    "coverage": { "$ref": "coverage", "command": "@collect coverage-lcov coverage/lcov.info" },
    "loc": { "$ref": "loc" },
    "custom-score": {
      "type": "numeric",
      "command": "./scripts/calculate-score.sh"
    }
  }
}
```

## @collect Commands

The `@collect` prefix simplifies collector invocation by delegating to the existing CLI:

### Available Collectors

| Collector | Syntax | Description |
|-----------|--------|-------------|
| `loc` | `@collect loc <path> [options]` | Count lines of code using SCC |
| `size` | `@collect size <path\|glob>` | Calculate file/directory size (supports globs) |
| `coverage-lcov` | `@collect coverage-lcov <path>` | Parse LCOV coverage reports |
| `coverage-json` | `@collect coverage-json <path>` | Parse JSON coverage reports |
| `coverage-xml` | `@collect coverage-xml <path>` | Parse XML coverage reports |

### LOC Options

```json
{
  "metrics": {
    "ts-loc": { "$ref": "loc", "command": "@collect loc ./src --language TypeScript" },
    "all-loc": { "$ref": "loc", "command": "@collect loc . --exclude node_modules dist" }
  }
}
```

### Glob Patterns for Size

```json
{
  "metrics": {
    "js-bundle": { "$ref": "size", "command": "@collect size ./dist/*.js" },
    "actions-bundle": { "$ref": "size", "command": "@collect size .github/actions/*/dist/*.js" }
  }
}
```

## Available Metric Templates

### Unit Types

Each template has a semantic unit type that determines how values are formatted:

| Unit Type | Display Example | Description |
|-----------|-----------------|-------------|
| `percent` | `85.5%` | Percentage values |
| `integer` | `1,234` | Whole numbers with thousands separator |
| `bytes` | `1.5 MB` | Auto-scaling file sizes |
| `duration` | `1m 30s` | Auto-scaling time values |
| `decimal` | `3.14` | Generic floating-point |

### Templates with Default Commands

These templates have default `@collect` commands and can be used with minimal configuration:

| ID | Default Command | Unit |
|----|-----------------|------|
| `loc` | `@collect loc .` | `integer` |
| `size` | `@collect size ./dist` | `bytes` |

### Templates Requiring Custom Commands

These templates don't have default commands (too technology/project-specific):

| ID | Unit | Example Command |
|----|------|-----------------|
| `coverage` | `percent` | `@collect coverage-lcov coverage/lcov.info` |
| `function-coverage` | `percent` | `bun test --coverage \| jq '.total.functions.pct'` |
| `build-time` | `duration` | `(time bun run build) 2>&1 \| grep real \| ...` |
| `test-time` | `duration` | `(time bun test) 2>&1 \| grep real \| ...` |
| `dependencies-count` | `integer` | `jq '.dependencies \| length' package.json` |

## Common Patterns

### Track Code Health

```json
{
  "metrics": {
    "coverage": { "$ref": "coverage", "command": "@collect coverage-lcov coverage/lcov.info" },
    "loc": { "$ref": "loc" }
  }
}
```

### Monitor Performance

```json
{
  "metrics": {
    "build-time": {
      "$ref": "build-time",
      "command": "(time bun run build) 2>&1 | grep real | awk '{print $2}'"
    },
    "size": { "$ref": "size" }
  }
}
```

### Multiple Source Directories

```json
{
  "metrics": {
    "src-loc": { "$ref": "loc", "command": "@collect loc ./src --language TypeScript" },
    "test-loc": { "$ref": "loc", "command": "@collect loc ./tests --language TypeScript" },
    "docs-loc": { "$ref": "loc", "command": "@collect loc ./docs --language Markdown" }
  }
}
```

## With Quality Gates

Combine metric templates with quality gate thresholds:

```json
{
  "metrics": {
    "coverage": { "$ref": "coverage", "command": "@collect coverage-lcov coverage/lcov.info" },
    "size": { "$ref": "size" }
  },
  "qualityGate": {
    "mode": "soft",
    "enablePullRequestComment": true,
    "thresholds": [
      {
        "metric": "coverage",
        "mode": "no-regression",
        "tolerance": 0.5
      },
      {
        "metric": "size",
        "mode": "delta-max-drop",
        "maxDropPercent": 5
      }
    ]
  }
}
```

**Note**: Threshold `metric` references the object key (metric id).

## Troubleshooting

### "Invalid metric reference" Error

**Problem**: `Invalid metric reference: "$ref: unknown-metric"`

**Solution**: Check available metric IDs:
- coverage, function-coverage, loc, size, build-time, test-time, dependencies-count

### "Invalid metric key" Error

**Problem**: `Invalid metric key "My-Metric"`

**Cause**: Object keys must be lowercase with hyphens only.

**Solution**: Use lowercase keys:

```json
{
  "metrics": {
    "my-metric": { "$ref": "loc" }
  }
}
```

### "Metric requires a command" Error

**Problem**: `Metric "build-time" requires a command`

**Cause**: Some metric templates don't have default commands.

**Solution**: Provide a command:

```json
{
  "metrics": {
    "build-time": {
      "$ref": "build-time",
      "command": "(time bun run build) 2>&1 | grep real | awk '{print $2}'"
    }
  }
}
```

### @collect Command Fails

**Problem**: `@collect loc ./src` fails with "SCC is not installed"

**Solution**: Install SCC:
- macOS: `brew install scc`
- Linux: Download from https://github.com/boyter/scc/releases

### Threshold References Wrong Metric

**Problem**: `Threshold references non-existent metric "loc"`

**Cause**: You used a different object key but threshold still references "loc".

**Solution**: Match the threshold to your object key:

```json
{
  "metrics": {
    "my-loc": { "$ref": "loc" }
  },
  "qualityGate": {
    "thresholds": [
      { "metric": "my-loc", "mode": "max", "target": 10000 }
    ]
  }
}
```

## Next Steps

- See [config-schema.md](contracts/config-schema.md) for complete reference
- See [built-in-metrics.md](contracts/built-in-metrics.md) for detailed metric definitions
- Check the edge cases section in [spec.md](spec.md)

## Tips

**Do**:
- Start with minimal config `"loc": { "$ref": "loc" }` and add overrides as needed
- Use `@collect` commands for faster, more reliable collection
- Use different object keys when referencing the same template multiple times

**Don't**:
- Override `type` - it's inherited from the metric template
- Use uppercase or spaces in object keys
- Forget to match threshold `metric` to your object key
