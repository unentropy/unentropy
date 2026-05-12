# Built-in Metrics Registry Contract

**Domain**: cobertura-merge
**Extends**: `openspec/specs/metrics/contracts/built-in-metrics.md`

## Modified Collector

### coverage-cobertura

The `coverage-cobertura` collector now accepts multiple source paths and merges their coverage data.

**Old Syntax**:
```
@collect coverage-cobertura <path> [options]
```

**New Syntax**:
```
@collect coverage-cobertura <paths...> [options]
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--type` | `line\|branch\|function` | `line` | Coverage type to extract |
| `--fallback` | `number` | `0` | Fallback value on parse failure |

#### Configuration Examples

```json
{
  "metrics": {
    "coverage": {
      "$ref": "coverage",
      "command": "@collect coverage-cobertura ./coverage/report1.xml ./coverage/report2.xml"
    }
  }
}
```

With glob pattern (shell expands before unentropy sees it):
```json
{
  "metrics": {
    "coverage": {
      "$ref": "coverage",
      "command": "@collect coverage-cobertura ./coverage/*-cobertura.xml"
    }
  }
}
```
