// File: frontend/src/components/agents/CodingInterviewer/CodingInterviewerAgentTypes.ts
/**
 * @file CodingInterviewerAgentTypes.ts
 * @description Type definitions for the AI Coding Interviewer agent.
 * @version 1.0.1 - Corrected type inconsistencies for difficulty and problem session status.
 */

import type { Ref, ComputedRef } from 'vue';
import type { AgentId, IAgentDefinition } from '@/services/agent.service';

export type InterviewStage =
  | 'initial'
  | 'problem_selection'
  | 'problem_requesting'
  | 'problem_presented'
  | 'solution_input'
  | 'solution_evaluation_pending'
  | 'feedback_displayed'
  | 'session_summary' // Summary for a single problem, before next or end
  | 'interview_ended';

export type ProblemDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Varies'; // For actual problem difficulty
export type TargetDifficultySetting = 'Easy' | 'Medium' | 'Hard' | 'Any'; // For user settings

export interface InterviewProblem {
  id: string;
  title: string;
  statementMarkdown: string;
  language: string;
  difficulty: ProblemDifficulty;
  topics?: string[];
  constraints?: string;
  examples?: { input: string; output: string; explanation?: string }[];
  solutionApproachMarkdown?: string;
  optimalSolutionCode?: string;
}

export interface InterviewAttempt {
  id: string;
  solutionCode: string;
  submittedAt: string;
  feedbackMarkdown?: string;
  evaluationScore?: number;
  timeToSolveSeconds?: number;
}

export interface InterviewProblemSession {
  id: string;
  problemId: string; // Can be used if problems are from a predefined bank
  problemDetailsSnapshot: InterviewProblem; // Always store the exact problem presented
  attempts: InterviewAttempt[];
  startedAt: string;
  completedAt?: string;
  overallStatus: 'in_progress' | 'completed_satisfactory' | 'completed_needs_improvement' | 'skipped' | 'aborted'; // Corrected: using 'overallStatus'
  finalFeedbackSummary?: string;
}

export interface FullInterviewSession {
  id: string;
  title: string;
  userId?: string;
  overallInterviewFeedback?: string;
  problemSessions: InterviewProblemSession[];
  currentProblemSessionIdx: number;
  createdAt: string;
  updatedAt: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'aborted';
  totalTimeSeconds?: number;
  settings: {
    targetDifficulty: TargetDifficultySetting;
    targetTopics: string[];
    targetLanguages: string[];
  };
}

export interface CodingInterviewerAgentState {
  isLoadingLLM: Ref<boolean>;
  isProcessingLocal: Ref<boolean>;
  currentStage: Ref<InterviewStage>;
  currentSystemPrompt: Ref<string>;
  activeInterviewSession: Ref<FullInterviewSession | null>;
  currentProblemDisplay: Ref<InterviewProblem | null>; // Problem currently being displayed/worked on
  userSolutionInput: Ref<string>;
  pastInterviewSessions: Ref<FullInterviewSession[]>;
  selectedSessionForReviewId: Ref<string | null>;
  showSessionList: Ref<boolean>;
  isEditingSessionTitle: Ref<boolean>;
  sessionTitleEditBuffer: Ref<string>;
  timerValueSeconds: Ref<number>;
  isTimerRunning: Ref<boolean>;
  pendingToolCall: Ref<any | null>;
}

export interface CodingInterviewerAgentComputeds {
  agentDisplayName: ComputedRef<string>;
  activeDisplayMarkdown: ComputedRef<string>;
  isInterviewInProgress: ComputedRef<boolean>;
  reviewedSessionDetails: ComputedRef<FullInterviewSession | null>;
  currentProblemSession: ComputedRef<InterviewProblemSession | null>; // Added this
  currentProblemNumber: ComputedRef<number>;
  totalProblemsInSession: ComputedRef<number>;
}

export interface CodingInterviewerAgentActions {
  initialize(agentDefinition: IAgentDefinition): Promise<void>;
  cleanup(): void;
  startNewInterview(settings: Partial<FullInterviewSession['settings']>): Promise<void>;
  requestNextProblem(): Promise<void>;
  submitSolution(): Promise<void>;
  requestHint(): Promise<void>;
  endCurrentInterview(): Promise<void>;
  skipProblem(): Promise<void>;
  loadPastSessions(): Promise<void>;
  saveActiveInterviewSession(): Promise<void>;
  deleteInterviewSession(sessionId: string): Promise<void>;
  selectSessionForReview(sessionId: string): void;
  clearActiveSessionForReview(): void;
  beginEditSessionTitle(sessionId: string): void;
  confirmEditSessionTitle(): Promise<void>;
  cancelEditSessionTitle(): void;
  clearAllInterviewHistory(): Promise<void>;
  callInterviewerLLM(userInput: string, actionHint?: string): Promise<void>;
  startProblemTimer(): void;
  stopProblemTimer(recordTime?: boolean): void;
  resetTimer(): void;
  toggleSessionList(force?: boolean): void;
}

export interface CodingInterviewerComposable extends CodingInterviewerAgentState, CodingInterviewerAgentComputeds, CodingInterviewerAgentActions {}

export interface CodingInterviewerConfig {
  storageNamespace: string;
  defaultLanguage: string;
  problemRequestTimeoutMs: number;
  feedbackRequestTimeoutMs: number;
}

export const DEFAULT_INTERVIEWER_CONFIG: CodingInterviewerConfig = {
  storageNamespace: 'codingInterviewSessions_v1.2',
  defaultLanguage: 'python',
  problemRequestTimeoutMs: 30000,
  feedbackRequestTimeoutMs: 45000,
};
