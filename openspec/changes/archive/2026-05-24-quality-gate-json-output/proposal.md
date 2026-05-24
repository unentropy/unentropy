## Why

AI agents and automation tools cannot reliably consume the quality gate action's current outputs (flat strings, markdown PR comments, log lines). They need structured, machine-readable results (JSON) to make automated decisions about PR quality — without parsing human-targeted text.

## What Changes

- Add a new `output-file` input parameter to the quality gate action, defaulting to `.unentropy/quality-gate-results.json`
- After evaluation, write the full quality gate result (all metrics, deltas, baselines, threshold configs, run metadata) as a JSON file to that path
- Expose the JSON file path as a new `quality-gate-results-path` action output
- Serialize the full result as a JSON string in a new `quality-gate-results-json` action output (for `fromJSON()` consumers in workflow expressions)
- Update the `action-interface` contract to document the new inputs and outputs

## Capabilities

### New Capabilities

- _(none — this is a modification of the existing quality-gate-action capability)_

### Modified Capabilities

- `quality-gate-action`: The action must now produce a structured JSON output file and expose the full result as a serialized JSON step output, in addition to existing flat outputs and PR comment

## Impact

- **`src/actions/quality-gate.ts`**: Add JSON serialization and file write logic, add `output-file` input parsing, assemble thin envelope inline, add new `core.setOutput()` calls
- **`.github/actions/quality-gate/action.yml`**: Add `output-file` input, add `quality-gate-results-path` and `quality-gate-results-json` outputs
- **`.github/actions/quality-gate/action.yml`**: Pass `INPUT_OUTPUT-FILE` environment variable to the runner script
- No new dependencies required (uses built-in `JSON.stringify` and `fs.writeFile`)

### Documentation Impact

- [ ] No user-facing doc changes
- [x] Contracts affect: `action-interface.md` — new inputs and outputs must be documented

## Non-goals

- Not modifying the quality gate evaluation logic or threshold system
- Not changing the PR comment format or content
- Not adding new storage providers or output formats beyond JSON
- Not modifying the `track-metrics` action
- Not changing the `quality-gates` spec (threshold evaluation logic)
