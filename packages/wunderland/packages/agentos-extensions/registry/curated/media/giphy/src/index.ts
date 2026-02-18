/**
 * Giphy Extension Pack — provides GIF search capabilities for agents.
 */

import { GiphySearchTool } from './tools/giphySearch.js';

export interface GiphyExtensionOptions {
  giphyApiKey?: string;
  priority?: number;
}

export function createExtensionPack(context: any) {
  const options = (context.options || {}) as GiphyExtensionOptions;
  const apiKey = options.giphyApiKey || context.getSecret?.('giphy.apiKey') || process.env.GIPHY_API_KEY;
  const tool = new GiphySearchTool(apiKey);

  return {
    name: '@framers/agentos-ext-giphy',
    version: '1.0.0',
    descriptors: [
      {
        // IMPORTANT: ToolExecutor uses descriptor id as the lookup key for tool calls.
        // Keep it aligned with `tool.name`.
        id: tool.name,
        kind: 'tool' as const,
        priority: options.priority || 50,
        payload: tool,
        requiredSecrets: [{ id: 'giphy.apiKey' }],
      },
    ],
    onActivate: async () => context.logger?.info('Giphy Extension activated'),
    onDeactivate: async () => context.logger?.info('Giphy Extension deactivated'),
  };
}

export { GiphySearchTool };
export type { GiphySearchInput, GiphySearchOutput, GiphyGif } from './tools/giphySearch.js';
export default createExtensionPack;
