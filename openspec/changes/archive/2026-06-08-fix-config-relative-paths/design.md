## Context

Currently, `loadConfig()` in `src/config/loader.ts` already computes and returns a `basePath` field representing the directory containing the loaded `unentropy.json`. The `@collect` in-process collectors already receive and use this `basePath` as their `cwd` parameter. However, shell commands defined in metric configurations are executed via `@actions/exec` without specifying a working directory, causing them to always run in `process.cwd()`. This breaks metric collection when unentropy is invoked from a different directory using `--config`.

## Goals / Non-Goals

**Goals:**

- Ensure shell commands in metric configurations execute with the config file's directory as their working directory.
- Maintain existing `@collect` behavior (already config-root relative).
- Preserve absolute path handling (no modification).
- Add test coverage for cross-directory invocation.

**Non-Goals:**

- Do not change the default behavior when `--config` is absent (continue using `process.cwd()`).
- Do not add new CLI flags or config options.
- Do not modify path rewriting logic for environment variables or glob patterns.
- Do not change how `unentropy.json` is discovered by default.

## Decisions

### Pass `cwd` via `@actions/exec` options

**Decision**: For shell commands, pass the `basePath` as the `cwd` option to `@actions/exec`.

**Rationale**: This is the minimal and most correct change. It leverages the existing `basePath` infrastructure and delegates path resolution to the shell, which handles relative paths, environment variables, and glob patterns naturally. No string manipulation of the command itself is needed.

**Alternative considered**: Rewrite relative paths in the command string to absolute paths before execution. Rejected because it requires complex parsing of shell syntax, would mishandle environment variables and subshells, and introduces brittle string manipulation.

### Update `runCommand` signature

**Decision**: Modify `runCommand` in `src/collector/runner.ts` to pass `basePath` as `cwd` to the `exec()` call for shell commands.

**Rationale**: `runCommand` already receives `basePath` and passes it to `executeCollect`. Extending this to shell commands is a single-line change in the `exec()` options. This is the most centralized fix — all callers of `runCommand` benefit automatically.

### Verify all CLI commands pass `basePath`

**Decision**: Audit all CLI command handlers (`test`, `preview`, `import`, `verify`) to ensure they use `config.basePath` where applicable.

**Rationale**: The `test` command already passes `config.basePath` to `runCommand`. The `preview` command uses `basePath` for sources pattern normalization but does not execute metric commands. The `import` command only reads config for metric IDs, not for execution. The `verify` command only validates schema. No additional CLI changes are required beyond the `runCommand` fix.

## Risks / Trade-offs

- **[Risk] Changing shell command working directory may break metrics that intentionally depend on `process.cwd()`** → Mitigation: This is the desired behavioral change. Users who relied on invocation-directory-relative paths with `--config` were experiencing bugs. The change aligns behavior with user expectations.
- **[Risk] `@actions/exec` `cwd` option may behave differently across platforms** → Mitigation: `@actions/exec` is a well-tested library used in GitHub Actions, which runs on Linux, macOS, and Windows. The `cwd` option is standard.

## Contracts Referenced

- `contracts/cli-interface.md`

## File Changes

- `src/collector/runner.ts` — Pass `basePath` as `cwd` to `exec()` for shell commands
- `tests/collector/runner.test.ts` (or equivalent) — Add tests for cross-directory shell command execution
- `tests/cli/test-cmd.test.ts` (or equivalent) — Add integration test for `test --config` from different directory
