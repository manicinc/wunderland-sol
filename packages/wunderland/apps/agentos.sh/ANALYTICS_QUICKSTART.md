# 🎯 Quick Start: Analytics Setup

## Setup (2 minutes)

### 1. Set env vars (recommended via GitHub secrets / deploy env)

AgentOS.sh only enables tracking when IDs are provided via env vars **and** the user accepts analytics cookies.

Create `.env.local` in `apps/agentos.sh/` (gitignored), or set these as environment variables in your deployment (Vercel/Netlify/GitHub Actions).

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_CLARITY_PROJECT_ID=your-clarity-id
```

For GitHub Pages deployments, add these as repository secrets and the deploy workflow will pick them up:

- `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- `NEXT_PUBLIC_CLARITY_PROJECT_ID`

Tip: even though these IDs are not truly “secret” (they’re embedded into the client bundle), keeping them out of the repo prevents forks from accidentally sending data to your properties.

## What You Get

✅ **Google Analytics 4** - Page views, events, user insights  
✅ **Microsoft Clarity** - Session recordings, heatmaps, UX insights  
✅ **GDPR Compliant** - Cookie consent banner with opt-in  
✅ **Comprehensive Tracking** - Scroll depth, time on page, clicks, searches, errors  
✅ **Works on Both Sites** - agentos.sh AND docs.agentos.sh  

## Dashboards

- **Analytics**: https://analytics.google.com/
- **Clarity**: https://clarity.microsoft.com/

## Test It

```bash
cd apps/agentos.sh
pnpm dev
# Open localhost:3000, accept cookies, check DevTools Console
```

That's it.
