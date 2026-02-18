# Your Theme Name

> Brief description of your theme's aesthetic and inspiration.

![Theme Preview](preview.png)

## Installation

### Via Plugin Manager

```typescript
import { PluginManager, ThemeBuilder } from '@framers/codex-extensions';
import themeManifest from '@framers/codex-theme-your-name/manifest.json';
import themeConfig from '@framers/codex-theme-your-name/theme.json';

const manager = new PluginManager();
const theme = {
  manifest: themeManifest,
  ...themeConfig,
};

manager.installTheme(theme);
manager.setTheme(theme.manifest.id);
```

### Manual CSS

```html
<link rel="stylesheet" href="path/to/theme.css" />
```

## Color Palette

| Token | Value | Description |
|-------|-------|-------------|
| `bgPrimary` | `#1a1b26` | Main background |
| `bgSecondary` | `#24283b` | Secondary surfaces |
| `accent` | `#7aa2f7` | Primary accent color |
| `textPrimary` | `#c0caf5` | Main text color |

## Customization

You can extend this theme using the ThemeBuilder:

```typescript
import { ThemeBuilder } from '@framers/codex-extensions';
import baseTheme from '@framers/codex-theme-your-name';

const customTheme = new ThemeBuilder(baseTheme)
  .setId('com.yourname.custom-variant')
  .setName('Custom Variant')
  .setAccent('#ff79c6')
  .build();
```

## Fonts

This theme uses the following fonts:

- **Sans**: Inter
- **Serif**: Merriweather  
- **Mono**: JetBrains Mono

Make sure to include them in your project:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
```

## Inspiration

Describe what inspired your theme (e.g., Tokyo Night, Dracula, Nord, etc.)

## License

MIT © [Your Name](https://your-website.com)

