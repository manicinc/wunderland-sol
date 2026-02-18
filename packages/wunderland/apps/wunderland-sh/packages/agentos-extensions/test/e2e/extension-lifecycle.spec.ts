import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExtensionManager, ExtensionRegistry } from '@framers/agentos';
import { createExtensionPack as createWebSearchPack } from '../../curated/research/web-search/src';

describe('E2E: Extension Lifecycle', () => {
  let manager: ExtensionManager;
  let registry: ExtensionRegistry;
  
  beforeEach(async () => {
    // Initialize extension system
    registry = new ExtensionRegistry();
    manager = new ExtensionManager(registry);
  });
  
  afterEach(async () => {
    // Clean up
    await manager.deactivateAll();
  });
  
  describe('Extension Loading', () => {
    it('should load extension from manifest', async () => {
      const manifest = {
        packs: [
          {
            factory: () => createWebSearchPack({
              options: {},
              logger: console
            })
          }
        ]
      };
      
      await manager.loadFromManifest(manifest);
      
      const tools = registry.getDescriptorStack('tool');
      expect(tools.length).toBeGreaterThan(0);
    });
    
    it('should register multiple tools from single extension', async () => {
      const manifest = {
        packs: [
          {
            factory: () => createWebSearchPack({
              options: {},
              logger: console
            })
          }
        ]
      };
      
      await manager.loadFromManifest(manifest);
      
      const tools = registry.getDescriptorStack('tool');
      const webSearchTools = tools.filter(t => 
        ['webSearch', 'researchAggregator', 'factCheck'].includes(t.id)
      );
      
      expect(webSearchTools).toHaveLength(3);
    });
  });
  
  describe('Tool Execution', () => {
    it('should execute registered tools', async () => {
      const manifest = {
        packs: [
          {
            factory: () => createWebSearchPack({
              options: {},
              logger: console
            })
          }
        ]
      };
      
      await manager.loadFromManifest(manifest);
      
      const tools = registry.getDescriptorStack('tool');
      const webSearchTool = tools.find(t => t.id === 'webSearch');
      
      expect(webSearchTool).toBeDefined();
      
      if (webSearchTool && webSearchTool.payload) {
        const result = await webSearchTool.payload.execute({
          query: 'test query'
        });
        
        expect(result.success).toBe(true);
        expect(result.output).toBeDefined();
      }
    });
  });
  
  describe('Extension Priority', () => {
    it('should respect extension priority in stack', async () => {
      const highPriorityPack = createWebSearchPack({
        options: { priority: 100 },
        logger: console
      });
      
      const lowPriorityPack = createWebSearchPack({
        options: { priority: 10 },
        logger: console
      });
      
      // Modify IDs to distinguish
      highPriorityPack.descriptors[0].id = 'webSearch-high';
      lowPriorityPack.descriptors[0].id = 'webSearch-low';
      
      await manager.loadFromManifest({
        packs: [
          { factory: () => highPriorityPack },
          { factory: () => lowPriorityPack }
        ]
      });
      
      const tools = registry.getDescriptorStack('tool');
      const searchTools = tools.filter(t => t.id.startsWith('webSearch'));
      
      // Higher priority should come first in stack
      expect(searchTools[0].id).toBe('webSearch-high');
    });
  });
  
  describe('Extension Lifecycle Hooks', () => {
    it('should call onActivate when extension loads', async () => {
      let activateCalled = false;
      
      const packWithHooks = {
        ...createWebSearchPack({ options: {}, logger: console }),
        onActivate: async () => {
          activateCalled = true;
        }
      };
      
      await manager.loadFromManifest({
        packs: [{ factory: () => packWithHooks }]
      });
      
      expect(activateCalled).toBe(true);
    });
    
    it('should call onDeactivate when extension unloads', async () => {
      let deactivateCalled = false;
      
      const packWithHooks = {
        ...createWebSearchPack({ options: {}, logger: console }),
        onDeactivate: async () => {
          deactivateCalled = true;
        }
      };
      
      await manager.loadFromManifest({
        packs: [{ factory: () => packWithHooks }]
      });
      
      await manager.deactivateAll();
      
      expect(deactivateCalled).toBe(true);
    });
  });
  
  describe('Extension Configuration', () => {
    it('should pass configuration to extension', async () => {
      const config = {
        serperApiKey: 'test-key',
        maxResults: 5
      };
      
      const pack = createWebSearchPack({
        options: config,
        logger: console
      });
      
      await manager.loadFromManifest({
        packs: [{ factory: () => pack }]
      });
      
      const tools = registry.getDescriptorStack('tool');
      const webSearchTool = tools.find(t => t.id === 'webSearch');
      
      // Tool should use configuration
      const result = await webSearchTool?.payload.execute({
        query: 'test'
      });
      
      expect(result).toBeDefined();
    });
  });
  
  describe('Error Handling', () => {
    it('should handle extension load failures gracefully', async () => {
      const brokenFactory = () => {
        throw new Error('Extension failed to load');
      };
      
      const manifest = {
        packs: [
          { factory: brokenFactory },
          { factory: () => createWebSearchPack({ options: {}, logger: console }) }
        ]
      };
      
      // Should continue loading other extensions
      await manager.loadFromManifest(manifest);
      
      const tools = registry.getDescriptorStack('tool');
      // Should have loaded the working extension
      expect(tools.length).toBeGreaterThan(0);
    });
    
    it('should handle tool execution failures gracefully', async () => {
      const pack = createWebSearchPack({ options: {}, logger: console });
      
      // Inject a broken tool
      pack.descriptors.push({
        id: 'broken-tool',
        kind: 'tool',
        payload: {
          execute: async () => {
            throw new Error('Tool execution failed');
          }
        }
      });
      
      await manager.loadFromManifest({
        packs: [{ factory: () => pack }]
      });
      
      const tools = registry.getDescriptorStack('tool');
      const brokenTool = tools.find(t => t.id === 'broken-tool');
      
      try {
        await brokenTool?.payload.execute({});
      } catch (error: any) {
        expect(error.message).toBe('Tool execution failed');
      }
    });
  });
});
