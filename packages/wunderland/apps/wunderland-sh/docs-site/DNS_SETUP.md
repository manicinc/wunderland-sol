# DNS Setup for docs.wunderland.sh

This document describes how to configure Cloudflare DNS to point `docs.wunderland.sh` to the documentation site.

## Option 1: GitHub Pages (Recommended)

If deploying to GitHub Pages:

### Cloudflare DNS Settings

Add a CNAME record:

| Type | Name | Content | Proxy status |
|------|------|---------|--------------|
| CNAME | docs | manicinc.github.io | Proxied (orange cloud) |

### GitHub Repository Settings

1. Go to repository Settings → Pages
2. Set custom domain to `docs.wunderland.sh`
3. Enable "Enforce HTTPS"

### Verify Setup

After DNS propagation (up to 24 hours):
```bash
dig docs.wunderland.sh
# Should resolve to GitHub Pages IPs
```

## Option 2: Vercel

If deploying to Vercel:

### Cloudflare DNS Settings

| Type | Name | Content | Proxy status |
|------|------|---------|--------------|
| CNAME | docs | cname.vercel-dns.com | DNS only (grey cloud) |

**Important**: Disable Cloudflare proxy (grey cloud) for Vercel to work properly.

### Vercel Settings

1. Add `docs.wunderland.sh` as a custom domain in Vercel dashboard
2. Vercel will automatically provision SSL

## Option 3: Cloudflare Pages

If deploying directly to Cloudflare Pages:

### Cloudflare Pages Setup

1. Connect GitHub repository to Cloudflare Pages
2. Build settings:
   - Build command: `cd docs-site && pnpm build`
   - Build output directory: `docs-site/build`
3. Add custom domain `docs.wunderland.sh`

DNS will be configured automatically.

## Current wunderland.sh DNS Configuration

Based on the existing setup, add these records:

```
# Existing records (keep these)
wunderland.sh → A record → your server IP
sol.wunderland.sh → CNAME → wunderland.sh (or separate deployment)

# Add for docs
docs.wunderland.sh → CNAME → manicinc.github.io (for GitHub Pages)
```

## SSL/TLS Settings

In Cloudflare SSL/TLS settings:
- Set encryption mode to "Full (strict)" for best security
- Enable "Always Use HTTPS"

## Verification Checklist

- [ ] DNS record added in Cloudflare
- [ ] Custom domain configured in hosting platform
- [ ] SSL certificate provisioned
- [ ] Site accessible at https://docs.wunderland.sh
- [ ] Redirects working (http → https, www → non-www)
