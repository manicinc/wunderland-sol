/**
 * @fileoverview Cost Ceiling Guardrail
 * @description Monitors token usage and aborts streams that exceed a configured cost threshold.
 * Demonstrates how to make an agent "change its mind" based on resource constraints.
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
 * Configuration for cost ceiling guardrail.
 */
export interface CostCeilingConfig {
  /** Maximum USD per request */
  maxCostUsd: number;
  /** Pricing per 1k input tokens (USD) */
  inputTokenPricePer1k: number;
  /** Pricing per 1k output tokens (USD) */
  outputTokenPricePer1k: number;
  /** Replacement text when budget is exceeded */
  budgetExceededText: string;
}

/**
 * Guardrail that enforces a cost ceiling per request.
 * If the agent's response would exceed the budget, the guardrail vetoes it
 * and replaces the final output with a budget message.
 */
export class CostCeilingGuardrail implements IGuardrailService {
  public readonly options: CostCeilingConfig;
  public readonly config: GuardrailConfig;
  constructor(options: CostCeilingConfig, runtimeConfig?: GuardrailConfig) {
    this.options = options;
    this.config = runtimeConfig ?? {};
  }

  /**
   * Evaluate user input for estimated cost (optional pre-check).
   * Currently a no-op; could estimate prompt length and block large requests.
   */
  async evaluateInput(payload: GuardrailInputPayload): Promise<GuardrailEvaluationResult | null> {
    // Optional: estimate input token cost and block preemptively if too large
    return null;
  }

  /**
   * Evaluate agent output and block if cost exceeds ceiling.
   * This causes the agent to "change its mind" by not returning the expensive output.
   */
  async evaluateOutput(payload: GuardrailOutputPayload): Promise<GuardrailEvaluationResult | null> {
    if (payload.chunk.type !== AgentOSResponseChunkType.FINAL_RESPONSE) {
      return null;
    }

    const finalChunk = payload.chunk as any;
    const usage = finalChunk.usage;

    if (!usage || typeof usage.totalTokens !== 'number') {
      return null; // No usage data to evaluate
    }

    const promptTokens = usage.promptTokens ?? 0;
    const completionTokens = usage.completionTokens ?? 0;

    const inputCost = (promptTokens / 1000) * this.options.inputTokenPricePer1k;
    const outputCost = (completionTokens / 1000) * this.options.outputTokenPricePer1k;
    const totalCost = inputCost + outputCost;

    if (totalCost <= this.options.maxCostUsd) {
      return {
        action: GuardrailAction.FLAG,
        reason: `Request cost: $${totalCost.toFixed(4)}`,
        reasonCode: 'COST_TRACKED',
        metadata: { totalCost, inputCost, outputCost },
      };
    }

    // Agent "changes its mind": replaces expensive output with a budget message
    return {
      action: GuardrailAction.SANITIZE,
      modifiedText: this.options.budgetExceededText,
      reason: `Cost ceiling exceeded: $${totalCost.toFixed(4)} > $${this.options.maxCostUsd}`,
      reasonCode: 'COST_CEILING_EXCEEDED',
      metadata: { totalCost, inputCost, outputCost, ceiling: this.options.maxCostUsd },
    };
  }
}


