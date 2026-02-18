# @gitpaywidget/widget

Embeddable payment widget for static sites. Renders beautiful pricing cards with customizable themes.

---

## Installation

```bash
npm install @gitpaywidget/widget
# or
pnpm add @gitpaywidget/widget
```

For static HTML sites, use the CDN:

```html
<script type="module" src="https://cdn.gitpaywidget.com/v0/widget.js"></script>
```

---

## Usage

### Render Widget

```typescript
import { renderGitPayWidget } from '@gitpaywidget/widget';

const widget = await renderGitPayWidget({
  project: 'your-org/your-site',
  plans: [
    {
      id: 'free',
      label: 'Starter',
      price: '$0',
      description: 'Perfect for trying out',
      features: ['5 documents', 'Basic summaries', 'Community support'],
    },
    {
      id: 'pro',
      label: 'Pro',
      price: '$9.99/mo',
      description: 'For power users',
      features: ['Unlimited documents', 'Block-level summaries', 'Priority support', 'API access'],
    },
  ],
  theme: {
    accentHex: '#8b5cf6',
    ctaLabel: 'Get started',
  },
  autoTheme: true, // Fetch theme from your dashboard
  mount: document.getElementById('pricing-section'),
});
```

---

## Options

### `GitPayWidgetRenderOptions`

| Property        | Type                 | Required | Description                                                               |
| --------------- | -------------------- | -------- | ------------------------------------------------------------------------- |
| `project`       | `string`             | ✅       | Project slug (e.g., `framersai/codex`)                                    |
| `plans`         | `WidgetPlanConfig[]` | ✅       | Array of plan configurations to display                                   |
| `theme`         | `object`             | ❌       | Custom theme (accent color, CTA label)                                    |
| `autoTheme`     | `boolean`            | ❌       | Fetch theme from GitPayWidget dashboard (overrides `theme` if found)      |
| `themeEndpoint` | `string`             | ❌       | Custom endpoint for theme API (defaults to `gitpaywidget.com/api/public`) |
| `mount`         | `HTMLElement`        | ❌       | DOM element to render into (creates a new div if omitted)                 |

### `WidgetPlanConfig`

| Property      | Type       | Required | Description                     |
| ------------- | ---------- | -------- | ------------------------------- |
| `id`          | `string`   | ✅       | Unique plan identifier          |
| `label`       | `string`   | ✅       | Display name (e.g., "Pro")      |
| `price`       | `string`   | ✅       | Price string (e.g., "$9.99/mo") |
| `description` | `string`   | ✅       | Short tagline                   |
| `features`    | `string[]` | ✅       | List of features/benefits       |

---

## Theming

### Dashboard-Managed Themes

Set `autoTheme: true` to pull accent color and CTA label from your GitPayWidget dashboard:

```typescript
renderGitPayWidget({
  project: 'acme/site',
  plans: [...],
  autoTheme: true
})
```

### Inline Themes

```typescript
renderGitPayWidget({
  project: 'acme/site',
  plans: [...],
  theme: {
    accentHex: '#ec4899',
    ctaLabel: 'Start free trial'
  }
})
```

### Custom CSS

Add custom styles in your dashboard or inject inline:

```css
.gpw-plan-card {
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(139, 92, 246, 0.12);
}

.gpw-plan-button:hover {
  transform: translateY(-2px);
}
```

---

## CDN Usage (No Build Step)

For static sites without a build process:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My Site</title>
  </head>
  <body>
    <div id="pricing"></div>

    <script type="module">
      import { renderGitPayWidget } from 'https://cdn.gitpaywidget.com/v0/widget.js';

      renderGitPayWidget({
        project: 'myusername/mysite',
        plans: [
          {
            id: 'basic',
            label: 'Basic',
            price: '$5',
            description: 'Starter',
            features: ['Feature 1'],
          },
        ],
        autoTheme: true,
        mount: document.getElementById('pricing'),
      });
    </script>
  </body>
</html>
```

---

## Performance

- **Bundle size**: < 5 KB gzipped (ESM + CSS)
- **Lazy-loads SDK**: Only fetches checkout logic on first button click
- **CSS caching**: Styles fetched once, cached for 1 year
- **Tree-shakeable**: Only import what you need

---

## Examples

Check out the [live demo](https://gitpaywidget.com/widget-demo) or see `/apps/gitpaywidget/app/widget-demo` in the monorepo.

---

## Support

Questions or issues? Contact **team@manic.agency** or file an issue at https://github.com/manicinc/gitpaywidget

---

**Built by** Manic Agency LLC
