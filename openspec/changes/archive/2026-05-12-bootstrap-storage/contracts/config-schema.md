# Configuration Schema: Storage Block

**Domain**: storage

## Overview

This contract defines the `storage` block within `unentropy.json`. It specifies how users configure storage backends for the metrics database. This is the storage-domain slice of the full configuration schema.

## Schema Definition

### Extended Root Configuration Object

```typescript
interface UnentropyConfig {
  metrics: Record<string, MetricConfig>; // From metrics domain
  storage?: StorageConfig; // From storage domain
}
```

### StorageConfig

Defines storage backend configuration for the metrics database.

```typescript
interface StorageConfig {
  type: "sqlite-local" | "sqlite-artifact" | "sqlite-s3";
  artifact?: ArtifactConfig;
}
```

### ArtifactConfig

Configuration for GitHub Artifacts storage (only used when `type` is `sqlite-artifact`).

```typescript
interface ArtifactConfig {
  name?: string; // Default: 'unentropy-metrics'
  branchFilter?: string; // Default: current branch (from GITHUB_REF_NAME)
}
```

**Field Specifications**:

| Field                   | Type   | Required | Constraints                                                    | Description                                                                       |
| ----------------------- | ------ | -------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `type`                  | enum   | No       | Either `'sqlite-local'`, `'sqlite-artifact'`, or `'sqlite-s3'` | Storage backend to use for the database. Defaults to `'sqlite-local'` if omitted. |
| `artifact`              | object | No       | Only used when `type` is `'sqlite-artifact'`                   | Configuration for GitHub Artifacts storage.                                       |
| `artifact.name`         | string | No       | Must match pattern `^[a-zA-Z0-9_-]+$`                          | Name of the artifact to search for and upload. Defaults to `'unentropy-metrics'`. |
| `artifact.branchFilter` | string | No       | Valid Git branch name                                          | Branch to search for previous artifacts. Defaults to current branch.              |

**Storage Type Descriptions**:

- `sqlite-local`: Store database in local file system. Used for development and simple setups. No external dependencies. Manual backup/restore required.
- `sqlite-artifact`: Store database in GitHub Artifacts with automatic search, download, and upload. `GITHUB_TOKEN` and `GITHUB_REPOSITORY` auto-detected from environment.
- `sqlite-s3`: Store database in S3-compatible storage with automatic download and upload. Credentials passed as GitHub Action parameters.

## JSON Schema

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
        "$comment": "See metrics domain for MetricConfig schema"
      }
    }
  }
}
```

## Validation Rules

- If `storage` block is omitted, defaults to `sqlite-local`
- `storage.type` must be one of the three supported values
- Invalid `storage.type` values result in error with fallback to `sqlite-local` with a warning
- `artifact` block is only valid when `type` is `sqlite-artifact`
- `artifact.name` must match the pattern `^[a-zA-Z0-9_-]+$`
- All metric configuration validation rules from the metrics domain apply unchanged

## Example Configurations

### Default Configuration (sqlite-local)

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

### S3 Storage

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
    "size": {
      "type": "numeric",
      "description": "Production bundle size in kilobytes",
      "command": "du -k dist/bundle.js | cut -f1",
      "unit": "KB"
    }
  }
}
```

## Migration Guidance

### From sqlite-local to sqlite-artifact

1. Add `storage` block to `unentropy.json`: `{ "storage": { "type": "sqlite-artifact" } }`
2. Ensure workflow has `actions: read` and `actions: write` permissions
3. Use unified track-metrics action (no separate artifact steps needed)

### From sqlite-local to sqlite-s3

1. Add `storage` block to `unentropy.json`: `{ "storage": { "type": "sqlite-s3" } }`
2. Configure S3 credentials in GitHub Action parameters
3. Use unified track-metrics action

### From sqlite-artifact to sqlite-s3

1. Change `storage.type` from `"sqlite-artifact"` to `"sqlite-s3"`
2. Add S3 credentials to GitHub Action parameters
3. No manual artifact steps to remove

Note: Switching backends starts with a fresh database. To preserve history, manually transfer the database file before switching.
