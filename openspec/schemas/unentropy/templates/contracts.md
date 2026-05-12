## Contract Selection Guide

Create contract files under `contracts/` relevant to this feature.
Only create contracts that this feature adds or modifies.

- **New config options** → `config-schema.md`
- **New/modified GitHub Action** → `action-interface.md`
- **New/modified CLI command** → `cli-interface.md`
- **Database changes** → `database-schema.md`
- **Storage provider changes** → `storage-provider-interface.md`
- **Report/visual changes** → `report-data-schema.md` or `html-report-template.md`
- **New metric templates** → `built-in-metrics.md`
- **PR comment format changes** → `comment-layout.md`

For each contract:

- Include TypeScript interfaces / JSON schema / YAML inputs as appropriate
- Include `Extends:` reference when building on prior specs
- Include usage examples
- Keep contracts self-contained and documentation-ready
- Do NOT include version history or manual versioning — git tracks evolution
