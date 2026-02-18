# @framers/codex-viewer

> Embeddable GitHub-based knowledge viewer with analog paper styling, semantic search, and wiki features.

[![npm version](https://img.shields.io/npm/v/@framers/codex-viewer)](https://www.npmjs.com/package/@framers/codex-viewer)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- 📚 **Multi-Repository**: Point to ANY GitHub Codex repo (public or private with PAT)
- 🔄 **Instant Rendering**: Automatically fetches and displays any compliant Codex
- 🔍 **Smart Search**: BM25 + semantic re-ranking with client-side embeddings
- 🎨 **Retro-Futuristic**: Terminal themes, analog paper styling, Art Deco elements
- 🌓 **6 Themes**: Light, Dark, Sepia (light/dark), Terminal (green/amber)
- 📱 **Fully Responsive**: Mobile-first with smart breakpoint layouts
- 🔗 **Wiki Features**: Cross-references, backlinks, metadata panel
- ⚡ **Ultra-Fast**: SQL-cached, incremental updates, sub-100ms search
- 🎯 **Zero Config**: Works instantly with sensible defaults
- 🎙️ **Text-to-Speech**: Free client-side read-aloud with radial audio controls
- ⌨️ **Keyboard Navigation**: Full Vim-style + standard shortcuts
- 🔐 **Privacy-First**: No tracking, all processing client-side

- 🕸️ **D3.js Graph Views**: Interactive force-directed knowledge graphs
  - Sidebar graph (contextual to current selection)
  - Full fabric graph at `/codex/graph`
  - Compact relation view in metadata panel
- 📑 **Outline/TOC Mode**: Dynamic table of contents with reading metrics
- 🧠 **NLP Content Analysis**: Client-side entity extraction, auto-tagging, health scoring
- 📐 **Smart Responsive Layouts**: Preset layouts for mobile → ultrawide screens

## Installation

```bash
npm install @framers/codex-viewer
# or
pnpm add @framers/codex-viewer
# or
yarn add @framers/codex-viewer
```

## Quick Start

```tsx
import { CodexViewer } from '@framers/codex-viewer';
import '@framers/codex-viewer/styles.css';

export default function App() {
  return <CodexViewer owner="framersai" repo="codex" branch="main" />;
}
```

### Point to ANY Codex Repository

The viewer works with **any** GitHub repository that follows the OpenStrand schema:

```tsx
// Public repository
<CodexViewer owner="myorg" repo="my-knowledge-base" />

// Private repository (requires PAT in environment)
// Set NEXT_PUBLIC_GH_PAT in .env.local
<CodexViewer owner="mycompany" repo="internal-docs" />

// Custom branch
<CodexViewer owner="acme" repo="wiki" branch="production" />
```

**Requirements**:

- Repository must follow OpenStrand schema (weaves/looms/strands)
- For private repos: Set `NEXT_PUBLIC_GH_PAT` or configure in Settings
- Schema is auto-indexed on first load (instant after that)

> **Want to create your own Codex?** Fork [`framersai/codex-template`](https://github.com/framersai/codex-template) for a complete starter with:
>
> - Pre-configured OpenStrand schema
> - GitHub Actions for auto-indexing
> - Search index generation
> - Example weaves and metadata
> - Ready to deploy!

## Props

| Prop             | Type                          | Default      | Description                |
| ---------------- | ----------------------------- | ------------ | -------------------------- |
| `owner`          | `string`                      | **required** | GitHub repository owner    |
| `repo`           | `string`                      | **required** | GitHub repository name     |
| `branch`         | `string`                      | `'main'`     | Git branch to read from    |
| `basePath`       | `string`                      | `'weaves'`   | Root directory for content |
| `defaultPath`    | `string`                      | `''`         | Initial path to load       |
| `className`      | `string`                      | `''`         | Additional CSS classes     |
| `theme`          | `'light' \| 'dark' \| 'auto'` | `'auto'`     | Color theme                |
| `enableSearch`   | `boolean`                     | `true`       | Enable semantic search     |
| `enableMetadata` | `boolean`                     | `true`       | Show metadata panel        |

## Styling

The viewer uses Tailwind CSS with custom analog-inspired design tokens. You can override styles via CSS variables:

```css
:root {
  --codex-bg-paper: #fafaf9;
  --codex-text-primary: #0a0a0a;
  --codex-accent: #0891b2; /* cyan-600 */
  --codex-border: #d4d4d8;
}

[data-theme='dark'] {
  --codex-bg-paper: #0a0a0a;
  --codex-text-primary: #fafafa;
  --codex-accent: #22d3ee;
  --codex-border: #27272a;
}
```

## Content Structure

The viewer expects a GitHub repo that follows the Frame Codex hierarchy — a **Fabric** (the whole repo) composed of
multiple **Weaves**, each containing **Looms** and **Strands**:

```
weaves/
  frame/
    weave.yaml          # Metadata (title, description, etc.)
    overview.md         # Top-level strand
    architecture/       # Loom (folder)
      systems.md        # Nested strand
  wiki/
    weave.yaml
    guides/
      getting-started.md
```

### Weave (Root Collection)

Top-level folder under `weaves/`. Each weave is self-contained.

### Loom (Folder)

Any folder inside a weave. Can be nested arbitrarily deep.

### Strand (Markdown File)

Individual `.md` files. Can include YAML frontmatter:

```yaml
---
title: 'Getting Started'
tags: [guide, tutorial]
version: '1.0'
---
# Content here...
```

## PWA Support

To make your Codex viewer installable as a desktop/mobile app, add a manifest:

```json
{
  "name": "My Knowledge Base",
  "short_name": "Codex",
  "description": "Personal knowledge repository",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#fafaf9",
  "theme_color": "#0891b2",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## Advanced Usage

### Custom Search

```tsx
import { CodexViewer, useCodexSearch } from '@framers/codex-viewer';

function MyApp() {
  const { results, search, isLoading } = useCodexSearch({
    owner: 'framersai',
    repo: 'codex',
  });

  return (
    <div>
      <input onChange={e => search(e.target.value)} />
      {results.map(r => (
        <div key={r.path}>{r.title}</div>
      ))}
    </div>
  );
}
```

### Programmatic Navigation

```tsx
import { CodexViewer, useCodexNavigation } from '@framers/codex-viewer';

function MyApp() {
  const { navigate, currentPath } = useCodexNavigation();

  return (
    <CodexViewer
      owner="framersai"
      repo="codex"
      onNavigate={path => {
        console.log('Navigated to:', path);
        // Track analytics, update URL, etc.
      }}
    />
  );
}
```

## Development

```bash
# Clone the repo
git clone https://github.com/framersai/frame.dev
cd frame.dev/packages/codex-viewer

# Install dependencies
pnpm install

# Build the package
pnpm build

# Watch mode (for development)
pnpm dev
```

## Contributing

Contributions welcome! Please read our [Contributing Guide](../../CONTRIBUTING.md) first.

## License

MIT © [Framers AI](https://frame.dev)

## Links

- [Documentation](https://frame.dev/codex)
- [Starter Template](https://github.com/framersai/codex-template)
- [GitHub](https://github.com/framersai/frame.dev/tree/master/packages/codex-viewer)
- [NPM](https://www.npmjs.com/package/@framers/codex-viewer)
- [Issues](https://github.com/framersai/frame.dev/issues)
