import {useState} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

// ============================================================================
// DATA
// ============================================================================

interface CatalogItem {
  key: string;
  displayName: string;
  description: string;
  category: string;
  packageName?: string;
}

const SKILLS: CatalogItem[] = [
  { key: 'web-search', displayName: 'Web Search', description: 'Search the web for up-to-date information, news, documentation, and answers.', category: 'information' },
  { key: 'weather', displayName: 'Weather Lookup', description: 'Look up current weather conditions, forecasts, and severe weather alerts for any location.', category: 'information' },
  { key: 'summarize', displayName: 'Text / URL Summarization', description: 'Summarize text content, web pages, and long-form articles into concise summaries.', category: 'information' },
  { key: 'github', displayName: 'GitHub (gh CLI)', description: 'Manage GitHub repositories, issues, pull requests, releases, and Actions workflows.', category: 'developer-tools' },
  { key: 'coding-agent', displayName: 'Coding Agent', description: 'Write, review, debug, refactor, and explain code across multiple languages.', category: 'developer-tools' },
  { key: 'git', displayName: 'Git', description: 'Work with Git repositories — inspect history, create branches, commit changes.', category: 'developer-tools' },
  { key: 'slack-helper', displayName: 'Slack Helper', description: 'Manage Slack workspaces, channels, messages, and integrations.', category: 'communication' },
  { key: 'discord-helper', displayName: 'Discord Helper', description: 'Manage Discord servers, channels, roles, and messages.', category: 'communication' },
  { key: 'notion', displayName: 'Notion', description: 'Read, create, and manage pages, databases, and content blocks in Notion.', category: 'productivity' },
  { key: 'obsidian', displayName: 'Obsidian Vault', description: 'Read, create, and manage notes, links, and metadata in Obsidian vaults.', category: 'productivity' },
  { key: 'trello', displayName: 'Trello', description: 'Manage Trello boards, lists, cards, checklists, and team workflows.', category: 'productivity' },
  { key: 'apple-notes', displayName: 'Apple Notes', description: 'Create, read, search, and manage notes in Apple Notes using AppleScript.', category: 'productivity' },
  { key: 'apple-reminders', displayName: 'Apple Reminders', description: 'Create, manage, and query reminders and lists in Apple Reminders.', category: 'productivity' },
  { key: 'healthcheck', displayName: 'Health Check Monitor', description: 'Monitor health and availability of systems, services, APIs, and endpoints.', category: 'devops' },
  { key: 'spotify-player', displayName: 'Spotify Player', description: 'Control Spotify playback, manage playlists, search music, and get recommendations.', category: 'media' },
  { key: 'whisper-transcribe', displayName: 'Whisper Transcription', description: 'Transcribe audio and video files to text using OpenAI Whisper.', category: 'media' },
  { key: '1password', displayName: '1Password Vault', description: 'Query and retrieve items from 1Password vaults using the 1Password CLI.', category: 'security' },
  { key: 'image-gen', displayName: 'AI Image Generation', description: 'Generate images from text prompts using DALL-E, Stable Diffusion, or Midjourney.', category: 'creative' },
];

const CHANNELS: CatalogItem[] = [
  { key: 'telegram', displayName: 'Telegram', description: 'Telegram Bot API via grammY — text, images, inline keyboards, groups.', category: 'P0', packageName: '@framers/agentos-ext-channel-telegram' },
  { key: 'whatsapp', displayName: 'WhatsApp', description: 'WhatsApp Web bridge via Baileys — text, images, documents, voice notes.', category: 'P0', packageName: '@framers/agentos-ext-channel-whatsapp' },
  { key: 'discord', displayName: 'Discord', description: 'Discord bot via discord.js — text, embeds, threads, reactions, buttons.', category: 'P0', packageName: '@framers/agentos-ext-channel-discord' },
  { key: 'slack', displayName: 'Slack', description: 'Slack workspace integration via Bolt — text, blocks, threads, reactions.', category: 'P0', packageName: '@framers/agentos-ext-channel-slack' },
  { key: 'webchat', displayName: 'WebChat', description: 'Browser-based chat widget via Socket.IO — embeds in any website.', category: 'P0', packageName: '@framers/agentos-ext-channel-webchat' },
  { key: 'signal', displayName: 'Signal', description: 'Signal messenger via signal-cli — end-to-end encrypted messaging.', category: 'P1' },
  { key: 'imessage', displayName: 'iMessage', description: 'iMessage bridge via BlueBubbles — macOS server required.', category: 'P1' },
  { key: 'google-chat', displayName: 'Google Chat', description: 'Google Workspace Chat via Cloud API — supports cards and threads.', category: 'P1' },
  { key: 'teams', displayName: 'Microsoft Teams', description: 'Microsoft Teams bot via Teams AI library — supports adaptive cards.', category: 'P1' },
  { key: 'matrix', displayName: 'Matrix', description: 'Matrix/Element via matrix-js-sdk — decentralized, federated messaging.', category: 'P2' },
  { key: 'zalo', displayName: 'Zalo', description: 'Zalo Official Account API — popular in Vietnam.', category: 'P2' },
  { key: 'email', displayName: 'Email', description: 'Email messaging via nodemailer (SMTP) + imap-simple (IMAP).', category: 'P2' },
  { key: 'sms', displayName: 'SMS', description: 'SMS messaging via Twilio — text-only, worldwide reach.', category: 'P2' },
  { key: 'nostr', displayName: 'Nostr', description: 'Nostr relay messaging via nostr-tools — decentralized, censorship-resistant.', category: 'P3' },
  { key: 'twitch', displayName: 'Twitch', description: 'Twitch IRC chat via tmi.js — chat messages, commands, whispers.', category: 'P3' },
  { key: 'line', displayName: 'LINE', description: 'LINE Messaging API — text, images, flex messages, rich menus.', category: 'P3' },
  { key: 'feishu', displayName: 'Feishu / Lark', description: 'Feishu (Lark) bot via official SDK — text, cards, interactive messages.', category: 'P3' },
  { key: 'mattermost', displayName: 'Mattermost', description: 'Mattermost self-hosted chat via official client — text, threads, reactions.', category: 'P3' },
];

const PROVIDERS: CatalogItem[] = [
  { key: 'openai', displayName: 'OpenAI', description: 'GPT-4o, GPT-4.1, o-series reasoning models.', category: 'cloud' },
  { key: 'anthropic', displayName: 'Anthropic', description: 'Claude Sonnet, Haiku, and Opus models.', category: 'cloud' },
  { key: 'ollama', displayName: 'Ollama', description: 'Run open-weight models (Llama, Mistral, etc.) on your own hardware.', category: 'local' },
  { key: 'bedrock', displayName: 'AWS Bedrock', description: 'Managed access to Claude, Llama, and other foundation models via AWS.', category: 'cloud' },
  { key: 'gemini', displayName: 'Google Gemini', description: 'Gemini 2.0 Flash, Pro, and multimodal models.', category: 'cloud' },
  { key: 'github-copilot', displayName: 'GitHub Copilot', description: 'Uses your existing Copilot subscription for model access.', category: 'cloud' },
  { key: 'cloudflare-ai', displayName: 'Cloudflare AI', description: 'Proxy and observe requests to any upstream provider with caching.', category: 'gateway' },
  { key: 'minimax', displayName: 'Minimax', description: 'MiniMax-M2.1 and VL-01 vision-language models.', category: 'cloud' },
  { key: 'qwen', displayName: 'Qwen', description: 'Alibaba Qwen-Max, Qwen-Turbo, and Qwen-VL models.', category: 'cloud' },
  { key: 'moonshot', displayName: 'Moonshot', description: 'Moonshot AI (Kimi) — long-context models with strong multilingual support.', category: 'cloud' },
  { key: 'xiaomi-mimo', displayName: 'Xiaomi Mimo', description: 'Mimo-v2-Flash model with Anthropic-compatible endpoint.', category: 'cloud' },
  { key: 'venice', displayName: 'Venice', description: 'Privacy-focused inference with no data retention.', category: 'cloud' },
  { key: 'openrouter', displayName: 'OpenRouter', description: 'Unified API gateway to 200+ models with automatic fallback.', category: 'gateway' },
];

const TOOLS: CatalogItem[] = [
  { key: 'web-search', displayName: 'Web Search', description: 'Web search via Serper.dev or similar providers.', category: 'tool', packageName: '@framers/agentos-ext-web-search' },
  { key: 'web-browser', displayName: 'Web Browser', description: 'Headless browser for page fetching and scraping.', category: 'tool', packageName: '@framers/agentos-ext-web-browser' },
  { key: 'cli-executor', displayName: 'CLI Executor', description: 'Execute shell commands in a sandboxed environment.', category: 'tool', packageName: '@framers/agentos-ext-cli-executor' },
  { key: 'giphy', displayName: 'Giphy', description: 'Search and share GIFs via the Giphy API.', category: 'tool', packageName: '@framers/agentos-ext-giphy' },
  { key: 'image-search', displayName: 'Image Search', description: 'Search for images via web APIs.', category: 'tool', packageName: '@framers/agentos-ext-image-search' },
  { key: 'voice-synthesis', displayName: 'Voice Synthesis', description: 'Text-to-speech synthesis via ElevenLabs or similar.', category: 'media', packageName: '@framers/agentos-ext-voice-synthesis' },
  { key: 'news-search', displayName: 'News Search', description: 'Search recent news articles.', category: 'tool', packageName: '@framers/agentos-ext-news-search' },
  { key: 'voice-twilio', displayName: 'Twilio Voice', description: 'Phone calls via Twilio — outbound/inbound calls, TwiML, media streams.', category: 'voice', packageName: '@framers/agentos-ext-voice-twilio' },
  { key: 'voice-telnyx', displayName: 'Telnyx Voice', description: 'Phone calls via Telnyx Call Control v2 — SIP, FQDN routing.', category: 'voice', packageName: '@framers/agentos-ext-voice-telnyx' },
  { key: 'voice-plivo', displayName: 'Plivo Voice', description: 'Phone calls via Plivo Voice API — outbound calls, XML responses.', category: 'voice', packageName: '@framers/agentos-ext-voice-plivo' },
  { key: 'calendar-google', displayName: 'Google Calendar', description: 'Google Calendar API — event CRUD, free/busy queries, multi-calendar.', category: 'productivity', packageName: '@framers/agentos-ext-calendar-google' },
  { key: 'email-gmail', displayName: 'Gmail', description: 'Gmail API — send, read, search, reply to emails, manage labels.', category: 'productivity', packageName: '@framers/agentos-ext-email-gmail' },
  { key: 'auth', displayName: 'Authentication', description: 'User authentication and session management tools.', category: 'tool', packageName: '@framers/agentos-ext-auth' },
  { key: 'skills', displayName: 'Skills Registry', description: 'Discover and enable curated SKILL.md prompt modules.', category: 'tool', packageName: '@framers/agentos-ext-skills' },
];

type TabId = 'skills' | 'channels' | 'providers' | 'tools';

const TABS: { id: TabId; label: string; count: number }[] = [
  { id: 'skills', label: 'Skills', count: SKILLS.length },
  { id: 'channels', label: 'Channels', count: CHANNELS.length },
  { id: 'providers', label: 'Providers', count: PROVIDERS.length },
  { id: 'tools', label: 'Extensions', count: TOOLS.length },
];

const DATA_MAP: Record<TabId, CatalogItem[]> = {
  skills: SKILLS,
  channels: CHANNELS,
  providers: PROVIDERS,
  tools: TOOLS,
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function IntegrationsCatalog(): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>('skills');

  const items = DATA_MAP[activeTab];

  return (
    <section className={styles.catalog}>
      <div className="container">
        <div className={styles.header}>
          <h2 className={styles.title}>Integration Catalog</h2>
          <p className={styles.subtitle}>
            Everything your Wunderbot connects to — channels, skills, models, and tools.
          </p>
        </div>

        {/* Counter strip (doubles as tab navigation) */}
        <div className={styles.counters}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={clsx(styles.counter, activeTab === tab.id && styles.counterActive)}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className={styles.counterValue}>{tab.count}</span>
              <span className={styles.counterLabel}>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Card grid */}
        <div className={styles.grid} key={activeTab}>
          {items.map((item) => {
            const npmUrl = item.packageName
              ? `https://www.npmjs.com/package/${item.packageName}`
              : null;

            return (
              <div key={item.key} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardName}>{item.displayName}</span>
                  {item.category && (
                    <span className={styles.cardBadge}>{item.category}</span>
                  )}
                </div>
                <p className={styles.cardDesc}>{item.description}</p>
                <div className={styles.cardFooter}>
                  {npmUrl && (
                    <Link href={npmUrl} className={styles.cardLink}>
                      npm
                    </Link>
                  )}
                  {item.packageName && (
                    <Link
                      href="https://github.com/framersai/agentos-extensions"
                      className={styles.cardLink}
                    >
                      GitHub
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
