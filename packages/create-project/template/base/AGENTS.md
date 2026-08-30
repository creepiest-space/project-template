# Project Agent Guide

## Purpose

This repository is a reusable Bun + TypeScript monorepo baseline.
Keep the root generic. Product-specific code belongs in `apps/*` or `packages/*`.

## Repository layout

- `apps/*` — deployable or executable applications.
- `packages/*` — reusable libraries and shared domain packages.
- `.github/workflows/*` — repository CI policies.
- Root config files — shared engineering rules for every workspace.

## Collaboration and tooling

- `AGENTS.md` is the shared source of truth for repository-wide agent instructions.
- Keep committed instructions client-neutral where possible. Put client-specific configuration in
  that client's directory and label client-specific guidance clearly.
- Do not overwrite, rename, or delete another client's configuration as cleanup.
- Do not assume that a skill, MCP server, IDE command, approval mode, or browser tool available in
  one client exists in another. Use documented shell or CLI commands as the common fallback.
- Before committing agent configuration, check it for drift, secrets, machine-specific absolute
  paths, and inconsistent tool versions.

## Commands

- `bun install` — install dependencies.
- `bun run dev` — run workspace development tasks.
- `bun run build` — build all workspaces.
- `bun run test:unit` — run unit tests.
- `bun run test:integration` — run integration tests.
- `bun run test:e2e` — run end-to-end tests when the profile supports them.
- `bun run test` — compatibility alias for unit and integration tests.
- `bun run typecheck` — run TypeScript checks.
- `bun run lint` — run Oxlint.
- `bun run lint:types` — run type-aware Oxlint.
- `bun run format` — format source files.
- `bun run check:deadcode` — run Knip.
- `bun run check:case` — validate naming and path casing.
- `bun run check:spelling` — run CSpell.
- `bun run check:architecture` — validate dependency boundaries.
- `bun run quality:fast` — fast local quality gate.
- `bun run quality` — complete quality gate.
- `bun run check` and `bun run check:full` — compatibility aliases.
- `bun run commit` — create a Conventional Commit interactively.

## Architecture rules

1. Keep applications thin. Reusable logic belongs in packages.
2. Do not import one application from another application.
3. Packages may depend only on packages with a clear lower-level responsibility.
4. Avoid root-level application code.
5. Prefer explicit public exports from each package.
6. Keep side effects at application boundaries.
7. Treat applied database migrations as immutable. Prefer new, forward-compatible migrations.

## Working rules

1. Inspect the nearest existing implementation before introducing a new pattern or dependency.
2. Keep changes focused. Do not rewrite unrelated code or discard user changes in a dirty
   worktree.
3. Do not edit dependencies, generated output, or build artifacts unless the documented workflow
   explicitly requires it.
4. Never commit secrets, environment-file contents, access tokens, passwords, private keys,
   database dumps, personal data, or production data.
5. Use example environment files for variable names and safe placeholder values only.
6. Do not deploy, publish packages, apply production migrations, or mutate production services
   unless the user explicitly asks.

## TypeScript

- Strict mode is mandatory.
- Avoid `any`; prefer `unknown` and narrowing.
- Preserve ESM semantics.
- Do not disable compiler checks to work around local errors.

## Quality contract

Every profile exposes the same top-level quality API. Optional capabilities are connected through
profile and feature composition; an inapplicable gate must be disabled there instead of bypassed
locally.

- `quality:static` — formatting, JS/TS lint, optional style lint, and typechecking.
- `quality:hygiene` — casing and spelling.
- `quality:codebase` — dead code, architecture, optional package and security checks.
- `quality:test` — unit and integration tests.
- `quality:fast` — static checks, dead code, and unit tests.
- `quality` — every applicable gate, build, and E2E.

Before finishing a change, run:

```sh
bun run format
bun run quality:fast
```

Before declaring implementation complete, run:

```sh
bun run quality
```

Run the smallest relevant checks while iterating. If a required check cannot run, report the exact
command and blocker instead of claiming verification.

Do not disable rules without justification, add Knip ignores instead of removing dead code, use
`--no-verify` as a normal workflow, lower coverage thresholds to make CI pass, or add unused
dependencies.

## Git

Use Conventional Commits.
Prefer small, reviewable commits and pull requests.
PR titles must also follow Conventional Commit syntax.
