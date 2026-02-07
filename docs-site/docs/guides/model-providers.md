---
sidebar_position: 22
title: Model Providers
description: All 13 supported LLM providers with setup instructions and model lists
---

# Model Providers

Wunderland supports **13 LLM providers** out of the box, from cloud APIs to local inference with Ollama. Each provider is identified by a string ID used throughout the configuration system.

## Provider Overview

| Provider | ID | Env Variable | Default Model | Small Model |
|----------|----|-------------|---------------|-------------|
| OpenAI | `openai` | `OPENAI_API_KEY` | `gpt-4o` | `gpt-4o-mini` |
| Anthropic | `anthropic` | `ANTHROPIC_API_KEY` | `claude-sonnet-4-5-20250929` | `claude-haiku-4-5-20251001` |
| Ollama | `ollama` | *(none -- local)* | `llama3` | `llama3.2:3b` |
| AWS Bedrock | `bedrock` | `AWS_ACCESS_KEY_ID` | `anthropic.claude-sonnet` | `anthropic.claude-haiku` |
| Google Gemini | `gemini` | `GEMINI_API_KEY` | `gemini-2.0-flash` | `gemini-2.0-flash-lite` |
| GitHub Copilot | `github-copilot` | `GITHUB_COPILOT_TOKEN` | `gpt-4o` | `gpt-4o-mini` |
| Minimax | `minimax` | `MINIMAX_API_KEY` | `MiniMax-M2.1` | `MiniMax-VL-01` |
| Qwen | `qwen` | `QWEN_API_KEY` | `qwen-max` | `qwen-turbo` |
| Moonshot | `moonshot` | `MOONSHOT_API_KEY` | `kimi-k2.5` | `kimi-k2-instant` |
| Venice | `venice` | `VENICE_API_KEY` | `venice-default` | `venice-fast` |
| Cloudflare AI | `cloudflare-ai` | `CLOUDFLARE_API_TOKEN` | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | `@cf/meta/llama-3.1-8b-instruct` |
| Xiaomi Mimo | `xiaomi-mimo` | `XIAOMI_API_KEY` | `mimo-v2-flash` | `mimo-v2-flash` |
| OpenRouter | `openrouter` | `OPENROUTER_API_KEY` | `auto` | `auto` |

## Provider Details

### OpenAI

Industry-standard cloud LLM provider with GPT-4o and o-series models.

**Setup:**

1. Get an API key from [platform.openai.com](https://platform.openai.com/account/api-keys)
2. Set the environment variable:

```bash
export OPENAI_API_KEY="sk-..."
```

**Available Models:** `gpt-4o-mini`, `gpt-4o`, `gpt-4.1-mini`, `gpt-4.1`, `o4-mini`

**Best for:** General-purpose agents, high-quality reasoning, function calling.

---

### Anthropic

Claude family of models, known for strong reasoning and long context windows.

**Setup:**

1. Get an API key from [console.anthropic.com](https://console.anthropic.com/settings/keys)
2. Set the environment variable:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

**Available Models:** `claude-sonnet-4-5-20250929`, `claude-haiku-4-5-20251001`, `claude-opus-4-6`

**Best for:** Long-context analysis, nuanced reasoning, safety-conscious deployments.

---

### Ollama (Local)

Run models locally with zero API costs. Requires Ollama installed on your machine.

**Setup:**

1. Install Ollama: [ollama.ai](https://ollama.ai/)
2. Pull a model:

```bash
ollama pull llama3
ollama pull llama3.2:3b  # Small model for routing/sentiment
```

3. No API key needed -- Ollama runs on `localhost:11434` by default.

**Available Models:** `llama3`, `llama3.2:3b`, `mistral`, `codellama`, and any model available in the Ollama library.

**Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server URL |

**Best for:** Privacy-first deployments, offline use, development, cost-sensitive projects.

See the [Ollama Local Setup](./ollama-local.md) guide for detailed instructions.

---

### AWS Bedrock

Access foundation models through your AWS account with IAM-based authentication.

**Setup:**

1. Configure AWS credentials:

```bash
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_REGION="us-east-1"
```

2. Ensure your IAM role has Bedrock model access permissions.

**Available Models:** `anthropic.claude-sonnet`, `anthropic.claude-haiku`

**Best for:** Enterprise AWS environments, compliance requirements, existing AWS infrastructure.

See the [AWS Bedrock documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/) for IAM setup.

---

### Google Gemini

Google's Gemini family of models accessed through AI Studio.

**Setup:**

1. Get an API key from [AI Studio](https://aistudio.google.com/apikey)
2. Set the environment variable:

```bash
export GEMINI_API_KEY="AI..."
```

**Available Models:** `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-2.5-pro`

**Best for:** Multimodal tasks, Google ecosystem integration, cost-effective inference.

---

### GitHub Copilot

Use GitHub Copilot's API with your Copilot subscription.

**Setup:**

1. Ensure you have an active GitHub Copilot subscription
2. Get a token from [GitHub Copilot settings](https://github.com/settings/copilot)

```bash
export GITHUB_COPILOT_TOKEN="ghu_..."
```

**Available Models:** `gpt-4o`, `gpt-4o-mini`

**Best for:** Developers with existing Copilot subscriptions, code-focused agents.

---

### Minimax

Chinese AI provider with strong multilingual capabilities.

**Setup:**

1. Get an API key from [Minimax Platform](https://platform.minimaxi.com/)

```bash
export MINIMAX_API_KEY="..."
```

**Available Models:** `MiniMax-M2.1`, `MiniMax-VL-01`

**Best for:** Chinese language tasks, vision-language applications.

---

### Qwen

Alibaba's Qwen family of large language models.

**Setup:**

1. Get an API key from [Qwen Portal](https://portal.qwen.ai/)

```bash
export QWEN_API_KEY="..."
```

**Available Models:** `qwen-max`, `qwen-turbo`

**Best for:** Chinese and multilingual tasks, cost-effective Asian market deployments.

---

### Moonshot

Moonshot AI's Kimi models with strong reasoning capabilities.

**Setup:**

1. Get an API key from [Moonshot Platform](https://platform.moonshot.cn/)

```bash
export MOONSHOT_API_KEY="..."
```

**Available Models:** `kimi-k2.5`, `kimi-k2-instant`

**Best for:** Long-context tasks, Chinese language support.

---

### Venice

Privacy-focused AI provider with uncensored model access.

**Setup:**

1. Get an API key from [Venice Settings](https://venice.ai/settings/api)

```bash
export VENICE_API_KEY="..."
```

**Available Models:** `venice-default`, `venice-fast`

**Best for:** Privacy-focused deployments, uncensored research.

---

### Cloudflare AI Gateway

Run models at the edge through Cloudflare's AI Gateway.

**Setup:**

1. Get an API token from [Cloudflare Dashboard](https://developers.cloudflare.com/ai-gateway/)

```bash
export CLOUDFLARE_API_TOKEN="..."
export CLOUDFLARE_ACCOUNT_ID="..."
```

**Available Models:** Configurable -- any model available through the Cloudflare AI catalog (e.g., `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, `@cf/meta/llama-3.1-8b-instruct`).

**Best for:** Edge deployments, global low-latency, Cloudflare ecosystem.

---

### Xiaomi Mimo

Xiaomi's AI model platform.

**Setup:**

1. Get an API key from [Xiaomi Developer Portal](https://dev.mi.com/mimo)

```bash
export XIAOMI_API_KEY="..."
```

**Available Models:** `mimo-v2-flash`

**Best for:** IoT integration, Xiaomi ecosystem.

---

### OpenRouter

Meta-provider that routes to the best available model across providers. Uses automatic model selection by default.

**Setup:**

1. Get an API key from [OpenRouter](https://openrouter.ai/keys)

```bash
export OPENROUTER_API_KEY="..."
```

**Available Models:** `auto` (routes automatically), plus any model from the [OpenRouter model list](https://openrouter.ai/models).

**Best for:** Multi-provider fallback, cost optimization, accessing many models through one API.

---

## SmallModelResolver

The `SmallModelResolver` automatically selects the cheapest/fastest model for lightweight tasks like sentiment analysis, style profiling, and security auditing. It is used internally by:

- `LLMSentimentAnalyzer` for mood/sentiment analysis
- `StyleAdaptationEngine` for communication style profiling
- `WunderlandSecurityPipeline` DualLLM auditor for security checks

### Usage

```typescript
import { SmallModelResolver } from 'wunderland';

const resolver = new SmallModelResolver({
  primaryProvider: 'openai',
});

// Get the small/fast model
const small = resolver.resolveSmall();
// => { providerId: 'openai', modelId: 'gpt-4o-mini' }

// Get the default/powerful model
const primary = resolver.resolveDefault();
// => { providerId: 'openai', modelId: 'gpt-4o' }
```

### Override and Fallback

```typescript
const resolver = new SmallModelResolver({
  primaryProvider: 'anthropic',

  // Override the small model (instead of using the built-in mapping)
  smallModelOverride: 'claude-haiku-4-5-20251001',

  // Fallback provider if primary is unavailable
  fallbackProvider: 'ollama',
  fallbackSmallModelOverride: 'llama3.2:3b',
});
```

### Small Model Mapping

The complete built-in mapping from provider to small model:

| Provider | Small Model |
|----------|-------------|
| `openai` | `gpt-4o-mini` |
| `anthropic` | `claude-haiku-4-5-20251001` |
| `ollama` | `llama3.2:3b` |
| `openrouter` | `auto` |
| `bedrock` | `anthropic.claude-haiku` |
| `gemini` | `gemini-2.0-flash-lite` |
| `github-copilot` | `gpt-4o-mini` |
| `minimax` | `MiniMax-VL-01` |
| `qwen` | `qwen-turbo` |
| `moonshot` | `kimi-k2-instant` |
| `venice` | `venice-fast` |
| `cloudflare-ai` | `@cf/meta/llama-3.1-8b-instruct` |
| `xiaomi-mimo` | `mimo-v2-flash` |

### Checking Provider Support

```typescript
// Check if a provider is in the known mapping
SmallModelResolver.isKnownProvider('openai'); // true
SmallModelResolver.isKnownProvider('custom'); // false

// Get the full mapping
const map = SmallModelResolver.getSmallModelMap();
```

## CLI Commands

```bash
# List all providers and their available models
wunderland models

# Set default provider and model
wunderland models set-default openai gpt-4o

# Test provider connectivity
wunderland models test ollama
wunderland models test openai
```

## Related

- [Inference Routing](./inference-routing.md) -- how models are selected per request
- [Ollama Local Setup](./ollama-local.md) -- running models locally
- [LLM Sentiment Analysis](./llm-sentiment.md) -- uses SmallModelResolver
- [Style Adaptation](./style-adaptation.md) -- uses SmallModelResolver
