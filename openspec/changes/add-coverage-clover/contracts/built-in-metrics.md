# Built-in Metrics Registry Contract

**Domain**: metrics

**Extends**: `openspec/specs/metrics/contracts/built-in-metrics.md`

## Available Collectors

Add to the Available Collectors table:

| Collector         | Syntax                                          | Description                                        |
| ----------------- | ----------------------------------------------- | -------------------------------------------------- |
| `coverage-clover` | `@collect coverage-clover <paths...> [options]` | Parse Clover XML coverage reports (PHPUnit format) |

### Collector Options

#### `coverage-clover` Options

- `--type <line|branch|function>` — Coverage type to extract (default: `line`)
  - `line`: calculated from `statements`/`coveredstatements` attributes
  - `branch`: calculated from `conditionals`/`coveredconditionals` attributes
  - `function`: calculated from `methods`/`coveredmethods` attributes

### Configuration Examples

```json
{
  "metrics": {
    "coverage": {
      "$ref": "coverage",
      "command": "@collect coverage-clover clover.xml"
    },
    "function-coverage": {
      "$ref": "function-coverage",
      "command": "@collect coverage-clover clover.xml --type function"
    }
  }
}
```

### Multi-File Merge

The `coverage-clover` collector accepts multiple file paths and merges coverage by summing covered/valid counts across all files:

```json
{
  "metrics": {
    "coverage": {
      "$ref": "coverage",
      "command": "@collect coverage-clover clover-1.xml clover-2.xml"
    }
  }
}
```
