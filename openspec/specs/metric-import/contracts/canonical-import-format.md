# Canonical Import Format

**Domain**: metric-import

## Overview

The canonical import format is the sole entry point for any data introduced via the import pipeline. It is newline-delimited JSON (JSONL), one measurement per line. Designed to be:

- **Inspectable**: plain text, line-orientated, diffable, greppable.
- **Composable**: streams cleanly through Unix pipes; suitable for both shell scripts and AI-generated transformations.
- **Strict but minimal**: only the fields needed to land a row in `metric_values` plus its `build_contexts` row are required; everything else has a sensible default so handwritten files don't need boilerplate.

## Record Schema

Each line is a JSON object with the following fields:

| Field           | Type              | Required   | Default                                      | Description                                                                                                                                                                                                       |
| --------------- | ----------------- | ---------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `metric_id`     | string            | yes        | —                                            | Matches `^[a-z0-9-]+$`. Corresponds to a key the user has defined (or will define) in `unentropy.json`. If the metric is not yet declared, the ingester creates a row in `metric_definitions` with inferred type. |
| `timestamp`     | string (RFC 3339) | yes        | —                                            | When the measurement applies. Used to resolve a commit SHA when none is provided.                                                                                                                                 |
| `value_numeric` | number            | one of two | —                                            | Numeric value. Mutually exclusive with `value_label`.                                                                                                                                                             |
| `value_label`   | string            | one of two | —                                            | Label value. Mutually exclusive with `value_numeric`. Max 256 chars.                                                                                                                                              |
| `commit_sha`    | string            | optional   | resolved by ingester                         | 40-char hex git SHA. If present, used as-is. If absent, the ingester resolves the nearest commit by timestamp on the configured trend branch.                                                                     |
| `branch`        | string            | optional   | the configured trend branch (default `main`) | Branch the measurement is associated with.                                                                                                                                                                        |
| `source`        | string            | optional   | `"manual"`                                   | Free-form identifier of where this measurement originated (`"sonarqube"`, `"codacy"`, `"manual"`, …). Max 64 chars. Stored verbatim and used to derive the default `run_id`.                                      |
| `run_id`        | string            | optional   | `import:<source>:<commit_sha>`               | Together with `commit_sha`, must be unique. Override only if the dumper produces multiple measurements per commit per metric (e.g., multiple analyses) and needs them distinguished.                              |
| `run_number`    | integer           | optional   | `0`                                          | Display-only metadata. Defaults to `0` for imports.                                                                                                                                                               |
| `metadata`      | object            | optional   | —                                            | Reserved for connector-specific context. Ignored by the ingester at the moment; may be persisted in a future version.                                                                                             |

### Validation Rules

- Exactly one of `value_numeric` or `value_label` MUST be present.
- `metric_id` is not required to pre-exist in `metric_definitions`; the ingester creates the definition if missing, inferring `type` from which value field is set.
- `commit_sha`, if provided, MUST match `^[0-9a-f]{40}$`.
- Lines that do not parse as JSON, or that parse but fail validation, are reported with their line number and skipped (or abort the run if `--strict`).

### Server-side Row Population

When the ingester writes the `build_contexts` row:

- `commit_sha` is the record's value if provided; otherwise resolved by the commit resolver. If neither yields a SHA, the record is skipped with a warning.
- `branch` is the record's value if provided; otherwise the trend branch.
- `run_id` is the record's value if provided; otherwise `import:<source>:<commit_sha>`.
- `run_number` is the record's value if provided; otherwise `0`.
- `event_name` is always `"import"`.
- `timestamp` is taken verbatim from the record.

## JSON Schema (Authoritative)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://unentropy.dev/schemas/canonical-import-record.json",
  "type": "object",
  "additionalProperties": false,
  "required": ["metric_id", "timestamp"],
  "properties": {
    "metric_id": { "type": "string", "pattern": "^[a-z0-9-]+$" },
    "timestamp": { "type": "string", "format": "date-time" },
    "value_numeric": { "type": "number" },
    "value_label": { "type": "string", "maxLength": 256 },
    "commit_sha": { "type": "string", "pattern": "^[0-9a-f]{40}$" },
    "branch": { "type": "string", "maxLength": 255 },
    "source": { "type": "string", "minLength": 1, "maxLength": 64 },
    "run_id": { "type": "string", "maxLength": 64 },
    "run_number": { "type": "integer", "minimum": 0 },
    "metadata": { "type": "object" }
  },
  "oneOf": [
    { "required": ["value_numeric"], "not": { "required": ["value_label"] } },
    { "required": ["value_label"], "not": { "required": ["value_numeric"] } }
  ]
}
```

## Examples

**Minimal numeric measurement (defaults source to `"manual"`, lets the ingester resolve the SHA)**:

```jsonl
{
  "metric_id": "test-coverage",
  "timestamp": "2024-04-15T08:00:00Z",
  "value_numeric": 81.2
}
```

**With source-provided commit SHA and explicit source**:

```jsonl
{
  "metric_id": "bugs",
  "timestamp": "2024-05-02T10:23:00Z",
  "value_numeric": 17,
  "commit_sha": "4f1a2c0d8e9b5a3f1e2c7d4b6a8c0d2e4f6a8b0c",
  "source": "sonarqube"
}
```

**Label-valued measurement (e.g., quality rating)**:

```jsonl
{
  "metric_id": "reliability-rating",
  "timestamp": "2024-05-02T10:23:00Z",
  "value_label": "B",
  "source": "sonarqube"
}
```

**Multiple analyses per commit, distinguished by `run_id`**:

```jsonl
{"metric_id":"test-coverage","timestamp":"2024-05-02T08:00:00Z","value_numeric":80.1,"commit_sha":"4f1a...","source":"sonarqube","run_id":"sq-analysis-12345"}
{"metric_id":"test-coverage","timestamp":"2024-05-02T20:00:00Z","value_numeric":81.4,"commit_sha":"4f1a...","source":"sonarqube","run_id":"sq-analysis-12678"}
```

## Stability

The schema is versioned implicitly by the ingester. Adding optional fields is a non-breaking change. Removing or changing required fields is a breaking change and would be announced via a new schema id.
