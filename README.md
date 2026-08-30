# project-template

Framework-neutral Bun + TypeScript monorepo baseline and composable project generator.

## Composition model

```text
base
  ↓
profile
  ↓
features
  ↓
framework
  ↓
generated project
```

`base` owns the shared engineering contract. A profile selects a project shape, features add
independent capabilities, and framework integration is a separate dimension. The initial framework
catalog contains `none`, leaving a stable extension point for React, Hono, and other integrations.

## Profiles

| Profile     | Default capabilities                                 |
| ----------- | ---------------------------------------------------- |
| `base`      | Minimal framework-neutral monorepo                   |
| `cli`       | Vitest, CSpell, case-police                          |
| `api`       | CLI capabilities plus dependency-cruiser             |
| `web`       | Vitest, Playwright, Stylelint, hygiene, architecture |
| `library`   | Vitest, hygiene, architecture, npm package quality   |
| `fullstack` | Web testing and quality capabilities                 |

Profiles are presets, not template copies. The generator always starts from
`packages/create-project/template/base` and composes manifests and files from
`template/features/*` with conflict detection and deterministic ordering.

Available features are `vitest`, `playwright`, `stylelint`, `cspell`, `case-police`,
`dependency-cruiser`, `package-quality`, and `security`. The security capability currently adds a
Renovate configuration and dependency audit without making heavy security tools mandatory.

## Generate a project

```sh
bunx @creepiest-space/create-project my-cli --profile=cli
bunx @creepiest-space/create-project my-lib --profile=library
bunx @creepiest-space/create-project my-web \
  --profile=web \
  --testing=unit,integration,e2e
```

Fully explicit automation:

```sh
bunx @creepiest-space/create-project my-project \
  --profile=web \
  --framework=none \
  --testing=unit,integration,e2e \
  --quality=full \
  --ci=github \
  --no-install
```

Use `--features=security` for extra capabilities and `--ci=none` to omit workflows. Existing
options remain supported: `--template=base`, `--no-install`, `--no-git`, and `--force`.

Without selection flags in a terminal, the CLI prompts for the profile, framework, testing,
quality, Git, and CI choices. Supplying a directory and explicit flags is deterministic and
non-interactive.

## Quality contract

Every generated project exposes:

```text
quality:static   format, JS/TS lint, optional style lint, typecheck
quality:hygiene  casing and spelling
quality:codebase dead code, architecture, optional package/security checks
quality:test     unit and integration tests
quality:fast     static checks, dead code, unit tests
quality          all applicable checks, build, E2E
```

Compatibility aliases remain available:

```sh
bun run check       # quality:fast
bun run check:full  # quality
bun run deadcode    # check:deadcode
```

Vitest provides unit and integration testing. Its optional V8 coverage defaults to 80% for lines,
functions, and statements and 75% for branches. Set individual `COVERAGE_*` variables to customize
them or `COVERAGE_THRESHOLDS=off` to disable thresholds. Playwright is added only when E2E is
selected.

Lefthook formats and lints staged files only, validates Conventional Commits, and runs
`quality:fast` before push. GitHub Actions groups work into static, test, build, and profile-aware
E2E/smoke jobs.

## Package and release quality

The `library` profile creates `packages/library` and checks its built package with Publint, Are the
Types Wrong, and a Bun tarball smoke test.

The generator package itself is blocking on the same checks:

```sh
bun run check:package
bun run pack:create-project:dry-run
```

Release Please manages versions, changelogs, tags, and GitHub Releases for
`@creepiest-space/create-project`. npm publication remains manual; the release workflow does not
require or consume an npm token.

## Development

```sh
bun install
bun run quality:fast
bun run quality
```

Applications belong in `apps/*`; reusable libraries belong in `packages/*`. See `AGENTS.md` for
the complete architecture and collaboration contract.
