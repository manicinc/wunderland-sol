/**
 * Image Search Extension Pack — stock photo search from Pexels, Unsplash, Pixabay.
 */

import { ImageSearchTool } from './tools/imageSearch.js';

export interface ImageSearchExtensionOptions {
  pexelsApiKey?: string;
  unsplashApiKey?: string;
  pixabayApiKey?: string;
  priority?: number;
}

export function createExtensionPack(context: any) {
  const options = (context.options || {}) as ImageSearchExtensionOptions;
  const tool = new ImageSearchTool({
    pexels: options.pexelsApiKey || context.getSecret?.('pexels.apiKey') || process.env.PEXELS_API_KEY,
    unsplash: options.unsplashApiKey || context.getSecret?.('unsplash.apiKey') || process.env.UNSPLASH_ACCESS_KEY,
    pixabay: options.pixabayApiKey || context.getSecret?.('pixabay.apiKey') || process.env.PIXABAY_API_KEY,
  });

  return {
    name: '@framers/agentos-ext-image-search',
    version: '1.0.0',
    descriptors: [
      // Keep descriptor id aligned with `tool.name` so ToolExecutor can find it.
      { id: tool.name, kind: 'tool' as const, priority: options.priority || 50, payload: tool },
    ],
    onActivate: async () => context.logger?.info('Image Search Extension activated'),
    onDeactivate: async () => context.logger?.info('Image Search Extension deactivated'),
  };
}

export { ImageSearchTool };
export type { ImageSearchInput, ImageSearchOutput, SearchImage } from './tools/imageSearch.js';
export default createExtensionPack;
