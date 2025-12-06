# Config Schema Contract: Generated `unentropy.json`

**Feature Branch**: `008-init-scaffolding`
**Date**: 2025-01-06

## Schema Overview

The `init` command generates a config file that must conform to the existing `UnentropyConfigSchema` defined in `src/config/schema.ts`.

## Generated Config Structure

```typescript
interface GeneratedConfig {
  metrics: {
    [key: string]: {
      $ref?: string;
      name: string;
      command: string;
    };
  };
  storage: {
    type: "sqlite-artifact" | "sqlite-s3" | "sqlite-local";
  };
  qualityGate: {
    mode: "soft";
    thresholds: Array<{
      metric: string;
      mode: "min";
      target: number;
      severity: "warning";
    }>;
  };
}
```

## Generated Configs by Project Type

### JavaScript/TypeScript

```json
{
  "metrics": {
    "lines-of-code": {
      "$ref": "loc",
      "name": "Lines of Code",
      "command": "@collect loc ./src --language TypeScript"
    },
    "test-coverage": {
      "$ref": "coverage",
      "name": "Test Coverage",
      "command": "@collect coverage-lcov coverage/lcov.info"
    },
    "bundle": {
      "$ref": "size",
      "name": "Bundle Size",
      "command": "@collect size dist"
    }
  },
  "storage": {
    "type": "sqlite-artifact"
  },
  "qualityGate": {
    "mode": "soft",
    "thresholds": [
      {
        "metric": "test-coverage",
        "mode": "min",
        "target": 80,
        "severity": "warning"
      }
    ]
  }
}
```

### PHP

```json
{
  "metrics": {
    "lines-of-code": {
      "$ref": "loc",
      "name": "Lines of Code",
      "command": "@collect loc ./src --language PHP"
    },
    "test-coverage": {
      "$ref": "coverage",
      "name": "Test Coverage",
      "command": "@collect coverage-lcov coverage/lcov.info"
    }
  },
  "storage": {
    "type": "sqlite-artifact"
  },
  "qualityGate": {
    "mode": "soft",
    "thresholds": [
      {
        "metric": "test-coverage",
        "mode": "min",
        "target": 80,
        "severity": "warning"
      }
    ]
  }
}
```

### Go

```json
{
  "metrics": {
    "lines-of-code": {
      "$ref": "loc",
      "name": "Lines of Code",
      "command": "@collect loc . --language Go"
    },
    "test-coverage": {
      "$ref": "coverage",
      "name": "Test Coverage",
      "command": "go tool cover -func=coverage.out | grep total | awk '{print $3}' | tr -d '%'"
    },
    "binary-size": {
      "$ref": "bundle",
      "name": "Binary Size",
      "command": "@collect size ./bin"
    }
  },
  "storage": {
    "type": "sqlite-artifact"
  },
  "qualityGate": {
    "mode": "soft",
    "thresholds": [
      {
        "metric": "test-coverage",
        "mode": "min",
        "target": 80,
        "severity": "warning"
      }
    ]
  }
}
```

### Python

```json
{
  "metrics": {
    "lines-of-code": {
      "$ref": "loc",
      "name": "Lines of Code",
      "command": "@collect loc ./src --language Python"
    },
    "test-coverage": {
      "$ref": "coverage",
      "name": "Test Coverage",
      "command": "@collect coverage-lcov coverage.lcov"
    }
  },
  "storage": {
    "type": "sqlite-artifact"
  },
  "qualityGate": {
    "mode": "soft",
    "thresholds": [
      {
        "metric": "test-coverage",
        "mode": "min",
        "target": 80,
        "severity": "warning"
      }
    ]
  }
}
```

## Storage Type Mapping

| CLI Option | Config Value |
|------------|--------------|
| `--storage artifact` (default) | `"sqlite-artifact"` |
| `--storage s3` | `"sqlite-s3"` |
| `--storage local` | `"sqlite-local"` |

## Validation Requirements

Generated configs must pass `bunx unentropy verify`:

1. **Metric keys**: Lowercase, hyphens only, 1-64 chars (`^[a-z0-9-]+$`)
2. **Command**: Non-empty, max 1024 characters
3. **Threshold metrics**: Must reference existing metric keys
4. **Storage type**: Must be valid enum value

## $ref Template References

| Template | Inherited Fields |
|----------|------------------|
| `loc` | `type: "numeric"`, `unit: "integer"` |
| `coverage` | `type: "numeric"`, `unit: "percent"` |
| `size` | `type: "numeric"`, `unit: "bytes"` |
