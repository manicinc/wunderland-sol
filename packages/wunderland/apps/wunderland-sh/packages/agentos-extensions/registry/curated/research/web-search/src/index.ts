/**
 * AgentOS Web Search Extension
 * 
 * Provides web search capabilities through multiple providers with automatic fallback.
 * 
 * @module @framers/agentos-ext-web-search
 * @version 1.1.0
 * @license MIT
 */

import type { ExtensionPackContext, ExtensionPack, ExtensionLifecycleContext } from '@framers/agentos';
import { WebSearchTool } from './tools/webSearch.js';
import { ResearchAggregatorTool } from './tools/researchAggregator.js';
import { FactCheckTool } from './tools/factCheck.js';
import { SearchProviderService } from './services/searchProvider.js';

/**
 * Extension configuration options
 */
export interface WebSearchExtensionOptions {
  /** Serper.dev API key */
  serperApiKey?: string;
  /** SerpAPI API key */
  serpApiKey?: string;
  /** Brave Search API key */
  braveApiKey?: string;
  /** Default maximum results for searches */
  defaultMaxResults?: number;
  /** Rate limiting configuration */
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  /** Extension priority in the stack */
  priority?: number;
}

/**
 * Creates the web search extension pack
 * 
 * @param {ExtensionPackContext} context - The extension context
 * @returns {ExtensionPack} The configured extension pack
 *
 * @example
 * ```typescript
 * import { createExtensionPack } from '@framers/agentos-ext-web-search';
 *
 * const pack = createExtensionPack({
 *   options: {
 *     serperApiKey: process.env.SERPER_API_KEY,
 *     defaultMaxResults: 10
 *   }
 * });
 * ```
 */
export function createExtensionPack(context: ExtensionPackContext): ExtensionPack {
  const options = (context.options ?? {}) as WebSearchExtensionOptions;

  const serperApiKey =
    options.serperApiKey || process.env.SERPER_API_KEY;
  const serpApiKey =
    options.serpApiKey || process.env.SERPAPI_API_KEY;
  const braveApiKey =
    options.braveApiKey || process.env.BRAVE_API_KEY;
  
  // Initialize search service with configuration
  const searchService = new SearchProviderService({
    serperApiKey,
    serpApiKey,
    braveApiKey,
    rateLimit: options.rateLimit
  });
  
  // Create tool instances
  const webSearchTool = new WebSearchTool(searchService);
  const researchAggregator = new ResearchAggregatorTool(searchService);
  const factCheckTool = new FactCheckTool(searchService);
  
  return {
    name: '@framers/agentos-ext-web-search',
    version: '1.1.0',
    descriptors: [
      {
        id: webSearchTool.name,
        kind: 'tool',
        priority: options.priority || 50,
        payload: webSearchTool,
        requiredSecrets: [
          { id: 'serper.apiKey', optional: true },
          { id: 'serpapi.apiKey', optional: true },
          { id: 'brave.apiKey', optional: true },
        ],
      },
      {
        id: researchAggregator.name,
        kind: 'tool',
        priority: options.priority || 50,
        payload: researchAggregator,
        requiredSecrets: [
          { id: 'serper.apiKey', optional: true },
          { id: 'serpapi.apiKey', optional: true },
          { id: 'brave.apiKey', optional: true },
        ],
      },
      {
        id: factCheckTool.name,
        kind: 'tool',
        priority: options.priority || 50,
        payload: factCheckTool,
        requiredSecrets: [
          { id: 'serper.apiKey', optional: true },
          { id: 'serpapi.apiKey', optional: true },
          { id: 'brave.apiKey', optional: true },
        ],
      }
    ],
    onActivate: async (lc: ExtensionLifecycleContext) => {
      lc.logger?.info('Web Search Extension activated');
    },
    onDeactivate: async (lc: ExtensionLifecycleContext) => {
      lc.logger?.info('Web Search Extension deactivated');
    }
  };
}

// Export types for consumers
export { WebSearchTool, ResearchAggregatorTool, FactCheckTool };
export { SearchProviderService, SearchResult, ProviderResponse } from './services/searchProvider.js';
export type { SearchProviderConfig } from './services/searchProvider.js';

// Default export for convenience
export default createExtensionPack;
