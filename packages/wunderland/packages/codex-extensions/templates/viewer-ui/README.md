# Your Viewer Plugin Name

> Brief description of what your viewer plugin does.

## Installation

```bash
npm install @framers/codex-viewer-your-plugin-name
# or
pnpm add @framers/codex-viewer-your-plugin-name
```

## Usage

```tsx
import { PluginManager } from '@framers/codex-extensions';
import yourPlugin from '@framers/codex-viewer-your-plugin-name';

const manager = new PluginManager();
await manager.install(yourPlugin.manifest);
await manager.enable(yourPlugin.manifest.id);
```

## Features

- ✅ Toolbar button for quick actions
- ✅ Sidebar panel for detailed view
- ✅ Keyboard shortcuts
- ✅ Theme-aware styling

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+E` | Show example panel |

## Configuration

The plugin can be configured via the manifest or at runtime:

```typescript
// Configuration options if any
```

## Styling

The plugin uses CSS variables from the Codex Viewer theme:

```css
.your-component {
  background: var(--codex-bg-secondary);
  color: var(--codex-text-primary);
  border-radius: var(--codex-radius-md);
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Watch mode
pnpm dev

# Run tests
pnpm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT © [Your Name](https://your-website.com)

