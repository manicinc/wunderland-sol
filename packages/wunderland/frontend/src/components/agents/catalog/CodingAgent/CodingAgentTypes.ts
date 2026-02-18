// File: frontend/src/components/agents/CodingAgent/CodingAgentTypes.ts
/**
 * @file CodingAgentTypes.ts
 * @description Type definitions and interfaces for the CodePilot (Coding Assistant) agent.
 * Provides comprehensive typing for sessions, tool interactions, UI state, and API responses.
 * @version 2.1.0 - Updated state interfaces to use Ref and ComputedRef for explicit reactivity.
 */

import type { Ref, ComputedRef } from 'vue';
import type { AgentId, IAgentDefinition } from '@/services/agent.service';
import type { ChatMessageFE, ILlmUsageFE } from '@/utils/api';

/**
 * @interface CodingSession
 * @description Represents a saved coding session with user query, generated code, and metadata.
 */
export interface CodingSession {
  /** Unique identifier for the session */
  id: string;
  /** User-defined title for the session */
  title: string;
  /** Original user input query that initiated this session */
  userInputQuery: string;
  /** Generated code snippet (if any) */
  generatedCode?: string;
  /** Explanation in markdown format */
  explanationMarkdown: string;
  /** Programming language used */
  language: string;
  /** Optional tags for categorization */
  tags?: string[];
  /** ISO timestamp when session was created */
  createdAt: string;
  /** ISO timestamp when session was last updated */
  updatedAt: string;
  /** Whether this session is marked as favorite */
  isFavorite?: boolean;
  /** Optional complexity rating (1-10) */
  complexityRating?: number;
  /** Optional estimated time to complete (in minutes) */
  estimatedTimeMinutes?: number;
  /** Version for future migration compatibility */
  version?: string;
}

/**
 * @interface ToolCallRequest
 * @description Represents a pending tool call request from the LLM.
 */
export interface ToolCallRequest {
  /** Unique identifier for this tool call */
  toolCallId: string;
  /** Name of the tool being called */
  toolName: string;
  /** Arguments passed to the tool */
  toolArguments: Record<string, any>;
  /** Optional message from the assistant explaining the tool call */
  assistantMessageText?: string | null;
  /** Timestamp when the tool call was requested */
  requestedAt: number;
  /** Current status of the tool call */
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
}

/**
 * @interface CodingAgentState
 * @description State structure for the coding agent composable with proper ref types
 */
export interface CodingAgentState {
  // Core interaction state
  currentQuery: Ref<string>;
  currentCodeSnippet: Ref<string | null>;
  currentExplanationMarkdown: Ref<string | null>;
  currentLanguage: Ref<string>;
  currentDisplayTitle: Ref<string>;

  // Session management
  codingSessions: Ref<CodingSession[]>;
  activeSessionId: Ref<string | null>;
  showSessionListPanel: Ref<boolean>;
  searchTermSessions: Ref<string>;

  // Session editing state
  isEditingSessionTitle: Ref<boolean>;
  sessionTitleEditBuffer: Ref<string>;

  // Loading and processing states
  isLoadingResponse: Ref<boolean>;
  isProcessingLocal: Ref<boolean>; // For local operations like saving/loading sessions

  // Tool interaction state
  pendingToolCall: Ref<ToolCallRequest | null>;
  showToolInteractionModal: Ref<boolean>;
  toolResponseInput: Ref<string>; // For user to potentially modify tool args before execution

  // Agent configuration
  currentAgentSystemPrompt: Ref<string>;
}

/**
 * @interface CodingAgentComputeds
 * @description Computed properties for the coding agent with proper ComputedRef types
 */
export interface CodingAgentComputeds {
  agentDisplayName: ComputedRef<string>;
  activeSession: ComputedRef<CodingSession | null>;
  filteredSessions: ComputedRef<CodingSession[]>;
  mainContentForRenderer: ComputedRef<string>; // Content to be rendered by CompactMessageRenderer or similar
}

/**
 * @interface CodingAgentActions
 * @description Actions available for the coding agent - methods don't need ref types
 */
export interface CodingAgentActions {
  // Lifecycle
  initialize(agentConfig: IAgentDefinition): Promise<void>;
  cleanup(): Promise<void>;

  // Session management
  loadCodingSessions(): Promise<void>;
  saveCurrentWorkAsSession(titlePrompt?: string): Promise<void>;
  displaySavedSession(sessionId: string): void;
  deleteCodingSession(sessionId: string): Promise<void>;
  startNewCodingQuery(): void;
  clearCurrentWorkspace(): void;

  // Session editing
  beginEditSessionTitle(sessionId: string): void;
  confirmEditSessionTitle(): Promise<void>;
  cancelEditSessionTitle(): void;

  // Query processing
  handleCodingQuery(text: string): Promise<void>;
  parseAndSetCodeAndExplanation(markdownText: string, isStreamingUpdate?: boolean): void;

  // Tool interactions
  processFunctionCallFromLLM(funcCallData: any): Promise<void>; // 'any' for now, should be typed from API
  confirmAndExecuteTool(): Promise<void>;
  cancelToolCall(): Promise<void>;
  executeTool(toolName: string, toolArguments: any): Promise<ToolExecutionResult>; // Simulate/execute a tool
  sendToolResultToLLM(toolCallId: string, toolName: string, output: any, userMessageText: string): Promise<void>;

  // Utility actions
  copyToClipboard(text: string | null, type: 'Code' | 'Explanation'): Promise<void>;
  setWelcomeContent(message?: string): void;
  updateDisplayTitle(title: string): void;
}

/**
 * @interface CodingAgentComposable
 * @description Complete interface for the coding agent composable combining state, computeds, and actions
 */
export interface CodingAgentComposable extends CodingAgentState, CodingAgentComputeds, CodingAgentActions {}

/**
 * @interface ToolExecutionResult
 * @description Result of executing a coding tool
 */
export interface ToolExecutionResult {
  success: boolean;
  output: any; // Can be string, object, etc.
  error?: string;
  executionTimeMs: number;
  metadata?: Record<string, any>; // For any additional info about the execution
}

/**
 * @interface SessionFilterOptions
 * @description Options for filtering and sorting coding sessions
 */
export interface SessionFilterOptions {
  searchTerm?: string;
  language?: string;
  tags?: string[];
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'language';
  sortDirection?: 'asc' | 'desc';
  favoritesOnly?: boolean;
}

/**
 * @interface CodingAgentConfig
 * @description Configuration options for the coding agent
 */
export interface CodingAgentConfig {
  defaultLanguage: string;
  maxSessionsInMemory: number; // For display, actual storage is localForage
  sessionTitleTemplate: string; // e.g., "Coding Session - {date}"
  autoSaveSessions: boolean; // Future feature
  storageNamespace: string;
  maxCodeSnippetLength: number; // For display or processing limits
  enableSyntaxHighlighting: boolean;
  autoSaveInterval?: number; // For future auto-save implementation
  enableCloudSync?: boolean; // For future cloud sync
}

/**
 * @interface CodingAgentEmits
 * @description Events emitted by the coding agent component (CodingAgentView.vue)
 */
export interface CodingAgentEmits {
  (e: 'agent-event', event: {
    type: 'view_mounted' | 'session_created' | 'session_deleted' | 'query_processed' | 'tool_executed' | 'session_exported',
    agentId: string,
    label?: string,
    data?: any
  }): void;
  (e: 'request-coding-input'): void; // To signal the parent to focus input or show relevant UI
  (e: 'session-updated', session: CodingSession): void; // When a session is modified (e.g., title edit, favorited)
  (e: 'error', error: { type: string, message: string, details?: any }): void;
}

/**
 * @interface CodingAgentProps
 * @description Props for the coding agent component (CodingAgentView.vue)
 */
export interface CodingAgentProps {
  agentId: AgentId;
  agentConfig: IAgentDefinition; // The full definition of the active agent
  initialSessionId?: string; // Optionally load a specific session on mount
  config?: Partial<CodingAgentConfig>; // Override default composable config
}

/**
 * @type SessionStorageData
 * @description Type for session data stored in localStorage (actually localForage via service)
 */
export type SessionStorageData = Record<string, CodingSession>; // Key is session ID

/**
 * @type ToolCallStatus
 * @description Possible statuses for tool calls
 */
export type ToolCallStatus = 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';

/**
 * @type SupportedLanguages
 * @description Supported programming languages for syntax highlighting and processing
 */
export type SupportedLanguages =
  | 'javascript' | 'typescript' | 'python' | 'java' | 'c' | 'cpp' | 'csharp'
  | 'go' | 'rust' | 'php' | 'ruby' | 'swift' | 'kotlin' | 'dart' | 'scala'
  | 'html' | 'css' | 'scss' | 'vue' | 'react' | 'angular' | 'svelte'
  | 'sql' | 'bash' | 'powershell' | 'dockerfile' | 'yaml' | 'json' | 'xml'
  | 'markdown' | 'plaintext';

/**
 * @interface CodeAnalysisResult
 * @description Result of code analysis operations (simulated or future real tool)
 */
export interface CodeAnalysisResult {
  language: string;
  linesOfCode: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  issuesFound: string[];
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  suggestions: string[];
}

/**
 * @interface GitRepoStatus
 * @description Git repository status information (simulated or future real tool)
 */
export interface GitRepoStatus {
  branch: string;
  status: string; // e.g., "Clean", "Modified files"
  files: string[]; // List of modified/new files
  pathProvided: string;
  isClean: boolean;
  commitStatus?: {
    ahead: number;
    behind: number;
  };
}

/**
 * @interface BackendToolResponse
 * @description Response structure from backend tool execution (for future integration)
 */
export interface BackendToolResponse {
  success: boolean;
  toolName: string;
  result: any;
  executionTime: number; // Milliseconds
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * @constant DEFAULT_CODING_AGENT_CONFIG
 * @description Default configuration for the coding agent
 */
export const DEFAULT_CODING_AGENT_CONFIG: CodingAgentConfig = {
  defaultLanguage: 'python',
  maxSessionsInMemory: 100,
  sessionTitleTemplate: 'Coding Session {date}', // Placeholder for date formatting
  autoSaveSessions: false, // Keep false for now, explicit save
  storageNamespace: 'codePilotSessions_v1.1', // Ensure namespace is versioned
  maxCodeSnippetLength: 20000, // Max characters for code snippets
  enableSyntaxHighlighting: true,
  autoSaveInterval: 30000, // 30 seconds (for future auto-save)
  enableCloudSync: false, // Future feature
};

/**
 * @constant SUPPORTED_LANGUAGES_LIST
 * @description Array of all supported programming languages
 */
export const SUPPORTED_LANGUAGES_LIST: SupportedLanguages[] = [
  'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
  'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'dart', 'scala',
  'html', 'css', 'scss', 'vue', 'react', 'angular', 'svelte',
  'sql', 'bash', 'powershell', 'dockerfile', 'yaml', 'json', 'xml',
  'markdown', 'plaintext'
];

/**
 * @constant COMMON_DEV_KEYWORDS
 * @description Common development keywords for tag extraction from queries.
 * Using 'as const' ensures TypeScript treats these as literal types, not just string[].
 */
export const COMMON_DEV_KEYWORDS = [
  'javascript', 'python', 'java', 'c#', 'c++', 'typescript', 'algorithm', 'debug', 'error', 'refactor',
  'loop', 'function', 'class', 'array', 'string', 'object', 'api', 'http', 'database', 'sql', 'nosql',
  'react', 'vue', 'angular', 'node', 'server', 'client', 'bug', 'fix', 'feature',
  'optimization', 'test', 'unit test', 'integration test', 'style', 'css', 'html', 'component', 'service',
  'module', 'async', 'promise', 'callback', 'middleware', 'framework', 'library', 'package',
  'dependency', 'deployment', 'docker', 'kubernetes', 'git', 'version control', 'auth', 'security'
] as const;