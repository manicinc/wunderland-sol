import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebSearchTool } from '../src/tools/webSearch';
import { SearchProviderService } from '../src/services/searchProvider';

// Mock the search provider service
vi.mock('../src/services/searchProvider');

describe('WebSearchTool', () => {
  let tool: WebSearchTool;
  let mockSearchService: vi.Mocked<SearchProviderService>;

  const ctx: any = {
    gmiId: 'test-gmi',
    personaId: 'test-persona',
    userContext: { userId: 'test-user' },
  };

  beforeEach(() => {
    mockSearchService = new SearchProviderService({}) as any;
    tool = new WebSearchTool(mockSearchService);
    vi.clearAllMocks();
  });
  
  describe('constructor', () => {
    it('should initialize with correct metadata', () => {
      expect(tool.id).toBe('web-search-v1');
      expect(tool.name).toBe('web_search');
      expect(tool.displayName).toBe('Web Search');
      expect(tool.description).toContain('Search the web');
    });
  });
  
  describe('execute', () => {
    it('should call search service with correct parameters', async () => {
      const mockResults = {
        provider: 'serper',
        results: [
          { title: 'Test', url: 'https://example.com', snippet: 'Test snippet' }
        ],
        metadata: { query: 'test query', timestamp: new Date().toISOString() }
      };
      
      mockSearchService.search = vi.fn().mockResolvedValue(mockResults);
      
      const input = {
        query: 'test query',
        maxResults: 5,
        provider: 'serper' as const
      };
      
      const result = await tool.execute(input, ctx);
      
      expect(mockSearchService.search).toHaveBeenCalledWith('test query', {
        maxResults: 5,
        provider: 'serper'
      });
      expect(result.success).toBe(true);
      expect(result.output).toEqual(mockResults);
    });
    
    it('should handle errors gracefully', async () => {
      const error = new Error('API error');
      mockSearchService.search = vi.fn().mockRejectedValue(error);
      
      const input = { query: 'test query' };
      const result = await tool.execute(input as any, ctx);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
    });
    
    it('should use default values when not provided', async () => {
      mockSearchService.search = vi.fn().mockResolvedValue({
        provider: 'duckduckgo',
        results: [],
        metadata: {}
      });
      
      const input = { query: 'test query' };
      await tool.execute(input as any, ctx);
      
      expect(mockSearchService.search).toHaveBeenCalledWith('test query', {
        maxResults: 10,
        provider: undefined
      });
    });
  });
  
  describe('validateArgs', () => {
    it('should validate required query parameter', () => {
      const result = tool.validateArgs({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Query is required');
    });
    
    it('should validate query is a string', () => {
      const result = tool.validateArgs({ query: 123 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Query must be a string');
    });
    
    it('should validate maxResults is a positive number', () => {
      const result = tool.validateArgs({ query: 'test', maxResults: -1 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('maxResults must be a positive number');
    });
    
    it('should validate provider is from allowed list', () => {
      const result = tool.validateArgs({ query: 'test', provider: 'invalid' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid provider');
    });
    
    it('should pass validation with correct inputs', () => {
      const result = tool.validateArgs({ 
        query: 'test query',
        maxResults: 5,
        provider: 'serper'
      });
      expect(result.isValid).toBe(true);
    });
  });
  
  describe('inputSchema', () => {
    it('should return proper JSON schema', () => {
      const schema = tool.inputSchema;
      expect(schema.type).toBe('object');
      expect(schema.required).toEqual(['query']);
      expect(schema.properties.query.type).toBe('string');
      expect(schema.properties.maxResults.type).toBe('integer');
      expect(schema.properties.provider.enum).toContain('serper');
    });
  });
});
