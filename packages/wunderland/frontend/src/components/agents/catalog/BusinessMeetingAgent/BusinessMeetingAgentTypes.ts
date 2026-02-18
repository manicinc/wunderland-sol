// File: frontend/src/components/agents/catalog/BusinessMeetingAgent/BusinessMeetingAgentTypes.ts
/**
 * @file BusinessMeetingAgentTypes.ts
 * @description Type definitions for the "Meeting Scribe" (Business Meeting Assistant) agent.
 * Defines the core data structures, state, actions, and configuration for the agent.
 * @version 1.2.1 - Added explicit export for MeetingDashboardStats.
 */

import type { Ref, ComputedRef } from 'vue';
import type { AgentId, IAgentDefinition } from '@/services/agent.service';
import type { ChatMessageFE } from '@/utils/api';

// --- Core Meeting Data Structures ---

/**
 * @interface MeetingAttendee
 * @description Represents an attendee of a meeting.
 */
export interface MeetingAttendee {
  /** @property {string} id - Unique identifier for the attendee. */
  id: string;
  /** @property {string} name - Name of the attendee. */
  name: string;
  /** @property {string} [role] - Role of the attendee in the meeting. */
  role?: string;
  /** @property {string} [organization] - Organization the attendee belongs to. */
  organization?: string;
  /** @property {boolean} [isPresent] - Flag indicating if the attendee was present. */
  isPresent?: boolean;
  /** @property {string} [email] - Email address for notifications or assignments. */
  email?: string;
}

/**
 * @type ActionItemPriority
 * @description Defines the priority levels for an action item.
 */
export type ActionItemPriority = 'High' | 'Medium' | 'Low';

/**
 * @type ActionItemStatus
 * @description Defines the possible statuses for an action item.
 */
export type ActionItemStatus = 'Open' | 'In Progress' | 'Completed' | 'Blocked' | 'Cancelled';

/**
 * @interface ActionItem
 * @description Represents a single action item derived from a meeting.
 */
export interface ActionItem {
  /** @property {string} id - Unique identifier for the action item. */
  id: string;
  /** @property {string} parentId - Identifier of the RichMeetingSession this action item belongs to. */
  parentId: string;
  /** @property {string} taskDescription - The description of the task to be performed. */
  taskDescription: string;
  /** @property {string[]} assignedTo - Array of names or identifiers of attendees assigned to this item. */
  assignedTo: string[];
  /** @property {string} [reporter] - Name or identifier of the attendee who reported/suggested this action item. */
  reporter?: string;
  /** @property {string} [dueDate] - Due date for the action item (ISO string or human-readable). */
  dueDate?: string;
  /** @property {ActionItemStatus} status - Current status of the action item. */
  status: ActionItemStatus;
  /** @property {ActionItemPriority} [priority] - Priority level of the action item. */
  priority?: ActionItemPriority;
  /** @property {string} [notes] - Additional notes or context for the action item. */
  notes?: string;
  /** @property {string} createdAt - ISO timestamp of when the action item was created/identified. */
  createdAt: string;
  /** @property {string} updatedAt - ISO timestamp of the last update to the action item. */
  updatedAt: string;
  /** @property {string} [completedAt] - ISO timestamp of when the action item was completed (if applicable). */
  completedAt?: string;
  /** @property {string} [blockerReason] - Reason if the action item's status is 'Blocked'. */
  blockerReason?: string;
  /** @property {string} [relatedDecisionId] - Identifier of a related decision made in the meeting. */
  relatedDecisionId?: string;
  /** @property {string} [relatedDiscussionPointId] - Identifier of a related discussion point. */
  relatedDiscussionPointId?: string;
  /** @property {Omit<ActionItem, 'id' | 'parentId' | 'createdAt' | 'updatedAt'>[]} [subTasks] - Array of sub-tasks for complex action items. */
  subTasks?: Omit<ActionItem, 'id' | 'parentId' | 'createdAt' | 'updatedAt'>[];
}

/**
 * @interface Decision
 * @description Represents a decision made during a meeting.
 */
export interface Decision {
  /** @property {string} id - Unique identifier for the decision. */
  id: string;
  /** @property {string} decisionText - The text describing the decision. */
  decisionText: string;
  /** @property {string} [rationale] - Rationale behind the decision. */
  rationale?: string;
  /** @property {string[]} [madeBy] - Names or identifiers of attendees who made/agreed on the decision. */
  madeBy?: string[];
  /** @property {string} [timestamp] - ISO timestamp of when the decision was made. */
  timestamp?: string;
  /** @property {'Proposed' | 'Agreed' | 'Implemented' | 'Deferred'} [status] - Status of the decision. */
  status?: 'Proposed' | 'Agreed' | 'Implemented' | 'Deferred';
  /** @property {string} [nextSteps] - Next steps related to this decision. */
  nextSteps?: string;
}

/**
 * @interface DiscussionPoint
 * @description Represents a key point of discussion during a meeting.
 */
export interface DiscussionPoint {
  /** @property {string} id - Unique identifier for the discussion point. */
  id: string;
  /** @property {string} topic - The main topic of the discussion point. */
  topic: string;
  /** @property {string} summary - A summary of the discussion. */
  summary: string;
  /** @property {string[]} [keyTakeaways] - Key takeaways from this discussion point. */
  keyTakeaways?: string[];
  /** @property {string} [raisedBy] - Name or identifier of the attendee who raised this point. */
  raisedBy?: string;
  /** @property {{ name: string; url?: string }[]} [relatedDocuments] - Any documents related to this discussion. */
  relatedDocuments?: { name: string; url?: string }[];
  /** @property {'Positive' | 'Negative' | 'Neutral'} [sentiment] - Sentiment analysis of this specific discussion. */
  sentiment?: 'Positive' | 'Negative' | 'Neutral';
}

/**
 * @interface MeetingSentiment
 * @description Represents overall sentiment analysis for a meeting.
 */
export interface MeetingSentiment {
  /** @property {'Positive' | 'Neutral' | 'Negative' | 'Mixed'} overallTone - The overall tone of the meeting. */
  overallTone: 'Positive' | 'Neutral' | 'Negative' | 'Mixed';
  /** @property {number} [confidence] - Confidence score for the sentiment analysis (0-1). */
  confidence?: number;
  /** @property {string[]} [keyPositiveKeywords] - Keywords contributing to a positive sentiment. */
  keyPositiveKeywords?: string[];
  /** @property {string[]} [keyNegativeKeywords] - Keywords contributing to a negative sentiment. */
  keyNegativeKeywords?: string[];
  /** @property {'High' | 'Medium' | 'Low'} [participantEngagement] - Inferred engagement level of participants. */
  participantEngagement?: 'High' | 'Medium' | 'Low';
}

/**
 * @interface RichMeetingSession
 * @description Comprehensive data structure for a single processed meeting session.
 */
export interface RichMeetingSession {
  id: string;
  title: string;
  meetingDate: string; // ISO YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  durationMinutes?: number;
  location?: string;
  facilitator?: string;
  noteTaker?: string;
  attendees: MeetingAttendee[];
  agendaItems?: { id: string; item: string; presenter?: string; timeAllocatedMinutes?: number; discussed: boolean; notes?: string }[];
  rawInputNotes?: string;
  summaryMarkdown: string;
  fullTranscriptMarkdown?: string;
  keyDiscussionPoints: DiscussionPoint[];
  decisionsMade: Decision[];
  actionItems: ActionItem[];
  keyQuestionsRaised?: { id: string; question: string; askedBy?: string; answer?: string; status: 'Open' | 'Answered' | 'Deferred' }[];
  unresolvedIssues?: { id: string; issue: string; impact?: string; proposedSolution?: string }[];
  overallMeetingPurpose?: string;
  sentimentAnalysis?: MeetingSentiment;
  tags: string[];
  linkedMeetingIds?: { type: 'previous' | 'next' | 'related'; sessionId: string; reason?: string }[];
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  schemaVersion: number;
  llmInteractionLog?: ChatMessageFE[];
  isArchived?: boolean;
}

/**
 * @interface MeetingFilterOptions
 * @description Defines the available options for filtering and sorting meeting summaries.
 */
export interface MeetingFilterOptions {
  searchTerm?: string;
  dateRange?: { start?: string; end?: string }; // ISO YYYY-MM-DD
  attendeeName?: string;
  tags?: string[];
  actionItemStatus?: ActionItemStatus[];
  actionItemAssignedTo?: string;
  actionItemPriority?: ActionItemPriority;
  hasOpenActionItems?: boolean;
  isArchived?: boolean; // true for archived, false for non-archived, undefined for all/default
  sortBy?: keyof Pick<RichMeetingSession, 'title' | 'meetingDate' | 'createdAt' | 'updatedAt'> | 'relevance' | 'actionItemCount';
  sortOrder?: 'asc' | 'desc';
}

// --- Composable Specific Types ---

/**
 * @type MeetingViewMode
 * @description Defines the different views or modes the Business Meeting Agent's UI can be in.
 */
export type MeetingViewMode =
  | 'dashboard'
  | 'view_summary'
  | 'edit_summary'
  | 'process_notes'
  | 'input_new_notes'
  | 'compose_new_entry' // Placeholder, if a dedicated composition view is needed before full notes
  | 'action_items_board';

/**
 * @interface MeetingDashboardStats
 * @description Defines the structure for statistics displayed on the meeting dashboard.
 * ADDED THIS EXPORTED INTERFACE
 */
export interface MeetingDashboardStats {
  totalSessions: number;          // Renamed from totalSummaries for clarity
  totalActionItems: number;
  openActionItems: number;
  completedActionItems: number;
  meetingsThisWeek: number;       // Number of meetings with meetingDate in the current week
  avgActionItemsPerSession: number; // Calculated: totalActionItems / totalSessions (handle division by zero)
  // averageMeetingDuration?: string; // e.g., "1h 15m" - Can be added if durationMinutes is consistently populated
}


/**
 * @interface BusinessMeetingAgentState
 * @description Defines the reactive state managed by the `useBusinessMeetingAgent` composable.
 */
export interface BusinessMeetingAgentState {
  isLoadingLLM: Ref<boolean>;
  isProcessingLocal: Ref<boolean>;
  currentSystemPrompt: Ref<string>;
  agentErrorMessage: Ref<string | null>;
  allMeetingSessions: Ref<RichMeetingSession[]>;
  activeSessionId: Ref<string | null>;
  currentRawNotesInput: Ref<string>;
  currentViewMode: Ref<MeetingViewMode>;
  showSessionListPanel: Ref<boolean>;
  isEditingTitle: Ref<boolean>;
  titleEditBuffer: Ref<string>;
  activeFilters: Ref<MeetingFilterOptions>;
  availableTags: Ref<string[]>;
  availableAssignees: Ref<string[]>;
  editingActionItem: Ref<ActionItem | null>;
}

/**
 * @interface BusinessMeetingAgentComputeds
 * @description Defines computed properties derived from the agent's state.
 */
export interface BusinessMeetingAgentComputeds {
  agentDisplayName: ComputedRef<string>;
  filteredAndSortedSessions: ComputedRef<RichMeetingSession[]>;
  activeSession: ComputedRef<RichMeetingSession | null>;
  displayMarkdownForWorkspace: ComputedRef<string>;
  stats: ComputedRef<MeetingDashboardStats>; // UPDATED to use the exported type
  allOpenActionItemsGlobally: ComputedRef<ActionItem[]>;
}

/**
 * @interface BusinessMeetingAgentActions
 * @description Defines actions that can be performed by or on the Business Meeting Agent.
 */
export interface BusinessMeetingAgentActions {
  initialize(agentDefinition: IAgentDefinition): Promise<void>;
  cleanup(): void;
  loadAllSessions(): Promise<void>;
  selectSessionToView(sessionId: string): void;
  startNewSummaryProcess(initialNotes?: string): void;
  saveMeetingSession(sessionData: RichMeetingSession): Promise<RichMeetingSession | null>;
  deleteSession(sessionId: string): Promise<void>;
  updateSessionMetadata(sessionId: string, metadata: Partial<Omit<RichMeetingSession, 'id' | 'actionItems' | 'decisionsMade' | 'keyDiscussionPoints' | 'summaryMarkdown' | 'rawInputNotes'>>): Promise<void>;
  archiveSession(sessionId: string, archive: boolean): Promise<void>;
  clearAllSessions(): Promise<void>;
  processNotesForSummary(notes: string, suggestedTitle?: string): Promise<RichMeetingSession | null>;
  clarifyAndResummarize(sessionId: string, clarification: string): Promise<RichMeetingSession | null>;
  extractEntitiesFromSummary(sessionId: string, forceExtraction?: boolean): Promise<Partial<ExtractMeetingEntitiesToolOutput> | null>;
  generateFollowUpEmail(sessionId: string): Promise<string | null>;
  addActionItem(sessionId: string, itemData: Omit<ActionItem, 'id' | 'parentId' | 'createdAt' | 'updatedAt'>): Promise<ActionItem | null>;
  updateActionItem(sessionId: string, itemId: string, updates: Partial<ActionItem>): Promise<ActionItem | null>;
  deleteActionItem(sessionId: string, itemId: string): Promise<boolean>;
  setViewMode(mode: MeetingViewMode): void;
  toggleSessionListPanel(force?: boolean): void;
  updateFilters(filters: Partial<MeetingFilterOptions>): void;
  clearFilters(): void;
  importSessions(file: File): Promise<{ importedCount: number; skippedCount: number; error?: string }>;
  exportSessions(format: 'json_all' | 'markdown_selected' | 'csv_action_items' | 'ical_action_items'): Promise<void>;
}

/**
 * @interface BusinessMeetingAgentComposable
 * @description The complete structure of the `useBusinessMeetingAgent` composable.
 */
export interface BusinessMeetingAgentComposable extends BusinessMeetingAgentState, BusinessMeetingAgentComputeds, BusinessMeetingAgentActions {}

/**
 * @interface BusinessMeetingAgentConfig
 * @description Configuration options for the Business Meeting Agent.
 */
export interface BusinessMeetingAgentConfig {
  storageNamespace: string;
  defaultMeetingTitle: string;
  llmProcessingTimeoutMs: number;
  autoExtractEntities: boolean;
  defaultActionItemStatus: ActionItemStatus;
  defaultActionItemPriority: ActionItemPriority;
}

/**
 * @constant DEFAULT_MEETING_AGENT_CONFIG
 * @description Default configuration values for the Business Meeting Agent.
 */
export const DEFAULT_MEETING_AGENT_CONFIG: BusinessMeetingAgentConfig = {
  storageNamespace: 'meetingScribeSessions_v1.2',
  defaultMeetingTitle: 'Meeting Summary',
  llmProcessingTimeoutMs: 75000,
  autoExtractEntities: true,
  defaultActionItemStatus: 'Open',
  defaultActionItemPriority: 'Medium',
};

/**
 * @interface ExtractMeetingEntitiesToolArgs
 * @description Arguments for a potential LLM tool/function call to extract structured entities.
 */
export interface ExtractMeetingEntitiesToolArgs {
  summaryOrTranscriptMarkdown: string;
  context?: string;
  existingAttendees?: string[];
}

/**
 * @interface ExtractMeetingEntitiesToolOutput
 * @description Expected output structure from an LLM tool/function call that extracts meeting entities.
 */
export interface ExtractMeetingEntitiesToolOutput {
  actionItems: Omit<ActionItem, 'id' | 'parentId' | 'createdAt' | 'updatedAt'>[];
  decisionsMade: Omit<Decision, 'id'>[];
  keyDiscussionPoints?: Omit<DiscussionPoint, 'id'>[];
  attendees?: Partial<MeetingAttendee>[];
  meetingTitleSuggestion?: string;
  meetingDateSuggestion?: string; // ISO
  tagsSuggestion?: string[];
}