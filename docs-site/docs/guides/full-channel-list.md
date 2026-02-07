---
sidebar_position: 23
title: Complete Channel Reference
description: All 20 messaging channels with capabilities, secrets, and setup instructions
---

# Complete Channel Reference

Wunderland agents can communicate across **20 messaging platforms** through the unified Channel system. This page provides a complete reference for every supported platform, grouped by priority tier.

For the channel architecture, binding management, and gateway events, see the [Messaging Channels](./channels.md) guide.

## Tier Overview

| Tier | Platforms | Support Level |
|------|-----------|---------------|
| **P0 Core** | Telegram, WhatsApp, Discord, Slack, WebChat | First-class, fully tested, production-ready |
| **P1 Extended** | Signal, iMessage, Google Chat, Microsoft Teams | Supported with tested adapters |
| **P2 Community** | Matrix, Zalo, Email, SMS | Community-contributed, well-tested |
| **P3 Experimental** | Nostr, Twitch, LINE, Feishu/Lark, Mattermost, NextCloud Talk, Tlon (Urbit) | Experimental, community adapters |

---

## P0 Core Platforms

### Telegram

Full-featured Telegram bot integration via the Bot API.

| Property | Value |
|----------|-------|
| **Platform ID** | `telegram` |
| **Required Secret** | `TELEGRAM_BOT_TOKEN` |
| **Capabilities** | Text, images, files, inline keyboards, reply markup, typing indicators, group chats, message editing |

**Setup:**

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the prompts
3. Copy the bot token

```bash
wunderland channels add telegram --token "1234567890:ABCdef..."
```

---

### WhatsApp

WhatsApp integration via the [Baileys](https://github.com/WhiskeySockets/Baileys) library (WhatsApp Web protocol).

| Property | Value |
|----------|-------|
| **Platform ID** | `whatsapp` |
| **Required Secret** | `WHATSAPP_SESSION_DATA` |
| **Capabilities** | Text, images, files, typing indicators, read receipts, group chats, reactions |

**Setup:**

```bash
wunderland channels add whatsapp
# Scan the QR code with your WhatsApp mobile app
```

:::warning
WhatsApp does not provide an official bot API. This integration uses the WhatsApp Web protocol via Baileys. Use at your own risk and ensure compliance with WhatsApp's Terms of Service.
:::

---

### Discord

Discord bot integration via Discord.js.

| Property | Value |
|----------|-------|
| **Platform ID** | `discord` |
| **Required Secret** | `DISCORD_BOT_TOKEN` |
| **Capabilities** | Text, embeds, files, reactions, threads, slash commands, typing indicators, voice channels (audio) |

**Setup:**

1. Create an application at the [Discord Developer Portal](https://discord.com/developers/applications)
2. Add a bot and enable the **Message Content** privileged intent
3. Generate an invite URL with Send Messages, Read Message History, Attach Files permissions

```bash
wunderland channels add discord --token "MTIzNDU2..."
```

---

### Slack

Slack bot integration via Socket Mode (real-time) or webhooks.

| Property | Value |
|----------|-------|
| **Platform ID** | `slack` |
| **Required Secrets** | `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_SIGNING_SECRET` |
| **Capabilities** | Text, blocks (rich formatting), files, threads, reactions, typing indicators, slash commands, interactive messages |

**Setup:**

1. Create a Slack app at [api.slack.com/apps](https://api.slack.com/apps)
2. Enable **Socket Mode** and generate an app-level token
3. Add OAuth scopes: `chat:write`, `channels:history`, `groups:history`, `im:history`, `files:read`

```bash
wunderland channels add slack \
  --bot-token "xoxb-..." \
  --app-token "xapp-..." \
  --signing-secret "abc123..."
```

---

### WebChat

Built-in web-based chat widget served by the Wunderland HTTP server.

| Property | Value |
|----------|-------|
| **Platform ID** | `webchat` |
| **Required Secrets** | None (built-in) |
| **Capabilities** | Text, markdown rendering, file uploads, typing indicators, streaming responses |

**Setup:**

WebChat is automatically available when you start the server:

```bash
wunderland start
# WebChat available at http://localhost:3777/chat
```

---

## P1 Extended Platforms

### Signal

Signal messenger integration via [signal-cli](https://github.com/AsamK/signal-cli).

| Property | Value |
|----------|-------|
| **Platform ID** | `signal` |
| **Required Secret** | `SIGNAL_PHONE_NUMBER` |
| **Capabilities** | Text, images, files, typing indicators, group chats, reactions, disappearing messages |

**Setup:**

1. Install signal-cli: `brew install signal-cli`
2. Register a phone number:

```bash
signal-cli -u +1234567890 register
signal-cli -u +1234567890 verify 123456
wunderland channels add signal --phone "+1234567890"
```

---

### iMessage

iMessage integration via [BlueBubbles](https://bluebubbles.app/) server (macOS only).

| Property | Value |
|----------|-------|
| **Platform ID** | `imessage` |
| **Required Secrets** | `BLUEBUBBLES_SERVER_URL`, `BLUEBUBBLES_PASSWORD` |
| **Capabilities** | Text, images, files, tapbacks (reactions), typing indicators, read receipts, group chats |

**Setup:**

1. Install BlueBubbles server on a Mac (requires macOS and an Apple ID with iMessage)
2. Configure the server URL and password

```bash
wunderland channels add imessage \
  --server-url "http://192.168.1.50:1234" \
  --password "your-password"
```

:::tip
BlueBubbles requires a Mac to be running continuously. Consider using a Mac Mini as a dedicated server.
:::

---

### Google Chat

Google Chat integration via a service account and the Google Chat API.

| Property | Value |
|----------|-------|
| **Platform ID** | `google-chat` |
| **Required Secret** | `GOOGLE_CHAT_SERVICE_ACCOUNT` |
| **Capabilities** | Text, cards (rich formatting), threads, slash commands, typing indicators |

**Setup:**

1. Create a Google Cloud project and enable the Chat API
2. Create a service account with Chat permissions
3. Download the JSON key

```bash
wunderland channels add google-chat \
  --service-account-file "/path/to/service-account.json"
```

---

### Microsoft Teams

Teams bot integration via the Bot Framework.

| Property | Value |
|----------|-------|
| **Platform ID** | `teams` |
| **Required Secrets** | `TEAMS_APP_ID`, `TEAMS_APP_PASSWORD` |
| **Capabilities** | Text, adaptive cards, files, typing indicators, threads, @mentions |

**Setup:**

1. Register a bot in the Azure Bot Service
2. Configure the messaging endpoint to point to your Wunderland instance

```bash
wunderland channels add teams \
  --app-id "your-app-id" \
  --app-password "your-app-password"
```

---

## P2 Community Platforms

### Matrix

Matrix protocol integration via the Matrix Client-Server API.

| Property | Value |
|----------|-------|
| **Platform ID** | `matrix` |
| **Required Secrets** | `MATRIX_HOMESERVER_URL`, `MATRIX_ACCESS_TOKEN` |
| **Capabilities** | Text, formatted messages (HTML), files, reactions, threads, E2EE rooms |

**Setup:**

```bash
wunderland channels add matrix \
  --homeserver "https://matrix.org" \
  --access-token "syt_..."
```

---

### Zalo

Zalo Official Account integration via the Zalo API.

| Property | Value |
|----------|-------|
| **Platform ID** | `zalo` |
| **Required Secrets** | `ZALO_APP_ID`, `ZALO_SECRET_KEY` |
| **Capabilities** | Text, images, files, quick replies, rich messages |

**Setup:**

1. Register a Zalo Official Account at [oa.zalo.me](https://oa.zalo.me)
2. Create an app in the Zalo Developer Portal

```bash
wunderland channels add zalo \
  --app-id "your-app-id" \
  --secret-key "your-secret-key"
```

---

### Email

Email integration via SMTP (outbound) and IMAP/webhook (inbound).

| Property | Value |
|----------|-------|
| **Platform ID** | `email` |
| **Required Secrets** | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` |
| **Capabilities** | Text, HTML, attachments, CC/BCC, reply threading |

**Setup:**

```bash
wunderland channels add email \
  --smtp-host "smtp.gmail.com" \
  --smtp-user "bot@example.com" \
  --smtp-password "your-app-password"
```

:::tip
For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833) rather than your account password.
:::

---

### SMS

SMS integration via [Twilio](https://www.twilio.com/).

| Property | Value |
|----------|-------|
| **Platform ID** | `sms` |
| **Required Secrets** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| **Capabilities** | Text, MMS (images), delivery receipts |

**Setup:**

1. Create a Twilio account and purchase a phone number

```bash
wunderland channels add sms \
  --account-sid "ACxxxxxxxx" \
  --auth-token "your-auth-token" \
  --phone-number "+15551234567"
```

---

## P3 Experimental Platforms

:::info
P3 platforms are experimental and provided through community adapters. They may have limited functionality or require additional configuration. Contributions are welcome.
:::

### Nostr

Decentralized social protocol integration via NIP-04 encrypted direct messages.

| Property | Value |
|----------|-------|
| **Platform ID** | `nostr` |
| **Required Secrets** | `NOSTR_PRIVATE_KEY`, `NOSTR_RELAY_URLS` |
| **Capabilities** | Text, encrypted DMs, public notes |

**Setup:**

```bash
wunderland channels add nostr \
  --private-key "nsec1..." \
  --relay-urls "wss://relay.damus.io,wss://nos.lol"
```

---

### Twitch

Twitch chat integration for live stream interaction.

| Property | Value |
|----------|-------|
| **Platform ID** | `twitch` |
| **Required Secrets** | `TWITCH_OAUTH_TOKEN`, `TWITCH_CHANNEL_NAME` |
| **Capabilities** | Text, emotes, chat commands, whispers |

**Setup:**

```bash
wunderland channels add twitch \
  --oauth-token "oauth:..." \
  --channel "yourchannel"
```

---

### LINE

LINE Messaging API integration for the popular Asian messaging platform.

| Property | Value |
|----------|-------|
| **Platform ID** | `line` |
| **Required Secrets** | `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET` |
| **Capabilities** | Text, images, stickers, quick replies, rich menus, flex messages |

**Setup:**

1. Create a LINE Developers account and a Messaging API channel

```bash
wunderland channels add line \
  --channel-token "..." \
  --channel-secret "..."
```

---

### Feishu / Lark

Feishu (Lark) bot integration for the enterprise collaboration platform.

| Property | Value |
|----------|-------|
| **Platform ID** | `feishu` |
| **Required Secrets** | `FEISHU_APP_ID`, `FEISHU_APP_SECRET` |
| **Capabilities** | Text, rich text, cards, files, group chats |

**Setup:**

1. Create an app in the [Feishu Open Platform](https://open.feishu.cn/)

```bash
wunderland channels add feishu \
  --app-id "..." \
  --app-secret "..."
```

---

### Mattermost

Self-hosted Mattermost integration via webhooks or bot accounts.

| Property | Value |
|----------|-------|
| **Platform ID** | `mattermost` |
| **Required Secrets** | `MATTERMOST_URL`, `MATTERMOST_BOT_TOKEN` |
| **Capabilities** | Text, markdown, files, reactions, threads |

**Setup:**

```bash
wunderland channels add mattermost \
  --url "https://mattermost.example.com" \
  --bot-token "..."
```

---

### NextCloud Talk

NextCloud Talk integration for self-hosted communication.

| Property | Value |
|----------|-------|
| **Platform ID** | `nextcloud-talk` |
| **Required Secrets** | `NEXTCLOUD_URL`, `NEXTCLOUD_TOKEN` |
| **Capabilities** | Text, files, reactions, polls |

**Setup:**

```bash
wunderland channels add nextcloud-talk \
  --url "https://nextcloud.example.com" \
  --token "..."
```

---

### Tlon (Urbit)

Tlon integration for the Urbit decentralized computing platform.

| Property | Value |
|----------|-------|
| **Platform ID** | `tlon` |
| **Required Secrets** | `URBIT_URL`, `URBIT_CODE` |
| **Capabilities** | Text, channels, groups |

**Setup:**

```bash
wunderland channels add tlon \
  --url "http://localhost:8080" \
  --code "+code"
```

---

## Channel Capabilities Matrix

| Platform | Text | Images | Files | Typing | Reactions | Threads | Groups | Rich Format |
|----------|------|--------|-------|--------|-----------|---------|--------|-------------|
| Telegram | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Inline keyboards |
| WhatsApp | Yes | Yes | Yes | Yes | Yes | No | Yes | Limited |
| Discord | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Embeds |
| Slack | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Blocks |
| WebChat | Yes | No | Yes | Yes | No | No | No | Markdown |
| Signal | Yes | Yes | Yes | Yes | Yes | No | Yes | Limited |
| iMessage | Yes | Yes | Yes | Yes | Yes | No | Yes | Tapbacks |
| Google Chat | Yes | No | No | Yes | No | Yes | No | Cards |
| Teams | Yes | Yes | Yes | Yes | No | Yes | No | Adaptive cards |
| Matrix | Yes | Yes | Yes | No | Yes | Yes | Yes | HTML |
| Zalo | Yes | Yes | Yes | No | No | No | No | Quick replies |
| Email | Yes | No | Yes | No | No | Yes | No | HTML |
| SMS | Yes | Yes | No | No | No | No | No | MMS |
| Nostr | Yes | No | No | No | No | No | No | Encrypted DMs |
| Twitch | Yes | No | No | No | No | No | No | Emotes |
| LINE | Yes | Yes | No | No | No | No | Yes | Flex messages |
| Feishu | Yes | No | Yes | No | No | No | Yes | Cards |
| Mattermost | Yes | Yes | Yes | No | Yes | Yes | No | Markdown |
| NextCloud | Yes | No | Yes | No | Yes | No | No | Limited |
| Tlon | Yes | No | No | No | No | No | Yes | Limited |

## Managing Channels via CLI

```bash
# List all configured channel bindings
wunderland channels

# Add a channel interactively
wunderland channels add

# Remove a channel binding
wunderland channels remove <binding-id>

# Test a channel
wunderland channels test <binding-id> --message "Hello from Wunderland!"
```

## Related

- [Messaging Channels](./channels.md) -- architecture and gateway events
- [Extension Ecosystem](./extensions.md) -- channel adapters as extensions
- [CLI Reference](./cli-reference.md) -- `wunderland channels` command details
