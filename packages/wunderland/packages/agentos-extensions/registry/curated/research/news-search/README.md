# News Search Extension for AgentOS

Search for recent news articles via NewsAPI with sorting and language filtering.

## Installation

```bash
npm install @framers/agentos-ext-news-search
```

## Configuration

Set `NEWSAPI_API_KEY` environment variable or pass via options.

## Tool: news_search

**Input:**
- `query` (string, required) -- News search query
- `sortBy` (string: relevancy/publishedAt/popularity, default: publishedAt)
- `language` (string, default: en) -- Article language
- `pageSize` (number, 1-20, default: 5) -- Number of articles

**Output:** Array of articles with `title`, `description`, `url`, `source`, `publishedAt`.

## License

MIT - Frame.dev
