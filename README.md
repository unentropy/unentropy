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

### Configuration

Create an `unentropy.json` file to define your metrics:

```json
{
  "metrics": [
    {
      "$ref": "loc",
      "name": "lines-of-code",
      "description": "Total lines of TypeScript code",
      "command": "@collect loc ./src --language TypeScript"
    },
    {
      "$ref": "coverage",
      "name": "test-coverage",
      "description": "Test coverage",
      "command": "@collect coverage-lcov coverage/lcov.info"
    }
  ],
  "storage": {
    "type": "sqlite-s3"
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

### Set up GitHub Workflows

Unentropy uses two separate workflows:

1. **Main branch workflow** - Tracks metrics and builds historical database
2. **Pull request workflow** - Evaluates PRs against quality gate thresholds

#### Main Branch Workflow

Create `.github/workflows/metrics.yml`:

```yaml
name: Metrics Tracking
on:
  push:
    branches: [main]

jobs:
  track-metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tests with coverage
        run: npm test -- --coverage

      - name: Track metrics
        uses: unentropy/track-metrics-action@v1
        with:
          s3-endpoint: ${{ secrets.AWS_ENDPOINT_URL }}
          s3-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          s3-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          s3-bucket: ${{ secrets.AWS_BUCKET_NAME }}
          s3-region: ${{ secrets.AWS_REGION }}
          database-key: "unentropy-metrics.db"
```

#### Pull Request Workflow with Quality Gate

Create `.github/workflows/quality-gate.yml`:

```yaml
name: Quality Gate
on:
  pull_request:

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tests with coverage
        run: bun test --coverage --coverage-report=lcov

      - name: Quality Gate Check
        uses: unentropy/quality-gate-action@v1
        with:
          storage-type: sqlite-s3
          quality-gate-mode: soft # Use 'hard' to block PRs that fail thresholds
          s3-endpoint: ${{ secrets.AWS_ENDPOINT_URL }}
          s3-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          s3-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          s3-bucket: ${{ secrets.AWS_BUCKET_NAME }}
          s3-region: ${{ secrets.AWS_REGION }}
          database-key: "unentropy-metrics.db"
```

### Publish the report to GitHub Pages

```yaml
deploy:
  name: Deploy to GitHub Pages
  environment:
    name: github-pages
    url: ${{ steps.deployment.outputs.page_url }}
  runs-on: ubuntu-latest
  needs: metrics
  if: github.ref == 'refs/heads/main' && needs.metrics.result == 'success'
```

### Quality Gate Modes

The quality gate can operate in three modes:

- **`off`** - Disabled, no threshold evaluation
- **`soft`** (recommended for new setups) - Evaluates thresholds and posts PR comments, but never fails the build
- **`hard`** - Fails the build when blocking thresholds are violated

Start with `soft` mode to observe behavior, then switch to `hard` mode once your thresholds are stable.

### Review Reports

After the CI run, download the `unentropy-report.html` artifact to see the latest trends and track your progress against codebase entropy!

On pull requests, the quality gate will automatically post a comment showing how metrics compare to your baseline and whether any thresholds are violated.

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
