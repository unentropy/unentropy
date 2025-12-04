# Configuration Schema Contract Extension

**Feature**: 003-unified-s3-action  
**File**: `unentropy.json`  
**Version**: 2.0.0  
**Last Updated**: 2025-12-06

## Overview

This document extends the base configuration schema contract defined in `/specs/001-mvp-metrics-tracking/contracts/config-schema.md` with storage configuration options for the unified S3 action.

## Base Schema Reference

The base configuration schema is fully defined in `/specs/001-mvp-metrics-tracking/contracts/config-schema.md`. This extension adds:

1. Optional `storage` configuration block
2. Support for three storage backends
3. Migration guidance for storage transitions

## Schema Extension

### Extended Root Configuration Object

```typescript
interface UnentropyConfig {
  metrics: Record<string, MetricConfig>;  // From spec 001
  storage?: StorageConfig;                 // NEW: Optional storage configuration
}
```

### NEW: StorageConfig

Defines storage backend configuration for the metrics database.

```typescript
interface StorageConfig {
  type: 'sqlite-local' | 'sqlite-artifact' | 'sqlite-s3';
  artifact?: ArtifactConfig;
}

interface ArtifactConfig {
  name?: string;         // Default: 'unentropy-metrics'
  branchFilter?: string; // Default: current branch (from GITHUB_REF_NAME)
}
```

**Field Specifications**:

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `type` | enum | No | Either `'sqlite-local'`, `'sqlite-artifact'`, or `'sqlite-s3'` | Storage backend to use for the database. Defaults to `'sqlite-local'` if omitted. |
| `artifact` | object | No | Only used when `type` is `'sqlite-artifact'` | Configuration for GitHub Artifacts storage. |
| `artifact.name` | string | No | Must match pattern `^[a-zA-Z0-9_-]+$` | Name of the artifact to search for and upload. Defaults to `'unentropy-metrics'`. |
| `artifact.branchFilter` | string | No | Valid Git branch name | Branch to search for previous artifacts. Defaults to current branch. |

**Storage Type Descriptions**:
- `sqlite-local`: Store database in local file system (default from spec 001)
- `sqlite-artifact`: Store database in GitHub Artifacts with automatic search, download, and upload
- `sqlite-s3`: Store database in S3-compatible storage with automatic download and upload

## Extended JSON Schema

This extends the base JSON schema from spec 001 with the storage block:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["metrics"],
  "properties": {
    "storage": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "enum": ["sqlite-local", "sqlite-artifact", "sqlite-s3"],
          "default": "sqlite-local"
        },
        "artifact": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "pattern": "^[a-zA-Z0-9_-]+$",
              "default": "unentropy-metrics"
            },
            "branchFilter": {
              "type": "string"
            }
          }
        }
      }
    },
    "metrics": {
      "type": "object",
      "minProperties": 1,
      "maxProperties": 50,
      "propertyNames": {
        "pattern": "^[a-z0-9-]+$",
        "minLength": 1,
        "maxLength": 64
      },
      "additionalProperties": {
        "$comment": "See spec 001 for MetricConfig schema"
      }
    }
  }
}
```

## Example Configurations

### Default Configuration (sqlite-local)
Same as spec 001 - no storage block needed:

```json
{
  "metrics": {
    "test-coverage": {
      "type": "numeric",
      "description": "Percentage of code covered by tests",
      "command": "npm run test:coverage -- --json | jq -r '.total.lines.pct'",
      "unit": "%"
    }
  }
}
```

### GitHub Artifacts Storage (Default Options)

```json
{
  "storage": {
    "type": "sqlite-artifact"
  },
  "metrics": {
    "test-coverage": {
      "type": "numeric",
      "command": "npm run test:coverage -- --json | jq -r '.total.lines.pct'",
      "unit": "%"
    }
  }
}
```

### GitHub Artifacts Storage (Custom Options)

```json
{
  "storage": {
    "type": "sqlite-artifact",
    "artifact": {
      "name": "my-project-metrics",
      "branchFilter": "main"
    }
  },
  "metrics": {
    "test-coverage": {
      "type": "numeric",
      "command": "npm run test:coverage -- --json | jq -r '.total.lines.pct'",
      "unit": "%"
    }
  }
}
```

### S3 Storage (Unified Action)

```json
{
  "storage": {
    "type": "sqlite-s3"
  },
  "metrics": {
    "test-coverage": {
      "type": "numeric",
      "description": "Percentage of code covered by tests",
      "command": "npm run test:coverage -- --json | jq -r '.total.lines.pct'",
      "unit": "%"
    },
    "bundle-size": {
      "type": "numeric",
      "description": "Production bundle size in kilobytes",
      "command": "du -k dist/bundle.js | cut -f1",
      "unit": "KB"
    }
  }
}
```

## Storage Type Behavior

### sqlite-local (Default)
- Database stored in local file system
- Used for development and simple setups
- No external dependencies
- Manual backup/restore required
- **Behavior unchanged from spec 001**

### sqlite-artifact
- Database stored in GitHub Artifacts
- Full unified action support (search, download, collect, upload, report)
- Automatic artifact search finds latest database from previous successful workflow runs
- Automatic artifact upload persists updated database after collection
- `GITHUB_TOKEN` and `GITHUB_REPOSITORY` auto-detected from environment
- Configurable artifact name (default: `unentropy-metrics`)
- Configurable branch filter (default: current branch)
- First-run scenario: creates new database if no previous artifact exists

### sqlite-s3
- Database stored in S3-compatible storage
- Full unified action support (download, collect, upload, report)
- S3 credentials passed as GitHub Action parameters
- Automatic persistence handled by unified action

## Validation Rules

### Storage Configuration (NEW)
- If `storage` block is omitted, defaults to `sqlite-local`
- `storage.type` must be one of the three supported values
- Invalid `storage.type` values result in error with fallback to `sqlite-local`

### Metric Configuration (UNCHANGED)
All validation rules from spec 001 apply unchanged:
- Object keys must be lowercase alphanumeric with hyphens only
- Object keys are inherently unique (JSON requirement)
- `type` affects how `command` output is parsed
- `command` is executed in shell environment with build context variables
- `unit` is only meaningful for `numeric` type

## Versioning

**Version 2.0.0**:
- Updated to align with spec 001 v2.0.0 (metrics as object instead of array)
- Storage configuration unchanged

**Version 1.1.0 (spec 003)**:
- Added optional `storage` configuration block
- Default behavior unchanged (`sqlite-local`)

## Migration Path

### From sqlite-local to sqlite-artifact
1. Add `storage` block to `unentropy.json`:
   ```json
   {
     "storage": {
       "type": "sqlite-artifact"
     },
     "metrics": { ... }
   }
   ```
2. Ensure workflow has `actions: read` and `actions: write` permissions
3. Use unified track-metrics action (no separate artifact steps needed)

### From sqlite-local to sqlite-s3
1. Add `storage` block to `unentropy.json`:
   ```json
   {
     "storage": {
       "type": "sqlite-s3"
     },
     "metrics": { ... }
   }
   ```
2. Configure S3 credentials in GitHub Action parameters
3. Use unified track-metrics action

### From sqlite-artifact to sqlite-s3
1. Change `storage.type` from `"sqlite-artifact"` to `"sqlite-s3"`
2. Add S3 credentials to GitHub Action parameters
3. Use unified action for complete workflow (artifact handling is automatic, no manual steps to remove)

## References

- Base configuration schema: `/specs/001-mvp-metrics-tracking/contracts/config-schema.md`
- Storage provider interface: `/specs/001-mvp-metrics-tracking/contracts/storage-provider-interface.md`
- Command execution context: See spec 001 for environment variables and execution rules
