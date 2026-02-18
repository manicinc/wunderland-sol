# Publishing @framers/codex-viewer to npm

## Pre-publish Checklist

- [ ] All tests passing (`pnpm test`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Types are generated (`dist/index.d.ts` exists)
- [ ] README is complete with examples
- [ ] LICENSE file is present (MIT)
- [ ] Version bumped in `package.json`

## Publishing Steps

### 1. Login to npm

```bash
npm login
```

Enter your npm credentials. You'll need to be added to the `@framers` organization on npm.

### 2. Build the Package

```bash
cd packages/codex-viewer
pnpm build
```

Verify the `dist/` folder contains:
- `index.js` (CJS)
- `index.mjs` (ESM)
- `index.d.ts` (TypeScript types)

### 3. Test Locally (Optional)

Link the package locally to test before publishing:

```bash
# In packages/codex-viewer
pnpm link

# In a test project
pnpm link @framers/codex-viewer
```

### 4. Publish to npm

```bash
# Dry run (shows what will be published)
npm publish --dry-run

# Publish for real
npm publish --access public
```

**Note**: The `--access public` flag is required for scoped packages (@framers/*) to be publicly available.

### 5. Verify Publication

```bash
npm view @framers/codex-viewer
```

Check https://www.npmjs.com/package/@framers/codex-viewer

### 6. Tag the Release

```bash
git tag @framers/codex-viewer@0.1.0
git push origin @framers/codex-viewer@0.1.0
```

## Versioning

Follow [Semantic Versioning](https://semver.org/):

- **Patch** (0.1.x): Bug fixes, small improvements
- **Minor** (0.x.0): New features, backward-compatible
- **Major** (x.0.0): Breaking changes

Update version in `package.json` before publishing:

```bash
# Patch release
npm version patch

# Minor release
npm version minor

# Major release
npm version major
```

## Post-Publish

1. **Announce** on social media / Discord / docs
2. **Update** frame.dev to use the published package (instead of local)
3. **Monitor** npm download stats: https://npmjs.com/package/@framers/codex-viewer
4. **Respond** to GitHub issues and npm support requests

## Unpublishing (Emergency Only)

⚠️ **Use with caution!** Unpublishing breaks existing users.

```bash
npm unpublish @framers/codex-viewer@0.1.0 --force
```

Only do this within 24 hours of publishing if you discover a critical security issue or accidentally published secrets.

## CI/CD Automation (Future)

We can automate publishing with GitHub Actions when a new tag is pushed:

```yaml
# .github/workflows/publish-codex-viewer.yml
name: Publish Codex Viewer
on:
  push:
    tags:
      - '@framers/codex-viewer@*'
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install
      - run: cd packages/codex-viewer && pnpm build
      - run: cd packages/codex-viewer && npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Add `NPM_TOKEN` to GitHub Secrets in repository settings.

## Support

Questions? Email team@frame.dev or open an issue on GitHub.

