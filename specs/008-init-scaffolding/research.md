# Research: Init Scaffolding & Test Commands

**Feature Branch**: `008-init-scaffolding`
**Date**: 2025-01-06

## R1: CLI Command Patterns

**Decision**: Follow existing yargs command patterns from verify.ts and collect.ts

**Rationale**: Consistency with existing codebase ensures maintainability and familiar developer experience.

**Key Patterns**:
1. Use `cmd()` helper from `src/cli/cmd/cmd.ts` for type-safe command definition
2. Define interface for command arguments (e.g., `InitArgs`)
3. Use `.options({})` for named flags with type, description, alias, and default
4. Error handling: try/catch, `✓`/`✗` prefixes, `process.exit(1)` on failure
5. Register command in `src/index.ts` via `.command(InitCommand)`

**Example structure**:
```typescript
interface InitArgs {
  type?: string;
  storage?: string;
  force?: boolean;
  "dry-run"?: boolean;
}

export const InitCommand = cmd({
  command: "init",
  describe: "initialize unentropy.json configuration",
  builder: (yargs: Argv<InitArgs>) => yargs.options({...}),
  async handler(argv: InitArgs) {...}
});
```

## R2: Configuration Schema

**Decision**: Generate configs that conform to existing UnentropyConfigSchema

**Rationale**: Generated configs must pass `bunx unentropy verify` validation.

**Key Structure**:
```typescript
{
  storage: { type: "sqlite-artifact" | "sqlite-s3" | "sqlite-local" },
  metrics: {
    [key: string]: {
      $ref?: string,      // Reference built-in template
      name?: string,      // Display name
      type: "numeric" | "label",  // Required if no $ref
      command: string,    // Required - collection command
      unit?: "percent" | "integer" | "bytes" | "duration" | "decimal"
    }
  },
  qualityGate: {
    mode: "off" | "soft" | "hard",
    thresholds: [{ metric, mode, target, severity }]
  }
}
```

**Constraints**:
- Metric keys: lowercase, hyphens only, 1-64 chars, regex: `^[a-z0-9-]+$`
- Metrics: minimum 1, maximum 50
- Command: 1-1024 characters
- Threshold metric must reference existing metric key

## R3: Built-in Metric Templates

**Decision**: Use `$ref` to reference built-in templates where applicable

**Available Templates**:

| Template ID | Type | Unit | Has Default Command |
|-------------|------|------|---------------------|
| `loc` | numeric | integer | Yes (`@collect loc .`) |
| `size` | numeric | bytes | Yes (`@collect size dist`) |
| `coverage` | numeric | percent | No |
| `function-coverage` | numeric | percent | No |
| `build-time` | numeric | duration | No |
| `test-time` | numeric | duration | No |
| `dependencies-count` | numeric | integer | No |

**Note**: Even with `$ref`, a `command` is typically required to specify project-specific paths and options.

## R4: Coverage Collector Formats

**Decision**: Use LCOV format with fallback shell commands where native collectors don't exist

**Per-Language Strategy**:

| Language | Primary Format | Collector | Fallback |
|----------|---------------|-----------|----------|
| JavaScript/TS | LCOV | `@collect coverage-lcov` | N/A (available) |
| PHP | Clover XML | `@collect coverage-xml` | N/A (available) |
| Go | Go cover profile | Not available | Shell command parsing |
| Python | Cobertura XML | Not available | Use `--cov-report=lcov` in pytest |

**Rationale**: LCOV collector already exists. For v1, we guide users to generate LCOV format or provide shell commands that parse native formats.

**Coverage Commands by Project Type**:
- JavaScript: `@collect coverage-lcov coverage/lcov.info`
- PHP: `@collect coverage-xml coverage.xml`
- Go: `go tool cover -func=coverage.out | grep total | awk '{print $3}' | tr -d '%'`
- Python: `@collect coverage-lcov coverage.lcov` (with note about `--cov-report=lcov`)

## R5: Project Detection Strategy

**Decision**: Check for marker files in priority order, first match wins

**Detection Order** (priority highest to lowest):
1. JavaScript/TypeScript: `package.json`, `tsconfig.json`, `bun.lockb`, `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`
2. PHP: `composer.json`, `composer.lock`
3. Go: `go.mod`, `go.sum`
4. Python: `pyproject.toml`, `setup.py`, `requirements.txt`, `Pipfile`, `setup.cfg`

**Rationale**: Priority order handles mixed-language repos (e.g., JS frontend + Python backend). JavaScript first because it's most common in web projects.

**Implementation**:
```typescript
function detectProjectType(cwd: string): { type: ProjectType; files: string[] } | null {
  for (const [type, markers] of DETECTION_ORDER) {
    const found = markers.filter(f => existsSync(join(cwd, f)));
    if (found.length > 0) return { type, files: found };
  }
  return null;
}
```

## R6: Default Paths by Project Type

**Decision**: Use conventional defaults, document that users may need to adjust

| Project Type | Source Dir | Output Dir | Language Filter |
|--------------|------------|------------|-----------------|
| JavaScript/TS | `./src` | `dist` | `TypeScript` |
| PHP | `./src` | N/A | `PHP` |
| Go | `.` | `./bin` | `Go` |
| Python | `./src` | N/A | `Python` |

**Rationale**: These are the most common conventions. Users with different structures (e.g., Laravel's `app/`) can adjust after generation.

## R7: GitHub Actions Workflow Templates

**Decision**: Output workflow examples to console (not create files)

**Per-Language Setup Steps**:

| Language | Setup Action | Test Command |
|----------|--------------|--------------|
| JavaScript | `actions/setup-node@v4` + `npm ci` | `npm test -- --coverage` |
| PHP | `shivammathur/setup-php@v2` + `composer install` | `vendor/bin/phpunit --coverage-clover coverage.xml` |
| Go | `actions/setup-go@v5` | `go test -coverprofile=coverage.out ./...` |
| Python | `actions/setup-python@v5` + `pip install` | `pytest --cov=src --cov-report=lcov:coverage.lcov` |

**Workflow Structure**:
1. Track Metrics workflow (main branch pushes)
2. Quality Gate workflow (pull requests)
3. S3 secrets instructions (when S3 storage selected)

## R8: File Write Safety

**Decision**: Check for existing file, require `--force` to overwrite

**Implementation**:
```typescript
if (existsSync(configPath) && !argv.force && !argv["dry-run"]) {
  console.error(`Error: unentropy.json already exists. Use --force to overwrite.`);
  process.exit(1);
}
```

**Dry-run behavior**: Display what would be created, don't write files.

## Alternatives Considered

### A1: Interactive Mode (Rejected for v1)
Could prompt users for project type, paths, storage. Rejected because:
- Adds complexity without clear benefit for v1
- Most users prefer quick defaults
- Can be added in future version

### A2: Create Workflow Files Directly (Rejected)
Could create `.github/workflows/metrics.yml`. Rejected because:
- Risk of overwriting existing workflows
- Users may have different CI structures
- Console output is safer and more educational

### A3: Framework-Specific Detection (Deferred)
Could detect Laravel, Next.js, Django for better defaults. Deferred because:
- Increases complexity significantly
- Base project types cover majority of use cases
- Can be added in future version

## R9: Test Command Design

**Decision**: Create dedicated `test` command for dry-run metric collection

**Rationale**: 
- Allows users to verify their config works locally before pushing to CI
- Reduces debugging cycles by catching issues early
- Natural follow-up step after `init`

**Alternatives Considered**:

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Extend `verify` with `--collect` | Minimal CLI surface | Mixes schema validation with runtime execution | Rejected |
| Add `--dry-run` to `collect` | Reuses existing command | `collect` has subcommands, adding mode confusing | Rejected |
| New `test` command | Clear purpose, intuitive name | Another command to learn | **Selected** |
| Name it `check` | Also intuitive | `test` is more common in dev tooling | Rejected |
| Name it `preflight` | Descriptive | Too long, less common | Rejected |

## R10: Test Command Execution Strategy

**Decision**: Sequential metric execution with continue-on-error

**Rationale**:
- Sequential is clearer for debugging (see output as it happens)
- Continue-on-error shows all problems at once, not just first failure
- Parallel would be faster but harder to debug

**Implementation**:
```typescript
for (const [key, config] of Object.entries(metrics)) {
  const result = await collectMetric(key, config);
  results.push(result);
  displayResult(result);
}
```

**Exit Code Strategy**:
- Exit 0: All metrics collected successfully
- Exit 1: Config validation failed (schema error, file not found)
- Exit 2: One or more metrics failed to collect

## R11: Test Command Output Format

**Decision**: Tabular output with metric name, value, unit, and timing

**Rationale**: 
- Provides all relevant info at a glance
- Timing helps identify slow collections
- Consistent with other CLI tools (test runners, linters)

**Format**:
```
  ✓ lines-of-code          4,521 (integer)         0.8s
  ✗ test-coverage          Error: File not found: coverage/lcov.info
```

**Value Formatting**:
- `integer`: Thousands separator (4,521)
- `percent`: One decimal place (87.3)
- `bytes`: Raw number with thousands separator (245,832)
- `duration`: Milliseconds with thousands separator
- `decimal`: Two decimal places (3.14)

## R12: Reusing Existing Collector Infrastructure

**Decision**: Reuse `src/collector/runner.ts` for command execution

**Rationale**:
- Collector infrastructure already handles `@collect` prefix resolution
- Timeout handling already implemented
- Avoids code duplication

**Integration Point**:
- Load config via existing `loadConfig()`
- Resolve metrics via existing `resolveMetrics()`
- Execute commands via existing runner, but don't persist results
