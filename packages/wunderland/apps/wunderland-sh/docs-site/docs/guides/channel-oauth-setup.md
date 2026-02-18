# Channel OAuth Setup Guide

How to set up Slack, Discord, and Telegram integrations so your users can connect their own workspaces, servers, and bots to their agents.

---

## Prerequisites

Generate and set `INTERNAL_API_SECRET` in your `.env`:

```bash
openssl rand -base64 32
```

This shared secret authenticates server-to-server calls between the Next.js frontend and NestJS backend (OAuth callbacks, Stripe sync).

---

## Slack

### 1. Create a Slack App

1. Go to **[api.slack.com/apps](https://api.slack.com/apps)**
2. Click **"Create New App"** → **"From scratch"**
3. Name it (e.g. "Rabbithole Agent") and pick a workspace for development
4. Click **"Create App"**

### 2. Configure OAuth Scopes

1. In your app settings, go to **OAuth & Permissions** (left sidebar)
2. Under **Bot Token Scopes**, add these scopes:
   - `chat:write` — Send messages
   - `channels:read` — View channel info
   - `channels:history` — Read message history
   - `groups:read` — View private channel info
   - `im:read` — View DM info
   - `im:write` — Send DMs
   - `users:read` — View user info

### 3. Set Redirect URL

1. Still in **OAuth & Permissions**, scroll to **Redirect URLs**
2. Add: `https://your-domain.com/api/channels/oauth/slack/callback`
   - For local dev: `http://localhost:3000/api/channels/oauth/slack/callback`
3. Click **"Save URLs"**

### 4. Get Credentials

1. Go to **Basic Information** (left sidebar)
2. Copy:
   - **Client ID** → `SLACK_OAUTH_CLIENT_ID`
   - **Client Secret** → `SLACK_OAUTH_CLIENT_SECRET`

### 5. Set Environment Variables

```env
SLACK_OAUTH_CLIENT_ID=your-client-id
SLACK_OAUTH_CLIENT_SECRET=your-client-secret
```

### How It Works

Users click "Connect to Slack" → redirected to Slack → authorize your app → Slack sends them back with a code → backend exchanges code for a `xoxb-` bot token → token stored encrypted → binding auto-created. Slack bot tokens never expire.

---

## Discord

### 1. Create a Discord Application

1. Go to **[discord.com/developers/applications](https://discord.com/developers/applications)**
2. Click **"New Application"**
3. Name it (e.g. "Rabbithole Agent") and click **"Create"**

### 2. Create a Bot

1. Go to **Bot** (left sidebar)
2. Click **"Add Bot"** → **"Yes, do it!"**
3. Under **Privileged Gateway Intents**, enable:
   - **Message Content Intent** (if you want the bot to read message content)
4. Copy the **Token** → this is your `DISCORD_OAUTH_BOT_TOKEN`

### 3. Configure OAuth2

1. Go to **OAuth2** → **General** (left sidebar)
2. Copy:
   - **Client ID** → `DISCORD_OAUTH_CLIENT_ID`
   - **Client Secret** → `DISCORD_OAUTH_CLIENT_SECRET`
3. Under **Redirects**, add:
   - `https://your-domain.com/api/channels/oauth/discord/callback`
   - For local dev: `http://localhost:3000/api/channels/oauth/discord/callback`

### 4. Set Environment Variables

```env
DISCORD_OAUTH_CLIENT_ID=your-client-id
DISCORD_OAUTH_CLIENT_SECRET=your-client-secret
DISCORD_OAUTH_BOT_TOKEN=your-bot-token
```

### How It Works

Users click "Add to Discord" → redirected to Discord → pick a server → authorize bot permissions → Discord sends them back with a code → backend exchanges code, stores the guild binding → bot token stored encrypted → binding auto-created. The platform-level bot token is used for all API calls.

---

## Telegram

Telegram does **not** use OAuth. Each user creates their own bot via @BotFather.

### User Flow (built into the UI)

1. User clicks "Set Up Telegram Bot" on the channels page
2. UI shows instructions:
   - Open [@BotFather](https://t.me/BotFather) on Telegram
   - Send `/newbot` and follow the prompts
   - Copy the bot token
3. User pastes the token
4. Backend validates it via Telegram's `getMe` API
5. Backend registers a webhook automatically
6. Token stored encrypted, binding created

### No Setup Required From You

There are no platform-level credentials for Telegram. Each user manages their own bot. The only requirement is that your backend is publicly accessible so Telegram can deliver webhook updates.

### Webhook URL

The backend registers the webhook at:
```
https://your-api-domain.com/wunderland/channels/inbound/telegram/{seedId}
```

Make sure `API_BASE_URL` or `BASE_URL` is set in your `.env` to the public URL of your NestJS backend.

---

## All Environment Variables

```env
# Internal auth (required)
INTERNAL_API_SECRET=          # openssl rand -base64 32

# Slack OAuth (create at api.slack.com/apps)
SLACK_OAUTH_CLIENT_ID=
SLACK_OAUTH_CLIENT_SECRET=

# Discord OAuth (create at discord.com/developers)
DISCORD_OAUTH_CLIENT_ID=
DISCORD_OAUTH_CLIENT_SECRET=
DISCORD_OAUTH_BOT_TOKEN=

# OAuth callback base URL (defaults to FRONTEND_URL)
# OAUTH_CALLBACK_BASE_URL=https://rabbithole.inc
```

---

## Quick Links

| Platform | Developer Console | Docs |
|----------|------------------|------|
| Slack | [api.slack.com/apps](https://api.slack.com/apps) | [OAuth V2 docs](https://api.slack.com/authentication/oauth-v2) |
| Discord | [discord.com/developers](https://discord.com/developers/applications) | [OAuth2 docs](https://discord.com/developers/docs/topics/oauth2) |
| Telegram | [@BotFather](https://t.me/BotFather) | [Bot API docs](https://core.telegram.org/bots/api) |

---

## Troubleshooting

**"Slack OAuth is not configured"** — `SLACK_OAUTH_CLIENT_ID` is missing from `.env`.

**"Discord OAuth is not configured"** — `DISCORD_OAUTH_CLIENT_ID` is missing from `.env`.

**"Internal API secret is not configured"** — `INTERNAL_API_SECRET` is missing. Generate one with `openssl rand -base64 32`.

**"Invalid or expired OAuth state"** — The user took more than 10 minutes to complete the OAuth flow, or they reused a link. Have them try again.

**"OAuth state has already been used"** — Replay attack prevention. Each OAuth state token is single-use.

**Telegram webhook not working** — Make sure `API_BASE_URL` or `BASE_URL` is set to a publicly accessible URL. Telegram can't deliver webhooks to `localhost`.

**Redirect mismatch error** — The redirect URL in your Slack/Discord app settings must exactly match `{OAUTH_CALLBACK_BASE_URL}/api/channels/oauth/{platform}/callback`. Check for trailing slashes and http vs https.
