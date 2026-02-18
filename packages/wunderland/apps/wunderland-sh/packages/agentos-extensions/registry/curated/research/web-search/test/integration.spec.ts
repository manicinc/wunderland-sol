import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createExtensionPack } from '../src';
import { ExtensionContext } from '@framers/agentos';

describe('Web Search Extension Integration', () => {
  let extensionPack: any;
  let context: ExtensionContext;
  
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        Heading: 'Test',
        AbstractText: 'Test abstract',
        AbstractURL: 'https://example.com',
        RelatedTopics: [],
      }),
    }) as any;

    context = {
      options: {
        serperApiKey: process.env.SERPER_API_KEY,
        serpApiKey: process.env.SERPAPI_API_KEY,
        braveApiKey: process.env.BRAVE_API_KEY
      },
      logger: {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {}
      }
    } as any;
    
    extensionPack = createExtensionPack(context);
  });
  
  describe('Extension Pack Creation', () => {
    it('should create extension pack with correct metadata', () => {
      expect(extensionPack.name).toBe('@framers/agentos-ext-web-search');
      expect(extensionPack.version).toBe('1.1.0');
      expect(extensionPack.descriptors).toHaveLength(3);
    });
    
    it('should register all three tools', () => {
      const toolIds = extensionPack.descriptors.map((d: any) => d.id);
      expect(toolIds).toContain('web_search');
      expect(toolIds).toContain('research_aggregate');
      expect(toolIds).toContain('fact_check');
    });
    
    it('should set correct tool kinds', () => {
      extensionPack.descriptors.forEach((descriptor: any) => {
        expect(descriptor.kind).toBe('tool');
      });
    });
  });
  
  describe('Tool Execution', () => {
    it('should execute web search tool', async () => {
      const webSearchDescriptor = extensionPack.descriptors.find(
        (d: any) => d.id === 'web_search'
      );
      const webSearchTool = webSearchDescriptor.payload;
      
      // Test with DuckDuckGo (no API key required)
      const result = await webSearchTool.execute({
        query: 'AgentOS extensions'
      }, {
        gmiId: 'test-gmi',
        personaId: 'test-persona',
        userContext: { userId: 'test-user' },
      });
      
      expect(result.success).toBe(true);
      expect(result.output).toHaveProperty('provider');
      expect(result.output).toHaveProperty('results');
      expect(result.output).toHaveProperty('metadata');
    });
    
    it('should execute research aggregator tool', async () => {
      const aggregatorDescriptor = extensionPack.descriptors.find(
        (d: any) => d.id === 'research_aggregate'
      );
      const aggregatorTool = aggregatorDescriptor.payload;
      
      const result = await aggregatorTool.execute({
        topic: 'TypeScript testing',
        sources: 2
      }, {
        gmiId: 'test-gmi',
        personaId: 'test-persona',
        userContext: { userId: 'test-user' },
      });
      
      expect(result.success).toBe(true);
      expect(result.output).toHaveProperty('topic');
      expect(result.output).toHaveProperty('sources');
      expect(result.output).toHaveProperty('aggregatedResults');
    });
    
    it('should execute fact check tool', async () => {
      const factCheckDescriptor = extensionPack.descriptors.find(
        (d: any) => d.id === 'fact_check'
      );
      const factCheckTool = factCheckDescriptor.payload;
      
      const result = await factCheckTool.execute({
        statement: 'TypeScript was created by Microsoft',
        checkSources: true
      }, {
        gmiId: 'test-gmi',
        personaId: 'test-persona',
        userContext: { userId: 'test-user' },
      });
      
      expect(result.success).toBe(true);
      expect(result.output).toHaveProperty('statement');
      expect(result.output).toHaveProperty('verdict');
      expect(result.output).toHaveProperty('confidence');
      expect(result.output).toHaveProperty('sources');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle missing API keys gracefully', async () => {
      const noKeysContext = {
        options: {},
        logger: context.logger
      } as any;
      
      const pack = createExtensionPack(noKeysContext);
      const webSearch = pack.descriptors[0].payload;
      
      const result = await webSearch.execute({
        query: 'test query'
      }, {
        gmiId: 'test-gmi',
        personaId: 'test-persona',
        userContext: { userId: 'test-user' },
      });
      
      // Should fallback to DuckDuckGo
      expect(result.success).toBe(true);
      expect(result.output.provider).toBe('duckduckgo');
    });
    
    it('should validate inputs before execution', async () => {
      const webSearchDescriptor = extensionPack.descriptors.find(
        (d: any) => d.id === 'web_search'
      );
      const webSearchTool = webSearchDescriptor.payload;
      
      const validation = webSearchTool.validateArgs({
        // Missing required 'query' field
        maxResults: 5
      });
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Query is required');
    });
  });
  
  describe('Lifecycle Hooks', () => {
    it('should call onActivate when extension is activated', async () => {
      const logSpy = vi.fn();
      const lc = { logger: { info: logSpy, warn: vi.fn(), error: vi.fn(), debug: vi.fn() } };

      if (extensionPack.onActivate) {
        await extensionPack.onActivate(lc);
      }

      expect(logSpy).toHaveBeenCalledWith('Web Search Extension activated');
    });

    it('should call onDeactivate when extension is deactivated', async () => {
      const logSpy = vi.fn();
      const lc = { logger: { info: logSpy, warn: vi.fn(), error: vi.fn(), debug: vi.fn() } };

      if (extensionPack.onDeactivate) {
        await extensionPack.onDeactivate(lc);
      }

      expect(logSpy).toHaveBeenCalledWith('Web Search Extension deactivated');
    });
  });
});
