# Unentropy Quality Gate

> **Beta** - This action is currently in beta (0.x). APIs may change between minor versions.

Evaluate pull request metrics against baseline thresholds and post results as PR comments. Prevent regressions by catching metric degradations before merging.

## Usage

```yaml
name: Quality Gate
on:
  pull_request:
    branches: [main]

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: unentropy/quality-gate@v0
        with:
          storage-type: sqlite-s3
          s3-endpoint: ${{ vars.S3_ENDPOINT }}
          s3-bucket: ${{ vars.S3_BUCKET }}
          s3-region: ${{ vars.S3_REGION }}
          s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
          s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
```

## Inputs

| Input                    | Description                                                           | Required | Default                           |
| ------------------------ | --------------------------------------------------------------------- | -------- | --------------------------------- |
| `storage-type`           | Storage backend type (`sqlite-local`, `sqlite-s3`, `sqlite-artifact`) | No       | `sqlite-s3`                       |
| `config-file`            | Path to unentropy.json configuration file                             | No       | `unentropy.json`                  |
| `database-key`           | Database file key in storage                                          | No       | `unentropy.db`                    |
| `quality-gate-mode`      | Gate mode: `off`, `soft`, or `hard` (overrides config)                | No       | From config                       |
| `enable-pr-comment`      | Post/update PR comment with gate results                              | No       | `true`                            |
| `pr-comment-marker`      | HTML marker to identify canonical gate comment                        | No       | `<!-- unentropy-quality-gate -->` |
| `max-pr-comment-metrics` | Maximum metrics to show in PR comment                                 | No       | `30`                              |

### S3 Storage Options

| Input                  | Description                               | Required |
| ---------------------- | ----------------------------------------- | -------- |
| `s3-endpoint`          | S3-compatible endpoint URL                | No       |
| `s3-bucket`            | S3 bucket name                            | No       |
| `s3-region`            | S3 region                                 | No       |
| `s3-access-key-id`     | S3 access key ID (use GitHub Secrets)     | No       |
| `s3-secret-access-key` | S3 secret access key (use GitHub Secrets) | No       |

## Outputs

| Output                         | Description                                       |
| ------------------------------ | ------------------------------------------------- |
| `quality-gate-status`          | Overall gate status: `pass`, `fail`, or `unknown` |
| `quality-gate-mode`            | Gate mode used: `off`, `soft`, or `hard`          |
| `quality-gate-failing-metrics` | Comma-separated list of failing metric names      |
| `quality-gate-comment-url`     | URL of the PR comment (if created)                |
| `metrics-collected`            | Number of metrics collected from PR               |
| `baseline-builds-considered`   | Number of baseline builds used for comparison     |
| `baseline-reference-branch`    | Reference branch used for baseline                |

## Gate Modes

### Off Mode (`off`)

Quality gate is disabled. Metrics are collected but no pass/fail status is determined.

### Soft Mode (`soft`)

Quality gate evaluates metrics and posts results, but does not fail the workflow. Use this for informational feedback during rollout.

```yaml
- uses: unentropy/quality-gate@v0
  with:
    quality-gate-mode: soft
```

### Hard Mode (`hard`)

Quality gate fails the workflow if any metric exceeds its threshold. Use this to enforce quality standards.

```yaml
- uses: unentropy/quality-gate@v0
  with:
    quality-gate-mode: hard
```

## Configuration File

Configure quality gate thresholds in your `unentropy.json`:

```json
{
  "metrics": [
    {
      "name": "lines-of-code",
      "collector": "loc",
      "qualityGate": {
        "maxIncrease": 10,
        "maxIncreasePercent": 5
      }
    }
  ],
  "qualityGate": {
    "mode": "soft",
    "baseline": {
      "branch": "main",
      "sampleSize": 5
    }
  }
}
```

See the [Unentropy documentation](https://github.com/unentropy/unentropy) for full configuration options.

## PR Comment

When `enable-pr-comment` is `true` (default), the action posts a comment to the pull request with:

- Overall gate status (pass/fail)
- Metrics comparison table (current vs baseline)
- Failing metrics highlighted
- Trend indicators

The comment is automatically updated on subsequent runs.

## Complete Workflow Example

```yaml
name: Metrics Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # Track metrics on main branch pushes
  track:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: unentropy/track-metrics@v0
        with:
          storage-type: sqlite-s3
          s3-endpoint: ${{ vars.S3_ENDPOINT }}
          s3-bucket: ${{ vars.S3_BUCKET }}
          s3-region: ${{ vars.S3_REGION }}
          s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
          s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}

  # Evaluate quality gate on PRs
  gate:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: unentropy/quality-gate@v0
        with:
          storage-type: sqlite-s3
          s3-endpoint: ${{ vars.S3_ENDPOINT }}
          s3-bucket: ${{ vars.S3_BUCKET }}
          s3-region: ${{ vars.S3_REGION }}
          s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
          s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
          quality-gate-mode: soft
```

## Related Actions

- [unentropy/track-metrics](https://github.com/unentropy/track-metrics) - Track custom code metrics in CI/CD

## Links

- [Source Repository](https://github.com/unentropy/unentropy)
- [Documentation](https://github.com/unentropy/unentropy#readme)
- [Issues](https://github.com/unentropy/unentropy/issues)

## License

MIT License - see [LICENSE](https://github.com/unentropy/unentropy/blob/main/LICENSE) for details.
