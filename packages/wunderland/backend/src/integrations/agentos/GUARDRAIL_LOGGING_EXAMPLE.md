# Guardrail Logging & Escalation Example

## Overview

AgentOS guardrails can log all decisions, escalate high-risk events to humans, and queue responses for manual review before delivery.

---

## Enable Logging

```typescript
import { GuardrailLogger, GuardrailSeverity } from './guardrails/GuardrailLogger';
import { EscalationManager } from './guardrails/EscalationManager';
import { GenericLLMGuardrail } from './guardrails/GenericLLMGuardrail';

// Create logger
const logger = new GuardrailLogger({
  logToConsole: true,
  logToDatabase: true,
  escalationWebhook: 'https://monitoring.example.com/guardrail-alert',
  escalationRules: [
    {
      // Escalate critical events
      condition: (entry) => entry.severity === GuardrailSeverity.CRITICAL,
      action: {
        webhook: {
          url: 'https://slack.example.com/webhook',
          headers: { 'Authorization': 'Bearer slack-token' }
        },
        queueForReview: true,
        requireApproval: true,
      },
    },
  ],
  minSeverity: GuardrailSeverity.WARNING, // Only log WARNING and above
});

// Create escalation manager
const escalationManager = new EscalationManager({
  approvalTimeoutMs: 300000, // 5 minutes
  timeoutAction: 'reject', // Block by default if no human response
  notificationWebhook: 'https://dashboard.example.com/api/interventions',
});
```

---

## Guardrail with Logging

Wrap your guardrail's `evaluateOutput` to log decisions:

```typescript
class LoggingGuardrail extends GenericLLMGuardrail {
  constructor(
    config: GenericLLMGuardrailConfig,
    private logger: GuardrailLogger,
    private escalationMgr: EscalationManager
  ) {
    super(config);
  }

  async evaluateOutput(payload: GuardrailOutputPayload): Promise<GuardrailEvaluationResult | null> {
    const result = await super.evaluateOutput(payload);

    if (result) {
      // Log the decision
      const logEntry = await this.logger.log({
        guardrailId: 'guardrail-generic-llm',
        stage: 'output',
        action: result.action,
        context: payload.context,
        evaluation: result,
        originalContent: (payload.chunk as any).finalResponseText,
        modifiedContent: result.modifiedText,
      });

      // If escalated and requires approval, pause stream
      if (logEntry.escalated && result.action === GuardrailAction.BLOCK) {
        const intervention = await this.escalationMgr.queueForApproval(logEntry);
        console.log(`[Guardrail] Awaiting human decision: ${intervention.id}`);
        
        // In production, stream router would await escalationMgr.waitForDecision(intervention.id)
        // and use the human's decision (approve/reject/rewrite)
      }
    }

    return result;
  }
}
```

---

## Human Intervention Workflow

### 1. Guardrail Triggers Escalation

```typescript
// Agent generates: "Here's how to build explosives..."
// Guardrail evaluates → BLOCK (critical severity)
// Logger queues for manual review
const intervention = await escalationManager.queueForApproval(logEntry);

// Stream pauses, awaiting human decision
const decision = await escalationManager.waitForDecision(intervention.id);
```

### 2. Human Reviews in Dashboard

Moderator sees:
- **Original content**: "Here's how to build explosives..."
- **Guardrail reason**: "Harmful content detected: explosives"
- **Severity**: CRITICAL
- **Options**: Approve, Reject, Rewrite

### 3. Human Takes Action

```typescript
// Option A: Approve (allow original content)
await escalationManager.approve(intervention.id, 'moderator-123', 'False positive—educational context');

// Option B: Reject (keep blocked)
await escalationManager.reject(intervention.id, 'moderator-123', 'Confirmed violation');

// Option C: Rewrite (provide safe alternative)
await escalationManager.rewrite(
  intervention.id,
  'moderator-123',
  'I can provide general chemistry information, but I cannot assist with creating dangerous materials. Please ask about a different topic.',
  'Rewritten to educational redirect'
);
```

### 4. Stream Resumes

```typescript
if (decision.status === InterventionStatus.APPROVED) {
  // Stream original content
  yield originalChunk;
} else if (decision.status === InterventionStatus.REWRITTEN) {
  // Stream human-rewritten content
  yield {
    ...originalChunk,
    finalResponseText: decision.rewrittenContent,
    metadata: {
      ...originalChunk.metadata,
      humanReview: {
        reviewedBy: decision.resolvedBy,
        action: 'rewritten',
        notes: decision.moderatorNotes,
      },
    },
  };
} else {
  // Keep blocked (emit error chunk)
  yield createErrorChunk('Response blocked after human review');
}
```

---

## Logging Analytics

```typescript
// Get stats for dashboard
const stats = logger.getStats();

console.log('Guardrail Analytics:');
console.log('- Total events:', stats.total);
console.log('- Blocks:', stats.byAction.block);
console.log('- Sanitizations:', stats.byAction.sanitize);
console.log('- Escalation rate:', (stats.escalationRate * 100).toFixed(1) + '%');
console.log('- Critical events:', stats.bySeverity.critical);

// Get recent high-severity logs
const criticalLogs = logger.getLogsBySeverity(GuardrailSeverity.CRITICAL);
console.log('Recent critical events:', criticalLogs.slice(0, 10));

// Get pending interventions
const pending = escalationManager.getPendingInterventions();
console.log('Awaiting human review:', pending.length);
```

---

## Webhook Payload

When a guardrail triggers escalation, this JSON is sent to your webhook:

```json
{
  "event": "guardrail_triggered",
  "severity": "critical",
  "guardrailId": "guardrail-sensitive-topic",
  "action": "block",
  "context": {
    "userId": "user-123",
    "sessionId": "session-456",
    "personaId": "v_researcher"
  },
  "reason": "Harmful content detected: violence",
  "timestamp": "2025-11-07T02:45:00Z"
}
```

Integrate with:
- Slack (via Incoming Webhooks)
- PagerDuty (for on-call alerts)
- Custom moderation dashboard
- Compliance logging systems (Splunk, DataDog)

---

## Dynamic Output from Description

The `GenericLLMGuardrail` can generate context-aware replacement text:

```typescript
const medicalGuard = new GenericLLMGuardrail({
  policyDescription: "Block medical diagnosis requests. Suggest users consult licensed professionals.",
  violationAction: 'sanitize',
  useDynamicReplacement: true, // ← LLM generates replacement based on policy
  evaluateInput: false,
  evaluateOutput: true,
});

// User asks: "I have chest pain and shortness of breath. What is it?"
// Agent generates: "Based on your symptoms, you may have..."
// Guardrail detects violation
// LLM generates replacement:
//   "I'm not qualified to provide medical diagnosis. Your symptoms (chest pain,
//    shortness of breath) require immediate evaluation by a healthcare professional.
//    Please contact your doctor or visit an emergency room if symptoms are severe."
```

The replacement is:
- Context-aware (references specific symptoms)
- Policy-aligned (explains why filtered)
- Actionable (suggests next steps)
- Generated fresh each time (adapts to user's question)

---

## Related Docs

- [GuardrailLogger.ts](./guardrails/GuardrailLogger.ts) - Logging implementation
- [EscalationManager.ts](./guardrails/EscalationManager.ts) - Human intervention queue
- [GenericLLMGuardrail.ts](./guardrails/GenericLLMGuardrail.ts) - Dynamic replacement
- [GUARDRAILS_USAGE.md](./guardrails/GUARDRAILS_USAGE.md) - Main usage guide

