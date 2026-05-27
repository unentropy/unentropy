**Domain**: cli

**Extends**: `openspec/specs/cli/contracts/cli-interface.md`

# `unentropy sources`

## Command Signature

```
bunx unentropy sources [options]
```

## Options

| Option       | Alias | Type    | Default          | Description                                                                  |
| ------------ | ----- | ------- | ---------------- | ---------------------------------------------------------------------------- |
| `--config`   | `-c`  | string  | `unentropy.json` | Path to config file                                                          |
| `--absolute` | —     | boolean | `false`          | Print absolute paths instead of relative                                     |
| `--loc`      | `-l`  | boolean | `false`          | Show lines-of-code per file in a table                                       |
| `--sort`     | —     | string  | `name`           | Sort order: `name` (alphabetical) or `loc` (ascending LOC, requires `--loc`) |

## Exit Codes

| Code | Condition                                                                  |
| ---- | -------------------------------------------------------------------------- |
| `0`  | Success — files listed                                                     |
| `1`  | Error — config not found, no sources configured, or glob resolution failed |

## Console Output

### Success Output (default — paths only)

```
src/index.ts
src/cli/cmd/collect.ts
src/cli/cmd/init.ts
src/cli/cmd/preview.ts
src/cli/cmd/test.ts
src/cli/cmd/verify.ts
```

### Success Output (absolute paths)

```
/Users/user/project/src/index.ts
/Users/user/project/src/cli/cmd/collect.ts
...
```

### Success Output (with --loc)

```
Path                                            LOC
src/index.ts                                     142
src/cli/cmd/collect.ts                            85
src/cli/cmd/init.ts                              210
src/cli/cmd/preview.ts                            62
src/cli/cmd/verify.ts                             28
───────────────────────────────────────
5 files, 527 LOC
```

### Success Output (with --loc --sort loc)

```
Path                                            LOC
src/cli/cmd/verify.ts                             28
src/cli/cmd/preview.ts                            62
src/cli/cmd/collect.ts                            85
src/index.ts                                     142
src/cli/cmd/init.ts                              210
───────────────────────────────────────
5 files, 527 LOC
```

### Error Outputs

**Config file not found:**

```
Error: Config file not found: unentropy.json
Run 'bunx unentropy init' to create one.
```

**No sources configured:**

```
Error: No sources configured in unentropy.json
Add a "sources" array to your configuration.
```

## Behavior

1. Resolves the config file from `--config` (default: `unentropy.json`)
2. Reads the `sources` array from the resolved config
3. Normalizes each pattern (bare directories get `/**` appended, negated patterns get `/**` appended)
4. Globs for matching files using fast-glob (same logic as collectors)
5. Sorts results — alphabetically by default, by LOC if `--sort loc` (requires `--loc`)
6. Prints output — one path per line by default, two-column table with `--loc`
7. When `--loc` is set, reads each file and counts LOC using the `sloc` library; files with unsupported extensions fall back to non-empty line counting
8. When `--loc` is set, appends a summary line with total file count and total LOC
