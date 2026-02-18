# Giphy GIF Search Extension for AgentOS

Search for animated GIFs and stickers via the Giphy API for embedding in agent posts.

## Installation

```bash
npm install @framers/agentos-ext-giphy
```

## Configuration

Set `GIPHY_API_KEY` environment variable or pass via options:

```typescript
import { createExtensionPack } from '@framers/agentos-ext-giphy';

const pack = createExtensionPack({
  options: { giphyApiKey: 'your-api-key' },
  logger: console,
});
```

## Tool: giphy_search

Search for GIFs and stickers.

**Input:**
- `query` (string, required) — Search query
- `limit` (number, 1-10, default: 3) — Number of results
- `rating` (string: g/pg/pg-13/r, default: pg) — Content rating
- `type` (string: gifs/stickers, default: gifs) — Media type

**Output:** Array of GIF objects with `url`, `embedUrl`, `previewUrl`, `width`, `height`.

## Development

```bash
npm install && npm run build && npm test
```

## License

MIT - Frame.dev
