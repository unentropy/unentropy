## Action Definition (Delta)

Extends: openspec/specs/quality-gate-action/contracts/action-interface.md

The following are additions and modifications to the existing action interface contract.

### ADDED Input Parameters

```yaml
inputs:
  output-file:
    description: "Path to write the structured JSON results file (relative to workspace)"
    required: false
    default: ".unentropy/quality-gate-results.json"
```

### MODIFIED Output Parameters

```yaml
outputs:
  # Existing outputs remain unchanged (quality-gate-status, quality-gate-mode, etc.)

  quality-gate-results-path:
    description: "Absolute path to the written JSON results file"

  quality-gate-results-json:
    description: "Full quality gate result as a JSON string (usable with fromJSON() in workflow expressions)"
```

### ADDED Behavioural Contract: JSON Output

- The action MUST write a JSON file to the path specified by the `output-file` input after evaluation completes
- If the `output-file` contains directory components that do not exist, the action MUST create them
- The action MUST set `quality-gate-results-path` to the absolute path of the written file
- The action MUST set `quality-gate-results-json` to a JSON-stringified representation of the full quality gate result
- The JSON output SHALL contain the following structure:

```json
{
  "timestamp": "2026-05-24T12:00:00.000Z",
  "durationMs": 1234,
  "collection": { "successful": 5, "failed": 0, "total": 5 },
  "prCommentUrl": "https://github.com/owner/repo/pull/123#issuecomment-xxx",
  "qualityGate": {
    "status": "pass",
    "mode": "soft",
    "metrics": [
      /* ... MetricEvaluationResult[] ... */
    ],
    "failingMetrics": [
      /* ... MetricEvaluationResult[] ... */
    ],
    "summary": { "totalMetrics": 5, "evaluatedMetrics": 3, "passed": 3, "failed": 0, "unknown": 0 },
    "baselineInfo": { "referenceBranch": "main", "maxAgeDays": 90 }
  }
}
```

The `qualityGate` field is the full `QualityGateResult` type as defined in `src/quality-gate/types.ts`. The envelope adds only timestamp, duration, collection stats (already available at the callsite), and the PR comment URL (computed at runtime). No new output types are needed — the `QualityGateResult` type is reused directly.

- The JSON output MUST be written synchronously (flushed to disk) before the action sets its step outputs
- On hard failure, the JSON file MUST still be written with the results available before the error exit
- On unexpected errors before evaluation, the action MAY omit writing the JSON file entirely

### Usage Examples (ADDED)

#### Consuming JSON results in downstream steps

```yaml
- uses: ./.github/actions/quality-gate
  id: gate

# Access full result via fromJSON()
- name: Check failing metrics count
  run: |
    echo "Failing: ${{ fromJSON(steps.gate.outputs.quality-gate-results-json).qualityGate.failingCount }}"

# Read the JSON file directly
- name: Upload results as artifact
  uses: actions/upload-artifact@v4
  with:
    name: quality-gate-results
    path: ${{ steps.gate.outputs.quality-gate-results-path }}
```

#### Custom output file path

```yaml
- uses: ./.github/actions/quality-gate
  with:
    output-file: reports/quality-gate.json
```
