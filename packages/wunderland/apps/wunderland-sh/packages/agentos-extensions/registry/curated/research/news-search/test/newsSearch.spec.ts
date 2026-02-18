import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const { NewsSearchTool } = await import('../src/tools/newsSearch.js');
const { createExtensionPack } = await import('../src/index.js');

describe('NewsSearchTool', () => {
  let tool: InstanceType<typeof NewsSearchTool>;

  beforeEach(() => {
    vi.clearAllMocks();
    tool = new NewsSearchTool('test-api-key');
  });

  describe('metadata', () => {
    it('has correct id and name', () => {
      expect(tool.id).toBe('news-search-v1');
      expect(tool.name).toBe('news_search');
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
    const ctx = {} as any;

    it('returns error when API key is missing', async () => {
      const noKeyTool = new NewsSearchTool('');
      const result = await noKeyTool.execute({ query: 'tech' }, ctx);
      expect(result.success).toBe(false);
      expect(result.error).toContain('NEWSAPI_API_KEY');
    });

    it('searches news successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          totalResults: 100,
          articles: [{
            title: 'AI News', description: 'Latest AI developments', url: 'https://example.com/ai',
            source: { name: 'TechNews' }, publishedAt: '2026-02-06T00:00:00Z',
            urlToImage: 'https://example.com/img.jpg', author: 'John',
          }],
        }),
      });

      const result = await tool.execute({ query: 'artificial intelligence' }, ctx);
      expect(result.success).toBe(true);
      expect(result.output!.articles).toHaveLength(1);
      expect(result.output!.articles[0].title).toBe('AI News');
      expect(result.output!.articles[0].source).toBe('TechNews');
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('newsapi.org/v2/everything'));
    });

    it('passes sort and language parameters', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ totalResults: 0, articles: [] }) });
      await tool.execute({ query: 'tech', sortBy: 'popularity', language: 'de', pageSize: 10 }, ctx);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('sortBy=popularity');
      expect(url).toContain('language=de');
      expect(url).toContain('pageSize=10');
    });

    it('handles API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false, status: 429, statusText: 'Too Many Requests',
        json: async () => ({ message: 'Rate limit exceeded' }),
      });
      const result = await tool.execute({ query: 'tech' }, ctx);
      expect(result.success).toBe(false);
      expect(result.error).toContain('429');
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('DNS resolution failed'));
      const result = await tool.execute({ query: 'tech' }, ctx);
      expect(result.success).toBe(false);
      expect(result.error).toContain('DNS resolution failed');
    });
  });
});

describe('createExtensionPack', () => {
  it('creates pack with correct metadata', () => {
    const pack = createExtensionPack({ options: { newsApiKey: 'test' }, logger: { info: vi.fn() } });
    expect(pack.name).toBe('@framers/agentos-ext-news-search');
    expect(pack.descriptors).toHaveLength(1);
  });
});
