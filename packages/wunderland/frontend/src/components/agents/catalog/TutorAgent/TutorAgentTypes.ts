// File: frontend/src/components/agents/catalog/TutorAgent/TutorAgentTypes.ts
/**
 * @file TutorAgentTypes.ts
 * @description Type definitions for "Professor Astra" - the AI Tutor Agent.
 * @version 1.0.3 - Adjusted PendingToolCall type, added error field to tool results.
 */

import type { Ref, ComputedRef } from 'vue';
import type { IAgentDefinition } from '@/services/agent.service';
import type { MainContent } from '@/store/chat.store';
import type { TutorLevel } from '@/services/voice.settings.service';
import { HistoryStrategyPreset, type AdvancedHistoryConfig as StoreAdvancedHistoryConfig } from '@/services/advancedConversation.manager';

export interface QuizQuestionOptionFE {
  text: string;
  isCorrect?: boolean;
}

export interface CreateQuizItemToolArgs {
  topic: string;
  question: string;
  options: QuizQuestionOptionFE[];
  questionType?: 'multiple-choice' | 'true-false' | 'short-answer';
  explanation?: string;
}

export interface QuizItemContent extends CreateQuizItemToolArgs {
  tool_call_id: string;
  userAnswer?: string | number;
  isAnswered?: boolean;
  isCorrect?: boolean;
  feedbackGiven?: string;
}

export interface CreateFlashcardToolArgs {
  topic: string;
  frontContent: string;
  backContent: string;
  category?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
}

export interface FlashcardContent extends CreateFlashcardToolArgs {
  tool_call_id: string;
  isFlipped?: boolean;
}

export interface QuizItemToolResult {
  userAnswered: boolean;
  selectedOptionText?: string;
  selectedOptionIndex?: number;
  userShortAnswer?: string;
  isCorrect?: boolean; // Optional: if FE can determine, or for user's self-assessment
  error?: string; // For reporting issues with the tool call itself
}

export interface FlashcardToolResult {
  reviewed: boolean;
  status?: string;
  error?: string; // For reporting issues
}

export interface AdvancedHistoryConfig extends StoreAdvancedHistoryConfig {}

export const DEFAULT_TUTOR_ADVANCED_HISTORY_CONFIG: AdvancedHistoryConfig = {
  numRecentMessagesToPrioritize: 8,
  simpleRecencyMessageCount: 12,
  strategyPreset: HistoryStrategyPreset.BALANCED_HYBRID,
  maxContextTokens: 4000,
  relevancyThreshold: 0.45,
  numRelevantOlderMessagesToInclude: 4,
  filterHistoricalSystemMessages: true,
  charsPerTokenEstimate: 3.8,
};

export interface TutorAgentState {
  isLoadingResponse: Ref<boolean>;
  currentSystemPrompt: Ref<string>;
  currentTutorLevel: Ref<TutorLevel>;
  showLevelSelector: Ref<boolean>;
  levelSelectorRef: Ref<HTMLElement | null>;
  pendingToolCall: Ref<{ // Renamed to pendingToolCallInfo in composable, type updated
    toolCallId: string;
    toolName: string;
    // toolArguments: any; // Arguments are now processed into activeQuizItem/activeFlashcard
    assistantMessageText?: string | null;
  } | null>;
  advancedHistoryConfig: Ref<AdvancedHistoryConfig>;
  activeQuizItem: Ref<QuizItemContent | null>;
  activeFlashcard: Ref<FlashcardContent | null>;
}

export interface TutorAgentComputeds {
  agentDisplayName: ComputedRef<string>;
  mainContentDisplayAreaId: ComputedRef<string>;
  mainContentToDisplay: ComputedRef<MainContent | null>;
}

export interface TutorAgentActions {
  initialize(agentDef: IAgentDefinition): Promise<void>;
  cleanup(): void;
  fetchSystemPrompt(): Promise<void>;
  setTutorLevel(level: TutorLevel): void;
  handleNewUserInput(text: string): Promise<void>;
  renderMarkdownForTutorView(content: string | null, quizItem?: QuizItemContent | null, flashcardItem?: FlashcardContent | null): string;
  addAllCopyButtonListenersToCodeBlocks(containerElement: HTMLElement): void;
  enhanceCodeBlockHTML(highlightedCodeHtml: string, lang: string, rawCode: string): string;
  handleClickOutsideLevelSelector(event: MouseEvent): void;
  submitQuizAnswer(answer: string | number): Promise<void>;
  acknowledgeFlashcard(): Promise<void>;
}

export interface TutorAgentComposable extends TutorAgentState, TutorAgentComputeds, TutorAgentActions {}

export interface TutorAgentConfig {
  enableAdvancedHistory: boolean;
}

export const DEFAULT_TUTOR_AGENT_CONFIG: TutorAgentConfig = {
  enableAdvancedHistory: true,
};

// Export tutor level
export type { TutorLevel } from '@/services/voice.settings.service';