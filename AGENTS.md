# AGENTS.md

## SDD Principles

This project follows Specification-Driven Development (SDD) principles as defined in `openspec/config.yaml`:

- **Serverless Architecture**: All components operate within GitHub Actions workflows
- **Technology Stack Consistency**: Bun runtime with TypeScript, SQLite, Chart.js
- **Code Quality Standards**: Strict TypeScript, Prettier formatting, minimal comments
- **Security Best Practices**: Never log/expose secrets, follow security guidelines
- **Testing Discipline**: Comprehensive unit, integration, and contract tests

## General instructions

- Reference `openspec/config.yaml` and `openspec/schemas/unentropy/schema.yaml` for SDD workflow details
- DO NOT jump into modifying code when not explicitly instructed to do so - for example, when asked to "plan" or "analyze" or "update the spec", just run the analysis, report the results and wait for further instructions.
- DO NOT add code comments unless asked.
- When asked to implement a single task, do not proceed to the next - stop and wait for further instructions.
- Run "bun check" after making changes to the code
- We use jujutsu VCS. Load jujutsu skill before any VCS operations.

## Project Summary

Unentropy is a serverless tool for tracking custom code metrics in CI/CD pipelines via GitHub Actions, using Node.js/TypeScript, SQLite, and Chart.js to generate trend reports without external servers.

## Project Structure

- **`src/`** - Main Unentropy application code (CLI, collectors, reporters, storage, etc.)
- **`tests/`** - Unit, integration, and contract tests
- **`openspec/`** - OpenSpec specifications with contracts, design, and change history

## Lint/Test Commands

- Lint, type checks, format checks: bun check
- Test: bun test
- Single test: bun test --testNamePattern="<test name>"
- Visual review (generate + open in browser): bun visual-review

## Code Style Guidelines

- Language: TypeScript/Node.js
- Formatting: Use Prettier for code formatting
- Imports: Use ES6 imports; group by external, then internal modules
- Naming: camelCase for variables/functions; PascalCase for classes/types
- Types: Strict TypeScript; prefer interfaces for object types
- Error handling: Use try/catch; throw custom Error subclasses
- No comments unless requested; follow existing patterns from codebase

## Additional Notes

- Project uses Bun as the package manager and runtime
- Project uses GitHub Actions for CI
- Follow security best practices
- Mimic existing code style from src/ and tests/ directories
- When working on tasks from `openspec/changes/`, update the task status after completion
- The website/ directory is a separate Astro project with its own package.json and dependencies

## Active Technologies

- Bun runtime, TypeScript, SQLite (metrics store), GitHub Actions runtime, GitHub REST API client for pull request comments, Chart.js for existing visual reports.
- SQLite database managed via the storage provider abstraction (local, artifact, or S3-compatible backends).
- Use yargs (https://yargs.js.org/) for command-line argument parsing
