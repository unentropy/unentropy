# Quickstart: Metrics Gallery

**Feature**: 005-metrics-gallery  
**Audience**: Developers setting up metrics tracking  
**Time**: 5 minutes

## What is the Metrics Gallery?

The Metrics Gallery provides built-in metrics you can add to your project with a simple reference, instead of writing custom collection commands. Each built-in metric includes:

- Default collection command using `@collect` (delegates to CLI for simplicity)
- Semantic unit type for consistent formatting (`percent`, `bytes`, `duration`, etc.)
- Sensible defaults for thresholds
- Well-tested implementation

## Basic Usage

### 1. Ultra-Minimal Configuration

For metrics with default commands, just reference the built-in metric:

```json
{
  "metrics": [
    { "$ref": "loc" },
    { "$ref": "bundle-size" }
  ]
}
```

This automatically:
- Inherits `id` from the template (e.g., `"loc"`, `"bundle-size"`)
- Uses the default `@collect` command
- Applies the correct unit type for formatting

**Note**: Some metrics like `coverage` require a command (too technology-specific for defaults).

### 2. Custom id for Multiple Uses of Same Metric

When using the same built-in metric multiple times, provide explicit `id` values:

```json
{
  "metrics": [
    { "id": "src-loc", "$ref": "loc", "command": "@collect loc ./src" },
    { "id": "test-loc", "$ref": "loc", "command": "@collect loc ./tests" }
  ]
}
```

### 3. Override with @collect Commands

Customize the collection path or options while keeping other defaults:

```json
{
  "metrics": [
    { "$ref": "loc", "command": "@collect loc ./src --language TypeScript" },
    { "$ref": "coverage", "command": "@collect coverage-lcov ./reports/lcov.info" },
    { "$ref": "bundle-size", "command": "@collect size ./dist/*.js" }
  ]
}
```

### 4. Custom Display Names

Add human-readable names for reports and charts:

```json
{
  "metrics": [
    { 
      "id": "test-coverage",
      "$ref": "coverage", 
      "name": "Test Coverage"
    }
  ]
}
```

### 5. Mix Built-in and Custom Metrics

```json
{
  "metrics": [
    { "$ref": "coverage" },
    { "$ref": "loc" },
    {
      "id": "custom-score",
      "type": "numeric",
      "command": "./scripts/calculate-score.sh"
    }
  ]
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
{ "$ref": "loc", "command": "@collect loc ./src --language TypeScript" }
{ "$ref": "loc", "command": "@collect loc . --exclude node_modules dist" }
```

### Glob Patterns for Size

```json
{ "$ref": "bundle-size", "command": "@collect size ./dist/*.js" }
{ "$ref": "bundle-size", "command": "@collect size .github/actions/*/dist/*.js" }
```

## Available Metrics

### Unit Types

Each metric has a semantic unit type that determines how values are formatted:

| Unit Type | Display Example | Description |
|-----------|-----------------|-------------|
| `percent` | `85.5%` | Percentage values |
| `integer` | `1,234` | Whole numbers with thousands separator |
| `bytes` | `1.5 MB` | Auto-scaling file sizes |
| `duration` | `1m 30s` | Auto-scaling time values |
| `decimal` | `3.14` | Generic floating-point |

### Metrics with Default Commands

These metrics have default `@collect` commands and can be used with minimal configuration:

| ID | Default Command | Unit |
|----|-----------------|------|
| `loc` | `@collect loc .` | `integer` |
| `bundle-size` | `@collect size ./dist` | `bytes` |

### Metrics Requiring Custom Commands

These metrics don't have default commands (too technology/project-specific):

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
  "metrics": [
    { "$ref": "coverage", "command": "@collect coverage-lcov coverage/lcov.info" },
    { "$ref": "loc" }
  ]
}
```

### Monitor Performance

```json
{
  "metrics": [
    { 
      "id": "build-time", 
      "$ref": "build-time",
      "command": "(time bun run build) 2>&1 | grep real | awk '{print $2}'"
    },
    { "$ref": "bundle-size" }
  ]
}
```

### Multiple Source Directories

```json
{
  "metrics": [
    { "id": "src-loc", "$ref": "loc", "command": "@collect loc ./src --language TypeScript" },
    { "id": "test-loc", "$ref": "loc", "command": "@collect loc ./tests --language TypeScript" },
    { "id": "docs-loc", "$ref": "loc", "command": "@collect loc ./docs --language Markdown" }
  ]
}
```

## With Quality Gates

Combine built-in metrics with quality gate thresholds:

```json
{
  "metrics": [
    { "$ref": "coverage", "command": "@collect coverage-lcov coverage/lcov.info" },
    { "$ref": "bundle-size" }
  ],
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
        "metric": "bundle-size",
        "mode": "delta-max-drop",
        "maxDropPercent": 5
      }
    ]
  }
}
```

**Note**: Threshold `metric` references the resolved `id` (either explicit or inherited from template).

## Troubleshooting

### "Invalid metric reference" Error

**Problem**: `Invalid metric reference: "$ref: unknown-metric"`

**Solution**: Check available metric IDs:
- coverage, function-coverage, loc, bundle-size, build-time, test-time, dependencies-count

### "Duplicate metric id" Error

**Problem**: `Duplicate metric id "loc" found`

**Cause**: Using the same `$ref` twice without explicit `id` values.

**Solution**: Provide unique `id` values:

```json
{ "id": "src-loc", "$ref": "loc", "command": "@collect loc ./src" }
{ "id": "test-loc", "$ref": "loc", "command": "@collect loc ./tests" }
```

### "Metric requires a command" Error

**Problem**: `Metric "build-time" requires a command`

**Cause**: Some built-in metrics don't have default commands.

**Solution**: Provide a command:

```json
{ 
  "$ref": "build-time", 
  "command": "(time bun run build) 2>&1 | grep real | awk '{print $2}'"
}
```

### @collect Command Fails

**Problem**: `@collect loc ./src` fails with "SCC is not installed"

**Solution**: Install SCC:
- macOS: `brew install scc`
- Linux: Download from https://github.com/boyter/scc/releases

### Threshold References Wrong Metric

**Problem**: `Threshold references non-existent metric "loc"`

**Cause**: You provided a custom `id` but threshold still references the template id.

**Solution**: Match the threshold to your `id`:

```json
{
  "metrics": [
    { "id": "my-loc", "$ref": "loc" }
  ],
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
- Start with minimal config `{ "$ref": "loc" }` and add overrides as needed
- Use `@collect` commands for faster, more reliable collection
- Provide explicit `id` when using the same `$ref` multiple times

**Don't**:
- Override `type` - it's inherited from the built-in metric
- Use the same implicit `id` twice (provide explicit ids)
- Forget to match threshold `metric` to your resolved `id`
