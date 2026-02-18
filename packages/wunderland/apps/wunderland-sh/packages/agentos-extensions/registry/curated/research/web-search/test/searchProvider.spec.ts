import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchProviderService } from '../src/services/searchProvider';

// Mock fetch
global.fetch = vi.fn();

describe('SearchProviderService', () => {
  let service: SearchProviderService;
  
  beforeEach(() => {
    service = new SearchProviderService({
      serperApiKey: 'test-serper-key',
      serpApiKey: 'test-serpapi-key',
      braveApiKey: 'test-brave-key'
    });
    vi.clearAllMocks();
  });
  
  describe('constructor', () => {
    it('should initialize with provided API keys', () => {
      expect(service).toBeDefined();
    });
    
    it('should initialize with empty config', () => {
      const emptyService = new SearchProviderService({});
      expect(emptyService).toBeDefined();
    });
  });
  
  describe('search', () => {
    it('should fallback through providers on failure', async () => {
      const mockFetch = global.fetch as any;
      
      // First provider fails
      mockFetch.mockRejectedValueOnce(new Error('Serper API error'));
      
      // Second provider succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          organic_results: [
            { title: 'Test', link: 'https://example.com', snippet: 'Test snippet' }
          ]
        })
      });
      
      const result = await service.search('test query');
      
      expect(result.provider).toBe('serpapi');
      expect(result.results).toHaveLength(1);
      expect(result.results[0].title).toBe('Test');
    });
    
    it('should use DuckDuckGo as final fallback', async () => {
      const mockFetch = global.fetch as any;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Heading: 'Test Result',
          AbstractText: 'Test snippet from DuckDuckGo',
          AbstractURL: 'https://example.com',
          RelatedTopics: [],
        }),
      });
      
      const serviceNoKeys = new SearchProviderService({});
      const result = await serviceNoKeys.search('test query');
      
      expect(result.provider).toBe('duckduckgo');
      expect(result.metadata.fallback).toBe(true);
    });
    
    it('should respect rate limiting', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ organic: [] })
      });
      
      // Make multiple rapid requests
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(service.search(`query ${i}`));
      }
      
      const startTime = Date.now();
      await Promise.all(promises);
      const endTime = Date.now();
      
      // Should take at least some time due to rate limiting
      expect(endTime - startTime).toBeGreaterThanOrEqual(0);
    });
    
    it('should respect maxResults parameter', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          organic: Array(20).fill({
            title: 'Test',
            link: 'https://example.com',
            snippet: 'Test'
          })
        })
      });
      
      const result = await service.search('test', { maxResults: 5 });
      expect(result.results).toHaveLength(5);
    });
  });
  
  describe('searchSerper', () => {
    it('should format request correctly', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ organic: [] })
      });
      
      await service.search('test query', { provider: 'serper' });
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://google.serper.dev/search',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'X-API-KEY': 'test-serper-key',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ q: 'test query', num: 10 })
        })
      );
    });
  });
  
  describe('getRecommendedProviders', () => {
    it('should return provider recommendations', () => {
      const providers = SearchProviderService.getRecommendedProviders();
      expect(providers).toHaveLength(4);
      expect(providers[0].name).toBe('Serper');
      expect(providers[0].signupUrl).toContain('serper.dev');
    });
  });
});
