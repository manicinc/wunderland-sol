---
sidebar_position: 2
---

# CLI Command Reference

Complete reference for the `wunderland` command-line interface.

## Commands

### `wunderland setup`

Interactive onboarding wizard that guides you through initial configuration.

```bash
wunderland setup
```

The setup wizard:

- Detects available LLM providers (Ollama local, OpenAI, Anthropic, OpenRouter)
- Reads system specs for model recommendations
- Accepts bulk `.env` paste for API key import
- Creates the agent seed configuration
- Stores everything at `~/.wunderland/`

**Options:**

| Flag | Description |
|------|-------------|
| `--provider <name>` | Skip provider selection (e.g., `ollama`, `openai`, `anthropic`) |
| `--model <name>` | Skip model selection (e.g., `llama3.1:8b`, `gpt-4o`) |
| `--non-interactive` | Use defaults for all prompts (combine with `--provider` and `--model`) |

---

### `wunderland init <name>`

Scaffold a new Wunderland agent project in a directory.

```bash
wunderland init my-agent
```

Creates a project structure:

```
my-agent/
  seed.config.ts       # Agent seed configuration
  extensions/          # Custom extension directory
  .env.example         # Example environment variables
  package.json         # Node.js package manifest
  tsconfig.json        # TypeScript configuration
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `<name>` | Project directory name (also used as default agent name) |

**Options:**

| Flag | Description |
|------|-------------|
| `--template <name>` | Project template (`default`, `minimal`, `full`) |
| `--no-git` | Skip git initialization |

---

### `wunderland start`

Start the local Wunderland HTTP server and agent runtime.

```bash
wunderland start
```

Launches the agent on port **3777** by default. The server provides:

- REST API at `http://localhost:3777/api/`
- WebSocket gateway for real-time communication
- WebChat interface at `http://localhost:3777/chat`

**Options:**

| Flag | Description |
|------|-------------|
| `--port <number>` | Override the server port (default: `3777`) |
| `--host <address>` | Bind address (default: `0.0.0.0`) |
| `--no-webchat` | Disable the built-in WebChat interface |
| `--detach` | Run in the background (daemonize) |

---

### `wunderland chat`

Open an interactive terminal conversation with your agent.

```bash
wunderland chat
```

Starts a REPL-style chat session. Type messages and receive streamed responses directly in the terminal.

**Options:**

| Flag | Description |
|------|-------------|
| `--no-stream` | Disable streaming (wait for complete response) |
| `--system <prompt>` | Override the system prompt for this session |
| `--model <name>` | Override the primary model for this session |

**Special commands within the REPL:**

| Command | Description |
|---------|-------------|
| `/clear` | Clear the conversation history |
| `/system <prompt>` | Change the system prompt |
| `/model <name>` | Switch the model |
| `/tools` | List available tools |
| `/exit` or `Ctrl+C` | Exit the chat |

---

### `wunderland doctor`

Run health diagnostics on your Wunderland installation.

```bash
wunderland doctor
```

Checks:

- Node.js version compatibility
- Wunderland CLI version (update available?)
- LLM provider connectivity (Ollama, OpenAI, etc.)
- API key validity and format
- SQLite database integrity
- Extension loading status
- Playwright browser installation
- Port availability (3777)
- Disk space for models and data

**Output example:**

```
  Wunderland Doctor

  Node.js ................ v20.11.0   OK
  Wunderland CLI ......... v1.2.3     OK
  Ollama ................. running    OK
    Model: llama3.1:8b .. loaded     OK
  SQLite database ........ healthy    OK
  Extensions ............. 5 loaded   OK
  Playwright ............. installed  OK
  Port 3777 .............. available  OK

  All checks passed.
```

---

### `wunderland channels`

Manage messaging channel bindings.

```bash
# List all channel bindings
wunderland channels list

# Add a new channel
wunderland channels add <platform> [options]

# Remove a channel binding
wunderland channels remove <binding-id>

# Test a channel binding
wunderland channels test <binding-id> --message "Hello"

# Show channel status
wunderland channels status
```

**Supported platforms:** `telegram`, `whatsapp`, `discord`, `slack`, `signal`, `imessage`, `google-chat`, `teams`, `matrix`, `zalo`, `email`, `sms`

See the [Messaging Channels](/docs/guides/channels) guide for platform-specific options.

---

### `wunderland config`

View and manage agent configuration.

```bash
# Show current configuration
wunderland config show

# Set a configuration value
wunderland config set <key> <value>

# Get a configuration value
wunderland config get <key>

# Seal the agent (irreversible)
wunderland config seal

# Export configuration as JSON
wunderland config export > my-agent.json

# Import configuration from JSON
wunderland config import my-agent.json
```

**Common config keys:**

| Key | Description |
|-----|-------------|
| `agent.name` | Agent display name |
| `agent.bio` | Agent biography / description |
| `inference.provider` | LLM provider (`ollama`, `openai`, `anthropic`, `openrouter`) |
| `inference.primary.model` | Primary model name |
| `inference.router.model` | Router model name |
| `inference.auditor.model` | Auditor model name |
| `server.port` | HTTP server port |

---

### `wunderland status`

Display the current agent status.

```bash
wunderland status
```

**Output example:**

```json
{
  "seedId": "abc123",
  "name": "MyAgent",
  "status": "running",
  "sealed": false,
  "provider": "ollama",
  "model": "llama3.1:8b",
  "uptime": "2h 15m",
  "channels": 2,
  "cronJobs": 3,
  "extensions": 5
}
```

**Options:**

| Flag | Description |
|------|-------------|
| `--json` | Output as raw JSON |
| `--verbose` | Include detailed extension and channel info |

---

### `wunderland voice`

Configure voice provider for real-time voice conversations.

```bash
# Interactive voice setup
wunderland voice setup

# Show current voice configuration
wunderland voice status

# Test voice connection
wunderland voice test
```

**Supported providers:** Twilio, Telnyx, Plivo

The setup wizard guides you through provider selection and credential configuration. See the extension-secrets reference for required keys per provider.

---

### `wunderland cron`

Manage scheduled jobs for proactive agent tasks.

```bash
# List all cron jobs
wunderland cron list

# Add a new cron job
wunderland cron add --expression "0 9 * * *" --task "Check morning news"

# Remove a cron job
wunderland cron remove <job-id>

# Pause a cron job
wunderland cron pause <job-id>

# Resume a paused cron job
wunderland cron resume <job-id>

# Show next scheduled runs
wunderland cron next
```

**Cron expression format:** Standard 5-field cron (`minute hour day-of-month month day-of-week`).

| Expression | Schedule |
|------------|----------|
| `0 9 * * *` | Every day at 9:00 AM |
| `*/15 * * * *` | Every 15 minutes |
| `0 0 * * 1` | Every Monday at midnight |
| `0 9,17 * * 1-5` | Weekdays at 9 AM and 5 PM |

---

## Global Flags

These flags are available on all commands:

| Flag | Short | Description |
|------|-------|-------------|
| `--help` | `-h` | Show help for the command |
| `--version` | `-V` | Show the CLI version |
| `--quiet` | `-q` | Suppress non-essential output |
| `--yes` | `-y` | Auto-confirm all prompts |
| `--no-color` | | Disable colored output |
| `--dry-run` | | Show what would be done without making changes |
| `--config <path>` | `-c` | Use a specific config file instead of `~/.wunderland/config.json` |

**Examples:**

```bash
# Auto-confirm all prompts during setup
wunderland setup --yes

# Dry-run a seal operation
wunderland config seal --dry-run

# Use a custom config directory
wunderland start --config /path/to/my-config.json

# Silent mode for scripts
wunderland doctor --quiet
```
