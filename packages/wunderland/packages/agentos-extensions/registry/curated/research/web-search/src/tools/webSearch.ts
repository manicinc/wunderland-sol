/**
 * Web Search Tool — multi-provider search via SearchProviderService.
 *
 * Updated to conform to AgentOS `ITool` (inputSchema + ToolExecutionContext).
 *
 * @module @framers/agentos-ext-web-search
 */

import type { ITool, JSONSchemaObject, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { ProviderResponse } from '../services/searchProvider.js';
import { SearchProviderService } from '../services/searchProvider.js';

export interface WebSearchInput {
  query: string;
  maxResults?: number;
  provider?: 'serper' | 'serpapi' | 'brave' | 'duckduckgo';
}

export type WebSearchOutput = ProviderResponse;

export class WebSearchTool implements ITool<WebSearchInput, WebSearchOutput> {
  public readonly id = 'web-search-v1';
  /** Tool call name used by the LLM / ToolExecutor. */
  public readonly name = 'web_search';
  public readonly displayName = 'Web Search';
  public readonly description =
    'Search the web using multiple providers (Serper, SerpAPI, Brave, DuckDuckGo fallback). Returns titles, URLs, snippets, and metadata.';
  public readonly category = 'research';
  public readonly hasSideEffects = false;

  public readonly inputSchema: JSONSchemaObject = {
    type: 'object',
    required: ['query'],
    properties: {
      query: {
        type: 'string',
        description: 'The search query',
      },
      maxResults: {
        type: 'integer',
        description: 'Maximum number of results to return',
        default: 10,
        minimum: 1,
        maximum: 50,
      },
      provider: {
        type: 'string',
        description: 'Specific search provider to use',
        enum: ['serper', 'serpapi', 'brave', 'duckduckgo'],
      },
    },
    additionalProperties: false,
  };

  public readonly requiredCapabilities = ['capability:web_search'];

  constructor(private readonly searchService: SearchProviderService) {}

  async execute(input: WebSearchInput, _context: ToolExecutionContext): Promise<ToolExecutionResult<WebSearchOutput>> {
    try {
      const results = await this.searchService.search(input.query, {
        maxResults: input.maxResults || 10,
        provider: input.provider,
      });

      return { success: true, output: results };
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) };
    }
  }

  validateArgs(input: Record<string, any>): { isValid: boolean; errors?: any[] } {
    const errors: string[] = [];

    if (!input.query) {
      errors.push('Query is required');
    } else if (typeof input.query !== 'string') {
      errors.push('Query must be a string');
    }

    if (input.maxResults !== undefined) {
      if (typeof input.maxResults !== 'number' || input.maxResults <= 0) {
        errors.push('maxResults must be a positive number');
      }
    }

    if (input.provider !== undefined) {
      const validProviders = ['serper', 'serpapi', 'brave', 'duckduckgo'];
      if (!validProviders.includes(input.provider)) {
        errors.push('Invalid provider');
      }
    }

    return errors.length === 0 ? { isValid: true } : { isValid: false, errors };
  }
}
