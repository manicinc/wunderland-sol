# Releasing & Publishing

This repository uses [Changesets](https://github.com/changesets/changesets) for versioning and npm publishing. Each extension package is versioned independently.

## How it works

```
Make changes → Add changeset → Push to master → CI opens "Version Packages" PR → Merge PR → Packages published to npm
```

### 1. Add a changeset

After making changes to one or more extensions, run:

```bash
pnpm changeset
```

This interactive CLI will ask:
- **Which packages changed?** Select the affected extension(s)
- **What kind of bump?** `patch` (bug fix), `minor` (new feature), or `major` (breaking change)
- **Summary**: A short description of the change

This creates a markdown file in `.changeset/` describing the change. Commit it with your code.

### 2. Push to master

```bash
git add .
git commit -m "feat: add new search provider"
git push origin master
```

### 3. CI creates a "Version Packages" PR

The `release.yml` GitHub Action detects pending changesets and opens a PR titled **"chore: version packages"**. This PR:
- Bumps `version` in each affected `package.json`
- Generates/updates `CHANGELOG.md` for each package
- Removes the consumed `.changeset/*.md` files

### 4. Merge the PR to publish

When you merge the "Version Packages" PR, the action runs `pnpm run release` which:
- Publishes each bumped package to npm under the `@framers` scope
- Creates GitHub releases with tags like `@framers/agentos-ext-web-search@1.2.0`
- Updates `registry.json` with the latest versions

## Version bump guide

| Change type | Bump | Example |
|-------------|------|---------|
| Bug fix, typo, perf improvement | `patch` | 1.0.0 -> 1.0.1 |
| New feature, new tool, new export | `minor` | 1.0.0 -> 1.1.0 |
| Breaking API change, removed export | `major` | 1.0.0 -> 2.0.0 |

## Multiple changes in one PR

You can include multiple changesets in a single commit or PR. Each changeset can target different packages with different bump types:

```bash
# First changeset: patch for web-search
pnpm changeset
# Select @framers/agentos-ext-web-search, patch

# Second changeset: minor for telegram
pnpm changeset
# Select @framers/agentos-ext-telegram, minor
```

## Manual publishing (emergency)

If CI is broken and you need to publish manually:

```bash
# Ensure you have NPM_TOKEN set
export NPM_TOKEN=npm_xxxx

# Version the packages (applies changesets)
pnpm run version-packages

# Review the changes, then publish
pnpm run release
```

## Adding a new extension

When adding a new extension package:

1. Create the package in `registry/curated/<category>/<name>/`
2. Add it to `pnpm-workspace.yaml`
3. Ensure `package.json` has:
   - `"private": false` (or omit the field)
   - `"publishConfig": { "access": "public" }`
   - Correct `"name"` under `@framers/` scope
4. Add an initial changeset: `pnpm changeset` and select the new package with a `minor` bump

## Secrets

| Secret | Where | Purpose |
|--------|-------|---------|
| `GITHUB_TOKEN` | Automatic | PR creation, GitHub releases |
| `NPM_TOKEN` | Repository Settings > Secrets > Actions | npm publishing for `@framers` scope |

The `NPM_TOKEN` must be a **granular access token** with publish permissions for the `@framers` organization. Generate one at [npmjs.com/settings/tokens](https://www.npmjs.com/settings/tokens).

## Workspace packages

The `pnpm-workspace.yaml` lists all publishable packages:

```yaml
packages:
  - "registry/curated/auth"
  - "registry/curated/provenance/anchor-providers"
  - "registry/curated/provenance/wunderland-tip-ingestion"
  - "registry/curated/research/web-search"
  - "registry/curated/research/web-browser"
  - "registry/curated/integrations/telegram"
  - "registry/curated/communications/telegram-bot"
  - "registry/curated/system/cli-executor"
```

## Changesets config

The `.changeset/config.json` controls behavior:

```json
{
  "changelog": ["@changesets/changelog-github", { "repo": "framersai/agentos-extensions" }],
  "access": "public",
  "baseBranch": "master"
}
```

- **changelog**: Auto-links PRs and commits in changelogs
- **access**: All packages publish as public
- **baseBranch**: Changesets tracks changes against `master`
