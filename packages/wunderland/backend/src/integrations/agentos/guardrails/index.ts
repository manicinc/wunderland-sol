/**
 * @fileoverview AgentOS Guardrail Examples
 * @description Exports guardrail implementations and composition helpers.
 */

export { SensitiveTopicGuardrail, type SensitiveTopicConfig } from './SensitiveTopicGuardrail';
export { CostCeilingGuardrail, type CostCeilingConfig } from './CostCeilingGuardrail';
export { GenericLLMGuardrail, type GenericLLMGuardrailConfig } from './GenericLLMGuardrail';
export { KeywordGuardrail, type KeywordGuardrailConfig, type KeywordPattern } from './KeywordGuardrail';
export { GuardrailLogger, GuardrailSeverity, type GuardrailLogEntry, type GuardrailLoggerConfig, type EscalationAction } from './GuardrailLogger';
export { EscalationManager, InterventionStatus, type InterventionRequest, type EscalationManagerConfig } from './EscalationManager';

import type { IGuardrailService } from '@framers/agentos/core/guardrails/IGuardrailService';
import { GuardrailAction } from '@framers/agentos/core/guardrails/IGuardrailService';
import { SensitiveTopicGuardrail, type SensitiveTopicConfig } from './SensitiveTopicGuardrail';
import { CostCeilingGuardrail, type CostCeilingConfig } from './CostCeilingGuardrail';

/**
 * Combines multiple guardrail services into a single composite service.
 * Each service is called in order; the first action that is not ALLOW wins.
 */
export function composeGuardrails(services: IGuardrailService[]): IGuardrailService {
  return {
    async evaluateInput(payload) {
      for (const svc of services) {
        if (!svc.evaluateInput) continue;
        const result = await svc.evaluateInput(payload);
        if (result && result.action !== GuardrailAction.ALLOW) {
          return result;
        }
      }
      return null;
    },
    async evaluateOutput(payload) {
      for (const svc of services) {
        if (!svc.evaluateOutput) continue;
        const result = await svc.evaluateOutput(payload);
        if (result && result.action !== GuardrailAction.ALLOW) {
          return result;
        }
      }
      return null;
    },
  };
}


/**
 * Factory to create a default guardrail stack for production environments.
 * @returns Composite guardrail service with sensitive topic filtering and cost ceiling
 */
export function createDefaultGuardrailStack(opts?: {
  sensitiveTopics?: string[];
  maxCostUsd?: number;
}): IGuardrailService {
  const sensitiveConfig: SensitiveTopicConfig = {
    flaggedTopics: opts?.sensitiveTopics ?? ['self-harm', 'violence', 'illegal activity'],
    inputAction: 'sanitize',
    outputAction: 'sanitize',
    replacementText: 'I cannot assist with that topic. Please ask something else.',
  };

  const costConfig: CostCeilingConfig = {
    maxCostUsd: opts?.maxCostUsd ?? 0.05, // 5 cents max per request
    inputTokenPricePer1k: 0.0001, // $0.10 per 1M tokens
    outputTokenPricePer1k: 0.0002, // $0.20 per 1M tokens
    budgetExceededText: 'This response exceeded the cost ceiling. Please refine your request.',
  };

  return composeGuardrails([
    new SensitiveTopicGuardrail(sensitiveConfig),
    new CostCeilingGuardrail(costConfig),
  ]);
}


