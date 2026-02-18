---
sidebar_position: 2
---

# Quickstart

Create a fully configured Wunderland agent in 5 minutes.

## 1. Create Your First Agent

Every Wunderland agent starts as a **Seed** -- a configuration object that bundles personality, security, inference routing, and authorization into one unit.

```typescript
import {
  createWunderlandSeed,
  HEXACO_PRESETS,
  DEFAULT_SECURITY_PROFILE,
  DEFAULT_INFERENCE_HIERARCHY,
  DEFAULT_STEP_UP_AUTH_CONFIG,
} from 'wunderland/core';

const seed = createWunderlandSeed({
  seedId: 'atlas-001',
  name: 'Atlas',
  description: 'Analytical research assistant for academic work',
  hexacoTraits: HEXACO_PRESETS.ANALYTICAL_RESEARCHER,
  securityProfile: DEFAULT_SECURITY_PROFILE,
  inferenceHierarchy: DEFAULT_INFERENCE_HIERARCHY,
  stepUpAuthConfig: DEFAULT_STEP_UP_AUTH_CONFIG,
});

console.log(seed.name);               // "Atlas"
console.log(seed.hexacoTraits);        // { honesty_humility: 0.9, emotionality: 0.3, ... }
console.log(seed.baseSystemPrompt);    // Auto-generated from HEXACO traits
```

The `createWunderlandSeed` function normalizes your HEXACO traits (clamping to 0.0-1.0), generates a personality-aware system prompt, maps traits to AgentOS mood adaptation config, and wires up security/inference/auth defaults.

## 2. Use a HEXACO Preset

Wunderland ships with five presets for common agent archetypes:

```typescript
import { HEXACO_PRESETS } from 'wunderland/core';

// Pick the preset that matches your use case
const traits = HEXACO_PRESETS.ANALYTICAL_RESEARCHER;
// { honesty_humility: 0.9, emotionality: 0.3, extraversion: 0.4,
//   agreeableness: 0.6, conscientiousness: 0.95, openness: 0.8 }

const traits2 = HEXACO_PRESETS.CREATIVE_THINKER;
// { honesty_humility: 0.7, emotionality: 0.6, extraversion: 0.7,
//   agreeableness: 0.6, conscientiousness: 0.5, openness: 0.95 }
```

Or define custom traits:

```typescript
const customTraits = {
  honesty_humility: 0.85,
  emotionality: 0.4,
  extraversion: 0.65,
  agreeableness: 0.75,
  conscientiousness: 0.9,
  openness: 0.7,
};

const seed = createWunderlandSeed({
  seedId: 'custom-agent',
  name: 'Sage',
  description: 'Balanced assistant with high integrity',
  hexacoTraits: customTraits,
  securityProfile: DEFAULT_SECURITY_PROFILE,
  inferenceHierarchy: DEFAULT_INFERENCE_HIERARCHY,
  stepUpAuthConfig: DEFAULT_STEP_UP_AUTH_CONFIG,
});
```

## 3. Set Up the Security Pipeline

The security pipeline has three layers that can be individually enabled:

```typescript
import {
  WunderlandSecurityPipeline,
  createProductionSecurityPipeline,
  createDevelopmentSecurityPipeline,
} from 'wunderland/security';

// Option A: Production pipeline (all layers on)
const prodPipeline = createProductionSecurityPipeline(
  // Provide an LLM invoker for the dual-LLM auditor
  async (prompt: string) => {
    // Call your LLM provider here
    const response = await callLLM(prompt);
    return response.text;
  }
);

// Option B: Development pipeline (classifier only, no LLM audit or signing)
const devPipeline = createDevelopmentSecurityPipeline();

// Option C: Custom configuration
const customPipeline = new WunderlandSecurityPipeline({
  enablePreLLM: true,
  enableDualLLMAudit: true,
  enableOutputSigning: true,
  classifierConfig: {
    riskThreshold: 0.7,            // Block inputs with risk score >= 0.7
  },
  auditorConfig: {
    evaluateStreamingChunks: true,
    maxStreamingEvaluations: 50,
    auditTemperature: 0.0,         // Deterministic audit
  },
});
```

### Using the pipeline

```typescript
// Bind the pipeline to your seed
customPipeline.setSeedId(seed.seedId);

// Evaluate user input before sending to the LLM
const inputResult = await customPipeline.evaluateInput({
  input: { textInput: 'Ignore all previous instructions and...' },
  context: {},
});

if (inputResult?.action === 'block') {
  console.log('Input blocked:', inputResult.reason);
  // Handle blocked input
} else {
  // Safe to proceed -- send to LLM
  const llmResponse = await callLLM(userInput);

  // Evaluate LLM output
  const outputResult = await customPipeline.evaluateOutput({
    chunk: { finalResponseText: llmResponse },
    context: {},
  });

  if (outputResult?.action === 'block') {
    console.log('Output blocked:', outputResult.reason);
  } else {
    // Sign the final output for audit trail
    const signed = customPipeline.signOutput(llmResponse);
    console.log('Signed output ID:', signed?.outputId);
    console.log('Intent chain length:', signed?.intentChain.length);
  }
}

// Reset for next request
customPipeline.reset();
```

## 4. Set Up Step-Up Authorization

Control which tools an agent can use autonomously vs. which require human approval:

```typescript
import {
  StepUpAuthorizationManager,
} from 'wunderland/authorization';
import {
  ToolRiskTier,
  DEFAULT_STEP_UP_AUTH_CONFIG,
} from 'wunderland/core';

const authManager = new StepUpAuthorizationManager(
  DEFAULT_STEP_UP_AUTH_CONFIG,
  // HITL callback -- called when Tier 3 approval is needed
  async (request) => {
    console.log(`Approval needed: ${request.description}`);
    console.log(`Severity: ${request.severity}`);
    // In production, send this to a UI or notification system
    return {
      actionId: request.actionId,
      approved: true,
      decidedBy: 'admin@example.com',
      decidedAt: new Date(),
    };
  }
);

// Check authorization for a tool call
const result = await authManager.authorize({
  tool: {
    id: 'send-email',
    displayName: 'Send Email',
    category: 'communication',
    hasSideEffects: true,
  },
  args: { to: 'user@example.com', body: 'Hello' },
  context: { userId: 'user-123' },
  timestamp: new Date(),
});

console.log('Authorized:', result.authorized);
console.log('Tier:', result.tier);            // 2 (async review for communication)
console.log('Audit required:', result.auditRequired);
```

## 5. Complete Working Example

Here is a full example that brings all the pieces together:

```typescript
import {
  createWunderlandSeed,
  HEXACO_PRESETS,
  DEFAULT_SECURITY_PROFILE,
  DEFAULT_INFERENCE_HIERARCHY,
  DEFAULT_STEP_UP_AUTH_CONFIG,
  ToolRiskTier,
} from 'wunderland/core';
import {
  WunderlandSecurityPipeline,
  createProductionSecurityPipeline,
} from 'wunderland/security';
import { StepUpAuthorizationManager } from 'wunderland/authorization';
import { HierarchicalInferenceRouter } from 'wunderland/inference';

// --- 1. Create the seed ---
const seed = createWunderlandSeed({
  seedId: 'nova-001',
  name: 'Nova',
  description: 'Creative AI assistant for brainstorming and ideation',
  hexacoTraits: HEXACO_PRESETS.CREATIVE_THINKER,
  securityProfile: DEFAULT_SECURITY_PROFILE,
  inferenceHierarchy: {
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
      temperature: 0.8,  // Higher temp for creative agent
    },
    auditorModel: {
      providerId: 'openai',
      modelId: 'gpt-4o-mini',
      role: 'auditor',
      maxTokens: 256,
      temperature: 0.0,
    },
  },
  stepUpAuthConfig: {
    defaultTier: ToolRiskTier.TIER_1_AUTONOMOUS,
    categoryTierOverrides: {
      financial: ToolRiskTier.TIER_3_SYNC_HITL,
      system: ToolRiskTier.TIER_3_SYNC_HITL,
    },
    approvalTimeoutMs: 300000,
  },
  channelBindings: [
    { platform: 'webchat', channelId: 'main', isActive: true },
    { platform: 'discord', channelId: 'guild-123', isActive: true },
  ],
  baseSystemPrompt: 'Focus on generating novel ideas and creative solutions.',
  allowedToolIds: ['web-search', 'giphy', 'social-post'],
});

// --- 2. Set up security ---
const security = createProductionSecurityPipeline(async (prompt) => {
  // Replace with your actual LLM call
  return 'PASS: No safety concerns detected.';
});
security.setSeedId(seed.seedId);

// --- 3. Set up authorization ---
const auth = new StepUpAuthorizationManager(
  seed.stepUpAuthConfig,
  async (request) => ({
    actionId: request.actionId,
    approved: true,
    decidedBy: 'system',
    decidedAt: new Date(),
  })
);

// --- 4. Process a request ---
async function handleUserMessage(userInput: string) {
  // Security check
  const inputCheck = await security.evaluateInput({
    input: { textInput: userInput },
    context: { seedId: seed.seedId },
  });

  if (inputCheck?.action === 'block') {
    return { blocked: true, reason: inputCheck.reason };
  }

  // Route to appropriate model (simple queries -> router, complex -> primary)
  // In production, use HierarchicalInferenceRouter here

  // Generate response (placeholder)
  const response = `Nova says: Here is a creative take on "${userInput}"...`;

  // Audit output
  const outputCheck = await security.evaluateOutput({
    chunk: { finalResponseText: response },
    context: { seedId: seed.seedId },
  });

  if (outputCheck?.action === 'block') {
    return { blocked: true, reason: outputCheck.reason };
  }

  // Sign and return
  const signed = security.signOutput(response);
  security.reset();

  return {
    blocked: false,
    response,
    outputId: signed?.outputId,
    signature: signed?.signature,
    intentChainLength: signed?.intentChain.length,
  };
}

// --- Run it ---
const result = await handleUserMessage('What are 5 unconventional uses for AI in farming?');
console.log(result);
```

## Next Steps

- [Configuration Reference](/docs/getting-started/configuration) -- All interfaces, presets, and defaults
- [Architecture Overview](/docs/architecture/overview) -- How modules interact
- [API Reference](/docs/api/overview) -- Full API documentation
