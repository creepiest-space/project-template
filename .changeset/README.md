# Changesets

Run `bun run changeset` when changing a published package. Select the affected packages,
choose a semantic version bump, and describe the user-facing change. Commit the generated
Markdown file with the implementation.

On `main`, the release workflow opens or updates a release PR. Merging that PR publishes
unpublished package versions to npm and creates GitHub releases and package tags.
See the root README for the required repository settings and npm trusted publisher configuration.
