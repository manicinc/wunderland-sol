---
sidebar_position: 14
---

# Bulk API Key Import

Wunderland supports importing multiple API keys at once by pasting a `.env` block during setup. This is useful when migrating from another project or setting up a new machine quickly.

## Using `wunderland setup`

During the interactive setup wizard, you will be prompted with the option to paste a `.env` block:

```bash
wunderland setup
```

When you reach the API key configuration step, select **"Paste .env block"** instead of entering keys one by one. The wizard accepts standard `.env` format:

```
OPENAI_API_KEY=sk-proj-abc123...
ANTHROPIC_API_KEY=sk-ant-abc123...
SERPER_API_KEY=abc123...
TELEGRAM_BOT_TOKEN=1234567890:ABCdef...
```

The CLI will:

1. **Parse** all recognized key-value pairs
2. **Validate** the format of each key (prefix checks where applicable)
3. **Display a summary** showing which keys were detected
4. **Store them** securely at `~/.wunderland/.env`

:::tip
Lines starting with `#` are treated as comments and ignored. Blank lines are also skipped. Both `KEY=value` and `KEY="value"` formats are supported.
:::

## Supported Keys

Wunderland recognizes the following 22 environment variable keys from its extension secrets registry:

### LLM Providers

| Environment Variable | Description | Required |
|---------------------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key (GPT-4o family) | Yes (if using OpenAI) |
| `OPENROUTER_API_KEY` | OpenRouter API key (multi-provider fan-out) | Yes (if using OpenRouter) |
| `ANTHROPIC_API_KEY` | Anthropic API key (Claude models) | Optional |

### Search & Media

| Environment Variable | Description | Required |
|---------------------|-------------|----------|
| `SERPER_API_KEY` | Serper.dev API key (Google-like search) | Optional |
| `SERPAPI_API_KEY` | SerpAPI key (web search) | Optional |
| `BRAVE_API_KEY` | Brave Search API key | Optional |
| `NEWSAPI_API_KEY` | NewsAPI key (news search) | Optional |
| `GIPHY_API_KEY` | Giphy API key (GIF search) | Optional |
| `PEXELS_API_KEY` | Pexels API key (stock photos) | Optional |
| `UNSPLASH_ACCESS_KEY` | Unsplash access key (stock photos) | Optional |
| `PIXABAY_API_KEY` | Pixabay API key (stock images/video) | Optional |

### Voice & TTS

| Environment Variable | Description | Required |
|---------------------|-------------|----------|
| `ELEVENLABS_API_KEY` | ElevenLabs API key (voice synthesis) | Optional |

### Messaging Channels

| Environment Variable | Description | Required |
|---------------------|-------------|----------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather | Optional |
| `DISCORD_BOT_TOKEN` | Discord bot token | Optional |
| `SLACK_BOT_TOKEN` | Slack bot OAuth token (`xoxb-*`) | Optional |
| `SLACK_APP_TOKEN` | Slack app-level token (`xapp-*`) for Socket Mode | Optional |
| `SLACK_SIGNING_SECRET` | Slack signing secret for webhook verification | Optional |
| `WHATSAPP_SESSION_DATA` | WhatsApp Web/Baileys session credentials | Optional |
| `SIGNAL_PHONE_NUMBER` | Signal phone number for signal-cli bridge | Optional |

### Google Workspace

| Environment Variable | Description | Required |
|---------------------|-------------|----------|
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID | Optional |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret | Optional |
| `GOOGLE_REFRESH_TOKEN` | Google OAuth 2.0 refresh token | Optional |

:::warning
The full list above covers the core extension secrets. Additional platform-specific keys (iMessage, Google Chat, Teams, Matrix, Twilio, Telnyx, Plivo, Zalo, Email/SMTP) are also supported. See the [Messaging Channels](/docs/guides/channels) guide for the complete list of per-platform secrets.
:::

## Example `.env` Block

Here is a complete example showing a typical multi-provider configuration:

```env title="~/.wunderland/.env"
# ── LLM Providers ──
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ── Search ──
SERPER_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BRAVE_API_KEY=BSAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ── Media ──
GIPHY_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
ELEVENLABS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ── Messaging ──
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ
DISCORD_BOT_TOKEN=your-discord-bot-token-here

# ── Google Workspace ──
GOOGLE_CLIENT_ID=123456789-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_REFRESH_TOKEN=1//xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## How Keys Are Stored

All imported keys are written to `~/.wunderland/.env` with restricted file permissions:

- **Location**: `~/.wunderland/.env`
- **Permissions**: `0o600` (owner read/write only)
- **Format**: Standard `.env` (one `KEY=value` per line)

```bash
# Verify permissions
ls -la ~/.wunderland/.env
# -rw------- 1 user user 1234 Jan 15 10:30 ~/.wunderland/.env
```

:::warning
Never commit your `~/.wunderland/.env` file to version control. The `.wunderland` directory is in your home folder specifically to keep it outside any project repository.
:::

## Updating Keys After Setup

You can re-run the import at any time:

```bash
# Re-run setup to update keys
wunderland setup

# Or edit the file directly
nano ~/.wunderland/.env
```

When re-running setup, existing keys are preserved. New keys are added, and updated keys overwrite the previous values. Keys that are not included in the new paste are left unchanged.

## Smart Config Widget (Workspace)

The **Smart Config** widget in the [Workspace](/app/workspace) provides an AI-powered alternative to manual key entry. Instead of configuring credentials one by one, paste your entire `.env` block and let GPT-4o automatically identify and map each key.

### How It Works

1. **Paste or upload** your `.env` file, JSON config, or any block of API keys
2. **AI identification** — GPT-4o analyzes key names and value patterns (prefixes + length) to identify each credential type
3. **Preview** — Review the proposed mappings with confidence scores before applying
4. **Apply** — Saves credentials, enables matching extensions, and sets the suggested LLM provider

### Supported Formats

The widget parser accepts multiple formats:

```bash
# Standard .env
OPENAI_API_KEY=sk-proj-abc123...
TELEGRAM_BOT_TOKEN=1234567890:ABCdef...

# With export prefix
export SERPER_API_KEY=abc123...

# JSON objects
{"openaiKey": "sk-proj-...", "telegramBot": "123:ABC..."}

# YAML-style
GIPHY_API_KEY: abcdef1234567890
```

### Security

Your secret values **never leave the browser**. Only key names and value hints (first 4 characters + length) are sent to the mapping API. Actual secret values are sent directly from the client to the credential vault.

| Data | Sent to AI | Sent to Vault |
|------|-----------|---------------|
| Key name (e.g., `OPENAI_API_KEY`) | Yes | No |
| Value hint (e.g., `sk-p... (len: 51)`) | Yes | No |
| Actual secret value | **No** | Yes |

### Opening the Widget

- **Workspace**: Click the **+** button → select "Smart Config" from the Tools category
- **Quick Actions**: Click "Import Keys" in the Quick Actions widget

:::tip
Keys that are already saved as credentials for the selected agent are automatically detected and marked as "EXISTS" in the preview. They're unchecked by default to prevent duplicates.
:::

## Programmatic Import

If you need to import keys from a script or CI pipeline:

```bash
# Copy an existing .env file
cp /path/to/my-keys.env ~/.wunderland/.env
chmod 600 ~/.wunderland/.env
```

Then verify with:

```bash
wunderland doctor
```

The doctor command checks that all configured providers have valid credentials and reports any missing or malformed keys.
