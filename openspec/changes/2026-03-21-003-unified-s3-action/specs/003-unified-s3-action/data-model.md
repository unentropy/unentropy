# Data Model: Track-Metrics S3-Compatible Storage Action

**Date**: Thu Nov 13 2025  
**Purpose**: Define data entities and relationships for track-metrics storage functionality

## Core Entities

### StorageConfiguration

Represents storage configuration in unentropy.json (defaults and non-sensitive settings).

```typescript
interface StorageConfiguration {
  storage: {
    type: 'sqlite-local' | 'sqlite-artifact' | 'sqlite-s3'; // Storage backend type
    s3?: S3Configuration; // S3-specific settings (when type='sqlite-s3')
  };
  database?: {
    key?: string; // Database file key in storage
  };
  report?: {
    name?: string; // Generated report file name
  };
}

interface S3Configuration {
  endpoint: string;     // S3-compatible endpoint URL
  bucket: string;        // Bucket name
  region: string;        // AWS region or provider-specific region
}
```

**Validation Rules**:
- `type` must be 'sqlite-local', 'sqlite-artifact', or 'sqlite-s3'
- When `type='sqlite-s3'`, `s3` configuration is recommended (can be partially overridden via action inputs)
- `endpoint` must be a valid HTTPS URL
- `bucket` must be non-empty string with valid bucket naming
- `region` must be non-empty string

**Default Behavior**:
- If `storage` section is omitted, action inputs must provide complete configuration
- Configuration file provides defaults, action inputs provide overrides and secrets

### ActionParameters

Represents GitHub Action input parameters for S3 credentials and runtime overrides.

```typescript
interface ActionParameters {
  storageType: 'sqlite-local' | 'sqlite-artifact' | 'sqlite-s3';  // Storage backend selection
  s3Endpoint?: string;               // S3 endpoint URL (overrides config)
  s3Bucket?: string;                 // S3 bucket name (overrides config)
  s3Region?: string;                 // S3 region (overrides config)
  s3AccessKeyId?: string;            // S3 access key ID (from secrets)
  s3SecretAccessKey?: string;        // S3 secret access key (from secrets)
  s3SessionToken?: string;           // Optional session token for temporary credentials
  configFile?: string;                // Path to configuration file
  databaseKey?: string;               // Database key override
  reportName?: string;                // Report name override
  timeout?: number;                   // Action timeout override
  retryAttempts?: number;             // Retry attempts override
  verbose?: boolean;                  // Verbose logging override
}
```

**Validation Rules**:
- S3 credentials (accessKeyId, secretAccessKey) required when storageType='sqlite-s3'
- Action inputs override configuration file values
- Credentials must come from GitHub Secrets, never from config files
- Non-sensitive settings can come from either source

### S3Storage

Direct S3 storage operations using Bun's native S3 client.

```typescript
import { S3Client } from "bun";

class S3Storage {
  private client: S3Client;
  
  constructor(config: S3Configuration, credentials: S3Credentials) {
    this.client = new S3Client({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
      bucket: config.bucket,
      region: config.region,
      endpoint: config.endpoint,
    });
  }
  
  // Core operations
  async download(key: string): Promise<Buffer> {
    try {
      const file = this.client.file(key);
      return await file.bytes();
    } catch (error) {
      throw new Error(`S3 download failed for ${key}: ${error.message}`);
    }
  }
  
  async upload(key: string, data: Buffer): Promise<UploadResult> {
    try {
      const file = this.client.file(key);
      const bytesWritten = await file.write(data);
      
      // Get file metadata
      const stat = await file.stat();
      
      return {
        key,
        etag: stat.etag,
        versionId: stat.versionId,
        size: bytesWritten,
        lastModified: stat.lastModified,
      };
    } catch (error) {
      throw new Error(`S3 upload failed for ${key}: ${error.message}`);
    }
  }
  
  async exists(key: string): Promise<boolean> {
    try {
      return await this.client.exists(key);
    } catch (error) {
      return false;
    }
  }
  
  // Metadata operations
  async getLastModified(key: string): Promise<Date | null> {
    try {
      const stat = await this.client.stat(key);
      return stat.lastModified;
    } catch (error) {
      return null;
    }
  }
  
  async getSize(key: string): Promise<number | null> {
    try {
      const stat = await this.client.stat(key);
      return stat.size;
    } catch (error) {
      return null;
    }
  }
}

interface UploadResult {
  key: string;
  etag?: string;
  versionId?: string;
  size: number;
  lastModified: Date;
}

interface S3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string; // For temporary credentials
}
```

### DatabaseFile

Represents a SQLite database file stored in storage.

```typescript
interface DatabaseFile {
  key: string;              // Storage key (e.g., "unentropy.db")
  size: number;             // File size in bytes
  lastModified: Date;        // Last modification timestamp
  etag?: string;            // S3 ETag or artifact hash
  versionId?: string;        // S3 version ID (if versioning enabled)
  checksum: string;         // SHA-256 checksum for integrity
  location?: string;         // Full storage location (e.g., "s3://bucket/key")
}
```

### WorkflowPhase

Represents a phase in the unified action workflow.

```typescript
interface WorkflowPhase {
  name: 'download' | 'collect' | 'upload' | 'report';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  duration?: number;        // Duration in milliseconds
  error?: WorkflowError;
  metadata?: Record<string, any>;
}

interface WorkflowError {
  type: 'storage' | 'collection' | 'report' | 'validation';
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, any>;
}
```

### TrackMetricsActionContext

Main context object for the track-metrics action execution.

```typescript
class TrackMetricsActionContext {
  storage: S3Storage;
  config: MergedConfiguration;  // Merged from file + inputs
  parameters: ActionParameters;
  phases: WorkflowPhase[];
  database: DatabaseMetadata;
  
  constructor(
    config: MergedConfiguration,  // Already merged with precedence
    parameters: ActionParameters
  );
  
  // Workflow orchestration
  async execute(): Promise<ActionResult>;
  async downloadDatabase(): Promise<void>;
  async collectMetrics(): Promise<void>;
  async uploadDatabase(): Promise<void>;
  async generateReport(): Promise<void>;
  
  // Utility methods
  private logPhase(phase: string, message: string): void;
  private handleError(error: WorkflowError): void;
  private validateDatabaseIntegrity(data: Buffer): boolean;
  private mergeConfiguration(fileConfig: StorageConfiguration, inputs: ActionParameters): MergedConfiguration;
}

interface MergedConfiguration {
  storage: {
    type: 'sqlite-local' | 'sqlite-artifact' | 'sqlite-s3';
    s3?: {
      endpoint: string;
      bucket: string;
      region: string;
    };
  };
  database: {
    key: string;
  };
  report: {
    name: string;
  };
}

interface ActionResult {
  success: boolean;
  phases: WorkflowPhase[];
  reportUrl?: string;
  databaseLocation: string;
  duration: number;
  error?: WorkflowError;
}
```

## State Transitions

### Workflow Phase States

```
pending → running → completed
    ↓         ↓
  failed ←─────┘
```

### Database Lifecycle

```
Download → Validate → Collect → Upload → Report
    ↓         ↓         ↓        ↓
  failed ← corrupted ← failed ← failed
```

### Storage Configuration

```
unentropy.json (defaults) + Action Inputs (overrides) → MergedConfiguration → S3Storage Instance
                     ↓                              ↓                        ↓
         File Configuration          Runtime Overrides            Bun S3Client
```

**Configuration Precedence**: Action Inputs > Configuration File

**Note**: Track-metrics action supports both S3 and GitHub Artifacts. S3 credentials must come from action inputs (GitHub Secrets).

## Data Relationships

### Entity Relationships

```
StorageConfiguration
└── S3Configuration (always required)

UnifiedActionContext
├── S3Storage
├── StorageConfiguration
├── ActionParameters
├── DatabaseMetadata
└── WorkflowPhase[]

DatabaseFile
├── DatabaseMetadata
└── S3Storage operations
```

### Data Flow

```
unentropy.json → StorageConfiguration
Action Parameters → S3Credentials
S3Storage → Bun S3Client
Context → Workflow Orchestration
Database → S3 Operations
```

## Validation Rules Summary

### Configuration Validation
- Storage type must be 'sqlite-local', 'sqlite-artifact', or 'sqlite-s3'
- S3 configuration is required when using 'sqlite-s3'
- All URL fields must be valid HTTPS URLs
- Bucket names must follow S3 naming conventions

### Parameter Validation
- S3 credentials (accessKeyId, secretAccessKey) required when storageType='sqlite-s3'
- S3 settings can come from config file or action inputs (inputs override)
- All credential parameters must come from GitHub Secrets
- No credential logging or exposure
- GitHub Artifacts storage supported when storageType='sqlite-artifact'

### Data Integrity Validation
- SQLite database must be valid format
- Checksum verification on download/upload
- Corruption detection and handling
- Backup verification when available

### Error Validation
- All errors must be categorized and retryable-flagged
- Error messages must be user-friendly and actionable
- Sensitive data must be sanitized from error details
- Error codes must be consistent across storage backends