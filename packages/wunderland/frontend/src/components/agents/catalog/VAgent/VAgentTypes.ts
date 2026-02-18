// File: frontend/src/components/agents/catalog/VAgent/VAgentTypes.ts
/**
 * @file VAgentTypes.ts
 * @description Type definitions for "V" - the Advanced General AI Assistant.
 * @version 1.1.0 - Added text animation state to VAgentState and VAgentComposable.
 */

import type { Ref, ComputedRef } from 'vue';
import type { IAgentDefinition } from '@/services/agent.service';
import type { MainContent } from '@/store/chat.store';
import type { AdvancedHistoryConfig as StoreAdvancedHistoryConfig, HistoryStrategyPreset } from '@/services/advancedConversation.manager';
import type { TextAnimationUnit } from '@/composables/useTextAnimation';

export interface AdvancedHistoryConfig extends StoreAdvancedHistoryConfig {}

export const DEFAULT_V_HISTORY_CONFIG: AdvancedHistoryConfig = {
  numRecentMessagesToPrioritize: 10,
  simpleRecencyMessageCount: 12,
  strategyPreset: 'BALANCED_HYBRID' as HistoryStrategyPreset,
  maxContextTokens: 5000,
  relevancyThreshold: 0.45,
  numRelevantOlderMessagesToInclude: 4,
  filterHistoricalSystemMessages: false,
  charsPerTokenEstimate: 3.8,
};

export interface VAgentTextAnimationState {
  animatedUnits: Ref<TextAnimationUnit[]>;
  isTextAnimating: Ref<boolean>;
}

export interface VAgentState extends VAgentTextAnimationState {
  isLoadingResponse: Ref<boolean>;
  currentSystemPrompt: Ref<string>;
}

export interface VAgentComputeds {
  agentDisplayName: ComputedRef<string>;
  mainContentToDisplay: ComputedRef<MainContent | null>;
}

export interface VAgentActions {
  initialize(): Promise<void>; // Removed agentDef from here as well for consistency
  cleanup(): void;
  handleNewUserInput(text: string): Promise<void>;
  renderMarkdown(content: string | null): string;
}

export interface VAgentComposable extends VAgentState, VAgentComputeds, VAgentActions {}