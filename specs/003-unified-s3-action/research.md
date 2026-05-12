# Research Findings: Unified S3-Compatible Storage Action

**Date**: Thu Nov 13 2025  
**Purpose**: Research technical decisions for implementing unified S3-compatible storage in Unentropy

## S3 SDK Selection

### Decision: Bun built-in S3Client

**Rationale**: 
- Built into the Bun runtime, no extra dependency
- Works with S3-compatible providers via endpoint configuration (AWS S3, MinIO, DigitalOcean Spaces, Cloudflare R2, Backblaze B2)
- Keeps bundle size small and avoids Node-specific SDK overhead
- Sufficient for required operations (download/upload and basic metadata)
- Error handling and retries implemented in our storage provider layer

**Alternatives Considered**:
- **MinIO JavaScript SDK**: Good for MinIO-specific deployments but less actively maintained and limited Bun compatibility
- **Bun Native S3 Client**: Currently experimental with stability concerns and limited provider support

### Bundle Size Impact
- AWS SDK v3: ~2-5MB (modular imports reduce size)
- Performance: Excellent with Bun's optimized fetch implementation
- Memory usage: Acceptable for GitHub Actions environment

## Provider Compatibility Matrix

| Provider | AWS SDK v3 Support | Notes |
|----------|-------------------|-------|
| AWS S3 | ✅ Full | Native support |
| MinIO | ✅ Full | S3-compatible API |
| DigitalOcean Spaces | ✅ Full | S3-compatible endpoint |
| Cloudflare R2 | ✅ Full | S3-compatible endpoint |
| Backblaze B2 | ✅ Full | S3-compatible endpoint |

## GitHub Actions Credential Management

### Recommended Approach: Repository Secrets

**Security Best Practices**:
- Never store credentials in configuration files
- Use GitHub Secrets for sensitive data
- Pass credentials as action input parameters
- Implement proper error handling without exposing secrets

**Implementation Pattern**:
```yaml
# Workflow example
- name: Run Unified Metrics Action
  uses: ./actions/unified
  with:
    storage-type: 'sqlite-s3'
    s3-endpoint: ${{ secrets.S3_ENDPOINT }}
    s3-bucket: ${{ secrets.S3_BUCKET }}
    s3-region: ${{ secrets.S3_REGION }}
    s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
    s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
```

### Alternative: OIDC (Future Enhancement)
- Use GitHub Actions OIDC for cloud providers that support it
- Reduces secret management overhead
- More secure than static credentials

## Error Handling Patterns

### Network Resilience
- Implement exponential backoff for transient failures
- Maximum 3 retries with 2^n second delays
- Distinguish between retryable and non-retryable errors

### Authentication Error Handling
- Invalid credentials: Fail immediately with clear error message
- Network issues: Retry with backoff
- Permission errors: Provide actionable guidance

### Database Corruption Handling
- Validate SQLite database integrity after download
- Provide options to recreate database if corrupted
- Preserve data integrity as highest priority

## Storage Backend Architecture

### Abstraction Layer Design
```typescript
interface StorageAdapter {
  download(key: string): Promise<Buffer>;
  upload(key: string, data: Buffer): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(prefix?: string): Promise<string[]>;
}

class S3Adapter implements StorageAdapter {
  // AWS SDK v3 implementation
}

class ArtifactAdapter implements StorageAdapter {
  // GitHub Artifacts implementation
}

class StorageFactory {
  static create(type: 'sqlite-local' | 'sqlite-artifact' | 'sqlite-s3'): StorageAdapter {
    // Factory method based on configuration
  }
}
```

### Configuration Schema Extension
```json
{
  "storage": {
    "type": "s3", // or "artifact" (default)
    "s3": {
      "endpoint": "https://s3.amazonaws.com",
      "bucket": "my-unentropy-bucket",
      "region": "us-east-1"
    }
  }
}
```

## Performance Considerations

### Transfer Speed Targets
- Database download: <30 seconds for 10MB files
- Database upload: <45 seconds for 10MB files
- Complete workflow: <5 minutes total

### Optimization Strategies
- Use Bun's native fetch for HTTP requests
- Implement streaming for large files
- Compress database files before upload (optional)
- Use multipart upload for files >100MB (future enhancement)

## Concurrency Handling

### Race Condition Prevention
- Implement advisory locking mechanism
- Use S3 object versioning for conflict detection
- Provide clear error messages for concurrent access
- Default to last-write-wins with warnings

### Locking Strategy
```typescript
interface LockManager {
  acquireLock(key: string, ttl: number): Promise<boolean>;
  releaseLock(key: string): Promise<void>;
  isLocked(key: string): Promise<boolean>;
}
```

## Testing Strategy

### Unit Tests
- Storage adapter implementations
- Factory pattern logic
- Error handling scenarios
- Configuration validation

### Integration Tests
- End-to-end S3 operations
- GitHub Artifacts integration
- Concurrent access scenarios
- Network failure simulation

### Contract Tests
- Storage interface compliance
- Action input/output contracts
- Error message formats

## Security Considerations

### Credential Protection
- Never log credentials or sensitive data
- Sanitize error messages to remove secrets
- Use secure parameter passing in GitHub Actions
- Implement credential validation without exposure

### Data Protection
- Validate database integrity before processing
- Implement secure temporary file handling
- Clean up sensitive data after processing
- Use HTTPS for all S3 communications

## Migration Strategy

### Backward Compatibility
- Default to GitHub Artifacts storage
- Seamless upgrade path for existing users
- Optional S3 migration with clear documentation
- Preserve existing database data during migration

### Migration Process
1. User adds S3 configuration to unentropy.json
2. Action detects S3 configuration on next run
3. Download existing database from Artifacts
4. Upload to S3 storage
5. Continue using S3 for subsequent runs

## Implementation Dependencies

### Runtime Requirements
- Bun runtime with built-in `S3Client` support (see https://bun.com/docs/runtime/s3)

### Existing Dependencies
- Current Unentropy collector and reporter modules
- SQLite database operations
- Configuration loading and validation
- GitHub Actions infrastructure

## Risk Assessment

### Technical Risks
- **Medium**: Bun compatibility issues with AWS SDK (mitigated by testing)
- **Low**: S3 provider compatibility variations (well-established S3 API)
- **Low**: Performance bottlenecks (targets are conservative)

### Operational Risks
- **Medium**: Credential management complexity (mitigated by clear documentation)
- **Low**: Data loss during migration (mitigated by backup strategies)
- **Low**: Concurrent access conflicts (mitigated by locking mechanism)

## Next Steps

1. Implement storage abstraction layer
2. Create S3 adapter with AWS SDK v3
3. Extend configuration schema for storage type
4. Implement unified GitHub Action
5. Add comprehensive error handling
6. Create migration documentation
7. Implement testing strategy
8. Update documentation and examples