<div align="center">
  <img src="https://raw.githubusercontent.com/framersai/frame.dev/refs/heads/master/public/frame-logo-transparent.png" alt="Frame.dev" width="120" />

# @framers/codex-extensions

**Plugin & Theme Registry for Frame Codex**

[![npm version](https://img.shields.io/npm/v/@framers/codex-extensions)](https://www.npmjs.com/package/@framers/codex-extensions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![Security: Gitleaks](https://img.shields.io/badge/Security-Gitleaks-green.svg)](https://github.com/gitleaks/gitleaks)

[Documentation](https://frame.dev/docs/extensions) • [Registry](https://registry.frame.dev) • [Templates](#templates) • [Contributing](#contributing)

</div>

---

## Overview

`@framers/codex-extensions` provides a comprehensive plugin and theme system for [Frame Codex](https://frame.dev/codex) and [@framers/codex-viewer](https://www.npmjs.com/package/@framers/codex-viewer).

### Key Features

- 🔌 **Plugin System** - Extend Codex with indexers, validators, analyzers, and UI components
- 🎨 **Theme System** - Create, customize, export, and import themes
- 🎮 **Game Mod-Inspired** - Lazy loading, priority queues, graceful fallback
- 🛡️ **Security First** - Secret detection, permission model, sandboxed execution
- ⚡ **Compatibility Detection** - Version checks, conflict resolution, dependency management
- 🔄 **Hot Reload** - Develop plugins with instant feedback

## Installation

```bash
npm install @framers/codex-extensions
# or
pnpm add @framers/codex-extensions
```

## Quick Start

### Using Plugins

```typescript
import { PluginManager } from '@framers/codex-extensions';

const manager = new PluginManager();

// Install and enable a plugin
await manager.install(pluginManifest);
await manager.enable(pluginManifest.id);

// Check for conflicts
const conflicts = manager.checkConflicts(newPlugin.manifest);
if (conflicts.length > 0) {
  console.log('Conflicts:', conflicts);
}

// Get enabled plugins
const enabled = manager.getEnabled();
```

### Using Themes

```typescript
import { PluginManager, ThemeBuilder, applyTheme } from '@framers/codex-extensions';

const manager = new PluginManager();

// Create a custom theme
const myTheme = new ThemeBuilder('dark')
  .setId('com.myname.cyberpunk')
  .setName('Cyberpunk')
  .setAccent('#ff00ff')
  .setColors({
    bgPrimary: '#0a0a0f',
    textPrimary: '#00ffaa',
  })
  .build();

// Install and apply
manager.installTheme(myTheme);
manager.setTheme(myTheme.manifest.id);

// Or apply directly to DOM
applyTheme(myTheme);
```

### Creating a Plugin

```typescript
import type { CodexPlugin, PluginManifest } from '@framers/codex-extensions';

const myPlugin: CodexPlugin = {
  manifest: {
    id: 'com.myname.my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    type: 'codex',
    category: 'analyzer',
    // ... other manifest fields
  } as PluginManifest,

  async onLoad() {
    console.log('Plugin loaded!');
  },

  analyzer: {
    name: 'my-analyzer',
    async analyze(content, metadata) {
      // Your analysis logic
      return {
        keywords: ['extracted', 'keywords'],
        summary: 'Content summary...',
      };
    },
  },
};

export default myPlugin;
```

## Plugin Types

### Codex Plugins

Extend the data processing pipeline:

| Category | Purpose | Example |
|----------|---------|---------|
| `indexer` | Extract searchable tokens | Keyword extraction, embeddings |
| `validator` | Check content quality | Schema validation, link checking |
| `transformer` | Convert content | Format conversion, sanitization |
| `analyzer` | Extract insights | NLP analysis, readability |
| `exporter` | Export data | PDF, EPUB, JSON export |

### Viewer Plugins

Extend the UI:

| Category | Purpose | Example |
|----------|---------|---------|
| `ui-component` | Add UI elements | Toolbar buttons, panels |
| `visualization` | Data visualization | Charts, graphs, knowledge maps |
| `navigation` | Navigation features | Enhanced search, breadcrumbs |
| `search` | Search enhancements | Semantic search, filters |
| `accessibility` | A11y features | Screen reader, high contrast |
| `integration` | External integrations | Analytics, sync services |

## Templates

Get started quickly with our templates:

```bash
# Codex tool plugin
npx degit framersai/codex-extensions/templates/codex-tool my-plugin

# Viewer UI plugin
npx degit framersai/codex-extensions/templates/viewer-ui my-ui-plugin

# Theme
npx degit framersai/codex-extensions/templates/theme my-theme
```

## Architecture

### Lazy Loading

Plugins are loaded on-demand with priority queuing:

```typescript
import { PluginLoader } from '@framers/codex-extensions';

const loader = new PluginLoader({
  lazyLoad: true,
  maxConcurrent: 3,
  timeout: 30000,
});

// Register for lazy loading
const loadPlugin = loader.registerLazy(manifest);

// Load when needed
const result = await loadPlugin();
```

### Graceful Degradation

Plugins fail gracefully without breaking the system:

- Timeout protection on all plugin methods
- Error boundaries for React components
- Stub plugins for failed loads
- Automatic fallback to CDN mirrors

### Compatibility Checking

```typescript
import { CompatibilityChecker } from '@framers/codex-extensions';

const checker = new CompatibilityChecker();

const result = await checker.check(manifest, {
  loadedPlugins: manager.getEnabled(),
});

if (!result.compatible) {
  console.log('Issues:', result.issues);
}
```

### Security Scanning

```typescript
import { SecurityScanner } from '@framers/codex-extensions';

const scanner = new SecurityScanner();
const result = await scanner.scan(manifest);

if (!result.safe) {
  console.log('Security issues:', result.issues);
}

// Score out of 100
console.log('Security score:', result.score);
```

## Theme System

### Built-in Themes

- `light` - Clean paper-inspired light theme
- `dark` - Modern dark theme
- `terminal` - Green phosphor terminal aesthetic
- `sepia` - Warm vintage paper theme

### Theme Builder API

```typescript
const theme = new ThemeBuilder('dark')
  .setId('com.myname.my-theme')
  .setName('My Theme')
  .setDescription('A beautiful custom theme')
  .setAuthor({ name: 'Your Name', email: 'you@example.com' })
  .setColors({
    bgPrimary: '#1a1b26',
    accent: '#7aa2f7',
    textPrimary: '#c0caf5',
  })
  .setTypography({
    fontFamily: {
      sans: '"Inter", sans-serif',
      mono: '"JetBrains Mono", monospace',
    },
  })
  .build();

// Export to JSON
const json = theme.toJSON();

// Export to CSS
const css = theme.toCSS();
```

### Import/Export Themes

```typescript
// Export
const themeJson = manager.exportTheme('com.myname.my-theme');
localStorage.setItem('my-theme-backup', themeJson);

// Import
const imported = manager.importTheme(themeJson);
```

## Events

Subscribe to plugin lifecycle events:

```typescript
manager.on('plugin:load', event => {
  console.log(`Loaded: ${event.pluginId}`);
});

manager.on('plugin:error', event => {
  console.error(`Error: ${event.data?.error}`);
});

manager.on('theme:change', event => {
  console.log(`Theme: ${event.themeId}`);
});
```

## Contributing

We welcome contributions! Please follow our guidelines:

### Commit Convention

We use [Conventional Commits](https://conventionalcommits.org):

```bash
feat(loader): add retry mechanism
fix(themes): correct dark mode colors
docs(readme): update examples
```

### Security

- All commits are scanned with [Gitleaks](https://github.com/gitleaks/gitleaks)
- Never commit API keys, tokens, or secrets
- Report vulnerabilities to security@frame.dev

### Development

```bash
# Clone
git clone https://github.com/framersai/codex-extensions
cd codex-extensions

# Install
pnpm install

# Dev
pnpm dev

# Test
pnpm test

# Lint
pnpm lint

# Build
pnpm build
```

## License

MIT © [Framers AI](https://frame.dev)

---

<div align="center">
  <p>
    <a href="https://frame.dev">Frame.dev</a> •
    <a href="https://frame.dev/codex">Codex</a> •
    <a href="https://github.com/framersai">GitHub</a>
  </p>
  <sub>Building the future of knowledge infrastructure</sub>
</div>
























