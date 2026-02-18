# Domain Routing Configuration

This document explains how to configure domain routing for Quarry deployments.

## Route Structure

Routes are organized into two categories:

### Marketing/Info Pages (stay at root on quarry.space)

| frame.dev Path | quarry.space Path | Purpose |
|---------------|-------------------|---------|
| `/quarry` | `/` | Landing page |
| `/quarry/landing` | `/landing` | Landing page (explicit) |
| `/quarry/about` | `/about` | About page |
| `/quarry/faq` | `/faq` | FAQ |
| `/quarry/privacy` | `/privacy` | Privacy policy |
| `/quarry/waitlist` | `/waitlist` | Waitlist signup |
| `/quarry/api` | `/api` | API documentation |
| `/quarry/api-docs` | `/api-docs` | API docs |
| `/quarry/architecture` | `/architecture` | Architecture docs |
| `/quarry/self-host` | `/self-host` | Self-hosting guide |
| `/quarry/changelog` | `/changelog` | Changelog |

### Feature/App Pages (under /app/ on quarry.space)

| frame.dev Path | quarry.space Path | Purpose |
|---------------|-------------------|---------|
| `/quarry/app` | `/app` | Main Quarry app (SPA entry) |
| `/quarry/write` | `/app/write` | Writing mode |
| `/quarry/reflect` | `/app/reflect` | Journaling/reflection |
| `/quarry/plan` | `/app/plan` | Task & calendar planner |
| `/quarry/dashboard` | `/app/dashboard` | Dashboard |
| `/quarry/browse` | `/app/browse` | Browse content |
| `/quarry/search` | `/app/search` | Search |
| `/quarry/graph` | `/app/graph` | Knowledge graph |
| `/quarry/learn` | `/app/learn` | Learning studio |
| `/quarry/new` | `/app/new` | Create new strand |
| `/quarry/research` | `/app/research` | Research mode |
| `/quarry/collections` | `/app/collections` | Collections |
| `/quarry/tags` | `/app/tags` | Tags management |
| `/quarry/supertags` | `/app/supertags` | Supertags |
| `/quarry/templates` | `/app/templates` | Templates |
| `/quarry/analytics` | `/app/analytics` | Analytics |
| `/quarry/activity` | `/app/activity` | Activity log |
| `/quarry/settings` | `/app/settings` | Settings |
| `/quarry/evolution` | `/app/evolution` | Evolution timeline |

## Implementation

### Path Resolution

The app uses client-side domain detection (`lib/utils/deploymentMode.ts`):

```typescript
// Detect if on any Quarry domain
isQuarryDomain() // quarry.space or *.quarry.space

// Get appropriate app URL based on current domain
getQuarryAppUrl() // Returns '/app' on quarry.space, '/quarry/app' on frame.dev

// Resolve paths for current domain
resolveQuarryPath('/quarry/write', isOnQuarryDomain)
// Returns '/app/write' on quarry.space (feature page)
// Returns '/quarry/write' on frame.dev

resolveQuarryPath('/quarry/about', isOnQuarryDomain)
// Returns '/about' on quarry.space (marketing page)
// Returns '/quarry/about' on frame.dev
```

### Route Redirects

In `next.config.mjs`:
- `/quarry` redirects to `/quarry/landing`
- Legacy `/codex/*` routes redirect to `/quarry/*`

## Deployment Options

### Option 1: Single GitHub Pages Deployment

Both `quarry.space` and `frame.dev` can point to the same GitHub Pages deployment. The app handles path resolution client-side.

**DNS Configuration (Porkbun/Cloudflare):**
```
quarry.space        CNAME  framersai.github.io
www.quarry.space    CNAME  framersai.github.io
```

### Option 2: Cloudflare Pages (Recommended)

For better performance and edge caching:

1. Connect repo to Cloudflare Pages
2. Build command: `pnpm build`
3. Build output: `out`
4. Environment: `STATIC_EXPORT=true`

**DNS Configuration:**
```
quarry.space        CNAME  your-project.pages.dev (proxied)
www.quarry.space    CNAME  your-project.pages.dev (proxied)
```

### Option 3: Cloudflare Pages with Redirects (Recommended for quarry.space)

The `public/_redirects` file is included and handles URL rewriting for quarry.space:

```
# Root domain serves landing
https://quarry.space/ /quarry/landing/ 200

# Marketing pages at root
https://quarry.space/about /quarry/about/ 200
https://quarry.space/faq /quarry/faq/ 200

# /app serves the main Quarry app
https://quarry.space/app /quarry/app/ 200

# Feature pages under /app/
https://quarry.space/app/write /quarry/write/ 200
https://quarry.space/app/reflect /quarry/reflect/ 200
https://quarry.space/app/plan /quarry/plan/ 200
# ... etc.
```

**Important:** This file only works with Cloudflare Pages or Netlify. GitHub Pages does not support `_redirects` files.

## Testing Locally

To test domain detection locally:

1. Edit hosts file:
   - Windows: `C:\Windows\System32\drivers\etc\hosts`
   - Mac/Linux: `/etc/hosts`

```
127.0.0.1 quarry.space
127.0.0.1 local.quarry.space
```

2. Run the dev server and access via those hostnames

## Related Files

- [lib/utils/deploymentMode.ts](lib/utils/deploymentMode.ts) - Domain detection utilities
- [next.config.mjs](next.config.mjs) - Build configuration and redirects
- [lib/hooks/useQuarryPath.ts](lib/hooks/useQuarryPath.ts) - React hook for path resolution
- [public/_redirects](public/_redirects) - Cloudflare Pages redirects
