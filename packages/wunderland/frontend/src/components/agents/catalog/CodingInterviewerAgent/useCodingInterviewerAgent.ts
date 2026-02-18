// File: frontend/src/components/agents/CodingInterviewer/useCodingInterviewerAgent.ts
/**
 * @file useCodingInterviewerAgent.ts
 * @description Composable for the AI Coding Interviewer agent logic.
 * @version 1.0.2 - Fixed TypeScript errors, implemented stubs for missing functions, corrected property names and types.
 */
import { ref, computed, watch, type Ref, nextTick } from 'vue'; // Added nextTick
import { generateId } from '@/utils/ids';
import { useAgentStore } from '@/store/agent.store';
import { useChatStore } from '@/store/chat.store';
import type { IAgentDefinition } from '@/services/agent.service';
import { voiceSettingsManager } from '@/services/voice.settings.service';
import { chatAPI, promptAPI, type ChatMessagePayloadFE, type TextResponseDataFE, type ChatMessageFE, type FunctionCallResponseDataFE } from '@/utils/api';
import type { ToastService } from '@/services/services';
import { localStorageService, type IStorageService } from '@/services/localStorage.service';
import type { AdvancedHistoryConfig } from '@/services/advancedConversation.manager';
import {
  type InterviewStage,
  type InterviewProblem,
  type InterviewAttempt,
  type InterviewProblemSession,
  type FullInterviewSession,
  // type CodingInterviewerAgentState, // Not directly used as interface for return
  // type CodingInterviewerAgentComputeds, // Not directly used as interface for return
  // type CodingInterviewerAgentActions, // Not directly used as interface for return
  type CodingInterviewerComposable,
  type CodingInterviewerConfig,
  DEFAULT_INTERVIEWER_CONFIG,
  type ProblemDifficulty,
  // type TargetDifficultySetting, // Not directly used as type for variable
} from './CodingInterviewerAgentTypes';

export function useCodingInterviewerAgent(
  agentConfigRef: Ref<IAgentDefinition>,
  toast?: ToastService,
  initialConfig?: Partial<CodingInterviewerConfig>
): CodingInterviewerComposable {
  const agentStore = useAgentStore();
  const chatStore = useChatStore();
  const storage: IStorageService = localStorageService;

  const config = ref<CodingInterviewerConfig>({ ...DEFAULT_INTERVIEWER_CONFIG, ...initialConfig });

  const isLoadingLLM = ref<boolean>(false);
  const isProcessingLocal = ref<boolean>(false);
  const currentStage = ref<InterviewStage>('initial');
  const currentSystemPrompt = ref<string>('');

  const activeInterviewSession = ref<FullInterviewSession | null>(null);

  const currentProblemDisplay = ref<InterviewProblem | null>(null);
  const userSolutionInput = ref<string>('');

  const pastInterviewSessions = ref<FullInterviewSession[]>([]);
  const selectedSessionForReviewId = ref<string | null>(null);

  const showSessionList = ref<boolean>(true);
  const isEditingSessionTitle = ref<boolean>(false);
  const sessionTitleEditBuffer = ref<string>('');

  const timerValueSeconds = ref<number>(0);
  const isTimerRunning = ref<boolean>(false);
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let problemStartTimeMs: number | null = null;

  const pendingToolCall = ref<any | null>(null);

  // === COMPUTEDS ===
  const agentDisplayName = computed(() => agentConfigRef.value?.label || "AI Interviewer");

  const currentProblemSession = computed<InterviewProblemSession | null>({
    get: () => {
      if (activeInterviewSession.value && activeInterviewSession.value.currentProblemSessionIdx >= 0 && activeInterviewSession.value.currentProblemSessionIdx < activeInterviewSession.value.problemSessions.length) {
        return activeInterviewSession.value.problemSessions[activeInterviewSession.value.currentProblemSessionIdx];
      }
      return null;
    },
    set: (newProblemSession) => {
        if(activeInterviewSession.value && newProblemSession){
            const idx = activeInterviewSession.value.problemSessions.findIndex(ps => ps.id === newProblemSession.id);
            if(idx !== -1){
                activeInterviewSession.value.problemSessions[idx] = newProblemSession;
                activeInterviewSession.value.currentProblemSessionIdx = idx;
            } else {
                // If adding a new one, push and then set index
                activeInterviewSession.value.problemSessions.push(newProblemSession);
                activeInterviewSession.value.currentProblemSessionIdx = activeInterviewSession.value.problemSessions.length - 1;
            }
        }
    }
  });

  const isInterviewInProgress = computed(() =>
    activeInterviewSession.value !== null &&
    (currentStage.value !== 'initial' && currentStage.value !== 'interview_ended')
  );

  const reviewedSessionDetails = computed<FullInterviewSession | null>(() => {
    if (selectedSessionForReviewId.value) {
      return pastInterviewSessions.value.find(s => s.id === selectedSessionForReviewId.value) || null;
    }
    return null;
  });

  const currentProblemNumber = computed(() => {
    return activeInterviewSession.value ? activeInterviewSession.value.currentProblemSessionIdx + 1 : 0;
  });

  const totalProblemsInSession = computed(() => {
    return activeInterviewSession.value ? activeInterviewSession.value.problemSessions.length : 0;
  });

  // Utility: Format time
  function formatTime(totalSeconds: number): string {
    if (totalSeconds < 0) totalSeconds = 0;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  const activeDisplayMarkdown = computed<string>(() => {
    if (isLoadingLLM.value && (currentStage.value === 'problem_requesting' || currentStage.value === 'solution_evaluation_pending')) {
      const action = currentStage.value === 'problem_requesting' ? 'Preparing New Problem' : 'Evaluating Your Solution';
      return `## ${action}...\n\n<div class="flex justify-center items-center p-12"><div class="interviewer-spinner large"></div></div>\n\n_Please wait a moment._`;
    }

    if (selectedSessionForReviewId.value && reviewedSessionDetails.value) {
      const reviewed = reviewedSessionDetails.value;
      let content = `# Reviewing Interview: ${reviewed.title}\n**Status:** ${reviewed.status}\n**Date:** ${new Date(reviewed.createdAt).toLocaleString()}\n\n---\n`;
      reviewed.problemSessions.forEach((ps, idx) => {
        content += `## Problem ${idx + 1}: ${ps.problemDetailsSnapshot.title || 'Problem Details'}\n`;
        content += `**Language:** ${ps.problemDetailsSnapshot.language}, **Difficulty:** ${ps.problemDetailsSnapshot.difficulty}\n`;
        content += `${ps.problemDetailsSnapshot.statementMarkdown}\n\n`;
        if (ps.attempts.length > 0) {
          const lastAttempt = ps.attempts[ps.attempts.length - 1];
          content += `**Your Last Solution Attempt:**\n\`\`\`${ps.problemDetailsSnapshot.language}\n${lastAttempt.solutionCode}\n\`\`\`\n\n`;
          if (lastAttempt.feedbackMarkdown) {
            content += `**Feedback Received:**\n${lastAttempt.feedbackMarkdown}\n\n`;
          }
        } else {
          content += "_No solution attempted for this problem in the reviewed session._\n\n";
        }
        content += "---\n";
      });
      return content;
    }

    switch (currentStage.value) {
      case 'initial':
        return `<div class="interviewer-welcome-container">
                  <div class="icon-wrapper"><UserCircleIcon class="main-icon" /></div>
                  <h2 class="welcome-title">${agentDisplayName.value}</h2>
                  <p class="welcome-subtitle">${agentConfigRef.value.description}</p>
                  <p class="text-sm mt-4">Click "Start New Interview" to begin.</p>
                </div>`;
      case 'problem_selection':
        return `## Configure Your Mock Interview\n\nSelect desired difficulty, topics, and languages.
                \n*(Configuration UI will be built here. For now, click "Request Problem" for a default problem.)*`;
      case 'problem_presented':
      case 'solution_input':
        if (currentProblemDisplay.value) {
          let problemContent = `# Problem ${currentProblemNumber.value}: ${currentProblemDisplay.value.title || 'Coding Challenge'}\n`;
          problemContent += `**Language:** ${currentProblemDisplay.value.language}, **Difficulty:** ${currentProblemDisplay.value.difficulty}\n\n`;
          problemContent += `${currentProblemDisplay.value.statementMarkdown}\n\n`;
          if (currentProblemDisplay.value.constraints) {
            problemContent += `### Constraints\n${currentProblemDisplay.value.constraints}\n\n`;
          }
          if (currentProblemDisplay.value.examples && currentProblemDisplay.value.examples.length > 0) {
            problemContent += `### Examples\n`;
            currentProblemDisplay.value.examples.forEach((ex, i) => {
              problemContent += `**Example ${i+1}:**\nInput: \`${ex.input}\`\nOutput: \`${ex.output}\`\n`;
              if (ex.explanation) problemContent += `Explanation: ${ex.explanation}\n`;
              problemContent += "\n";
            });
          }
          return problemContent;
        }
        return "## Problem Details\n_Loading problem statement..._";
      case 'feedback_displayed':
        if (currentProblemSession.value && currentProblemSession.value.attempts.length > 0) {
          const lastAttempt = currentProblemSession.value.attempts[currentProblemSession.value.attempts.length -1];
          let feedbackContent = `# Solution Feedback for Problem ${currentProblemNumber.value}\n\n`;
          feedbackContent += `**Your Solution:**\n\`\`\`${currentProblemSession.value.problemDetailsSnapshot.language}\n${lastAttempt.solutionCode}\n\`\`\`\n\n`;
          if(lastAttempt.feedbackMarkdown) {
            feedbackContent += `**Interviewer's Feedback:**\n${lastAttempt.feedbackMarkdown}`;
          } else {
            feedbackContent += "_Error: Feedback not available._";
          }
          return feedbackContent;
        }
        return "## Feedback\n_Awaiting feedback or no solution submitted._";
      case 'session_summary':
        if (currentProblemSession.value) {
          let summaryContent = `# Summary for Problem: ${currentProblemSession.value.problemDetailsSnapshot.title || 'Current Problem'}\n\n`;
          summaryContent += `**Status:** ${currentProblemSession.value.overallStatus.replace('_', ' ')}\n`;
          const lastAttempt = currentProblemSession.value.attempts.length > 0 ? currentProblemSession.value.attempts[currentProblemSession.value.attempts.length -1] : null;
          if(lastAttempt?.timeToSolveSeconds !== undefined) {
            summaryContent += `**Time Taken:** ${formatTime(lastAttempt.timeToSolveSeconds)}\n\n`;
          }
          if(lastAttempt?.feedbackMarkdown){
            summaryContent += `**Key Feedback Points:**\n${lastAttempt.feedbackMarkdown.substring(0,300)}...\n\n`;
          }
          summaryContent += `You can request the next problem or end the interview.`;
          return summaryContent;
        }
        return "## Problem Completed\nPreparing summary...";
      case 'interview_ended':
        let endMessage = `## Interview Ended\n\nThank you for participating!`;
        if(activeInterviewSession.value?.overallInterviewFeedback){
            endMessage += `\n\n### Overall Feedback:\n${activeInterviewSession.value.overallInterviewFeedback}`;
        }
        endMessage += `\n\nYou can review past sessions or start a new interview.`;
        return endMessage;
      default:
        return `## ${agentDisplayName.value}\n_Current Stage: ${currentStage.value.replace(/_/g, ' ')}..._`;
    }
  });

  // === WATCHERS ===
  watch(currentStage, async (newStage, oldStage) => {
    agentStore.updateAgentContext({ interviewStage: newStage, agentId: agentConfigRef.value.id });
    if (newStage === 'problem_presented' || newStage === 'solution_input') {
      if(oldStage !== 'problem_presented' && oldStage !== 'solution_input') {
          startProblemTimer();
      }
    } else if (isTimerRunning.value) {
      const shouldRecordTime = newStage === 'solution_evaluation_pending' || newStage === 'feedback_displayed' || newStage === 'session_summary';
      stopProblemTimer(shouldRecordTime);
    }
    _updateChatStoreMainContent();
  });

  watch([() => currentProblemDisplay.value, () => userSolutionInput.value, () => activeInterviewSession.value?.id], () => {
    _updateChatStoreMainContent();
  }, { deep: true });

  // === ACTIONS ===
  async function initialize(_agentDefinitionPassedIn: IAgentDefinition): Promise<void> {
    console.log(`[${agentDisplayName.value}] Initializing...`);
    isLoadingLLM.value = true;
    await _fetchSystemPrompt();
    await loadPastSessions();

    const persistedContext = agentStore.getAgentContext(agentConfigRef.value.id);
    if (persistedContext?.activeInterviewSessionId) {
      const restoredSession = pastInterviewSessions.value.find(s => s.id === persistedContext.activeInterviewSessionId);
      if (restoredSession && restoredSession.status === 'in_progress') {
        activeInterviewSession.value = JSON.parse(JSON.stringify(restoredSession));
        // currentProblemSessionIdx is derived from activeInterviewSession.value.currentProblemSessionIdx
        const problemSess = currentProblemSession.value;
        if (problemSess) {
            currentProblemDisplay.value = JSON.parse(JSON.stringify(problemSess.problemDetailsSnapshot));
            userSolutionInput.value = problemSess.attempts[problemSess.attempts.length-1]?.solutionCode || '';
            timerValueSeconds.value = problemSess.attempts[problemSess.attempts.length-1]?.timeToSolveSeconds || 0;
        }
        currentStage.value = (persistedContext.interviewStage as InterviewStage) || 'problem_presented';
        toast?.add({type: 'info', title: 'Interview Resumed', message: `Resumed interview: ${restoredSession.title}`});
      } else {
        currentStage.value = 'initial';
      }
    } else {
      currentStage.value = 'initial';
    }
    _updateChatStoreMainContent();
    isLoadingLLM.value = false;
  }

  function cleanup(): void {
    stopProblemTimer(false);
    if (activeInterviewSession.value && activeInterviewSession.value.status === 'in_progress') {
        agentStore.updateAgentContext({
            activeInterviewSessionId: activeInterviewSession.value.id,
            interviewStage: currentStage.value,
            agentId: agentConfigRef.value.id
        });
    }
    console.log(`[${agentDisplayName.value}] Cleanup complete.`);
  }

  async function startNewInterview(settings?: Partial<FullInterviewSession['settings']>): Promise<void> {
    _resetCurrentInterviewState();
    selectedSessionForReviewId.value = null;

    const now = new Date().toISOString();
    const defaultSettings: FullInterviewSession['settings'] = {
      targetDifficulty: 'Medium',
      targetTopics: [],
      targetLanguages: [voiceSettingsManager.settings.preferredCodingLanguage || config.value.defaultLanguage],
      ...(settings || {}),
    };

    const newInterviewId = generateId();
    activeInterviewSession.value = {
      id: newInterviewId,
      title: `Interview Practice - ${new Date(now).toLocaleDateString()}`,
      problemSessions: [],
      currentProblemSessionIdx: -1,
      createdAt: now,
      updatedAt: now,
      status: 'in_progress',
      settings: defaultSettings,
    };
    currentStage.value = 'problem_requesting';
    await _fetchNextProblemFromLLM(); // Implemented below
    await saveActiveInterviewSession();
  }

  async function requestNextProblem(): Promise<void> {
    if (!activeInterviewSession.value) {
      toast?.add({type:'warning', title:'No Active Interview', message:'Start a new interview first.'});
      return;
    }
    if (currentProblemSession.value && currentProblemSession.value.overallStatus === 'in_progress') {
        currentProblemSession.value.overallStatus = 'skipped';
        currentProblemSession.value.completedAt = new Date().toISOString();
    }

    currentStage.value = 'problem_requesting';
    userSolutionInput.value = '';
    await _fetchNextProblemFromLLM(); // Implemented below
    await saveActiveInterviewSession();
  }

  async function submitSolution(): Promise<void> {
    if (!currentProblemSession.value || !userSolutionInput.value.trim()) {
      toast?.add({ type: 'warning', title: 'No Solution', message: 'Please enter your solution code.' });
      return;
    }
    stopProblemTimer(true);
    currentStage.value = 'solution_evaluation_pending';

    const problemSnapshot = currentProblemSession.value.problemDetailsSnapshot;
    const solutionText = `Problem: ${problemSnapshot.title}\nLanguage: ${problemSnapshot.language}\nDifficulty: ${problemSnapshot.difficulty}\n\nMy Solution:\n\`\`\`${problemSnapshot.language}\n${userSolutionInput.value}\n\`\`\`\n\nPlease evaluate this solution for correctness, efficiency (time/space complexity), code style, and clarity. Provide constructive feedback and suggestions for improvement.`;

    chatStore.addMessage({ role: 'user', content: `Submitted solution for: ${problemSnapshot.title}`, agentId: agentConfigRef.value.id, timestamp: Date.now() });
    await callInterviewerLLM(solutionText, 'evaluateSolution');
    await saveActiveInterviewSession();
  }

  async function requestHint(): Promise<void> {
    if (!currentProblemSession.value || (currentStage.value !== 'solution_input' && currentStage.value !== 'problem_presented')) {
        toast?.add({type: 'info', title: 'Hint Not Applicable', message: 'You can request hints while solving a problem.'});
        return;
    }
    const problemTitle = currentProblemSession.value.problemDetailsSnapshot.title;
    const hintRequestText = `I'm working on the problem "${problemTitle}". Could I get a hint?`;
    chatStore.addMessage({ role: 'user', content: hintRequestText, agentId: agentConfigRef.value.id, timestamp: Date.now() });
    await callInterviewerLLM(hintRequestText, 'provideHint');
  }

  async function endCurrentInterview(): Promise<void> {
    stopProblemTimer(true);
    if (activeInterviewSession.value) {
      activeInterviewSession.value.status = 'completed';
      activeInterviewSession.value.updatedAt = new Date().toISOString();
      if(currentProblemSession.value && currentProblemSession.value.overallStatus === 'in_progress'){
          currentProblemSession.value.overallStatus = 'completed_satisfactory';
          currentProblemSession.value.completedAt = new Date().toISOString();
      }
      await saveActiveInterviewSession();
    }
    currentStage.value = 'interview_ended';
    const finalSession = activeInterviewSession.value;
    _resetCurrentInterviewState();
    if (finalSession) {
        const idx = pastInterviewSessions.value.findIndex(s => s.id === finalSession.id);
        if (idx !== -1) pastInterviewSessions.value.splice(idx, 1, finalSession);
        else pastInterviewSessions.value.unshift(finalSession);
        pastInterviewSessions.value.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.createdAt).getTime());
    }
    toast?.add({ type: 'info', title: 'Interview Ended', message: 'The interview session has concluded.' });
  }

  async function skipProblem(): Promise<void> {
    if(currentProblemSession.value){
        currentProblemSession.value.overallStatus = 'skipped';
        currentProblemSession.value.completedAt = new Date().toISOString();
        stopProblemTimer(false);
        await saveActiveInterviewSession();
    }
    await requestNextProblem();
  }

  async function loadPastSessions(): Promise<void> {
    isProcessingLocal.value = true;
    try {
      const stored = await storage.getAllItemsInNamespace<FullInterviewSession>(config.value.storageNamespace);
      pastInterviewSessions.value = Object.values(stored).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error(`[${agentDisplayName.value}] Error loading past interview sessions:`, error);
      toast?.add({ type: 'error', title: 'Load Error', message: 'Could not load past interview sessions.' });
    } finally {
      isProcessingLocal.value = false;
    }
  }

  async function saveActiveInterviewSession(): Promise<void> {
    if (!activeInterviewSession.value) return;
    isProcessingLocal.value = true;
    try {
      activeInterviewSession.value.updatedAt = new Date().toISOString();
      const sessionToSave = JSON.parse(JSON.stringify(activeInterviewSession.value));
      await storage.setItem(config.value.storageNamespace, sessionToSave.id, sessionToSave);

      const index = pastInterviewSessions.value.findIndex(s => s.id === sessionToSave.id);
      if (index > -1) {
        pastInterviewSessions.value.splice(index, 1, sessionToSave);
      } else {
        pastInterviewSessions.value.unshift(sessionToSave);
      }
      pastInterviewSessions.value.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error(`[${agentDisplayName.value}] Error saving active interview session:`, error);
      toast?.add({ type: 'error', title: 'Save Error', message: 'Could not save current interview progress.' });
    } finally {
      isProcessingLocal.value = false;
    }
  }

  async function deleteInterviewSession(sessionId: string): Promise<void> {
    isProcessingLocal.value = true;
    try {
      await storage.removeItem(config.value.storageNamespace, sessionId);
      pastInterviewSessions.value = pastInterviewSessions.value.filter(s => s.id !== sessionId);
      if (selectedSessionForReviewId.value === sessionId) {
        selectedSessionForReviewId.value = null;
        currentStage.value = 'initial';
      }
      if (activeInterviewSession.value?.id === sessionId) {
          _resetCurrentInterviewState();
          currentStage.value = 'initial';
      }
      toast?.add({ type: 'success', title: 'Session Deleted', message: 'Interview session removed.' });
    } catch (error) {
      console.error(`[${agentDisplayName.value}] Error deleting interview session ${sessionId}:`, error);
      toast?.add({ type: 'error', title: 'Delete Error', message: 'Failed to delete interview session.' });
    } finally {
      isProcessingLocal.value = false;
    }
  }

  function selectSessionForReview(sessionId: string): void {
    const session = pastInterviewSessions.value.find(s => s.id === sessionId);
    if (session) {
      _resetCurrentInterviewState();
      selectedSessionForReviewId.value = sessionId;
      currentStage.value = 'session_summary';
      toast?.add({type: 'info', title: 'Reviewing Session', message: `Displaying details for: ${session.title}`});
    } else {
      toast?.add({type: 'error', title: 'Not Found', message: 'Could not find session to review.'});
    }
  }
  function clearActiveSessionForReview(): void {
    selectedSessionForReviewId.value = null;
    if(currentStage.value !== 'solution_input' && currentStage.value !== 'problem_presented' && currentStage.value !== 'problem_requesting' && currentStage.value !== 'solution_evaluation_pending') {
        currentStage.value = 'initial';
    }
  }

  function beginEditSessionTitle(sessionId: string): void {
    const session = pastInterviewSessions.value.find(s => s.id === sessionId) || (activeInterviewSession.value?.id === sessionId ? activeInterviewSession.value : null);
    if (!session) return;
    if(activeInterviewSession.value && activeInterviewSession.value.id === sessionId) {
        selectedSessionForReviewId.value = null;
    } else {
        selectedSessionForReviewId.value = sessionId;
    }
    sessionTitleEditBuffer.value = session.title;
    isEditingSessionTitle.value = true;
  }

  async function confirmEditSessionTitle(): Promise<void> {
    const idToEdit = selectedSessionForReviewId.value || activeInterviewSession.value?.id;
    if (!idToEdit || !sessionTitleEditBuffer.value.trim()) {
      cancelEditSessionTitle();
      return;
    }

    let sessionRef: FullInterviewSession | undefined | null = null;
    const pastSessionIndex = pastInterviewSessions.value.findIndex(s => s.id === idToEdit);

    if (activeInterviewSession.value && activeInterviewSession.value.id === idToEdit) {
        sessionRef = activeInterviewSession.value;
    } else if (pastSessionIndex !== -1) {
        sessionRef = pastInterviewSessions.value[pastSessionIndex];
    }

    if (!sessionRef) {
      cancelEditSessionTitle();
      return;
    }

    sessionRef.title = sessionTitleEditBuffer.value.trim();
    sessionRef.updatedAt = new Date().toISOString();

    isProcessingLocal.value = true;
    try {
      await storage.setItem(config.value.storageNamespace, sessionRef.id, JSON.parse(JSON.stringify(sessionRef)));
      if (pastSessionIndex !== -1) {
         pastInterviewSessions.value.splice(pastSessionIndex, 1, JSON.parse(JSON.stringify(sessionRef)));
         pastInterviewSessions.value.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.createdAt).getTime());
      }
      toast?.add({ type: 'success', title: 'Title Updated', message: 'Session title has been saved.' });
    } catch (error) {
      console.error(`[${agentDisplayName.value}] Error updating session title:`, error);
      toast?.add({ type: 'error', title: 'Update Error', message: 'Failed to update session title.' });
    } finally {
      isProcessingLocal.value = false;
      cancelEditSessionTitle();
    }
  }

  function cancelEditSessionTitle(): void {
    isEditingSessionTitle.value = false;
    sessionTitleEditBuffer.value = '';
  }

  async function clearAllInterviewHistory(): Promise<void> {
    isProcessingLocal.value = true;
    try {
        await storage.clearNamespace(config.value.storageNamespace);
        pastInterviewSessions.value = [];
        selectedSessionForReviewId.value = null;
        if(activeInterviewSession.value){
            _resetCurrentInterviewState();
        }
        currentStage.value = 'initial';
        toast?.add({type: 'success', title: 'History Cleared', message: 'All interview history has been deleted.'});
    } catch (error) {
        console.error(`[${agentDisplayName.value}] Error clearing history:`, error);
        toast?.add({type: 'error', title: 'Clear Error', message: 'Could not clear interview history.'});
    } finally {
        isProcessingLocal.value = false;
    }
  }

  async function callInterviewerLLM(userInput: string, actionHint?: string): Promise<void> {
    isLoadingLLM.value = true;
    _updateChatStoreMainContent();

    try {
      if (!currentSystemPrompt.value) await _fetchSystemPrompt();
      const preferredLang = activeInterviewSession.value?.settings.targetLanguages[0] || voiceSettingsManager.settings.preferredCodingLanguage || config.value.defaultLanguage;

      const personaOverride = chatStore.getPersonaForAgent(agentConfigRef.value.id);
      const baseInstructions = _getAdditionalInstructionsForLLM(actionHint, userInput);
      const combinedInstructions = [baseInstructions, personaOverride?.trim()].filter(Boolean).join('\n\n');

      let finalSystemPrompt = currentSystemPrompt.value
        .replace(/{{LANGUAGE}}/g, preferredLang)
        .replace(/{{AGENT_CONTEXT_JSON}}/g, JSON.stringify({
          currentStage: currentStage.value,
          currentProblemTitle: currentProblemDisplay.value?.title,
          currentProblemDifficulty: currentProblemDisplay.value?.difficulty,
          actionHint: actionHint,
          sessionSettings: activeInterviewSession.value?.settings,
        }))
        .replace(/{{ADDITIONAL_INSTRUCTIONS}}/g, combinedInstructions);

      const historyConfig: Partial<AdvancedHistoryConfig> = { numRecentMessagesToPrioritize: 5 };
      const processedHistory = await chatStore.getHistoryForApi(agentConfigRef.value.id, userInput, finalSystemPrompt, historyConfig);

      const messagesForLlm: ChatMessageFE[] = [
        { role: 'system', content: finalSystemPrompt },
        ...processedHistory.map(m => ({ ...m, role: m.role as ChatMessageFE['role'] })),
      ];
       if (!messagesForLlm.find(m => m.role === 'user' && m.content === userInput)) {
        messagesForLlm.push({ role: 'user', content: userInput, timestamp: Date.now() });
      }

      const basePayload: ChatMessagePayloadFE = {
        messages: messagesForLlm,
        mode: agentConfigRef.value.id,
        language: preferredLang,
        userId: `frontend_user_interviewer_${generateId().substring(0,8)}`,
        conversationId: activeInterviewSession.value?.id || chatStore.getCurrentConversationId(agentConfigRef.value.id) || `interview-${Date.now()}`,
        stream: false,
      };

      const payload = chatStore.attachPersonaToPayload(agentConfigRef.value.id, basePayload);
      const response = await chatAPI.sendMessage(payload);
      chatStore.syncPersonaFromResponse(agentConfigRef.value.id, response.data);
      const responseData = response.data as TextResponseDataFE | FunctionCallResponseDataFE; // Can be either

      if (responseData.type === 'function_call_data') {
          // Handle function call if interviewer agent starts using tools
          console.warn("Interviewer agent received function call, not yet fully handled:", responseData);
          toast?.add({type: 'info', title: 'Tool Call Received', message: `Interviewer wants to use ${responseData.toolName}. This is not fully implemented yet.`});
          // For now, treat as error or simple message
           _processLLMResponse(`Interviewer proposed a tool: ${responseData.toolName}. Arguments: ${JSON.stringify(responseData.toolArguments)}`, actionHint);

      } else if (responseData.content) {
        const llmResponseContent = responseData.content;
        chatStore.addMessage({ role: 'assistant', content: llmResponseContent, agentId: agentConfigRef.value.id, model: responseData.model, usage: responseData.usage, timestamp: Date.now() });
        _processLLMResponse(llmResponseContent, actionHint);
      } else {
        throw new Error("LLM response was empty or invalid.");
      }

    } catch (error: any) {
      _handleLLMError(error, actionHint);
    } finally {
      isLoadingLLM.value = false;
      _updateChatStoreMainContent();
    }
  }

  function startProblemTimer(): void {
    if (isTimerRunning.value) return;
    problemStartTimeMs = Date.now();
    if(currentStage.value === 'problem_presented' || currentStage.value === 'solution_input') {
        const currentAttemptCount = currentProblemSession.value?.attempts.length || 0;
        if(currentAttemptCount === 0 || currentStage.value === 'problem_presented'){
            timerValueSeconds.value = 0;
        }
    }

    isTimerRunning.value = true;
    timerInterval = setInterval(() => {
      timerValueSeconds.value++;
    }, 1000);
  }

  function stopProblemTimer(recordTime: boolean = false): void {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    isTimerRunning.value = false;
    if (recordTime && problemStartTimeMs && currentProblemSession.value) {
        const elapsedSeconds = timerValueSeconds.value;
        const currentAttempts = currentProblemSession.value.attempts;
        if(currentAttempts.length > 0){
            const lastAttempt = currentAttempts[currentAttempts.length -1];
            if(lastAttempt.submittedAt && !lastAttempt.timeToSolveSeconds) {
                 lastAttempt.timeToSolveSeconds = elapsedSeconds;
            }
        }
    }
  }

  function resetTimer(): void {
    stopProblemTimer(false);
    timerValueSeconds.value = 0;
    problemStartTimeMs = null;
  }

  function toggleSessionList(force?: boolean): void {
    showSessionList.value = force !== undefined ? force : !showSessionList.value;
  }

  // === INTERNAL HELPERS ===
  async function _fetchSystemPrompt(): Promise<void> {
    const key = agentConfigRef.value?.systemPromptKey;
    if (!key) {
      currentSystemPrompt.value = "You are an AI Coding Interviewer. Present problems clearly, evaluate solutions fairly, and provide constructive, detailed feedback. Focus on one problem at a time.";
      return;
    }
    try {
      const response = await promptAPI.getPrompt(`${key}.md`);
      currentSystemPrompt.value = response.data.content || "Default Interviewer Prompt...";
    } catch (e) {
      console.error(`[${agentDisplayName.value}] Failed to load system prompt:`, e);
      currentSystemPrompt.value = "Default Interviewer Prompt (error loading specific).";
    }
  }

  function _getAdditionalInstructionsForLLM(actionHint?: string, userInput?: string): string {
    let instructions = "";
    const difficultySetting = activeInterviewSession.value?.settings.targetDifficulty || 'Medium';
    const topicsSetting = (activeInterviewSession.value?.settings.targetTopics || []).join(', ');

    if (actionHint === 'generateCodingProblem') {
        instructions = `Generate a new coding problem. Difficulty: ${difficultySetting}${topicsSetting ? `, Topics: ${topicsSetting}` : ''}. The problem statement should be clear, include examples, and specify constraints. Format it in Markdown.`;
    } else if (actionHint === 'evaluateSolution') {
        instructions = `The user has submitted a solution. Evaluate it thoroughly for correctness, efficiency (Big O for time and space), code style/clarity, and edge cases. Provide detailed, constructive feedback in Markdown. Explain your reasoning.`;
    } else if (actionHint === 'provideHint') {
        instructions = `The user is asking for a hint for the current problem: "${currentProblemDisplay.value?.title}". Provide a small, guiding hint, not the full solution.`;
    } else if (actionHint === 'summarizeInterview') {
        instructions = `The interview session is complete. Provide an overall summary of the user's performance across all problems, highlighting strengths and areas for continued practice.`;
    } else if (userInput) {
        instructions = `The user's input is: "${userInput.substring(0,150)}...". Respond empathetically and professionally, keeping the interview context in mind. If they are asking for clarification on the problem, provide it. If they are discussing their approach, listen and then prompt for code if appropriate.`;
    }
    return instructions;
  }

  // Stub for _fetchNextProblemFromLLM
  async function _fetchNextProblemFromLLM(): Promise<void> {
    if (!activeInterviewSession.value) return;
    const settings = activeInterviewSession.value.settings;
    const problemRequestPrompt = `Generate a coding problem with difficulty: ${settings.targetDifficulty}, topics: [${settings.targetTopics.join(', ')}], language focus: ${settings.targetLanguages[0]}.`;
    // Add this request to chat history for context, even if not displayed directly to user
    chatStore.addMessage({ role: 'system', content: `Requesting new problem from LLM: ${problemRequestPrompt}`, agentId: agentConfigRef.value.id, timestamp: Date.now() });
    await callInterviewerLLM(problemRequestPrompt, 'generateCodingProblem');
  }


  function _processLLMResponse(llmContent: string, actionHint?: string): void {
    if (!llmContent && actionHint !== 'generateCodingProblem' && actionHint !== 'evaluateSolution' && actionHint !== 'provideHint') {
        toast?.add({type: 'warning', title: 'Empty Response', message: 'Interviewer seems to be quiet right now.'});
        return;
    }

    if (actionHint === 'generateCodingProblem' || currentStage.value === 'problem_requesting') {
      const newProblemId = generateId();
      const problemTitleMatch = llmContent.match(/^#+\s*(.*)/m);
      const problemTitle = problemTitleMatch ? problemTitleMatch[1] : `Problem ${currentProblemNumber.value +1}`;

      // Map TargetDifficultySetting to ProblemDifficulty
      let problemActualDifficulty: ProblemDifficulty = 'Medium'; // Default
      const targetDiff = activeInterviewSession.value?.settings.targetDifficulty;
      if (targetDiff && targetDiff !== 'Any') {
          problemActualDifficulty = targetDiff as ProblemDifficulty;
      } else if (targetDiff === 'Any') {
          problemActualDifficulty = 'Varies';
      }


      currentProblemDisplay.value = {
        id: newProblemId,
        title: problemTitle,
        statementMarkdown: llmContent,
        language: activeInterviewSession.value?.settings.targetLanguages[0] || config.value.defaultLanguage,
        difficulty: problemActualDifficulty,
        topics: activeInterviewSession.value?.settings.targetTopics || [],
      };

      const newProblemSession: InterviewProblemSession = {
          id: generateId(),
          problemId: newProblemId,
          problemDetailsSnapshot: JSON.parse(JSON.stringify(currentProblemDisplay.value)), // Deep clone
          attempts: [],
          startedAt: new Date().toISOString(),
          overallStatus: 'in_progress',
      };
      if(activeInterviewSession.value){
          activeInterviewSession.value.problemSessions.push(newProblemSession);
          activeInterviewSession.value.currentProblemSessionIdx = activeInterviewSession.value.problemSessions.length -1;
      }
      currentStage.value = 'problem_presented';
      userSolutionInput.value = '';
      resetTimer();
      startProblemTimer();
    } else if (actionHint === 'evaluateSolution' || currentStage.value === 'solution_evaluation_pending') {
      if (currentProblemSession.value) {
        const newAttempt: InterviewAttempt = {
            id: generateId(),
            solutionCode: userSolutionInput.value,
            submittedAt: new Date().toISOString(),
            feedbackMarkdown: llmContent,
            timeToSolveSeconds: timerValueSeconds.value,
        };
        currentProblemSession.value.attempts.push(newAttempt);
        currentProblemSession.value.overallStatus = llmContent.toLowerCase().includes("excellent") || llmContent.toLowerCase().includes("correct approach") ? 'completed_satisfactory' : 'completed_needs_improvement';
        currentProblemSession.value.finalFeedbackSummary = llmContent.substring(0, 300) + (llmContent.length > 300 ? "..." : "");
      }
      currentStage.value = 'feedback_displayed';
    } else if (actionHint === 'provideHint') {
        if(currentProblemDisplay.value){
            currentProblemDisplay.value.statementMarkdown += `\n\n---\n**Hint from Interviewer:**\n${llmContent}\n---`;
        }
    } else if (actionHint === 'summarizeInterview' && activeInterviewSession.value) {
        activeInterviewSession.value.overallInterviewFeedback = llmContent;
        currentStage.value = 'interview_ended';
    } else {
      if (currentProblemDisplay.value && (currentStage.value === 'problem_presented' || currentStage.value === 'solution_input')) {
        currentProblemDisplay.value.statementMarkdown += `\n\n---\n**Interviewer:**\n${llmContent}\n---`;
      } else {
        console.warn("LLM response received without a clear context/actionHint:", llmContent);
      }
    }
  }

  function _resetCurrentInterviewState(): void {
    activeInterviewSession.value = null;
    // currentProblemSessionIdx.value = -1; // No longer direct ref
    currentProblemDisplay.value = null;
    userSolutionInput.value = '';
    resetTimer();
  }

  function _updateChatStoreMainContent(): void {
    let title = agentDisplayName.value;
    if(selectedSessionForReviewId.value && reviewedSessionDetails.value) {
        title = `Review: ${reviewedSessionDetails.value.title}`;
    } else if (activeInterviewSession.value) {
        title = activeInterviewSession.value.title;
        if(currentProblemDisplay.value) {
            title += ` - Problem ${currentProblemNumber.value}: ${currentProblemDisplay.value.title || 'Details'}`;
        }
    } else {
        title = `${agentDisplayName.value} - ${currentStage.value.replace(/_/g, ' ')}`
    }

    chatStore.updateMainContent({
      agentId: agentConfigRef.value.id,
      type: 'compact-message-renderer-data',
      data: activeDisplayMarkdown.value,
      title: title,
      timestamp: Date.now(),
    });
  }

  function _handleLLMError(error: any, actionHint?: string) {
    isLoadingLLM.value = false;
    chatStore.setMainContentStreaming(false);
    const errorMessage = error.response?.data?.message || error.message || `An error occurred with ${agentDisplayName.value} (Action: ${actionHint}).`;
    console.error(`[${agentDisplayName.value}] LLM Error (Action: ${actionHint}):`, error);
    toast?.add({ type: 'error', title: `${agentDisplayName.value} Error`, message: errorMessage, duration: 7000 });

     if (currentProblemDisplay.value) {
        currentProblemDisplay.value.statementMarkdown += `\n\n---\n**Error from ${agentDisplayName.value}:**\n${errorMessage}\n---`;
    } else if (currentStage.value === 'problem_requesting') {
        currentProblemDisplay.value = {
            id: 'error-problem-' + generateId(), title: 'Error Fetching Problem',
            statementMarkdown: `Could not fetch a new problem. **Error:** ${errorMessage}`,
            language: activeInterviewSession.value?.settings.targetLanguages[0] || 'N/A',
            difficulty: 'Varies'
        };
        currentStage.value = 'problem_presented';
    }
    _updateChatStoreMainContent();
  }

  return {
    isLoadingLLM, isProcessingLocal, currentStage, currentSystemPrompt,
    activeInterviewSession, currentProblemDisplay, userSolutionInput,
    pastInterviewSessions, selectedSessionForReviewId, showSessionList,
    isEditingSessionTitle, sessionTitleEditBuffer, timerValueSeconds,
    isTimerRunning, pendingToolCall,

    agentDisplayName, activeDisplayMarkdown, isInterviewInProgress,
    reviewedSessionDetails, currentProblemSession, currentProblemNumber, totalProblemsInSession,

    initialize, cleanup, startNewInterview, requestNextProblem, submitSolution,
    requestHint, endCurrentInterview, skipProblem, loadPastSessions,
    saveActiveInterviewSession, deleteInterviewSession, selectSessionForReview,
    clearActiveSessionForReview, beginEditSessionTitle, confirmEditSessionTitle,
    cancelEditSessionTitle, clearAllInterviewHistory, callInterviewerLLM,
    startProblemTimer, stopProblemTimer, resetTimer, toggleSessionList,
  };
}
