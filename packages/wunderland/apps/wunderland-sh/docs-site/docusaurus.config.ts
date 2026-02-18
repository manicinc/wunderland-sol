import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'WUNDERLAND Docs',
  tagline: 'Free open-source OpenClaw fork — secure npm CLI for autonomous AI agents with 5-tier prompt-injection defense, AgentOS integrations, HEXACO personalities, and Solana provenance',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.wunderland.sh',
  baseUrl: '/',

  organizationName: 'manicinc',
  projectName: 'wunderland-sol',

  onBrokenLinks: 'warn',
  trailingSlash: false,

  markdown: {
    format: 'detect',
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],

  clientModules: ['./src/theme-sync.js'],

  headTags: [
    {
      tagName: 'meta',
      attributes: { name: 'keywords', content: 'OpenClaw fork, OpenClaw alternative, secure OpenClaw, AI agents, npm CLI, agent security, prompt injection defense, HEXACO, AgentOS, Solana, autonomous agents, Wunderland, sandboxed agents' },
    },
  ],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    [
      'docusaurus-plugin-typedoc',
      {
        entryPoints: ['.source/wunderland/src/index.ts'],
        tsconfig: '.source/wunderland/tsconfig.json',
        out: 'docs/api-reference',
        sidebar: {
          autoConfiguration: true,
          pretty: true,
        },
        skipErrorChecking: true,
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.js',
          editUrl:
            'https://github.com/manicinc/wunderland-sol/tree/master/docs-site/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/wunderland-social-card.png',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'WUNDERLAND',
      logo: {
        alt: 'Wunderland Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'guideSidebar',
          position: 'left',
          label: 'Guides',
        },
        {
          type: 'docSidebar',
          sidebarId: 'apiSidebar',
          position: 'left',
          label: 'API Reference',
        },
        {
          href: 'https://wunderland.sh',
          label: 'App',
          position: 'right',
        },
        {
          href: 'https://www.npmjs.com/package/wunderland',
          label: 'npm',
          position: 'right',
        },
        {
          href: 'https://github.com/jddunn/wunderland',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {label: 'Getting Started', to: '/docs/'},
            {label: 'Architecture', to: '/docs/architecture/overview'},
            {label: 'Guides', to: '/docs/guides/creating-agents'},
            {label: 'API Reference', to: '/docs/api/overview'},
          ],
        },
        {
          title: 'Community',
          items: [
            {label: 'GitHub', href: 'https://github.com/jddunn/wunderland'},
            {label: 'Discord', href: 'https://discord.gg/KxF9b6HY6h'},
            {label: 'Twitter', href: 'https://twitter.com/wunderlandsh'},
          ],
        },
        {
          title: 'Related',
          items: [
            {label: 'Wunderland App', href: 'https://wunderland.sh'},
            {label: 'AgentOS', href: 'https://agentos.sh'},
            {label: 'AgentOS Docs', href: 'https://docs.agentos.sh'},
          ],
        },
      ],
      copyright: `Copyright \u00a9 ${new Date().getFullYear()} Wunderland. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['typescript', 'json', 'bash', 'solidity'],
    },
    mermaid: {
      theme: {light: 'neutral', dark: 'dark'},
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
