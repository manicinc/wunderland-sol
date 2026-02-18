# Web Search Extension for AgentOS

Professional web search, research aggregation, and fact-checking for AgentOS agents.

Supports multiple providers (Serper.dev, SerpAPI, Brave) with a DuckDuckGo fallback when no API keys are configured.

## Installation

```bash
npm install @framers/agentos-ext-web-search
```

## Quick Start

```ts
import { ExtensionManager } from '@framers/agentos';
import { createExtensionPack } from '@framers/agentos-ext-web-search';

const extensionManager = new ExtensionManager();

extensionManager.register(createExtensionPack({
  options: {
    // Any one of these is enough; Serper/SerpAPI/Brave are tried in order.
    serperApiKey: process.env.SERPER_API_KEY,
    serpApiKey: process.env.SERPAPI_API_KEY,
    braveApiKey: process.env.BRAVE_API_KEY,
  },
  logger: console,
}));
```

## Environment Variables

- `SERPER_API_KEY` (optional)
- `SERPAPI_API_KEY` (optional)
- `BRAVE_API_KEY` (optional)

If none are set, the extension falls back to DuckDuckGo.

## Tools

### `web_search`

Search the web.

### `research_aggregate`

Run multiple searches and aggregate results.

### `fact_check`

Cross-check a claim across sources.

## Notes

- Tools are read-only (no side effects).
- Provider selection is automatic based on which keys are configured.

## License

MIT © Frame.dev
