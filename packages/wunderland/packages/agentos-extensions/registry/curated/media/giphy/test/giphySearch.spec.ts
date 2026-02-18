import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocking
const { GiphySearchTool } = await import('../src/tools/giphySearch.js');
const { createExtensionPack } = await import('../src/index.js');

describe('GiphySearchTool', () => {
  let tool: InstanceType<typeof GiphySearchTool>;

  beforeEach(() => {
    vi.clearAllMocks();
    tool = new GiphySearchTool('test-api-key');
  });

  describe('metadata', () => {
    it('has correct id and name', () => {
      expect(tool.id).toBe('giphy-search-v1');
      expect(tool.name).toBe('giphy_search');
    });

    it('has valid input schema', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.required).toContain('query');
    });

    it('has no side effects', () => {
      expect(tool.hasSideEffects).toBe(false);
    });
  });

  describe('execute', () => {
    const mockContext = {} as any;

    it('returns error when API key is missing', async () => {
      const noKeyTool = new GiphySearchTool('');
      const result = await noKeyTool.execute({ query: 'cats' }, mockContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain('GIPHY_API_KEY');
    });

    it('searches GIFs successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{
            id: 'abc123', title: 'Funny cat', url: 'https://giphy.com/abc',
            embed_url: 'https://giphy.com/embed/abc',
            images: { original: { url: 'https://media.giphy.com/abc.gif', width: '480', height: '360' }, fixed_width: { url: 'https://media.giphy.com/abc_w200.gif' } },
          }],
          pagination: { total_count: 100 },
        }),
      });

      const result = await tool.execute({ query: 'cats' }, mockContext);
      expect(result.success).toBe(true);
      expect(result.output!.results).toHaveLength(1);
      expect(result.output!.results[0].id).toBe('abc123');
      expect(result.output!.results[0].width).toBe(480);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('api.giphy.com/v1/gifs/search'));
    });

    it('passes sticker type parameter', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [], pagination: {} }) });
      await tool.execute({ query: 'thumbs up', type: 'stickers' }, mockContext);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/stickers/search'));
    });

    it('handles API errors', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });
      const result = await tool.execute({ query: 'cats' }, mockContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain('403');
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const result = await tool.execute({ query: 'cats' }, mockContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });
});

describe('createExtensionPack', () => {
  it('creates pack with correct metadata', () => {
    const pack = createExtensionPack({ options: { giphyApiKey: 'test' }, logger: { info: vi.fn() } });
    expect(pack.name).toBe('@framers/agentos-ext-giphy');
    expect(pack.descriptors).toHaveLength(1);
    expect(pack.descriptors[0].kind).toBe('tool');
  });
});
