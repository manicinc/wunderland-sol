# Setting Up NPM Token for Auto-Publishing

## Required for Automated Releases

The automated release workflow needs an NPM token to publish packages.

## Steps

### 1. Generate NPM Token

1. Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Click "Generate New Token"
3. Select **"Automation"** type (required for CI/CD)
4. Copy the token (starts with `npm_...`)

### 2. Add to GitHub Secrets

1. Go to: https://github.com/wearetheframers/sql-storage-adapter/settings/secrets/actions
2. Click "New repository secret"
3. Name: `NPM_TOKEN`
4. Value: Paste your NPM token
5. Click "Add secret"

### 3. Test the Workflow

Make a commit to master (bump version):

```bash
npm version patch
git add package.json
git commit -m "chore: bump version to 0.1.1"
git push origin master
```

The workflow will:
- ✅ Run tests
- ✅ Build package
- ✅ Create git tag
- ✅ Create GitHub release
- ✅ Publish to NPM

## Verify It Works

Check these after pushing:

1. **GitHub Actions**: https://github.com/wearetheframers/sql-storage-adapter/actions
2. **Releases**: https://github.com/wearetheframers/sql-storage-adapter/releases
3. **NPM**: https://www.npmjs.com/package/@framers/sql-storage-adapter

## Token Security

- ✅ Never commit tokens to git
- ✅ Use "Automation" token type (not "Publish")
- ✅ Tokens expire after 90 days (renew when needed)
- ✅ Store only in GitHub Secrets

## Troubleshooting

If publishing fails:

1. Check NPM_TOKEN is set in GitHub Secrets
2. Verify token is "Automation" type
3. Check token hasn't expired
4. Verify you have publish rights to `@framers` scope
