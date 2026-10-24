# GitHub Action Interface: Track-Metrics

**Domain**: actions/track-metrics

## Action Definition

### Action Metadata

```yaml
name: 'Unentropy Track Metrics'
description: 'Complete metrics workflow with S3 and GitHub Artifacts storage support'
author: 'Unentropy'
branding:
  icon: 'bar-chart'
  color: 'blue'
```

### Input Parameters

```yaml
inputs:
  # Storage Configuration
  storage-type:
    description: 'Storage backend type (sqlite-local, sqlite-artifact, or sqlite-s3)'
    required: false
    default: 'sqlite-local'

  # S3 Configuration (overrides unentropy.json, required for credentials)
  s3-endpoint:
    description: 'S3-compatible endpoint URL (overrides config file)'
    required: false
  s3-bucket:
    description: 'S3 bucket name (overrides config file)'
    required: false
  s3-region:
    description: 'S3 region (overrides config file)'
    required: false
  s3-access-key-id:
    description: 'S3 access key ID (from GitHub Secrets, required for S3)'
    required: false
  s3-secret-access-key:
    description: 'S3 secret access key (from GitHub Secrets, required for S3)'
    required: false

  # Artifact Configuration (for sqlite-artifact storage)
  artifact-name:
    description: 'Name of the database artifact to search for and upload'
    required: false
    default: 'unentropy-metrics'
  artifact-branch-filter:
    description: 'Branch to search for previous artifacts (default: current branch)'
    required: false
    default: '${{ github.ref_name }}'

  # Configuration File
  config-file:
    description: 'Path to unentropy.json configuration file'
    required: false
    default: 'unentropy.json'

  # Database Configuration
  database-key:
    description: 'Database file key in storage'
    required: false
    default: 'unentropy-metrics.db'

  # Report Configuration
  report-name:
    description: 'Generated report file name'
    required: false
    default: 'index.html'

  # Runtime Configuration
  timeout:
    description: 'Maximum execution time in minutes'
    required: false
    default: '5'
  retry-attempts:
    description: 'Maximum retry attempts for transient failures'
    required: false
    default: '3'
  verbose:
    description: 'Enable verbose logging for debugging'
    required: false
    default: 'false'

  # Authentication
  github-token:
    description: 'GitHub token used for artifact storage and PR comments'
    required: false
    default: '${{ github.token }}'
```

### Output Parameters

```yaml
outputs:
  success:
    description: 'Whether the workflow completed successfully'

  storage-type:
    description: 'Storage backend type used'

  database-location:
    description: 'Database storage location identifier'

  database-size:
    description: 'Database file size in bytes'

  metrics-collected:
    description: 'Number of metrics collected'

  duration:
    description: 'Total workflow duration in milliseconds'

  # Artifact-specific outputs (only set when storage-type is sqlite-artifact)
  source-run-id:
    description: 'Workflow run ID where the previous database artifact was found (artifact storage only)'

  artifact-id:
    description: 'ID of the uploaded database artifact (artifact storage only)'
```

### Runtime

```yaml
runs:
  using: 'node24'
  main: 'dist/track-metrics.mjs'
```

Outputs are set by the action code through `core.setOutput`, so the metadata declares only their descriptions.

## Configuration Precedence

The track-metrics action uses a hierarchical configuration system with the following precedence (highest to lowest):

1. **Action Inputs** (highest priority)
   - Override all other configuration sources
   - Used for secrets and runtime-specific values
   - Environment variables automatically expanded by GitHub Actions
   - Example: `s3-bucket: ${{ secrets.S3_BUCKET }}`

2. **Configuration File** (lowest priority)
   - Provides defaults and documentation
   - Contains non-sensitive configuration
   - Example: `unentropy.json`

### Configuration Split Strategy

**Sensitive Data (Action Inputs from GitHub Secrets):**
- S3 credentials (`s3-access-key-id`, `s3-secret-access-key`)
- Runtime overrides for different environments

**Non-Sensitive Data (Configuration File):**
- Default S3 settings (`endpoint`, `region`, `bucket`)
- Database configuration (`key`)
- Report settings (`name`)
- Metric collection rules

## Usage Examples

### Basic Usage (GitHub Artifacts)

```yaml
name: Metrics Collection
on:
  push:
    branches: [ main ]

jobs:
  metrics:
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Collect Metrics
        uses: ./.github/actions/track-metrics
        with:
          storage-type: 'sqlite-artifact'

      - name: Upload Report
        uses: actions/upload-artifact@v4
        with:
          name: metrics-report
          path: index.html
```

### GitHub Artifacts with Custom Settings

```yaml
name: Metrics Collection
on:
  push:
    branches: [ main ]

jobs:
  metrics:
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Collect Metrics
        uses: ./.github/actions/track-metrics
        with:
          storage-type: 'sqlite-artifact'
          artifact-name: 'my-project-metrics'
          artifact-branch-filter: 'main'
          report-name: 'metrics-report.html'

      - name: Upload Report
        uses: actions/upload-artifact@v4
        with:
          name: metrics-report
          path: metrics-report.html
```

### S3 Storage Usage

```yaml
name: Metrics Collection with S3
on:
  push:
    branches: [ main ]

jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Collect Metrics
        uses: ./.github/actions/track-metrics
        with:
          storage-type: 'sqlite-s3'
          s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
          s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
          s3-bucket: ${{ secrets.S3_BUCKET }}

      - name: Upload Report
        uses: actions/upload-artifact@v4
        with:
          name: metrics-report
          path: index.html
```

### Advanced Configuration (Full Override)

```yaml
name: Advanced Metrics Collection
on:
  push:
    branches: [ main ]

jobs:
  metrics:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - name: Collect Metrics
        uses: ./.github/actions/track-metrics
        id: metrics
        with:
          storage-type: 'sqlite-s3'
          s3-endpoint: ${{ secrets.S3_ENDPOINT }}
          s3-bucket: ${{ secrets.S3_BUCKET }}
          s3-region: ${{ secrets.S3_REGION }}
          s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
          s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
          database-key: 'production/unentropy.db'
          report-name: 'metrics-report.html'

      - name: Upload Report
        if: steps.metrics.outputs.success == 'true'
        uses: actions/upload-artifact@v4
        with:
          name: metrics-report
          path: metrics-report.html
```

### Matrix Strategy (Dual Storage Testing)

```yaml
name: Metrics (Dual Storage Test)
on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  metrics:
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
    strategy:
      fail-fast: false
      matrix:
        storage:
          - type: sqlite-s3
            name: s3
            report: index.html
          - type: sqlite-artifact
            name: artifact
            report: report-artifact.html

    steps:
      - uses: actions/checkout@v4

      - name: Track Metrics (${{ matrix.storage.name }})
        uses: ./.github/actions/track-metrics
        with:
          storage-type: ${{ matrix.storage.type }}
          report-name: ${{ matrix.storage.report }}
          s3-access-key-id: ${{ matrix.storage.type == 'sqlite-s3' && secrets.S3_ACCESS_KEY_ID || '' }}
          s3-secret-access-key: ${{ matrix.storage.type == 'sqlite-s3' && secrets.S3_SECRET_ACCESS_KEY || '' }}
          s3-bucket: ${{ matrix.storage.type == 'sqlite-s3' && secrets.S3_BUCKET || '' }}
          s3-endpoint: ${{ matrix.storage.type == 'sqlite-s3' && secrets.S3_ENDPOINT || '' }}
          s3-region: ${{ matrix.storage.type == 'sqlite-s3' && secrets.S3_REGION || '' }}

      - name: Upload Report
        uses: actions/upload-artifact@v4
        with:
          name: metrics-report-${{ matrix.storage.name }}
          path: ${{ matrix.storage.report }}
```

### Environment-Based Configuration

```yaml
name: Environment-Based Metrics
on:
  push:
    branches: [ main, 'feature/**' ]

jobs:
  metrics:
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Collect Metrics
        uses: ./.github/actions/track-metrics
        with:
          storage-type: ${{ github.ref == 'refs/heads/main' && 'sqlite-s3' || 'sqlite-artifact' }}
          s3-access-key-id: ${{ github.ref == 'refs/heads/main' && secrets.S3_ACCESS_KEY_ID || '' }}
          s3-secret-access-key: ${{ github.ref == 'refs/heads/main' && secrets.S3_SECRET_ACCESS_KEY || '' }}
          s3-bucket: ${{ github.ref == 'refs/heads/main' && secrets.S3_BUCKET || '' }}

      - name: Upload Report
        uses: actions/upload-artifact@v4
        with:
          name: metrics-report
          path: index.html
```

## Security Considerations

### Credential Protection

- All S3 credentials are passed as action inputs from GitHub Secrets
- Credentials are never logged or exposed in error messages
- Input validation prevents credential injection
- Temporary credential storage in memory only
- The GitHub token for artifact operations is read from the `github-token` input (default `${{ github.token }}`) and falls back to the `GITHUB_TOKEN` environment variable

### Data Protection

- Database files are validated for integrity
- Temporary files are cleaned up after processing
- No sensitive data is included in action outputs
- Error messages are sanitized to remove secrets

### Access Control

- Action respects GitHub repository permissions
- S3 access is limited to specified bucket and operations
- Artifact access limited to same repository (no cross-repository access)
- Artifact operations require `actions: read` permission
- Audit logging for storage operations

## Performance Considerations

### Timeout Handling

- Default timeout: 5 minutes
- Configurable timeout per workflow needs via `timeout` input
- Phase-specific timeouts for long operations
- Graceful degradation on timeout

### Retry Logic

- Exponential backoff for retryable errors
- Maximum retry attempts configurable via `retry-attempts` input
- Non-retryable errors fail immediately
- Retry status logging for debugging

### Resource Usage

- Memory usage optimized for large database files
- Streaming operations for file transfers
- Concurrent operations where safe
- Cleanup of temporary resources

## Permissions

### Required Permissions for Artifact Storage

```yaml
permissions:
  actions: read    # Required: List and download artifacts
  contents: read   # Required: Checkout repository
```

### Required Permissions for S3 Storage

```yaml
permissions:
  contents: read   # Required: Checkout repository
  # S3 access controlled via credentials, not GitHub permissions
```
