// File: frontend/src/components/agents/catalog/LCAuditAgent/LCAudit/LCAuditAgentTypes.ts
/**
 * @file LCAuditAgentTypes.ts
 * @description Type definitions for the LC-Audit Agent.
 * @version 1.0.1 - Corrected imports for CompactMessageRendererPublicMethods.
 */

import type { Ref, ComputedRef } from 'vue';
import type { IAgentDefinition } from '@/services/agent.service'; // AgentId is part of IAgentDefinition
// MainContent is used by the composable when interacting with chatStore, so keep it if composable uses it
import type { MainContent } from '@/store/chat.store';
// Corrected import path for CompactMessageRendererPublicMethods
// Assuming CompactMessageRendererTypes.ts is in frontend/src/components/
import type { CompactMessageRendererPublicMethods } from '@/components/layouts/CompactMessageRenderer/CompactMessageRendererTypes';

export type UpdateStrategy =
  | "new_slideshow"
  | "append_to_final_slide"
  | "revise_slideshow"
  | "no_update_needed"
  | "clarification_needed";

export interface LlmAuditResponse {
  updateStrategy: UpdateStrategy;
  problemTitle?: string;
  content?: string;
  newContent?: string;
  clarification_question?: string;
}

export interface LCAuditAgentState {
  isLoadingResponse: Ref<boolean>;
  currentSystemPrompt: Ref<string>;
  currentSlideshowFullMarkdown: Ref<string>;
  currentProblemTitleForDisplay: Ref<string>;
  slideDurationsMs: Ref<number[]>;
  currentAppSlideIndex: Ref<number>;
  totalAppSlidesCount: Ref<number>;
  autoplayTimerId: Ref<ReturnType<typeof setTimeout> | null>;
  isAutoplayGloballyActive: Ref<boolean>;
  isCurrentSlidePlaying: Ref<boolean>;
  compactMessageRendererRef: Ref<CompactMessageRendererPublicMethods | null>;
  // hasNewSlideshowContentLoaded: Ref<boolean>; // This flag seems internal to composable's nextTick logic
}

export interface LCAuditAgentComputeds {
  agentDisplayName: ComputedRef<string>;
  contentDisplayAreaId: ComputedRef<string>;
}

export interface LCAuditAgentActions {
  initialize(agentDef: IAgentDefinition): Promise<void>;
  cleanup(): void;
  processProblemContext(problemInput: string): Promise<void>;
  toggleMasterAutoplay(): void;
  handleSlideChangedInRenderer(payload: { newIndex: number; totalSlides: number; navigatedManually: boolean }): void;
}

export interface LCAuditAgentComposable extends LCAuditAgentState, LCAuditAgentComputeds, LCAuditAgentActions {}