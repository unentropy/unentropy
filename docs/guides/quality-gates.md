---
title: Quality Gates
description: Automatically enforce metric thresholds on pull requests to prevent quality regressions
sidebar:
  order: 3
unentropy_docs:
  generated: 2025-12-08T14:32:00Z
  sources:
    - specs/004-metrics-quality-gate/spec.md
  scope: all
---

Quality gates help you prevent code quality regressions by automatically checking metrics against thresholds on every pull request. When a metric crosses its threshold, the quality gate fails and notifies you.

## How Quality Gates Work

Quality gates compare metrics from your pull request against the baseline from your main branch. You define thresholds for each metric, and Unentropy evaluates them automatically:

1. The `track-metrics` action runs on main branch pushes, building historical data
2. The `quality-gate` action runs on pull requests, comparing PR metrics to main branch baseline
3. If any threshold is violated, the quality gate fails and posts a comment on the PR

## Setting Up Quality Gates

### Add Thresholds to Configuration

Define thresholds in your `unentropy.json`:

```json
{
  "metrics": {
    "coverage": {
      "$ref": "coverage",
      "command": "@collect coverage-lcov ./coverage/lcov.info"
    }
  },
  "qualityGate": {
    "thresholds": [
      {
        "metric": "coverage",
        "mode": "min",
        "target": 80
      }
    ]
  }
}
```

This prevents coverage from dropping below 80%.

### Add Quality Gate Workflow

Create `.github/workflows/quality-gate.yml`:

```yaml
name: Quality Gate
on:
  pull_request:

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4

      - name: Run tests with coverage
        run: bun test --coverage

      - name: Quality Gate Check
        uses: unentropy/quality-gate-action@v1
```

> **Note**: The `pull-requests: write` permission is required to post comments on PRs.

## Threshold Modes

Quality gates support different comparison modes:

### Minimum Value (`min`)

Metric must not drop below the target:

```json
{
  "metric": "coverage",
  "mode": "min",
  "target": 80
}
```

Use for: Coverage percentages, test counts

### Maximum Value (`max`)

Metric must not exceed the target:

```json
{
  "metric": "bundle",
  "mode": "max",
  "target": 500000
}
```

Use for: Bundle sizes, build times, dependency counts

### No Regression (`no-regression`)

Metric must not decrease from baseline:

```json
{
  "metric": "coverage",
  "mode": "no-regression"
}
```

Use for: Ensuring metrics don't regress, regardless of absolute value

### Maximum Increase (`delta-max-drop`)

Metric can increase, but not by more than a percentage:

```json
{
  "metric": "bundle",
  "mode": "delta-max-drop",
  "target": 5
}
```

This allows bundle size to increase by up to 5% from baseline.

Use for: Controlled growth metrics (bundle size, build time)

## Quality Gate Modes

The quality gate itself can operate in different modes:

### Soft Mode (Default)

Evaluates thresholds and posts PR comments, but never fails the build:

```json
{
  "qualityGate": {
    "mode": "soft",
    "thresholds": [...]
  }
}
```

Use this to observe behavior before enforcing rules.

### Hard Mode

Fails the build when any threshold is violated:

```json
{
  "qualityGate": {
    "mode": "hard",
    "thresholds": [...]
  }
}
```

Use this to block merges when quality standards aren't met.

### Off

Disables quality gate evaluation:

```json
{
  "qualityGate": {
    "mode": "off"
  }
}
```

> **Tip**: Start with `soft` mode to tune your thresholds. Switch to `hard` once they're stable.

## Pull Request Comments

When the quality gate runs, it posts a comment on your PR showing:

- Current value for each metric
- Baseline value from main branch
- Change direction (increase/decrease)
- Pass/fail status for each threshold

Example comment:

```
Quality Gate: ✅ Passed

| Metric | Baseline | Current | Change | Status |
|--------|----------|---------|--------|--------|
| Coverage | 87.5% | 88.2% | +0.7% | ✅ Pass |
| Bundle Size | 240 KB | 238 KB | -2 KB | ✅ Pass |
| LOC | 4,521 | 4,580 | +59 | ℹ️ No threshold |
```

If a threshold fails:

```
Quality Gate: ❌ Failed

| Metric | Baseline | Current | Change | Status |
|--------|----------|---------|--------|--------|
| Coverage | 87.5% | 79.2% | -8.3% | ❌ Failed (min: 80%) |
```

## Multiple Thresholds

Configure thresholds for as many metrics as needed:

```json
{
  "qualityGate": {
    "mode": "soft",
    "thresholds": [
      {
        "metric": "coverage",
        "mode": "min",
        "target": 80
      },
      {
        "metric": "bundle",
        "mode": "max",
        "target": 500000
      },
      {
        "metric": "loc",
        "mode": "delta-max-drop",
        "target": 10
      }
    ]
  }
}
```

The quality gate passes only if all thresholds pass.

## Example Configurations

### Coverage Protection

Prevent coverage from dropping:

```json
{
  "metrics": {
    "coverage": {
      "$ref": "coverage",
      "command": "@collect coverage-lcov ./coverage/lcov.info"
    }
  },
  "qualityGate": {
    "mode": "hard",
    "thresholds": [
      {
        "metric": "coverage",
        "mode": "no-regression"
      }
    ]
  }
}
```

### Bundle Size Limits

Keep bundle size under control:

```json
{
  "metrics": {
    "bundle": {
      "$ref": "size",
      "command": "@collect size ./dist/**/*.js"
    }
  },
  "qualityGate": {
    "mode": "hard",
    "thresholds": [
      {
        "metric": "bundle",
        "mode": "max",
        "target": 500000
      },
      {
        "metric": "bundle",
        "mode": "delta-max-drop",
        "target": 5
      }
    ]
  }
}
```

This ensures bundle never exceeds 500KB and never increases by more than 5%.

### Comprehensive Quality Check

Monitor multiple metrics:

```json
{
  "metrics": {
    "coverage": {
      "$ref": "coverage",
      "command": "@collect coverage-lcov ./coverage/lcov.info"
    },
    "bundle": {
      "$ref": "size",
      "command": "@collect size ./dist"
    },
    "loc": {
      "$ref": "loc"
    }
  },
  "qualityGate": {
    "mode": "soft",
    "thresholds": [
      {
        "metric": "coverage",
        "mode": "min",
        "target": 80
      },
      {
        "metric": "bundle",
        "mode": "delta-max-drop",
        "target": 5
      }
    ]
  }
}
```

LOC is tracked but not gated (no threshold defined).

## Handling Missing Baselines

When no baseline data exists for a metric (first PR, new metric), the quality gate handles it gracefully:

- PR comment shows current value
- Indicates "No baseline available"
- Does not fail the quality gate
- Subsequent PRs will have baseline data

This lets you add new metrics or thresholds without blocking work.

## Best Practices

### Start with Soft Mode

Begin with `soft` mode to observe metric behavior:

```json
{
  "qualityGate": {
    "mode": "soft",
    "thresholds": [...]
  }
}
```

Review PR comments for several weeks. Adjust thresholds if needed. Switch to `hard` mode once stable.

### Use No-Regression for Safety

When you're unsure of the right absolute threshold, use `no-regression`:

```json
{
  "metric": "coverage",
  "mode": "no-regression"
}
```

This prevents backsliding without setting arbitrary targets.

### Allow Controlled Growth

For metrics that naturally grow (like LOC), use `delta-max-drop`:

```json
{
  "metric": "loc",
  "mode": "delta-max-drop",
  "target": 15
}
```

This flags unusually large changes (more than 15% growth) while allowing normal expansion.

### Focus on Key Metrics

Don't gate everything. Focus on metrics that truly impact quality:

- Coverage: Usually worth gating
- Bundle size: Important for web apps
- Build time: Helpful for CI efficiency
- LOC: Often better tracked than gated

## Troubleshooting

### Quality Gate Always Passes (When It Shouldn't)

**Problem**: Threshold violations aren't detected

**Solutions**:

- Verify metric names in thresholds match metric IDs in configuration exactly
- Check that `track-metrics` action has run on main branch to create baseline data
- Ensure storage backend is correctly configured and accessible by both workflows
- Review threshold mode and target values

### No Baseline Available

**Problem**: PR comment shows "No baseline available"

**Solutions**:

- Run `track-metrics` action on main branch at least once
- Verify storage backend is working (check workflow logs)
- Ensure both workflows use the same storage configuration
- Wait for main branch workflow to complete before opening PR

### Quality Gate Comment Not Posted

**Problem**: No comment appears on PR

**Solutions**:

- Verify `pull-requests: write` permission in workflow
- Check workflow logs for GitHub API errors
- Ensure `GITHUB_TOKEN` has sufficient permissions
- Review repository settings for Actions permissions

### Thresholds Too Strict

**Problem**: Every PR fails the quality gate

**Solution**: Switch to `soft` mode temporarily and review several PRs to understand typical metric changes. Adjust thresholds to realistic values based on actual data.

## Related Resources

- [Metrics Guide](metrics.md) - Configure metrics for quality gates
- [Configuration Reference](../reference/config.md) - Threshold syntax
- [GitHub Actions Reference](../reference/actions.md) - Quality gate action parameters
