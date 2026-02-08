'use client';

import { useState, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface CatalogSkill {
  name: string;
  displayName: string;
  description: string;
  category: string;
  tags: string[];
  requiredSecrets: string[];
  requiredTools: string[];
  skillPath: string;
}

interface CatalogChannel {
  platform: string;
  displayName: string;
  description: string;
  sdkPackage: string;
  requiredSecrets: string[];
  tier: 'P0' | 'P1' | 'P2' | 'P3';
  packageName: string;
}

interface CatalogProvider {
  providerId: string;
  displayName: string;
  description: string;
  defaultModel: string;
  smallModel: string;
  requiredSecrets: string[];
  apiBaseUrl?: string;
  packageName: string;
}

interface CatalogTool {
  name: string;
  displayName: string;
  description: string;
  category: string;
  requiredSecrets: string[];
  packageName: string;
}

// ============================================================================
// CATALOG DATA
// ============================================================================

const SKILLS: CatalogSkill[] = [
  { name: 'web-search', displayName: 'Web Search', description: 'Search the web for up-to-date information, news, documentation, and answers.', category: 'information', tags: ['search', 'web', 'research', 'news'], requiredSecrets: [], requiredTools: ['web-search'], skillPath: 'registry/curated/web-search/SKILL.md' },
  { name: 'weather', displayName: 'Weather Lookup', description: 'Look up current weather conditions, forecasts, and severe weather alerts for any location.', category: 'information', tags: ['weather', 'forecast', 'location'], requiredSecrets: [], requiredTools: ['web-search'], skillPath: 'registry/curated/weather/SKILL.md' },
  { name: 'summarize', displayName: 'Text / URL Summarization', description: 'Summarize text content, web pages, and long-form articles into concise summaries.', category: 'information', tags: ['summarization', 'text-processing', 'tldr'], requiredSecrets: [], requiredTools: ['web-search'], skillPath: 'registry/curated/summarize/SKILL.md' },
  { name: 'github', displayName: 'GitHub (gh CLI)', description: 'Manage GitHub repositories, issues, pull requests, releases, and Actions workflows.', category: 'developer-tools', tags: ['github', 'git', 'issues', 'pull-requests', 'ci-cd'], requiredSecrets: ['github.token'], requiredTools: [], skillPath: 'registry/curated/github/SKILL.md' },
  { name: 'coding-agent', displayName: 'Coding Agent', description: 'Write, review, debug, refactor, and explain code across multiple languages and frameworks.', category: 'developer-tools', tags: ['coding', 'programming', 'debugging', 'refactoring'], requiredSecrets: [], requiredTools: ['filesystem'], skillPath: 'registry/curated/coding-agent/SKILL.md' },
  { name: 'git', displayName: 'Git', description: 'Work with Git repositories — inspect history, create branches, commit changes, resolve conflicts.', category: 'developer-tools', tags: ['git', 'version-control', 'branching', 'commits'], requiredSecrets: [], requiredTools: [], skillPath: 'registry/curated/git/SKILL.md' },
  { name: 'slack-helper', displayName: 'Slack Helper', description: 'Manage Slack workspaces, channels, messages, and integrations through the Slack API.', category: 'communication', tags: ['slack', 'messaging', 'workspace', 'notifications'], requiredSecrets: ['slack.bot_token', 'slack.app_token'], requiredTools: [], skillPath: 'registry/curated/slack-helper/SKILL.md' },
  { name: 'discord-helper', displayName: 'Discord Helper', description: 'Manage Discord servers, channels, roles, and messages through the Discord API.', category: 'communication', tags: ['discord', 'messaging', 'server', 'moderation'], requiredSecrets: ['discord.bot_token'], requiredTools: [], skillPath: 'registry/curated/discord-helper/SKILL.md' },
  { name: 'notion', displayName: 'Notion', description: 'Read, create, and manage pages, databases, and content blocks in Notion workspaces.', category: 'productivity', tags: ['notion', 'wiki', 'database', 'notes', 'project-management'], requiredSecrets: ['notion.api_key'], requiredTools: [], skillPath: 'registry/curated/notion/SKILL.md' },
  { name: 'obsidian', displayName: 'Obsidian Vault', description: 'Read, create, and manage notes, links, and metadata in Obsidian vaults.', category: 'productivity', tags: ['obsidian', 'markdown', 'notes', 'knowledge-graph'], requiredSecrets: [], requiredTools: ['filesystem'], skillPath: 'registry/curated/obsidian/SKILL.md' },
  { name: 'trello', displayName: 'Trello', description: 'Manage Trello boards, lists, cards, checklists, and team workflows via the Trello API.', category: 'productivity', tags: ['trello', 'kanban', 'project-management', 'boards'], requiredSecrets: ['trello.api_key', 'trello.token'], requiredTools: [], skillPath: 'registry/curated/trello/SKILL.md' },
  { name: 'apple-notes', displayName: 'Apple Notes', description: 'Create, read, search, and manage notes in Apple Notes using AppleScript.', category: 'productivity', tags: ['apple-notes', 'macos', 'notes', 'applescript'], requiredSecrets: [], requiredTools: ['filesystem'], skillPath: 'registry/curated/apple-notes/SKILL.md' },
  { name: 'apple-reminders', displayName: 'Apple Reminders', description: 'Create, manage, and query reminders and lists in Apple Reminders using AppleScript.', category: 'productivity', tags: ['apple-reminders', 'macos', 'reminders', 'tasks'], requiredSecrets: [], requiredTools: ['filesystem'], skillPath: 'registry/curated/apple-reminders/SKILL.md' },
  { name: 'healthcheck', displayName: 'Health Check Monitor', description: 'Monitor health and availability of systems, services, APIs, and infrastructure endpoints.', category: 'devops', tags: ['monitoring', 'health', 'uptime', 'infrastructure'], requiredSecrets: [], requiredTools: ['web-search'], skillPath: 'registry/curated/healthcheck/SKILL.md' },
  { name: 'spotify-player', displayName: 'Spotify Player', description: 'Control Spotify playback, manage playlists, search music, and get recommendations.', category: 'media', tags: ['spotify', 'music', 'playback', 'playlists'], requiredSecrets: ['spotify.client_id', 'spotify.client_secret', 'spotify.refresh_token'], requiredTools: [], skillPath: 'registry/curated/spotify-player/SKILL.md' },
  { name: 'whisper-transcribe', displayName: 'Whisper Transcription', description: 'Transcribe audio and video files to text using OpenAI Whisper or compatible APIs.', category: 'media', tags: ['transcription', 'whisper', 'speech-to-text', 'audio'], requiredSecrets: ['openai.api_key'], requiredTools: ['filesystem'], skillPath: 'registry/curated/whisper-transcribe/SKILL.md' },
  { name: '1password', displayName: '1Password Vault', description: 'Query and retrieve items from 1Password vaults using the 1Password CLI.', category: 'security', tags: ['1password', 'passwords', 'secrets', 'vault'], requiredSecrets: [], requiredTools: [], skillPath: 'registry/curated/1password/SKILL.md' },
  { name: 'image-gen', displayName: 'AI Image Generation', description: 'Generate images from text prompts using DALL-E, Stable Diffusion, or Midjourney.', category: 'creative', tags: ['image-generation', 'ai-art', 'dall-e', 'creative'], requiredSecrets: ['openai.api_key'], requiredTools: [], skillPath: 'registry/curated/image-gen/SKILL.md' },
];

const CHANNELS: CatalogChannel[] = [
  { platform: 'telegram', displayName: 'Telegram', description: 'Telegram Bot API via grammY — text, images, inline keyboards, groups.', sdkPackage: 'grammy', requiredSecrets: ['telegram.botToken'], tier: 'P0', packageName: '@framers/agentos-ext-channel-telegram' },
  { platform: 'whatsapp', displayName: 'WhatsApp', description: 'WhatsApp Web bridge via Baileys — text, images, documents, voice notes.', sdkPackage: '@whiskeysockets/baileys', requiredSecrets: ['whatsapp.sessionData'], tier: 'P0', packageName: '@framers/agentos-ext-channel-whatsapp' },
  { platform: 'discord', displayName: 'Discord', description: 'Discord bot via discord.js — text, embeds, threads, reactions, buttons.', sdkPackage: 'discord.js', requiredSecrets: ['discord.botToken'], tier: 'P0', packageName: '@framers/agentos-ext-channel-discord' },
  { platform: 'slack', displayName: 'Slack', description: 'Slack workspace integration via Bolt — text, blocks, threads, reactions.', sdkPackage: '@slack/bolt', requiredSecrets: ['slack.botToken', 'slack.appToken'], tier: 'P0', packageName: '@framers/agentos-ext-channel-slack' },
  { platform: 'webchat', displayName: 'WebChat', description: 'Browser-based chat widget via Socket.IO — embeds in any website.', sdkPackage: 'socket.io', requiredSecrets: [], tier: 'P0', packageName: '@framers/agentos-ext-channel-webchat' },
  { platform: 'signal', displayName: 'Signal', description: 'Signal messenger via signal-cli — end-to-end encrypted messaging.', sdkPackage: 'signal-cli', requiredSecrets: ['signal.phoneNumber'], tier: 'P1', packageName: '@framers/agentos-ext-channel-signal' },
  { platform: 'imessage', displayName: 'iMessage', description: 'iMessage bridge via BlueBubbles — macOS server required.', sdkPackage: 'bluebubbles-node', requiredSecrets: ['imessage.serverUrl', 'imessage.password'], tier: 'P1', packageName: '@framers/agentos-ext-channel-imessage' },
  { platform: 'google-chat', displayName: 'Google Chat', description: 'Google Workspace Chat via Cloud API — supports cards and threads.', sdkPackage: '@google-cloud/chat', requiredSecrets: ['googlechat.serviceAccount'], tier: 'P1', packageName: '@framers/agentos-ext-channel-google-chat' },
  { platform: 'teams', displayName: 'Microsoft Teams', description: 'Microsoft Teams bot via Teams AI library — supports adaptive cards.', sdkPackage: '@microsoft/teams-ai', requiredSecrets: ['teams.appId', 'teams.appPassword'], tier: 'P1', packageName: '@framers/agentos-ext-channel-teams' },
  { platform: 'matrix', displayName: 'Matrix', description: 'Matrix/Element via matrix-js-sdk — decentralized, federated messaging.', sdkPackage: 'matrix-js-sdk', requiredSecrets: ['matrix.homeserverUrl', 'matrix.accessToken'], tier: 'P2', packageName: '@framers/agentos-ext-channel-matrix' },
  { platform: 'zalo', displayName: 'Zalo', description: 'Zalo Official Account API — popular in Vietnam.', sdkPackage: 'zalo-api', requiredSecrets: ['zalo.appId', 'zalo.secretKey'], tier: 'P2', packageName: '@framers/agentos-ext-channel-zalo' },
  { platform: 'email', displayName: 'Email', description: 'Email messaging via nodemailer (SMTP) + imap-simple (IMAP).', sdkPackage: 'nodemailer', requiredSecrets: ['email.smtpHost', 'email.smtpUser', 'email.smtpPassword'], tier: 'P2', packageName: '@framers/agentos-ext-channel-email' },
  { platform: 'sms', displayName: 'SMS', description: 'SMS messaging via Twilio — text-only, worldwide reach.', sdkPackage: 'twilio', requiredSecrets: ['twilio.accountSid', 'twilio.authToken', 'twilio.phoneNumber'], tier: 'P2', packageName: '@framers/agentos-ext-channel-sms' },
  { platform: 'nostr', displayName: 'Nostr', description: 'Nostr relay messaging via nostr-tools — decentralized, censorship-resistant.', sdkPackage: 'nostr-tools', requiredSecrets: ['nostr.privateKey'], tier: 'P3', packageName: '@framers/agentos-ext-channel-nostr' },
  { platform: 'twitch', displayName: 'Twitch', description: 'Twitch IRC chat via tmi.js — chat messages, commands, whispers.', sdkPackage: 'tmi.js', requiredSecrets: ['twitch.oauthToken', 'twitch.channel'], tier: 'P3', packageName: '@framers/agentos-ext-channel-twitch' },
  { platform: 'line', displayName: 'LINE', description: 'LINE Messaging API — text, images, flex messages, rich menus.', sdkPackage: '@line/bot-sdk', requiredSecrets: ['line.channelAccessToken', 'line.channelSecret'], tier: 'P3', packageName: '@framers/agentos-ext-channel-line' },
  { platform: 'feishu', displayName: 'Feishu / Lark', description: 'Feishu (Lark) bot via official SDK — text, cards, interactive messages.', sdkPackage: '@larksuiteoapi/node-sdk', requiredSecrets: ['feishu.appId', 'feishu.appSecret'], tier: 'P3', packageName: '@framers/agentos-ext-channel-feishu' },
  { platform: 'mattermost', displayName: 'Mattermost', description: 'Mattermost self-hosted chat via official client — text, threads, reactions.', sdkPackage: '@mattermost/client', requiredSecrets: ['mattermost.url', 'mattermost.token'], tier: 'P3', packageName: '@framers/agentos-ext-channel-mattermost' },
];

const PROVIDERS: CatalogProvider[] = [
  { providerId: 'openai', displayName: 'OpenAI', description: 'GPT-4o, GPT-4.1, o-series reasoning models.', defaultModel: 'gpt-4o', smallModel: 'gpt-4o-mini', requiredSecrets: ['openai.apiKey'], apiBaseUrl: 'https://api.openai.com/v1', packageName: '@framers/agentos-ext-provider-openai' },
  { providerId: 'anthropic', displayName: 'Anthropic', description: 'Claude Sonnet, Haiku, and Opus models.', defaultModel: 'claude-sonnet-4-5-20250929', smallModel: 'claude-haiku-4-5-20251001', requiredSecrets: ['anthropic.apiKey'], apiBaseUrl: 'https://api.anthropic.com', packageName: '@framers/agentos-ext-provider-anthropic' },
  { providerId: 'ollama', displayName: 'Ollama', description: 'Run open-weight models (Llama, Mistral, etc.) on your own hardware.', defaultModel: 'llama3', smallModel: 'llama3.2:3b', requiredSecrets: [], apiBaseUrl: 'http://127.0.0.1:11434/v1', packageName: '@framers/agentos-ext-provider-ollama' },
  { providerId: 'bedrock', displayName: 'AWS Bedrock', description: 'Managed access to Claude, Llama, and other foundation models via AWS SDK.', defaultModel: 'anthropic.claude-sonnet', smallModel: 'anthropic.claude-haiku', requiredSecrets: ['aws.accessKeyId', 'aws.secretAccessKey', 'aws.region'], packageName: '@framers/agentos-ext-provider-bedrock' },
  { providerId: 'gemini', displayName: 'Google Gemini', description: 'Gemini 2.0 Flash, Pro, and multimodal models.', defaultModel: 'gemini-2.0-flash', smallModel: 'gemini-2.0-flash-lite', requiredSecrets: ['gemini.apiKey'], apiBaseUrl: 'https://generativelanguage.googleapis.com', packageName: '@framers/agentos-ext-provider-gemini' },
  { providerId: 'github-copilot', displayName: 'GitHub Copilot', description: 'Uses your existing Copilot subscription for model access.', defaultModel: 'gpt-4o', smallModel: 'gpt-4o-mini', requiredSecrets: ['github.copilotToken'], apiBaseUrl: 'https://api.githubcopilot.com', packageName: '@framers/agentos-ext-provider-github-copilot' },
  { providerId: 'cloudflare-ai', displayName: 'Cloudflare AI Gateway', description: 'Proxy and observe requests to any upstream provider with caching and rate limiting.', defaultModel: '(configurable)', smallModel: '(configurable)', requiredSecrets: ['cloudflare.accountId', 'cloudflare.apiToken'], packageName: '@framers/agentos-ext-provider-cloudflare-ai' },
  { providerId: 'minimax', displayName: 'Minimax', description: 'MiniMax-M2.1 and VL-01 vision-language models.', defaultModel: 'MiniMax-M2.1', smallModel: 'MiniMax-VL-01', requiredSecrets: ['minimax.apiKey'], apiBaseUrl: 'https://api.minimax.chat/v1', packageName: '@framers/agentos-ext-provider-minimax' },
  { providerId: 'qwen', displayName: 'Qwen', description: 'Alibaba Qwen-Max, Qwen-Turbo, and Qwen-VL models.', defaultModel: 'qwen-max', smallModel: 'qwen-turbo', requiredSecrets: ['qwen.apiKey'], apiBaseUrl: 'https://portal.qwen.ai/v1', packageName: '@framers/agentos-ext-provider-qwen' },
  { providerId: 'moonshot', displayName: 'Moonshot', description: 'Moonshot AI (Kimi) — long-context models with strong multilingual support.', defaultModel: 'kimi-k2.5', smallModel: 'kimi-k2-instant', requiredSecrets: ['moonshot.apiKey'], apiBaseUrl: 'https://api.moonshot.ai/v1', packageName: '@framers/agentos-ext-provider-moonshot' },
  { providerId: 'xiaomi-mimo', displayName: 'Xiaomi Mimo', description: 'Mimo-v2-Flash model with Anthropic-compatible endpoint.', defaultModel: 'mimo-v2-flash', smallModel: 'mimo-v2-flash', requiredSecrets: ['xiaomi.apiKey'], apiBaseUrl: 'https://api.xiaomimimo.com/anthropic', packageName: '@framers/agentos-ext-provider-xiaomi-mimo' },
  { providerId: 'venice', displayName: 'Venice', description: 'Privacy-focused inference with no data retention, supports open-weight models.', defaultModel: 'venice-default', smallModel: 'venice-fast', requiredSecrets: ['venice.apiKey'], apiBaseUrl: 'https://api.venice.ai/v1', packageName: '@framers/agentos-ext-provider-venice' },
  { providerId: 'openrouter', displayName: 'OpenRouter', description: 'Unified API gateway to 200+ models from multiple providers with automatic fallback.', defaultModel: 'auto', smallModel: 'auto', requiredSecrets: ['openrouter.apiKey'], apiBaseUrl: 'https://openrouter.ai/api/v1', packageName: '@framers/agentos-ext-provider-openrouter' },
];

const TOOLS: CatalogTool[] = [
  { name: 'auth', displayName: 'Authentication', description: 'User authentication and session management tools.', category: 'tool', requiredSecrets: [], packageName: '@framers/agentos-ext-auth' },
  { name: 'web-search', displayName: 'Web Search', description: 'Web search via Serper.dev or similar providers.', category: 'tool', requiredSecrets: ['serper.apiKey'], packageName: '@framers/agentos-ext-web-search' },
  { name: 'web-browser', displayName: 'Web Browser', description: 'Headless browser for page fetching and scraping.', category: 'tool', requiredSecrets: [], packageName: '@framers/agentos-ext-web-browser' },
  { name: 'cli-executor', displayName: 'CLI Executor', description: 'Execute shell commands in a sandboxed environment.', category: 'tool', requiredSecrets: [], packageName: '@framers/agentos-ext-cli-executor' },
  { name: 'giphy', displayName: 'Giphy', description: 'Search and share GIFs via the Giphy API.', category: 'tool', requiredSecrets: [], packageName: '@framers/agentos-ext-giphy' },
  { name: 'image-search', displayName: 'Image Search', description: 'Search for images via web APIs.', category: 'tool', requiredSecrets: [], packageName: '@framers/agentos-ext-image-search' },
  { name: 'voice-synthesis', displayName: 'Voice Synthesis', description: 'Text-to-speech synthesis via ElevenLabs or similar.', category: 'tool', requiredSecrets: [], packageName: '@framers/agentos-ext-voice-synthesis' },
  { name: 'news-search', displayName: 'News Search', description: 'Search recent news articles.', category: 'tool', requiredSecrets: [], packageName: '@framers/agentos-ext-news-search' },
  { name: 'skills', displayName: 'Skills Registry', description: 'Discover and enable curated SKILL.md prompt modules.', category: 'tool', requiredSecrets: [], packageName: '@framers/agentos-ext-skills' },
  { name: 'voice-twilio', displayName: 'Twilio Voice', description: 'Phone call integration via Twilio — outbound/inbound calls, TwiML, media streams.', category: 'voice', requiredSecrets: ['twilio.accountSid', 'twilio.authToken'], packageName: '@framers/agentos-ext-voice-twilio' },
  { name: 'voice-telnyx', displayName: 'Telnyx Voice', description: 'Phone call integration via Telnyx Call Control v2 — SIP, FQDN routing.', category: 'voice', requiredSecrets: ['telnyx.apiKey', 'telnyx.connectionId'], packageName: '@framers/agentos-ext-voice-telnyx' },
  { name: 'voice-plivo', displayName: 'Plivo Voice', description: 'Phone call integration via Plivo Voice API — outbound calls, XML responses.', category: 'voice', requiredSecrets: ['plivo.authId', 'plivo.authToken'], packageName: '@framers/agentos-ext-voice-plivo' },
  { name: 'calendar-google', displayName: 'Google Calendar', description: 'Google Calendar API — event CRUD, free/busy queries, multi-calendar support.', category: 'productivity', requiredSecrets: ['google.clientId', 'google.clientSecret', 'google.refreshToken'], packageName: '@framers/agentos-ext-calendar-google' },
  { name: 'email-gmail', displayName: 'Gmail', description: 'Gmail API — send, read, search, reply to emails, manage labels.', category: 'productivity', requiredSecrets: ['google.clientId', 'google.clientSecret', 'google.refreshToken'], packageName: '@framers/agentos-ext-email-gmail' },
];

type TabId = 'skills' | 'channels' | 'providers' | 'tools';

const TABS: { id: TabId; label: string; count: number }[] = [
  { id: 'skills', label: 'Skills', count: SKILLS.length },
  { id: 'channels', label: 'Channels', count: CHANNELS.length },
  { id: 'providers', label: 'Providers', count: PROVIDERS.length },
  { id: 'tools', label: 'Tools', count: TOOLS.length },
];

const SKILL_CATEGORIES = ['all', 'information', 'developer-tools', 'communication', 'productivity', 'devops', 'media', 'security', 'creative'];
const CHANNEL_TIERS = ['all', 'P0', 'P1', 'P2', 'P3'];
const TOOL_CATEGORIES = ['all', 'tool', 'voice', 'productivity'];

// ============================================================================
// HELPERS
// ============================================================================

function matchesSearch(query: string, ...fields: string[]): boolean {
  const q = query.toLowerCase();
  return fields.some((f) => f.toLowerCase().includes(q));
}

function formatSecretEnv(secret: string): string {
  return secret.replace(/\./g, '_').toUpperCase();
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function UsagePanel({ type, item }: { type: TabId; item: CatalogSkill | CatalogChannel | CatalogProvider | CatalogTool }) {
  if (type === 'skills') {
    const skill = item as CatalogSkill;
    return (
      <div className="mt-4 pt-4 border-t border-[var(--border-glass)] space-y-3">
        <div>
          <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">CLI</span>
          <code className="block font-mono text-xs text-[var(--neon-green)] bg-[var(--bg-glass)] rounded px-3 py-2 border border-[var(--border-glass)]">
            wunderland skills enable {skill.name}
          </code>
        </div>
        <div>
          <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">SDK</span>
          <pre className="font-mono text-[0.65rem] text-[var(--text-secondary)] bg-[var(--bg-glass)] rounded px-3 py-2 border border-[var(--border-glass)] overflow-x-auto whitespace-pre leading-relaxed m-0">
{`import { getSkillByName } from '@framers/agentos-skills-registry/catalog'

const skill = getSkillByName('${skill.name}')
// Load SKILL.md from: ${skill.skillPath}`}
          </pre>
        </div>
        {skill.requiredTools.length > 0 && (
          <div>
            <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">Requires</span>
            <span className="text-xs text-[var(--text-tertiary)]">Tools: {skill.requiredTools.join(', ')}</span>
          </div>
        )}
      </div>
    );
  }

  if (type === 'channels') {
    const channel = item as CatalogChannel;
    return (
      <div className="mt-4 pt-4 border-t border-[var(--border-glass)] space-y-3">
        <div>
          <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">SDK</span>
          <pre className="font-mono text-[0.65rem] text-[var(--text-secondary)] bg-[var(--bg-glass)] rounded px-3 py-2 border border-[var(--border-glass)] overflow-x-auto whitespace-pre leading-relaxed m-0">
{`import { createCuratedManifest } from '@framers/agentos-extensions-registry'

const manifest = await createCuratedManifest({
  channels: ['${channel.platform}'],
  tools: 'all',
})`}
          </pre>
        </div>
        <div>
          <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">Install</span>
          <code className="block font-mono text-xs text-[var(--neon-green)] bg-[var(--bg-glass)] rounded px-3 py-2 border border-[var(--border-glass)]">
            npm install {channel.sdkPackage}
          </code>
        </div>
        {channel.requiredSecrets.length > 0 && (
          <div>
            <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">Env</span>
            <pre className="font-mono text-[0.65rem] text-[var(--text-secondary)] bg-[var(--bg-glass)] rounded px-3 py-2 border border-[var(--border-glass)] overflow-x-auto whitespace-pre leading-relaxed m-0">
{channel.requiredSecrets.map((s) => `${formatSecretEnv(s)}=your_value`).join('\n')}
            </pre>
          </div>
        )}
      </div>
    );
  }

  if (type === 'providers') {
    const provider = item as CatalogProvider;
    return (
      <div className="mt-4 pt-4 border-t border-[var(--border-glass)] space-y-3">
        {provider.requiredSecrets.length > 0 && (
          <div>
            <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">Env</span>
            <pre className="font-mono text-[0.65rem] text-[var(--text-secondary)] bg-[var(--bg-glass)] rounded px-3 py-2 border border-[var(--border-glass)] overflow-x-auto whitespace-pre leading-relaxed m-0">
{provider.requiredSecrets.map((s) => `${formatSecretEnv(s)}=your_value`).join('\n')}
            </pre>
          </div>
        )}
        <div>
          <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">Config</span>
          <pre className="font-mono text-[0.65rem] text-[var(--text-secondary)] bg-[var(--bg-glass)] rounded px-3 py-2 border border-[var(--border-glass)] overflow-x-auto whitespace-pre leading-relaxed m-0">
{`// agent.config.json
{
  "llm": {
    "provider": "${provider.providerId}",
    "model": "${provider.defaultModel}"
  }
}`}
          </pre>
        </div>
        <div>
          <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">Models</span>
          <span className="text-xs text-[var(--text-tertiary)]">Default: {provider.defaultModel} | Small: {provider.smallModel}</span>
        </div>
      </div>
    );
  }

  // tools
  const tool = item as CatalogTool;
  return (
    <div className="mt-4 pt-4 border-t border-[var(--border-glass)] space-y-3">
      <div>
        <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">SDK</span>
        <pre className="font-mono text-[0.65rem] text-[var(--text-secondary)] bg-[var(--bg-glass)] rounded px-3 py-2 border border-[var(--border-glass)] overflow-x-auto whitespace-pre leading-relaxed m-0">
{`import { createCuratedManifest } from '@framers/agentos-extensions-registry'

const manifest = await createCuratedManifest({
  tools: ['${tool.name}'],
  channels: 'none',
})`}
        </pre>
      </div>
      <div>
        <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">Install</span>
        <code className="block font-mono text-xs text-[var(--neon-green)] bg-[var(--bg-glass)] rounded px-3 py-2 border border-[var(--border-glass)]">
          npm install {tool.packageName}
        </code>
      </div>
      {tool.requiredSecrets.length > 0 && (
        <div>
          <span className="block text-[0.6rem] uppercase tracking-widest text-[var(--neon-cyan)] font-mono mb-1">Env</span>
          <pre className="font-mono text-[0.65rem] text-[var(--text-secondary)] bg-[var(--bg-glass)] rounded px-3 py-2 border border-[var(--border-glass)] overflow-x-auto whitespace-pre leading-relaxed m-0">
{tool.requiredSecrets.map((s) => `${formatSecretEnv(s)}=your_value`).join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CatalogBrowser() {
  const [activeTab, setActiveTab] = useState<TabId>('skills');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setSearch('');
    setCategoryFilter('all');
    setExpanded(null);
  };

  const filterCategories = activeTab === 'skills'
    ? SKILL_CATEGORIES
    : activeTab === 'channels'
      ? CHANNEL_TIERS
      : activeTab === 'tools'
        ? TOOL_CATEGORIES
        : [];

  const filteredItems = useMemo(() => {
    if (activeTab === 'skills') {
      return SKILLS.filter((s) => {
        if (search && !matchesSearch(search, s.name, s.displayName, s.description, ...s.tags)) return false;
        if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
        return true;
      });
    }
    if (activeTab === 'channels') {
      return CHANNELS.filter((c) => {
        if (search && !matchesSearch(search, c.platform, c.displayName, c.description, c.sdkPackage)) return false;
        if (categoryFilter !== 'all' && c.tier !== categoryFilter) return false;
        return true;
      });
    }
    if (activeTab === 'providers') {
      return PROVIDERS.filter((p) => {
        if (search && !matchesSearch(search, p.providerId, p.displayName, p.description, p.defaultModel)) return false;
        return true;
      });
    }
    return TOOLS.filter((t) => {
      if (search && !matchesSearch(search, t.name, t.displayName, t.description)) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      return true;
    });
  }, [activeTab, search, categoryFilter]);

  const getItemKey = (item: any): string => item.name || item.platform || item.providerId;
  const getItemName = (item: any): string => item.displayName;
  const getItemDesc = (item: any): string => item.description;
  const getItemCategory = (item: any): string => activeTab === 'channels' ? item.tier : (item.category || '');
  const getItemSecrets = (item: any): string[] => item.requiredSecrets || [];

  const getNpmUrl = (item: any): string | null => {
    const pkg = item.packageName;
    if (!pkg) return null;
    return `https://www.npmjs.com/package/${pkg}`;
  };

  const getGithubUrl = (item: any): string => {
    if (activeTab === 'skills') return `https://github.com/framersai/agentos-skills/tree/main/${item.skillPath}`;
    return 'https://github.com/framersai/agentos-extensions';
  };

  return (
    <div className="mt-12">
      <h3 className="font-display font-bold text-lg mb-6">
        <span className="neon-glow-cyan">Browse All Extensions &amp; Skills</span>
      </h3>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-[var(--neon-cyan)] bg-[rgba(0,245,255,0.08)] text-[var(--text-primary)] shadow-[0_0_12px_rgba(0,245,255,0.15)]'
                : 'border-[var(--border-glass)] bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:border-[rgba(0,245,255,0.3)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
            <span className="text-[0.65rem] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-glass)] text-[var(--text-tertiary)]">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="space-y-3 mb-4">
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-[var(--border-glass)] bg-[var(--bg-glass)] text-[var(--text-primary)] text-sm font-mono placeholder-[var(--text-tertiary)] outline-none focus:border-[rgba(0,245,255,0.4)] transition-colors"
        />
        {filterCategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filterCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-full border text-[0.65rem] uppercase tracking-wider cursor-pointer transition-all ${
                  categoryFilter === cat
                    ? 'border-[var(--neon-cyan)] bg-[rgba(0,245,255,0.1)] text-[var(--neon-cyan)]'
                    : 'border-[var(--border-glass)] text-[var(--text-tertiary)] hover:border-[rgba(0,245,255,0.3)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="text-xs text-[var(--text-tertiary)] font-mono mb-4">
        {filteredItems.length} {activeTab} found
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const key = getItemKey(item);
          const isExpanded = expanded === key;
          return (
            <div key={key} className="holo-card p-5 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm text-[var(--text-primary)]">{getItemName(item)}</span>
                <span className="badge badge-level text-[0.55rem]">{getItemCategory(item)}</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3 line-clamp-2">{getItemDesc(item)}</p>

              {getItemSecrets(item).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {getItemSecrets(item).map((s: string) => (
                    <span key={s} className="text-[0.55rem] font-mono px-1.5 py-0.5 rounded bg-[rgba(255,215,0,0.08)] text-[var(--deco-gold)] border border-[rgba(255,215,0,0.15)]">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {getNpmUrl(item) && (
                  <a
                    href={getNpmUrl(item)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[0.65rem] font-mono px-2.5 py-1 rounded border border-[var(--border-glass)] bg-[var(--bg-glass)] text-[var(--text-secondary)] no-underline hover:border-[rgba(0,245,255,0.3)] hover:text-[var(--neon-cyan)] transition-all"
                  >
                    NPM
                  </a>
                )}
                <a
                  href={getGithubUrl(item)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.65rem] font-mono px-2.5 py-1 rounded border border-[var(--border-glass)] bg-[var(--bg-glass)] text-[var(--text-secondary)] no-underline hover:border-[rgba(0,245,255,0.3)] hover:text-[var(--neon-cyan)] transition-all"
                >
                  GitHub
                </a>
                <button
                  onClick={() => setExpanded(isExpanded ? null : key)}
                  className={`text-[0.65rem] font-mono px-2.5 py-1 rounded border cursor-pointer transition-all ${
                    isExpanded
                      ? 'border-[var(--neon-green)] bg-[rgba(16,255,176,0.08)] text-[var(--neon-green)]'
                      : 'border-[rgba(16,255,176,0.2)] text-[var(--neon-green)] hover:bg-[rgba(16,255,176,0.08)] hover:border-[rgba(16,255,176,0.4)]'
                  }`}
                >
                  {isExpanded ? 'Hide' : 'How to Use'}
                </button>
              </div>

              {isExpanded && <UsagePanel type={activeTab} item={item} />}
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-[var(--text-tertiary)] text-sm">
          No {activeTab} match your search. Try a different query or filter.
        </div>
      )}
    </div>
  );
}
