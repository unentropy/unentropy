# Quickstart Guide: Track-Metrics S3-Compatible Storage Action

**Date**: Thu Nov 13 2025  
**Purpose**: Get started quickly with the track-metrics Unentropy action

## Prerequisites

- GitHub repository with Unentropy configuration (`unentropy.json`)
- GitHub Actions enabled for your repository
- (Optional) S3-compatible storage account for persistent storage

## Storage Backends Overview

Unentropy supports three storage backends via the `storage.type` field in `unentropy.json` and the `storage-type` action input:

- `sqlite-local` (default): local SQLite file, ideal for simple or local setups
- `sqlite-artifact`: database persisted as a GitHub Artifact (limited unified workflow)
- `sqlite-s3`: database stored in S3-compatible storage, enabling the full unified track-metrics workflow

In the steps below:
- Step 1 uses `storage-type: 'sqlite-artifact'` in the workflow while configuration defaults to `sqlite-local` when `storage` is omitted.
- Step 2 and later show how to enable the unified S3-backed workflow with `sqlite-s3`.

## Step 1: Basic Setup (GitHub Artifacts)

### 1.1 Create unentropy.json

```json
{
  "metrics": [
    {
      "name": "test-coverage",
      "type": "numeric",
      "description": "Test coverage percentage",
      "command": "bun test --coverage | grep 'Lines' | awk '{print $2}' | sed 's/%//'"
    },
    {
      "name": "lines-of-code",
      "type": "numeric", 
      "description": "Total lines of code",
      "command": "find src/ -name '*.ts' | xargs wc -l | tail -1 | awk '{print $1}'"
    }
  ]
}
```

### 1.2 Create GitHub Workflow

Create `.github/workflows/metrics.yml`:

```yaml
name: Metrics Collection

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install Dependencies
        run: bun install
      
      - name: Collect Metrics
        uses: ./actions/track-metrics
```

### 1.3 Commit and Push

```bash
git add unentropy.json .github/workflows/metrics.yml
git commit -m "Add Unentropy metrics collection"
git push origin main
```

### 1.4 View Results

1. Go to your repository's **Actions** tab
2. Click on the **Metrics Collection** workflow
3. View the generated HTML report in the workflow artifacts

## Step 2: S3 Storage Setup

### 2.1 Create S3 Bucket

```bash
# AWS S3 Example
aws s3 mb s3://my-unentropy-metrics

# MinIO Example (local)
mc mb local/unentropy-metrics

# DigitalOcean Spaces Example
# Create space via DigitalOcean control panel
```

### 2.2 Configure S3 Credentials

Add the following to your repository's **Settings > Secrets and variables > Actions**:

| Secret Name | Value |
|-------------|-------|
| `S3_ENDPOINT` | `https://s3.amazonaws.com` (or your provider's endpoint) |
| `S3_BUCKET` | `my-unentropy-metrics` |
| `S3_REGION` | `us-east-1` |
| `S3_ACCESS_KEY_ID` | Your access key ID |
| `S3_SECRET_ACCESS_KEY` | Your secret access key |

> Security note: S3 credentials (access key ID, secret access key, etc.) must always be provided via GitHub Secrets and passed as action inputs. They should never be stored in `unentropy.json` or committed to the repository.

### 2.3 Update Configuration

Option 1: Update unentropy.json to specify S3 storage:

```json
{
  "storage": {
    "type": "sqlite-s3"
  },
  "metrics": [
    {
      "name": "test-coverage",
      "type": "numeric",
      "description": "Test coverage percentage",
      "command": "bun test --coverage | grep 'Lines' | awk '{print $2}' | sed 's/%//'"
    }
  ]
}
```

Option 2: Keep unentropy.json unchanged and specify storage type in workflow:

```yaml
- name: Collect Metrics
  uses: ./actions/track-metrics
  with:
    s3-endpoint: ${{ secrets.S3_ENDPOINT }}
    s3-bucket: ${{ secrets.S3_BUCKET }}
    s3-region: ${{ secrets.S3_REGION }}
    s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
    s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
```

### 2.4 Update Workflow

```yaml
name: Metrics Collection with S3

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install Dependencies
        run: bun install
      
      - name: Collect Metrics
        uses: ./actions/track-metrics
        with:
          s3-endpoint: ${{ secrets.S3_ENDPOINT }}
          s3-bucket: ${{ secrets.S3_BUCKET }}
          s3-region: ${{ secrets.S3_REGION }}
          s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
          s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
```

## Step 3: Advanced Configuration

### 3.1 Conditional Storage

Use different storage backends based on branch:

```yaml
- name: Collect Metrics
  uses: ./actions/track-metrics
  with:
    storage-type: ${{ github.ref == 'refs/heads/main' && 'sqlite-s3' || 'sqlite-artifact' }}
    s3-endpoint: ${{ secrets.S3_ENDPOINT }}
    s3-bucket: ${{ secrets.S3_BUCKET }}
    s3-region: ${{ secrets.S3_REGION }}
    s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
    s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
```

### 3.2 Custom Database Location

```yaml
- name: Collect Metrics
  uses: ./actions/track-metrics
  with:
    s3-endpoint: ${{ secrets.S3_ENDPOINT }}
    s3-bucket: ${{ secrets.S3_BUCKET }}
    s3-region: ${{ secrets.S3_REGION }}
    s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
    s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
    database-key: 'production/unentropy.db'
```

### 3.3 Custom Report Name

```yaml
- name: Collect Metrics
  uses: ./actions/track-metrics
  id: metrics
  with:
    s3-endpoint: ${{ secrets.S3_ENDPOINT }}
    s3-bucket: ${{ secrets.S3_BUCKET }}
    s3-region: ${{ secrets.S3_REGION }}
    s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
    s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
    report-name: 'metrics-report-${{ github.sha }}.html'

- name: Upload Report
  uses: actions/upload-artifact@v4
  with:
    name: metrics-report
    path: ${{ steps.metrics.outputs.report-url }}
```

## Step 4: Provider-Specific Setup

### 4.1 AWS S3

```bash
# Create bucket
aws s3 mb s3://my-unentropy-metrics

# Create IAM user with programmatic access
aws iam create-user --user-name unentropy-metrics

# Attach policy (replace with your bucket name)
cat > unentropy-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-unentropy-metrics",
        "arn:aws:s3:::my-unentropy-metrics/*"
      ]
    }
  ]
}
EOF

aws iam put-user-policy --user-name unentropy-metrics --policy-name UnentropyMetrics --policy-document file://unentropy-policy.json
```

### 4.2 DigitalOcean Spaces

```yaml
# Workflow for DigitalOcean Spaces
- name: Collect Metrics
  uses: ./actions/track-metrics
  with:
    s3-endpoint: 'https://nyc3.digitaloceanspaces.com'
    s3-bucket: 'my-unentropy-metrics'
    s3-region: 'nyc3'
    s3-access-key-id: ${{ secrets.DO_SPACES_KEY }}
    s3-secret-access-key: ${{ secrets.DO_SPACES_SECRET }}
```

### 4.3 Cloudflare R2

```yaml
# Workflow for Cloudflare R2
- name: Collect Metrics
  uses: ./actions/track-metrics
  with:
    s3-endpoint: 'https://your-account-id.r2.cloudflarestorage.com'
    s3-bucket: 'unentropy-metrics'
    s3-region: 'auto'
    s3-access-key-id: ${{ secrets.CF_R2_ACCESS_KEY_ID }}
    s3-secret-access-key: ${{ secrets.CF_R2_SECRET_ACCESS_KEY }}
```

## Step 5: Troubleshooting

### 5.1 Common Issues

**Issue**: "Invalid storage-type"  
**Solution**: Ensure storage-type is 'sqlite-local', 'sqlite-artifact', or 'sqlite-s3'

**Issue**: "Missing required S3 parameters"  
**Solution**: Provide all S3 parameters when using S3 storage

**Issue**: "Failed to connect to S3"  
**Solution**: Verify endpoint URL, credentials, and network connectivity

**Issue**: "Database corrupted"  
**Solution**: The action will recreate the database automatically

### 5.2 Debug Mode

Enable verbose logging:

```yaml
- name: Collect Metrics
  uses: ./actions/track-metrics
  with:
    s3-endpoint: ${{ secrets.S3_ENDPOINT }}
    s3-bucket: ${{ secrets.S3_BUCKET }}
    s3-region: ${{ secrets.S3_REGION }}
    s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
    s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
    verbose: 'true'
```

### 5.3 Check Action Outputs

```yaml
- name: Collect Metrics
  uses: ./actions/track-metrics
  id: metrics
  with:
    s3-endpoint: ${{ secrets.S3_ENDPOINT }}
    s3-bucket: ${{ secrets.S3_BUCKET }}
    s3-region: ${{ secrets.S3_REGION }}
    s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
    s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}

- name: Debug Outputs
  run: |
    echo "Success: ${{ steps.metrics.outputs.success }}"
    echo "Storage Type: ${{ steps.metrics.outputs.storage-type }}"
    echo "Database Location: ${{ steps.metrics.outputs.database-location }}"
    echo "Database Size: ${{ steps.metrics.outputs.database-size }}"
    echo "Metrics Collected: ${{ steps.metrics.outputs.metrics-collected }}"
    echo "Duration: ${{ steps.metrics.outputs.duration }}"
    echo "Error Code: ${{ steps.metrics.outputs.error-code }}"
    echo "Error Message: ${{ steps.metrics.outputs.error-message }}"
```

## Step 6: Migration from Artifacts to S3

### 6.1 Automatic Migration

1. Add S3 configuration to your workflow
2. The action will automatically migrate existing data from Artifacts to S3
3. Subsequent runs will use S3 storage

### 6.2 Manual Migration

```bash
# Download existing database from artifacts
# (Use GitHub UI or API to download)

# Upload to S3
aws s3 cp unentropy.db s3://my-unentropy-metrics/unentropy.db

# Update configuration to use S3
```

## Next Steps

- Explore advanced metric configurations
- Set up scheduled runs for regular monitoring
- Configure notifications for metric thresholds
- Integrate with pull request reviews
- Set up custom report templates

## Support

- Check the [GitHub Issues](https://github.com/your-repo/issues) for common problems
- Review the [documentation](../spec.md) for detailed specifications
- Use verbose logging for debugging
- Check action outputs for detailed error information
