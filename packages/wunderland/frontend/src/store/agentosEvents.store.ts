/**
 * @file agentosEvents.store.ts
 * @description Captures AgentOS workflow/agency telemetry surfaced as custom DOM events
 *              (`vca:workflow-update`, `vca:agency-update`) to support export/parity
 *              with the AgentOS client timeline.
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * Structured snapshot of a workflow update suitable for local export.
 */
export interface WorkflowUpdateEvent {
  timestamp: number;
  workflow: unknown;
  metadata?: unknown;
}

/**
 * Structured snapshot of an agency/seat update suitable for local export.
 */
export interface AgencyUpdateEvent {
  timestamp: number;
  agency: unknown;
  metadata?: unknown;
}

export const useAgentosEventsStore = defineStore('agentosEvents', () => {
  const workflowUpdates = ref<WorkflowUpdateEvent[]>([]);
  const agencyUpdates = ref<AgencyUpdateEvent[]>([]);

  /**
   * Appends a workflow update to the in-memory buffer, trimming when over limit.
   */
  function addWorkflowUpdate(event: WorkflowUpdateEvent): void {
    workflowUpdates.value.push(event);
    if (workflowUpdates.value.length > 1000) workflowUpdates.value.shift();
  }

  /**
   * Appends an agency update to the in-memory buffer, trimming when over limit.
   */
  function addAgencyUpdate(event: AgencyUpdateEvent): void {
    agencyUpdates.value.push(event);
    if (agencyUpdates.value.length > 1000) agencyUpdates.value.shift();
  }

  /**
   * Clears all captured telemetry updates.
   */
  function clear(): void {
    workflowUpdates.value = [];
    agencyUpdates.value = [];
  }

  return { workflowUpdates, agencyUpdates, addWorkflowUpdate, addAgencyUpdate, clear };
});


