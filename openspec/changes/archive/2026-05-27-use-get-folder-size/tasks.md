## 1. Setup

- [x] 1.1 Install `get-folder-size` dependency in `package.json`

**Checkpoint**: `get-folder-size` available in `node_modules`

---

## 2. Core — Replace size collector with `get-folder-size`

**Goal**: Rewrite `src/metrics/collectors/size.ts` to use `get-folder-size`, remove `--followSymlinks` option from CLI, update tests.

### Tests

- [x] 2.1 Update `tests/integration/cli-helpers.test.ts` — adjust symlink test expectations (symlink-to-file size now reflects link entry size, not target size) and remove `--followSymlinks` test coverage

### Implementation

- [x] 2.2 Rewrite `src/metrics/collectors/size.ts` — replace `getPathSize`/`parseSize` with `get-folder-size` calls, keep `parseSize` export signature (drop `followSymlinks` option), keep glob support via `fast-glob`
- [x] 2.3 Remove `followSymlinks` option from `src/cli/cmd/collect.ts` — delete the option from `builder` and the `handler` parameter
- [x] 2.4 Remove `followSymlinks` from `src/collector/collect-runner.ts` — delete the `--followSymlinks` option from the `size` subcommand builder and handler

**Checkpoint**: `bun check` passes, size collector works without `--followSymlinks`

---

## 3. Polish & Cross-Cutting Concerns

- [x] 3.1 Update `openspec/specs/metrics/contracts/built-in-metrics.md` — remove `--followSymlinks` from size options documentation
- [x] 3.2 Run `bun check` and `bun test` — verify all tests pass
