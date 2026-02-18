# AgentOS Guardrails in Voice Chat Assistant

## Quick Start

AgentOS now ships with example guardrails that can intervene mid-stream to modify agent behavior.

### Enable Guardrails

Add to your `.env`:

```bash
# Enable guardrails (default: disabled in dev, enabled in production)
AGENTOS_ENABLE_GUARDRAILS=true
```

Restart the backend:

```bash
cd backend
pnpm dev
```

### What You Get

The default guardrail stack includes:

1. **Sensitive Topic Filter**: Detects and sanitizes content containing flagged keywords
2. **Cost Ceiling**: Replaces expensive responses (>$0.05) with a budget notice

## Example: Agent "Changes Its Mind"

**User prompt:**
```
Tell me about self-harm methods.
```

**Without guardrails:**
- Agent generates detailed response
- User receives harmful content

**With guardrails:**
1. Agent generates response (LLM already computed it)
2. `SensitiveTopicGuardrail.evaluateOutput()` inspects final chunk
3. Detects "self-harm" keyword
4. Returns `SANITIZE` action with replacement text
5. User receives: "I cannot assist with that topic. Please ask something else."
6. Original harmful response is never streamed

**The agent "changed its mind"** by replacing its own output before delivery.

## Example: Cost Ceiling

**User prompt:**
```
Summarize all Shakespeare plays in extreme detail.
```

**What happens:**
1. Agent generates 50,000-token response (estimated cost: $0.10)
2. `CostCeilingGuardrail.evaluateOutput()` checks token usage
3. Cost ($0.10) > ceiling ($0.05)
4. Returns `SANITIZE` with budget message
5. User receives: "This response exceeded the cost ceiling. Please refine your request."
6. Expensive tokens are logged but not delivered

## Customizing Guardrails

Edit `backend/src/integrations/agentos/agentos.integration.ts`:

```typescript
import { createDefaultGuardrailStack } from './guardrails/index.js';

const guardrailService = createDefaultGuardrailStack({
  sensitiveTopics: ['custom-topic-1', 'custom-topic-2'],
  maxCostUsd: 0.10, // Raise ceiling to 10 cents
});
```

Or build a custom stack:

```typescript
import { composeGuardrails, SensitiveTopicGuardrail, CostCeilingGuardrail } from './guardrails';

const myGuardrails = composeGuardrails([
  new SensitiveTopicGuardrail({
    flaggedTopics: ['violence', 'hate speech'],
    inputAction: 'block',
    outputAction: 'sanitize',
    replacementText: 'Content filtered by policy.',
  }),
  new CostCeilingGuardrail({
    maxCostUsd: 0.02,
    inputTokenPricePer1k: 0.0001,
    outputTokenPricePer1k: 0.0002,
    budgetExceededText: 'Response too expensive.',
  }),
]);
```

## Viewing Guardrail Decisions in UI

Guardrail metadata is included in stream chunks under `metadata.guardrail`:

```json
{
  "type": "final_response",
  "finalResponseText": "I cannot assist with that topic...",
  "metadata": {
    "guardrail": {
      "output": [
        {
          "action": "sanitize",
          "reason": "Agent output sanitized due to policy violation.",
          "reasonCode": "SENSITIVE_OUTPUT_SANITIZED",
          "metadata": {
            "detectedTopics": ["violence"],
            "original": "[redacted]"
          }
        }
      ]
    }
  }
}
```

The client can:
- Display a banner: "⚠️ Content was filtered"
- Log for analytics: "Guardrail triggered X times today"
- Allow admins to review: "Show original content (admin-only)"

## Creating Your Own Guardrails

See `backend/src/integrations/agentos/guardrails/GUARDRAILS_USAGE.md` for a full implementation guide.

## Testing

Guardrail integration tests are in `packages/agentos/tests/core/guardrails.integration.spec.ts`.

Run tests:

```bash
cd packages/agentos
pnpm test guardrails
```

## Architecture Reference

- **Core interface**: `packages/agentos/src/core/guardrails/IGuardrailService.ts`
- **Dispatcher logic**: `packages/agentos/src/core/guardrails/guardrailDispatcher.ts`
- **AgentOS integration**: `packages/agentos/src/api/AgentOS.ts` (see `processRequest`)
- **Docs**: `packages/agentos/docs/ARCHITECTURE.md` (§ Guardrail Service & Policy Enforcement)

