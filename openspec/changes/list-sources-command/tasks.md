## 1. Setup

- [x] 1.1 Create `src/cli/cmd/sources.ts` following the `cmd()` helper pattern

## 2. Foundational

- [x] 2.1 [P] Read existing command patterns (`verify.ts`, `test.ts`) to confirm conventions

**Checkpoint**: Foundation ready

---

## 3. User Story 1 - List Sources Command (Priority: P1)

**Goal**: Users can run `unentropy sources` to see all files in their analysis scope

### Tests

- [x] 3.1 [P] Write unit tests for `sources` command in `tests/unit/cli/cmd/sources.test.ts`

### Implementation

- [x] 3.2 [P] Implement `src/cli/cmd/sources.ts` — load config, resolve sources globs via fast-glob, print paths
- [x] 3.3 Implement `--loc` flag — per-file LOC counting via `sloc`, two-column table output, summary line
- [x] 3.4 Implement `--sort name|loc` — alphabetical default, LOC-based sort when `--sort loc` (requires `--loc`)
- [x] 3.5 Register `SourcesCommand` in `src/index.ts`

**Checkpoint**: User Story 1 is fully functional — `unentropy sources` works with `--loc` and `--sort`

---

## 4. Polish & Cross-Cutting Concerns

- [x] 4.1 Run `bun check` to verify linting, types, and formatting
- [x] 4.2 Run `bun test` to verify tests pass
