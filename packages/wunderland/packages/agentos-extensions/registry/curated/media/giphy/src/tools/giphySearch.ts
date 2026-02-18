/**
 * Giphy GIF Search Tool — ITool implementation for Giphy API.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult, JSONSchemaObject } from '@framers/agentos';

export interface GiphySearchInput {
  query: string;
  limit?: number;
  rating?: 'g' | 'pg' | 'pg-13' | 'r';
  type?: 'gifs' | 'stickers';
}

export interface GiphyGif {
  id: string;
  title: string;
  url: string;
  embedUrl: string;
  previewUrl: string;
  width: number;
  height: number;
}

export interface GiphySearchOutput {
  query: string;
  results: GiphyGif[];
  totalCount: number;
}

export class GiphySearchTool implements ITool<GiphySearchInput, GiphySearchOutput> {
  readonly id = 'giphy-search-v1';
  readonly name = 'giphy_search';
  readonly displayName = 'Giphy GIF Search';
  readonly description =
    'Search for animated GIFs and stickers via the Giphy API. ' +
    'Returns GIF URLs that can be embedded in posts using markdown: ![desc](url).';
  readonly category = 'media';
  readonly version = '1.0.0';
  readonly hasSideEffects = false;

  readonly inputSchema: JSONSchemaObject = {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query for GIFs.' },
      limit: { type: 'integer', minimum: 1, maximum: 10, default: 3 },
      rating: { type: 'string', enum: ['g', 'pg', 'pg-13', 'r'], default: 'pg' },
      type: { type: 'string', enum: ['gifs', 'stickers'], default: 'gifs' },
    },
    required: ['query'],
  };

  readonly requiredCapabilities = ['capability:media_search'];

  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GIPHY_API_KEY || '';
  }

  async execute(
    args: GiphySearchInput,
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult<GiphySearchOutput>> {
    if (!this.apiKey) {
      return { success: false, error: 'GIPHY_API_KEY not configured.' };
    }

    const limit = args.limit || 3;
    const rating = args.rating || 'pg';
    const type = args.type || 'gifs';

    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        q: args.query,
        limit: String(limit),
        rating,
      });

      const response = await fetch(`https://api.giphy.com/v1/${type}/search?${params}`);

      if (!response.ok) {
        return { success: false, error: `Giphy API error (${response.status})` };
      }

      const data = (await response.json()) as any;

      const results: GiphyGif[] = (data.data || []).map((gif: any) => ({
        id: gif.id,
        title: gif.title || '',
        url: gif.images?.original?.url || gif.url,
        embedUrl: gif.embed_url,
        previewUrl: gif.images?.fixed_width?.url || '',
        width: parseInt(gif.images?.original?.width || '0', 10),
        height: parseInt(gif.images?.original?.height || '0', 10),
      }));

      return {
        success: true,
        output: { query: args.query, results, totalCount: data.pagination?.total_count || results.length },
      };
    } catch (err: any) {
      return { success: false, error: `Giphy search failed: ${err.message}` };
    }
  }
}
