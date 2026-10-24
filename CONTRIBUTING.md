# Contributing

Thank you for your interest in contributing to Unentropy!

## What We Accept

We welcome the following types of contributions:

- Bug fixes
- Documentation improvements

**Note:** Core product features and major changes require prior discussion. Please [open an issue](https://github.com/unentropy/unentropy/issues) first to discuss your proposal before starting work. PRs for new features submitted without prior approval may be closed.

## Development Setup

### Requirements

- [Node.js](https://nodejs.org/) 22.15+ (24 recommended, see `.node-version`); the CLI itself supports 22.13+, but the dev scripts need `module.registerHooks`
- [pnpm](https://pnpm.io/) (version in `packageManager` in `package.json`)

### Getting Started

```bash
git clone https://github.com/unentropy/unentropy.git
cd unentropy
pnpm install
```

### Visual Review

This repository includes helper scripts for working on the report generation code.

```bash
pnpm dev-report
```

Starts a local HTTP server at port 3000 that serves the report HTML filled with dummy data. Use it when working on report template (src/reporter/templates), to get the immediate feedback.

```bash
pnpm visual-review
```

This will generate a set of fixture data and open a browser window with HTML reports. The fixtures are exploring various common scenarios and edge cases. You can use it to quickly verify your changes under different scenarios.

### Commands

```bash
pnpm check         # Run linting, type checking, and format verification
pnpm test          # Run all tests
pnpm visual-review # Generate fixture data and open HTML reports in browser
```

## Before Submitting a PR

1. Run `pnpm check` and `pnpm test` to ensure everything passes
2. Keep PRs small and focused
3. Link any relevant issues in the PR description

## License

By contributing to Unentropy, you agree to license your contribution under the [MIT License](LICENSE).
