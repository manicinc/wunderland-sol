# Image Search Extension for AgentOS

Unified stock photo search across Pexels, Unsplash, and Pixabay with automatic provider fallback.

## Installation

```bash
npm install @framers/agentos-ext-image-search
```

## Configuration

Set one or more API keys:

```bash
PEXELS_API_KEY=your-key
UNSPLASH_ACCESS_KEY=your-key
PIXABAY_API_KEY=your-key
```

## Tool: image_search

**Input:**
- `query` (string, required) -- Search query
- `provider` (string: pexels/unsplash/pixabay/auto, default: auto) -- Image provider
- `limit` (number, 1-10, default: 3) -- Number of results
- `orientation` (string: landscape/portrait/square) -- Image orientation

**Output:** Array of images with `url`, `thumbnailUrl`, `photographer`, `attribution`.

Auto mode tries providers in order: Pexels -> Unsplash -> Pixabay.

## License

MIT - Frame.dev
