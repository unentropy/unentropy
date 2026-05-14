# CLI Interface Contract

**Domain**: cli

## coverage-clover Command

### Command Syntax

```
unentropy collect coverage-clover <sourcePaths...> [options]
@collect coverage-clover <sourcePaths...> [options]
```

### Positional Arguments

| Argument      | Type       | Required | Description                                           |
| ------------- | ---------- | -------- | ----------------------------------------------------- |
| `sourcePaths` | `string[]` | Yes      | One or more paths to Clover XML coverage report files |

### Options

| Option   | Alias | Type     | Default | Choices                      | Description              |
| -------- | ----- | -------- | ------- | ---------------------------- | ------------------------ |
| `--type` | `-t`  | `string` | `line`  | `line`, `branch`, `function` | Coverage type to extract |

### Exit Codes

| Code | Condition                                                 |
| ---- | --------------------------------------------------------- |
| 0    | Success — coverage percentage written to stdout           |
| 1    | Error — invalid arguments, parse failure, or missing data |

### Output

Single floating-point number representing the coverage percentage:

```
82.5
```

### Usage Examples

```bash
# Parse a single Clover XML file (line coverage)
unentropy collect coverage-clover clover.xml

# Parse with explicit type
unentropy collect coverage-clover clover.xml --type function
unentropy collect coverage-clover clover.xml --type branch

# Merge multiple Clover XML files from parallel test jobs
unentropy collect coverage-clover clover-1.xml clover-2.xml clover-3.xml
```

### Error Behavior

- **Missing file**: `<paths>` must include at least one valid file path — empty list or non-existent file path fails with error
- **Malformed XML**: Invalid XML content fails with a parse error message including the file path
- **Missing data**: Valid XML without the expected `<coverage>` root element or `<project>/<metrics>` attributes fails with a descriptive error
- **Unknown type**: If `--type` is not one of `line`, `branch`, or `function`, the CLI rejects it at argument parsing time
