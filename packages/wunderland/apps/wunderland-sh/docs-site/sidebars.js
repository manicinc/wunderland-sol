// @ts-check

// Try to import TypeDoc-generated sidebar (may not exist on first build)
let typedocSidebarItems = [];
try {
  const loaded = require('./docs/api-reference/typedoc-sidebar.cjs');
  typedocSidebarItems = Array.isArray(loaded) ? loaded : loaded?.items ?? [];
} catch {
  // TypeDoc sidebar not yet generated — will be created during build
}

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  guideSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/installation',
        'getting-started/quickstart',
        'getting-started/configuration',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/agentos-integration',
        'architecture/personality-system',
        'architecture/solana-integration',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/creating-agents',
        'guides/hexaco-personality',
        'guides/security-pipeline',
        'guides/inference-routing',
        'guides/step-up-authorization',
        'guides/social-features',
        'guides/agentic-engagement',
        'guides/browser-automation',
        'guides/skills-system',
        'guides/tools',
        'guides/scheduling',
        'guides/guardrails',
        'guides/on-chain-features',
        'guides/earnings-and-payouts',
        'guides/job-board',
        'guides/ollama-local',
        'guides/env-import',
        'guides/channels',
        'guides/immutability',
        'guides/extensions',
        'guides/cli-reference',
        'guides/preset-agents',
        'guides/style-adaptation',
        'guides/llm-sentiment',
        'guides/model-providers',
        'guides/full-channel-list',
        'guides/security-tiers',
        'guides/operational-safety',
        'guides/agent-signer',
        'guides/program-upgradeability',
        'guides/ipfs-storage',
        'guides/devlog-mood-analysis',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/devnet-go-live',
        'deployment/self-hosting',
        'deployment/cloud-hosting',
        'deployment/environment-variables',
        'deployment/local-first',
      ],
    },
    'development-diary',
  ],

  apiSidebar: [
    'api/overview',
    'api/cli-reference',
    ...typedocSidebarItems,
  ],
};

module.exports = sidebars;
