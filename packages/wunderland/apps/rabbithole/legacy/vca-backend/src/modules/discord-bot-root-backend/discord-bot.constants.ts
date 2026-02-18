/**
 * @file discord-bot.constants.ts
 * @description Static definitions for server structure: roles, categories, channels,
 * slash commands, and embed templates for the Rabbit Hole AI Discord bot.
 */

import {
  ApplicationCommandOptionType,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';

// ---------------------------------------------------------------------------
// Role definitions
// ---------------------------------------------------------------------------

export interface RoleDefinition {
  name: string;
  color: number;
  hoist: boolean;
  position: number;
}

export const ROLES: RoleDefinition[] = [
  { name: 'Founder',      color: 0xFFD700, hoist: true,  position: 9 },
  { name: 'Team',         color: 0x00FFFF, hoist: true,  position: 8 },
  { name: 'Enterprise',   color: 0x9945FF, hoist: true,  position: 7 },
  { name: 'Pro',          color: 0xFF00FF, hoist: true,  position: 6 },
  { name: 'Starter',      color: 0x00FF88, hoist: true,  position: 5 },
  { name: 'Open Source',  color: 0xCCCCCC, hoist: false, position: 4 },
  { name: 'Hackathon',    color: 0xFF6600, hoist: false, position: 3 },
  { name: 'Wunderbot',    color: 0x00BFFF, hoist: false, position: 2 },
  { name: 'Contributor',  color: 0x2DD4BF, hoist: false, position: 1 },
];

/**
 * Role hierarchy for tier gating: when a category is gated to a role,
 * all roles at this index or lower (higher privilege) can also see it.
 */
export const TIER_HIERARCHY = ['Founder', 'Team', 'Enterprise', 'Pro', 'Starter'] as const;

// ---------------------------------------------------------------------------
// Channel / Category definitions
// ---------------------------------------------------------------------------

export interface ChannelDefinition {
  name: string;
  type?: 'text' | 'voice';
  readOnly?: boolean;
  topic?: string;
}

export interface CategoryDefinition {
  name: string;
  roleGate?: string; // Role name that gates visibility (+ all higher roles)
  channels: ChannelDefinition[];
}

export const CATEGORIES: CategoryDefinition[] = [
  {
    name: '\u2728 WELCOME',
    channels: [
      { name: '\u{1F4DC}-rules-and-info', readOnly: true, topic: 'Server rules, links, and getting started' },
      { name: '\u{1F44B}-introductions', topic: 'Say hi! Tell us what you\'re building' },
      { name: '\u{1F4E2}-announcements', readOnly: true, topic: 'Product updates and launches' },
      { name: '\u{1F4CB}-changelog', readOnly: true, topic: 'Auto-posted release notes' },
    ],
  },
  {
    name: '\u{1F4AC} COMMUNITY',
    channels: [
      { name: '\u{1F4AC}-general', topic: 'Main chat \u2014 talk about anything' },
      { name: '\u{1F916}-show-your-agent', topic: 'Share screenshots and demos of your deployed Wunderbots' },
      { name: '\u{1F4A1}-ideas-and-feedback', topic: 'Feature requests and product feedback' },
      { name: '\u{1F3AD}-memes', topic: 'Off-topic fun' },
    ],
  },
  {
    name: '\u{1F3AB} SUPPORT',
    channels: [
      { name: '\u{1F3AB}-create-ticket', topic: 'Click the button below to create a support ticket' },
      { name: '\u2753-general-help', topic: 'Public Q&A for everyone' },
      { name: '\u{1F4DA}-faq', readOnly: true, topic: 'Frequently asked questions \u2014 use /faq to search' },
      { name: '\u2705-verify', readOnly: true, topic: 'Verify your email to get your subscription role' },
    ],
  },
  {
    name: '\u{1F331} STARTER',
    roleGate: 'Starter',
    channels: [
      { name: '\u{1F331}-starter-help', topic: 'Deployment help and Docker Compose issues' },
      { name: '\u{1F5A5}-self-hosting', topic: 'VPS setup, env config, Ollama tuning' },
    ],
  },
  {
    name: '\u26A1 PRO',
    roleGate: 'Pro',
    channels: [
      { name: '\u26A1-pro-help', topic: 'Priority support for Pro subscribers' },
      { name: '\u{1F517}-integrations', topic: 'Telegram/Slack/Discord/WebChat channel setup' },
      { name: '\u{1F4CA}-audit-logs', topic: 'Help with audit trails and agent sealing' },
    ],
  },
  {
    name: '\u{1F3E2} ENTERPRISE',
    roleGate: 'Enterprise',
    channels: [
      { name: '\u{1F3E2}-enterprise-support', topic: 'Dedicated enterprise support' },
      { name: '\u{1F512}-private-deployments', topic: 'On-prem, SSO/SAML, managed runtime' },
      { name: '\u{1F4B3}-sla-and-billing', topic: 'Account management and invoicing' },
    ],
  },
  {
    name: '\u2699 DEVELOPERS',
    channels: [
      { name: '\u2328-cli-and-tools', topic: 'wunderland CLI, npm package, skills, extensions' },
      { name: '\u{1F9E9}-extensions-dev', topic: 'Building custom tools, channels, and skills' },
      { name: '\u{1F41B}-bug-reports', topic: 'Structured bug reports' },
      { name: '\u{1F419}-github', topic: 'Auto-feed from GitHub \u2014 PRs, issues, releases' },
      { name: '\u{1F9EC}-agent-dev', topic: 'HEXACO tuning, personality config, inference routing' },
    ],
  },
  {
    name: '\u{1F407} WUNDERLAND',
    channels: [
      { name: '\u{1F4D6}-getting-started', readOnly: true, topic: 'Step-by-step guide to deploying your first Wunderbot' },
      { name: '\u{1F4E6}-npm-package', readOnly: true, topic: 'npm i -g wunderland \u2014 CLI docs and quick start' },
      { name: '\u{1F310}-links', readOnly: true, topic: 'GitHub, docs, app, and community links' },
      { name: '\u{1F6E0}-local-dev', readOnly: true, topic: 'How to run a Wunderland bot locally on your machine' },
      { name: '\u{1F9E0}-personality', topic: 'HEXACO personality tuning, presets, and archetypes' },
      { name: '\u{1F50C}-extensions', topic: 'Tools, channels, voice, and productivity extensions' },
    ],
  },
  {
    name: '\u25CE WUNDERLAND ON SOL',
    channels: [
      { name: '\u26D3-on-chain', topic: 'Solana devnet/mainnet, minting, provenance' },
      { name: '\u{1FA99}-wunder-token', topic: '$WUNDER airdrop info and tokenomics' },
      { name: '\u{1F5F3}-governance', topic: 'DAO proposals and voting' },
      { name: '\u{1F3C6}-leaderboard', topic: 'Agent reputation and top agents' },
    ],
  },
  {
    name: '\u{1F3A7} VOICE',
    channels: [
      { name: '\u{1F399} General',          type: 'voice' },
      { name: '\u{1F399} Office Hours',     type: 'voice' },
      { name: '\u{1F399} Pair Programming', type: 'voice' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Known channel names (used for lookups after setup)
// ---------------------------------------------------------------------------

export const KNOWN_CHANNELS = {
  RULES_AND_INFO: '\u{1F4DC}-rules-and-info',
  CREATE_TICKET: '\u{1F3AB}-create-ticket',
  FAQ: '\u{1F4DA}-faq',
  VERIFY: '\u2705-verify',
  GETTING_STARTED: '\u{1F4D6}-getting-started',
  NPM_PACKAGE: '\u{1F4E6}-npm-package',
  LINKS: '\u{1F310}-links',
  LOCAL_DEV: '\u{1F6E0}-local-dev',
} as const;

// ---------------------------------------------------------------------------
// Brand color (must be defined before embeds that reference it)
// ---------------------------------------------------------------------------

export const BRAND_COLOR = 0x8B6914; // Champagne gold (matches keyhole logo)

// ---------------------------------------------------------------------------
// Wunderland onboarding embeds (posted in read-only guide channels)
// ---------------------------------------------------------------------------

export const GETTING_STARTED_EMBED = {
  title: '\u{1F407} Getting Started with Wunderland',
  description: [
    '**Wunderland** is a self-hosted AI agent control plane. Build personality-driven Wunderbots and deploy them anywhere.',
    '',
    '**Quick Start (5 minutes)**',
    '```bash',
    'npm i -g wunderland',
    'wunderland init my-agent',
    'wunderland start',
    '```',
    '',
    '**Web Dashboard**',
    '1. Sign up at [rabbithole.inc](https://rabbithole.inc)',
    '2. Go to **Dashboard** \u2192 **Create Agent**',
    '3. Configure personality (HEXACO model), choose channels, add tools',
    '4. Add your LLM provider keys (OpenAI, Anthropic, or OpenRouter)',
    '5. Click **Export** to get a Docker Compose bundle',
    '6. `docker compose up -d` on your VPS',
    '',
    '**What you need:**',
    '\u2022 Node.js 18+ (for CLI) or Docker (for self-hosting)',
    '\u2022 At least one LLM API key (OpenAI, Anthropic, or OpenRouter)',
    '\u2022 A VPS or local machine to run your bot',
    '',
    '**Support:** Use `/faq` for AI answers, `/ticket create` for human help.',
  ].join('\n'),
  color: BRAND_COLOR,
};

export const NPM_PACKAGE_EMBED = {
  title: '\u{1F4E6} Wunderland CLI',
  description: [
    '```bash',
    'npm i -g wunderland',
    '```',
    '',
    '**Commands:**',
    '| Command | Description |',
    '|---------|-------------|',
    '| `wunderland init <name>` | Scaffold a new agent project |',
    '| `wunderland start` | Start agent in foreground |',
    '| `wunderland chat` | Interactive chat with your agent |',
    '| `wunderland seal` | Cryptographically seal agent config |',
    '| `wunderland export` | Export agent as portable manifest |',
    '| `wunderland import <file>` | Import an agent manifest |',
    '| `wunderland list-presets` | Browse 8 agent presets |',
    '| `wunderland skills` | List 18 curated agent skills |',
    '| `wunderland models` | Show available LLM providers |',
    '| `wunderland plugins` | List installed extensions |',
    '',
    '**Configuration:**',
    'Each agent has an `agent.config.json` with personality, channels, tools, and skills.',
    '',
    '**npm:** [npmjs.com/package/wunderland](https://www.npmjs.com/package/wunderland)',
    '**GitHub:** [github.com/manicagency/wunderland](https://github.com/manicagency)',
  ].join('\n'),
  color: BRAND_COLOR,
};

export const LINKS_EMBED = {
  title: '\u{1F310} Rabbit Hole Links',
  description: [
    '**Product**',
    '\u2022 [Rabbit Hole App](https://rabbithole.inc) \u2014 Agent dashboard & builder',
    '\u2022 [Wunderland Network](https://wunderland.sh) \u2014 AI social network',
    '\u2022 [Documentation](https://docs.wunderland.sh) \u2014 Full guides & API reference',
    '',
    '**Developer**',
    '\u2022 [GitHub](https://github.com/manicagency) \u2014 Source code & issues',
    '\u2022 [npm: wunderland](https://www.npmjs.com/package/wunderland) \u2014 CLI package',
    '\u2022 [npm: agentos](https://www.npmjs.com/package/agentos) \u2014 Core runtime',
    '',
    '**Community**',
    '\u2022 [Discord](https://discord.gg/KxF9b6HY6h) \u2014 You\'re here!',
    '\u2022 [Twitter/X](https://x.com/rabbitholeinc) \u2014 Updates & announcements',
    '',
    '**Contact**',
    '\u2022 Email: hi@rabbithole.inc',
    '\u2022 Enterprise: enterprise@rabbithole.inc',
  ].join('\n'),
  color: BRAND_COLOR,
};

export const LOCAL_DEV_EMBED = {
  title: '\u{1F6E0} Running a Wunderbot Locally',
  description: [
    '**Option 1: CLI (Recommended for development)**',
    '```bash',
    '# Install globally',
    'npm i -g wunderland',
    '',
    '# Create a new agent',
    'wunderland init my-agent',
    'cd my-agent',
    '',
    '# Add your LLM key to .env',
    'echo "OPENAI_API_KEY=sk-..." >> .env',
    '',
    '# Start the agent',
    'wunderland start',
    '```',
    '',
    '**Option 2: Docker Compose (Production-like)**',
    '```bash',
    '# Export from dashboard',
    '# rabbithole.inc \u2192 Dashboard \u2192 [Agent] \u2192 Export',
    '',
    '# Unzip and run',
    'unzip my-agent-bundle.zip && cd my-agent',
    'docker compose up -d',
    '```',
    '',
    '**Option 3: From Source**',
    '```bash',
    'git clone https://github.com/manicagency/wunderland',
    'cd wunderland && pnpm install',
    'cp .env.example .env  # Add your keys',
    'pnpm dev',
    '```',
    '',
    '**Environment Variables:**',
    '```env',
    'OPENAI_API_KEY=sk-...      # or ANTHROPIC_API_KEY',
    'OPENROUTER_API_KEY=sk-...  # Optional: 200+ model fallback',
    '```',
  ].join('\n'),
  color: BRAND_COLOR,
};

// ---------------------------------------------------------------------------
// Slash command definitions
// ---------------------------------------------------------------------------

export const SLASH_COMMANDS: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
  {
    name: 'setup',
    description: 'Set up the entire server (roles, channels, categories). Admin only.',
  },
  {
    name: 'faq',
    description: 'Ask a question — AI answers from our documentation.',
    options: [
      {
        name: 'question',
        description: 'Your question about Rabbit Hole / Wunderland',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  {
    name: 'help',
    description: 'Show the help menu with quick actions.',
  },
  {
    name: 'ticket',
    description: 'Create or check support tickets.',
    options: [
      {
        name: 'create',
        description: 'Create a new support ticket',
        type: ApplicationCommandOptionType.Subcommand,
      },
      {
        name: 'status',
        description: 'Check the status of a ticket',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'id',
            description: 'The ticket ID',
            type: ApplicationCommandOptionType.String,
            required: true,
          },
        ],
      },
    ],
  },
  {
    name: 'pricing',
    description: 'View Rabbit Hole pricing tiers.',
  },
  {
    name: 'docs',
    description: 'Search the documentation.',
    options: [
      {
        name: 'topic',
        description: 'The topic to search for',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  {
    name: 'ask',
    description: 'Ask Rabbit anything about the platform.',
    options: [
      {
        name: 'question',
        description: 'Your question',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  {
    name: 'verify',
    description: 'Verify your email to get your subscription role.',
    options: [
      {
        name: 'email',
        description: 'The email address on your Rabbit Hole account',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Embed templates
// ---------------------------------------------------------------------------

export const WELCOME_EMBED = {
  title: 'Welcome to Rabbit Hole Inc',
  description: [
    'The control plane for autonomous AI agents. Build secure, personality-driven Wunderbots and deploy them to your own VPS.',
    '',
    '**Quick Links**',
    '- [Rabbit Hole App](https://rabbithole.inc)',
    '- [Wunderland Network](https://wunderland.sh)',
    '- [Documentation](https://docs.wunderland.sh)',
    '- [GitHub](https://github.com/manicagency)',
    '',
    '**Server Rules**',
    '1. Be respectful — no harassment, discrimination, or toxicity',
    '2. No spam or self-promotion without permission',
    '3. Keep discussions on-topic in their respective channels',
    '4. No sharing of API keys, tokens, or sensitive credentials',
    '5. English is the primary language',
    '',
    '**Getting Help**',
    '- Use `/faq <question>` to search our docs with AI',
    '- Use `/ticket create` or click the button in #create-ticket',
    '- Browse #general-help for community answers',
    '',
    '**Support Tiers**',
    '- **Open Source** — Free self-hosting via `npm i -g wunderland`',
    '- **Starter** ($19/mo) — 1 agent + community support',
    '- **Pro** ($49/mo) — 5 agents + priority support',
    '- **Enterprise** — Unlimited agents + dedicated support + SLA',
  ].join('\n'),
  color: BRAND_COLOR,
};

export const TICKET_EMBED = {
  title: 'Need Help? Create a Support Ticket',
  description: [
    'Click the button below to open a support ticket. Our AI assistant will help you right away, and the team will follow up.',
    '',
    '**What to include:**',
    '- A clear subject line',
    '- Steps to reproduce (if a bug)',
    '- Your subscription tier',
    '- Relevant error messages or screenshots',
  ].join('\n'),
  color: BRAND_COLOR,
};

export const PRICING_EMBED = {
  title: 'Rabbit Hole Pricing',
  description: 'Self-hosted AI agent control plane. No per-message fees — you pay model providers directly.',
  color: BRAND_COLOR,
  fields: [
    {
      name: 'Starter — $19/mo',
      value: [
        '- 3-day free trial',
        '- 1 self-hosted agent',
        '- BYO LLM keys (OpenAI/Anthropic/OpenRouter)',
        '- Voice/text agent builder',
        '- Export Docker Compose bundles',
        '- Curated extensions + skills',
        '- Community support',
      ].join('\n'),
      inline: false,
    },
    {
      name: 'Pro — $49/mo  ⭐ Most Popular',
      value: [
        '- 3-day free trial',
        '- Up to 5 self-hosted agents',
        '- BYO LLM keys + tool keys',
        '- Multi-channel (Telegram/Slack/Discord/WebChat)',
        '- Audit logs + immutable agent sealing',
        '- Priority support',
      ].join('\n'),
      inline: false,
    },
    {
      name: 'Enterprise — Custom',
      value: [
        '- Unlimited Wunderbots',
        '- Managed runtime (dedicated)',
        '- On-site / private deployment',
        '- SSO / SAML authentication',
        '- Dedicated account manager + SLA',
        '- Contact: hi@rabbithole.inc',
      ].join('\n'),
      inline: false,
    },
  ],
  footer: { text: 'Self-host free forever with `npm i -g wunderland` — rabbithole.inc/pricing' },
};

export const FAQ_EMBEDS = [
  {
    title: 'What is Rabbit Hole?',
    description: [
      'Rabbit Hole is a **self-hosted AI agent control plane**. You build personality-driven Wunderbots in the web app, then deploy them to your own VPS via Docker Compose.',
      '',
      'You bring your own LLM keys (OpenAI, Anthropic, OpenRouter, etc.) \u2014 no per-message fees from us.',
    ].join('\n'),
  },
  {
    title: 'How do I deploy an agent?',
    description: [
      '1. Create an agent in the [dashboard](https://rabbithole.inc/wunderland/dashboard)',
      '2. Configure personality (HEXACO), channels, tools, and skills',
      '3. Add your LLM provider credentials',
      '4. Click **Export** to get a Docker Compose bundle',
      '5. `docker compose up -d` on your VPS',
      '',
      'Or use the CLI: `npm i -g wunderland && wunderland start`',
    ].join('\n'),
  },
  {
    title: 'What channels does Wunderland support?',
    description: [
      '**Tier 0 (Stable):** Telegram, WhatsApp, Discord, Slack, WebChat',
      '**Tier 1:** Signal, iMessage, Google Chat, Microsoft Teams',
      '**Tier 2:** Matrix, Zalo, Email, SMS',
      '**Tier 3:** Nostr, Twitch, LINE, Feishu, Mattermost, Nextcloud Talk, Tlon',
    ].join('\n'),
  },
  {
    title: 'What LLM providers are supported?',
    description: [
      'OpenAI, Anthropic, Google Gemini, Mistral, Groq, Together AI, Fireworks, Perplexity, Cohere, DeepSeek, xAI, Ollama (local), and OpenRouter (200+ models).',
      '',
      'Configure via `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `OPENROUTER_API_KEY` env vars.',
    ].join('\n'),
  },
  {
    title: 'How do I get support?',
    description: [
      '\u2022 Use `/faq <question>` for instant AI-powered answers from our docs',
      '\u2022 Use `/ask <question>` for general questions',
      '\u2022 Use `/ticket create` or click the button in the ticket channel to create a support ticket',
      '\u2022 Post in the general-help channel for community answers',
      '',
      'Paid subscribers get access to tier-specific support channels.',
    ].join('\n'),
  },
  {
    title: 'What is Wunderland on Solana?',
    description: [
      'Wunderland is an on-chain social network where AI agents post autonomously, with cryptographic provenance proofs via InputManifest.',
      '',
      '\u2022 **$WUNDER token** \u2014 Governance + staking',
      '\u2022 **Agent NFTs** \u2014 On-chain agent identities',
      '\u2022 **Governance** \u2014 DAO proposals and voting',
      '\u2022 **Leaderboard** \u2014 Reputation-based agent ranking',
    ].join('\n'),
  },
  {
    title: 'How do I verify my subscription?',
    description: [
      'Use `/verify <email>` with the email on your Rabbit Hole account. The bot will look up your subscription and assign the matching role (Starter, Pro, or Enterprise).',
      '',
      'This gives you access to tier-gated support channels.',
    ].join('\n'),
  },
];

export const VERIFY_EMBED = {
  title: 'Verify Your Subscription',
  description: [
    'Link your Rabbit Hole account to get your subscription role and access tier-gated channels.',
    '',
    '**How to verify:**',
    '1. Type `/verify <your-email>` with the email on your Rabbit Hole account',
    '2. The bot will check your subscription status',
    '3. Your role (Starter/Pro/Enterprise) will be assigned automatically',
    '',
    'Don\u2019t have an account yet? Sign up at [rabbithole.inc](https://rabbithole.inc)',
  ].join('\n'),
  color: BRAND_COLOR,
};

// ---------------------------------------------------------------------------
// Modal / Button IDs
// ---------------------------------------------------------------------------

export const BUTTON_IDS = {
  TICKET_CREATE: 'rh_ticket_create',
  HELP_PRICING: 'rh_help_pricing',
  HELP_DOCS: 'rh_help_docs',
  HELP_TICKET: 'rh_help_ticket',
} as const;

export const MODAL_IDS = {
  TICKET_CREATE: 'rh_modal_ticket_create',
} as const;

export const MODAL_FIELD_IDS = {
  TICKET_SUBJECT: 'rh_ticket_subject',
  TICKET_CATEGORY: 'rh_ticket_category',
  TICKET_DESCRIPTION: 'rh_ticket_description',
} as const;

// ---------------------------------------------------------------------------
// Ticket categories for the modal (maps to SupportService categories)
// ---------------------------------------------------------------------------

export const TICKET_CATEGORIES = [
  { label: 'Bug Report', value: 'bug' },
  { label: 'Feature Request', value: 'feature' },
  { label: 'Billing', value: 'billing' },
  { label: 'Account', value: 'account' },
  { label: 'Integration Help', value: 'integration' },
  { label: 'General', value: 'general' },
] as const;
