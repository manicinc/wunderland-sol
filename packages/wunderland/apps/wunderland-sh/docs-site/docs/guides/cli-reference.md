---
sidebar_position: 18
title: CLI Reference
description: Full reference for all 17 Wunderland CLI commands
---

# CLI Reference

The `wunderland` CLI is the primary interface for managing agents, channels, models, and configuration. It ships as part of the `wunderland` npm package and is available after global or local installation.

```bash
npm install -g wunderland
wunderland --help
```

## Global Options

These flags are accepted by every command:

| Flag | Short | Description |
|------|-------|-------------|
| `--help` | `-h` | Show help text |
| `--version` | `-v` | Show version |
| `--quiet` | `-q` | Suppress the startup banner |
| `--yes` | `-y` | Auto-accept prompts (headless / CI mode) |
| `--no-color` | | Disable colored output (also: `NO_COLOR` env) |
| `--dry-run` | | Preview changes without writing to disk |
| `--config <path>` | | Override the config directory path |

---

## `wunderland setup`

Interactive onboarding wizard. Walks you through selecting an LLM provider, configuring API keys, choosing a personality preset, and enabling channels.

```bash
wunderland setup
```

This is the recommended entry point for first-time users. It writes `~/.wunderland/config.json` and `~/.wunderland/.env`.

---

## `wunderland init`

Scaffold a new Wunderbot project in the specified directory.

```bash
wunderland init <directory> [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--preset <name>` | Use an agent preset (e.g. `research-assistant`, `code-reviewer`) |
| `--security-tier <tier>` | Security tier (`dangerous`, `permissive`, `balanced`, `strict`, `paranoid`) |
| `--force` | Overwrite existing files |

**Examples:**

```bash
# Scaffold with the research-assistant preset
wunderland init my-agent --preset research-assistant

# Scaffold with strict security and overwrite existing
wunderland init my-agent --preset security-auditor --security-tier strict --force
```

The command creates an `agent.config.json`, `PERSONA.md`, `.env.example`, and boilerplate files in the target directory.

---

## `wunderland start`

Start the local agent server. This launches the HTTP server, WebSocket gateway, and all configured channel adapters.

```bash
wunderland start [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--port <number>` | Server port (default: `PORT` env or `3777`) |
| `--model <id>` | Override the default LLM model |
| `--security-tier <tier>` | Override the security tier |
| `--skills-dir <path>` | Load skills from a custom directory |
| `--no-skills` | Disable skill loading entirely |
| `--dangerously-skip-permissions` | Auto-approve all tool calls |
| `--dangerously-skip-command-safety` | Disable shell command safety checks |

**Example:**

```bash
wunderland start --port 4000 --model gpt-4o --security-tier balanced
```

The WebChat interface is available at `http://localhost:<port>/chat` after startup.

---

## `wunderland chat`

Start an interactive terminal chat session with the agent.

```bash
wunderland chat [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--model <id>` | Override the LLM model for this session |
| `--dangerously-skip-permissions` | Auto-approve tool calls |
| `--dangerously-skip-command-safety` | Disable shell command safety checks |

**Example:**

```bash
wunderland chat --model llama3
```

Type your messages directly in the terminal. Press `Ctrl+C` to exit.

---

## `wunderland doctor`

Health check that validates API keys, tool connectivity, LLM provider availability, and system dependencies.

```bash
wunderland doctor
```

Reports status for:
- LLM provider connectivity (tests each configured provider)
- API key validation
- Ollama installation and model availability
- Channel adapter status
- Skill registry integrity
- System dependencies (Node.js version, required binaries)

---

## `wunderland channels`

Manage messaging channel bindings. Without a subcommand, lists all configured channel bindings.

```bash
wunderland channels              # List all channels
wunderland channels add          # Add a channel interactively
wunderland channels remove <id>  # Remove a channel by binding ID
wunderland channels test <id>    # Send a test message
```

**`channels add` options:**

Specify the platform directly or run interactively:

```bash
wunderland channels add telegram --token "1234567890:ABCdef..."
wunderland channels add discord --token "MTIzNDU2..."
wunderland channels add slack --bot-token "xoxb-..." --app-token "xapp-..."
```

---

## `wunderland config`

View and modify the agent configuration.

```bash
wunderland config                  # Show full current config
wunderland config get <key>        # Get a specific config value
wunderland config set <key> <val>  # Set a config value
```

**Examples:**

```bash
wunderland config get provider
wunderland config set provider openai
wunderland config set model gpt-4o
wunderland config set securityTier strict
```

Configuration is stored in `~/.wunderland/config.json` by default.

---

## `wunderland status`

Show the current agent status, including connection state, active channels, loaded skills, security tier, and model configuration.

```bash
wunderland status
```

Displays:
- Agent seed ID and name
- Active security tier
- Current LLM provider and model
- Connected channels and their status
- Loaded skills
- Uptime (if server is running)

---

## `wunderland voice`

Manage voice/telephony provider configuration.

```bash
wunderland voice          # Show voice provider status
wunderland voice setup    # Interactive voice provider setup
```

Supports Twilio, Telnyx, and Plivo for real-time voice conversations.

---

## `wunderland cron`

Manage scheduled jobs for agent automation.

```bash
wunderland cron             # List scheduled jobs
wunderland cron list        # List scheduled jobs (explicit)
wunderland cron add         # Add a scheduled job interactively
wunderland cron remove <id> # Remove a scheduled job
```

Cron jobs allow agents to perform actions on a schedule (e.g., daily news digest, periodic health checks, social media posts).

---

## `wunderland seal`

Generate an integrity hash for the agent configuration. This creates a cryptographic seal that can be used to verify that the configuration has not been tampered with.

```bash
wunderland seal [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--dir <path>` | Directory containing the agent config to seal |

**Example:**

```bash
wunderland seal --dir ./my-agent
# Output: Sealed: sha256:abc123...
```

The seal is written to `agent.seal.json` and can be verified on subsequent runs.

---

## `wunderland list-presets`

List available agent personality presets and HEXACO profiles.

```bash
wunderland list-presets [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--format <json\|table>` | Output format (default: `table`) |

**Example output:**

```
 Preset                  Description                              Security Tier
 research-assistant      Thorough researcher with analytical      balanced
 customer-support        Patient, empathetic support specialist   strict
 creative-writer         Imaginative storyteller and content      balanced
 code-reviewer           Precise, detail-oriented code analyst    strict
 data-analyst            Systematic data interpreter              balanced
 security-auditor        Vigilant security-focused analyst        paranoid
 devops-assistant        Infrastructure and deployment specialist strict
 personal-assistant      Friendly, organized daily helper         balanced
```

---

## `wunderland skills`

Manage the agent skill registry.

```bash
wunderland skills                  # List loaded skills
wunderland skills list             # List available skills
wunderland skills info <name>      # Show skill details
wunderland skills enable <name>    # Enable a skill
wunderland skills disable <name>   # Disable a skill
```

**Options:**

| Flag | Description |
|------|-------------|
| `--format <json\|table>` | Output format |

Skills extend agent capabilities beyond the built-in tools. See [Skills System](./skills-system.md) for details.

---

## `wunderland models`

Manage LLM providers and models.

```bash
wunderland models                        # List all providers and models
wunderland models set-default <p> <m>    # Set default provider and model
wunderland models test [provider]        # Test provider connectivity
```

**Options:**

| Flag | Description |
|------|-------------|
| `--format <json\|table>` | Output format |

**Examples:**

```bash
# List all 13 supported providers
wunderland models

# Set OpenAI gpt-4o as default
wunderland models set-default openai gpt-4o

# Test Ollama connectivity
wunderland models test ollama
```

See [Model Providers](./model-providers.md) for the full provider list.

---

## `wunderland export`

Export the current agent as a shareable JSON manifest.

```bash
wunderland export [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `-o <path>` | Output file path (default: `agent.manifest.json`) |
| `--dir <path>` | Agent directory to export from (default: current directory) |

**Examples:**

```bash
# Export from current directory
wunderland export

# Export to a specific file
wunderland export -o ~/backups/my-agent.json

# Export from a specific directory
wunderland export --dir ./my-agent -o agent-backup.json
```

The manifest includes HEXACO traits, security configuration, skills, channels, persona text, and an optional `configHash` for sealed agents. See [Agent Serialization](./agent-serialization.md) for the manifest format.

---

## `wunderland import`

Import an agent from a manifest file.

```bash
wunderland import <manifest-path> [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--dir <path>` | Target directory (default: agent name from manifest) |
| `--force` | Overwrite existing files in the target directory |

**Examples:**

```bash
# Import into a new directory named after the agent
wunderland import agent.manifest.json

# Import into a specific directory
wunderland import agent.manifest.json --dir ./my-imported-agent

# Overwrite existing agent
wunderland import agent.manifest.json --dir ./existing-agent --force
```

Importing a sealed agent creates an unsealed copy with a warning. The original integrity hash is preserved in the manifest for reference.

---

## `wunderland plugins`

List installed extension packs and their status.

```bash
wunderland plugins [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--format <json\|table>` | Output format |

Displays all registered extensions grouped by kind (tools, guardrails, channels, etc.). See [Extension Ecosystem](./extensions.md) for details.

---

## Environment Variables

Key environment variables used by the CLI:

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3777) |
| `NO_COLOR` | Disable colored output |
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `OLLAMA_HOST` | Ollama server URL (default: `http://localhost:11434`) |
| `WUNDERLAND_SIGNING_SECRET` | Secret key for output signing |
| `WUNDERLAND_CONFIG_DIR` | Override default config directory |

See [Environment Variables](../deployment/environment-variables.md) for the full list.
