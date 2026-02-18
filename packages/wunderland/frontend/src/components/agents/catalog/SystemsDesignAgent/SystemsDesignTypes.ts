// File: frontend/src/components/agents/catalog/SystemsDesignAgent/SystemsDesignAgentTypes.ts
/**
 * @file SystemsDesignAgentTypes.ts
 * @description Type definitions for "Architectron" - the AI System Design Agent.
 * @version 1.0.1 - Corrected HistoryStrategyPreset usage.
 */

import type { Ref, ComputedRef } from 'vue';
import type { IAgentDefinition } from '@/services/agent.service';
import type { MainContent } from '@/store/chat.store';
import { HistoryStrategyPreset, type AdvancedHistoryConfig as StoreAdvancedHistoryConfig } from '@/services/advancedConversation.manager'; // Ensure this path is correct

/**
 * @interface ArchitectronState
 * @description Defines the reactive state properties managed by the Architectron composable.
 */
export interface ArchitectronState {
  isLoadingResponse: Ref<boolean>;
  currentSystemPrompt: Ref<string>;
  currentDiagramMermaidCode: Ref<string>;
  diagramHistory: Ref<string[]>;
  currentHistoryDiagramIndex: Ref<number>;
  nfrInputText: Ref<string>;
  advancedHistoryConfig: Ref<StoreAdvancedHistoryConfig>; // Use the imported type
  isDiagramExplainable: Ref<boolean>;
}

/**
 * @interface ArchitectronComputeds
 * @description Defines computed properties for the Architectron composable.
 */
export interface ArchitectronComputeds {
  agentDisplayName: ComputedRef<string>;
  mainContentToDisplay: ComputedRef<MainContent | null>;
  canShowPreviousDiagram: ComputedRef<boolean>;
  canShowNextDiagram: ComputedRef<boolean>;
}

/**
 * @interface ArchitectronActions
 * @description Defines the actions (methods) available in the Architectron composable.
 */
export interface ArchitectronActions {
  initialize(agentDef: IAgentDefinition): Promise<void>;
  cleanup(): void;
  handleNewUserInput(text: string): Promise<void>;
  explainCurrentDiagram(): Promise<void>;
  showPreviousDiagram(): void;
  showNextDiagram(): void;
  showLatestDiagram(): void;
  updateNfrInput(text: string): void;
  extractMermaidCode(markdownText: string | undefined): string | undefined;
}

/**
 * @interface ArchitectronComposable
 * @description Complete type for the Architectron agent composable.
 */
export interface ArchitectronComposable extends ArchitectronState, ArchitectronComputeds, ArchitectronActions {}

/**
 * @interface ArchitectronAgentContext
 * @description Defines specific context fields Architectron might store/use in agentStore.
 */
export interface ArchitectronAgentContext {
  current_diagram_mermaid_code?: string;
  non_functional_requirements?: string;
  current_design_focus?: string;
}

export const DEFAULT_ARCHITECTRON_HISTORY_CONFIG: StoreAdvancedHistoryConfig = {
  numRecentMessagesToPrioritize: 10,
  simpleRecencyMessageCount: 16,
  strategyPreset: HistoryStrategyPreset.BALANCED_HYBRID, // Corrected: Use enum member
  maxContextTokens: 6000,
  relevancyThreshold: 0.5,
  numRelevantOlderMessagesToInclude: 5,
  filterHistoricalSystemMessages: false,
  charsPerTokenEstimate: 3.8,
};

export const MAX_DIAGRAM_HISTORY_LENGTH = 5;