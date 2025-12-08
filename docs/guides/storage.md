---
title: Storage
description: Choose how Unentropy stores your metrics data across workflow runs
sidebar:
  order: 2
unentropy_docs:
  generated: 2025-12-08T14:32:00Z
  sources:
    - specs/003-unified-s3-action/spec.md
  scope: all
---

Unentropy stores your metrics in a SQLite database. You control where that database lives: GitHub Actions artifacts (default), S3-compatible storage, or local files.

## Storage Options

Choose the storage backend that fits your needs:

| Type         | Use Case                      | Retention                |
| ------------ | ----------------------------- | ------------------------ |
| **Artifact** | Default, simple setup         | 90 days (GitHub default) |
| **S3**       | Long-term history, multi-repo | Unlimited                |
| **Local**    | Development, testing          | Until deleted            |

## GitHub Artifacts (Default)

GitHub Actions artifacts provide automatic storage with no additional setup. The database is uploaded after each metric collection and downloaded before the next run.

### Configuration

Artifacts are the default. No configuration needed:

```json
{
  "storage": {
    "type": "sqlite-artifact"
  }
}
```

Or omit the `storage` block entirely—artifact storage is used by default.

### How It Works

1. Action searches for latest database artifact from successful runs on your branch
2. Downloads and extracts the database (or creates new if none exists)
3. Collects metrics and updates the database
4. Uploads the updated database as a new artifact

### Artifact Settings

Configure artifact behavior in your `unentropy.json`:

```json
{
  "storage": {
    "type": "sqlite-artifact",
    "artifactName": "unentropy-metrics",
    "branch": "main"
  }
}
```

- **artifactName**: Name of the artifact (default: `unentropy-metrics`)
- **branch**: Branch to search for artifacts (default: current branch)

### Retention

GitHub Actions artifacts expire after 90 days by default. Check your repository settings under Actions → Artifact retention to verify or adjust this limit.

> **Note**: Free GitHub accounts have limited artifact storage. Paid plans include more storage and longer retention.

## S3-Compatible Storage

Use S3-compatible storage for long-term history or multi-repository tracking. Works with AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces, and other S3-compatible providers.

### Configuration

Set storage type to `sqlite-s3`:

```json
{
  "storage": {
    "type": "sqlite-s3"
  }
}
```

Provide S3 credentials as GitHub Action inputs (not in config file):

```yaml
- name: Track metrics
  uses: unentropy/track-metrics-action@v1
  with:
    s3-endpoint: ${{ secrets.S3_ENDPOINT }}
    s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
    s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
    s3-bucket: my-metrics-bucket
    s3-region: us-east-1
```

### Add Secrets to GitHub

1. Go to your repository **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these secrets:
   - `S3_ENDPOINT` - Your S3 endpoint URL
   - `S3_ACCESS_KEY_ID` - S3 access key
   - `S3_SECRET_ACCESS_KEY` - S3 secret key

### Supported Providers

Unentropy works with any S3-compatible storage:

#### AWS S3

```yaml
with:
  s3-endpoint: https://s3.amazonaws.com
  s3-bucket: my-metrics-bucket
  s3-region: us-east-1
  s3-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
  s3-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

#### Cloudflare R2

```yaml
with:
  s3-endpoint: https://<account-id>.r2.cloudflarestorage.com
  s3-bucket: my-metrics-bucket
  s3-region: auto
  s3-access-key-id: ${{ secrets.R2_ACCESS_KEY_ID }}
  s3-secret-access-key: ${{ secrets.R2_SECRET_ACCESS_KEY }}
```

#### MinIO (Self-Hosted)

```yaml
with:
  s3-endpoint: https://minio.example.com
  s3-bucket: unentropy
  s3-region: us-east-1
  s3-access-key-id: ${{ secrets.MINIO_ACCESS_KEY }}
  s3-secret-access-key: ${{ secrets.MINIO_SECRET_KEY }}
```

#### DigitalOcean Spaces

```yaml
with:
  s3-endpoint: https://nyc3.digitaloceanspaces.com
  s3-bucket: my-metrics
  s3-region: nyc3
  s3-access-key-id: ${{ secrets.DO_SPACES_KEY }}
  s3-secret-access-key: ${{ secrets.DO_SPACES_SECRET }}
```

### How It Works

1. Action downloads the database from S3 before collection
2. Creates a new database if none exists (first run)
3. Collects metrics and updates the database
4. Uploads the updated database back to S3
5. Generates and uploads HTML report as workflow artifact

### Bucket Setup

Create a dedicated bucket or use a prefix to organize files:

- Bucket name: `my-metrics-bucket`
- Database path: `unentropy.db` (default)
- Report path: Generated as workflow artifact

Ensure your credentials have these permissions:

- `s3:GetObject` - Download database
- `s3:PutObject` - Upload database
- `s3:ListBucket` - Check if database exists

## Local Storage

Local storage is useful for development and testing. The database is stored as a file in your working directory.

### Configuration

```json
{
  "storage": {
    "type": "sqlite-local"
  }
}
```

### How It Works

The database is created at `./unentropy.db` in your project directory. Use this for local development with `bunx unentropy test` or `bunx unentropy preview`.

> **Warning**: Local storage does not persist across CI runs unless you manually handle database files in your workflow.

## Switching Storage Backends

You can switch between storage types at any time by updating your configuration.

### From Artifacts to S3

1. Update `storage.type` in `unentropy.json` to `sqlite-s3`
2. Add S3 credentials to GitHub Secrets
3. Update your workflow to include S3 parameters
4. Commit and push

The next run will create a new database in S3. Historical data from artifacts is not automatically migrated.

### Migrating Data

To preserve historical data when switching backends:

1. Download the database from the old storage (artifact or S3)
2. Upload it to the new storage location manually
3. Update your configuration
4. Verify the next run picks up existing data

For artifacts, download from the **Actions** tab → workflow run → artifacts.

For S3, use the AWS CLI or your provider's tools.

## Troubleshooting

### Artifact Not Found

**Problem**: Warning: `No database artifact found`

**Solution**: This is normal on the first run. The action creates a new database. On subsequent runs, the artifact should be found.

### S3 Authentication Failed

**Problem**: Error: `S3 authentication failed`

**Solutions**:

- Verify credentials are correct in GitHub Secrets
- Check that the IAM user/role has the required permissions
- Ensure the S3 endpoint URL is correct
- Confirm the bucket exists and is accessible

### Database Download Failed

**Problem**: Error: `Failed to download database from S3`

**Solutions**:

- Check network connectivity to S3 endpoint
- Verify bucket name and region are correct
- Ensure credentials have `s3:GetObject` permission
- Check S3 provider status page for outages

### Database Upload Failed

**Problem**: Error: `Failed to upload database to S3`

**Solutions**:

- Verify credentials have `s3:PutObject` permission
- Check bucket quota/storage limits
- Ensure network connectivity is stable
- Review S3 provider's upload size limits

### Concurrent Workflow Runs

**Problem**: Multiple workflows running simultaneously

**Solution**: Unentropy provides basic concurrency handling. For high-traffic repositories, consider using workflow concurrency groups:

```yaml
concurrency:
  group: unentropy-${{ github.ref }}
  cancel-in-progress: false
```

This ensures only one workflow processes metrics at a time per branch.

## Related Resources

- [Getting Started Guide](../getting-started.md) - Initial setup
- [GitHub Actions Reference](../reference/actions.md) - Action parameters
- [Configuration Reference](../reference/config.md) - Storage options
