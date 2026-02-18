/* eslint-disable no-undef */
// @ts-check

// Import the TypeDoc-generated sidebar (exists after first build)
let typedocSidebar = [];
try {
  typedocSidebar = require('./docs/api/typedoc-sidebar.cjs');
} catch {
  // First build — TypeDoc hasn't run yet, API sidebar will be empty
}

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  guideSidebar: [
    'index',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/documentation-index',
        'getting-started/ecosystem',
        'getting-started/releasing',
        'getting-started/changelog',
      ],
    },
    {
      type: 'category',
      label: 'Architecture & Core',
      collapsed: false,
      items: [
        'architecture/system-architecture',
        'architecture/platform-support',
        'architecture/observability',
        'architecture/logging',
        'architecture/tool-calling-and-loading',
        'architecture/emergent-agency-system',
        'architecture/backend-api',
        'architecture/multi-gmi-implementation-plan',
      ],
    },
    {
      type: 'category',
      label: 'Features',
      collapsed: false,
      items: [
        {
          type: 'category',
          label: 'Planning & Orchestration',
          collapsed: false,
          items: [
            'features/planning-engine',
            'features/human-in-the-loop',
            'features/agent-communication',
            'features/guardrails',
            'features/safety-primitives',
          ],
        },
        {
          type: 'category',
          label: 'Memory & Storage',
          collapsed: false,
          items: [
            'features/rag-memory',
            'features/multimodal-rag',
            'features/sql-storage',
            'features/client-side-storage',
            'features/platform-strategy',
            'features/immutable-agents',
            'features/provenance-immutability',
          ],
        },
        {
          type: 'category',
          label: 'AI & LLM',
          collapsed: false,
          items: [
            'features/structured-output',
            'features/evaluation-framework',
            'features/cost-optimization',
          ],
        },
        {
          type: 'category',
          label: 'Advanced',
          collapsed: false,
          items: ['features/recursive-self-building', 'features/agency-collaboration'],
        },
      ],
    },
    {
      type: 'category',
      label: 'Skills',
      collapsed: false,
      items: [
        'skills/overview',
        'skills/skill-format',
        'skills/skills-extension',
        'skills/agentos-skills',
        'skills/agentos-skills-registry',
      ],
    },
    {
      type: 'category',
      label: 'Extensions',
      collapsed: false,
      items: [
        {
          type: 'category',
          label: 'Getting Started',
          collapsed: false,
          items: [
            'extensions/overview',
            'extensions/how-extensions-work',
            'extensions/extension-architecture',
            'extensions/auto-loading',
          ],
        },
        {
          type: 'category',
          label: 'Development',
          items: [
            'extensions/extension-standards',
            'extensions/contributing',
            'extensions/self-hosted-registries',
            'extensions/migration-guide',
            'extensions/releasing',
          ],
        },
        {
          type: 'category',
          label: 'Official Extensions',
          collapsed: false,
          items: [
            'extensions/built-in/auth',
            'extensions/built-in/web-search',
            'extensions/built-in/web-browser',
            'extensions/built-in/news-search',
            'extensions/built-in/giphy',
            'extensions/built-in/image-search',
            'extensions/built-in/voice-synthesis',
            'extensions/built-in/cli-executor',
            'extensions/built-in/telegram',
            'extensions/built-in/telegram-bot',
            'extensions/built-in/channel-telegram',
            'extensions/built-in/channel-whatsapp',
            'extensions/built-in/channel-discord',
            'extensions/built-in/channel-slack',
            'extensions/built-in/channel-webchat',
            'extensions/built-in/anchor-providers',
            'extensions/built-in/tip-ingestion',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      link: {
        type: 'doc',
        id: 'api/index',
      },
      items: typedocSidebar,
    },
  ],
};

module.exports = sidebars;
