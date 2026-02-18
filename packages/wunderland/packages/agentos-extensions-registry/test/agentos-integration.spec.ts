/**
 * End-to-end-ish integration: curated manifest -> AgentOS ExtensionManager.
 *
 * This ensures manifest-builder threads `options.secrets` so AgentOS can evaluate
 * `requiredSecrets` gating without relying on environment variables.
 */

import { describe, it, expect } from 'vitest';

import { createCuratedManifest } from '../src/index';
// Import AgentOS sources directly so tests validate the current workspace code,
// even when `@framers/agentos/dist` has not been rebuilt yet.
import { ExtensionManager } from '../../agentos/src/extensions/ExtensionManager.ts';
import { EXTENSION_KIND_TOOL } from '../../agentos/src/extensions/types.ts';

describe('AgentOS integration', () => {
  it('loads secret-gated tools when secrets are provided in the manifest', async () => {
    const prev = process.env.GIPHY_API_KEY;
    // Avoid env fallback masking failures.
    delete process.env.GIPHY_API_KEY;

    try {
      const manifest = await createCuratedManifest({
        channels: 'none',
        tools: ['giphy'],
        voice: 'none',
        productivity: 'none',
        secrets: { 'giphy.apiKey': 'test-giphy-key' },
      });

      const manager = new ExtensionManager({ manifest });
      await manager.loadManifest();

      const toolRegistry = manager.getRegistry<any>(EXTENSION_KIND_TOOL);
      expect(toolRegistry.getActive('giphy_search')).toBeDefined();
    } finally {
      if (prev === undefined) {
        delete process.env.GIPHY_API_KEY;
      } else {
        process.env.GIPHY_API_KEY = prev;
      }
    }
  });
});
