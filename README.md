```
▄▄ ▄▄ ▄▄  ▄▄ ▄▄▄▄▄ ▄▄  ▄▄ ▄▄▄▄ ▄▄▄▄   ▄▄▄  ▄▄▄▄  ▄▄ ▄▄
██ ██ ███▄██ ██▄▄  ███▄██  ██  ██▄█▄ ██▀██ ██▄█▀ ▀███▀
▀███▀ ██ ▀██ ██▄▄▄ ██ ▀██  ██  ██ ██ ▀███▀ ██      █
```

# Unentropy: your metrics, your data, your rules

> **Beta** - This project is currently in beta (0.x). APIs may change between minor versions.

## **What is Unentropy?**

**Unentropy** is an open-source tool for tracking code metrics directly in your CI pipeline—without external servers, cloud dependencies, or vendor lock-in. In the age of AI-assisted development where codebases evolve faster than ever, **you can't improve what you don't measure.** Unentropy gives you the visibility to catch quality regressions early, validate refactoring progress, and ensure your codebase remains maintainable as it grows.

**Unlike traditional monitoring platforms, Unentropy puts you in complete control.** Your metrics live in your repository's workflow artifacts or your own S3-compatible storage—not on someone else's server. Your configuration is versioned alongside your code. Your data never leaves your infrastructure. Whether you're tracking standard metrics like test coverage and bundle size, or custom indicators specific to your domain (like "modern framework adoption ratio"), **you own the metrics, you own the data, and you decide what matters.** Best of all? It's fully serverless—no infrastructure to manage, no recurring cloud fees, just metrics tracking that works within your existing GitHub Actions workflow.

## **Key Features**

- **Built-in Metrics:** Start tracking coverage, bundle size or lines of code in minutes
- **Custom Metrics Support:** Track domain-specific indicators like framework adoption ratios, API endpoint counts, or refactoring progress using simple command outputs
- **Quality Gates:** Set thresholds and get automated PR feedback—fail the build if coverage drops or bundle size exceeds limits
- **Complete Ownership:** Store metrics in GitHub Actions artifacts or your own S3-compatible storage—your data never leaves your infrastructure
- **Git-Native:** Every metric is tied to its commit SHA; configuration lives in your repo and evolves with your code
- **Trend Visualization:** Generate interactive HTML reports showing how your metrics evolve over time

## **Getting Started**

### Quick Start

Get started with Unentropy in under 2 minutes:

#### 1. Generate Configuration

Run this command in your project directory:

```bash
bunx unentropy init
```

This auto-detects your project type (JavaScript, PHP, Go, or Python) and creates `unentropy.json` with sensible defaults for tracking lines of code and test coverage.

Example output:

```
Detected project type: javascript (found: package.json, tsconfig.json)

✓ Created unentropy.json with 3 metrics:
  - lines-of-code (Lines of Code)
  - test-coverage (Test Coverage)
  - bundle (Bundle Size)
```

#### 2. Verify Metrics Locally

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

If a metric fails, make sure you've run your tests with coverage first. The init output shows the specific test command for your project type.

#### 3. Add GitHub Workflows

Copy the workflow examples from your `init` output into your repository:

1. **Main branch tracking** → `.github/workflows/metrics.yml`
   (from the "TRACK METRICS" section)

2. **Pull request quality gate** → `.github/workflows/quality-gate.yml`
   (from the "QUALITY GATE" section)

Commit and push these files to start tracking metrics.

**That's it!** Metrics are now tracked automatically on every commit to main, and PRs get quality gate feedback.

### View Your First Report

After pushing to main:

1. Go to your repository's **Actions** tab
2. Click the latest **Track Metrics** workflow run
3. Download `unentropy-report.html` from artifacts
4. Open in browser to see interactive metric trends

On pull requests, check for automated quality gate comments.

## **Advanced Configuration**

### Manual Configuration

For full control, you can create `unentropy.json` manually instead of using `bunx unentropy init`:

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

### Workflow Configuration Reference

If you're not using `bunx unentropy init`, here are the workflow templates:

#### Main Branch Workflow

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
        uses: unentropy/track-metrics@v0
```

#### Pull Request Quality Gate Workflow

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

**Note:** Adjust test commands based on your project type. The `init` command generates the correct commands automatically.

### Store Metrics in S3-Compatible Storage

For multi-repo tracking or long-term history, you can store metrics in S3-compatible storage.

Add to `unentropy.json`:

```json
{
  "storage": {
    "type": "sqlite-s3"
  }
}
```

Update both workflows to include S3 credentials:

```yaml
- uses: unentropy/track-metrics@v0
  with:
    s3-endpoint: ${{ secrets.S3_ENDPOINT }}
    s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
    s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
    s3-bucket: my-metrics-bucket
    s3-region: us-east-1
```

Supported S3-compatible services: AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces, and more.

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

### Publish Reports to GitHub Pages

Add a deployment job to `.github/workflows/metrics.yml`:

```yaml
deploy:
  name: Deploy to GitHub Pages
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

## **Development Setup**

### Prerequisites

- [Bun](https://bun.sh/) v1.3 or later

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd unentropy

# Install dependencies
bun install
```

### Available Commands

- `bun test` - Run test suite
- `bun run check` - Run linting type and formatting checks
- `bun run lint:fix` - Auto-fix linting issues
- `bun run format` - Format code with Prettier

## **Support**

- [GitHub Issues](https://github.com/unentropy/unentropy/issues) - Report bugs or request features
- [Discussions](https://github.com/unentropy/unentropy/discussions) - Ask questions and share ideas

## **Contributing**

Unentropy is an open-source project designed _by_ engineers for engineers. We welcome feedback, ideas, and contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## **License**

MIT License - see [LICENSE](LICENSE) for details.
