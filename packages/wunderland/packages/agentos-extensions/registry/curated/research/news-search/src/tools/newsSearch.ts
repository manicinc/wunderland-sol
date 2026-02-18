/**
 * News Search Tool — search news articles via NewsAPI.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult, JSONSchemaObject } from '@framers/agentos';

export interface NewsSearchInput {
  query: string;
  sortBy?: 'relevancy' | 'publishedAt' | 'popularity';
  language?: string;
  pageSize?: number;
}

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl?: string;
  author?: string;
}

export interface NewsSearchOutput {
  query: string;
  articles: NewsArticle[];
  totalResults: number;
}

export class NewsSearchTool implements ITool<NewsSearchInput, NewsSearchOutput> {
  readonly id = 'news-search-v1';
  readonly name = 'news_search';
  readonly displayName = 'News Search';
  readonly description =
    'Search for recent news articles via NewsAPI. Returns headlines, descriptions, and links.';
  readonly category = 'research';
  readonly version = '1.0.0';
  readonly hasSideEffects = false;

  readonly inputSchema: JSONSchemaObject = {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'News search query.' },
      sortBy: { type: 'string', enum: ['relevancy', 'publishedAt', 'popularity'], default: 'publishedAt' },
      language: { type: 'string', default: 'en' },
      pageSize: { type: 'integer', minimum: 1, maximum: 20, default: 5 },
    },
    required: ['query'],
  };

  readonly requiredCapabilities = ['capability:web_search'];

  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEWSAPI_API_KEY || '';
  }

  async execute(args: NewsSearchInput, _context: ToolExecutionContext): Promise<ToolExecutionResult<NewsSearchOutput>> {
    if (!this.apiKey) return { success: false, error: 'NEWSAPI_API_KEY not configured.' };

    try {
      const params = new URLSearchParams({
        q: args.query,
        sortBy: args.sortBy || 'publishedAt',
        language: args.language || 'en',
        pageSize: String(args.pageSize || 5),
        apiKey: this.apiKey,
      });

      const response = await fetch(`https://newsapi.org/v2/everything?${params}`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return { success: false, error: `NewsAPI error (${response.status}): ${(err as any).message || response.statusText}` };
      }

      const data = (await response.json()) as any;
      const articles: NewsArticle[] = (data.articles || []).map((a: any) => ({
        title: a.title || '',
        description: a.description || '',
        url: a.url,
        source: a.source?.name || 'Unknown',
        publishedAt: a.publishedAt,
        imageUrl: a.urlToImage,
        author: a.author,
      }));

      return { success: true, output: { query: args.query, articles, totalResults: data.totalResults || articles.length } };
    } catch (err: any) {
      return { success: false, error: `News search failed: ${err.message}` };
    }
  }
}
