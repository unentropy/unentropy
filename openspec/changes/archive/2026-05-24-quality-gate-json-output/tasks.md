## 1. Setup

- [x] 1.1 Read existing source files: `src/actions/quality-gate.ts`, `src/quality-gate/types.ts`, `.github/actions/quality-gate/action.yml`

## 2. Implementation

**Goal**: The quality gate action writes a complete JSON results file and exposes it as step outputs

- [x] 2.1 Add `outputFile` to `QualityGateInputs` interface and parse it in `parseInputs()` in `src/actions/quality-gate.ts`
- [x] 2.2 Build the thin output envelope (timestamp, duration, collection stats, prCommentUrl, qualityGate result) and write JSON file synchronously with `fs.mkdirSync` / `fs.writeFileSync` in `runQualityGateAction()`
- [x] 2.3 Set `core.setOutput("quality-gate-results-path", absolutePath)` and `core.setOutput("quality-gate-results-json", JSON.stringify(envelope))` in `runQualityGateAction()`
- [x] 2.4 Update `.github/actions/quality-gate/action.yml`: add `output-file` input with default `.unentropy/quality-gate-results.json`, add `quality-gate-results-path` and `quality-gate-results-json` outputs, pass `INPUT_OUTPUT-FILE` env var

**Checkpoint**: JSON output implementation complete

## 3. Verification

- [x] 3.1 Run `bun check` (lint, type check, format) to verify no regressions
- [x] 3.2 Run `bun test` to verify all existing tests still pass
