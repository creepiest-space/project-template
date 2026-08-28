# @creepiest-space/create-project

Create a Bun + TypeScript monorepo from the Creepiest Space base template.

```sh
bunx @creepiest-space/create-project@0.1.0 my-project
```

The CLI defaults to dependency installation and Git initialization. Automation can make every
choice explicit:

```sh
bunx @creepiest-space/create-project@0.1.0 my-project \
  --template=base \
  --no-install \
  --no-git
```

Run with `--help` for all options. Existing directories require explicit `--force`.

## Build and publish

Create a tarball in the repository's ignored `artifacts/` directory:

```sh
bun run pack:npm
```

Inspect the npm publication lifecycle without uploading anything:

```sh
bun run publish:npm:dry-run
```

After setting up npm authentication and assigning a version that does not already exist, publish
the public scoped package:

```sh
bun run publish:npm
```

`prepublishOnly` runs typechecking and tests. `prepack` then performs a clean build and verifies the
manifest, CLI shebang, declarations, license, and required base-template assets.
