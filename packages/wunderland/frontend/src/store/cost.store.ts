// File: frontend/src/store/cost.store.ts
/**
 * @file cost.store.ts
 * @version 1.0.1
 * @description Pinia store for managing and displaying API usage costs.
 * V1.0.1: Corrected API method names and Vue imports. Added JSDoc.
 */
import { defineStore } from 'pinia';
import { ref, readonly, type Ref } from 'vue'; // Added readonly, removed unused computed
import { costAPI, type SessionCostDetailsFE, type ResetCostResponseFE } from '@/utils/api';
// Removed: import { useAgentStore } from './agent.store'; // Was unused

/**
 * @interface CostState
 * @description Defines the reactive state properties for the cost store.
 * This is the internal representation and what's returned by the store setup function.
 */
export interface CostState {
  totalSessionCost: Readonly<Ref<number>>;
  costsByService: Readonly<Ref<{
    readonly [key: string]: {
      readonly totalCost: number;
      readonly count: number;
      readonly details?: ReadonlyArray<{
        readonly model?: string;
        readonly cost: number;
        readonly timestamp: string;
      }>;
    };
  }>>;
  sessionStartTime: Readonly<Ref<string | null>>;
  sessionEntryCount: Readonly<Ref<number>>;
  globalMonthlyCostEstimate: Readonly<Ref<number>>;
  sessionCostThreshold: Readonly<Ref<number | null>>;
  isThresholdReached: Readonly<Ref<boolean>>;
  isLoadingCost: Readonly<Ref<boolean>>;
  costError: Readonly<Ref<string | null>>;
}

/**
 * @interface CostStoreActions
 * @description Defines the actions available on the cost store.
 */
export interface CostStoreActions {
  /** Fetches current session cost details from the backend. */
  fetchSessionCost: () => Promise<void>;
  /** Resets the current session's cost on the backend and updates the store. */
  resetSessionCost: () => Promise<boolean>;
  /** Updates local cost state from data in an API response (e.g., after a chat call). */
  updateCostsFromApiResponse: (apiResponseData: ChatResponseDataFE | TranscriptionResponseFE | DiagramResponseFE) => void;
  /** Resets client-side display of global costs (e.g., on logout). */
  resetGlobalCostState: () => void;
}

// Helper type for combined store structure
type FullCostStore = CostState & CostStoreActions;

// Import types needed for updateCostsFromApiResponse
import type { ChatResponseDataFE, TranscriptionResponseFE, DiagramResponseFE } from '@/utils/api';

export const useCostStore = defineStore('cost', (): FullCostStore => {
  // --- State ---
  const totalSessionCost = ref<number>(0);
  const costsByService = ref<Record<string, { totalCost: number; count: number; details?: Array<{ model?: string; cost: number; timestamp: string}> }>>({});
  const sessionStartTime = ref<string | null>(null);
  const sessionEntryCount = ref<number>(0);
  const globalMonthlyCostEstimate = ref<number>(0);
  const sessionCostThreshold = ref<number | null>(null);
  const isThresholdReached = ref<boolean>(false);
  const isLoadingCost = ref<boolean>(false);
  const costError = ref<string | null>(null);

  const applySessionCostDetail = (detail: SessionCostDetailsFE): void => {
    totalSessionCost.value = detail.sessionCost ?? 0;
    costsByService.value = detail.costsByService || {};
    sessionStartTime.value = detail.sessionStartTime ?? null;
    sessionEntryCount.value = detail.entryCount ?? sessionEntryCount.value;
    globalMonthlyCostEstimate.value = detail.globalMonthlyCost ?? globalMonthlyCostEstimate.value;
    sessionCostThreshold.value = detail.threshold ?? sessionCostThreshold.value;
    isThresholdReached.value = detail.isThresholdReached ?? false;
  };

  // --- Actions ---

  /** @inheritdoc */
  async function fetchSessionCost(): Promise<void> {
    isLoadingCost.value = true;
    costError.value = null;
    try {
      const response = await costAPI.getSessionCost();
      applySessionCostDetail(response.data);
      console.log('[CostStore] Session cost details fetched.', response.data);
    } catch (error: any) {
      console.error('[CostStore] Error fetching session cost:', error);
      costError.value = error.response?.data?.message || error.message || 'Failed to fetch session costs.';
    } finally {
      isLoadingCost.value = false;
    }
  }

  /** @inheritdoc */
  async function resetSessionCost(): Promise<boolean> {
    isLoadingCost.value = true;
    costError.value = null;
    try {
      const response = await costAPI.resetSessionCost({ action: 'reset' }); // Corrected method name
      const data: ResetCostResponseFE = response.data;

      totalSessionCost.value = data.sessionCost;
      costsByService.value = data.costsByService || {};
      sessionStartTime.value = data.sessionStartTime;
      sessionEntryCount.value = 0; // Resetting implies new session
      isThresholdReached.value = false;

      console.log('[CostStore] Session cost reset successfully.', data);
      return true;
    } catch (error: any) {
      console.error('[CostStore] Error resetting session cost:', error);
      costError.value = error.response?.data?.message || error.message || 'Failed to reset session costs.';
      return false;
    } finally {
      isLoadingCost.value = false;
    }
  }

  /** @inheritdoc */
  function updateCostsFromApiResponse(apiResponseData: ChatResponseDataFE | TranscriptionResponseFE | DiagramResponseFE ): void {
    // Check if the response contains sessionCost details (common pattern from backend)
    const costDetailsSource = (apiResponseData as ChatResponseDataFE).sessionCost || (apiResponseData as TranscriptionResponseFE).sessionCost || (apiResponseData as DiagramResponseFE).sessionCost;

    if (costDetailsSource && typeof costDetailsSource.sessionCost === 'number') {
      const data = costDetailsSource as SessionCostDetailsFE; // Assume it matches this structure
      totalSessionCost.value = data.sessionCost;
      costsByService.value = data.costsByService || {};
      sessionStartTime.value = data.sessionStartTime; // sessionStartTime should be part of the detailed object
      sessionEntryCount.value = data.entryCount;
      isThresholdReached.value = data.isThresholdReached;
      sessionCostThreshold.value = data.threshold; // Update threshold as it might be dynamic per user eventually
      // globalMonthlyCostEstimate is not typically updated from individual chat responses.
      console.log('[CostStore] Costs updated from API response data.');
    } else {
      console.warn('[CostStore] updateCostsFromApiResponse: Received API response data without expected sessionCost structure.', apiResponseData);
    }
  }

  /** @inheritdoc */
  function resetGlobalCostState(): void {
    globalMonthlyCostEstimate.value = 0;
    console.log('[CostStore] Client-side global cost estimate display reset.');
  }

  return {
    // State (exposed as readonly refs)
    totalSessionCost: readonly(totalSessionCost),
    costsByService: readonly(costsByService),
    sessionStartTime: readonly(sessionStartTime),
    sessionEntryCount: readonly(sessionEntryCount),
    globalMonthlyCostEstimate: readonly(globalMonthlyCostEstimate),
    sessionCostThreshold: readonly(sessionCostThreshold),
    isThresholdReached: readonly(isThresholdReached),
    isLoadingCost: readonly(isLoadingCost),
    costError: readonly(costError),

    // Actions
    fetchSessionCost,
    resetSessionCost,
    updateCostsFromApiResponse,
    resetGlobalCostState,
  };
});
