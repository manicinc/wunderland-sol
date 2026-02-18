# Web Browser Extension for AgentOS

Browser automation capabilities for AgentOS agents - navigate pages, scrape content, click elements, and capture screenshots.

## Features

- **Navigate**: Go to any URL and get page content
- **Scrape**: Extract content using CSS selectors
- **Click**: Interact with page elements
- **Type**: Fill in forms and input fields
- **Screenshot**: Capture visual snapshots
- **Page Snapshot**: Get accessibility tree for intelligent interaction

## Installation

```bash
npm install @framers/agentos-ext-web-browser
```

## Quick Start

```typescript
import { createExtensionPack } from '@framers/agentos-ext-web-browser';
import { ExtensionManager } from '@framers/agentos';

const extensionManager = new ExtensionManager();

// Register the browser extension
extensionManager.register(createExtensionPack({
  options: {
    headless: true,
    timeout: 30000,
    viewport: { width: 1920, height: 1080 }
  },
  logger: console
}));
```

## Tools

### browser_navigate

Navigate to a URL and retrieve page content.

```typescript
const result = await gmi.executeTool('browser_navigate', {
  url: 'https://example.com',
  waitFor: 'networkidle2',
  returnText: true
});
// Returns: { url, status, title, text, loadTime }
```

### browser_scrape

Extract content using CSS selectors.

```typescript
const result = await gmi.executeTool('browser_scrape', {
  selector: 'article h2',
  limit: 10
});
// Returns: { selector, count, elements: [{ tag, text, html, attributes }] }
```

### browser_click

Click on an element.

```typescript
const result = await gmi.executeTool('browser_click', {
  selector: 'button.submit',
  waitForNavigation: true
});
// Returns: { success, element, newUrl }
```

### browser_type

Type text into an input field.

```typescript
const result = await gmi.executeTool('browser_type', {
  selector: 'input[name="search"]',
  text: 'AgentOS documentation',
  clear: true
});
// Returns: { success, element, text }
```

### browser_screenshot

Capture a screenshot.

```typescript
const result = await gmi.executeTool('browser_screenshot', {
  fullPage: true,
  format: 'png'
});
// Returns: { data (base64), format, width, height, size }
```

### browser_snapshot

Get accessibility tree for intelligent interaction.

```typescript
const result = await gmi.executeTool('browser_snapshot', {});
// Returns: { url, title, elements, links, forms, interactable }
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `headless` | boolean | `true` | Run browser in headless mode |
| `timeout` | number | `30000` | Default timeout (ms) |
| `userAgent` | string | - | Custom user agent |
| `viewport.width` | number | `1920` | Viewport width |
| `viewport.height` | number | `1080` | Viewport height |
| `executablePath` | string | auto | Path to Chrome executable |

## Use Cases

### Web Research Agent

```typescript
// Search and scrape information
await gmi.executeTool('browser_navigate', { url: 'https://google.com' });
await gmi.executeTool('browser_type', { selector: 'input[name="q"]', text: 'AI agents 2024' });
await gmi.executeTool('browser_click', { selector: 'input[type="submit"]', waitForNavigation: true });
const results = await gmi.executeTool('browser_scrape', { selector: '.g h3' });
```

### Form Automation

```typescript
await gmi.executeTool('browser_navigate', { url: 'https://signup.example.com' });
await gmi.executeTool('browser_type', { selector: '#email', text: 'user@example.com' });
await gmi.executeTool('browser_type', { selector: '#password', text: 'securepass123' });
await gmi.executeTool('browser_click', { selector: 'button[type="submit"]' });
```

### Visual Verification

```typescript
await gmi.executeTool('browser_navigate', { url: 'https://myapp.com' });
const screenshot = await gmi.executeTool('browser_screenshot', { fullPage: true });
// Send screenshot to vision model for analysis
```

## Dependencies

This extension requires Chrome/Chromium to be installed on the system. It uses `puppeteer-core` which does not bundle a browser.

## License

MIT © Frame.dev


