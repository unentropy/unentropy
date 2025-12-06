```
▄▄ ▄▄ ▄▄  ▄▄ ▄▄▄▄▄ ▄▄  ▄▄ ▄▄▄▄ ▄▄▄▄   ▄▄▄  ▄▄▄▄  ▄▄ ▄▄
██ ██ ███▄██ ██▄▄  ███▄██  ██  ██▄█▄ ██▀██ ██▄█▀ ▀███▀
▀███▀ ██ ▀██ ██▄▄▄ ██ ▀██  ██  ██ ██ ▀███▀ ██      █
```

# Unentropy: your metrics, your data, your rules

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

### Step 1: Create Configuration

Create an `unentropy.json` file in your repository root:

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

**That's it!** Unentropy includes built-in templates for common metrics. Only override `command` when the metric needs project-specific configuration (like coverage, which varies by test framework).

### Step 2: Add GitHub Workflows

Unentropy uses two workflows:

1. **Main branch workflow** - Tracks metrics and builds historical database
2. **Pull request workflow** - Evaluates PRs against quality gate thresholds

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
        uses: unentropy/track-metrics-action@v1
```

**That's it!** Metrics are automatically tracked and stored in GitHub Actions artifacts. No secrets or external services required.

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
        uses: unentropy/quality-gate-action@v1
```

The quality gate will post a PR comment showing how metrics compare to your baseline and whether any thresholds are violated.

### Step 3: View Your Reports

After the workflow runs:

- Download `unentropy-report.html` from workflow artifacts
- Open in browser to see interactive metric trends over time
- On PRs, check the automated quality gate comment

## **Advanced Configuration**

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
- uses: unentropy/track-metrics-action@v1
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

## **Contribution**

Unentropy is an open-source project designed _by_ engineers for engineers. We welcome feedback, ideas, and contributions\! Please see our \[CONTRIBUTING.md\] file for guidelines.

**License:** MIT
