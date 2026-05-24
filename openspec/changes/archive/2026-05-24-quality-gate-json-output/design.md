## Context

The quality gate action currently outputs results via three mechanisms: flat string `core.setOutput()` values, human-readable `core.info()`/`core.warning()` log lines, and a markdown PR comment. None of these are suitable for programmatic consumption by AI agents or automation tools that need complete, structured access to per-metric evaluation data (baselines, deltas, threshold configs, pass/fail status).

Common agent-friendly GitHub Actions (codeql-action, megalinter, dorny/paths-filter) solve this by writing structured files (SARIF, JSON) to the workspace and/or setting serialized JSON as step outputs. This design follows that pattern.

## Goals / Non-Goals

**Goals:**

- Write a complete JSON results file to a configurable workspace path after evaluation
- Set `quality-gate-results-path` (absolute path) and `quality-gate-results-json` (JSON string) as step outputs
- Include full per-metric evaluation data (not just failing metrics), run metadata, and collection stats
- Ensure JSON is written before failure exit so results are always available
- Maintain backward compatibility — all existing outputs and PR comment behavior unchanged

**Non-Goals:**

- Changing the quality gate evaluation logic, threshold system, or PR comment format
- Adding new output formats (YAML, SARIF, etc.)
- Modifying the `track-metrics` action
- Adding storage provider changes
- Rewriting existing output mechanism

## Decisions

### D1: JSON over other structured formats

JSON is TypeScript/JavaScript's native serialization format, requires zero new dependencies, and is universally parseable by any tool or agent. SARIF is overkill (designed for security/lint results). YAML adds parser complexity.

### D2: `.unentropy/` directory with configurable path

Using `.unentropy/quality-gate-results.json` as the default keeps the workspace root clean with a dotfile convention. The path is configurable via a new `output-file` input for teams that want results elsewhere (e.g., `reports/`). The directory structure mirrors what other tools (megalinter: `megalinter-reports/`, super-linter: `super-linter-output/`) do.

### D3: Synchronous file write

`fs.writeFileSync` with `fs.mkdirSync` (recursive) ensures the file is fully flushed to disk before `core.setOutput()` or `core.setFailed()` runs. This guarantees the JSON file exists even when the action exits with a failure code — critical for agents that want to read results from a failed run.

### D4: Thin output envelope

The JSON file wraps the existing `QualityGateResult` in a minimal envelope with only the data not already present in that type: timestamp, duration, collection stats (available at the callsite), and PR comment URL (computed at runtime). No GitHub context or config summary — the agent can get repository info from environment variables and the `QualityGateResult` already carries `baselineInfo` and `mode`. This avoids new TypeScript interfaces; the assembly is ~5 lines of object construction in the action file.

### D5: JSON string step output for `fromJSON()` consumers

Setting `quality-gate-results-json` as a JSON-stringified step output lets downstream workflow steps use `${{ fromJSON(steps.gate.outputs.quality-gate-results-json).qualityGate.status }}` directly — a pattern proven by `dorny/paths-filter` (`changes` output) and `codeql-action` (`sarif-ids` output). Note: GitHub Actions step outputs are limited to ~1MB, so very large metric sets may need to rely on the file path instead.

### D6: No new TypeScript dependency

Uses only `fs` (Node built-in via Bun), `path` (Node built-in), and `JSON.stringify`. No new npm packages required.

## Risks / Trade-offs

- **[Size limit on step output]** `quality-gate-results-json` could exceed GitHub's ~1MB step output limit for repos with hundreds of metrics → Mitigation: document the limit and recommend using the file path for large datasets
- **[File write permissions]** The runner may not have write permission to the specified directory → Mitigation: default to workspace-relative path which is always writable; errors are caught and surfaced as warnings (non-fatal)
- **[Sensitive data in JSON]** If metrics values or names contain sensitive info, the JSON file could leak it → Mitigation: same security model as existing outputs; metrics config is user-defined and already visible in logs and comments
- **[Agent consumption pattern]** Agents may not know where to find the file without documentation → Mitigation: the file path is always available as a step output (`quality-gate-results-path`), and the default path is predictable

## Contracts Referenced

- `contracts/quality-gate-action/action-interface.md` — new `output-file` input, `quality-gate-results-path` and `quality-gate-results-json` outputs, JSON output behavioral contract
- `specs/quality-gate-action/spec.md` — ADDED "Structured JSON Output" requirement, MODIFIED "Action Inputs and Outputs" requirement

## File Changes

### Modified Files

- `src/actions/quality-gate.ts` — Add `output-file` input parsing, assemble envelope object inline, JSON serialization and file write, new `core.setOutput()` calls for `quality-gate-results-path` and `quality-gate-results-json`
- `.github/actions/quality-gate/action.yml` — Add `output-file` input, add `quality-gate-results-path` and `quality-gate-results-json` outputs, pass `INPUT_OUTPUT-FILE` env var

### Unchanged Files

- `src/quality-gate/evaluator.ts` — No change (evaluation logic unaffected)
- `src/quality-gate/samples.ts` — No change (sample building unaffected)
- `src/config/schema.ts` — No change (config schema unaffected)
- `.github/workflows/ci.yml` — No change (existing workflows continue working)
