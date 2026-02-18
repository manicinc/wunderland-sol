# Codex Extensions Setup

## Overview

Quarry Codex now uses a **private extension system** for premium themes and plugins.

**Repository:** `framersai/codex-extensions` (🔒 Private)

## Architecture

```
┌─────────────────────────────────────────────┐
│  frame.dev (Public)                         │
│  ├── Uses: @framers/codex-extensions        │
│  └── Themes applied at runtime              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  codex-extensions (Private)                 │
│  ├── Premium Themes (Cyberpunk, Nature, etc)│
│  ├── Custom Renderers (future)              │
│  └── Behavior Plugins (future)              │
└─────────────────────────────────────────────┘
```

## Available Extensions

### Premium Themes

1. **Cyberpunk Noir** 🌃
   - Neon cyan/magenta accents
   - Dark background with glows
   - Monospace typography
   - Tags: dark, neon, futuristic

2. **Botanical Garden** 🌿
   - Earth tones (greens, browns)
   - Serif typography (Georgia)
   - Organic, calming aesthetic
   - Tags: light, organic, nature

3. **Minimal Focus** ✨
   - Ultra-clean, white background
   - System fonts
   - Distraction-free reading
   - Tags: light, minimal, focus

## GitHub Actions Configuration

### Required Secret

Add to repository secrets (Settings → Secrets and variables → Actions):

**Name:** `GH_PAT`  
**Value:** Your GitHub Personal Access Token with `repo` scope

### Workflow Integration

The `.github/workflows/pages.yml` now includes:

```yaml
- name: Install dependencies
  run: pnpm install
  env:
    GH_PAT: ${{ secrets.GH_PAT }}
```

## Local Development

### Authentication

pnpm automatically uses `GH_PAT` from your environment for private repos.

**Set in your shell:**
```bash
export GH_PAT=ghp_your_token_here
```

Or add to `.env.local`:
```
GH_PAT=ghp_your_token_here
```

### Using Extensions

```typescript
import { extensionManager, applyTheme } from '@framers/codex-extensions'

// Register all themes
registerInternalExtensions()

// Get available themes
const themes = extensionManager.getThemes()

// Apply a theme
applyTheme('cyberpunk')
```

### Adding New Themes

1. Create theme file in `codex-extensions/src/themes/`
2. Register in `codex-extensions/src/registry.ts`
3. Commit and push to `framersai/codex-extensions`
4. Run `pnpm update @framers/codex-extensions` in frame.dev

## Security

- **Private repository:** Only Framers team + CI have access
- **No public distribution:** Extensions are proprietary
- **Future:** May open for vetted third-party developers

## Roadmap

- [x] Extension system architecture
- [x] Premium theme support
- [x] Private repo setup
- [x] CI/CD integration
- [ ] Theme picker UI in preferences
- [ ] Hot-reload during development
- [ ] Custom renderer plugins
- [ ] Behavior/shortcut plugins
- [ ] Extension marketplace (public, future)

## Troubleshooting

**Build fails with "No matching version" for codex-extensions:**
- Ensure `GH_PAT` is set in GitHub Actions secrets
- Check PAT has `repo` scope
- Verify `codex-extensions` repo is accessible

**Extensions not loading locally:**
- Set `GH_PAT` environment variable
- Run `pnpm install` again
- Check `.npmrc` configuration

**Theme not applying:**
- Extensions only work client-side
- Check browser console for errors
- Verify theme ID matches registered themes

