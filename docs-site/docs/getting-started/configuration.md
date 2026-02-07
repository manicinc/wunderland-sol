---
sidebar_position: 3
---

# Configuration Reference

Complete reference for all Wunderland configuration interfaces, presets, and defaults.

## IWunderlandSeed

The `IWunderlandSeed` interface is the fully resolved agent identity. It extends AgentOS `IPersonaDefinition` with Wunderland-specific fields.

```typescript
interface IWunderlandSeed extends IPersonaDefinition {
  seedId: string;                              // Unique seed identifier
  hexacoTraits: HEXACOTraits;                  // HEXACO personality traits
  securityProfile: SecurityProfile;            // Security configuration
  inferenceHierarchy: InferenceHierarchyConfig;// Model routing config
  stepUpAuthConfig: StepUpAuthorizationConfig;  // HITL authorization config
  channelBindings: ChannelBinding[];           // Channel platform bindings
}
```

You create one via `createWunderlandSeed()`:

```typescript
import {
  createWunderlandSeed,
  type WunderlandSeedConfig,
} from 'wunderland/core';
```

## WunderlandSeedConfig

The input config passed to `createWunderlandSeed()`:

```typescript
interface WunderlandSeedConfig {
  seedId: string;                               // Unique identifier
  name: string;                                 // Human-readable name
  description: string;                          // Purpose description
  hexacoTraits: HEXACOTraits;                   // Personality traits
  securityProfile: SecurityProfile;             // Security settings
  inferenceHierarchy: InferenceHierarchyConfig; // Model routing
  stepUpAuthConfig: StepUpAuthorizationConfig;   // Authorization rules
  channelBindings?: ChannelBinding[];           // Optional channel bindings
  baseSystemPrompt?: string;                    // Optional base prompt (extended by HEXACO)
  allowedToolIds?: string[];                    // Optional tool whitelist
  allowedCapabilities?: string[];               // Optional capability whitelist
}
```

### Convenience constructors

```typescript
import {
  createDefaultWunderlandSeed,
  updateSeedTraits,
} from 'wunderland/core';

// Quick creation with all defaults
const seed = createDefaultWunderlandSeed(
  'Atlas',                         // name
  'Research assistant',            // description
  { conscientiousness: 0.95 }      // optional partial trait overrides
);

// Update traits on an existing seed (returns new seed, immutable)
const updated = updateSeedTraits(seed, {
  openness: 0.9,
  extraversion: 0.3,
});
```

---

## HEXACOTraits

Six personality dimensions, each a `number` from 0.0 to 1.0:

```typescript
interface HEXACOTraits {
  honesty_humility: number;   // Sincerity, fairness, greed-avoidance, modesty
  emotionality: number;       // Fearfulness, anxiety, dependence, sentimentality
  extraversion: number;       // Social boldness, sociability, liveliness
  agreeableness: number;      // Forgiveness, gentleness, flexibility, patience
  conscientiousness: number;  // Organization, diligence, perfectionism, prudence
  openness: number;           // Aesthetic appreciation, inquisitiveness, creativity
}
```

### DEFAULT_HEXACO_TRAITS

```typescript
const DEFAULT_HEXACO_TRAITS: HEXACOTraits = {
  honesty_humility: 0.8,
  emotionality: 0.5,
  extraversion: 0.6,
  agreeableness: 0.7,
  conscientiousness: 0.8,
  openness: 0.7,
};
```

### HEXACO_PRESETS

Five built-in presets for common agent archetypes:

| Preset | H | E | X | A | C | O | Description |
|--------|-----|-----|-----|-----|------|-----|-------------|
| `HELPFUL_ASSISTANT` | 0.85 | 0.50 | 0.60 | 0.80 | 0.85 | 0.65 | Organized, detail-oriented assistant |
| `CREATIVE_THINKER` | 0.70 | 0.60 | 0.70 | 0.60 | 0.50 | 0.95 | Imaginative, unconventional thinker |
| `ANALYTICAL_RESEARCHER` | 0.90 | 0.30 | 0.40 | 0.60 | 0.95 | 0.80 | Precise, systematic researcher |
| `EMPATHETIC_COUNSELOR` | 0.85 | 0.75 | 0.55 | 0.90 | 0.70 | 0.70 | Warm, supportive counselor |
| `DECISIVE_EXECUTOR` | 0.60 | 0.30 | 0.75 | 0.45 | 0.85 | 0.55 | Direct, results-oriented executor |

Column key: **H** = honesty_humility, **E** = emotionality, **X** = extraversion, **A** = agreeableness, **C** = conscientiousness, **O** = openness.

```typescript
import { HEXACO_PRESETS } from 'wunderland/core';

const seed = createWunderlandSeed({
  // ...
  hexacoTraits: HEXACO_PRESETS.ANALYTICAL_RESEARCHER,
});
```

### Trait Effects

HEXACO traits influence three derived systems:

**System Prompt** -- Traits above 0.7 or below 0.3 add personality guidelines to the generated prompt:
- High honesty_humility (>0.7): "Be sincere and straightforward."
- High extraversion (>0.7): "Be energetic, sociable, and engaging."
- High conscientiousness (>0.7): "Be organized, thorough, and detail-oriented."

**Mood Adaptation** -- Traits determine which moods are available and the default mood:
- extraversion > 0.7 -> default mood `CREATIVE`
- conscientiousness > 0.7 -> default mood `FOCUSED`
- agreeableness > 0.7 -> default mood `EMPATHETIC`
- emotionality > 0.7 -> unlocks `FRUSTRATED` mood
- honesty_humility < 0.5 -> unlocks `ASSERTIVE` mood

**Derived Behavioral Parameters** -- Traits are combined into behavioral scores:
- `humor_level` = extraversion * 0.5 + openness * 0.3
- `formality_level` = conscientiousness * 0.6 + (1 - extraversion) * 0.2
- `empathy_level` = agreeableness * 0.5 + emotionality * 0.3
- `creativity_level` = openness * 0.6 + extraversion * 0.2
- `detail_orientation` = conscientiousness * 0.7 + (1 - openness) * 0.2
- `risk_tolerance` = (1 - conscientiousness) * 0.4 + openness * 0.3

### Validation helpers

```typescript
import { isValidHEXACOTraits, normalizeHEXACOTraits } from 'wunderland/core';

// Type guard -- checks all 6 fields are numbers in [0, 1]
isValidHEXACOTraits({ honesty_humility: 0.8, /* ... */ }); // true

// Clamp and fill missing values from defaults
normalizeHEXACOTraits({ openness: 1.5 });
// { honesty_humility: 0.8, emotionality: 0.5, ..., openness: 1.0 }
```

---

## SecurityProfile

Top-level security toggles stored on the seed:

```typescript
interface SecurityProfile {
  enablePreLLMClassifier: boolean;     // Enable Layer 1: pattern-based input screening
  enableDualLLMAuditor: boolean;       // Enable Layer 2: LLM-based output audit
  enableOutputSigning: boolean;        // Enable Layer 3: HMAC output signing
  signingSecretEnvVar?: string;        // Env var name for the HMAC secret
  customInjectionPatterns?: string[];  // Additional regex patterns to detect
  riskThreshold?: number;             // Risk score threshold (0.0 - 1.0)
}
```

### DEFAULT_SECURITY_PROFILE

```typescript
const DEFAULT_SECURITY_PROFILE: SecurityProfile = {
  enablePreLLMClassifier: true,
  enableDualLLMAuditor: true,
  enableOutputSigning: true,
  riskThreshold: 0.7,
};
```

### SecurityPipelineConfig (runtime)

The `WunderlandSecurityPipeline` constructor accepts a more detailed config for runtime behavior:

```typescript
interface SecurityPipelineConfig {
  enablePreLLM: boolean;
  enableDualLLMAudit: boolean;
  enableOutputSigning: boolean;
  classifierConfig?: {
    customPatterns?: InjectionPattern[];  // Custom detection patterns
    riskThreshold?: number;               // 0.0-1.0, default 0.7
  };
  auditorConfig?: Partial<DualLLMAuditorConfig>;
  signingConfig?: Partial<OutputSigningConfig>;
}
```

### DualLLMAuditorConfig

```typescript
interface DualLLMAuditorConfig {
  auditorProviderId: string;       // LLM provider for audit
  auditorModelId: string;          // Model ID for audit
  maxAuditTokens: number;         // Max tokens for audit response
  auditTemperature: number;       // Temperature (use 0.0 for consistency)
  evaluateStreamingChunks: boolean;// Audit streaming chunks?
  maxStreamingEvaluations?: number;// Max chunk evaluations per stream
  auditPromptTemplate?: string;   // Custom audit prompt
}
```

### OutputSigningConfig

```typescript
interface OutputSigningConfig {
  algorithm: 'sha256' | 'sha384' | 'sha512';  // Hash algorithm
  secretKeyEnvVar: string;                      // Env var with HMAC secret
  includeIntentChain: boolean;                  // Include full audit trail
  maxIntentChainEntries?: number;               // Max entries (default 100)
}
```

### Factory functions

```typescript
import {
  createProductionSecurityPipeline,
  createDevelopmentSecurityPipeline,
} from 'wunderland/security';

// Production: all 3 layers, riskThreshold 0.7, streaming audit
const prod = createProductionSecurityPipeline(auditorInvoker);

// Development: classifier only, riskThreshold 0.9, no LLM audit or signing
const dev = createDevelopmentSecurityPipeline();
```

---

## InferenceHierarchyConfig

Routes requests to different models based on complexity:

```typescript
interface InferenceHierarchyConfig {
  routerModel: ModelTarget;        // Fast model for routing decisions
  primaryModel: ModelTarget;       // Powerful model for complex tasks
  auditorModel: ModelTarget;       // Model for security auditing
  fallbackChain?: ModelTarget[];   // Fallback models if primary fails
}
```

### ModelTarget

```typescript
interface ModelTarget {
  providerId: string;              // Provider: 'ollama', 'openai', etc.
  modelId: string;                 // Model ID within the provider
  role: 'router' | 'primary' | 'auditor' | 'fallback';
  maxTokens?: number;             // Max output tokens
  temperature?: number;           // Generation temperature
}
```

### DEFAULT_INFERENCE_HIERARCHY

Default config uses local Ollama models:

```typescript
const DEFAULT_INFERENCE_HIERARCHY: InferenceHierarchyConfig = {
  routerModel: {
    providerId: 'ollama',
    modelId: 'llama3.2:3b',
    role: 'router',
    maxTokens: 512,
    temperature: 0.1,
  },
  primaryModel: {
    providerId: 'ollama',
    modelId: 'dolphin-llama3:8b',
    role: 'primary',
    maxTokens: 4096,
    temperature: 0.7,
  },
  auditorModel: {
    providerId: 'ollama',
    modelId: 'llama3.2:3b',
    role: 'auditor',
    maxTokens: 256,
    temperature: 0.0,
  },
};
```

### Example: OpenAI hierarchy

```typescript
const openaiHierarchy: InferenceHierarchyConfig = {
  routerModel: {
    providerId: 'openai',
    modelId: 'gpt-4o-mini',
    role: 'router',
    maxTokens: 512,
    temperature: 0.1,
  },
  primaryModel: {
    providerId: 'openai',
    modelId: 'gpt-4o',
    role: 'primary',
    maxTokens: 4096,
    temperature: 0.7,
  },
  auditorModel: {
    providerId: 'openai',
    modelId: 'gpt-4o-mini',
    role: 'auditor',
    maxTokens: 256,
    temperature: 0.0,
  },
  fallbackChain: [
    {
      providerId: 'openai',
      modelId: 'gpt-4o-mini',
      role: 'fallback',
      maxTokens: 2048,
      temperature: 0.5,
    },
  ],
};
```

---

## StepUpAuthorizationConfig

Controls tool execution authorization with three risk tiers:

```typescript
interface StepUpAuthorizationConfig {
  defaultTier: ToolRiskTier;                         // Default for unclassified tools
  toolTierOverrides?: Record<string, ToolRiskTier>;  // Per-tool overrides
  categoryTierOverrides?: Record<string, ToolRiskTier>; // Per-category overrides
  escalationTriggers?: EscalationTrigger[];          // Dynamic escalation rules
  contextualOverrides?: ContextualOverride[];        // Context-based tier lowering
  approvalTimeoutMs?: number;                        // HITL timeout (default 300000ms)
}
```

### ToolRiskTier

```typescript
enum ToolRiskTier {
  TIER_1_AUTONOMOUS = 1,    // Execute without approval (read-only, logging)
  TIER_2_ASYNC_REVIEW = 2,  // Execute, queue for async human review
  TIER_3_SYNC_HITL = 3,     // Require synchronous human approval first
}
```

### DEFAULT_STEP_UP_AUTH_CONFIG

```typescript
const DEFAULT_STEP_UP_AUTH_CONFIG: StepUpAuthorizationConfig = {
  defaultTier: ToolRiskTier.TIER_1_AUTONOMOUS,
  categoryTierOverrides: {
    data_modification: ToolRiskTier.TIER_2_ASYNC_REVIEW,
    external_api: ToolRiskTier.TIER_2_ASYNC_REVIEW,
    financial: ToolRiskTier.TIER_3_SYNC_HITL,
    communication: ToolRiskTier.TIER_2_ASYNC_REVIEW,
    system: ToolRiskTier.TIER_3_SYNC_HITL,
  },
  escalationTriggers: [
    {
      condition: 'high_value_threshold',
      escalateTo: ToolRiskTier.TIER_3_SYNC_HITL,
      parameters: { thresholdUSD: 100 },
    },
    {
      condition: 'sensitive_data_detected',
      escalateTo: ToolRiskTier.TIER_3_SYNC_HITL,
    },
    {
      condition: 'irreversible_action',
      escalateTo: ToolRiskTier.TIER_3_SYNC_HITL,
    },
  ],
  approvalTimeoutMs: 300000,  // 5 minutes
};
```

### EscalationTrigger

Dynamic rules that can bump a tool call to a higher tier:

```typescript
interface EscalationTrigger {
  condition:
    | 'high_value_threshold'     // Dollar amount exceeds threshold
    | 'sensitive_data_detected'  // PII or secrets detected in args
    | 'external_api_call'        // Calling an external API
    | 'irreversible_action'      // Cannot be undone
    | 'custom';                  // Custom condition function
  escalateTo: ToolRiskTier;
  parameters?: Record<string, unknown>;  // e.g. { thresholdUSD: 100 }
  customConditionFn?: string;            // Function name for 'custom' type
}
```

### ContextualOverride

Rules that can lower the effective tier based on session context:

```typescript
interface ContextualOverride {
  context:
    | 'user_verified'     // User has completed identity verification
    | 'session_trusted'   // Session marked as trusted
    | 'emergency_mode'    // Emergency mode activated
    | 'admin_override';   // Admin override active
  overrideTier?: ToolRiskTier;  // undefined = no override
}
```

### Tool categories

The following categories are recognized by `categoryTierOverrides`:

| Category | Description | Default Tier |
|----------|-------------|-------------|
| `data_modification` | Creating, updating, or deleting data | TIER_2_ASYNC_REVIEW |
| `external_api` | Calls to external APIs or services | TIER_2_ASYNC_REVIEW |
| `financial` | Financial transactions (payments, transfers) | TIER_3_SYNC_HITL |
| `communication` | Sending messages (email, SMS, chat) | TIER_2_ASYNC_REVIEW |
| `system` | System-level operations (file access, config) | TIER_3_SYNC_HITL |
| `other` | Uncategorized tools | Uses `defaultTier` |

---

## ChannelBinding

Binds a seed to a communication channel:

```typescript
interface ChannelBinding {
  platform:
    | 'telegram' | 'whatsapp' | 'discord' | 'slack'
    | 'webchat' | 'signal' | 'imessage' | 'google-chat'
    | 'teams' | 'matrix' | 'zalo' | 'email' | 'sms'
    | (string & {});               // Extensible with any string
  channelId: string;                // Channel or workspace ID
  isActive: boolean;                // Whether this binding is active
  platformConfig?: Record<string, unknown>;  // Platform-specific settings
}
```

```typescript
const seed = createWunderlandSeed({
  // ...
  channelBindings: [
    {
      platform: 'discord',
      channelId: 'guild-abc-channel-xyz',
      isActive: true,
      platformConfig: { prefix: '!' },
    },
    {
      platform: 'telegram',
      channelId: '123456789',
      isActive: true,
    },
  ],
});
```

---

## Summary of DEFAULT_* Constants

| Constant | Import Path | Description |
|----------|------------|-------------|
| `DEFAULT_HEXACO_TRAITS` | `wunderland/core` | Balanced personality (H:0.8 E:0.5 X:0.6 A:0.7 C:0.8 O:0.7) |
| `DEFAULT_SECURITY_PROFILE` | `wunderland/core` | All 3 security layers enabled, risk threshold 0.7 |
| `DEFAULT_INFERENCE_HIERARCHY` | `wunderland/core` | Ollama local models (llama3.2:3b router, dolphin-llama3:8b primary) |
| `DEFAULT_STEP_UP_AUTH_CONFIG` | `wunderland/core` | Tier 1 default, financial/system at Tier 3, 5-min timeout |
| `DEFAULT_INJECTION_PATTERNS` | `wunderland/security` | 8 built-in patterns (injection, jailbreak, DAN, SQL, etc.) |

## Next Steps

- [Quickstart](/docs/getting-started/quickstart) -- See these configs in action
- [Architecture Overview](/docs/architecture/overview) -- How modules interact at runtime
- [API Reference](/docs/api/overview) -- Full method-level documentation
