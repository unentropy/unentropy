# Quickstart: Init & Test Commands

**Feature Branch**: `008-init-scaffolding`
**Date**: 2025-01-06

## Overview

Two commands for getting started with unentropy:

- **`init`** - Scaffolds a default `unentropy.json` configuration based on your project type
- **`test`** - Validates your config and runs all metric collections locally (dry run)

## Basic Usage

### Init Command

```bash
# Auto-detect project type and create config
bunx unentropy init

# Force a specific project type
bunx unentropy init --type php

# Use S3 storage instead of artifacts
bunx unentropy init --storage s3

# Preview without writing files
bunx unentropy init --dry-run

# Overwrite existing config
bunx unentropy init --force
```

### Test Command

```bash
# Validate config and run all metric collections
bunx unentropy test

# Use a different config file
bunx unentropy test --config custom-config.json

# Show the command executed for each metric
bunx unentropy test --verbose

# Set custom timeout (in milliseconds)
bunx unentropy test --timeout 60000
```

## What Gets Created

### Configuration File

A `unentropy.json` file with:
- **Lines of code** metric (filtered by detected language)
- **Test coverage** metric (using LCOV format)
- **Bundle/binary size** metric (JavaScript/Go only)
- **Quality gate** with 80% coverage threshold (soft mode)
- **Artifact storage** as default backend

### Console Output

1. Detection result (which project type and marker files found)
2. List of metrics included
3. GitHub Actions workflow examples for:
   - Tracking metrics on main branch
   - Quality gate on pull requests
4. S3 setup instructions (if S3 storage selected)

## Supported Project Types

| Type | Detected By | Metrics |
|------|-------------|---------|
| JavaScript/TypeScript | `package.json`, `tsconfig.json`, etc. | LOC, coverage, bundle size |
| PHP | `composer.json` | LOC, coverage |
| Go | `go.mod` | LOC, coverage, binary size |
| Python | `pyproject.toml`, `requirements.txt`, etc. | LOC, coverage |

## After Running Init

1. **Review the generated config** - Adjust paths if your project structure differs from defaults
2. **Run your tests with coverage** - Generate the coverage file your config expects
3. **Verify with `unentropy test`** - Run `bunx unentropy test` to ensure all metrics collect successfully
4. **Add workflows to your CI** - Copy the workflow examples to `.github/workflows/`
5. **For S3 storage** - Add the required secrets to your repository

## Coverage Setup by Language

### JavaScript/TypeScript
```bash
# Jest
npm test -- --coverage
# Vitest
vitest --coverage
```
Coverage file: `coverage/lcov.info`

### PHP
```bash
# PHPUnit (generate Clover XML format)
vendor/bin/phpunit --coverage-clover coverage.xml
```
Coverage file: `coverage.xml`

### Go
```bash
# Generate coverage profile
go test -coverprofile=coverage.out ./...
```
The generated config uses shell parsing to extract percentage.

### Python
```bash
# pytest-cov (generate LCOV format)
pytest --cov=src --cov-report=lcov:coverage.lcov
```
Coverage file: `coverage.lcov`

## Common Adjustments

### Different Source Directory
Edit the `command` field to match your project structure:
```json
"command": "@collect loc ./app --language PHP"  // Laravel
"command": "@collect loc ./lib --language TypeScript"  // Library
```

### Different Output Directory
```json
"command": "@collect size build"  // Create React App
"command": "@collect size .next"  // Next.js
```

### Multiple Coverage Files
For monorepos or multiple test suites, you may need to merge coverage:
```json
"command": "@collect coverage-lcov coverage/merged-lcov.info"
```

## Troubleshooting

### Init: "Could not detect project type"
Your project doesn't have recognized marker files. Use `--type` to specify:
```bash
bunx unentropy init --type javascript
```

### Init: "unentropy.json already exists"
Use `--force` to overwrite:
```bash
bunx unentropy init --force
```

### Test: Config validation fails
The `test` command will show specific schema errors. Fix them in your config file:
```
✗ Config schema invalid:
  metrics.test-coverage: command cannot be empty
```

### Test: Metric collection fails
Common causes and fixes:

**File not found:**
```
✗ test-coverage    Error: File not found: coverage/lcov.info
```
Run your tests with coverage first: `npm test -- --coverage`

**Directory not found:**
```
✗ lines-of-code    Error: Directory not found: ./src
```
Update the path in your config to match your project structure.

**Command timeout:**
```
✗ test-coverage    Error: Command timed out after 30000ms
```
Increase timeout: `bunx unentropy test --timeout 60000`

### Test: Debug with verbose mode
Use `-v` to see exactly what commands are being run:
```bash
bunx unentropy test -v
```
Output:
```
  ✓ lines-of-code    4,521 (integer)    0.8s
    Command: @collect loc ./src --language TypeScript
```
