**Domain**: metrics

**Extends**: `openspec/specs/metrics/contracts/built-in-metrics.md`

## Delta

### Removed: `--followSymlinks` option from `size` collector

The `--followSymlinks` option is removed. The `size` collector now always uses `lstat` semantics — symbolic links are counted by their link entry size rather than being followed.

#### Before (`size` Options)

```
- Supports glob patterns (e.g., `./dist/*.js`, `.github/actions/*/dist/*.js`)
- `--followSymlinks` - Follow symbolic links
```

#### After (`size` Options)

```
- Supports glob patterns (e.g., `./dist/*.js`, `.github/actions/*/dist/*.js`)
```

### Collector Syntax (unchanged)

| Collector | Syntax                       | Description                   |
| --------- | ---------------------------- | ----------------------------- |
| `size`    | `@collect size <path\|glob>` | Calculate file/directory size |
