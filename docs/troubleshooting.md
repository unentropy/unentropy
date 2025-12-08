---
title: Troubleshooting
description: Common issues and solutions for Unentropy
sidebar:
  order: 4
unentropy_docs:
  generated: 2025-12-08T14:32:00Z
  sources:
    - specs/001-metrics-tracking-poc/spec.md
    - specs/003-unified-s3-action/spec.md
    - specs/004-metrics-quality-gate/spec.md
    - specs/005-metrics-gallery/spec.md
    - specs/006-metrics-report/spec.md
    - specs/008-init-scaffolding/spec.md
  scope: all
---

Solutions to common problems you might encounter while using Unentropy.

## Configuration Issues

### Invalid Metric Key

**Symptoms**: Error: `Invalid metric key "Test-Coverage"`

**Cause**: Metric keys must be lowercase with hyphens only

**Solution**: Use pattern `^[a-z0-9-]+$`:

```json
{
  "metrics": {
    "test-coverage": { ... }  // ✅ Valid
    // "Test-Coverage": { ... }  ❌ Invalid
  }
}
```

## Metric Collection Issues

### Coverage Collection Fails

**Symptoms**: Error: `coverage/lcov.info not found`

**Cause**: Coverage report not generated before metric collection

**Solution**: Run tests with coverage first:

```bash
bun test --coverage --coverage-reporter=lcov
bunx unentropy test
```

For CI workflows, ensure test step runs before metrics:

```yaml
- name: Run tests with coverage
  run: bun test --coverage --coverage-reporter=lcov

- name: Track metrics
  uses: unentropy/track-metrics-action@v1
```

## Storage Issues

### Artifact Not Found

**Symptoms**: Warning: `No database artifact found`

**Cause**: First run or artifact expired

**Solution**: This is normal on first run. The action creates a new database. On subsequent runs, the artifact should be found.

Check artifact retention in repository **Settings** → **Actions** → **Artifact retention** (default: 90 days).

### S3 Authentication Failed

**Symptoms**: Error: `S3 authentication failed`

**Cause**: Invalid or missing credentials

**Solutions**:

1. Verify credentials in GitHub Secrets:
   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Confirm `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` exist
   - Check values are correct (no extra spaces)

2. Verify IAM permissions:

   ```
   s3:GetObject
   s3:PutObject
   s3:ListBucket
   ```

3. Check endpoint URL is correct:
   ```yaml
   s3-endpoint: https://s3.amazonaws.com  # AWS
   s3-endpoint: https://<account-id>.r2.cloudflarestorage.com  # R2
   ```

### Database Download Failed

**Symptoms**: Error: `Failed to download database from S3`

**Cause**: Network, permissions, or bucket configuration issue

**Solutions**:

- Verify bucket name and region are correct
- Check bucket exists and is accessible
- Ensure credentials have `s3:GetObject` permission
- Test S3 connectivity from GitHub Actions runner
- Check S3 provider status page for outages

### Database Upload Failed

**Symptoms**: Error: `Failed to upload database to S3`

**Cause**: Permission or quota issue

**Solutions**:

- Verify credentials have `s3:PutObject` permission
- Check bucket quota/storage limits
- Ensure bucket allows uploads
- Review bucket policies for restrictions
- Try uploading a small test file manually

### Concurrent Workflow Runs

**Symptoms**: Database corruption or lost data

**Cause**: Multiple workflows updating database simultaneously

**Solution**: Use workflow concurrency groups:

```yaml
concurrency:
  group: unentropy-${{ github.ref }}
  cancel-in-progress: false
```

This ensures only one workflow processes metrics at a time per branch.

### Quality Gate Comment Not Posted

**Symptoms**: No comment appears on PR

**Cause**: Permissions or workflow context issue

**Solutions**:

1. Verify `pull-requests: write` permission:

   ```yaml
   jobs:
     quality-gate:
       permissions:
         pull-requests: write
   ```

2. Check workflow runs in PR context:

   ```yaml
   on:
     pull_request: # Not pull_request_target
   ```

3. Review workflow logs for GitHub API errors

4. Ensure `GITHUB_TOKEN` has sufficient permissions:
   - Go to **Settings** → **Actions** → **General**
   - Check "Workflow permissions"

## Report Issues

### Report Shows No Data

**Symptoms**: Empty charts despite successful collection

**Cause**: Database not accessible or empty

**Solutions**:

- Verify metrics collected successfully in workflow logs
- Check storage backend is working
- Download database artifact and verify it contains data
- Ensure report generation uses same database as collection

## CLI Issues

### Project Type Not Detected

**Symptoms**: Error: `Cannot detect project type`

**Cause**: No marker files in current directory

**Solutions**:

1. Specify type explicitly:

   ```bash
   bunx unentropy init --type javascript
   ```

2. Ensure marker files are in current directory (not subdirectories):
   - JavaScript: `package.json`
   - PHP: `composer.json`
   - Go: `go.mod`
   - Python: `pyproject.toml`, `requirements.txt`

## Getting Help

1. **Check GitHub Issues**: https://github.com/unentropy/unentropy/issues
2. **Enable Verbose Logging**:
   ```bash
   bunx unentropy test --verbose
   ```
3. **Collect Debug Info**:
   - Unentropy version: `bunx unentropy --version`
   - Node/Bun version: `bun --version`
   - OS: `uname -a` (Linux/Mac) or `ver` (Windows)
   - Configuration: `bunx unentropy verify`

4. **File an Issue**: Include:
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages (full text)
   - Debug info from above

## Related Resources

- [Getting Started Guide](getting-started.md) - Initial setup
- [Configuration Reference](reference/config.md) - Config syntax
- [CLI Commands](reference/cli.md) - Command reference
- [GitHub Actions](reference/actions.md) - Workflow setup
