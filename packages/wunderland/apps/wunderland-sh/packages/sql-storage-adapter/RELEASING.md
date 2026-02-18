# Release Process

`@framers/sql-storage-adapter` publishes through [semantic-release](https://semantic-release.gitbook.io) and the workflow at `.github/workflows/release.yml`.

## Branch strategy

- `master` is the only release branch.
- Each merge to `master` triggers the workflow; semantic-release decides whether a release is required based on commit messages.
- Commit messages **must** follow the [Conventional Commits](https://www.conventionalcommits.org) specification. Examples:
  - `fix: correct sqlite fallback logic` → patch release.
  - `feat: add postgres connection pooling` → minor release.
  - `feat!: drop deprecated Sync API` or a `BREAKING CHANGE:` footer → major release.
  - `docs: update README` → no release (unless combined with breaking change).

## What the pipeline does

1. Installs dependencies (`pnpm install --no-frozen-lockfile`).
2. Builds the package (`pnpm run build`).
3. Runs `semantic-release`, which:
   - Computes the next semantic version.
   - Updates `CHANGELOG.md` automatically.
   - Publishes the package to npm.
   - Tags the commit (`vX.Y.Z`) and creates a GitHub release with generated notes.
   - Commits `chore(release): X.Y.Z [skip ci]` back to `master` containing the changelog & package.json updates.

If no release-worthy commits are present since the previous tag, semantic-release exits without publishing.

## Required secrets

Store the following under **Settings → Secrets and variables → Actions**:

- `NPM_TOKEN` – npm automation token with `publish` scope for `@framers/sql-storage-adapter`.

`GITHUB_TOKEN` is provided automatically by Actions for tagging and releases.

## Manual retry (rare)

If you must run a release locally:

```bash
pnpm install
pnpm run build
npx semantic-release --dry-run  # inspect
npx semantic-release            # publish
```

Run this only from a clean checkout of `master` with the same `NPM_TOKEN` available in the environment. The automated GitHub workflow should be preferred.
