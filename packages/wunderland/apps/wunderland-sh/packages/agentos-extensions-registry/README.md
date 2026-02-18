# @framers/agentos-extensions-registry

Curated extension registry bundle for AgentOS. Single import to register channels, tools, and integrations.

## Installation

```bash
pnpm add @framers/agentos-extensions-registry
```

Channel extensions are **optional dependencies** — only installed channels are loaded. Missing packages are silently skipped.

## Usage

```typescript
import { createCuratedManifest } from '@framers/agentos-extensions-registry';

// Load all available extensions
const manifest = await createCuratedManifest({ channels: 'all', tools: 'all' });

// Or selectively enable specific channels
const manifest = await createCuratedManifest({
  channels: ['telegram', 'discord', 'slack'],
  tools: 'all',
  secrets: {
    'telegram.botToken': process.env.TELEGRAM_BOT_TOKEN,
    'discord.botToken': process.env.DISCORD_BOT_TOKEN,
    'slack.botToken': process.env.SLACK_BOT_TOKEN,
    'slack.signingSecret': process.env.SLACK_SIGNING_SECRET,
  },
});

// Use with AgentOS
const agent = new AgentOS();
await agent.initialize({ extensionManifest: manifest });
```

## API

### `createCuratedManifest(options?)`

Creates a pre-configured `ExtensionManifest` with all available curated extensions.

**Options:**

| Parameter      | Type                          | Default  | Description                          |
| -------------- | ----------------------------- | -------- | ------------------------------------ |
| `channels`     | `string[] \| 'all' \| 'none'` | `'all'`  | Which channel platforms to enable    |
| `tools`        | `string[] \| 'all' \| 'none'` | `'all'`  | Which tool extensions to enable      |
| `secrets`      | `Record<string, string>`      | `{}`     | Secrets map (falls back to env vars) |
| `basePriority` | `number`                      | `0`      | Base priority for all extensions     |
| `overrides`    | `Record<string, Override>`    | `{}`     | Per-extension overrides              |

Notes:

- Channel packs may have side effects on activation (connect/poll/webhook). Consider using `channels: 'none'` and enabling channels explicitly.
- Secrets provided here are forwarded to extension-pack factories, but `requiredSecrets` gating in AgentOS also depends on environment variables and/or `extensionSecrets` provided to AgentOS.

**Override shape:**

```typescript
{ enabled?: boolean; priority?: number; options?: any }
```

### `getAvailableExtensions()`

Returns a list of extensions whose optional dependencies are installed.

### `getAvailableChannels()`

Returns a list of available channel adapters.

## Available Channel Extensions

| Channel  | Package                                 | SDK         | Secret                                   |
| -------- | --------------------------------------- | ----------- | ---------------------------------------- |
| Telegram | `@framers/agentos-ext-channel-telegram` | grammY      | `telegram.botToken`                      |
| WhatsApp | `@framers/agentos-ext-channel-whatsapp` | Baileys     | `whatsapp.sessionData`                   |
| Discord  | `@framers/agentos-ext-channel-discord`  | discord.js  | `discord.botToken`                       |
| Slack    | `@framers/agentos-ext-channel-slack`    | @slack/bolt | `slack.botToken` + `slack.signingSecret` |
| WebChat  | `@framers/agentos-ext-channel-webchat`  | (built-in)  | none                                     |

## License

MIT
