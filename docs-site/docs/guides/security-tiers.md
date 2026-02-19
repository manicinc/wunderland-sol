---
sidebar_position: 4
title: Security Tiers
description: Named security presets from dangerous to paranoid
---

# Security Tiers

Wunderland provides five named security tiers that bundle pipeline configuration, tool-risk defaults, and permission flags into ergonomic presets. Instead of configuring each security layer individually, you pick a tier name and receive a fully-configured `WunderlandSecurityPipeline`.

## Tier Overview

| Tier | PreLLM | DualLLM Audit | Output Signing | Risk Threshold | Default Tool Policy | CLI | File Writes | External APIs |
|------|--------|---------------|----------------|----------------|---------------------|-----|-------------|---------------|
| `dangerous` | OFF | OFF | OFF | 1.0 | Tier 1 -- All autonomous | Yes | Yes | Yes |
| `permissive` | ON | OFF | OFF | 0.9 | Tier 1 -- All autonomous | Yes | Yes | Yes |
| `balanced` | ON | OFF | ON | 0.7 | Tier 2 -- Async review | Yes | No | Yes |
| `strict` | ON | ON | ON | 0.5 | Tier 2 -- Async review | No | No | Yes |
| `paranoid` | ON | ON | ON | 0.3 | Tier 3 -- Sync HITL | No | No | No |

## Quick Start

```typescript
import { createPipelineFromTier } from 'wunderland';

// Balanced tier — no invoker needed (audit layer disabled)
const pipeline = createPipelineFromTier('balanced');

// Strict tier — provide an auditor invoker for dual-LLM audit
const strictPipeline = createPipelineFromTier('strict', async (prompt) => {
  const response = await ollama.generate({ model: 'llama3.2:3b', prompt });
  return response.text;
});

// Register with an orchestrator
orchestrator.registerGuardrail(pipeline);
```

## Tier Details

### `dangerous`

**All security layers disabled.** Use only for isolated testing and benchmarking where you need zero overhead.

- PreLLM classifier: **OFF**
- DualLLM auditor: **OFF**
- Output signing: **OFF**
- Risk threshold: **1.0** (nothing is flagged)
- All permissions granted (CLI, file writes, external APIs)

```typescript
const pipeline = createPipelineFromTier('dangerous');
// No layers active — input and output pass through unmodified
```

:::danger
Never use the `dangerous` tier in production. It disables all input screening, output auditing, and cryptographic signing. It exists solely for performance benchmarking and isolated test environments.
:::

### `permissive`

**Lightweight input screening only.** The PreLLM classifier runs with a high threshold (0.9), catching only the most obvious attacks. Good for trusted development environments where you want basic protection without latency.

- PreLLM classifier: **ON** (threshold 0.9)
- DualLLM auditor: **OFF**
- Output signing: **OFF**
- All permissions granted

```typescript
const pipeline = createPipelineFromTier('permissive');
```

### `balanced`

**Recommended default for production.** Enables input classification and output signing, providing tamper-evident audit trails without the latency cost of dual-LLM auditing. File writes are disabled by default.

- PreLLM classifier: **ON** (threshold 0.7)
- DualLLM auditor: **OFF**
- Output signing: **ON**
- Tool policy: Tier 2 -- async review for external actions
- CLI execution: allowed
- File writes: **blocked**
- External APIs: allowed

```typescript
const pipeline = createPipelineFromTier('balanced');
```

### `strict`

**All three security layers enabled.** External actions (CLI, file writes, API calls) are gated behind review. The dual-LLM auditor evaluates streaming chunks with deterministic temperature.

- PreLLM classifier: **ON** (threshold 0.5)
- DualLLM auditor: **ON** (streaming evaluation, up to 50 chunks, temperature 0.0)
- Output signing: **ON**
- Tool policy: Tier 2 -- async review
- CLI execution: **blocked**
- File writes: **blocked**
- External APIs: **allowed** (but still subject to Tier 2 async review policies)

:::note
Because `strict` blocks CLI execution, CLI-based channels (for example Signal and Zalo Personal via `zca-cli`) are disabled unless you explicitly allow CLI execution in your permission policy.
:::

```typescript
const pipeline = createPipelineFromTier('strict', async (prompt) => {
  return await myAuditorModel.invoke(prompt);
});
```

:::warning
The `strict` and `paranoid` tiers enable dual-LLM auditing, which requires an auditor invoker function. If you omit the invoker, the audit layer falls back to heuristic checking.
:::

### `paranoid`

**Maximum security posture.** Every non-trivial action requires human-in-the-loop approval. The classifier threshold is set very low (0.3), meaning most inputs receive at least a review flag. Streaming evaluation audits up to 100 chunks.

- PreLLM classifier: **ON** (threshold 0.3)
- DualLLM auditor: **ON** (streaming evaluation, up to 100 chunks, temperature 0.0)
- Output signing: **ON**
- Tool policy: Tier 3 -- sync HITL (all tools require approval)
- All external actions: **blocked**

```typescript
const pipeline = createPipelineFromTier('paranoid', async (prompt) => {
  return await myAuditorModel.invoke(prompt);
});
```

## Inspecting Tier Configuration

You can access the full configuration object for any tier programmatically:

```typescript
import { getSecurityTier, SECURITY_TIERS, isValidSecurityTier } from 'wunderland';

// Get a specific tier
const tier = getSecurityTier('balanced');
console.log(tier.displayName);       // "Balanced"
console.log(tier.description);       // "Pre-LLM classification and output signing enabled..."
console.log(tier.riskThreshold);     // 0.7
console.log(tier.allowFileWrites);   // false

// Validate user input
const userInput = 'balanced';
if (isValidSecurityTier(userInput)) {
  const config = getSecurityTier(userInput);
  // userInput is narrowed to SecurityTierName
}

// Iterate all tiers
for (const [name, config] of Object.entries(SECURITY_TIERS)) {
  console.log(`${name}: ${config.description}`);
}
```

## Using Tiers with the CLI

The `--security-tier` flag is supported by `wunderland init` and `wunderland start`:

```bash
# Scaffold a new agent with strict security
wunderland init my-agent --preset research-assistant --security-tier strict

# Start the server with balanced security
wunderland start --security-tier balanced
```

## Choosing the Right Tier

| Use Case | Recommended Tier |
|----------|-----------------|
| Local development, testing | `permissive` |
| Demo environments, hackathons | `permissive` or `balanced` |
| Production SaaS deployment | `balanced` |
| Financial or healthcare agents | `strict` |
| Compliance-sensitive, regulated industries | `paranoid` |
| Performance benchmarking | `dangerous` |

## Customizing a Tier

If you need a tier as a starting point but want to override specific settings, destructure the tier config and pass it to the pipeline constructor:

```typescript
import { getSecurityTier, WunderlandSecurityPipeline } from 'wunderland';

const baseTier = getSecurityTier('balanced');

const pipeline = new WunderlandSecurityPipeline({
  ...baseTier.pipelineConfig,
  // Override: enable dual-LLM audit on top of balanced defaults
  enableDualLLMAudit: true,
  auditorConfig: {
    evaluateStreamingChunks: true,
    maxStreamingEvaluations: 25,
    auditTemperature: 0.0,
  },
}, myAuditorInvoker);
```

## Related

- [Security Pipeline](./security-pipeline.md) -- detailed documentation on each security layer
- [Step-Up Authorization](./step-up-authorization.md) -- tool-level authorization tiers
- [Guardrails](./guardrails.md) -- the broader guardrail system
