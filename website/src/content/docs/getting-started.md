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

> **Tip:** Unentropy supports both npx and bunx

Run this command in your project directory:

```bash
npx unentropy init
```

Unentropy auto-detects your project type (JavaScript, PHP, Go, or Python) and creates `unentropy.json` with sensible defaults for tracking lines of code and test coverage.

Example configuration:

```json
{
  "storage": {
    "type": "sqlite-artifact"
  },
  "metrics": {
    "lines-of-code": {
      "$ref": "loc",
      "command": "@collect loc ./src --language TypeScript"
    },
    "test-coverage": {
      "$ref": "coverage",
      "command": "@collect coverage-lcov ./coverage/lcov.info"
    }
  },
  "qualityGate": {
    "mode": "soft",
    "thresholds": [
      {
        "metric": "test-coverage",
        "mode": "min",
        "target": 80,
        "severity": "blocker"
      }
    ]
  }
}
```

This configuration tracks two metrics:

- **Lines of Code**: Measures the size of your codebase by counting lines in the `src/` directory
- **Test Coverage**: Measures test coverage percentage from your coverage report

It also includes a quality gate that fails if test coverage drops below 80%, helping prevent coverage regressions in pull requests. Your metrics history will be stored in GitHub Actions workflow artifacts - this will get you up and running quickly, but may not be suitable for long-term tracking. See [Storage Guide](/guides/storage/) for more options.

Since no metrics are collected yet, the preview will show example, random-generated data.

### Override Auto-Detection

If auto-detection picks the wrong type, specify it explicitly:

```bash
npx unentropy init --type php
```

Supported types: `javascript`, `php`, `go`, `python`

## 2. Preview Your Report

See what your metrics report will look like:

```bash
npx unentropy preview
```

This generates an HTML report with your configured metrics (showing empty data) and opens it in your browser. Use this to verify your setup before collecting real data.

## 3. Add GitHub Workflows

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
        run: bun test --coverage --coverage-reporter=lcov

      - name: Track metrics
        uses: unentropy/track-metrics@v0

  publish-metrics-report:
    name: Publish Metrics Report
    runs-on: ubuntu-latest
    needs: track-metrics
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

Enable GitHub Pages in your repository settings to view reports at `https://<username>.github.io/<repo>/`.

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
        uses: unentropy/quality-gate@v0
```

> **Note**: Adjust test commands based on your project type. The `init` command generates the correct commands automatically.

Commit and push these files to start tracking metrics.

**That's it!** Metrics are now tracked automatically on every commit to main. Your metrics report will be published to your repository's GitHub Pages, and quality gate feedback will be automatically posted as comments on pull requests.

## What's Next?

- [Configure custom metrics](/guides/metrics/) specific to your domain
- [Set up quality gate thresholds](/guides/quality-gates/) to prevent regressions
- [Publish reports to GitHub Pages](/guides/reports/) for easy access
- [Use S3 storage](/guides/storage/) for multi-repo tracking

## Common Questions

### Where is my data stored?

By default, metrics are stored in GitHub Actions workflow artifacts (90-day retention). You can switch to S3-compatible storage for long-term history. See [Storage Guide](/guides/storage/).

### Do I need to run tests before collecting metrics?

For coverage metrics, yes. Run your test suite with coverage reporting enabled (e.g., `bun test --coverage --coverage-reporter=lcov`) before collecting metrics. Other metrics like lines of code work without additional setup.

### What if my project type isn't detected?

Use `--type` to specify it explicitly, or create `unentropy.json` manually following the [Configuration Reference](/reference/config/).

## Related Resources

- [CLI Commands Reference](/reference/cli/) - Complete command documentation
- [Metrics Guide](/guides/metrics/) - Built-in and custom metrics
- [Configuration Reference](/reference/config/) - All configuration options
