/**
 * @fileoverview Channel registry — metadata catalog for all supported
 * messaging channel extensions.
 *
 * Each entry defines the channel's metadata, secret requirements, and
 * default priority. The actual adapter implementations live in
 * `@framers/agentos-extensions/registry/curated/channels/<platform>/`.
 *
 * @module @framers/agentos-extensions-registry/channel-registry
 */

import type { ChannelRegistryEntry } from './types.js';

/**
 * Full catalog of messaging channel extensions.
 * Ordered by priority tier (P0 first, then P1, P2).
 */
export const CHANNEL_CATALOG: ChannelRegistryEntry[] = [
  // ── P0: Core Channels ──
  {
    packageName: '@framers/agentos-ext-channel-telegram',
    name: 'channel-telegram',
    category: 'channel',
    platform: 'telegram',
    displayName: 'Telegram',
    description: 'Telegram Bot API via grammY — supports text, images, inline keyboards, groups.',
    sdkPackage: 'grammy',
    requiredSecrets: ['telegram.botToken'],
    defaultPriority: 50,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-channel-whatsapp',
    name: 'channel-whatsapp',
    category: 'channel',
    platform: 'whatsapp',
    displayName: 'WhatsApp',
    description: 'WhatsApp Web bridge via Baileys — supports text, images, documents, voice notes.',
    sdkPackage: '@whiskeysockets/baileys',
    requiredSecrets: ['whatsapp.sessionData'],
    defaultPriority: 50,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-channel-discord',
    name: 'channel-discord',
    category: 'channel',
    platform: 'discord',
    displayName: 'Discord',
    description: 'Discord bot via discord.js — supports text, embeds, threads, reactions, buttons.',
    sdkPackage: 'discord.js',
    requiredSecrets: ['discord.botToken'],
    defaultPriority: 50,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-channel-slack',
    name: 'channel-slack',
    category: 'channel',
    platform: 'slack',
    displayName: 'Slack',
    description:
      'Slack workspace integration via Bolt — supports text, blocks, threads, reactions.',
    sdkPackage: '@slack/bolt',
    requiredSecrets: ['slack.botToken', 'slack.appToken'],
    defaultPriority: 50,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-channel-webchat',
    name: 'channel-webchat',
    category: 'channel',
    platform: 'webchat',
    displayName: 'WebChat',
    description: 'Browser-based chat widget via Socket.IO — embeds in any website.',
    sdkPackage: 'socket.io',
    requiredSecrets: [],
    defaultPriority: 50,
    available: false,
  },

  // ── P1: Extended Channels ──
  {
    packageName: '@framers/agentos-ext-channel-signal',
    name: 'channel-signal',
    category: 'channel',
    platform: 'signal',
    displayName: 'Signal',
    description: 'Signal messenger via signal-cli — end-to-end encrypted messaging.',
    sdkPackage: 'signal-cli',
    requiredSecrets: ['signal.phoneNumber'],
    defaultPriority: 40,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-channel-imessage',
    name: 'channel-imessage',
    category: 'channel',
    platform: 'imessage',
    displayName: 'iMessage',
    description: 'iMessage bridge via BlueBubbles — macOS server required.',
    sdkPackage: 'bluebubbles-node',
    requiredSecrets: ['imessage.serverUrl', 'imessage.password'],
    defaultPriority: 40,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-channel-google-chat',
    name: 'channel-google-chat',
    category: 'channel',
    platform: 'google-chat',
    displayName: 'Google Chat',
    description: 'Google Workspace Chat via Cloud API — supports cards and threads.',
    sdkPackage: '@google-cloud/chat',
    requiredSecrets: ['googlechat.serviceAccount'],
    defaultPriority: 40,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-channel-teams',
    name: 'channel-teams',
    category: 'channel',
    platform: 'teams',
    displayName: 'Microsoft Teams',
    description: 'Microsoft Teams bot via Teams AI library — supports adaptive cards.',
    sdkPackage: '@microsoft/teams-ai',
    requiredSecrets: ['teams.appId', 'teams.appPassword'],
    defaultPriority: 40,
    available: false,
  },

  // ── P2: Community Channels ──
  {
    packageName: '@framers/agentos-ext-channel-matrix',
    name: 'channel-matrix',
    category: 'channel',
    platform: 'matrix',
    displayName: 'Matrix',
    description: 'Matrix/Element via matrix-js-sdk — decentralized, federated messaging.',
    sdkPackage: 'matrix-js-sdk',
    requiredSecrets: ['matrix.homeserverUrl', 'matrix.accessToken'],
    defaultPriority: 30,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-channel-zalo',
    name: 'channel-zalo',
    category: 'channel',
    platform: 'zalo',
    displayName: 'Zalo',
    description: 'Zalo Official Account API — popular in Vietnam.',
    sdkPackage: 'zalo-api',
    requiredSecrets: ['zalo.appId', 'zalo.secretKey'],
    defaultPriority: 30,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-channel-email',
    name: 'channel-email',
    category: 'channel',
    platform: 'email',
    displayName: 'Email',
    description: 'Email messaging via nodemailer (SMTP) + imap-simple (IMAP).',
    sdkPackage: 'nodemailer',
    requiredSecrets: ['email.smtpHost', 'email.smtpUser', 'email.smtpPassword'],
    defaultPriority: 30,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-channel-sms',
    name: 'channel-sms',
    category: 'channel',
    platform: 'sms',
    displayName: 'SMS',
    description: 'SMS messaging via Twilio — text-only, worldwide reach.',
    sdkPackage: 'twilio',
    requiredSecrets: ['twilio.accountSid', 'twilio.authToken', 'twilio.phoneNumber'],
    defaultPriority: 30,
    available: false,
  },

  // ── P3: OpenClaw Parity Channels ──
  {
    packageName: '@framers/agentos-ext-channel-nostr',
    name: 'channel-nostr',
    category: 'channel',
    platform: 'nostr',
    displayName: 'Nostr',
    description:
      'Nostr relay messaging via nostr-tools — decentralized, censorship-resistant protocol.',
    sdkPackage: 'nostr-tools',
    requiredSecrets: ['nostr.privateKey'],
    defaultPriority: 20,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-channel-twitch',
    name: 'channel-twitch',
    category: 'channel',
    platform: 'twitch',
    displayName: 'Twitch',
    description: 'Twitch IRC chat via tmi.js — supports chat messages, commands, whispers.',
    sdkPackage: 'tmi.js',
    requiredSecrets: ['twitch.oauthToken', 'twitch.channel'],
    defaultPriority: 20,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-channel-line',
    name: 'channel-line',
    category: 'channel',
    platform: 'line',
    displayName: 'LINE',
    description: 'LINE Messaging API — supports text, images, flex messages, rich menus.',
    sdkPackage: '@line/bot-sdk',
    requiredSecrets: ['line.channelAccessToken', 'line.channelSecret'],
    defaultPriority: 20,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-channel-feishu',
    name: 'channel-feishu',
    category: 'channel',
    platform: 'feishu',
    displayName: 'Feishu / Lark',
    description: 'Feishu (Lark) bot via official SDK — supports text, cards, interactive messages.',
    sdkPackage: '@larksuiteoapi/node-sdk',
    requiredSecrets: ['feishu.appId', 'feishu.appSecret'],
    defaultPriority: 20,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-channel-mattermost',
    name: 'channel-mattermost',
    category: 'channel',
    platform: 'mattermost',
    displayName: 'Mattermost',
    description:
      'Mattermost self-hosted chat via official client — supports text, threads, reactions.',
    sdkPackage: '@mattermost/client',
    requiredSecrets: ['mattermost.url', 'mattermost.token'],
    defaultPriority: 20,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-channel-nextcloud',
    name: 'channel-nextcloud',
    category: 'channel',
    platform: 'nextcloud-talk',
    displayName: 'NextCloud Talk',
    description: 'NextCloud Talk bot API — self-hosted, privacy-focused team messaging.',
    sdkPackage: 'nextcloud-talk-bot',
    requiredSecrets: ['nextcloud.url', 'nextcloud.token'],
    defaultPriority: 20,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-channel-tlon',
    name: 'channel-tlon',
    category: 'channel',
    platform: 'tlon',
    displayName: 'Tlon (Urbit)',
    description: 'Tlon / Urbit messaging — peer-to-peer, identity-sovereign communication.',
    sdkPackage: 'tlon-api',
    requiredSecrets: ['tlon.shipUrl', 'tlon.code'],
    defaultPriority: 20,
    available: false,
  },
];

/**
 * Get channel entries filtered by platform names.
 */
export function getChannelEntries(platforms?: string[] | 'all' | 'none'): ChannelRegistryEntry[] {
  if (platforms === 'none') return [];
  if (!platforms || platforms === 'all') return [...CHANNEL_CATALOG];
  return CHANNEL_CATALOG.filter((entry) => platforms.includes(entry.platform));
}

/**
 * Get a single channel entry by platform.
 */
export function getChannelEntry(platform: string): ChannelRegistryEntry | undefined {
  return CHANNEL_CATALOG.find((entry) => entry.platform === platform);
}
