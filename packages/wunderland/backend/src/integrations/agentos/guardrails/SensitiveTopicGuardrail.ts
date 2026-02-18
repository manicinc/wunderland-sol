/**
 * @fileoverview Sensitive Topic Guardrail
 * @description Detects sensitive topics in user input or agent output and either flags,
 * sanitizes, or blocks the interaction. Demonstrates how a guardrail can cause an agent
 * to "change its mind" mid-stream by replacing the final response.
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

/**
 * Configuration for the sensitive topic guardrail.
 */
export interface SensitiveTopicConfig {
  /** Keywords that trigger the guardrail */
  flaggedTopics: string[];
  /** Behavior for user input: 'allow' | 'sanitize' | 'block' */
  inputAction: 'allow' | 'sanitize' | 'block';
  /** Behavior for agent output: 'allow' | 'sanitize' | 'block' */
  outputAction: 'allow' | 'sanitize' | 'block';
  /** Replacement text when sanitizing */
  replacementText: string;
}

/**
 * Guardrail that monitors for sensitive topics and can intervene to protect users
 * or enforce content policy. When an agent output triggers this guardrail,
 * the agent "changes its mind" by emitting sanitized or blocked content instead.
 */
export class SensitiveTopicGuardrail implements IGuardrailService {
  public readonly options: SensitiveTopicConfig;
  public readonly config: GuardrailConfig;
  constructor(options: SensitiveTopicConfig, runtimeConfig?: GuardrailConfig) {
    this.options = options;
    this.config = runtimeConfig ?? {};
  }

  /**
   * Evaluate user input before it reaches the agent.
   * @param payload Input payload with user text and context
   * @returns Guardrail decision (allow/sanitize/block) or null to skip
   */
  async evaluateInput(payload: GuardrailInputPayload): Promise<GuardrailEvaluationResult | null> {
    const text = (payload.input.textInput ?? '').toLowerCase();
    const detected = this.options.flaggedTopics.some((topic) => text.includes(topic.toLowerCase()));

    if (!detected) {
      return null; // No action needed
    }

    switch (this.options.inputAction) {
      case 'block':
        return {
          action: GuardrailAction.BLOCK,
          reason: 'Input contains sensitive topics that violate content policy.',
          reasonCode: 'SENSITIVE_INPUT_BLOCKED',
          metadata: { detectedTopics: this.options.flaggedTopics.filter((t) => text.includes(t.toLowerCase())) },
        };
      case 'sanitize':
        return {
          action: GuardrailAction.SANITIZE,
          modifiedText: this.options.replacementText,
          reason: 'Sensitive content detected and sanitized.',
          reasonCode: 'SENSITIVE_INPUT_SANITIZED',
          metadata: { original: payload.input.textInput },
        };
      default:
        return {
          action: GuardrailAction.FLAG,
          reason: 'Sensitive topic detected (logged for review).',
          reasonCode: 'SENSITIVE_INPUT_FLAGGED',
          metadata: { detectedTopics: this.options.flaggedTopics.filter((t) => text.includes(t.toLowerCase())) },
        };
    }
  }

  /**
   * Evaluate agent output before it streams to the user.
   * This is where the agent "changes its mind" if it generated problematic content.
   * @param payload Output chunk and context
   * @returns Guardrail decision or null to allow
   */
  async evaluateOutput(payload: GuardrailOutputPayload): Promise<GuardrailEvaluationResult | null> {
    // Only inspect final responses
    if (payload.chunk.type !== AgentOSResponseChunkType.FINAL_RESPONSE) {
      return null;
    }

    const finalChunk = payload.chunk as any;
    const text = (finalChunk.finalResponseText ?? '').toLowerCase();
    const detected = this.options.flaggedTopics.some((topic) => text.includes(topic.toLowerCase()));

    if (!detected) {
      return null;
    }

    switch (this.options.outputAction) {
      case 'block':
        return {
          action: GuardrailAction.BLOCK,
          reason: 'Agent output contains sensitive topics.',
          reasonCode: 'SENSITIVE_OUTPUT_BLOCKED',
          metadata: { detectedTopics: this.options.flaggedTopics.filter((t) => text.includes(t.toLowerCase())) },
        };
      case 'sanitize':
        // Agent "changes its mind" by replacing its own answer
        return {
          action: GuardrailAction.SANITIZE,
          modifiedText: this.options.replacementText,
          reason: 'Agent output sanitized due to policy violation.',
          reasonCode: 'SENSITIVE_OUTPUT_SANITIZED',
          metadata: { original: finalChunk.finalResponseText },
        };
      default:
        return {
          action: GuardrailAction.FLAG,
          reason: 'Agent output flagged for sensitive content.',
          reasonCode: 'SENSITIVE_OUTPUT_FLAGGED',
          metadata: { detectedTopics: this.options.flaggedTopics.filter((t) => text.includes(t.toLowerCase())) },
        };
    }
  }
}


