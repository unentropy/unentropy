## 1. Create Spec

- [ ] 1.1 Write `specs/storage/spec.md` with ADDED requirements covering all storage behavior
- [ ] 1.2 Verify spec covers behavior from 001 (local storage, schema) and 003 (artifact, S3 storage)

## 2. Create Contracts

- [ ] 2.1 Write `contracts/config-schema.md` with storage block definition
- [ ] 2.2 Write `contracts/storage-provider-interface.md` with interface and provider descriptions
- [ ] 2.3 Write `contracts/database-schema.md` with SQL schema and migration mechanism
- [ ] 2.4 Verify contracts are self-contained and documentation-ready

## 3. Create Supporting Artifacts

- [ ] 3.1 Write `proposal.md`
- [ ] 3.2 Write `design.md`
- [ ] 3.3 Write `tasks.md`

## 4. Validate and Archive

- [ ] 4.1 Run `openspec validate bootstrap-storage`
- [ ] 4.2 Run `openspec archive bootstrap-storage`
- [ ] 4.3 Verify `openspec/specs/storage/` exists with spec.md and contracts/
