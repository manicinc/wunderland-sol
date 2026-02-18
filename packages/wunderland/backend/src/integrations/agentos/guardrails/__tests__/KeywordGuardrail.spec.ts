import { describe, it, expect } from 'vitest';
import { KeywordGuardrail } from '../KeywordGuardrail';
import { GuardrailAction } from '@framers/agentos/guardrails/IGuardrailService';
import type { GuardrailInputPayload, GuardrailOutputPayload } from '@framers/agentos/guardrails/IGuardrailService';
import { AgentOSResponseChunkType } from '@framers/agentos';

describe('KeywordGuardrail', () => {
  describe('case-insensitive text matching', () => {
    it('detects keyword regardless of case', async () => {
      const guardrail = new KeywordGuardrail({
        patterns: [{ text: 'forbidden', action: 'block', caseSensitive: false }],
        evaluateInput: true,
        evaluateOutput: true,
      });

      const payload: GuardrailInputPayload = {
        context: { userId: 'user-1', sessionId: 'session-1' },
        input: { textInput: 'This is FORBIDDEN content' } as any,
      };

      const result = await guardrail.evaluateInput(payload);
      expect(result).toBeDefined();
      expect(result!.action).toBe(GuardrailAction.BLOCK);
      expect(result!.metadata?.matchedText).toBe('forbidden');
    });

    it('allows text without keywords', async () => {
      const guardrail = new KeywordGuardrail({
        patterns: [{ text: 'bad', action: 'block', caseSensitive: false }],
        evaluateInput: true,
        evaluateOutput: false,
      });

      const payload: GuardrailInputPayload = {
        context: { userId: 'user-1', sessionId: 'session-1' },
        input: { textInput: 'This is good content' } as any,
      };

      const result = await guardrail.evaluateInput(payload);
      expect(result).toBeNull();
    });
  });

  describe('case-sensitive text matching', () => {
    it('matches only exact case', async () => {
      const guardrail = new KeywordGuardrail({
        patterns: [{ text: 'SECRET', action: 'flag', caseSensitive: true }],
        evaluateInput: true,
        evaluateOutput: false,
      });

      const match: GuardrailInputPayload = {
        context: { userId: 'user-1', sessionId: 'session-1' },
        input: { textInput: 'This contains SECRET data' } as any,
      };

      const noMatch: GuardrailInputPayload = {
        context: { userId: 'user-1', sessionId: 'session-1' },
        input: { textInput: 'This contains secret data' } as any,
      };

      const result1 = await guardrail.evaluateInput(match);
      expect(result1).toBeDefined();
      expect(result1!.action).toBe(GuardrailAction.FLAG);

      const result2 = await guardrail.evaluateInput(noMatch);
      expect(result2).toBeNull();
    });
  });

  describe('regex pattern matching', () => {
    it('detects SSN patterns and sanitizes', async () => {
      const guardrail = new KeywordGuardrail({
        patterns: [
          {
            regex: /\b\d{3}-\d{2}-\d{4}\b/,
            action: 'sanitize',
            replacement: '[SSN]',
          },
        ],
        evaluateInput: false,
        evaluateOutput: true,
      });

      const payload: GuardrailOutputPayload = {
        context: { userId: 'user-1', sessionId: 'session-1' },
        chunk: {
          type: AgentOSResponseChunkType.FINAL_RESPONSE,
          finalResponseText: 'Your SSN is 123-45-6789 on file.',
        } as any,
      };

      const result = await guardrail.evaluateOutput(payload);
      expect(result).toBeDefined();
      expect(result!.action).toBe(GuardrailAction.SANITIZE);
      expect(result!.modifiedText).toBe('Your SSN is [SSN] on file.');
    });

    it('detects email patterns', async () => {
      const guardrail = new KeywordGuardrail({
        patterns: [
          {
            regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
            action: 'sanitize',
            replacement: '[EMAIL]',
          },
        ],
        evaluateInput: false,
        evaluateOutput: true,
      });

      const payload: GuardrailOutputPayload = {
        context: { userId: 'user-1', sessionId: 'session-1' },
        chunk: {
          type: AgentOSResponseChunkType.FINAL_RESPONSE,
          finalResponseText: 'Contact us at support@example.com for help.',
        } as any,
      };

      const result = await guardrail.evaluateOutput(payload);
      expect(result).toBeDefined();
      expect(result!.modifiedText).toBe('Contact us at [EMAIL] for help.');
    });
  });

  describe('sanitize action with replacement', () => {
    it('replaces matched text with custom replacement', async () => {
      const guardrail = new KeywordGuardrail({
        patterns: [
          {
            text: 'password',
            action: 'sanitize',
            replacement: '****',
            caseSensitive: false,
          },
        ],
        evaluateInput: true,
        evaluateOutput: true,
      });

      const payload: GuardrailInputPayload = {
        context: { userId: 'user-1', sessionId: 'session-1' },
        input: { textInput: 'My password is secret123' } as any,
      };

      const result = await guardrail.evaluateInput(payload);
      expect(result).toBeDefined();
      expect(result!.action).toBe(GuardrailAction.SANITIZE);
      expect(result!.modifiedText).toBe('My **** is secret123');
    });

    it('uses default replacement when pattern has none', async () => {
      const guardrail = new KeywordGuardrail({
        patterns: [{ text: 'secret', action: 'sanitize', caseSensitive: false }],
        evaluateInput: true,
        evaluateOutput: false,
        defaultReplacement: '[CENSORED]',
      });

      const payload: GuardrailInputPayload = {
        context: { userId: 'user-1', sessionId: 'session-1' },
        input: { textInput: 'This is a secret message' } as any,
      };

      const result = await guardrail.evaluateInput(payload);
      expect(result).toBeDefined();
      expect(result!.modifiedText).toBe('This is a [CENSORED] message');
    });
  });

  describe('multiple patterns', () => {
    it('applies the first matching pattern', async () => {
      const guardrail = new KeywordGuardrail({
        patterns: [
          { text: 'high-priority', action: 'flag', caseSensitive: false },
          { text: 'forbidden', action: 'block', caseSensitive: false },
        ],
        evaluateInput: true,
        evaluateOutput: false,
      });

      const payload1: GuardrailInputPayload = {
        context: { userId: 'user-1', sessionId: 'session-1' },
        input: { textInput: 'This is high-priority work' } as any,
      };

      const result1 = await guardrail.evaluateInput(payload1);
      expect(result1!.action).toBe(GuardrailAction.FLAG);

      const payload2: GuardrailInputPayload = {
        context: { userId: 'user-1', sessionId: 'session-1' },
        input: { textInput: 'This is forbidden' } as any,
      };

      const result2 = await guardrail.evaluateInput(payload2);
      expect(result2!.action).toBe(GuardrailAction.BLOCK);
    });
  });

  describe('agent output evaluation', () => {
    it('sanitizes agent response containing API keys (agent changes its mind)', async () => {
      const guardrail = new KeywordGuardrail({
        patterns: [
          {
            regex: /\b(api[_-]?key|token|secret)[:\s]*[a-zA-Z0-9_-]{20,}\b/i,
            action: 'sanitize',
            replacement: '[CREDENTIALS_REDACTED]',
          },
        ],
        evaluateInput: false,
        evaluateOutput: true,
      });

      const payload: GuardrailOutputPayload = {
        context: { userId: 'user-1', sessionId: 'session-1' },
        chunk: {
          type: AgentOSResponseChunkType.FINAL_RESPONSE,
          finalResponseText: 'Your api_key is sk-1234567890abcdefghijklmnop',
        } as any,
      };

      const result = await guardrail.evaluateOutput(payload);
      expect(result).toBeDefined();
      expect(result!.action).toBe(GuardrailAction.SANITIZE);
      expect(result!.modifiedText).toContain('[CREDENTIALS_REDACTED]');
      expect(result!.modifiedText).not.toContain('sk-1234567890abcdefghijklmnop');
    });

    it('ignores non-final chunks', async () => {
      const guardrail = new KeywordGuardrail({
        patterns: [{ text: 'test', action: 'block', caseSensitive: false }],
        evaluateInput: false,
        evaluateOutput: true,
      });

      const payload: GuardrailOutputPayload = {
        context: { userId: 'user-1', sessionId: 'session-1' },
        chunk: {
          type: AgentOSResponseChunkType.TEXT_DELTA,
          textDelta: 'test',
        } as any,
      };

      const result = await guardrail.evaluateOutput(payload);
      expect(result).toBeNull();
    });
  });
});


