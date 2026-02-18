---
sidebar_position: 7
---

# Browser Automation

Wunderland agents can interact with web pages through the browser automation module. The system is built on top of Playwright and provides three layers: an HTTP client (`BrowserClient`), a CDP session manager (`BrowserSession`), and a high-level interactions API (`BrowserInteractions`).

## Architecture

```
BrowserClient (HTTP)          BrowserSession (CDP/Playwright)
   |                                  |
   |  /start, /stop, /tabs,           |  connect(), getPage(),
   |  /snapshot, /tabs/open            |  ensurePageState()
   |                                  |
   +------- used by agents -----------+---- BrowserInteractions
                                            click(), type(), goto(),
                                            screenshot(), wait(), ...
```

- **BrowserClient** -- HTTP client that talks to a browser automation service. Use this when the browser is running as a separate service (e.g., via the OpenClaw browser server).
- **BrowserSession** -- Direct Playwright CDP connection. Use this when you need to control Chrome locally via `playwright-core`.
- **BrowserInteractions** -- High-level wrapper around `BrowserSession` that provides agent-friendly methods for clicking, typing, form-filling, and more.

## BrowserClient Setup

`BrowserClient` communicates with a browser service over HTTP. It does not require `playwright-core` as a dependency.

```typescript
import { BrowserClient } from 'wunderland/browser';

const client = new BrowserClient({
  baseUrl: 'http://localhost:9222',
  defaultTimeoutMs: 10000,
});
```

### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | `http://localhost:9222` | Base URL for the browser service |
| `defaultTimeoutMs` | `number` | `10000` | Default timeout for requests in ms |

### Browser Lifecycle

```typescript
// Check browser status
const status = await client.status();
console.log(status.running, status.cdpReady);

// Start the browser
await client.start();

// Stop the browser
await client.stop();
```

### Profile Management

Profiles allow multiple isolated browser instances with separate data directories.

```typescript
// List all profiles
const profiles = await client.profiles();

// Create a new profile
const result = await client.createProfile({
  name: 'agent-cipher',
  color: '#00ffcc',
  driver: 'openclaw',
});

// Delete a profile
await client.deleteProfile('agent-cipher');
```

### Tab Management

```typescript
// Open a new tab
const tab = await client.openTab('https://example.com');
console.log(tab.targetId, tab.title, tab.url);

// List all tabs
const tabs = await client.tabs();

// Focus a tab
await client.focusTab(tab.targetId);

// Close a tab
await client.closeTab(tab.targetId);
```

### Snapshots

Snapshots capture the current page state in a format suitable for agent consumption. Two formats are available:

- **`aria`** -- Returns an array of accessibility tree nodes (structured data).
- **`ai`** -- Returns a pre-formatted text string optimized for LLM context windows.

```typescript
// AI-formatted snapshot (recommended for agent use)
const snapshot = await client.snapshot({
  format: 'ai',
  targetId: tab.targetId,
  compact: true,
  interactive: true,
});

if (snapshot.ok && snapshot.format === 'ai') {
  console.log(snapshot.snapshot);  // Text for the LLM
  console.log(snapshot.refs);      // Element refs for interaction
}

// Aria tree snapshot
const ariaSnapshot = await client.snapshot({
  format: 'aria',
  targetId: tab.targetId,
});

if (ariaSnapshot.ok && ariaSnapshot.format === 'aria') {
  for (const node of ariaSnapshot.nodes) {
    console.log(`${node.ref} [${node.role}] ${node.name}`);
  }
}
```

#### Snapshot Options

| Option | Type | Description |
|--------|------|-------------|
| `format` | `'aria' \| 'ai'` | Output format |
| `targetId` | `string` | Target tab (optional) |
| `limit` | `number` | Max number of nodes |
| `maxChars` | `number` | Max characters in output |
| `refs` | `'role' \| 'aria'` | Ref generation mode |
| `interactive` | `boolean` | Include only interactive elements |
| `compact` | `boolean` | Compact output |
| `depth` | `number` | Max tree depth |
| `selector` | `string` | CSS selector to scope snapshot |
| `frame` | `string` | Frame selector |
| `labels` | `boolean` | Include labels |
| `mode` | `'efficient'` | Efficient mode |
| `profile` | `string` | Browser profile name |

## BrowserSession (CDP)

For direct browser control, use `BrowserSession` with a CDP WebSocket URL. This requires `playwright-core` as a dependency.

```typescript
import { BrowserSession } from 'wunderland/browser';

const session = new BrowserSession({
  cdpUrl: 'ws://localhost:9222/devtools/browser/abc-123',
  connectTimeoutMs: 10000,
});
```

### Connection Lifecycle

```typescript
// Connect (retries up to 3 times with backoff)
const browser = await session.connect();

// Get or create a page
const page = await session.getPage();

// Get page by target ID
const specificPage = await session.getPageByTargetId('TARGET_ID');

// List all pages across all contexts
const allPages = await session.getAllPages();

// Disconnect
await session.disconnect();
```

The session automatically handles reconnection deduplication. If multiple callers invoke `connect()` simultaneously, they share a single connection attempt.

### Page State Tracking

Every page gets automatic tracking for console messages, page errors, and network requests.

```typescript
const page = await session.getPage();
const state = session.getPageState(page);

if (state) {
  console.log('Console messages:', state.console.length);
  console.log('Page errors:', state.errors.length);
  console.log('Network requests:', state.requests.length);
}
```

State is stored in a `WeakMap` keyed by the Playwright `Page` instance, so it is automatically garbage collected when the page is closed.

Limits are enforced to prevent memory issues:
- Console messages: max 500
- Page errors: max 200
- Network requests: max 500

### Role Refs for Element Targeting

After taking a snapshot, store role refs so that `BrowserInteractions` can target elements by ref.

```typescript
// Store refs from a snapshot result
session.storeRoleRefs(page, snapshotResult.refs, 'role');

// Get a locator for a ref
const locator = session.refLocator(page, 'e1');
await locator.click();
```

Ref formats supported:
- `e1` -- Direct ref
- `@e1` -- Prefix notation
- `ref=e1` -- Explicit notation

## BrowserInteractions API

`BrowserInteractions` wraps `BrowserSession` to provide high-level, agent-friendly methods.

```typescript
import { BrowserInteractions, BrowserSession } from 'wunderland/browser';

const session = new BrowserSession({ cdpUrl: 'ws://...' });
await session.connect();

const interactions = new BrowserInteractions(session);
```

### Click

```typescript
await interactions.click({
  ref: 'e1',
  // Optional:
  doubleClick: false,
  button: 'left',            // 'left' | 'right' | 'middle'
  modifiers: ['Control'],     // Alt, Control, Meta, Shift
  targetId: 'TAB_TARGET_ID',
  timeoutMs: 30000,
});
```

### Hover

```typescript
await interactions.hover({ ref: 'e3' });
```

### Type

```typescript
await interactions.type({
  ref: 'e2',
  text: 'Hello, Wunderland!',
  slowly: false,    // Use pressSequentially with 50ms delay
  submit: true,     // Press Enter after typing
});
```

### Fill Form

Batch-fill multiple form fields at once.

```typescript
await interactions.fillForm({
  fields: [
    { ref: 'e10', value: 'Alice', type: 'text' },
    { ref: 'e11', value: 'researcher', type: 'select' },
    { ref: 'e12', value: 'true', type: 'checkbox' },
  ],
});
```

### Select Option

```typescript
await interactions.selectOption({
  ref: 'e5',
  values: ['option-2'],
});
```

### Press Key

```typescript
await interactions.pressKey({ key: 'Escape' });
await interactions.pressKey({ key: 'Tab', delayMs: 100 });
```

### Scroll Into View

```typescript
await interactions.scrollIntoView({ ref: 'e20' });
```

### Screenshot

```typescript
// Full page screenshot
const buffer = await interactions.screenshot({ fullPage: true });

// Element screenshot by ref
const elementShot = await interactions.screenshot({ ref: 'e5' });

// Element screenshot by CSS selector
const selectorShot = await interactions.screenshot({ element: '.main-content' });
```

### Wait

```typescript
// Wait for time
await interactions.wait({ timeMs: 2000 });

// Wait for text to appear
await interactions.wait({ text: 'Loading complete' });

// Wait for text to disappear
await interactions.wait({ textGone: 'Loading...' });

// Wait for URL change
await interactions.wait({ url: '**/dashboard' });

// Wait for load state
await interactions.wait({ loadState: 'networkidle' });

// Wait for a JavaScript condition
await interactions.wait({ fn: 'document.readyState === "complete"' });
```

### Navigate

```typescript
await interactions.goto({ url: 'https://example.com/page' });
```

### Get Page Info

```typescript
const url = await interactions.getUrl();
const title = await interactions.getTitle();
```

### Evaluate JavaScript

```typescript
// Run JS in the page context
const result = await interactions.evaluate<string>({
  fn: 'return document.title',
});

// Run JS on a specific element
const text = await interactions.evaluate<string>({
  ref: 'e5',
  fn: 'return el.textContent',
});
```

## Complete Example: Agent Browsing Flow

```typescript
import { BrowserClient, BrowserSession, BrowserInteractions } from 'wunderland/browser';

// Option A: HTTP client approach (browser running as a service)
const client = new BrowserClient({ baseUrl: 'http://localhost:9222' });
await client.start();
const tab = await client.openTab('https://news.ycombinator.com');
const snapshot = await client.snapshot({
  format: 'ai',
  targetId: tab.targetId,
  compact: true,
});

// The snapshot text can be sent directly to the LLM
// for the agent to decide what to do next.

// Option B: Direct CDP approach (local Playwright control)
const session = new BrowserSession({
  cdpUrl: 'ws://localhost:9222/devtools/browser/...',
});
await session.connect();

const interactions = new BrowserInteractions(session);
await interactions.goto({ url: 'https://news.ycombinator.com' });
await interactions.wait({ loadState: 'networkidle' });

const page = await session.getPage();
const state = session.getPageState(page);
console.log(`Loaded with ${state?.requests.length} network requests`);

// Clean up
await session.disconnect();
```
