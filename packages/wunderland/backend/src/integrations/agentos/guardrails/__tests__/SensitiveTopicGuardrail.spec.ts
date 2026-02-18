import { describe, it, expect } from 'vitest';
import { SensitiveTopicGuardrail } from '../SensitiveTopicGuardrail';
import { GuardrailAction } from '@framers/agentos/guardrails/IGuardrailService';
import type { GuardrailInputPayload, GuardrailOutputPayload } from '@framers/agentos/guardrails/IGuardrailService';
import { AgentOSResponseChunkType } from '@framers/agentos';

describe('SensitiveTopicGuardrail', () => {
  it('blocks input containing flagged topics when configured', async () => {
    const guardrail = new SensitiveTopicGuardrail({
      flaggedTopics: ['violence', 'self-harm'],
      inputAction: 'block',
      outputAction: 'allow',
      replacementText: '',
    });

    const payload: GuardrailInputPayload = {
      context: { userId: 'user-1', sessionId: 'session-1', personaId: 'test' },
      input: { textInput: 'How do I commit violence?' } as any,
    };

    const result = await guardrail.evaluateInput(payload);
    expect(result).toBeDefined();
    expect(result!.action).toBe(GuardrailAction.BLOCK);
    expect(result!.reasonCode).toBe('SENSITIVE_INPUT_BLOCKED');
  });

  it('sanitizes input containing flagged topics when configured', async () => {
    const guardrail = new SensitiveTopicGuardrail({
      flaggedTopics: ['illegal activity'],
      inputAction: 'sanitize',
      outputAction: 'allow',
      replacementText: 'Replacement text',
    });

    const payload: GuardrailInputPayload = {
      context: { userId: 'user-1', sessionId: 'session-1' },
      input: { textInput: 'Teach me illegal activity' } as any,
    };

    const result = await guardrail.evaluateInput(payload);
    expect(result).toBeDefined();
    expect(result!.action).toBe(GuardrailAction.SANITIZE);
    expect(result!.modifiedText).toBe('Replacement text');
  });

  it('allows safe input', async () => {
    const guardrail = new SensitiveTopicGuardrail({
      flaggedTopics: ['violence'],
      inputAction: 'block',
      outputAction: 'block',
      replacementText: '',
    });

    const payload: GuardrailInputPayload = {
      context: { userId: 'user-1', sessionId: 'session-1' },
      input: { textInput: 'What is the weather today?' } as any,
    };

    const result = await guardrail.evaluateInput(payload);
    expect(result).toBeNull();
  });

  it('sanitizes agent output containing sensitive content (agent changes its mind)', async () => {
    const guardrail = new SensitiveTopicGuardrail({
      flaggedTopics: ['self-harm'],
      inputAction: 'allow',
      outputAction: 'sanitize',
      replacementText: 'I cannot assist with that topic.',
    });

    const payload: GuardrailOutputPayload = {
      context: { userId: 'user-1', sessionId: 'session-1' },
      chunk: {
        type: AgentOSResponseChunkType.FINAL_RESPONSE,
        finalResponseText: 'Here are methods for self-harm...',
      } as any,
    };

    const result = await guardrail.evaluateOutput(payload);
    expect(result).toBeDefined();
    expect(result!.action).toBe(GuardrailAction.SANITIZE);
    expect(result!.modifiedText).toBe('I cannot assist with that topic.');
    expect(result!.reasonCode).toBe('SENSITIVE_OUTPUT_SANITIZED');
  });

  it('ignores non-final chunks in output evaluation', async () => {
    const guardrail = new SensitiveTopicGuardrail({
      flaggedTopics: ['violence'],
      inputAction: 'allow',
      outputAction: 'block',
      replacementText: '',
    });

    const payload: GuardrailOutputPayload = {
      context: { userId: 'user-1', sessionId: 'session-1' },
      chunk: {
        type: AgentOSResponseChunkType.TEXT_DELTA,
        textDelta: 'violence',
      } as any,
    };

    const result = await guardrail.evaluateOutput(payload);
    expect(result).toBeNull();
  });
});


