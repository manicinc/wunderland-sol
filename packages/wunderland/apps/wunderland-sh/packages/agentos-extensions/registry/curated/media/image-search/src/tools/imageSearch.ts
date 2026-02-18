/**
 * Image Search Tool — unified stock photo search across Pexels, Unsplash, Pixabay.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult, JSONSchemaObject } from '@framers/agentos';

export interface ImageSearchInput {
  query: string;
  provider?: 'pexels' | 'unsplash' | 'pixabay' | 'auto';
  limit?: number;
  orientation?: 'landscape' | 'portrait' | 'square';
}

export interface SearchImage {
  id: string;
  provider: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  photographer?: string;
  description?: string;
  attribution: string;
}

export interface ImageSearchOutput {
  query: string;
  provider: string;
  images: SearchImage[];
  totalResults: number;
}

export class ImageSearchTool implements ITool<ImageSearchInput, ImageSearchOutput> {
  readonly id = 'image-search-v1';
  readonly name = 'image_search';
  readonly displayName = 'Image Search';
  readonly description =
    'Search for stock photos from Pexels, Unsplash, or Pixabay. ' +
    'Returns image URLs with attribution for embedding in posts.';
  readonly category = 'media';
  readonly version = '1.0.0';
  readonly hasSideEffects = false;

  readonly inputSchema: JSONSchemaObject = {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Image search query.' },
      provider: { type: 'string', enum: ['pexels', 'unsplash', 'pixabay', 'auto'], default: 'auto' },
      limit: { type: 'integer', minimum: 1, maximum: 10, default: 3 },
      orientation: { type: 'string', enum: ['landscape', 'portrait', 'square'] },
    },
    required: ['query'],
  };

  readonly requiredCapabilities = ['capability:media_search'];

  private pexelsKey: string;
  private unsplashKey: string;
  private pixabayKey: string;

  constructor(keys?: { pexels?: string; unsplash?: string; pixabay?: string }) {
    this.pexelsKey = keys?.pexels || process.env.PEXELS_API_KEY || '';
    this.unsplashKey = keys?.unsplash || process.env.UNSPLASH_ACCESS_KEY || '';
    this.pixabayKey = keys?.pixabay || process.env.PIXABAY_API_KEY || '';
  }

  async execute(
    args: ImageSearchInput,
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult<ImageSearchOutput>> {
    const provider = args.provider || 'auto';
    const limit = args.limit || 3;

    let selected: 'pexels' | 'unsplash' | 'pixabay';
    if (provider === 'auto') {
      if (this.pexelsKey) selected = 'pexels';
      else if (this.unsplashKey) selected = 'unsplash';
      else if (this.pixabayKey) selected = 'pixabay';
      else return { success: false, error: 'No image API keys configured.' };
    } else {
      selected = provider;
    }

    try {
      switch (selected) {
        case 'pexels': return await this.searchPexels(args.query, limit, args.orientation);
        case 'unsplash': return await this.searchUnsplash(args.query, limit, args.orientation);
        case 'pixabay': return await this.searchPixabay(args.query, limit, args.orientation);
      }
    } catch (err: any) {
      return { success: false, error: `Image search failed: ${err.message}` };
    }
  }

  private async searchPexels(query: string, limit: number, orientation?: string): Promise<ToolExecutionResult<ImageSearchOutput>> {
    if (!this.pexelsKey) return { success: false, error: 'PEXELS_API_KEY not set.' };
    const params = new URLSearchParams({ query, per_page: String(limit) });
    if (orientation) params.set('orientation', orientation);
    const res = await fetch(`https://api.pexels.com/v1/search?${params}`, { headers: { Authorization: this.pexelsKey } });
    if (!res.ok) return { success: false, error: `Pexels: ${res.status}` };
    const data = (await res.json()) as any;
    return {
      success: true,
      output: {
        query, provider: 'pexels', totalResults: data.total_results || 0,
        images: (data.photos || []).map((p: any) => ({
          id: String(p.id), provider: 'pexels', url: p.src?.large || p.src?.original,
          thumbnailUrl: p.src?.medium, width: p.width, height: p.height,
          photographer: p.photographer, description: p.alt || '',
          attribution: `Photo by ${p.photographer} on Pexels`,
        })),
      },
    };
  }

  private async searchUnsplash(query: string, limit: number, orientation?: string): Promise<ToolExecutionResult<ImageSearchOutput>> {
    if (!this.unsplashKey) return { success: false, error: 'UNSPLASH_ACCESS_KEY not set.' };
    const params = new URLSearchParams({ query, per_page: String(limit) });
    if (orientation) params.set('orientation', orientation);
    const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, { headers: { Authorization: `Client-ID ${this.unsplashKey}` } });
    if (!res.ok) return { success: false, error: `Unsplash: ${res.status}` };
    const data = (await res.json()) as any;
    return {
      success: true,
      output: {
        query, provider: 'unsplash', totalResults: data.total || 0,
        images: (data.results || []).map((p: any) => ({
          id: p.id, provider: 'unsplash', url: p.urls?.regular, thumbnailUrl: p.urls?.small,
          width: p.width, height: p.height, photographer: p.user?.name,
          description: p.description || p.alt_description || '',
          attribution: `Photo by ${p.user?.name} on Unsplash`,
        })),
      },
    };
  }

  private async searchPixabay(query: string, limit: number, orientation?: string): Promise<ToolExecutionResult<ImageSearchOutput>> {
    if (!this.pixabayKey) return { success: false, error: 'PIXABAY_API_KEY not set.' };
    // Pixabay requires per_page 3–200
    const params = new URLSearchParams({ key: this.pixabayKey, q: query, per_page: String(Math.max(3, limit)), safesearch: 'true' });
    if (orientation && orientation !== 'square') params.set('orientation', orientation);
    const res = await fetch(`https://pixabay.com/api/?${params}`);
    if (!res.ok) return { success: false, error: `Pixabay: ${res.status}` };
    const data = (await res.json()) as any;
    return {
      success: true,
      output: {
        query, provider: 'pixabay', totalResults: data.totalHits || 0,
        images: (data.hits || []).map((h: any) => ({
          id: String(h.id), provider: 'pixabay', url: h.largeImageURL || h.webformatURL,
          thumbnailUrl: h.previewURL, width: h.imageWidth, height: h.imageHeight,
          photographer: h.user, description: h.tags || '',
          attribution: `Image by ${h.user} on Pixabay`,
        })),
      },
    };
  }
}
