/**
 * @fileoverview Tool registry — metadata catalog for all supported
 * tool, voice, and productivity extensions.
 *
 * Each entry defines the extension's metadata, secret requirements, and
 * default priority. The actual implementations live in their respective
 * `@framers/agentos-ext-*` packages.
 *
 * @module @framers/agentos-extensions-registry/tools
 */

import type { ExtensionInfo } from './types.js';

/**
 * Full catalog of tool, voice, and productivity extensions.
 */
export const TOOL_CATALOG: ExtensionInfo[] = [
  // ── Tools ──
  {
    packageName: '@framers/agentos-ext-auth',
    name: 'auth',
    category: 'tool',
    displayName: 'Authentication',
    description: 'User authentication and session management tools.',
    requiredSecrets: [],
    defaultPriority: 10,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-web-search',
    name: 'web-search',
    category: 'tool',
    displayName: 'Web Search',
    description: 'Web search using DuckDuckGo by default; optional Serper/Brave API key for enhanced results.',
    requiredSecrets: [],
    defaultPriority: 20,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-web-browser',
    name: 'web-browser',
    category: 'tool',
    displayName: 'Web Browser',
    description: 'Headless browser for page fetching and scraping.',
    requiredSecrets: [],
    defaultPriority: 20,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-telegram',
    name: 'telegram',
    category: 'integration',
    displayName: 'Telegram (Legacy)',
    description: 'Legacy Telegram bot integration (tool-based, pre-channel system).',
    requiredSecrets: ['telegram.botToken'],
    defaultPriority: 50,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-cli-executor',
    name: 'cli-executor',
    category: 'tool',
    displayName: 'CLI Executor',
    description: 'Execute shell commands in a sandboxed environment.',
    requiredSecrets: [],
    defaultPriority: 20,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-giphy',
    name: 'giphy',
    category: 'tool',
    displayName: 'Giphy',
    description: 'Search and share GIFs via the Giphy API.',
    requiredSecrets: [],
    defaultPriority: 30,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-image-search',
    name: 'image-search',
    category: 'tool',
    displayName: 'Image Search',
    description: 'Search for images via web APIs.',
    requiredSecrets: [],
    defaultPriority: 30,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-voice-synthesis',
    name: 'voice-synthesis',
    category: 'tool',
    displayName: 'Voice Synthesis',
    description: 'Text-to-speech synthesis via ElevenLabs or similar.',
    requiredSecrets: [],
    defaultPriority: 30,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-news-search',
    name: 'news-search',
    category: 'tool',
    displayName: 'News Search',
    description: 'Search recent news articles.',
    requiredSecrets: [],
    defaultPriority: 30,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-skills',
    name: 'skills',
    category: 'tool',
    displayName: 'Skills Registry',
    description: 'Discover and enable curated SKILL.md prompt modules.',
    requiredSecrets: [],
    defaultPriority: 15,
    available: false,
  },

  // ── Media: Video / Audio / Culture ──
  {
    packageName: '@framers/agentos-ext-video-search',
    name: 'video-search',
    category: 'tool',
    displayName: 'Video Search',
    description: 'Search royalty-free stock video via Coverr API.',
    requiredSecrets: ['coverr.apiKey'],
    defaultPriority: 30,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-openverse',
    name: 'openverse',
    category: 'tool',
    displayName: 'Openverse',
    description: 'Search Creative Commons licensed images and audio via Openverse API.',
    requiredSecrets: ['openverse.clientId', 'openverse.clientSecret'],
    defaultPriority: 30,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-sound-search',
    name: 'sound-search',
    category: 'tool',
    displayName: 'Sound Search',
    description: 'Search CC-licensed sound effects via Freesound API.',
    requiredSecrets: ['freesound.apiKey'],
    defaultPriority: 30,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-music-search',
    name: 'music-search',
    category: 'tool',
    displayName: 'Music Search',
    description: 'Search royalty-free music tracks via Jamendo API.',
    requiredSecrets: ['jamendo.clientId'],
    defaultPriority: 30,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-smithsonian',
    name: 'smithsonian',
    category: 'tool',
    displayName: 'Smithsonian Open Access',
    description: 'Search Smithsonian Institution open-access collections (art, history, science).',
    requiredSecrets: ['smithsonian.apiKey'],
    defaultPriority: 30,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-github',
    name: 'github',
    category: 'tool',
    displayName: 'GitHub',
    description: 'GitHub API — search repos/code, read issues/PRs, create gists.',
    requiredSecrets: ['github.token'],
    defaultPriority: 30,
    available: false,
  },

  // ── Voice Providers ──
  {
    packageName: '@framers/agentos-ext-voice-twilio',
    name: 'voice-twilio',
    category: 'voice',
    displayName: 'Twilio Voice',
    description:
      'Phone call integration via Twilio — outbound/inbound calls, TwiML, media streams.',
    requiredSecrets: ['twilio.accountSid', 'twilio.authToken'],
    defaultPriority: 50,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-voice-telnyx',
    name: 'voice-telnyx',
    category: 'voice',
    displayName: 'Telnyx Voice',
    description: 'Phone call integration via Telnyx Call Control v2 — SIP, FQDN routing.',
    requiredSecrets: ['telnyx.apiKey', 'telnyx.connectionId'],
    defaultPriority: 50,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-voice-plivo',
    name: 'voice-plivo',
    category: 'voice',
    displayName: 'Plivo Voice',
    description: 'Phone call integration via Plivo Voice API — outbound calls, XML responses.',
    requiredSecrets: ['plivo.authId', 'plivo.authToken'],
    defaultPriority: 50,
    available: false,
  },

  // ── Productivity ──
  {
    packageName: '@framers/agentos-ext-calendar-google',
    name: 'calendar-google',
    category: 'productivity',
    displayName: 'Google Calendar',
    description: 'Google Calendar API — event CRUD, free/busy queries, multi-calendar support.',
    requiredSecrets: ['google.clientId', 'google.clientSecret', 'google.refreshToken'],
    defaultPriority: 40,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-email-gmail',
    name: 'email-gmail',
    category: 'productivity',
    displayName: 'Gmail',
    description: 'Gmail API — send, read, search, reply to emails, manage labels.',
    requiredSecrets: ['google.clientId', 'google.clientSecret', 'google.refreshToken'],
    defaultPriority: 40,
    available: false,
  },
];

/**
 * Get tool entries filtered by name.
 */
export function getToolEntries(names?: string[] | 'all' | 'none'): ExtensionInfo[] {
  if (names === 'none') return [];
  if (!names || names === 'all') return [...TOOL_CATALOG];
  return TOOL_CATALOG.filter((entry) => names.includes(entry.name));
}

/**
 * Get a single tool entry by name.
 */
export function getToolEntry(name: string): ExtensionInfo | undefined {
  return TOOL_CATALOG.find((entry) => entry.name === name);
}
