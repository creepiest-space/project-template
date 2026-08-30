# @creepiest-space/create-project

Create a composable Bun + TypeScript monorepo.

```sh
bunx @creepiest-space/create-project my-project --profile=cli
```

Profiles are `base`, `cli`, `api`, `web`, `library`, and `fullstack`. Framework selection is
independent and currently supports `none`.

```sh
bunx @creepiest-space/create-project my-web \
  --profile=web \
  --framework=none \
  --testing=unit,integration,e2e \
  --quality=full \
  --ci=github \
  --no-install
```

Additional capabilities can be selected with `--features`. Existing automation remains compatible
with `--template=base`, `--no-install`, `--no-git`, and `--force`. Run with `--help` for the complete
option list.

The generator copies the minimal base into a staging directory, composes feature files and package
manifest patches, rejects collisions, and atomically moves the completed project into place.

## Package validation

```sh
bun run check:package
```

This performs a clean build, Publint validation, ESM-focused Are the Types Wrong validation, and
inspection of a real `bun pm pack` tarball. Publishing remains an explicit manual operation:

```sh
bun run publish:npm:dry-run
bun run publish:npm
```
