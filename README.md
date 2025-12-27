```
▄▄ ▄▄ ▄▄  ▄▄ ▄▄▄▄▄ ▄▄  ▄▄ ▄▄▄▄ ▄▄▄▄   ▄▄▄  ▄▄▄▄  ▄▄ ▄▄
██ ██ ███▄██ ██▄▄  ███▄██  ██  ██▄█▄ ██▀██ ██▄█▀ ▀███▀
▀███▀ ██ ▀██ ██▄▄▄ ██ ▀██  ██  ██ ██ ▀███▀ ██      █
```

Track code metrics in your CI pipeline

> **Beta** - This project is currently in beta (0.x). APIs may change between minor versions.

## **What is Unentropy?**

Unentropy is a code metrics tracker that gives you the visibility to catch quality regressions early, validate refactoring progress, and ensure your codebase remains maintainable as it grows.

Unentropy is configured in your project's repository and runs as a GitHub Action.

## **Key Features**

- **Built-in Metrics:** Start tracking coverage, bundle size or lines of code in minutes
- **Custom Metrics Support:** Track domain-specific indicators like framework adoption ratios, API endpoint counts, or refactoring progress using simple command outputs
- **Quality Gates:** Set thresholds and get automated PR feedback—fail the build if coverage drops or bundle size exceeds limits
- **Complete Ownership:** Store metrics in GitHub Actions artifacts or your own S3-compatible storage—your data never leaves your infrastructure
- **Git-Native:** Every metric is tied to its commit SHA; configuration lives in your repo and evolves with your code
- **Trend Visualization:** Generate interactive HTML reports showing how your metrics evolve over time

## **Getting Started**

### 1. Generate Configuration

Run this command in your project directory:

```bash
npx unentropy init
```

This auto-detects your project type (JavaScript, PHP, Go, or Python) and creates `unentropy.json` with sensible defaults for tracking lines of code and test coverage.

### 2. Preview Metrics Locally

Use the following command to open a preview metrics report in your browser:

```bash
npx unentropy preview
```

### 3. Add GitHub Workflows

#### Metric tracking

Create a workflow that runs tests and tracks metrics:

```yaml
# .github/workflows/metrics.yml
name: Track Metrics
on:
  push:
    branches: [main]

permissions:
  contents: read # Required to checkout the code
  actions: read # Required to download artifacts
  pages: write # Required to publish reports
  id-token: write # Required to publish reports

jobs:
  track-metrics:
    runs-on: ubuntu-latest
    steps:
      # Checkout code, install dependencies, and run tests to generate coverage metrics
      # Adjust commands based on your project type
      - uses: actions/checkout@v6
      - name: Install dependencies
        run: bun install
      - name: Run tests with coverage
        run: bun test --coverage --coverage-reporter=lcov

      # Collect metrics
      - name: Track metrics
        uses: unentropy/track-metrics@v0

      # Optional: Publish metrics report to GitHub Pages
      - uses: actions/upload-pages-artifact@v3
        with:
          path: unentropy-report
      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
        id: report_deployment

    environment: # Optional, but recommended to show the report URL in GitHub Actions UI
      name: github-pages
      url: ${{ steps.report_deployment.outputs.page_url }}
```

Enable GitHub Pages in your repository settings to view reports at `https://<username>.github.io/<repo>/`.

#### Quality Gate

Create a second workflow that that checks metrics against quality gate thresholds and posts feedback as comments on pull requests:

```yaml
# .github/workflows/quality-gate.yml
name: Quality Gate
on:
  pull_request:

permissions:
  contents: read
  actions: read
  pull-requests: write

jobs:
  quality-gate:
    runs-on: ubuntu-latest

    steps:
      # Adjust commands based on your project type
      - uses: actions/checkout@v6
      - name: Install dependencies
        run: bun install
      - name: Run tests with coverage
        run: bun test --coverage --coverage-reporter=lcov

      - name: Quality Gate Check
        uses: unentropy/quality-gate@v0
```

Commit and push these files to start tracking metrics.

**That's it!** Metrics are now tracked automatically on every commit to main. Your metrics report will be published to your repository's GitHub Pages, and quality gate feedback will be automatically posted as comments on pull requests.

> [!IMPORTANT]
> Note that this setup will keep the metrics history in a sqlite database stored in GitHub Actions artifacts.
> This is great to get you up and running quickly, but you may want to consider other, more permanent storage options.

## **Configuration**

Use `unentropy.json` to configure your metrics and quality gate. Each metric can be defined as a reference to a built-in template (`$ref`). You can also define custom metric collection commands.

```json
{
  "metrics": {
    "loc": {
      "$ref": "loc"
    },
    "bundle": {
      "$ref": "size"
    },
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

**Built-in metric templates:** Unentropy includes templates for common metrics (`loc`, `size`, `coverage`). Only override `command` when you need project-specific paths or options.

### Customize Metric Names and Descriptions

You can override any property from the built-in metric templates:

```json
{
  "metrics": {
    "frontend-loc": {
      "$ref": "loc",
      "name": "Frontend Code Lines",
      "description": "Lines of code in React components",
      "command": "@collect loc ./src/components"
    }
  }
}
```

### Quality Gate Modes

The quality gate can operate in three modes:

- **`off`** - Disabled, no threshold evaluation
- **`soft`** (default) - Evaluates thresholds and posts PR comments, never fails the build
- **`hard`** - Fails the build when thresholds are violated

Set the mode in `unentropy.json`:

```json
{
  "qualityGate": {
    "mode": "hard",
    "thresholds": [...]
  }
}
```

Start with `soft` mode to observe behavior, then switch to `hard` once your thresholds are stable.

## **Support**

- [GitHub Issues](https://github.com/unentropy/unentropy/issues) - Report bugs or request features
- [Discussions](https://github.com/unentropy/unentropy/discussions) - Ask questions and share ideas

## **Contributing**

Unentropy is an open-source project designed _by_ engineers for engineers. We welcome feedback, ideas, and contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## **License**

MIT License - see [LICENSE](LICENSE) for details.
