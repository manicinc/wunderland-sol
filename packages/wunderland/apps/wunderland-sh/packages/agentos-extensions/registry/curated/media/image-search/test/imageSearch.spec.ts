import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const { ImageSearchTool } = await import('../src/tools/imageSearch.js');
const { createExtensionPack } = await import('../src/index.js');

describe('ImageSearchTool', () => {
  let tool: InstanceType<typeof ImageSearchTool>;

  beforeEach(() => {
    vi.clearAllMocks();
    tool = new ImageSearchTool({ pexels: 'pexels-key', unsplash: 'unsplash-key', pixabay: 'pixabay-key' });
  });

  describe('metadata', () => {
    it('has correct id and name', () => {
      expect(tool.id).toBe('image-search-v1');
      expect(tool.name).toBe('image_search');
    });

    it('has valid input schema', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.required).toContain('query');
    });
  });

  describe('execute', () => {
    const ctx = {} as any;

    it('returns error when no API keys configured', async () => {
      const noKeyTool = new ImageSearchTool({});
      const result = await noKeyTool.execute({ query: 'cats' }, ctx);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No image API keys');
    });

    it('auto-selects pexels when available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total_results: 50,
          photos: [{ id: 1, src: { large: 'https://pexels.com/1.jpg', medium: 'https://pexels.com/1_m.jpg' }, width: 1920, height: 1080, photographer: 'Test', alt: 'Cat' }],
        }),
      });

      const result = await tool.execute({ query: 'cats' }, ctx);
      expect(result.success).toBe(true);
      expect(result.output!.provider).toBe('pexels');
      expect(result.output!.images).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('api.pexels.com'), expect.any(Object));
    });

    it('uses specified provider', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total: 10, results: [{ id: 'u1', urls: { regular: 'https://unsplash.com/u1.jpg', small: 'https://unsplash.com/u1_s.jpg' }, width: 1920, height: 1080, user: { name: 'Photographer' }, description: 'A cat' }] }),
      });

      const result = await tool.execute({ query: 'cats', provider: 'unsplash' }, ctx);
      expect(result.success).toBe(true);
      expect(result.output!.provider).toBe('unsplash');
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('api.unsplash.com'), expect.any(Object));
    });

    it('searches pixabay with clamped per_page', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ totalHits: 20, hits: [{ id: 1, largeImageURL: 'https://pixabay.com/1.jpg', previewURL: 'https://pixabay.com/1_p.jpg', imageWidth: 800, imageHeight: 600, user: 'Test', tags: 'cat' }] }),
      });

      const result = await tool.execute({ query: 'cats', provider: 'pixabay', limit: 1 }, ctx);
      expect(result.success).toBe(true);
      expect(result.output!.provider).toBe('pixabay');
      // per_page should be clamped to minimum 3
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('per_page=3'));
    });

    it('handles API errors', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
      const result = await tool.execute({ query: 'cats', provider: 'pexels' }, ctx);
      expect(result.success).toBe(false);
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));
      const result = await tool.execute({ query: 'cats' }, ctx);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection refused');
    });
  });
});

describe('createExtensionPack', () => {
  it('creates pack with correct metadata', () => {
    const pack = createExtensionPack({ options: { pexelsApiKey: 'test' }, logger: { info: vi.fn() } });
    expect(pack.name).toBe('@framers/agentos-ext-image-search');
    expect(pack.descriptors).toHaveLength(1);
  });
});
