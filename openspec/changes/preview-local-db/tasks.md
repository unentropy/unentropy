## 1. Setup

- [x] 1.1 Read `src/cli/cmd/preview.ts` to understand current command structure

## 2. Foundational

- [x] 2.1 [P] Add `--db` option to `PreviewArgs` interface and yargs builder (type `string`, no default)
- [x] 2.2 Implement branching logic in `handler`: when `--db` is provided, check `existsSync(dbPath)` and fail early if missing; open the DB read-only via `Storage`; derive repo name from `basename(process.cwd())`; call `generateReport(repo, storage, config)`; write HTML; open in browser; close storage

**Checkpoint**: `preview --db <path>` generates real reports from local SQLite

---

## 3. Polish & Cross-Cutting Concerns

- [x] 3.1 Run `bun check` to verify lint, types, and formatting
- [x] 3.2 Run `bun test` to verify existing tests still pass
