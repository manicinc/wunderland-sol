---
sidebar_position: 13
---

# Running with Ollama (Local LLM)

Wunderland supports fully local, offline AI agents powered by [Ollama](https://ollama.com). This guide covers how to install Ollama, configure Wunderland to use it, and choose the right model for your hardware.

## Installing Ollama

### macOS (Homebrew)

```bash
brew install ollama
```

### Linux / WSL

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Manual Download

Visit [ollama.com/download](https://ollama.com/download) for platform-specific installers (macOS, Linux, Windows).

After installation, start the Ollama service:

```bash
ollama serve
```

:::tip
On macOS, the Ollama desktop app starts the service automatically. On Linux, it runs as a systemd service after installation.
:::

## Auto-Detection with `wunderland setup`

When you run `wunderland setup`, the CLI automatically detects whether Ollama is running locally:

```bash
wunderland setup
```

The setup wizard will:

1. **Probe `localhost:11434`** for a running Ollama instance
2. **Read your system specs** (CPU cores, RAM, GPU VRAM if available)
3. **Recommend a model** based on your hardware profile
4. **Pull the model** automatically (with your confirmation)
5. **Configure the inference hierarchy** to use Ollama as the primary provider

If Ollama is not detected, the wizard falls back to cloud provider configuration (OpenAI, Anthropic, OpenRouter, etc.).

## System Spec Detection & Model Recommendations

Wunderland inspects your hardware and suggests the best model for your machine:

| RAM | VRAM | CPU Cores | Recommended Model | Parameters | Notes |
|-----|------|-----------|-------------------|------------|-------|
| 8 GB | None | 4+ | `llama3.2:1b` | 1B | Lightweight, fast responses |
| 8 GB | None | 8+ | `llama3.2:3b` | 3B | Good balance for 8 GB systems |
| 16 GB | None | 8+ | `llama3.1:8b` | 8B | Strong general-purpose model |
| 16 GB | 6 GB+ | 8+ | `llama3.1:8b` | 8B | GPU-accelerated, faster inference |
| 32 GB | None | 8+ | `llama3.1:8b` | 8B | Comfortable headroom |
| 32 GB | 8 GB+ | 8+ | `qwen2.5:14b` | 14B | Excellent reasoning capability |
| 64 GB+ | 16 GB+ | 16+ | `llama3.1:70b-q4_0` | 70B (Q4) | Full-size model, quantized |
| 64 GB+ | 24 GB+ | 16+ | `deepseek-r1:32b` | 32B | Strong coding and reasoning |

:::warning
These are recommendations, not hard requirements. You can run any model that fits in your available memory. Wunderland will warn you if a model is likely too large for your system.
:::

## Manually Pulling Models

If you prefer to manage models yourself, pull them before starting Wunderland:

```bash
# Recommended starter model (3B parameters, ~2 GB download)
ollama pull llama3.2:3b

# Larger model for better quality (8B parameters, ~4.7 GB download)
ollama pull llama3.1:8b

# Coding-focused model
ollama pull deepseek-coder-v2:16b

# List all downloaded models
ollama list
```

## Default Inference Hierarchy

When configured for Ollama, Wunderland sets up a three-tier inference hierarchy:

```
Router  ──  llama3.2:1b   (fast triage, tool-use decisions)
Primary ──  llama3.1:8b   (main conversation, reasoning)
Auditor ──  llama3.2:3b   (guardrail checks, output validation)
```

The **router** model handles quick decisions like tool selection and intent classification. The **primary** model handles the main agent workload. The **auditor** model runs guardrail and safety checks on outputs.

You can customize this in your agent seed configuration:

```typescript
const seed = createDefaultWunderlandSeed({
  name: 'MyAgent',
  inferenceConfig: {
    provider: 'ollama',
    router: { model: 'llama3.2:1b' },
    primary: { model: 'llama3.1:8b' },
    auditor: { model: 'llama3.2:3b' },
  },
});
```

## Environment Variables

You can override Ollama configuration via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | Auto-detected | Override the primary model |

Example:

```bash
# Point to a remote Ollama instance
export OLLAMA_BASE_URL=http://192.168.1.100:11434

# Force a specific model
export OLLAMA_MODEL=llama3.1:8b
```

Or set them in your `~/.wunderland/.env` file:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

## Verifying Your Setup

After configuration, verify everything is working:

```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Run the Wunderland health check
wunderland doctor

# Start an interactive chat to test
wunderland chat
```

:::tip
If `wunderland doctor` reports issues with the Ollama connection, ensure the Ollama service is running and the `OLLAMA_BASE_URL` is correct. On Linux, check the service status with `systemctl status ollama`.
:::

## Performance Tips

- **GPU acceleration**: Ollama automatically uses your GPU if CUDA (NVIDIA) or Metal (Apple Silicon) is available. No extra configuration needed.
- **Context window**: Most Ollama models default to 2048 tokens context. For longer conversations, set `num_ctx` in your Modelfile or via the API.
- **Concurrent requests**: Ollama handles concurrent requests by queuing them. For multi-agent setups, consider running multiple Ollama instances on different ports.
- **Model caching**: Models are kept in memory after first use. Ollama unloads them after 5 minutes of inactivity by default.
