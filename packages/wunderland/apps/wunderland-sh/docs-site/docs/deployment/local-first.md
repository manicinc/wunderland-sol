---
sidebar_position: 4
---

# Local-First & Offline Setup

Wunderland is designed to run entirely on your local machine with **zero cloud dependencies**. This guide walks through a complete local-first installation, from npm install to a fully operational agent.

## Overview

A local-first Wunderland deployment uses:

- **Ollama** for LLM inference (no OpenAI/Anthropic required)
- **SQLite** for all data storage (no external database)
- **Playwright** for browser automation (headless Chromium)
- **Built-in cron scheduler** for proactive tasks
- **WebChat** for conversation (no external messaging platform required)

Everything runs on `localhost`. No data leaves your machine.

## Installation

### Prerequisites

- **Node.js** 18 or later
- **npm** or **pnpm**
- **Ollama** (see below)

### Step 1: Install Wunderland

```bash
npm install -g wunderland
```

Or with pnpm:

```bash
pnpm add -g wunderland
```

Verify the installation:

```bash
wunderland --version
```

### Step 2: Install Ollama

```bash
# macOS
brew install ollama

# Linux / WSL
curl -fsSL https://ollama.com/install.sh | sh
```

Start the Ollama service:

```bash
ollama serve
```

:::tip
On macOS, the Ollama desktop app starts the service automatically in the background. You can also run `ollama serve` manually in a terminal.
:::

### Step 3: Run Setup

```bash
wunderland setup
```

The interactive wizard will:

1. Detect Ollama running on `localhost:11434`
2. Read your system specs (RAM, CPU, GPU)
3. Recommend and pull an appropriate model
4. Create your agent seed configuration
5. Store all config at `~/.wunderland/`

When prompted for the LLM provider, select **Ollama**.

### Step 4: Start the Agent

```bash
wunderland start
```

This launches the Wunderland HTTP server on port **3777**. Your agent is now running.

```
  Wunderland v1.x.x
  Agent: MyAgent
  Provider: Ollama (llama3.1:8b)
  Server: http://localhost:3777
  WebChat: http://localhost:3777/chat
  Status: Running
```

## Interacting with Your Agent

### WebChat (Browser)

Open [http://localhost:3777/chat](http://localhost:3777/chat) in your browser. The built-in WebChat interface connects via WebSocket with streaming responses.

### Terminal Chat

For a CLI-based conversation:

```bash
wunderland chat
```

This opens an interactive REPL where you can chat with your agent directly in the terminal.

### API

Send messages programmatically via the REST API:

```bash
curl -X POST http://localhost:3777/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, what can you help me with?"}'
```

## SQLite Local Storage

All data is stored in a local SQLite database:

```
~/.wunderland/
  .env                 # API keys and secrets (mode 0o600)
  config.json          # Agent seed configuration
  data/
    app.sqlite3        # Conversations, channel bindings, cron jobs, etc.
```

No external database is required. The SQLite database is created automatically on first run.

:::tip
To back up your agent's data, simply copy the `~/.wunderland/` directory. To reset, delete the directory and re-run `wunderland setup`.
:::

## Browser Automation

Wunderland includes a built-in Playwright-based browser automation tool. This allows your agent to:

- Browse web pages and extract content
- Fill forms and click buttons
- Take screenshots
- Execute JavaScript on pages

Browser automation runs in **headless mode** by default (no visible browser window). All browsing happens locally.

```bash
# Ensure Playwright browsers are installed
npx playwright install chromium
```

No additional configuration is needed. The browser tool is available to your agent automatically.

## Cron Scheduler

The built-in cron scheduler lets your agent perform proactive tasks on a schedule:

```bash
# List scheduled jobs
wunderland cron list

# Add a new cron job
wunderland cron add --expression "0 9 * * *" --task "Check morning news"

# Remove a cron job
wunderland cron remove <job-id>
```

Cron jobs are stored in the local SQLite database and persist across restarts. The scheduler runs within the Wunderland process -- no external cron daemon is needed.

## Health Check

Verify everything is working:

```bash
wunderland doctor
```

The doctor command checks:

- Ollama connectivity and model availability
- SQLite database integrity
- Extension loading status
- Port availability (3777)
- Playwright browser installation

## No Cloud Dependency

The local-first setup has **zero network requirements** after initial installation:

| Component | Cloud Version | Local-First Version |
|-----------|--------------|-------------------|
| LLM Inference | OpenAI / Anthropic API | Ollama (local) |
| Database | PostgreSQL / cloud DB | SQLite (local file) |
| Messaging | Telegram, Discord, etc. | WebChat (localhost) |
| Browser | Remote browser service | Playwright (local) |
| Cron | External scheduler | Built-in scheduler |
| Storage | S3 / cloud storage | Local filesystem |

:::warning
Some extensions (web search, news, media) require internet access and API keys to function. These are optional and can be omitted in a fully offline setup. The agent will simply not have access to those tools.
:::

## Updating

```bash
# Update Wunderland CLI
npm update -g wunderland

# Update Ollama models
ollama pull llama3.1:8b
```

Your configuration and data are preserved across updates.
