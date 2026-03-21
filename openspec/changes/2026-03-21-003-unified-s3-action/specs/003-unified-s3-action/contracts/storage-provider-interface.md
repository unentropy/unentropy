# Contract: Storage Provider Interface Extension

**Feature**: 003-unified-s3-action  
**Base Contract**: 001-mvp-metrics-tracking  
**Created**: Sat Nov 15 2025  
**Status**: Draft

## Purpose

This document extends the Storage Provider interface contract defined in `/specs/001-mvp-metrics-tracking/contracts/storage-provider-interface.md` for the unified S3 action implementation.

## Base Contract Reference

The complete Storage Provider interface contract is defined in `/specs/001-mvp-metrics-tracking/contracts/storage-provider-interface.md`. This extension documents:

1. How spec 003 implements the SqliteS3StorageProvider
2. Integration patterns specific to the unified S3 action
3. S3-specific implementation details

## Implementation Requirements for Spec 003

The unified S3 action will:

1. **Use existing StorageProvider interface** - No changes needed to the core interface
2. **Implement SqliteS3StorageProvider** - New provider for S3-compatible storage
3. **Leverage factory pattern** - Use `createStorageProvider()` function from spec 001
4. **Maintain compatibility** - Ensure existing providers continue to work unchanged

## SqliteS3StorageProvider Implementation

Based on the StorageProvider interface contract from spec 001:

### Interface Compliance

```typescript
class SqliteS3StorageProvider implements StorageProvider {
  private db: Database | null = null;
  private tempPath: string | null = null;
  private isInitialized = false;

  async initialize(): Promise<Database> {
    // Download from S3 to temp directory
    // Open SQLite database
    // Return database instance
  }

  async persist(): Promise<void> {
    // Upload updated database back to S3
    // Handle errors and retries
  }

  cleanup(): void {
    // Close database connection
    // Remove temporary files
  }

  get isInitialized(): boolean {
    return this.isInitialized;
  }
}
```

### S3-Specific Behavior

- `initialize()`: Downloads database from S3 to temp directory, opens SQLite connection
- `persist()`: Uploads updated database back to S3 with proper error handling and retries
- `cleanup()`: Closes database connection and removes temporary files
- `isInitialized`: Returns true after successful S3 download and database open

### S3 Configuration

S3-specific configuration is passed via GitHub Action parameters (not in config file):

```typescript
interface S3ActionParameters {
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  s3Endpoint?: string;        // For non-AWS S3 providers
  s3Bucket: string;
  s3Key: string;              // Database file key in S3
  s3Region: string;
}
```

## Integration Patterns

### Unified Action Integration

The unified action will integrate with the storage system as follows:

```typescript
// Configuration from unentropy.json
const config = {
  type: 'sqlite-s3', // or sqlite-local, sqlite-artifact
  // S3-specific config passed via action parameters
};

// Create provider using factory from spec 001
const provider = await createStorageProvider(config);

// Use provider lifecycle
const db = await provider.initialize();
// ... collect metrics ...
await provider.persist();
provider.cleanup();
```

### Factory Extension

The `createStorageProvider()` function from spec 001 will be extended to handle `sqlite-s3`:

```typescript
async function createStorageProvider(
  config: StorageProviderConfig
): Promise<StorageProvider> {
  switch (config.type) {
    case 'sqlite-local':
      return new SqliteLocalStorageProvider(config);
    case 'sqlite-artifact':
      return new SqliteArtifactStorageProvider(config);
    case 'sqlite-s3':
      return new SqliteS3StorageProvider(config);
    default:
      throw new Error(`Unsupported storage type: ${config.type}`);
  }
}
```

## S3-Specific Considerations

### Error Handling

- **Authentication failures**: Clear error messages for invalid credentials
- **Network issues**: Exponential backoff retry logic
- **Permission errors**: Specific guidance for bucket/key permissions
- **Concurrent access**: Handle race conditions when multiple workflows run

### Performance Considerations

- **File size limits**: Handle large database files efficiently
- **Transfer timeouts**: Appropriate timeout values for S3 operations
- **Compression**: Consider compressing database during transfer
- **Multipart uploads**: Use for large files if needed

### Security Considerations

- **Credential handling**: Never log or expose S3 credentials
- **Encryption**: Use S3 server-side encryption
- **Access control**: Principle of least privilege for S3 permissions
- **Data integrity**: Verify checksums after upload/download

## Backward Compatibility

The implementation maintains full backward compatibility:

1. **Existing providers unchanged**: `sqlite-local` and `sqlite-artifact` continue to work
2. **Interface unchanged**: Core StorageProvider interface remains the same
3. **Factory pattern**: Uses existing factory function with extension
4. **Configuration**: Existing configurations without storage block continue to work

## Testing Strategy

### Unit Tests for SqliteS3StorageProvider

- Test S3 download with various scenarios (file exists, doesn't exist)
- Test S3 upload with error handling and retries
- Test temporary file cleanup
- Test database connection management
- Test concurrent access scenarios

### Integration Tests

- Test unified action with S3 storage end-to-end
- Test fallback behavior when S3 is unavailable
- Test migration from other storage types
- Test error recovery and retry logic

### Contract Tests

- Verify SqliteS3StorageProvider implements StorageProvider interface correctly
- Test lifecycle: initialize → use → persist → cleanup
- Verify error handling consistency with other providers

## References

- Base Storage Provider interface: `/specs/001-mvp-metrics-tracking/contracts/storage-provider-interface.md`
- Configuration schema extension: `/specs/003-unified-s3-action/contracts/config-schema.md`
- S3 client library documentation (AWS SDK v3 for JavaScript)