/**
 * @file constants.ts
 * @description All constants, embeds, button/modal IDs, interfaces, and configuration
 * for the Discord bot.
 */

import { EmbedBuilder, type ColorResolvable } from 'discord.js';

// --- Brand ---

export const BRAND_COLOR: number = 0x8B6914;

// --- Interfaces ---

export interface RoleDefinition {
  name: string;
  color: ColorResolvable;
  hoist: boolean;
  reason?: string;
}

export interface ChannelDefinition {
  name: string;
  readonly?: boolean;
  voice?: boolean;
  roleGate?: string;
}

export interface CategoryDefinition {
  name: string;
  roleGate?: string;
  channels: ChannelDefinition[];
}

// --- Roles ---

export const ROLES: RoleDefinition[] = [
  { name: 'Founder', color: '#FFD700', hoist: true, reason: 'Rabbit Hole AI server setup' },
  { name: 'Team', color: '#00CED1', hoist: true, reason: 'Rabbit Hole AI server setup' },
  { name: 'Enterprise', color: '#9B59B6', hoist: false, reason: 'Rabbit Hole AI server setup' },
  { name: 'Pro', color: '#E91E8A', hoist: false, reason: 'Rabbit Hole AI server setup' },
  { name: 'Starter', color: '#2ECC71', hoist: false, reason: 'Rabbit Hole AI server setup' },
  { name: 'Open Source', color: '#95A5A6', hoist: false, reason: 'Rabbit Hole AI server setup' },
  { name: 'Hackathon', color: '#E67E22', hoist: false, reason: 'Rabbit Hole AI server setup' },
  { name: 'Wunderbot', color: '#3498DB', hoist: false, reason: 'Rabbit Hole AI server setup' },
  { name: 'Contributor', color: '#1ABC9C', hoist: false, reason: 'Rabbit Hole AI server setup' },
];

export const TIER_HIERARCHY = ['Founder', 'Team', 'Enterprise', 'Pro', 'Starter'] as const;

// --- Categories & Channels ---

export const CATEGORIES: CategoryDefinition[] = [
  {
    name: '\uD83D\uDC4B WELCOME',
    channels: [
      { name: '\uD83D\uDCDC-rules-and-info', readonly: true },
      { name: '\uD83C\uDF9F\uFE0F-create-ticket' },
      { name: '\u2705-verify' },
    ],
  },
  {
    name: '\uD83D\uDCAC COMMUNITY',
    channels: [
      { name: '\uD83D\uDCAC-general' },
      { name: '\uD83D\uDD17-links', readonly: true },
      { name: '\uD83C\uDFA8-show-and-tell' },
      { name: '\uD83E\uDD1D-introductions' },
    ],
  },
  {
    name: '\uD83D\uDEE0\uFE0F SUPPORT',
    channels: [
      { name: '\uD83D\uDCCB-faq', readonly: true },
      { name: '\uD83D\uDCA1-feature-requests' },
    ],
  },
  {
    name: '\uD83D\uDFE2 STARTER SUPPORT',
    roleGate: 'Starter',
    channels: [
      { name: '\uD83D\uDFE2-starter-help' },
      { name: '\uD83D\uDFE2-starter-guides', readonly: true },
    ],
  },
  {
    name: '\uD83D\uDFE3 PRO SUPPORT',
    roleGate: 'Pro',
    channels: [
      { name: '\uD83D\uDFE3-pro-help' },
      { name: '\uD83D\uDFE3-pro-guides', readonly: true },
    ],
  },
  {
    name: '\uD83C\uDFE2 ENTERPRISE SUPPORT',
    roleGate: 'Enterprise',
    channels: [
      { name: '\uD83C\uDFE2-enterprise-help' },
      { name: '\uD83C\uDFE2-enterprise-dedicated' },
    ],
  },
  {
    name: '\uD83D\uDC68\u200D\uD83D\uDCBB DEVELOPERS',
    channels: [
      { name: '\uD83D\uDCE6-npm-package', readonly: true },
      { name: '\uD83D\uDC1B-bug-reports' },
      { name: '\uD83D\uDCBB-local-dev' },
      { name: '\uD83E\uDD16-agent-development' },
    ],
  },
  {
    name: '\uD83C\uDF10 WUNDERLAND ON SOL',
    channels: [
      { name: '\uD83E\uDE99-token-chat' },
      { name: '\uD83D\uDDF3\uFE0F-governance' },
      { name: '\uD83D\uDCF0-news-and-updates', readonly: true },
    ],
  },
  {
    name: '\uD83C\uDF99\uFE0F VOICE',
    channels: [
      { name: '\uD83C\uDF99\uFE0F-voice-chat', voice: true },
      { name: '\uD83C\uDF99\uFE0F-voice-chat-2', voice: true },
    ],
  },
  {
    name: '\uD83D\uDCE3 ANNOUNCEMENTS',
    channels: [
      { name: '\uD83D\uDCE2-announcements', readonly: true },
      { name: '\uD83D\uDCDD-changelog', readonly: true },
      { name: '\uD83C\uDFC6-hackathon' },
    ],
  },
];

// --- Known channel names -> lookup mapping ---

export const KNOWN_CHANNELS: Record<string, string> = {
  rules: '\uD83D\uDCDC-rules-and-info',
  createTicket: '\uD83C\uDF9F\uFE0F-create-ticket',
  verify: '\u2705-verify',
  general: '\uD83D\uDCAC-general',
  links: '\uD83D\uDD17-links',
  showAndTell: '\uD83C\uDFA8-show-and-tell',
  introductions: '\uD83E\uDD1D-introductions',
  faq: '\uD83D\uDCCB-faq',
  featureRequests: '\uD83D\uDCA1-feature-requests',
  starterHelp: '\uD83D\uDFE2-starter-help',
  starterGuides: '\uD83D\uDFE2-starter-guides',
  proHelp: '\uD83D\uDFE3-pro-help',
  proGuides: '\uD83D\uDFE3-pro-guides',
  enterpriseHelp: '\uD83C\uDFE2-enterprise-help',
  enterpriseDedicated: '\uD83C\uDFE2-enterprise-dedicated',
  npmPackage: '\uD83D\uDCE6-npm-package',
  bugReports: '\uD83D\uDC1B-bug-reports',
  localDev: '\uD83D\uDCBB-local-dev',
  agentDevelopment: '\uD83E\uDD16-agent-development',
  tokenChat: '\uD83E\uDE99-token-chat',
  governance: '\uD83D\uDDF3\uFE0F-governance',
  newsAndUpdates: '\uD83D\uDCF0-news-and-updates',
  voiceChat: '\uD83C\uDF99\uFE0F-voice-chat',
  voiceChat2: '\uD83C\uDF99\uFE0F-voice-chat-2',
  announcements: '\uD83D\uDCE2-announcements',
  changelog: '\uD83D\uDCDD-changelog',
  hackathon: '\uD83C\uDFC6-hackathon',
};

// --- Slash Commands ---

export const SLASH_COMMANDS = [
  {
    name: 'setup',
    description: 'Set up the Rabbit Hole AI Discord server (Admin/Founder only)',
  },
  {
    name: 'faq',
    description: 'Search frequently asked questions',
    options: [
      { name: 'query', description: 'Your question', type: 3, required: true },
    ],
  },
  {
    name: 'help',
    description: 'Get help with Rabbit Hole AI',
  },
  {
    name: 'ticket',
    description: 'Create a support ticket',
  },
  {
    name: 'pricing',
    description: 'View Rabbit Hole AI pricing tiers',
  },
  {
    name: 'docs',
    description: 'Search the documentation',
    options: [
      { name: 'query', description: 'Search query', type: 3, required: true },
    ],
  },
  {
    name: 'ask',
    description: 'Ask the AI assistant a question',
    options: [
      { name: 'question', description: 'Your question', type: 3, required: true },
    ],
  },
  {
    name: 'verify',
    description: 'Verify your account to get your tier role',
    options: [
      { name: 'email', description: 'Your registered email address', type: 3, required: true },
    ],
  },
  {
    name: 'clear',
    description: 'Bulk delete recent messages in this channel (Admin only)',
    options: [
      { name: 'count', description: 'Number of messages to delete (1-100, default 50)', type: 4, required: false },
    ],
  },
];

// --- Silent Channels ---

export const SILENT_CHANNELS: Set<string> = new Set([
  'rules-and-info',
  'announcements',
  'changelog',
  'verify',
  'create-ticket',
  'faq',
  'starter-guides',
  'pro-guides',
  'npm-package',
  'links',
  'news-and-updates',
]);

// --- Button & Modal IDs ---

export const BUTTON_IDS = {
  TICKET_CREATE: 'ticket_create_button',
  HELP_PRICING: 'help_pricing',
  HELP_DOCS: 'help_docs',
  HELP_TICKET: 'help_ticket',
  HELP_FAQ: 'help_faq',
} as const;

export const MODAL_IDS = {
  TICKET_CREATE: 'ticket_create_modal',
} as const;

export const MODAL_FIELD_IDS = {
  TICKET_SUBJECT: 'ticket_subject',
  TICKET_CATEGORY: 'ticket_category',
  TICKET_DESCRIPTION: 'ticket_description',
  TICKET_PRIORITY: 'ticket_priority',
} as const;

// --- Embeds ---

export const WELCOME_EMBED = new EmbedBuilder()
  .setColor(BRAND_COLOR)
  .setTitle('Welcome to Rabbit Hole AI')
  .setDescription(
    'Welcome to the official Rabbit Hole AI community server!\n\n' +
    '**Getting Started:**\n' +
    '1. Read the rules in this channel\n' +
    '2. Verify your account with `/verify <email>` to unlock tier-specific channels\n' +
    '3. Say hello in #general\n\n' +
    '**Rules:**\n' +
    '- Be respectful and constructive\n' +
    '- No spam or self-promotion without permission\n' +
    '- Keep discussions in the appropriate channels\n' +
    '- No sharing of API keys or sensitive credentials\n' +
    '- Follow Discord ToS at all times'
  )
  .setFooter({ text: 'Rabbit Hole AI' })
  .setTimestamp();

export const TICKET_EMBED = new EmbedBuilder()
  .setColor(BRAND_COLOR)
  .setTitle('Create a Support Ticket')
  .setDescription(
    'Need help? Click the button below to create a support ticket.\n\n' +
    'A member of the team will get back to you as soon as possible.\n' +
    'You can also use the `/ticket` command from any channel.'
  );

export const VERIFY_EMBED = new EmbedBuilder()
  .setColor(BRAND_COLOR)
  .setTitle('Verify Your Account')
  .setDescription(
    'Link your Rabbit Hole AI account to unlock tier-specific channels.\n\n' +
    '**How to verify:**\n' +
    'Use the `/verify <email>` command with the email address you registered with.\n\n' +
    'Once verified, you\'ll automatically receive the appropriate role ' +
    '(Starter, Pro, or Enterprise) based on your subscription tier.'
  );

export const FAQ_EMBEDS = [
  new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle('Frequently Asked Questions')
    .setDescription(
      '**What is Rabbit Hole AI?**\n' +
      'Rabbit Hole AI is an autonomous agent platform that lets you create, deploy, and manage AI agents.\n\n' +
      '**How do I get started?**\n' +
      'Install the CLI with `npm install -g wunderland` and run `wunderland init`.\n\n' +
      '**What LLM providers are supported?**\n' +
      'OpenAI, Anthropic, OpenRouter, and Ollama (local). Configure via environment variables.\n\n' +
      '**How do I deploy my agent?**\n' +
      'Use the dashboard at wunderland.sh or self-host with our Docker images.'
    ),
  new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle('FAQ - Channels & Features')
    .setDescription(
      '**What channels are available?**\n' +
      'We have community, support (tier-gated), developer, and voice channels.\n\n' +
      '**How do I report a bug?**\n' +
      'Use the #bug-reports channel or create a support ticket.\n\n' +
      '**Can I contribute?**\n' +
      'Yes! Check out the GitHub repo and our contributor guides in #local-dev.'
    ),
];

export const PRICING_TIERS = [
  { name: 'Starter', price: '$19/mo', features: '1 agent, community support, basic channels' },
  { name: 'Pro', price: '$49/mo', features: '5 agents, priority support, advanced analytics, custom channels' },
  { name: 'Enterprise', price: 'Custom', features: 'Unlimited agents, dedicated infrastructure, SLA, on-prem option' },
];

export const PRICING_EMBED = new EmbedBuilder()
  .setColor(BRAND_COLOR)
  .setTitle('Rabbit Hole AI - Pricing')
  .setDescription('Choose the plan that fits your needs.')
  .addFields(
    PRICING_TIERS.map((tier) => ({
      name: `${tier.name} - ${tier.price}`,
      value: tier.features,
      inline: false,
    }))
  )
  .setFooter({ text: 'Visit wunderland.sh/pricing for more details' });

export const ONBOARDING_EMBED = new EmbedBuilder()
  .setColor(BRAND_COLOR)
  .setTitle('Getting Started with Rabbit Hole AI')
  .setDescription(
    '**Quick Start Guide:**\n\n' +
    '1. **Install the CLI**\n' +
    '```bash\nnpm install -g wunderland\n```\n\n' +
    '2. **Initialize your agent**\n' +
    '```bash\nwunderland init\n```\n\n' +
    '3. **Configure your LLM provider**\n' +
    'Set `OPENAI_API_KEY` or `OPENROUTER_API_KEY` in your `.env` file\n\n' +
    '4. **Start chatting**\n' +
    '```bash\nwunderland chat\n```\n\n' +
    '5. **Deploy to the cloud**\n' +
    'Use the dashboard at [wunderland.sh](https://wunderland.sh)'
  );

export const GETTING_STARTED_EMBED = new EmbedBuilder()
  .setColor(BRAND_COLOR)
  .setTitle('New Here? Start Here!')
  .setDescription(
    'Welcome to the Rabbit Hole AI community!\n\n' +
    '- `/verify <email>` - Link your account for tier channels\n' +
    '- `/help` - See all available commands\n' +
    '- `/faq <question>` - Search the FAQ\n' +
    '- `/ticket` - Create a support ticket\n' +
    '- `/ask <question>` - Ask the AI assistant anything'
  );

export const NPM_PACKAGE_EMBED = new EmbedBuilder()
  .setColor(BRAND_COLOR)
  .setTitle('NPM Package - wunderland')
  .setDescription(
    '**Installation**\n' +
    '```bash\nnpm install -g wunderland\n```\n\n' +
    '**Key Commands:**\n' +
    '- `wunderland init` - Create a new agent\n' +
    '- `wunderland start` - Start your agent\n' +
    '- `wunderland chat` - Interactive chat mode\n' +
    '- `wunderland seal` - Seal an agent configuration\n' +
    '- `wunderland export` - Export agent manifest\n' +
    '- `wunderland skills` - List available skills\n' +
    '- `wunderland models` - List supported models\n\n' +
    '**Documentation:** [wunderland.sh/docs](https://wunderland.sh/docs)'
  );

export const LINKS_EMBED = new EmbedBuilder()
  .setColor(BRAND_COLOR)
  .setTitle('Useful Links')
  .setDescription(
    '- [Rabbit Hole](https://rabbithole.inc)\n' +
    '- [Wunderland](https://wunderland.sh)\n' +
    '- [Documentation](https://wunderland.sh/docs)\n' +
    '- [GitHub (CLI)](https://github.com/jddunn/wunderland)\n' +
    '- [GitHub (Solana)](https://github.com/manicinc/wunderland-sol)\n' +
    '- [NPM](https://www.npmjs.com/package/wunderland)\n' +
    '- [Dashboard](https://wunderland.sh/dashboard)\n' +
    '- [Pricing](https://wunderland.sh/pricing)'
  );

export const LOCAL_DEV_EMBED = new EmbedBuilder()
  .setColor(BRAND_COLOR)
  .setTitle('Local Development Guide')
  .setDescription(
    '**Prerequisites:**\n' +
    '- Node.js 20+\n' +
    '- pnpm 9+\n\n' +
    '**Setup:**\n' +
    '```bash\ngit clone https://github.com/jddunn/wunderland\ncd wunderland\npnpm install\ncp .env.example .env\n```\n\n' +
    '**Run the backend:**\n' +
    '```bash\ncd backend && npx tsx --tsconfig tsconfig.json src/main.ts\n```\n\n' +
    '**Run the docs site:**\n' +
    '```bash\ncd apps/wunderland-sh && pnpm dev\n```\n\n' +
    'See the full contribution guide in the repo README.'
  );
