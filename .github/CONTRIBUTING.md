# Contributing to llmpack

Thanks for your interest in contributing to llmpack.

## Prerequisites

- [Bun](https://bun.sh) (preferred over Node.js)
- TypeScript 5.x

## Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/llmpack.git
   cd llmpack
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Run tests to verify the setup:
   ```bash
   bun test
   ```

## Running Tests

```bash
bun test                    # all tests
bun test tests/unit         # unit tests only
bun test tests/integration  # integration tests only
bun test tests/snapshots    # snapshot tests
bun test --update-snapshots # regenerate snapshots
```

## Other Commands

```bash
bun run bench       # performance + savings benchmarks
bun tsc --noEmit    # type check
```

## Branch Naming

Use descriptive branches, e.g. `fix/csv-escaping`, `feat/hybrid-formatter`, `docs/readme-update`.

## Commit Messages

Keep commits focused and messages clear. Prefix with a verb when helpful: `fix:`, `feat:`, `docs:`, `test:`, etc.

## Pull Request Process

1. Create a branch from `main`.
2. Make your changes.
3. Add or update tests as needed.
4. Ensure `bun test` and `bun tsc --noEmit` pass.
5. Open a PR and fill in the [pull request template](.github/PULL_REQUEST_TEMPLATE.md).
6. Link any related issues.

## Code Style

- TypeScript everywhere.
- Use existing patterns; follow the style of nearby code.
- Prefer `bun` over `node`/`npm` in scripts and examples.
