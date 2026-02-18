/**
 * Example: curated manifest + requiredSecrets gating.
 *
 * Run:
 *   # In the monorepo workspace, make sure @framers/agentos is built:
 *   #   cd ../agentos && pnpm build
 *   cd packages/agentos-extensions-registry
 *   pnpm build
 *   node examples/curated-manifest-secrets.mjs
 */

import { ExtensionManager } from '@framers/agentos';
import { createCuratedManifest } from '@framers/agentos-extensions-registry';

async function loadTools(manifest) {
  const manager = new ExtensionManager({ manifest });
  await manager.loadManifest();
  const toolRegistry = manager.getRegistry('tool');
  return toolRegistry
    .listActive()
    .map((d) => d.id)
    .sort();
}

async function main() {
  const prev = process.env.GIPHY_API_KEY;
  delete process.env.GIPHY_API_KEY;

  try {
    const baseOptions = {
      channels: 'none',
      voice: 'none',
      productivity: 'none',
      tools: ['giphy'],
    };

    const missingSecret = await createCuratedManifest(baseOptions);
    const toolsMissing = await loadTools(missingSecret);

    console.log('Tools (missing giphy.apiKey):');
    console.log(toolsMissing.length ? `- ${toolsMissing.join('\n- ')}` : '(none)');
    console.log();

    const withSecret = await createCuratedManifest({
      ...baseOptions,
      secrets: { 'giphy.apiKey': 'demo-giphy-key' },
    });
    const toolsWith = await loadTools(withSecret);

    console.log('Tools (with giphy.apiKey provided via manifest):');
    console.log(toolsWith.length ? `- ${toolsWith.join('\n- ')}` : '(none)');
    console.log();

    console.log('Expected: giphy_search is only registered when the secret is present.');
  } finally {
    if (prev === undefined) delete process.env.GIPHY_API_KEY;
    else process.env.GIPHY_API_KEY = prev;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
