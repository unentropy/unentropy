---
title: Getting Started
description: Set up Unentropy in your project and start tracking code metrics in minutes
sidebar:
  order: 1
unentropy_docs:
  generated: 2025-12-08T14:32:00Z
  sources:
    - specs/008-init-scaffolding/spec.md
    - README.md
  scope: all
---

Unentropy helps you track code metrics directly in your CI pipeline—without external servers, cloud dependencies, or vendor lock-in. Get started in under 2 minutes.

## What You'll Learn

This guide shows you how to:

- Generate a configuration file automatically
- Verify metrics collection locally
- Add GitHub Actions workflows
- View your first metrics report

## 1. Generate Configuration

Run this command in your project directory:

```bash
bunx unentropy init
```

Unentropy auto-detects your project type (JavaScript, PHP, Go, or Python) and creates `unentropy.json` with sensible defaults for tracking lines of code and test coverage.

Example output:

```
Detected project type: javascript (found: package.json, tsconfig.json)

✓ Created unentropy.json with 3 metrics:
  - lines-of-code (Lines of Code)
  - test-coverage (Test Coverage)
  - bundle (Bundle Size)
```

### Override Auto-Detection

If auto-detection picks the wrong type, specify it explicitly:

```bash
bunx unentropy init --type php
```

Supported types: `javascript`, `php`, `go`, `python`

### Choose Storage Backend

By default, Unentropy stores metrics in GitHub Actions artifacts. For long-term history or multi-repo tracking, use S3-compatible storage:

```bash
bunx unentropy init --storage s3
```

See [Storage Guide](guides/storage.md) for setup details.

## 2. Verify Metrics Locally

Test that metrics collection works before pushing to CI:

```bash
bunx unentropy test
```

Example output:

```
✓ Config schema valid

Collecting metrics:

  ✓ lines-of-code (integer)    4,521         0.8s
  ✓ test-coverage (percent)    87.3%         2.1s
  ✓ bundle (bytes)             240 KB        0.2s

All 3 metrics collected successfully.
```

> **Tip**: If coverage collection fails, make sure you've run your tests with coverage reporting enabled first. The `init` command shows the specific test command for your project type.

### Show Collection Commands

Use verbose mode to see the exact commands being run:

```bash
bunx unentropy test --verbose
```

## 3. Preview Your Report

See what your metrics report will look like:

```bash
bunx unentropy preview
```

This generates an HTML report with your configured metrics (showing empty data) and opens it in your browser. Use this to verify your setup before collecting real data.

## 4. Add GitHub Workflows

Copy the workflow examples from your `init` output into your repository:

### Main Branch Tracking

Create `.github/workflows/metrics.yml`:

```yaml
name: Track Metrics
on:
  push:
    branches: [main]

jobs:
  track-metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tests with coverage
        run: bun test --coverage

      - name: Track metrics
        uses: unentropy/track-metrics-action@v1
```

### Pull Request Quality Gate

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

> **Note**: Adjust test commands based on your project type. The `init` command generates the correct commands automatically.

Commit and push these files to start tracking metrics.

**That's it!** Metrics are now tracked automatically on every commit to main, and PRs get quality gate feedback.

## 5. View Your First Report

After pushing to main:

1. Go to your repository's **Actions** tab
2. Click the latest **Track Metrics** workflow run
3. Download `unentropy-report.html` from artifacts
4. Open in browser to see interactive metric trends

On pull requests, check for automated quality gate comments showing how your changes impact metrics.

## What's Next?

- [Configure custom metrics](guides/metrics.md) specific to your domain
- [Set up quality gate thresholds](guides/quality-gates.md) to prevent regressions
- [Publish reports to GitHub Pages](guides/reports.md) for easy access
- [Use S3 storage](guides/storage.md) for multi-repo tracking

## Common Questions

### Where is my data stored?

By default, metrics are stored in GitHub Actions workflow artifacts (90-day retention). You can switch to S3-compatible storage for long-term history. See [Storage Guide](guides/storage.md).

### Do I need to run tests before collecting metrics?

For coverage metrics, yes. Run your test suite with coverage reporting enabled (e.g., `bun test --coverage`) before collecting metrics. Other metrics like lines of code work without additional setup.

### Can I customize the configuration?

Yes. The `init` command creates a starting point. Edit `unentropy.json` to add custom metrics, adjust thresholds, or change collection commands. See [Configuration Reference](reference/config.md).

### What if my project type isn't detected?

Use `--type` to specify it explicitly, or create `unentropy.json` manually following the [Configuration Reference](reference/config.md).

## Related Resources

- [CLI Commands Reference](reference/cli.md) - Complete command documentation
- [Metrics Guide](guides/metrics.md) - Built-in and custom metrics
- [Configuration Reference](reference/config.md) - All configuration options
