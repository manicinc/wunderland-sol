// File: frontend/src/components/agents/Diary/DiaryAgentTypes.ts
/**
 * @file DiaryAgentTypes.ts
 * @description Type definitions for the Echo (Diary) agent, expanded for enhanced features.
 * This file outlines the core data structures, state management interfaces,
 * action definitions, and configuration for the diary agent functionality.
 * @version 2.1.0 - Corrected llmSuggestedMetadata type in DiaryAgentState. Standardized JSDoc.
 */

import type { Ref, ComputedRef } from 'vue';
import type { AgentId, IAgentDefinition } from '@/services/agent.service';
import type { ChatMessageFE } from '@/utils/api';
import type { DiaryAttachment, CanvasAttachment } from './AttachmentTypes';

// --- Core Diary Data Structures ---

/**
 * @type MoodRating
 * @description Represents a numerical mood rating, typically on a 1-5 scale.
 * @example 1 // Very Negative
 * @example 5 // Very Positive
 */
export type MoodRating = 1 | 2 | 3 | 4 | 5;

/**
 * @type SentimentPolarity
 * @description Defines the possible polarities of sentiment analysis.
 */
export type SentimentPolarity = 'positive' | 'neutral' | 'negative' | 'mixed';

/**
 * @interface DiarySentimentAnalysis
 * @description Detailed sentiment analysis results for a diary entry.
 */
export interface DiarySentimentAnalysis {
  /** @property {SentimentPolarity} overallPolarity - The overall sentiment polarity of the text. */
  overallPolarity: SentimentPolarity;
  /** @property {number} [positiveScore] - Confidence score for positive sentiment (0-1). */
  positiveScore?: number;
  /** @property {number} [negativeScore] - Confidence score for negative sentiment (0-1). */
  negativeScore?: number;
  /** @property {number} [neutralScore] - Confidence score for neutral sentiment (0-1). */
  neutralScore?: number;
  /** @property {number} [subjectivity] - Score indicating how opinionated vs. objective the text is (0-1). */
  subjectivity?: number;
  /** @property {{ text: string; sentiment: SentimentPolarity; score?: number }[]} [keyPhrases] - Array of key phrases and their individual sentiment. */
  keyPhrases?: { text: string; sentiment: SentimentPolarity; score?: number }[];
}

/**
 * @interface DiaryEntryAnalysis
 * @description Comprehensive AI-generated analysis of a diary entry.
 */
export interface DiaryEntryAnalysis {
  /** @property {DiarySentimentAnalysis} [sentiment] - Detailed sentiment analysis of the entry. */
  sentiment?: DiarySentimentAnalysis;
  /** @property {string[]} [keywords] - Main keywords extracted from the entry content. */
  keywords?: string[];
  /** @property {string[]} [themes] - Broader themes or topics identified in the entry. */
  themes?: string[];
  /** @property {number} [wordCount] - Total word count of the entry. */
  wordCount?: number;
  /** @property {number} [characterCount] - Total character count of the entry. */
  characterCount?: number;
  /** @property {number} [readingTimeMinutes] - Estimated reading time in minutes. */
  readingTimeMinutes?: number;
  /** @property {string[]} [actionItems] - Any actionable tasks or to-dos mentioned in the entry. */
  actionItems?: string[];
  /** @property {string[]} [questionsToSelf] - Questions the user posed to themselves within the entry. */
  questionsToSelf?: string[];
}

/**
 * @interface DiaryMediaAttachment
 * @description Represents a media file attached to a diary entry.
 */
export interface DiaryMediaAttachment {
  /** @property {string} id - Unique identifier for the media attachment. */
  id: string;
  /** @property {'image' | 'audio' | 'video_link'} type - The type of media attachment. */
  type: 'image' | 'audio' | 'video_link';
  /** @property {string} url - URL of the media. For images/audio, could be local blob URL or cloud URL. For video_link, an external URL. */
  url: string;
  /** @property {string} [caption] - Optional caption for the media. */
  caption?: string;
  /** @property {string} uploadedAt - ISO timestamp of when the media was uploaded/attached. */
  uploadedAt: string;
}

/**
 * @interface DiaryEntryLocation
 * @description Represents a geographical location associated with a diary entry.
 */
export interface DiaryEntryLocation {
  /** @property {number} latitude - Latitude of the location. */
  latitude: number;
  /** @property {number} longitude - Longitude of the location. */
  longitude: number;
  /** @property {string} [name] - Optional display name for the location (e.g., "Golden Gate Bridge"). */
  name?: string;
  /** @property {string} [address] - Optional formatted address string. */
  address?: string;
}

/**
 * @interface RichDiaryEntry
 * @description Comprehensive data structure for a single diary entry, used internally by the agent.
 */
export interface RichDiaryEntry {
  id: string;
  title: string;
  contentMarkdown: string;
  /** @deprecated Use richAttachments instead. Kept for backward compatibility. */
  canvasData?: string; // tldraw JSON snapshot for infinite canvas/whiteboard
  summary?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  mood?: string;
  moodRating?: MoodRating;
  location?: DiaryEntryLocation;
  weather?: string;
  isFavorite?: boolean;
  isDraft?: boolean;
  analysis?: DiaryEntryAnalysis;
  /** @deprecated Use richAttachments instead. Kept for backward compatibility. */
  attachments?: DiaryMediaAttachment[];
  /** New unified attachment system supporting canvas, images, audio, etc. */
  richAttachments?: DiaryAttachment[];
  linkedEntryIds?: string[];
  schemaVersion: number;
  source?: 'user_typed' | 'voice_dictation' | 'llm_assisted';
  llmInteractionLog?: ChatMessageFE[];
}

/**
 * @interface DiaryFilterOptions
 * @description Defines options for filtering and sorting diary entries.
 */
export interface DiaryFilterOptions {
  searchTerm?: string;
  dateRange?: { start?: string; end?: string };
  tags?: string[];
  moods?: string[];
  isFavorite?: boolean;
  hasLocation?: boolean;
  hasAttachments?: boolean;
  minMoodRating?: MoodRating;
  maxMoodRating?: MoodRating;
  sortBy?: keyof RichDiaryEntry | 'relevance';
  sortOrder?: 'asc' | 'desc';
}

// --- Composable Specific Types ---

/**
 * @type DiaryViewMode
 * @description Defines the different views or modes the Diary Agent's UI can be in.
 */
export type DiaryViewMode =
  | 'dashboard'
  | 'view_entry'
  | 'edit_entry'
  | 'compose_new_entry'
  | 'chat_interface'
  | 'settings';

/**
 * @interface SuggestDiaryMetadataToolArgs
 * @description Arguments for an LLM tool call to suggest metadata for a diary entry.
 */
export interface SuggestDiaryMetadataToolArgs {
  /** @property {string} entryContentSample - A substantial sample of the diary entry content. */
  entryContentSample: string;
  /** @property {string} [currentDate] - The current date (ISO string), can assist LLM. */
  currentDate?: string;
  /** @property {string[]} [existingTags] - Any tags already associated with the draft, if any. */
  existingTags?: string[];
}

/**
 * @interface SuggestDiaryMetadataToolOutput
 * @description Expected output structure from an LLM tool that suggests diary entry metadata.
 */
export interface SuggestDiaryMetadataToolOutput {
  /** @property {string} tentativeTitle - LLM's suggestion for the entry title. */
  tentativeTitle: string;
  /** @property {string[]} suggestedTags - Array of relevant tags suggested by the LLM. */
  suggestedTags: string[];
  /** @property {string} [mood] - LLM's suggestion for the mood. */
  mood?: string;
  /** @property {string} briefSummary - A concise, AI-generated summary of the entry content. */
  briefSummary: string;
}

/**
 * @interface DiaryAgentState
 * @description Defines the reactive state managed by the `useDiaryAgent` composable.
 */
export interface DiaryAgentState {
  isLoadingLLM: Ref<boolean>;
  isProcessingLocal: Ref<boolean>;
  currentSystemPrompt: Ref<string>;
  agentErrorMessage: Ref<string | null>;
  allEntries: Ref<RichDiaryEntry[]>;
  activeEntryId: Ref<string | null>;
  currentDraft: Ref<Partial<RichDiaryEntry> | null>;
  isComposing: Ref<boolean>;
  currentViewMode: Ref<DiaryViewMode>;
  showEntryListPanel: Ref<boolean>;
  showMetadataModal: Ref<boolean>;
  showAnalysisModal: Ref<boolean>;
  activeFilters: Ref<DiaryFilterOptions>;
  availableTags: Ref<string[]>;
  availableMoods: Ref<string[]>;
  /**
   * @property {Ref<(SuggestDiaryMetadataToolOutput & { toolCallId?: string; toolName?: string; }) | null>} llmSuggestedMetadata
   * @description Holds metadata suggested by the LLM, including tool call identifiers if applicable.
   * The structure aligns with `SuggestDiaryMetadataToolOutput` plus optional tool call info.
   */
  llmSuggestedMetadata: Ref<(SuggestDiaryMetadataToolOutput & { toolCallId?: string; toolName?: string; }) | null>;
  /** @deprecated Use fields from `llmSuggestedMetadata` or `currentDraft` directly for editing in modals/forms. */
  userEditedMetadata: Ref<{ title: string; tags: string; mood: string }>; // For form binding in modal, consider phasing out for direct draft editing.
  chatMessages: Ref<ChatMessageFE[]>;
  /** @deprecated UI components should manage their own focus state. */
  isChatInputFocused: Ref<boolean>; // Likely managed by the chat input component itself
  onThisDayEntry: Ref<RichDiaryEntry | null>;
  reflectionPrompt: Ref<string | null>;
}

/**
 * @interface DiaryAgentComputeds
 * @description Defines computed properties derived from the Diary Agent's state.
 */
export interface DiaryAgentComputeds {
  agentDisplayName: ComputedRef<string>;
  filteredAndSortedEntries: ComputedRef<RichDiaryEntry[]>;
  activeEntry: ComputedRef<RichDiaryEntry | null>;
  displayContentMarkdown: ComputedRef<string>; // Markdown for the main workspace area
  canSaveChanges: ComputedRef<boolean>;
  statistics: ComputedRef<{
    totalEntries: number;
    averageMood?: number;
    commonTags: { tag: string; count: number }[];
  }>;
}

/**
 * @interface DiaryAgentActions
 * @description Defines actions performable by the Diary Agent.
 */
export interface DiaryAgentActions {
  initialize(agentDefinition: IAgentDefinition): Promise<void>;
  cleanup(): void;
  loadAllEntries(): Promise<void>;
  createNewEntry(initialContent?: string): Promise<void>;
  selectEntryToView(entryId: string): void;
  editSelectedEntry(): void;
  saveCurrentEntry(): Promise<RichDiaryEntry | null>;
  deleteEntry(entryId: string): Promise<void>;
  toggleFavorite(entryId: string): Promise<void>;
  updateEntryMetadata(entryId: string, metadata: Partial<Pick<RichDiaryEntry, 'title' | 'tags' | 'mood' | 'summary' | 'isFavorite' | 'moodRating' | 'location' | 'analysis' | 'weather' | 'attachments' | 'linkedEntryIds'>>): Promise<void>;
  clearAllEntries(): Promise<void>;
  processUserInputForEntry(text: string): Promise<void>;
  requestMetadataSuggestion(entryContent: string): Promise<void>;
  confirmAndFinalizeEntryWithLLM(confirmedMetadata: { title: string; tags: string[]; mood?: string; summary: string }): Promise<void>;
  requestReflectionPrompt(): Promise<void>;
  analyzeEntrySentiment(entryId: string): Promise<DiarySentimentAnalysis | null>;
  extractEntryKeywords(entryId: string): Promise<string[] | null>;
  findRelatedEntries(entryId: string, count?: number): Promise<RichDiaryEntry[]>;
  setViewMode(mode: DiaryViewMode): void;
  toggleEntryListPanel(force?: boolean): void;
  updateFilters(filters: Partial<DiaryFilterOptions>): void;
  clearFilters(): void;
  handleFileUploadForImport(file: File): Promise<{importedCount: number, skippedCount: number, error?: string} | void>;
  exportDiaryData(format: 'json' | 'markdown_bundle'): Promise<void>;
  sendChatMessage(text: string): Promise<void>;
}

/**
 * @interface DiaryAgentComposable
 * @description The complete structure of the `useDiaryAgent` composable.
 */
export interface DiaryAgentComposable extends DiaryAgentState, DiaryAgentComputeds, DiaryAgentActions {}

/**
 * @interface DiaryAgentConfig
 * @description Configuration options specific to the Diary Agent.
 */
export interface DiaryAgentConfig {
  storageNamespace: string;
  defaultMoods: string[];
  autoSaveIntervalMs?: number;
  maxChatHistoryLength: number;
  enableMermaid: boolean;
}

/**
 * @constant DEFAULT_DIARY_AGENT_CONFIG
 * @description Default configuration values for the Diary Agent.
 */
export const DEFAULT_DIARY_AGENT_CONFIG: DiaryAgentConfig = {
  storageNamespace: 'echoDiaryEntries_v2.1', // Incremented version for potential schema evolution
  defaultMoods: ["Happy", "Sad", "Anxious", "Excited", "Calm", "Reflective", "Productive", "Tired", "Grateful", "Okay", "Stressed", "Inspired", "Curious", "Content", "Hopeful", "Worried"],
  autoSaveIntervalMs: 30000,
  maxChatHistoryLength: 20,
  enableMermaid: true,
};