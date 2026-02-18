import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'AgentOS',
  tagline: 'Modular orchestration runtime for adaptive AI systems',
  favicon: 'img/favicon.svg',
  url: 'https://docs.agentos.sh',
  baseUrl: '/',
  organizationName: 'framersai',
  projectName: 'agentos-live-docs',
  onBrokenLinks: 'warn',
  trailingSlash: false,

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    format: 'detect', // Allow CommonMark for TypeDoc-generated files (MDX v3 strict)
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],

  plugins: [
    [
      'docusaurus-plugin-typedoc',
      {
        entryPoints: ['../../packages/agentos/src/index.ts'],
        tsconfig: '../../packages/agentos/tsconfig.json',
        out: 'docs/api',
        // Avoid pulling in the package README (it contains links that don't
        // resolve inside Docusaurus and duplicates the Guides section).
        readme: 'none',
        sidebar: {
          autoConfiguration: true,
          pretty: true,
        },
        skipErrorChecking: true,
      },
    ],
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          // Old guide HTML pages -> new paths
          { from: '/docs/ARCHITECTURE', to: '/docs/architecture/system-architecture' },
          { from: '/docs/AGENT_COMMUNICATION', to: '/docs/features/agent-communication' },
          { from: '/docs/CLIENT_SIDE_STORAGE', to: '/docs/features/client-side-storage' },
          { from: '/docs/COST_OPTIMIZATION', to: '/docs/features/cost-optimization' },
          { from: '/docs/ECOSYSTEM', to: '/docs/getting-started/ecosystem' },
          { from: '/docs/EVALUATION_FRAMEWORK', to: '/docs/features/evaluation-framework' },
          { from: '/docs/GUARDRAILS_USAGE', to: '/docs/features/guardrails' },
          { from: '/docs/HUMAN_IN_THE_LOOP', to: '/docs/features/human-in-the-loop' },
          { from: '/docs/PLANNING_ENGINE', to: '/docs/features/planning-engine' },
          { from: '/docs/PLATFORM_SUPPORT', to: '/docs/architecture/platform-support' },
          { from: '/docs/RAG_MEMORY_CONFIGURATION', to: '/docs/features/rag-memory' },
          {
            from: '/docs/RECURSIVE_SELF_BUILDING_AGENTS',
            to: '/docs/features/recursive-self-building',
          },
          { from: '/docs/RELEASING', to: '/docs/getting-started/releasing' },
          { from: '/docs/RFC_EXTENSION_STANDARDS', to: '/docs/extensions/extension-standards' },
          { from: '/docs/SQL_STORAGE_QUICKSTART', to: '/docs/features/sql-storage' },
          { from: '/docs/STRUCTURED_OUTPUT', to: '/docs/features/structured-output' },
        ],
        createRedirects(existingPath: string) {
          // Redirect .html suffixed old paths
          if (existingPath.startsWith('/docs/')) {
            return [existingPath + '.html'];
          }
          return undefined;
        },
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/framersai/agentos/tree/master/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        gtag: {
          trackingID: 'G-4KEEK15KWZ',
          anonymizeIP: true,
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/og-image.png',
    navbar: {
      title: 'AgentOS',
      logo: {
        alt: 'AgentOS Logo',
        src: 'img/logo.svg',
        href: '/',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'guideSidebar',
          position: 'left',
          label: 'Guides',
        },
        {
          to: '/docs/api/',
          position: 'left',
          label: 'API Reference',
        },
        {
          href: 'https://agentos.sh',
          label: 'Website',
          position: 'right',
        },
        {
          href: 'https://www.npmjs.com/package/@framers/agentos',
          label: 'npm',
          position: 'right',
        },
        {
          href: 'https://github.com/framersai/agentos',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/docs/' },
            { label: 'Architecture', to: '/docs/architecture/system-architecture' },
            { label: 'Extensions', to: '/docs/extensions/overview' },
            { label: 'API Reference', to: '/docs/api/' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub', href: 'https://github.com/framersai/agentos' },
            { label: 'Discord', href: 'https://discord.gg/agentos' },
            { label: 'Twitter', href: 'https://twitter.com/framersai' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'Website', href: 'https://agentos.sh' },
            { label: 'npm', href: 'https://www.npmjs.com/package/@framers/agentos' },
            { label: 'Privacy Policy', href: 'https://agentos.sh/privacy' },
            { label: 'Terms of Service', href: 'https://agentos.sh/terms' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Frame.dev. All rights reserved.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'typescript'],
    },
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    mermaid: {
      theme: { light: 'neutral', dark: 'dark' },
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
