## 1. Setup

- [x] 1.1 [P] Read existing `src/collector/runner.ts` and `src/config/loader.ts` to confirm current `basePath` plumbing
- [x] 1.2 [P] Locate existing tests for `runner.ts` and CLI `test` command

## 2. Foundational

- [x] 2.1 [P] Verify `ResolvedUnentropyConfig.basePath` is populated correctly by `loadConfig()` for both absolute and relative `--config` paths

**Checkpoint**: `basePath` is confirmed to be available and correct in all CLI commands that load config

---

## 3. User Story 1 - Fix Shell Command Working Directory (Priority: P1)

**Goal**: Shell commands in metric configurations execute with the config file's directory as their working directory when `--config` is provided.

### Tests

- [x] 3.1 [P] [US1] Add unit test in `tests/collector/runner.test.ts` (or equivalent) verifying `runCommand` passes `basePath` as `cwd` to `exec()` for non-`@collect` commands
- [x] 3.2 [P] [US1] Add integration test verifying `bunx unentropy test --config <path>` successfully executes a shell command with a relative path from a different working directory

### Implementation

- [x] 3.3 [US1] Modify `src/collector/runner.ts` — add `cwd: basePath` to the `exec()` options for shell command execution

**Checkpoint**: Shell commands resolve relative paths against the config directory; tests pass

---

## 4. User Story 2 - Verify @collect Behavior (Priority: P2)

**Goal**: Confirm `@collect` collectors already resolve paths against `basePath` and add regression tests.

### Tests

- [x] 4.1 [P] [US2] Add test verifying `@collect loc ./src` resolves to config directory when `basePath` is provided
- [x] 4.2 [P] [US2] Add test verifying `@collect size ./dist/*` resolves glob against config directory

### Implementation

- [x] 4.3 [US2] Verify no code changes needed for `@collect` — `executeCollect` already passes `basePath` to all collectors

**Checkpoint**: `@collect` behavior is verified and tested for config-relative path resolution

---

## 5. Polish & Cross-Cutting Concerns

- [x] 5.1 [P] Run `bun check` to verify type safety and formatting
- [x] 5.2 [P] Run `bun test` to verify all existing tests still pass
- [x] 5.3 [P] Update `openspec/specs/cli/contracts/cli-interface.md` — updated `--config` descriptions for `test` and `preview` commands to document config directory context
- [x] 5.4 [P] Archive the change when implementation is complete
