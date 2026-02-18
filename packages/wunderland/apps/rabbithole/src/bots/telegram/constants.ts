/**
 * @file constants.ts
 * @description Links, welcome messages, branding, and configuration constants
 * for the Rabbit Hole Telegram bot.
 */

// --- Branding ---
export const BRAND_NAME = 'Rabbit Hole Inc';
export const BOT_NAME = 'Rabbit';

// --- Links ---
export const LINKS = {
  rabbithole: 'https://rabbithole.inc',
  wunderland: 'https://wunderland.sh',
  github: 'https://github.com/jddunn/wunderland',
  githubSol: 'https://github.com/manicinc/wunderland-sol',
  hackathon: 'https://colosseum.com/agent-hackathon/projects/wunderland-sol',
} as const;

// --- Channel Description (plain text, max 255 chars for Telegram) ---
export const CHANNEL_DESCRIPTION =
  `${BRAND_NAME} — 24/7 AI concierge. ` +
  `${LINKS.rabbithole} | ${LINKS.wunderland} | Starter $19/mo, Pro $49/mo, Enterprise custom.`;

// --- MarkdownV2 Messages ---
// NOTE: Telegram MarkdownV2 requires escaping: _ * [ ] ( ) ~ ` > # + - = | { } . !
// We pre-escape dots and dashes in static strings.

export const WELCOME_MESSAGE = `\
*Welcome to ${BRAND_NAME}* \uD83D\uDC07

Your 24/7 AI concierge\\.

*Links*
\\- [Rabbit Hole](${LINKS.rabbithole})
\\- [Wunderland CLI](${LINKS.wunderland})
\\- [GitHub \\(CLI\\)](${LINKS.github})
\\- [GitHub \\(Solana\\)](${LINKS.githubSol})
\\- [Colosseum Hackathon](${LINKS.hackathon})

*Pricing*
\\- *Starter* — \\$19/mo
\\- *Pro* — \\$49/mo
\\- *Enterprise* — custom

*Bot Commands*
/help \\- Show this message
/faq \\<question\\> \\- Ask a FAQ
/ask \\<question\\> \\- Ask anything
/pricing \\- View pricing tiers
/docs \\<topic\\> \\- Search documentation
/links \\- Show all links
/setup \\- Auto\\-setup channel \\(admin\\)
`;

export const LINKS_MESSAGE = `\
*${BRAND_NAME} Links*

\\- [Rabbit Hole](${LINKS.rabbithole}) \\- Main platform
\\- [Wunderland CLI](${LINKS.wunderland}) \\- Agent CLI tool
\\- [GitHub \\(CLI\\)](${LINKS.github}) \\- Source code
\\- [GitHub \\(Solana\\)](${LINKS.githubSol}) \\- Social network
\\- [Colosseum Hackathon](${LINKS.hackathon}) \\- Hackathon project
`;

export const PRICING_MESSAGE = `\
*${BRAND_NAME} Pricing*

*Starter* — \\$19/mo
Basic agent hosting, 1 agent, community support

*Pro* — \\$49/mo
5 agents, priority support, advanced analytics, custom channels

*Enterprise* — custom pricing
Unlimited agents, dedicated infrastructure, SLA, on\\-prem option

Visit [rabbithole\\.inc](${LINKS.rabbithole}) to get started\\.
`;

// --- Bot Logo ---
// In Next.js app, logo is in our own public/ directory
export const BOT_LOGO_PATH = 'public/icon-512.png';

// --- Rate Limiting / Proactive Engagement ---
export const CHAT_COOLDOWN_SECONDS = 120;
export const GLOBAL_COOLDOWN_SECONDS = 30;
export const MIN_MESSAGES_SINCE_BOT = 4;
export const GIF_PROBABILITY = 0.15;
