---
sidebar_position: 15
---

# Messaging Channels

Wunderland agents can communicate across **28 messaging and social platforms** through the unified Channel system. Each platform is backed by a `ChannelAdapter` that normalizes messages into a common `ChannelMessage` format, allowing your agent to handle conversations identically regardless of the source.

For a complete reference of all 28 platforms including capabilities, required secrets, and setup instructions, see the [Complete Channel Reference](./full-channel-list.md).

## Architecture Overview

```
User Message (Telegram, Discord, etc.)
        |
   ChannelAdapter  (platform-specific)
        |
   ChannelRouter   (routes to bound agents)
        |
   StimulusRouter  (channel_message stimulus)
        |
   AgentOS Pipeline (inference, tools, guardrails)
        |
   ChannelRouter.sendMessage()
        |
   ChannelAdapter  (platform-specific reply)
```

All channel bindings are stored in the `wunderland_channel_bindings` database table. Sessions are tracked in `wunderland_channel_sessions`.

## Platform Tiers

Platforms are organized into priority tiers:

| Tier | Platforms | Description |
|------|-----------|-------------|
| **P0 Core** | Telegram, WhatsApp, Discord, Slack, WebChat | First-class messaging support, fully tested |
| **P0 Social** | Twitter/X, Instagram, Reddit, YouTube | First-class social media channels |
| **P1 Extended** | Signal, iMessage, Google Chat, Teams | Supported with tested adapters |
| **P1 Social** | Pinterest, TikTok | Extended social media channels |
| **P2 Community** | Matrix, Zalo, Email, SMS | Community-contributed, well-tested |
| **P3 Experimental** | Nostr, Twitch, LINE, Feishu, Mattermost, NextCloud Talk, Tlon, IRC, Zalo Personal | Experimental, community adapters |

:::note Sandbox policies
Some adapters require network access (external APIs) and some require host-side CLI execution (for example Signal and Zalo Personal via `zca-cli`). In the Wunderland runtime, these can be allowed/blocked via security tiers and permission sets.
:::

---

## P0 Core Platforms

### Telegram

Full-featured Telegram bot integration via the Bot API.

**Required Secrets:**

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Bot token from [@BotFather](https://core.telegram.org/bots#botfather) |

**Capabilities:** Text, images, files, inline keyboards, reply markup, typing indicators, group chats, message editing.

**Setup:**

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the prompts
3. Copy the bot token
4. Add the token to your Wunderland config:

```bash
wunderland channels add telegram --token "1234567890:ABCdef..."
```

Or set `TELEGRAM_BOT_TOKEN` in `~/.wunderland/.env`.

---

### WhatsApp

WhatsApp integration via the [Baileys](https://github.com/WhiskeySockets/Baileys) library (WhatsApp Web protocol).

**Required Secrets:**

| Variable | Description |
|----------|-------------|
| `WHATSAPP_SESSION_DATA` | Serialized session credentials from Baileys |

**Capabilities:** Text, images, files, typing indicators, read receipts, group chats, reactions.

**Setup:**

1. Run `wunderland channels add whatsapp`
2. Scan the QR code with your WhatsApp mobile app
3. The session data is automatically saved and encrypted

:::warning
WhatsApp does not provide an official bot API. This integration uses the WhatsApp Web protocol via Baileys. Use at your own risk and ensure compliance with WhatsApp's Terms of Service.
:::

---

### Discord

Discord bot integration via the Discord.js library.

**Required Secrets:**

| Variable | Description |
|----------|-------------|
| `DISCORD_BOT_TOKEN` | Bot token from the [Discord Developer Portal](https://discord.com/developers/docs/getting-started) |

**Capabilities:** Text, embeds, files, reactions, threads, slash commands, typing indicators, voice channels (audio only).

**Setup:**

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application and add a bot
3. Enable the **Message Content** privileged intent
4. Copy the bot token
5. Generate an invite URL with the required permissions (Send Messages, Read Message History, Attach Files)
6. Add to Wunderland:

```bash
wunderland channels add discord --token "MTIzNDU2..."
```

---

### Slack

Slack bot integration via Socket Mode (real-time) or webhooks.

**Required Secrets:**

| Variable | Description |
|----------|-------------|
| `SLACK_BOT_TOKEN` | Bot OAuth token (`xoxb-*`) from [Slack API](https://api.slack.com/authentication/token-types) |
| `SLACK_APP_TOKEN` | App-level token (`xapp-*`) for [Socket Mode](https://api.slack.com/apis/connections/socket) |
| `SLACK_SIGNING_SECRET` | Signing secret for [webhook verification](https://api.slack.com/authentication/verifying-requests-from-slack) |

**Capabilities:** Text, blocks (rich formatting), files, threads, reactions, typing indicators, slash commands, interactive messages.

**Setup:**

1. Create a new Slack app at [api.slack.com/apps](https://api.slack.com/apps)
2. Enable **Socket Mode** and generate an app-level token
3. Add the bot to your workspace with required OAuth scopes:
   - `chat:write`, `channels:history`, `groups:history`, `im:history`, `files:read`
4. Add to Wunderland:

```bash
wunderland channels add slack \
  --bot-token "xoxb-..." \
  --app-token "xapp-..." \
  --signing-secret "abc123..."
```

---

### WebChat

Built-in web-based chat widget served by the Wunderland HTTP server.

**Required Secrets:** None (built-in).

**Capabilities:** Text, markdown rendering, file uploads, typing indicators, streaming responses.

**Setup:**

WebChat is automatically available when you start the Wunderland server:

```bash
wunderland start
# WebChat available at http://localhost:3777/chat
```

No additional configuration is required. The WebChat interface connects via WebSocket to the Wunderland gateway.

---

## P0 Social Platforms

### Twitter / X

Twitter/X integration via the official API v2.

**Required Secrets:**

| Variable | Description |
|----------|-------------|
| `TWITTER_BEARER_TOKEN` | Bearer token for read-only API access |
| `TWITTER_API_KEY` | API key for OAuth 1.0a (write access) |
| `TWITTER_API_SECRET` | API secret |
| `TWITTER_ACCESS_TOKEN` | User access token |
| `TWITTER_ACCESS_SECRET` | User access secret |

**Capabilities:** Text, images, video, polls, threads, hashtags, engagement metrics, scheduling, content discovery, reactions (likes).

**Tools:** `twitter.post`, `twitter.reply`, `twitter.quote`, `twitter.like`, `twitter.retweet`, `twitter.search`, `twitter.trending`, `twitter.timeline`, `twitter.dm`, `twitter.analytics`, `twitter.schedule`, `twitter.thread`

**Setup:**

1. Apply for a [Twitter Developer account](https://developer.twitter.com)
2. Create a project and app, generate API keys
3. Add to Wunderland:

```bash
wunderland channels add twitter \
  --bearer-token "AAA..." \
  --api-key "..." --api-secret "..." \
  --access-token "..." --access-secret "..."
```

---

### Instagram

Instagram integration via the Graph API for business accounts.

**Required Secrets:**

| Variable | Description |
|----------|-------------|
| `INSTAGRAM_ACCESS_TOKEN` | Instagram Graph API access token |

**Capabilities:** Text, images, video, stories, reels, carousels, hashtags, DM automation, engagement metrics, content discovery.

**Tools:** `instagram.post`, `instagram.reel`, `instagram.story`, `instagram.dm`, `instagram.like`, `instagram.comment`, `instagram.follow`, `instagram.hashtags`, `instagram.explore`, `instagram.analytics`

**Setup:**

1. Create a [Facebook Developer app](https://developers.facebook.com) linked to an Instagram Business account
2. Generate a long-lived access token
3. Add to Wunderland:

```bash
wunderland channels add instagram --access-token "IGQV..."
```

---

### Reddit

Reddit integration via the official API (OAuth2).

**Required Secrets:**

| Variable | Description |
|----------|-------------|
| `REDDIT_CLIENT_ID` | OAuth2 client ID from [Reddit apps](https://www.reddit.com/prefs/apps) |
| `REDDIT_CLIENT_SECRET` | OAuth2 client secret |
| `REDDIT_USERNAME` | Reddit account username |
| `REDDIT_PASSWORD` | Reddit account password |

**Capabilities:** Text, rich text, images, video, polls, threads, voting, subreddit channels, engagement metrics, content discovery.

**Tools:** `reddit.post`, `reddit.comment`, `reddit.vote`, `reddit.search`, `reddit.trending`, `reddit.subscribe`, `reddit.inbox`, `reddit.analytics`

**Setup:**

1. Go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) and create a "script" app
2. Note the client ID and secret
3. Add to Wunderland:

```bash
wunderland channels add reddit \
  --client-id "..." --client-secret "..." \
  --username "..." --password "..."
```

---

### YouTube

YouTube integration via the Data API v3.

**Required Secrets:**

| Variable | Description |
|----------|-------------|
| `YOUTUBE_API_KEY` | YouTube Data API key |

**Capabilities:** Video upload, YouTube Shorts, comments, search, trending, playlists, analytics, scheduling.

**Tools:** `youtube.upload`, `youtube.short`, `youtube.comment`, `youtube.search`, `youtube.trending`, `youtube.analytics`, `youtube.playlist`, `youtube.schedule`

**Setup:**

1. Enable the YouTube Data API v3 in the [Google Cloud Console](https://console.cloud.google.com)
2. Create an API key (or OAuth credentials for upload)
3. Add to Wunderland:

```bash
wunderland channels add youtube --api-key "AIza..."
```

---

## P1 Social Platforms

### Pinterest

Pinterest integration via the API v5.

**Required Secrets:**

| Variable | Description |
|----------|-------------|
| `PINTEREST_ACCESS_TOKEN` | Pinterest API access token |

**Capabilities:** Images, video, carousels, hashtags, engagement metrics, content discovery, scheduling.

**Tools:** `pinterest.pin`, `pinterest.board`, `pinterest.search`, `pinterest.trending`, `pinterest.analytics`, `pinterest.schedule`

---

### TikTok

TikTok integration via the API for Business.

**Required Secrets:**

| Variable | Description |
|----------|-------------|
| `TIKTOK_ACCESS_TOKEN` | TikTok API access token |

**Capabilities:** Video upload, reels, reactions, hashtags, engagement metrics, content discovery.

**Tools:** `tiktok.upload`, `tiktok.trending`, `tiktok.search`, `tiktok.analytics`, `tiktok.engage`, `tiktok.discover`

---

## P1 Extended Platforms

### Signal

Signal messenger integration via [signal-cli](https://github.com/AsamK/signal-cli).

**Required Secrets:**

| Variable | Description |
|----------|-------------|
| `SIGNAL_PHONE_NUMBER` | Phone number registered with Signal for signal-cli |

**Capabilities:** Text, images, files, typing indicators, group chats, reactions, disappearing messages.

**Setup:**

1. Install signal-cli: `brew install signal-cli` or download from [GitHub](https://github.com/AsamK/signal-cli/releases)
2. Register or link a phone number:

```bash
signal-cli -u +1234567890 register
signal-cli -u +1234567890 verify 123456
```

3. Add to Wunderland:

```bash
wunderland channels add signal --phone "+1234567890"
```

---

### iMessage

iMessage integration via [BlueBubbles](https://bluebubbles.app/) server (macOS only).

**Required Secrets:**

| Variable | Description |
|----------|-------------|
| `BLUEBUBBLES_SERVER_URL` | URL of the BlueBubbles server |
| `BLUEBUBBLES_PASSWORD` | BlueBubbles server password |

**Capabilities:** Text, images, files, tapbacks (reactions), typing indicators, read receipts, group chats.

**Setup:**

1. Install BlueBubbles server on a Mac (requires macOS and an Apple ID with iMessage)
2. Configure the server and note the URL and password
3. Add to Wunderland:

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

**Required Secrets:**

| Variable | Description |
|----------|-------------|
| `GOOGLE_CHAT_SERVICE_ACCOUNT` | Service account credentials JSON |

**Capabilities:** Text, cards (rich formatting), threads, slash commands, typing indicators.

**Setup:**

1. Create a Google Cloud project and enable the Chat API
2. Create a service account with Chat permissions
3. Download the service account JSON key
4. Add to Wunderland:

```bash
wunderland channels add google-chat \
  --service-account-file "/path/to/service-account.json"
```

---

### Microsoft Teams

Teams bot integration via the Bot Framework.

**Required Secrets:**

| Variable | Description |
|----------|-------------|
| `TEAMS_APP_ID` | Application ID from the [Teams bot registration](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/authentication/) |
| `TEAMS_APP_PASSWORD` | Application password/secret |

**Capabilities:** Text, adaptive cards, files, typing indicators, threads, @mentions.

**Setup:**

1. Register a bot in the Azure Bot Service
2. Configure the messaging endpoint to point to your Wunderland instance
3. Add the bot to your Teams organization
4. Add to Wunderland:

```bash
wunderland channels add teams \
  --app-id "your-app-id" \
  --app-password "your-app-password"
```

---

## P2 Community Platforms

### Matrix

Matrix protocol integration via the Matrix Client-Server API.

**Required Secrets:**

| Variable | Description |
|----------|-------------|
| `MATRIX_HOMESERVER_URL` | Matrix homeserver URL (e.g., `https://matrix.org`) |
| `MATRIX_ACCESS_TOKEN` | Access token for the bot account |

**Capabilities:** Text, formatted messages (HTML), files, reactions, threads, E2EE rooms (with key management).

**Setup:**

1. Create a bot account on your Matrix homeserver
2. Generate an access token:

```bash
curl -X POST "https://matrix.org/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  -d '{"type":"m.login.password","user":"@bot:matrix.org","password":"..."}'
```

3. Add to Wunderland:

```bash
wunderland channels add matrix \
  --homeserver "https://matrix.org" \
  --access-token "syt_..."
```

---

### Zalo

Zalo Official Account integration via the Zalo API.

**Required Secrets:**

| Variable | Description |
|----------|-------------|
| `ZALO_APP_ID` | Application ID from [Zalo Developers](https://developers.zalo.me/docs/) |
| `ZALO_SECRET_KEY` | Secret key for the Zalo Official Account API |

**Capabilities:** Text, images, files, quick replies, rich messages.

**Setup:**

1. Register a Zalo Official Account at [oa.zalo.me](https://oa.zalo.me)
2. Create an app in the Zalo Developer Portal
3. Add to Wunderland:

```bash
wunderland channels add zalo \
  --app-id "your-app-id" \
  --secret-key "your-secret-key"
```

---

### Email

Email integration via SMTP (outbound) and IMAP/webhook (inbound).

**Required Secrets:**

| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_USER` | SMTP authentication username |
| `SMTP_PASSWORD` | SMTP authentication password |

**Capabilities:** Text, HTML, attachments, CC/BCC, reply threading.

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

**Required Secrets:**

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio authentication token |
| `TWILIO_PHONE_NUMBER` | Twilio phone number for sending SMS |

**Capabilities:** Text, MMS (images), delivery receipts.

**Setup:**

1. Create a Twilio account and purchase a phone number
2. Add to Wunderland:

```bash
wunderland channels add sms \
  --account-sid "ACxxxxxxxx" \
  --auth-token "your-auth-token" \
  --phone-number "+15551234567"
```

---

## Managing Channels

### Listing Channels

```bash
# List all configured channel bindings
wunderland channels list
```

### Removing a Channel

```bash
# Remove a channel binding by ID
wunderland channels remove <binding-id>
```

### Testing a Channel

```bash
# Send a test message through a channel
wunderland channels test <binding-id> --message "Hello from Wunderland!"
```

## Gateway Events

The channel system emits and listens to WebSocket gateway events:

| Event | Direction | Description |
|-------|-----------|-------------|
| `subscribe:channel` | Client -> Server | Subscribe to channel updates |
| `channel:send` | Client -> Server | Send a message through a channel |
| `channel:message` | Server -> Client | Incoming message notification |
| `channel:status` | Server -> Client | Channel connection status update |
