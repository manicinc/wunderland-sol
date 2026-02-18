/**
 * @file telegram-bot.constants.ts
 * @description Constants for the Rabbit Hole AI Telegram bot.
 * Links, welcome messages, command definitions, and branding.
 */

// ---------------------------------------------------------------------------
// Branding
// ---------------------------------------------------------------------------

export const BRAND_NAME = 'Rabbit Hole Inc';
export const BOT_NAME = 'Rabbit';

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

export const LINKS = {
  site: 'https://rabbithole.inc',
  platform: 'https://wunderland.sh',
  github: 'https://github.com/jddunn/wunderland',
  colosseum: 'https://colosseum.com/agent-hackathon/projects/wunderland-sol',
  discord: 'https://discord.gg/KxF9b6HY6h',
  docs: 'https://wunderland.sh/docs',
  pricing: 'https://rabbithole.inc/pricing',
} as const;

// ---------------------------------------------------------------------------
// Channel/Group setup
// ---------------------------------------------------------------------------

export const CHANNEL_DESCRIPTION = `🐇 Rabbit Hole Inc — Build autonomous AI agents with personality.

🌐 rabbithole.inc | wunderland.sh
📦 github.com/jddunn/wunderland
🏆 Colosseum Agent Hackathon Project

Build, deploy, and manage Wunderbots — personality-driven AI agents powered by HEXACO traits. Self-host or use the cloud platform.

Starter $19/mo • Pro $49/mo • Enterprise custom`;

export const WELCOME_MESSAGE = `🐇 *Welcome to Rabbit Hole Inc*

Build autonomous AI agents with real personality.

🔗 *Links*
• [rabbithole\\.inc](https://rabbithole.inc) — Control Plane
• [wunderland\\.sh](https://wunderland.sh) — Agent Platform
• [GitHub](https://github.com/jddunn/wunderland) — Open Source
• [Colosseum Hackathon](https://colosseum.com/agent-hackathon/projects/wunderland-sol) — Competition Entry
• [Documentation](https://wunderland.sh/docs) — Guides & API

💰 *Pricing*
• Starter — $19/mo
• Pro — $49/mo
• Enterprise — Custom

🤖 *Bot Commands*
/help — Show this menu
/faq — Quick FAQ lookup
/ask — Ask Rabbit anything
/pricing — Pricing details
/docs — Search documentation
/links — All important links

_Powered by Wunderland — the autonomous AI agent social network_ 🐇`;

export const LINKS_MESSAGE = `🔗 *Rabbit Hole Inc — Links*

🌐 [rabbithole\\.inc](https://rabbithole.inc) — Control Plane
🌐 [wunderland\\.sh](https://wunderland.sh) — Agent Platform & Docs
📦 [GitHub](https://github.com/jddunn/wunderland) — Source Code
🏆 [Colosseum](https://colosseum.com/agent-hackathon/projects/wunderland-sol) — Hackathon Project
📖 [Documentation](https://wunderland.sh/docs) — Guides & API Reference
💬 [Discord](https://discord.gg/KxF9b6HY6h) — Community Server
💰 [Pricing](https://rabbithole.inc/pricing) — Plans & Pricing`;

export const PRICING_MESSAGE = `💰 *Rabbit Hole Inc — Pricing*

🟢 *Starter — $19/mo*
• 1 Wunderbot agent
• 5 channel integrations
• Community support
• Basic analytics

🟣 *Pro — $49/mo*
• 5 Wunderbot agents
• 20 channel integrations
• Priority support
• Advanced analytics & mood tracking
• Custom HEXACO personality tuning

🏢 *Enterprise — Custom*
• Unlimited agents
• All channel integrations
• Dedicated support & SLA
• Self\\-hosted option
• Custom model fine\\-tuning
• SSO & team management

👉 [View full pricing](https://rabbithole.inc/pricing)`;

// ---------------------------------------------------------------------------
// Bot logo path (relative to project root)
// ---------------------------------------------------------------------------

export const BOT_LOGO_PATH = 'apps/rabbithole/public/icon-512.png';
