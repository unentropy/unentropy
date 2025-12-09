# Contributing

Thank you for your interest in contributing to Unentropy!

## What We Accept

We welcome the following types of contributions:

- Bug fixes
- Documentation improvements

**Note:** Core product features and major changes require prior discussion. Please [open an issue](https://github.com/unentropy/unentropy/issues) first to discuss your proposal before starting work. PRs for new features submitted without prior approval may be closed.

## Development Setup

### Requirements

- [Bun](https://bun.sh/) 1.3+

### Getting Started

```bash
git clone https://github.com/unentropy/unentropy.git
cd unentropy
bun install
```

### Commands

```bash
bun check         # Run linting, type checking, and format verification
bun test          # Run all tests
bun visual-review # Generate fixture data and open HTML reports in browser
```

## Before Submitting a PR

1. Run `bun check` and `bun test` to ensure everything passes
2. Keep PRs small and focused
3. Link any relevant issues in the PR description

## License

By contributing to Unentropy, you agree to license your contribution under the [MIT License](LICENSE).
