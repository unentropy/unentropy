# Unentropy Track Metrics

> **Beta** - This action is currently in beta (0.x). APIs may change between minor versions.

Track custom code metrics in your CI/CD pipeline. Collect, store, and visualize metrics over time to understand trends in your codebase.

## Usage

```yaml
name: Track Metrics
on:
  push:
    branches: [main]

jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: unentropy/track-metrics@v0
        with:
          storage-type: sqlite-artifact
```

## Inputs

| Input            | Description                                                              | Required | Default                |
| ---------------- | ------------------------------------------------------------------------ | -------- | ---------------------- |
| `storage-type`   | Storage backend type (`sqlite-local`, `sqlite-artifact`, or `sqlite-s3`) | No       | `sqlite-local`         |
| `config-file`    | Path to unentropy.json configuration file                                | No       | `unentropy.json`       |
| `database-key`   | Database file key/path in storage                                        | No       | `unentropy-metrics.db` |
| `report-dir`     | Generated report directory path                                          | No       | `unentropy-report`     |
| `timeout`        | Action timeout in seconds                                                | No       | `300`                  |
| `retry-attempts` | Number of retry attempts for storage operations                          | No       | `3`                    |
| `verbose`        | Enable verbose logging                                                   | No       | `false`                |

### S3 Storage Options

| Input                  | Description                               | Required |
| ---------------------- | ----------------------------------------- | -------- |
| `s3-endpoint`          | S3-compatible endpoint URL                | No       |
| `s3-bucket`            | S3 bucket name                            | No       |
| `s3-region`            | S3 region                                 | No       |
| `s3-access-key-id`     | S3 access key ID (use GitHub Secrets)     | No       |
| `s3-secret-access-key` | S3 secret access key (use GitHub Secrets) | No       |

### Artifact Storage Options

| Input                    | Description                             | Required | Default             |
| ------------------------ | --------------------------------------- | -------- | ------------------- |
| `artifact-name`          | Name of the database artifact           | No       | `unentropy-metrics` |
| `artifact-branch-filter` | Branch to search for previous artifacts | No       | Current branch      |

## Outputs

| Output              | Description                                                               |
| ------------------- | ------------------------------------------------------------------------- |
| `success`           | Whether the workflow completed successfully                               |
| `storage-type`      | Storage backend type used                                                 |
| `database-location` | Database storage location identifier                                      |
| `database-size`     | Database file size in bytes                                               |
| `metrics-collected` | Number of metrics collected                                               |
| `total-builds`      | Total number of builds in the database                                    |
| `duration`          | Total workflow duration in milliseconds                                   |
| `source-run-id`     | Workflow run ID where previous artifact was found (artifact storage only) |
| `error-code`        | Error code (if failed)                                                    |
| `error-message`     | Error message (if failed)                                                 |

## Storage Types

### Local Storage (`sqlite-local`)

Stores the database locally. Best for testing or single-run metrics.

```yaml
- uses: unentropy/track-metrics@v0
  with:
    storage-type: sqlite-local
```

### GitHub Artifacts (`sqlite-artifact`)

Stores the database as a GitHub Actions artifact. Persists across workflow runs without external dependencies.

```yaml
- uses: unentropy/track-metrics@v0
  with:
    storage-type: sqlite-artifact
    artifact-name: my-metrics
```

### S3-Compatible Storage (`sqlite-s3`)

Stores the database in an S3-compatible bucket. Best for long-term persistence and cross-repository metrics.

```yaml
- uses: unentropy/track-metrics@v0
  with:
    storage-type: sqlite-s3
    s3-endpoint: ${{ vars.S3_ENDPOINT }}
    s3-bucket: ${{ vars.S3_BUCKET }}
    s3-region: ${{ vars.S3_REGION }}
    s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
    s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
```

## Configuration File

Create an `unentropy.json` file in your repository root to configure metrics collection:

```json
{
  "metrics": [
    {
      "name": "lines-of-code",
      "collector": "loc"
    }
  ]
}
```

See the [Unentropy documentation](https://github.com/unentropy/unentropy) for full configuration options.

## Related Actions

- [unentropy/quality-gate](https://github.com/unentropy/quality-gate) - Evaluate PR metrics against baseline thresholds

## Links

- [Source Repository](https://github.com/unentropy/unentropy)
- [Documentation](https://github.com/unentropy/unentropy#readme)
- [Issues](https://github.com/unentropy/unentropy/issues)

## License

MIT License - see [LICENSE](https://github.com/unentropy/unentropy/blob/main/LICENSE) for details.
