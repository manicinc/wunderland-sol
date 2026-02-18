/**
 * @file hitl.store.ts
 * @description Pinia store for Human-in-the-Loop (HITL) state management.
 * Handles pending approvals, clarifications, escalations, and feedback.
 *
 * @module VCA/Store/HITL
 * @version 1.0.0
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  hitlAPI,
  type HitlInteractionFE,
  type HitlApprovalRequestFE,
  type HitlClarificationRequestFE,
  type HitlEscalationRequestFE,
  type HitlApprovalResponseFE,
  type HitlClarificationResponseFE,
  type HitlEscalationResponseFE,
  type HitlFeedbackPayloadFE,
  type HitlStatsResponseFE,
  type HitlTypeFE,
} from '@/utils/api';

/**
 * HITL Store for managing Human-in-the-Loop interactions.
 *
 * @example
 * ```typescript
 * const hitlStore = useHitlStore();
 *
 * // Load pending interactions
 * await hitlStore.fetchPendingInteractions();
 *
 * // Approve a request
 * await hitlStore.approveInteraction('interaction-123', true, 'Approved!');
 * ```
 */
export const useHitlStore = defineStore('hitl', () => {
  // ============================================================================
  // State
  // ============================================================================

  /** All pending interactions */
  const interactions = ref<HitlInteractionFE[]>([]);

  /** Loading state */
  const isLoading = ref(false);

  /** Error state */
  const error = ref<string | null>(null);

  /** Statistics */
  const stats = ref<HitlStatsResponseFE | null>(null);

  /** Currently selected interaction for detail view */
  const selectedInteractionId = ref<string | null>(null);

  /** Last fetch timestamp */
  const lastFetchedAt = ref<Date | null>(null);

  /** Polling interval ID */
  let pollingInterval: ReturnType<typeof setInterval> | null = null;

  // ============================================================================
  // Computed
  // ============================================================================

  /**
   * Pending interactions filtered by type.
   */
  const pendingApprovals = computed<HitlApprovalRequestFE[]>(() =>
    interactions.value.filter(
      (i): i is HitlApprovalRequestFE => i.type === 'approval' && i.status === 'pending'
    )
  );

  const pendingClarifications = computed<HitlClarificationRequestFE[]>(() =>
    interactions.value.filter(
      (i): i is HitlClarificationRequestFE => i.type === 'clarification' && i.status === 'pending'
    )
  );

  const pendingEscalations = computed<HitlEscalationRequestFE[]>(() =>
    interactions.value.filter(
      (i): i is HitlEscalationRequestFE => i.type === 'escalation' && i.status === 'pending'
    )
  );

  /**
   * Total count of pending interactions.
   */
  const pendingCount = computed(
    () => interactions.value.filter(i => i.status === 'pending').length
  );

  /**
   * Count by severity for pending interactions.
   */
  const pendingBySeverity = computed(() => {
    const counts = { low: 0, medium: 0, high: 0, critical: 0 };
    interactions.value
      .filter(i => i.status === 'pending')
      .forEach(i => {
        if (i.severity) {
          counts[i.severity]++;
        }
      });
    return counts;
  });

  /**
   * Critical pending interactions that need immediate attention.
   */
  const criticalPending = computed(() =>
    interactions.value.filter(
      i => i.status === 'pending' && (i.severity === 'critical' || i.severity === 'high')
    )
  );

  /**
   * Currently selected interaction details.
   */
  const selectedInteraction = computed(() =>
    selectedInteractionId.value
      ? interactions.value.find(i => i.interactionId === selectedInteractionId.value)
      : null
  );

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Fetches all pending interactions from the server.
   * @param type - Optional filter by interaction type
   */
  async function fetchPendingInteractions(type?: HitlTypeFE): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await hitlAPI.listPendingInteractions({ type });
      if (response.data.success) {
        interactions.value = response.data.interactions;
        lastFetchedAt.value = new Date();
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch interactions';
      console.error('[HITL Store] Failed to fetch interactions:', err);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Fetches HITL statistics.
   */
  async function fetchStats(): Promise<void> {
    try {
      const response = await hitlAPI.getStats();
      stats.value = response.data;
    } catch (err) {
      console.error('[HITL Store] Failed to fetch stats:', err);
    }
  }

  /**
   * Approves or rejects an approval request.
   * @param interactionId - The interaction to respond to
   * @param approved - Whether to approve or reject
   * @param comments - Optional comments
   * @param chosenAlternative - Optional alternative selection
   */
  async function approveInteraction(
    interactionId: string,
    approved: boolean,
    comments?: string,
    chosenAlternative?: string | Record<string, unknown>
  ): Promise<void> {
    isLoading.value = true;
    error.value = null;

    const response: HitlApprovalResponseFE = {
      interactionId,
      approved,
      comments,
      chosenAlternative,
    };

    try {
      const result = await hitlAPI.approve(response);
      if (result.data.success) {
        // Update local state
        const index = interactions.value.findIndex(i => i.interactionId === interactionId);
        if (index >= 0) {
          interactions.value[index] = result.data.interaction;
        }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to submit approval';
      console.error('[HITL Store] Failed to approve:', err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Responds to a clarification request.
   * @param interactionId - The interaction to respond to
   * @param answer - The clarification answer
   * @param selectedOption - Optional selected option from choices
   */
  async function clarifyInteraction(
    interactionId: string,
    answer: string,
    selectedOption?: string
  ): Promise<void> {
    isLoading.value = true;
    error.value = null;

    const response: HitlClarificationResponseFE = {
      interactionId,
      answer,
      selectedOption,
    };

    try {
      const result = await hitlAPI.clarify(response);
      if (result.data.success) {
        // Update local state
        const index = interactions.value.findIndex(i => i.interactionId === interactionId);
        if (index >= 0) {
          interactions.value[index] = result.data.interaction;
        }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to submit clarification';
      console.error('[HITL Store] Failed to clarify:', err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Resolves an escalation.
   * @param interactionId - The interaction to resolve
   * @param resolution - Description of the resolution
   * @param resolvedSuccessfully - Whether it was resolved successfully
   */
  async function resolveEscalation(
    interactionId: string,
    resolution: string,
    resolvedSuccessfully?: boolean
  ): Promise<void> {
    isLoading.value = true;
    error.value = null;

    const response: HitlEscalationResponseFE = {
      interactionId,
      resolution,
      resolvedSuccessfully,
    };

    try {
      const result = await hitlAPI.resolveEscalation(response);
      if (result.data.success) {
        // Update local state
        const index = interactions.value.findIndex(i => i.interactionId === interactionId);
        if (index >= 0) {
          interactions.value[index] = result.data.interaction;
        }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to resolve escalation';
      console.error('[HITL Store] Failed to resolve:', err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Submits feedback for an agent.
   * @param payload - Feedback details
   */
  async function submitFeedback(payload: HitlFeedbackPayloadFE): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      await hitlAPI.submitFeedback(payload);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to submit feedback';
      console.error('[HITL Store] Failed to submit feedback:', err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Selects an interaction for detail view.
   * @param interactionId - The interaction ID to select
   */
  function selectInteraction(interactionId: string | null): void {
    selectedInteractionId.value = interactionId;
  }

  /**
   * Starts polling for new interactions.
   * @param intervalMs - Polling interval in milliseconds (default: 30000)
   */
  function startPolling(intervalMs: number = 30000): void {
    if (pollingInterval) {
      stopPolling();
    }

    // Initial fetch
    fetchPendingInteractions();

    // Set up interval
    pollingInterval = setInterval(() => {
      fetchPendingInteractions();
    }, intervalMs);

    console.log(`[HITL Store] Started polling every ${intervalMs}ms`);
  }

  /**
   * Stops polling for new interactions.
   */
  function stopPolling(): void {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
      console.log('[HITL Store] Stopped polling');
    }
  }

  /**
   * Clears all local state.
   */
  function clearState(): void {
    interactions.value = [];
    stats.value = null;
    selectedInteractionId.value = null;
    error.value = null;
    lastFetchedAt.value = null;
    stopPolling();
  }

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    interactions,
    isLoading,
    error,
    stats,
    selectedInteractionId,
    lastFetchedAt,

    // Computed
    pendingApprovals,
    pendingClarifications,
    pendingEscalations,
    pendingCount,
    pendingBySeverity,
    criticalPending,
    selectedInteraction,

    // Actions
    fetchPendingInteractions,
    fetchStats,
    approveInteraction,
    clarifyInteraction,
    resolveEscalation,
    submitFeedback,
    selectInteraction,
    startPolling,
    stopPolling,
    clearState,
  };
});
