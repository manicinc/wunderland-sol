// File: frontend/src/components/agents/catalog/NerfAgent/NerfAgentTypes.ts
/**
 * @file NerfAgentTypes.ts
 * @description Type definitions for "Nerf" - the General AI Assistant.
 * @version 1.1.0 - Added text animation state.
 */

import type { Ref, ComputedRef } from 'vue';
import type { IAgentDefinition } from '@/services/agent.service';
import type { MainContent } from '@/store/chat.store';
import type { AdvancedHistoryConfig as StoreAdvancedHistoryConfig, HistoryStrategyPreset } from '@/services/advancedConversation.manager';
import type { TextAnimationUnit } from '@/composables/useTextAnimation';

export interface AdvancedHistoryConfig extends StoreAdvancedHistoryConfig {}

export const DEFAULT_NERF_HISTORY_CONFIG: AdvancedHistoryConfig = {
  numRecentMessagesToPrioritize: 8,
  simpleRecencyMessageCount: 8,
  strategyPreset: 'CONCISE_RECENT' as HistoryStrategyPreset,
  maxContextTokens: 3000,
  relevancyThreshold: 0.35,
  numRelevantOlderMessagesToInclude: 2,
  filterHistoricalSystemMessages: true,
  charsPerTokenEstimate: 3.8,
};

export interface NerfAgentTextAnimationState {
  animatedUnits: Ref<TextAnimationUnit[]>;
  isTextAnimating: Ref<boolean>;
}

export interface NerfAgentState extends NerfAgentTextAnimationState {
  isLoadingResponse: Ref<boolean>;
  currentSystemPrompt: Ref<string>;
}

export interface NerfAgentComputeds {
  agentDisplayName: ComputedRef<string>;
  mainContentToDisplay: ComputedRef<MainContent | null>;
}

export interface NerfAgentActions {
  initialize(): Promise<void>;
  cleanup(): void;
  handleNewUserInput(text: string): Promise<void>;
  renderMarkdown(content: string | null): string;
}

export interface NerfAgentComposable extends NerfAgentState, NerfAgentComputeds, NerfAgentActions {}