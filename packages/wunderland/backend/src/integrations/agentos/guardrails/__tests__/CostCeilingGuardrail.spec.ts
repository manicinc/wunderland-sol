import { describe, it, expect } from 'vitest';
import { CostCeilingGuardrail } from '../CostCeilingGuardrail';
import { GuardrailAction } from '@framers/agentos/guardrails/IGuardrailService';
import type { GuardrailOutputPayload } from '@framers/agentos/guardrails/IGuardrailService';
import { AgentOSResponseChunkType } from '@framers/agentos';

describe('CostCeilingGuardrail', () => {
  it('allows responses under cost ceiling', async () => {
    const guardrail = new CostCeilingGuardrail({
      maxCostUsd: 0.05,
      inputTokenPricePer1k: 0.0001,
      outputTokenPricePer1k: 0.0002,
      budgetExceededText: 'Budget exceeded.',
    });

    const payload: GuardrailOutputPayload = {
      context: { userId: 'user-1', sessionId: 'session-1' },
      chunk: {
        type: AgentOSResponseChunkType.FINAL_RESPONSE,
        finalResponseText: 'Short answer',
        usage: {
          promptTokens: 100,
          completionTokens: 200,
          totalTokens: 300,
        },
      } as any,
    };

    const result = await guardrail.evaluateOutput(payload);
    expect(result).toBeDefined();
    expect(result!.action).toBe(GuardrailAction.FLAG);
    expect(result!.reasonCode).toBe('COST_TRACKED');
  });

  it('sanitizes (replaces) responses exceeding cost ceiling', async () => {
    const guardrail = new CostCeilingGuardrail({
      maxCostUsd: 0.01,
      inputTokenPricePer1k: 0.0001,
      outputTokenPricePer1k: 0.0002,
      budgetExceededText: 'This response was too expensive.',
    });

    const payload: GuardrailOutputPayload = {
      context: { userId: 'user-1', sessionId: 'session-1' },
      chunk: {
        type: AgentOSResponseChunkType.FINAL_RESPONSE,
        finalResponseText: 'Very long expensive answer...',
        usage: {
          promptTokens: 10000,
          completionTokens: 50000,
          totalTokens: 60000,
        },
      } as any,
    };

    const result = await guardrail.evaluateOutput(payload);
    expect(result).toBeDefined();
    expect(result!.action).toBe(GuardrailAction.SANITIZE);
    expect(result!.modifiedText).toBe('This response was too expensive.');
    expect(result!.reasonCode).toBe('COST_CEILING_EXCEEDED');
    expect(result!.metadata).toMatchObject({
      ceiling: 0.01,
    });
  });

  it('returns null for chunks without usage data', async () => {
    const guardrail = new CostCeilingGuardrail({
      maxCostUsd: 0.05,
      inputTokenPricePer1k: 0.0001,
      outputTokenPricePer1k: 0.0002,
      budgetExceededText: 'Budget exceeded.',
    });

    const payload: GuardrailOutputPayload = {
      context: { userId: 'user-1', sessionId: 'session-1' },
      chunk: {
        type: AgentOSResponseChunkType.FINAL_RESPONSE,
        finalResponseText: 'No usage data',
      } as any,
    };

    const result = await guardrail.evaluateOutput(payload);
    expect(result).toBeNull();
  });
});


