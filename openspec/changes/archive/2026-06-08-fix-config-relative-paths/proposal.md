## Why

When unentropy is invoked from a different working directory with `--config` pointing to a config file elsewhere, metric commands that reference relative file paths (e.g., `./results/phpunit-coverage.xml`) fail because they are resolved against the current working directory instead of the config file's directory. This breaks CI flexibility and local testing workflows where users expect config-relative path resolution.

## What Changes

- **BREAKING**: Metric commands, collectors, and any config-relative file paths will be resolved relative to the directory containing `unentropy.json` rather than `process.cwd()`.
- Modify the CLI `test`, `preview`, `import`, and any metric-collection entry points to establish a "config root directory" before executing commands.
- Update collectors (`@collect` handlers and shell command execution) to resolve relative paths against the config root directory.
- Add test coverage for cross-directory invocation scenarios.

## Capabilities

### New Capabilities

- `config-directory-context`: Centralized config root directory tracking so all subsystems (collectors, preview DB resolution, import file resolution) resolve relative paths consistently.

### Modified Capabilities

- `cli`: REQUIREMENTS updated to define that `--config` establishes a config root directory, and all relative paths in metric commands and collector arguments are resolved against that directory.
- `metrics`: REQUIREMENTS updated to specify that `@collect` collectors and shell command execution resolve relative file paths against the config file's directory.

## Impact

### Code

- CLI argument parsing and config loading (`src/cli/`, `src/config.ts`)
- Metric collection runner (`src/collectors/`, `src/metrics.ts`)
- Preview command (`src/commands/preview.ts`)
- Import command (`src/commands/import.ts`)

### APIs

- No public API changes; this is a behavioral fix for path resolution.

### Dependencies

- No new dependencies.

### Documentation Impact

- [ ] No user-facing doc changes
- [ ] Contracts affect: `cli` and `metrics` specs (path resolution behavior)

## Non-goals

- Do not change behavior when no `--config` flag is provided (continue resolving relative to `process.cwd()`).
- Do not add a new CLI flag or config option to override the root directory.
- Do not modify absolute paths or paths starting with environment variables.
- Do not change how unentropy.json itself is discovered (still checks `unentropy.json` in cwd by default).
