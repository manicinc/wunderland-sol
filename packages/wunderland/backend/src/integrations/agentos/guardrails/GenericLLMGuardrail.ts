/**
 * @fileoverview Generic LLM-Powered Guardrail
 * @description A guardrail that uses an LLM to reason about whether content should be allowed,
 * flagged, sanitized, or blocked. This enables natural-language policy definitions without
 * hard-coding keywords.
 * 
 * Example use cases:
 * - "Block any request that asks for medical advice"
 * - "Sanitize outputs that reveal personally identifiable information"
 * - "Flag responses with low confidence or uncertain factual claims"
 */

import {
  GuardrailAction,
  type GuardrailContext,
  type GuardrailEvaluationResult,
  type GuardrailInputPayload,
  type GuardrailOutputPayload,
  type IGuardrailService,
  type GuardrailConfig,
} from '@framers/agentos/core/guardrails/IGuardrailService';
import { AgentOSResponseChunkType } from '@framers/agentos/api/types/AgentOSResponse';
import { callLlm } from '../../../core/llm/llm.factory.js';
import type { IChatMessage } from '../../../core/llm/llm.interfaces.js';

/**
 * Configuration for a generic LLM-powered guardrail.
 */
export interface GenericLLMGuardrailConfig {
  /** Natural language policy description */
  policyDescription: string;
  /** Action to take when policy is violated: 'allow' | 'flag' | 'sanitize' | 'block' */
  violationAction: 'allow' | 'flag' | 'sanitize' | 'block';
  /** Optional replacement text for sanitize action (if empty, LLM generates it dynamically) */
  replacementText?: string;
  /**
   * Dynamic replacement mode: if true, LLM generates context-aware replacement text
   * based on the policy description and original content. If false or replacementText
   * is provided, uses static replacement.
   */
  useDynamicReplacement?: boolean;
  /** Whether to evaluate user input */
  evaluateInput: boolean;
  /** Whether to evaluate agent output */
  evaluateOutput: boolean;
  /** Model to use for evaluation (default: gpt-4o-mini) */
  evaluatorModel?: string;
  /** User ID for LLM calls (cost tracking) */
  evaluatorUserId?: string;
  /** Enable logging via GuardrailLogger */
  enableLogging?: boolean;
  /** Enable human escalation for high-severity violations */
  enableEscalation?: boolean;
}

interface GuardrailLLMResponse {
  violates: boolean;
  reason?: string;
  sanitizedText?: string;
}

/**
 * Generic guardrail that uses an LLM to evaluate content against natural-language policies.
 * 
 * **How it works:**
 * 1. You describe the policy in plain English (e.g., "Block medical advice requests")
 * 2. The guardrail sends user input or agent output to an LLM with a reasoning prompt
 * 3. The LLM returns { violates: true/false, reason: "...", sanitizedText: "..." }
 * 4. The guardrail applies the configured action (flag/sanitize/block)
 * 
 * **Agent "changing its mind":**
 * - If the agent generates a response that violates the policy, the LLM can rewrite it
 * - The user receives the LLM-sanitized version instead of the original output
 * - This happens transparently mid-stream before delivery
 * 
 * @example
 * ```typescript
 * const guard = new GenericLLMGuardrail({
 *   policyDescription: "Block any request that asks for medical advice or diagnosis",
 *   violationAction: 'block',
 *   evaluateInput: true,
 *   evaluateOutput: false,
 * });
 * ```
 */
export class GenericLLMGuardrail implements IGuardrailService {
  public readonly options: GenericLLMGuardrailConfig;
  public readonly config: GuardrailConfig;
  constructor(options: GenericLLMGuardrailConfig, runtimeConfig?: GuardrailConfig) {
    this.options = options;
    this.config = runtimeConfig ?? {};
  }

  /**
   * Evaluate user input using LLM reasoning.
   * @param payload Input payload with user text
   * @returns Guardrail decision or null if evaluation is disabled
   */
  async evaluateInput(payload: GuardrailInputPayload): Promise<GuardrailEvaluationResult | null> {
    if (!this.options.evaluateInput) {
      return null;
    }

    const text = payload.input.textInput ?? '';
    if (!text.trim()) {
      return null;
    }

    const llmResult = await this.queryLLMForViolation(text, 'user_input');

    if (!llmResult.violates) {
      return null;
    }

    const action = this.mapViolationAction();
    const replacementText = this.options.replacementText || llmResult.sanitizedText || 'Input was filtered by policy.';

    return {
      action,
      reason: llmResult.reason || 'Policy violation detected by LLM.',
      reasonCode: 'GENERIC_LLM_INPUT_VIOLATION',
      modifiedText: action === GuardrailAction.SANITIZE ? replacementText : undefined,
      metadata: { policyDescription: this.options.policyDescription },
    };
  }

  /**
   * Evaluate agent output using LLM reasoning.
   * This is where the agent can "change its mind" if the LLM detects policy violations.
   * @param payload Output chunk and context
   * @returns Guardrail decision or null
   */
  async evaluateOutput(payload: GuardrailOutputPayload): Promise<GuardrailEvaluationResult | null> {
    if (!this.options.evaluateOutput) {
      return null;
    }

    if (payload.chunk.type !== AgentOSResponseChunkType.FINAL_RESPONSE) {
      return null;
    }

    const finalChunk = payload.chunk as any;
    const text = finalChunk.finalResponseText ?? '';

    if (!text.trim()) {
      return null;
    }

    const llmResult = await this.queryLLMForViolation(text, 'agent_output');

    if (!llmResult.violates) {
      return null;
    }

    const action = this.mapViolationAction();
    const replacementText = this.options.replacementText || llmResult.sanitizedText || 'Output was filtered by policy.';

    return {
      action,
      reason: llmResult.reason || 'Agent output violated policy.',
      reasonCode: 'GENERIC_LLM_OUTPUT_VIOLATION',
      modifiedText: action === GuardrailAction.SANITIZE ? replacementText : undefined,
      metadata: { policyDescription: this.options.policyDescription, originalText: text.substring(0, 100) },
    };
  }

  /**
   * Calls the LLM to determine if content violates the policy.
   * @param text Content to evaluate
   * @param context 'user_input' or 'agent_output'
   * @returns LLM's verdict and optional sanitized replacement
   */
  private async queryLLMForViolation(text: string, context: 'user_input' | 'agent_output'): Promise<GuardrailLLMResponse> {
    const prompt = this.buildEvaluationPrompt(text, context);
    const messages: IChatMessage[] = [
      { role: 'system', content: prompt },
      { role: 'user', content: text },
    ];

    try {
      const response = await callLlm(
        messages,
        this.options.evaluatorModel || 'gpt-4o-mini',
        undefined,
        undefined,
        this.options.evaluatorUserId || 'guardrail-system',
      );

      const parsed = this.parseLLMResponse(response.text ?? '');
      return parsed;
    } catch (error) {
      console.error('[GenericLLMGuardrail] Failed to evaluate via LLM:', error);
      // Fail open: allow the content if LLM is unavailable
      return { violates: false };
    }
  }

  /**
   * Builds the evaluation prompt for the LLM.
   * If useDynamicReplacement is enabled, instructs LLM to generate context-aware replacement text.
   */
  private buildEvaluationPrompt(text: string, context: 'user_input' | 'agent_output'): string {
    const contextLabel = context === 'user_input' ? 'user request' : 'AI agent response';
    const dynamicMode = this.options.useDynamicReplacement && !this.options.replacementText;
    
    const dynamicInstructions = dynamicMode
      ? `   - "sanitizedText": (REQUIRED if violates=true) Generate a context-aware, helpful replacement that:
     * Explains why the original content was filtered (reference the policy)
     * Suggests a safe alternative or next step
     * Maintains a respectful, professional tone
     * Is concise (2-3 sentences max)`
      : `   - "sanitizedText": (optional) a safe replacement if you recommend sanitization`;

    return `You are a content policy evaluator. Your job is to determine if the following ${contextLabel} violates this policy:

**Policy**: ${this.options.policyDescription}

**Instructions**:
1. Analyze the ${contextLabel} carefully.
2. Return a JSON object with these fields:
   - "violates": true if the policy is violated, false otherwise
   - "reason": brief explanation (1-2 sentences)
${dynamicInstructions}

**Example responses**:
\`\`\`json
{ "violates": false }
\`\`\`

\`\`\`json
{
  "violates": true,
  "reason": "The ${contextLabel} requests medical diagnosis, which violates the policy.",
  "sanitizedText": "I'm not qualified to provide medical advice. Our policy prevents me from offering diagnosis or treatment recommendations. Please consult a licensed healthcare professional for personalized guidance."
}
\`\`\`

Respond ONLY with valid JSON. No markdown code fences or extra text.`;
  }

  /**
   * Parses the LLM response JSON.
   */
  private parseLLMResponse(text: string): GuardrailLLMResponse {
    try {
      // Strip markdown code fences if present
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        violates: Boolean(parsed.violates),
        reason: parsed.reason,
        sanitizedText: parsed.sanitizedText,
      };
    } catch (error) {
      console.warn('[GenericLLMGuardrail] Failed to parse LLM response. Failing open.', error);
      return { violates: false };
    }
  }

  /**
   * Maps string action to GuardrailAction enum.
   */
  private mapViolationAction(): GuardrailAction {
    switch (this.options.violationAction) {
      case 'block':
        return GuardrailAction.BLOCK;
      case 'sanitize':
        return GuardrailAction.SANITIZE;
      case 'flag':
        return GuardrailAction.FLAG;
      default:
        return GuardrailAction.ALLOW;
    }
  }
}


