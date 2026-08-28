# project-template

Reusable engineering baseline for Creepiest Space TypeScript projects.

## Stack

- Bun
- TypeScript
- Turborepo
- Oxlint
- Oxfmt
- Knip
- Lefthook
- Commitlint + czg
- GitHub Actions

## Repository layout

```text
.
├── apps/                 # executable/deployable applications
├── packages/             # reusable libraries
├── .github/workflows/    # CI policies
├── AGENTS.md              # AI/development contract
├── package.json
├── turbo.json
├── tsconfig.base.json
├── oxlint.config.mts
├── oxfmt.config.mts
├── knip.config.mts
├── commitlint.config.mts
├── cz.config.mts
└── lefthook.yml
```

The template intentionally contains no application implementation. Add project profiles such as CLI, API, Web or Fullstack on top of this baseline.

## Create a base project

The bundled generator currently provides the framework-neutral `base` template:

```sh
bun run packages/create-project/src/cli.ts my-project
```

For a deterministic, non-interactive run:

```sh
bun run packages/create-project/src/cli.ts my-project \
  --template=base \
  --no-install \
  --no-git
```

The published package is intended to be invoked as:

```sh
bunx @creepiest-space/create-project@0.1.0 my-project
```

Existing target directories are preserved unless `--force` is explicitly provided.

Build an npm tarball in `artifacts/` or inspect it without writing an artifact:

```sh
bun run pack:create-project
bun run pack:create-project:dry-run
```

See `packages/create-project/README.md` for the npmjs dry-run and publication commands.

## Start a project

```sh
bun install
```

Create an application or package under the corresponding workspace directory.

Example package `packages/core/package.json`:

```json
{
  "name": "@scope/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist",
    "test": "bun test",
    "typecheck": "bunx tsc --noEmit"
  }
}
```

Example workspace `tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
```

## Quality checks

Fast gate:

```sh
bun run check
```

Full gate:

```sh
bun run check:full
```

## Commits

Interactive Conventional Commit:

```sh
bun run commit
```

Lefthook validates formatting/lint before commit, commit message syntax, and the fast quality gate before push.

## Template principles

- Root stays framework-neutral.
- `apps/*` contains executable products.
- `packages/*` contains reusable code.
- Framework-specific configuration belongs to a profile or workspace, not to the base template.
- Release and deployment workflows are intentionally not part of the baseline because they depend on project type.
