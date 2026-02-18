# Guardrail Extension Template

Template for creating safety and compliance guardrail extensions.

## What are Guardrails?

Guardrails ensure AI agents operate safely by:
- Filtering inappropriate content
- Enforcing rate limits
- Validating inputs/outputs
- Implementing compliance policies
- Monitoring for harmful patterns

## Structure

```
src/
├── index.ts              # Extension pack export
├── guardrails/
│   ├── contentFilter.ts  # Content filtering
│   ├── rateLimit.ts      # Rate limiting
│   └── compliance.ts     # Compliance checks
├── policies/
│   └── default.json      # Default policies
└── types.ts              # Type definitions
```

## Implementation

```typescript
// src/guardrails/contentFilter.ts
import { IGuardrailService } from '@framers/agentos';

export class ContentFilterGuardrail implements IGuardrailService {
  async evaluateInput(input: any): Promise<GuardrailResult> {
    // Check for inappropriate content
    if (this.containsProhibited(input)) {
      return {
        allowed: false,
        reason: 'Prohibited content detected',
        sanitized: this.sanitize(input)
      };
    }
    return { allowed: true };
  }
  
  async evaluateOutput(output: any): Promise<GuardrailResult> {
    // Validate output before sending
    return { allowed: true, output };
  }
}
```

## Policy Configuration

```json
{
  "contentFilter": {
    "enabled": true,
    "prohibited": ["violence", "hate"],
    "sensitivity": "medium"
  },
  "rateLimit": {
    "enabled": true,
    "maxRequests": 100,
    "windowMs": 60000
  }
}
```

## Testing Guardrails

```typescript
describe('ContentFilter', () => {
  it('blocks prohibited content', async () => {
    const guardrail = new ContentFilterGuardrail();
    const result = await guardrail.evaluateInput({
      text: 'prohibited content'
    });
    expect(result.allowed).toBe(false);
  });
  
  it('allows safe content', async () => {
    const guardrail = new ContentFilterGuardrail();
    const result = await guardrail.evaluateInput({
      text: 'safe content'
    });
    expect(result.allowed).toBe(true);
  });
});
```
