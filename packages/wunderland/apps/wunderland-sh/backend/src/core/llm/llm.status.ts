// File: backend/src/core/llm/llm.status.ts
/**
 * @file llm.status.ts
 * @description Maintains the bootstrap status for LLM provider initialization so that other parts
 * of the application (routes, health checks, UI diagnostics) can expose meaningful information.
 */

import { LlmProviderId, type ProviderAvailabilityMap } from './llm.config.service.js';

export interface ProviderStatusSummary {
  available: boolean;
  reason?: string;
  hint?: string;
  envVar?: string;
}

export interface LlmBootstrapStatus {
  ready: boolean;
  code?: string;
  message?: string;
  timestamp: string;
  providers: Record<LlmProviderId | string, ProviderStatusSummary>;
}

let currentStatus: LlmBootstrapStatus = {
  ready: false,
  code: 'BOOTSTRAP_PENDING',
  message: 'LLM services have not completed initialization.',
  timestamp: new Date().toISOString(),
  providers: {},
};

export const setLlmBootstrapStatus = (status: LlmBootstrapStatus): void => {
  currentStatus = {
    ...status,
    timestamp: status.timestamp ?? new Date().toISOString(),
    providers: { ...status.providers },
  };
};

export const updateLlmBootstrapStatus = (partial: Partial<LlmBootstrapStatus>): void => {
  currentStatus = {
    ...currentStatus,
    ...partial,
    timestamp: new Date().toISOString(),
    providers: partial.providers ? { ...partial.providers } : currentStatus.providers,
  };
};

export const getLlmBootstrapStatus = (): LlmBootstrapStatus => ({
  ...currentStatus,
  providers: { ...currentStatus.providers },
});

export const mapAvailabilityToStatus = (availability: ProviderAvailabilityMap): Record<LlmProviderId, ProviderStatusSummary> => {
  const summary: Record<LlmProviderId, ProviderStatusSummary> = {} as Record<LlmProviderId, ProviderStatusSummary>;
  for (const provider of Object.values(LlmProviderId)) {
    const providerStatus = availability[provider];
    summary[provider] = providerStatus
      ? { ...providerStatus }
      : { available: false, reason: 'Provider not configured.' };
  }
  return summary;
};
