# CI/CD Caching Strategy

## Overview

The GitHub Actions workflow uses a **two-layer caching strategy** to balance build speed with correctness:

```
┌─────────────────────────────────────────────────────────────┐
│                    CACHE INVALIDATION                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Commit Type         pnpm Cache      Next.js Cache         │
│   ─────────────────   ──────────      ─────────────         │
│   feat: new feature   ✓ HIT          ✗ MISS (rebuilds)      │
│   fix: bug fix        ✓ HIT          ✗ MISS (rebuilds)      │
│   chore: deps update  ✗ MISS         ✓ HIT                  │
│   docs: readme only   ✓ HIT          ✓ HIT (fastest)        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Cache Keys

### 1. pnpm Store Cache
```yaml
key: pnpm-store-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}
```

**Invalidates when:**
- `pnpm-lock.yaml` changes (new dependencies added/updated)

**Does NOT invalidate when:**
- Source code changes (feat/fix commits)
- Config changes (next.config.js, etc.)

### 2. Next.js Build Cache
```yaml
key: nextjs-${{ runner.os }}-${{ hashFiles('**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.css') }}
```

**Invalidates when:**
- ANY TypeScript/JavaScript/CSS file changes
- This includes ALL `feat:` and `fix:` commits

**Does NOT invalidate when:**
- Only documentation changes (`.md` files)
- Only workflow changes (`.yml` files)
- Only config changes without code

## FAQ

### Q: Will my new feature be included in the build?
**YES, ALWAYS.** The cache is for *compilation artifacts*, not source code. Source code is always freshly checked out from git.

### Q: Why do we cache at all then?
Caching speeds up builds by reusing:
1. **pnpm store**: Don't re-download npm packages (~30s saved)
2. **Next.js cache**: Reuse webpack compilation for unchanged files (~60s saved)

### Q: What if I want to force a full rebuild?
Option 1: Change the workflow file (any change invalidates workflow cache)
Option 2: Go to Actions → Click "Re-run all jobs" with "Clear cache" checkbox
Option 3: Delete caches manually in repo Settings → Actions → Caches

### Q: My code changed but cache hit - is something wrong?
If you see `nextjs-*` cache HIT but your `.ts`/`.tsx` files changed, the hash might not have updated. This is rare but can happen. Force rebuild using options above.

## Build Times (Expected)

| Scenario | pnpm Cache | Next.js Cache | Approx Time |
|----------|------------|---------------|-------------|
| First build | MISS | MISS | ~3-4 min |
| Code change (feat/fix) | HIT | MISS | ~2-3 min |
| Deps change | MISS | HIT | ~2-3 min |
| Docs only | HIT | HIT | ~1-2 min |
| Everything cached | HIT | HIT | ~1-2 min |

## Troubleshooting

### "No build cache found" warning
This is normal for the first build or when cache expires (7 days for GitHub Actions).

### Build includes old code
This should NEVER happen since code is checked out fresh. If it does:
1. Check the commit SHA in the workflow run
2. Verify the file exists in that commit
3. Clear all caches and rebuild

### Cache keeps missing
Check if your source files have changed - even whitespace changes invalidate the cache.

## Related Files

- `.github/workflows/pages.yml` - Main workflow with cache configuration
- `next.config.js` - Next.js configuration (affects build output)
- `pnpm-lock.yaml` - Dependency lock file (affects pnpm cache)














