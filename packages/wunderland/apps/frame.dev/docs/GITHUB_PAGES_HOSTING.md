# Host Quarry Codex FREE on GitHub Pages

Quarry Codex runs **100% client-side** with embedded AI models. No backend servers required. This guide shows you how to fork and deploy your own instance for free using GitHub Pages.

## What Makes This Possible

Quarry Codex uses cutting-edge browser technologies:

- **Embedded Deep Learning**: BERT and Transformers.js run directly in WebWorkers
- **Client-Side Database**: SQLite (sql.js) and PGlite store data in IndexedDB
- **Semantic Search**: Vector embeddings generated locally, no API calls
- **TextRank Summarization**: NLP algorithms run entirely in the browser
- **BYOK LLM Integration**: Optional API keys for Claude, GPT, Mistral, or Ollama

All AI features work offline after initial model download (~50MB cached).

## Quick Start (5 Minutes)

### 1. Fork the Repository

Click the **Fork** button on [github.com/framersai/codex](https://github.com/framersai/codex)

### 2. Enable GitHub Pages

1. Go to your fork's **Settings** > **Pages**
2. Under "Build and deployment":
   - Source: **GitHub Actions**
3. The workflow will automatically deploy on push to `main`

### 3. Configure Environment (Optional)

Create a `.env.local` file or set GitHub Secrets for feature flags:

```env
# Summarization Algorithm (default: bert)
# Options: bert | tfidf | lead-first
NEXT_PUBLIC_SUMMARIZATION_ALGORITHM=bert

# Auto-summarize on publish (default: true)
NEXT_PUBLIC_AUTO_SUMMARIZE_ON_PUBLISH=true

# Enable summarization caching (default: true)
NEXT_PUBLIC_SUMMARIZATION_CACHING=true
```

### 4. Access Your Codex

Your site will be available at:
```
https://YOUR_USERNAME.github.io/codex
```

## GitHub Actions Workflow

The repository includes a pre-configured workflow at `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build static export
        run: pnpm build
        env:
          NEXT_PUBLIC_SUMMARIZATION_ALGORITHM: ${{ secrets.SUMMARIZATION_ALGORITHM || 'bert' }}
          NEXT_PUBLIC_AUTO_SUMMARIZE_ON_PUBLISH: ${{ secrets.AUTO_SUMMARIZE || 'true' }}

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./out

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

## Configuring Feature Flags via GitHub Secrets

For production deployments, use GitHub Secrets instead of `.env` files:

1. Go to **Settings** > **Secrets and variables** > **Actions**
2. Add these repository secrets:

| Secret Name | Description | Default |
|-------------|-------------|---------|
| `SUMMARIZATION_ALGORITHM` | `bert`, `tfidf`, or `lead-first` | `bert` |
| `AUTO_SUMMARIZE` | `true` or `false` | `true` |

## Custom Domain Setup

To use a custom domain:

1. Add a `CNAME` file to `public/` with your domain:
   ```
   codex.yourdomain.com
   ```

2. Configure DNS:
   - Add a CNAME record pointing to `YOUR_USERNAME.github.io`
   - Or use A records for apex domains:
     ```
     185.199.108.153
     185.199.109.153
     185.199.110.153
     185.199.111.153
     ```

3. Enable HTTPS in repository Settings > Pages

## Embedded AI Models

### BERT Summarization (Default)

The BERT model (~50MB) is downloaded on first use and cached in IndexedDB:

- **Model**: `Xenova/all-MiniLM-L6-v2` via Transformers.js
- **Use Case**: Semantic similarity for TextRank graph
- **Performance**: 2-5s first load, then instant

### TF-IDF Summarization (Lightweight)

For resource-constrained environments:

- **No model download** required
- **Instant** processing
- Set via: `NEXT_PUBLIC_SUMMARIZATION_ALGORITHM=tfidf`

### Lead-First (Fastest)

Simple extraction of leading sentences:

- **Zero processing** overhead
- Best for news-style content
- Set via: `NEXT_PUBLIC_SUMMARIZATION_ALGORITHM=lead-first`

## BYOK LLM Integration

Quarry supports optional LLM API keys for enhanced features:

```typescript
// Stored locally in browser, never sent to our servers
const providers = {
  anthropic: 'sk-ant-...',  // Claude
  openai: 'sk-...',         // GPT-4o
  mistral: '...',           // Mistral AI
  ollama: 'http://localhost:11434'  // Local Ollama
}
```

LLM features include:
- AI-powered document chat
- Abstractive summarization
- Knowledge graph generation
- Smart tagging and categorization

All API calls go directly from your browser to the provider.

## Offline Support

After initial setup, Quarry works fully offline:

1. **Service Worker** caches all static assets
2. **IndexedDB** stores your data locally
3. **AI Models** are cached after first download
4. **No backend** dependencies

## URL Routing Across Deployment Modes

Quarry Codex supports multiple deployment modes, each with different routing capabilities:

| Mode | Output | API Routes | Dynamic URLs | Use Case |
|------|--------|------------|--------------|----------|
| **Static Export** | `output: 'export'` | ❌ No | Pre-generated only | GitHub Pages, CDN |
| **Standalone** | `output: 'standalone'` | ✅ Yes | ✅ Yes | Electron, Docker |
| **Server** | Default | ✅ Yes | ✅ Yes | Vercel, Node.js |

### How URL Routing Works

**Static Export (GitHub Pages):**
- Only pre-generated paths from `generateStaticParams()` work for direct URL access
- Client-side navigation works for ALL paths (SPA behavior)
- Direct URL like `https://frame.dev/quarry/weaves/wiki/tutorials/` requires the HTML to exist

**Server/Standalone (Electron):**
- `dynamicParams = true` enables any URL path
- `dynamic = 'force-dynamic'` renders pages at request time
- No pre-generation required—all paths work

### Configuring Path Generation

The `generateStaticParams()` function in `app/quarry/[...path]/page.tsx` controls which paths are pre-generated:

```typescript
// Environment variable controls generation mode
const mode = process.env.NEXT_PUBLIC_STATIC_GEN_MODE || 'priority'
```

| Mode | Paths Generated | Build Time | Use Case |
|------|-----------------|------------|----------|
| `minimal` | ~30 root paths | Fast | Development, testing |
| `priority` | ~200 high-priority | Medium | Production (default) |
| `all` | All indexed strands | Slow | Full pre-generation |

Set in your workflow:
```yaml
env:
  NEXT_PUBLIC_STATIC_GEN_MODE: 'priority'  # or 'all', 'minimal'
```

### SPA Fallback for Direct URLs

For static deployments, we include a `404.html` that redirects to the SPA router:

```html
<!-- public/404.html - auto-generated -->
<script>
  // Preserve path and redirect to SPA
  sessionStorage.setItem('redirect', location.pathname);
  location.replace('/');
</script>
```

This ensures direct URL navigation works even for paths not pre-generated during build.

### Adding Custom Priority Paths

To ensure specific paths are always pre-generated, add them to `generateStaticParams()`:

```typescript
// Always include these paths for SEO
priorityPaths.add('weaves/wiki/tutorials')
priorityPaths.add('weaves/wiki/reference')
priorityPaths.add('weaves/research/my-important-topic')
```

Or set high priority in your strand's frontmatter:
```yaml
---
seo:
  sitemapPriority: 0.8  # >= 0.8 always pre-generated
featured: true          # Also always pre-generated
---
```

### Electron/Desktop Deployment

Electron uses `output: 'standalone'` which bundles a minimal Node.js server:

```bash
# Build for Electron
ELECTRON_BUILD=true pnpm build

# The standalone server handles all routes dynamically
node .next/standalone/server.js
```

All dynamic routes work because the server renders pages on demand.

### Mobile/Capacitor Deployment

Capacitor uses static export like GitHub Pages:

```bash
# Build for mobile
CAPACITOR_BUILD=true pnpm build

# Copy to native project
npx cap copy
```

The 404.html SPA fallback ensures navigation works within the app.

## Troubleshooting

### Direct URLs Return 404

**Cause:** Path not pre-generated during static build.

**Solutions:**
1. Add path to `generateStaticParams()` priority list
2. Set `NEXT_PUBLIC_STATIC_GEN_MODE=all` (slower build)
3. Ensure `public/404.html` SPA fallback exists
4. For server deployments, verify `dynamicParams = true`

### Build Fails with "out of memory"

Increase Node.js memory in your workflow:

```yaml
- name: Build static export
  run: pnpm build
  env:
    NODE_OPTIONS: '--max-old-space-size=4096'
```

### BERT Model Doesn't Load

Check browser compatibility:
- Requires WebAssembly support
- Chrome 89+, Firefox 89+, Safari 15+

Fallback to TF-IDF:
```env
NEXT_PUBLIC_SUMMARIZATION_ALGORITHM=tfidf
```

### CORS Issues with Ollama

Configure Ollama for cross-origin:
```bash
OLLAMA_ORIGINS=https://YOUR_USERNAME.github.io ollama serve
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

Quarry Codex is open source under [CC-BY-4.0](./LICENSE).

---

**Questions?** Open an issue at [github.com/framersai/quarry/issues](https://github.com/framersai/quarry/issues)
