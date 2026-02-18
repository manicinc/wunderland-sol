<p align="center">
  <a href="https://agentos.sh"><img src="logos/agentos-primary-transparent-2x.png" alt="AgentOS" height="64" /></a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://frame.dev" target="_blank" rel="noopener"><img src="logos/frame-logo-green-transparent-4x.png" alt="Frame.dev" height="64" /></a>
  <br>
  <small>by <a href="https://frame.dev" target="_blank" rel="noopener">Frame.dev</a></small>
</p>

# AgentOS Extensions

Official extension registry for the AgentOS ecosystem.

[![CI Status](https://github.com/framersai/agentos-extensions/workflows/CI/badge.svg)](https://github.com/framersai/agentos-extensions/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![API Docs](https://img.shields.io/badge/docs-TypeDoc-blue)](https://framersai.github.io/agentos-extensions/)
[![npm: registry](https://img.shields.io/npm/v/@framers/agentos-extensions-registry?label=registry)](https://www.npmjs.com/package/@framers/agentos-extensions-registry)
[![npm: catalog](https://img.shields.io/npm/v/@framers/agentos-extensions?label=catalog)](https://www.npmjs.com/package/@framers/agentos-extensions)

## Published Extensions

All extensions are published to npm under the `@framers` scope.

### Registry Packages

| Package | Description | npm |
|---------|-------------|-----|
| [`@framers/agentos-extensions-registry`](https://www.npmjs.com/package/@framers/agentos-extensions-registry) | Curated registry bundle — single import with `createCuratedManifest()` | [![npm](https://img.shields.io/npm/v/@framers/agentos-extensions-registry)](https://www.npmjs.com/package/@framers/agentos-extensions-registry) |
| [`@framers/agentos-extensions`](https://www.npmjs.com/package/@framers/agentos-extensions) | Static catalog (`registry.json`) of all extensions | [![npm](https://img.shields.io/npm/v/@framers/agentos-extensions)](https://www.npmjs.com/package/@framers/agentos-extensions) |

### Extensions

| Package | Description | npm |
|---------|-------------|-----|
| [`@framers/agentos-ext-web-search`](./registry/curated/research/web-search) | Multi-provider web search & fact-checking | [![npm](https://img.shields.io/npm/v/@framers/agentos-ext-web-search)](https://www.npmjs.com/package/@framers/agentos-ext-web-search) |
| [`@framers/agentos-ext-web-browser`](./registry/curated/research/web-browser) | Browser automation & content extraction | [![npm](https://img.shields.io/npm/v/@framers/agentos-ext-web-browser)](https://www.npmjs.com/package/@framers/agentos-ext-web-browser) |
| [`@framers/agentos-ext-news-search`](./registry/curated/research/news-search) | News article search via NewsAPI | [![npm](https://img.shields.io/npm/v/@framers/agentos-ext-news-search)](https://www.npmjs.com/package/@framers/agentos-ext-news-search) |
| [`@framers/agentos-ext-giphy`](./registry/curated/media/giphy) | GIF & sticker search via Giphy API | [![npm](https://img.shields.io/npm/v/@framers/agentos-ext-giphy)](https://www.npmjs.com/package/@framers/agentos-ext-giphy) |
| [`@framers/agentos-ext-image-search`](./registry/curated/media/image-search) | Stock photo search (Pexels, Unsplash, Pixabay) | [![npm](https://img.shields.io/npm/v/@framers/agentos-ext-image-search)](https://www.npmjs.com/package/@framers/agentos-ext-image-search) |
| [`@framers/agentos-ext-voice-synthesis`](./registry/curated/media/voice-synthesis) | Text-to-speech via ElevenLabs | [![npm](https://img.shields.io/npm/v/@framers/agentos-ext-voice-synthesis)](https://www.npmjs.com/package/@framers/agentos-ext-voice-synthesis) |
| [`@framers/agentos-ext-cli-executor`](./registry/curated/system/cli-executor) | Shell command execution & file management | [![npm](https://img.shields.io/npm/v/@framers/agentos-ext-cli-executor)](https://www.npmjs.com/package/@framers/agentos-ext-cli-executor) |
| [`@framers/agentos-ext-auth`](./registry/curated/auth) | JWT authentication & subscription management | [![npm](https://img.shields.io/npm/v/@framers/agentos-ext-auth)](https://www.npmjs.com/package/@framers/agentos-ext-auth) |
| [`@framers/agentos-ext-telegram`](./registry/curated/integrations/telegram) | Telegram Bot API integration | [![npm](https://img.shields.io/npm/v/@framers/agentos-ext-telegram)](https://www.npmjs.com/package/@framers/agentos-ext-telegram) |
| [`@framers/agentos-ext-telegram-bot`](./registry/curated/communications/telegram-bot) | Telegram bot communications handler | [![npm](https://img.shields.io/npm/v/@framers/agentos-ext-telegram-bot)](https://www.npmjs.com/package/@framers/agentos-ext-telegram-bot) |
| [`@framers/agentos-ext-anchor-providers`](./registry/curated/provenance/anchor-providers) | Solana on-chain provenance anchoring | [![npm](https://img.shields.io/npm/v/@framers/agentos-ext-anchor-providers)](https://www.npmjs.com/package/@framers/agentos-ext-anchor-providers) |
| [`@framers/agentos-ext-tip-ingestion`](./registry/curated/provenance/wunderland-tip-ingestion) | Tip content processing pipeline | [![npm](https://img.shields.io/npm/v/@framers/agentos-ext-tip-ingestion)](https://www.npmjs.com/package/@framers/agentos-ext-tip-ingestion) |

### Channel Adapters

| Package | Description | npm |
|---------|-------------|-----|
| [`@framers/agentos-ext-channel-telegram`](./registry/curated/channels/telegram) | Telegram messaging channel (grammY) | [![npm](https://img.shields.io/npm/v/@framers/agentos-ext-channel-telegram)](https://www.npmjs.com/package/@framers/agentos-ext-channel-telegram) |
| [`@framers/agentos-ext-channel-whatsapp`](./registry/curated/channels/whatsapp) | WhatsApp messaging channel (Baileys) | [![npm](https://img.shields.io/npm/v/@framers/agentos-ext-channel-whatsapp)](https://www.npmjs.com/package/@framers/agentos-ext-channel-whatsapp) |
| [`@framers/agentos-ext-channel-discord`](./registry/curated/channels/discord) | Discord messaging channel (discord.js) | [![npm](https://img.shields.io/npm/v/@framers/agentos-ext-channel-discord)](https://www.npmjs.com/package/@framers/agentos-ext-channel-discord) |
| [`@framers/agentos-ext-channel-slack`](./registry/curated/channels/slack) | Slack messaging channel (Bolt) | [![npm](https://img.shields.io/npm/v/@framers/agentos-ext-channel-slack)](https://www.npmjs.com/package/@framers/agentos-ext-channel-slack) |
| [`@framers/agentos-ext-channel-webchat`](./registry/curated/channels/webchat) | Built-in WebChat channel (Socket.IO) | [![npm](https://img.shields.io/npm/v/@framers/agentos-ext-channel-webchat)](https://www.npmjs.com/package/@framers/agentos-ext-channel-webchat) |

## Repository Structure

```
agentos-extensions/
├── .changeset/            # Changesets for versioning & publishing
├── .github/workflows/     # CI, release, TypeDoc pages
├── logos/                 # Branding assets
├── templates/             # Starter templates for new extensions
│   ├── basic-tool/        # Single tool template
│   ├── multi-tool/        # Multiple tools template
│   ├── guardrail/         # Safety/compliance template
│   └── workflow/          # Multi-step process template
├── registry/
│   ├── curated/           # Official & verified extensions
│   │   ├── auth/          # Authentication & subscriptions
│   │   ├── communications/# Messaging (Telegram bot)
│   │   ├── integrations/  # External services (Telegram API)
│   │   ├── provenance/    # On-chain anchoring & tip ingestion
│   │   ├── research/      # Web search & browser automation
│   │   ├── channels/       # Messaging channels (Telegram, WhatsApp, Discord, Slack, WebChat)
│   │   └── system/        # CLI executor
│   └── community/         # Community-contributed extensions
├── scripts/               # Registry build & scaffolding tools
├── registry.json          # Auto-generated extension manifest
├── pnpm-workspace.yaml    # Workspace packages for publishing
└── typedoc.json           # API docs config
```

## Quick Start

### Install the registry (recommended)

Load all extensions at once via the curated registry:

```bash
npm install @framers/agentos-extensions-registry
```

```typescript
import { AgentOS } from '@framers/agentos';
import { createCuratedManifest } from '@framers/agentos-extensions-registry';

const manifest = await createCuratedManifest({
  tools: 'all',
  channels: 'none',
  secrets: {
    'serper.apiKey': process.env.SERPER_API_KEY!,
    'giphy.apiKey': process.env.GIPHY_API_KEY!,
  },
});

const agentos = new AgentOS();
await agentos.initialize({ extensionManifest: manifest });
```

Only extensions whose npm packages are installed will load — missing packages are skipped silently.

### Install individual extensions

```bash
npm install @framers/agentos-ext-web-search
```

```typescript
import { AgentOS } from '@framers/agentos';
import webSearch from '@framers/agentos-ext-web-search';

const agentos = new AgentOS();
await agentos.initialize({
  extensionManifest: {
    packs: [{
      factory: () => webSearch({ /* config */ })
    }]
  }
});
```

### Registry options

`createCuratedManifest()` accepts:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tools` | `string[] \| 'all' \| 'none'` | `'all'` | Which tool extensions to enable. Pass an array of names (e.g. `['web-search', 'giphy']`) to selectively load. |
| `channels` | `ChannelPlatform[] \| 'all' \| 'none'` | `'all'` | Which messaging channels to enable. |
| `secrets` | `Record<string, string>` | `{}` | API keys and tokens. Falls back to environment variables. |
| `logger` | `RegistryLogger` | `console` | Custom logger (`info`, `warn`, `error`, `debug` methods). |
| `basePriority` | `number` | `0` | Base priority for all extensions. |
| `overrides` | `Record<string, ExtensionOverrideConfig>` | — | Per-extension overrides for `enabled`, `priority`, and `options`. |

#### Secret keys

| Secret ID | Environment Variable | Extension |
|-----------|---------------------|-----------|
| `serper.apiKey` | `SERPER_API_KEY` | web-search |
| `serpapi.apiKey` | `SERPAPI_API_KEY` | web-search |
| `brave.apiKey` | `BRAVE_API_KEY` | web-search |
| `giphy.apiKey` | `GIPHY_API_KEY` | giphy |
| `elevenlabs.apiKey` | `ELEVENLABS_API_KEY` | voice-synthesis |
| `pexels.apiKey` | `PEXELS_API_KEY` | image-search |
| `unsplash.apiKey` | `UNSPLASH_ACCESS_KEY` | image-search |
| `pixabay.apiKey` | `PIXABAY_API_KEY` | image-search |
| `newsapi.apiKey` | `NEWSAPI_API_KEY` | news-search |
| `telegram.botToken` | `TELEGRAM_BOT_TOKEN` | channel-telegram |
| `discord.botToken` | `DISCORD_BOT_TOKEN` | channel-discord |
| `slack.botToken` | `SLACK_BOT_TOKEN` | channel-slack |
| `slack.appToken` | `SLACK_APP_TOKEN` | channel-slack |

#### Selective loading examples

```typescript
// Only web search and giphy, no channels
const manifest = await createCuratedManifest({
  tools: ['web-search', 'giphy'],
  channels: 'none',
});

// Only Telegram and Discord channels, all tools
const manifest = await createCuratedManifest({
  channels: ['telegram', 'discord'],
  tools: 'all',
  secrets: {
    'telegram.botToken': process.env.TELEGRAM_BOT_TOKEN!,
    'discord.botToken': process.env.DISCORD_BOT_TOKEN!,
  },
});

// Override specific extension options
const manifest = await createCuratedManifest({
  tools: 'all',
  channels: 'none',
  overrides: {
    'web-search': { priority: 10 },
    'cli-executor': { enabled: false },
  },
});
```

### Create a new extension

```bash
# Use the scaffolding script
pnpm run create-extension

# Or copy a template
cp -r templates/basic-tool registry/curated/category/my-extension
cd registry/curated/category/my-extension
pnpm install
pnpm run dev
```

## Releasing & Publishing

This repo uses [Changesets](https://github.com/changesets/changesets) for multi-package versioning and npm publishing. See [RELEASING.md](./RELEASING.md) for the full workflow.

### TL;DR

```bash
# 1. Make your changes to one or more extensions

# 2. Add a changeset describing what changed
pnpm changeset

# 3. Commit and push to master
git add . && git commit -m "feat: my changes" && git push

# 4. The GitHub Action opens a "Version Packages" PR
#    → Merge it to publish updated packages to npm
```

Each extension is versioned and published independently. A change to `web-search` does not bump `telegram`.

## Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Extension | `@framers/agentos-ext-{name}` | `@framers/agentos-ext-web-search` |
| Template | `@framers/agentos-template-{type}` | `@framers/agentos-template-basic-tool` |

## CI/CD

All extensions get free CI/CD via GitHub Actions:

- **CI** (`ci.yml`): Lint, test, typecheck on every PR
- **Release** (`release.yml`): Changesets auto-version PRs + npm publish on merge
- **TypeDoc** (`pages-typedoc.yml`): API docs deployed to [framersai.github.io/agentos-extensions](https://framersai.github.io/agentos-extensions/)
- **Extension validation** (`extension-validation.yml`): Manifest & structure checks
- **Dependabot**: Automated dependency updates with auto-merge for patches

## Quality Standards

### All Extensions

- TypeScript with strict mode
- >80% test coverage
- MIT license
- No hardcoded secrets

### Additional for Curated

- Professional code review
- Performance benchmarks
- Integration tests
- Migration guides

## Documentation

- [API Reference (TypeDoc)](https://framersai.github.io/agentos-extensions/)
- [How Extensions Work](./HOW_EXTENSIONS_WORK.md)
- [Extension Architecture](./EXTENSION_ARCHITECTURE.md)
- [Auto-Loading Extensions](./AUTO_LOADING_EXTENSIONS.md)
- [Agency Collaboration Examples](./AGENCY_COLLABORATION_EXAMPLE.md)
- [Self-Hosted Registries](./SELF_HOSTED_REGISTRIES.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Releasing & Publishing](./RELEASING.md)
- [Contributing](./CONTRIBUTING.md)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

- [Submit New Extension](https://github.com/framersai/agentos-extensions/issues/new?template=new-extension.yml)
- [Report Bug](https://github.com/framersai/agentos-extensions/issues/new?template=bug-report.yml)
- [Request Feature](https://github.com/framersai/agentos-extensions/discussions)

## Links

- **Website**: [frame.dev](https://frame.dev)
- **AgentOS**: [agentos.sh](https://agentos.sh)
- **Marketplace**: [vca.chat](https://vca.chat)
- **npm**: [@framers](https://www.npmjs.com/org/framers)
- **API Docs**: [framersai.github.io/agentos-extensions](https://framersai.github.io/agentos-extensions/)
- **Contact**: team@frame.dev

## License

All extensions in this repository are MIT licensed.

<p align="center">
  <a href="https://agentos.sh"><img src="logos/agentos-primary-transparent-2x.png" alt="AgentOS" height="48" /></a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://frame.dev" target="_blank" rel="noopener"><img src="logos/frame-logo-green-transparent-4x.png" alt="Frame.dev" height="48" /></a>
</p>
