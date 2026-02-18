---
sidebar_position: 17
---

# Extension Ecosystem

Wunderland agents are extended through a modular **extension system** powered by AgentOS. Extensions add capabilities like web search, voice synthesis, messaging channels, guardrails, and more. This guide covers the available extension kinds, the built-in extension catalog, and how to write your own.

## Extension Kinds

Every extension declares a `kind` that determines how it integrates with the agent pipeline:

| Kind | Constant | Description |
|------|----------|-------------|
| **Tool** | `EXTENSION_KIND_TOOL` | Callable tools the agent can invoke (e.g., web search, image generation) |
| **Guardrail** | `EXTENSION_KIND_GUARDRAIL` | Input/output validation and safety checks |
| **Response Processor** | `EXTENSION_KIND_RESPONSE_PROCESSOR` | Post-processing of agent responses |
| **Workflow** | `EXTENSION_KIND_WORKFLOW` | Multi-step orchestration flows |
| **Workflow Executor** | `EXTENSION_KIND_WORKFLOW_EXECUTOR` | Runtime engine for executing workflows |
| **Persona** | `EXTENSION_KIND_PERSONA` | Personality and behavior overlays |
| **Planning Strategy** | `EXTENSION_KIND_PLANNING_STRATEGY` | Task decomposition and planning algorithms |
| **HITL Handler** | `EXTENSION_KIND_HITL_HANDLER` | Human-in-the-loop approval flows |
| **Communication Channel** | `EXTENSION_KIND_COMM_CHANNEL` | Internal agent-to-agent communication |
| **Memory Provider** | `EXTENSION_KIND_MEMORY_PROVIDER` | Long-term memory storage backends |
| **Messaging Channel** | `EXTENSION_KIND_MESSAGING_CHANNEL` | External messaging platforms (Telegram, Discord, etc.) |
| **Provenance** | `EXTENSION_KIND_PROVENANCE` | Output provenance tracking and attribution |

## Available Tool Extensions

### Search

| Extension | Description | Required Key |
|-----------|-------------|--------------|
| **web-search** (Serper) | Google-like search results via Serper.dev | `SERPER_API_KEY` |
| **web-search** (SerpAPI) | Web search via SerpAPI | `SERPAPI_API_KEY` |
| **web-search** (Brave) | Privacy-focused search via Brave Search | `BRAVE_API_KEY` |
| **news-search** | News article search via NewsAPI | `NEWSAPI_API_KEY` |

### Media

| Extension | Description | Required Key |
|-----------|-------------|--------------|
| **giphy** | GIF search and sharing | `GIPHY_API_KEY` |
| **pexels** | Stock photo search | `PEXELS_API_KEY` |
| **unsplash** | High-quality stock photos | `UNSPLASH_ACCESS_KEY` |
| **pixabay** | Stock images and video | `PIXABAY_API_KEY` |

### Voice & Audio

| Extension | Description | Required Key |
|-----------|-------------|--------------|
| **voice-synthesis** (ElevenLabs) | Text-to-speech with realistic voices | `ELEVENLABS_API_KEY` |

### Browser & Automation

| Extension | Description | Required Key |
|-----------|-------------|--------------|
| **web-browser** | Playwright-based browser automation | None (local) |
| **cli-executor** | System command execution (sandboxed) | None (local) |

## Available Voice Providers

Wunderland supports three telephony/voice providers for real-time voice conversations:

| Provider | Description | Required Keys |
|----------|-------------|---------------|
| **Twilio** | Industry-standard voice and SMS | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| **Telnyx** | Developer-friendly Call Control v2 | `TELNYX_API_KEY`, `TELNYX_CONNECTION_ID`, `TELNYX_PUBLIC_KEY`, `TELNYX_PHONE_NUMBER` |
| **Plivo** | Cost-effective voice and messaging | `PLIVO_AUTH_ID`, `PLIVO_AUTH_TOKEN`, `PLIVO_PHONE_NUMBER` |

Configure voice providers with:

```bash
wunderland voice setup
```

## Available Productivity Extensions

### Google Workspace

| Extension | Description | Required Keys |
|-----------|-------------|---------------|
| **Google Calendar** | Read/write calendar events | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` |
| **Gmail** | Read/send email via Gmail API | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` |

## The Extension Registry

Extensions are discovered and loaded through the **curated manifest** system:

```typescript
import { createCuratedManifest } from '@framers/agentos-extensions-registry';

const manifest = createCuratedManifest({
  // Enable specific extension categories
  search: true,
  media: true,
  voice: true,
  browser: true,
  productivity: true,

  // Or enable individual extensions
  extensions: ['web-search', 'giphy', 'voice-synthesis'],

  // Pass credentials for validation
  secrets: {
    SERPER_API_KEY: process.env.SERPER_API_KEY,
    GIPHY_API_KEY: process.env.GIPHY_API_KEY,
  },
});
```

The `createCuratedManifest()` function:

1. **Scans** the curated registry directory for available extensions
2. **Filters** by the requested categories or explicit extension list
3. **Validates** that required secrets are present for each extension
4. **Returns** an array of `ExtensionDescriptor` objects ready for registration

### Loading Extensions into AgentOS

```typescript
import { AgentOS } from '@framers/agentos';

const agent = new AgentOS(seed);

// Load all extensions from the manifest
for (const descriptor of manifest) {
  agent.extensionManager.register(descriptor);
}
```

## Writing Custom Extensions

### Tool Extension

A tool extension implements the `ITool` interface and is registered with the `tool` kind:

```typescript
import { ITool, EXTENSION_KIND_TOOL, ExtensionDescriptor } from '@framers/agentos';

const myTool: ITool = {
  name: 'weather-lookup',
  description: 'Look up current weather for a location',

  // JSON Schema for the tool's input parameters
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City name or coordinates' },
    },
    required: ['location'],
  },

  async execute(params: { location: string }) {
    const response = await fetch(
      `https://api.weather.example/v1/current?q=${encodeURIComponent(params.location)}`
    );
    const data = await response.json();
    return {
      temperature: data.temp,
      conditions: data.conditions,
      humidity: data.humidity,
    };
  },
};

// Create the extension descriptor
const weatherDescriptor: ExtensionDescriptor<ITool> = {
  kind: EXTENSION_KIND_TOOL,
  id: 'weather-lookup',
  name: 'Weather Lookup',
  version: '1.0.0',
  instance: myTool,
};
```

### Guardrail Extension

A guardrail extension validates inputs and outputs:

```typescript
import {
  IGuardrailService,
  EXTENSION_KIND_GUARDRAIL,
  ExtensionDescriptor,
} from '@framers/agentos';

const profanityGuardrail: IGuardrailService = {
  name: 'profanity-filter',

  async validateInput(input: string): Promise<{ allowed: boolean; reason?: string }> {
    const hasProfanity = checkForProfanity(input); // your logic
    return {
      allowed: !hasProfanity,
      reason: hasProfanity ? 'Input contains profanity' : undefined,
    };
  },

  async validateOutput(output: string): Promise<{ allowed: boolean; reason?: string }> {
    const hasProfanity = checkForProfanity(output);
    return {
      allowed: !hasProfanity,
      reason: hasProfanity ? 'Output contains profanity' : undefined,
    };
  },
};

const profanityDescriptor: ExtensionDescriptor<IGuardrailService> = {
  kind: EXTENSION_KIND_GUARDRAIL,
  id: 'profanity-filter',
  name: 'Profanity Filter',
  version: '1.0.0',
  instance: profanityGuardrail,
};
```

### Registering Custom Extensions

```typescript
const agent = new AgentOS(seed);

// Register custom extensions alongside curated ones
agent.extensionManager.register(weatherDescriptor);
agent.extensionManager.register(profanityDescriptor);
```

## Extension Lifecycle

Extensions follow a predictable lifecycle:

1. **Discovery**: `createCuratedManifest()` scans for available extensions
2. **Registration**: `extensionManager.register(descriptor)` adds to the internal registry
3. **Activation**: Extensions are activated when the agent starts (emits `descriptor:activated` event)
4. **Execution**: Tools are called by the LLM, guardrails run on every turn, etc.
5. **Deactivation**: Extensions are deactivated when the agent stops (emits `descriptor:deactivated` event)

:::tip
Use the `descriptor:activated` and `descriptor:deactivated` events to manage extension-specific resources like database connections or WebSocket clients.
:::
