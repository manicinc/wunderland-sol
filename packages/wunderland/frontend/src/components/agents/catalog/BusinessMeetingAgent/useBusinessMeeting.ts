// File: frontend/src/components/agents/BusinessMeetingAgent/useBusinessMeetingAgent.ts
/**
 * @file useBusinessMeetingAgent.ts
 * @description Composable for the "Meeting Scribe" (Business Meeting Assistant) agent.
 * Manages meeting summary creation, storage, LLM interactions, UI state,
 * and advanced features including detailed action item tracking.
 * @version 1.2.0 - Integrated error fixes, toast notifications, refined LLM interaction logic,
 * and enhanced documentation. Addresses modularity for V1.
 */
import { ref, computed, type Ref, inject } from 'vue';
import { generateId } from '@/utils/ids';
import { useChatStore, type MainContent } from '@/store/chat.store';
import type { IAgentDefinition } from '@/services/agent.service';
import {
  chatAPI,
  promptAPI,
  type ChatMessagePayloadFE,
  type TextResponseDataFE,
  type FunctionCallResponseDataFE,
  type ChatMessageFE,
  type ChatResponseDataFE,
} from '@/utils/api';
import type { ToastService, ToastMessage } from '@/services/services';
import { localStorageService, type IStorageService } from '@/services/localStorage.service';

import {
  type RichMeetingSession,
  type MeetingViewMode,
  type MeetingFilterOptions,
  type ActionItem,
  type BusinessMeetingAgentComposable,
  type BusinessMeetingAgentConfig,
  DEFAULT_MEETING_AGENT_CONFIG,
  type ExtractMeetingEntitiesToolArgs,
  type ExtractMeetingEntitiesToolOutput,
  type Decision,
  type DiscussionPoint,
  type MeetingAttendee,
} from './BusinessMeetingAgentTypes';

/**
 * @function useBusinessMeetingAgent
 * @description Composable function to manage all logic for the Business Meeting Agent.
 * @param {Ref<IAgentDefinition>} agentConfigRef - Reactive reference to the agent's definition.
 * @param {Partial<BusinessMeetingAgentConfig>} [initialConfig] - Optional initial configuration overrides.
 * @returns {BusinessMeetingAgentComposable} The fully equipped composable for the agent.
 */
export function useBusinessMeetingAgent(
  agentConfigRef: Ref<IAgentDefinition>,
  initialConfig?: Partial<BusinessMeetingAgentConfig>
): BusinessMeetingAgentComposable {
  const chatStore = useChatStore();
  const storage: IStorageService = localStorageService;
  const config = ref<BusinessMeetingAgentConfig>({ ...DEFAULT_MEETING_AGENT_CONFIG, ...initialConfig });
  const toast = inject<ToastService>('toast');

  // === STATE ===
  const isLoadingLLM = ref<boolean>(false);
  const isProcessingLocal = ref<boolean>(false);
  const currentSystemPrompt = ref<string>('');
  const agentErrorMessage = ref<string | null>(null);

  const allMeetingSessions = ref<RichMeetingSession[]>([]);
  const activeSessionId = ref<string | null>(null);
  const currentRawNotesInput = ref<string>(''); // For notes being actively input

  const currentViewMode = ref<MeetingViewMode>('dashboard');
  const showSessionListPanel = ref<boolean>(true); // Default to true, can be toggled
  const isEditingTitle = ref<boolean>(false);
  const titleEditBuffer = ref<string>('');

  const activeFilters = ref<MeetingFilterOptions>({ sortBy: 'updatedAt', sortOrder: 'desc', isArchived: false });
  const availableTags = ref<string[]>([]);
  const availableAssignees = ref<string[]>([]);

  const editingActionItem = ref<ActionItem | null>(null);

  // === COMPUTEDS ===
  const agentDisplayName = computed<string>(() => agentConfigRef.value?.label || 'Meeting Scribe');

  const filteredAndSortedSessions = computed<RichMeetingSession[]>(() => {
    let sessions = [...allMeetingSessions.value];

    // Apply 'isArchived' filter first, unless explicitly set to show all or only archived
    if (activeFilters.value.isArchived === undefined || activeFilters.value.isArchived === false) {
        sessions = sessions.filter(s => !s.isArchived);
    } else if (activeFilters.value.isArchived === true) {
        sessions = sessions.filter(s => s.isArchived);
    } // If isArchived is some other value or not set in filter, implies show all (though UI should prevent this)

    if (activeFilters.value.searchTerm) {
      const term = activeFilters.value.searchTerm.toLowerCase();
      sessions = sessions.filter(s =>
        s.title.toLowerCase().includes(term) ||
        (s.summaryMarkdown && s.summaryMarkdown.toLowerCase().includes(term)) ||
        (s.rawInputNotes && s.rawInputNotes.toLowerCase().includes(term)) ||
        (s.tags || []).some(t => t.toLowerCase().includes(term)) ||
        (s.attendees || []).some(a => a.name.toLowerCase().includes(term)) ||
        (s.actionItems || []).some(ai => ai.taskDescription.toLowerCase().includes(term))
      );
    }
    if (activeFilters.value.tags && activeFilters.value.tags.length > 0) {
      sessions = sessions.filter(s => activeFilters.value.tags!.every(ft => (s.tags || []).map(t => t.toLowerCase()).includes(ft.toLowerCase())));
    }
    if (activeFilters.value.attendeeName) {
      const name = activeFilters.value.attendeeName.toLowerCase();
      sessions = sessions.filter(s => (s.attendees || []).some(a => a.name.toLowerCase().includes(name)));
    }
    if (activeFilters.value.actionItemStatus && activeFilters.value.actionItemStatus.length > 0) {
        sessions = sessions.filter(s => (s.actionItems || []).some(ai => activeFilters.value.actionItemStatus!.includes(ai.status)));
    }
    if (activeFilters.value.hasOpenActionItems) {
        sessions = sessions.filter(s => (s.actionItems || []).some(ai => ai.status === 'Open' || ai.status === 'In Progress'));
    }
    if (activeFilters.value.actionItemAssignedTo) {
        const assignee = activeFilters.value.actionItemAssignedTo.toLowerCase();
        sessions = sessions.filter(s => (s.actionItems || []).some(ai => ai.assignedTo.some(person => person.toLowerCase().includes(assignee))));
    }

    const sortBy = activeFilters.value.sortBy || 'updatedAt';
    const sortOrder = activeFilters.value.sortOrder || 'desc';
    sessions.sort((a, b) => {
      let valA = a[sortBy as keyof RichMeetingSession];
      let valB = b[sortBy as keyof RichMeetingSession];

      if (sortBy === 'meetingDate' || sortBy === 'createdAt' || sortBy === 'updatedAt') {
        valA = new Date(valA as string).getTime();
        valB = new Date(valB as string).getTime();
        return sortOrder === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      }
      if (sortBy === 'actionItemCount') {
          valA = a.actionItems?.filter(ai => ai.status === 'Open' || ai.status === 'In Progress').length || 0;
          valB = b.actionItems?.filter(ai => ai.status === 'Open' || ai.status === 'In Progress').length || 0;
          return sortOrder === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      }
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB, undefined, { sensitivity: 'base' }) : valB.localeCompare(valA, undefined, { sensitivity: 'base' });
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
    return sessions;
  });

  const activeSession = computed<RichMeetingSession | null>(() => {
    return activeSessionId.value ? allMeetingSessions.value.find(s => s.id === activeSessionId.value) || null : null;
  });

  /**
   * @private
   * @function _formatActionItemsForMarkdown
   * @description Formats a list of action items into a Markdown string for display.
   * @param {ActionItem[]} items - The action items to format.
   * @returns {string} Markdown representation of the action items.
   */
  const _formatActionItemsForMarkdown = (items: ActionItem[]): string => {
    if (!items || items.length === 0) {
      return "_No open action items globally._";
    }
    let md = "| Task Description | Assigned To | Due Date | Status | Priority | Meeting |\n";
    md += "| :----------------- | :---------- | :------- | :----- | :------- | :------ |\n";
    items.forEach(item => {
      const meetingTitle = allMeetingSessions.value.find(s => s.id === item.parentId)?.title || 'N/A';
      md += `| ${item.taskDescription.replace(/\|/g, '\\|')} | ${item.assignedTo.join(', ')} | ${item.dueDate || '-'} | ${item.status} | ${item.priority || '-'} | ${meetingTitle.replace(/\|/g, '\\|')} |\n`;
    });
    return md;
  };

  const displayMarkdownForWorkspace = computed<string>(() => {
    if (isLoadingLLM.value && (currentViewMode.value === 'process_notes' || (currentViewMode.value === 'view_summary' && !activeSession.value) )) {
      return `## Processing Meeting Notes...\n\n<div class="flex justify-center my-8"><div class="meeting-scribe-spinner large"></div></div>\n\n_Analyzing content and structuring summary... Please wait._`;
    }
    if (currentViewMode.value === 'view_summary' && activeSession.value) {
      return `# ${activeSession.value.title}\n**Date:** ${new Date(activeSession.value.meetingDate).toLocaleDateString()}\n\n${activeSession.value.summaryMarkdown}`;
    }
    if (currentViewMode.value === 'edit_summary' && activeSession.value) {
      // For editing, the component might use the summaryMarkdown directly in a textarea or provide editing tools.
      // This computed provides the base content.
      return `# ${activeSession.value.title}\n**Date:** ${new Date(activeSession.value.meetingDate).toLocaleDateString()}\n\n${activeSession.value.summaryMarkdown}`;
    }
    if (currentViewMode.value === 'input_new_notes' || currentViewMode.value === 'compose_new_entry') {
      return `## Input New Meeting Notes\n\nProvide your meeting notes or a transcript below. ${agentDisplayName.value} will process them into a structured summary with key points and action items. You can also suggest a title.`;
    }
    if (currentViewMode.value === 'action_items_board') {
        return `# Global Open Action Items\n\n${_formatActionItemsForMarkdown(allOpenActionItemsGlobally.value)}`;
    }
    // Dashboard or default view
    const welcomeMessage = `## ${agentDisplayName.value} - Ready\n\n${agentConfigRef.value.description || 'Your assistant for clear meeting summaries and effective action item tracking.'}\n\n`;
    return welcomeMessage + (filteredAndSortedSessions.value.filter(s => !s.isArchived).length > 0 ? `You have ${filteredAndSortedSessions.value.filter(s => !s.isArchived).length} active summaries. Select one to view or start a new one.` : `Click "New Summary" or provide notes to get started.`);
  });

  const stats = computed(() => {
    const openActionItems = allMeetingSessions.value.reduce((acc, session) => {
        return acc + (session.actionItems?.filter(ai => ai.status === 'Open' || ai.status === 'In Progress').length || 0);
    }, 0);
    const completedActionItems = allMeetingSessions.value.reduce((acc, session) => {
        return acc + (session.actionItems?.filter(ai => ai.status === 'Completed').length || 0);
    }, 0);
    const totalActionItems = openActionItems + completedActionItems;

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Set to Monday of the current week
    startOfWeek.setHours(0, 0, 0, 0);

    const nonArchivedSessions = allMeetingSessions.value.filter(s => !s.isArchived);
    const totalSessions = nonArchivedSessions.length;
    const meetingsThisWeek = nonArchivedSessions.filter(s => new Date(s.meetingDate) >= startOfWeek).length;

    const durations = nonArchivedSessions.filter(s => s.durationMinutes && s.durationMinutes > 0).map(s => s.durationMinutes as number);
    let avgDurationStr: string | undefined = undefined;
    if (durations.length > 0) {
        const avgMins = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        const hours = Math.floor(avgMins / 60);
        const minutes = Math.round(avgMins % 60);
        if (hours > 0) avgDurationStr = `${hours}h ${minutes}m`;
        else avgDurationStr = `${minutes}m`;
    }

    const avgActionItemsPerSession = totalSessions > 0 ? totalActionItems / totalSessions : 0;

    return {
        totalSummaries: totalSessions,
        totalSessions,
        totalActionItems,
        openActionItems,
        completedActionItems,
        meetingsThisWeek,
        averageMeetingDuration: avgDurationStr,
        avgActionItemsPerSession,
    };
  });

  const allOpenActionItemsGlobally = computed<ActionItem[]>(() => {
    return allMeetingSessions.value
      .filter(session => !session.isArchived) // Only from non-archived sessions
      .flatMap(session =>
        (session.actionItems || []).filter(ai => ai.status === 'Open' || ai.status === 'In Progress')
      )
      .sort((a,b) => { // Sort by due date (earliest first), then by creation date (oldest first)
        if (a.dueDate && b.dueDate) {
            const dueDateA = new Date(a.dueDate).getTime();
            const dueDateB = new Date(b.dueDate).getTime();
            if (dueDateA !== dueDateB) return dueDateA - dueDateB;
        } else if (a.dueDate) {
            return -1; // a has due date, b doesn't, so a comes first
        } else if (b.dueDate) {
            return 1;  // b has due date, a doesn't, so b comes first
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  });


  // === ACTIONS ===

  /**
   * @private
   * @async
   * @function _fetchSystemPrompt
   * @description Fetches the system prompt for the meeting agent from the backend.
   * Updates `currentSystemPrompt` on success.
   */
  async function _fetchSystemPrompt(): Promise<void> {
    try {
      const response = await promptAPI.getPrompt('meeting.md'); // Assuming 'meeting.md' is correct
      if (response.data && response.data.content) {
        currentSystemPrompt.value = response.data.content;
      } else {
        throw new Error('Prompt content is empty or invalid.');
      }
    } catch (error) {
      console.error(`[${agentDisplayName.value}] Error fetching system prompt:`, error);
      toast?.add({ type: 'error', title: 'System Error', message: 'Could not load agent instructions.' });
      currentSystemPrompt.value = "You are a helpful meeting summarization assistant."; // Fallback
    }
  }

  async function initialize(_agentDefinition: IAgentDefinition): Promise<void> {
    isProcessingLocal.value = true;
    agentErrorMessage.value = null;
    await _fetchSystemPrompt();
    await loadAllSessions(); // This also updates tags and assignees
    if (!activeSessionId.value && allMeetingSessions.value.length > 0) {
        // If no active session, default to dashboard or select the most recent non-archived
        const mostRecentNonArchived = filteredAndSortedSessions.value.find(s => !s.isArchived);
        if (mostRecentNonArchived) {
            // selectSessionToView(mostRecentNonArchived.id); // Optionally auto-select
             setViewMode('dashboard'); // Default to dashboard
        } else {
            setViewMode('dashboard');
        }
    } else if (!activeSessionId.value) {
        setViewMode('dashboard');
    }
    // Ensure panel visibility is appropriate for screen size
    showSessionListPanel.value = window.innerWidth > 768;
    isProcessingLocal.value = false;
    console.log(`[${agentDisplayName.value}] Initialized. ${allMeetingSessions.value.length} summaries loaded.`);
    _updateChatStoreMainContent();
  }

  function cleanup(): void {
    console.log(`[${agentDisplayName.value}] Cleanup initiated.`);
    // Perform any necessary cleanup, like clearing intervals or aborting pending requests if any.
    activeSessionId.value = null;
    currentRawNotesInput.value = '';
    agentErrorMessage.value = null;
    // Do not clear allMeetingSessions here as it's persistent data unless explicitly requested by user.
  }

  /**
   * @private
   * @function _updateAvailableTagsAndAssignees
   * @description Updates the reactive lists of available tags and assignees from all sessions.
   */
  function _updateAvailableTagsAndAssignees(): void {
    const allTagsSet = new Set<string>();
    const allAssigneesSet = new Set<string>();
    allMeetingSessions.value.forEach(s => {
      (s.tags || []).forEach(t => allTagsSet.add(t));
      (s.actionItems || []).forEach(ai => (ai.assignedTo || []).forEach(p => allAssigneesSet.add(p)));
    });
    availableTags.value = Array.from(allTagsSet).sort((a,b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    availableAssignees.value = Array.from(allAssigneesSet).sort((a,b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }

  async function loadAllSessions(): Promise<void> {
    isProcessingLocal.value = true;
    agentErrorMessage.value = null;
    try {
      const stored = await storage.getAllItemsInNamespace<RichMeetingSession>(config.value.storageNamespace);
      allMeetingSessions.value = Object.values(stored).map(s => ({ // Ensure default structures for safety
        ...s,
        attendees: s.attendees || [],
        actionItems: s.actionItems || [],
        decisionsMade: s.decisionsMade || [],
        keyDiscussionPoints: s.keyDiscussionPoints || [],
        tags: s.tags || [],
        isArchived: s.isArchived === undefined ? false : s.isArchived,
        schemaVersion: s.schemaVersion || 1.2, // Default to current schema if missing
      })).sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()); // Most recently updated first
      _updateAvailableTagsAndAssignees();
    } catch (error: any) {
      console.error(`[${agentDisplayName.value}] Error loading sessions:`, error);
      toast?.add({ type: 'error', title: 'Load Error', message: 'Could not load meeting summaries from storage.' });
      agentErrorMessage.value = 'Failed to load summaries.';
    } finally {
      isProcessingLocal.value = false;
    }
  }

  function selectSessionToView(sessionId: string): void {
    const session = allMeetingSessions.value.find(s => s.id === sessionId);
    if (session) {
      activeSessionId.value = sessionId;
      setViewMode('view_summary');
      showSessionListPanel.value = window.innerWidth <= 768 ? false : showSessionListPanel.value; // Auto-hide on small screens
      agentErrorMessage.value = null;
    } else {
      toast?.add({type: 'error', title: 'Not Found', message: 'Could not find the selected summary.'});
      agentErrorMessage.value = 'Selected summary not found.';
    }
    _updateChatStoreMainContent();
  }

  function startNewSummaryProcess(initialNotes?: string): void {
    activeSessionId.value = null;
    currentRawNotesInput.value = initialNotes || '';
    // Change to 'compose_new_entry' or 'input_new_notes' based on desired flow
    // 'compose_new_entry' might imply a more structured form appearing first
    // 'input_new_notes' implies direct jump to the notes textarea
    setViewMode('input_new_notes'); // Defaulting to input_new_notes for direct input
    isEditingTitle.value = false;
    titleEditBuffer.value = '';
    agentErrorMessage.value = null;

    if (initialNotes && initialNotes.trim()) {
      // Debounce or require explicit submission? For now, direct process.
      // processNotesForSummary(initialNotes); // This was in original, might auto-process.
      // For V1, let's make submission explicit from the UI.
      toast?.add({ type: 'info', title: 'Notes Loaded', message: 'Review notes and process when ready.'});
    }
    _updateChatStoreMainContent();
  }

  async function saveMeetingSession(sessionData: RichMeetingSession): Promise<RichMeetingSession | null> {
    isProcessingLocal.value = true;
    agentErrorMessage.value = null;
    try {
        const sessionToSave: RichMeetingSession = {
            ...sessionData,
            updatedAt: new Date().toISOString(),
            schemaVersion: config.value.storageNamespace.includes('v1.2') ? 1.2 : 1.1, // Match current schema
        };
        await storage.setItem(config.value.storageNamespace, sessionToSave.id, sessionToSave);
        const index = allMeetingSessions.value.findIndex(s => s.id === sessionToSave.id);
        if (index > -1) {
            allMeetingSessions.value.splice(index, 1, sessionToSave);
        } else {
            allMeetingSessions.value.unshift(sessionToSave); // Add new to the top temporarily
        }
        // Re-sort to maintain consistency
        allMeetingSessions.value.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        _updateAvailableTagsAndAssignees();
        // Consider a less noisy success message or none if part of a larger flow
        // toast?.add({type: 'success', title: 'Session Saved', message: `Summary "${sessionToSave.title}" saved.`});
        return sessionToSave;
    } catch (error: any) {
        console.error(`[${agentDisplayName.value}] Error saving session:`, error);
        toast?.add({type: 'error', title: 'Save Error', message: 'Could not save meeting summary.'});
        agentErrorMessage.value = 'Failed to save summary.';
        return null;
    } finally {
        isProcessingLocal.value = false;
    }
  }

  async function deleteSession(sessionId: string): Promise<void> {
    if (!confirm(`Are you sure you want to delete the summary: "${allMeetingSessions.value.find(s=>s.id===sessionId)?.title || 'this summary'}"? This cannot be undone.`)) {
        return;
    }
    isProcessingLocal.value = true;
    agentErrorMessage.value = null;
    try {
      await storage.removeItem(config.value.storageNamespace, sessionId);
      allMeetingSessions.value = allMeetingSessions.value.filter(s => s.id !== sessionId);
      if (activeSessionId.value === sessionId) {
        activeSessionId.value = null;
        setViewMode('dashboard'); // Or select next/previous
      }
      _updateAvailableTagsAndAssignees();
      toast?.add({ type: 'success', title: 'Summary Deleted', message: 'Meeting summary has been removed.' });
    } catch (error: any) {
      console.error(`[${agentDisplayName.value}] Error deleting session ${sessionId}:`, error);
      toast?.add({ type: 'error', title: 'Delete Error', message: 'Could not delete summary.' });
      agentErrorMessage.value = 'Failed to delete summary.';
    } finally {
      isProcessingLocal.value = false;
      _updateChatStoreMainContent();
    }
  }

  async function updateSessionMetadata(sessionId: string, metadataUpdates: Partial<Omit<RichMeetingSession, 'id' | 'actionItems' | 'decisionsMade' | 'keyDiscussionPoints' | 'summaryMarkdown' | 'rawInputNotes'>>): Promise<void> {
    const session = allMeetingSessions.value.find(s => s.id === sessionId);
    if (session) {
        // Ensure only allowed metadata fields are updated this way
        const allowedUpdates: Partial<RichMeetingSession> = {
            title: metadataUpdates.title,
            meetingDate: metadataUpdates.meetingDate,
            attendees: metadataUpdates.attendees,
            tags: metadataUpdates.tags,
            // other purely metadata fields
        };
        const updatedSession = { ...session, ...allowedUpdates, updatedAt: new Date().toISOString() };
        await saveMeetingSession(updatedSession);
        if(activeSessionId.value === sessionId) { // Force re-render if active
            const tempId = activeSessionId.value;
            activeSessionId.value = null; // Trigger computed update
            await new Promise(resolve => setTimeout(resolve, 0)); // Allow Vue to process
            activeSessionId.value = tempId;
        }
        toast?.add({type: 'success', title: 'Metadata Updated', message: `Details for "${updatedSession.title}" updated.`});
    } else {
        toast?.add({type: 'error', title: 'Update Error', message: 'Session not found for metadata update.'});
    }
  }

  async function archiveSession(sessionId: string, archive: boolean): Promise<void> {
    const session = allMeetingSessions.value.find(s => s.id === sessionId);
    if (session) {
        session.isArchived = archive;
        session.updatedAt = new Date().toISOString();
        await saveMeetingSession(session);
        toast?.add({type: 'info', title: archive ? 'Session Archived' : 'Session Unarchived', message: `"${session.title}" has been ${archive ? 'archived' : 'unarchived'}.`});
        if (activeSessionId.value === sessionId && archive) {
            activeSessionId.value = null;
            setViewMode('dashboard');
        }
         _updateChatStoreMainContent(); // Refresh main content if dashboard is shown
    }
  }

  async function clearAllSessions(): Promise<void> {
    if (!confirm("Are you sure you want to delete ALL meeting summaries? This action cannot be undone.")) {
        return;
    }
    isProcessingLocal.value = true;
    agentErrorMessage.value = null;
    try {
      await storage.clearNamespace(config.value.storageNamespace);
      allMeetingSessions.value = [];
      activeSessionId.value = null;
      _updateAvailableTagsAndAssignees();
      setViewMode('dashboard');
      toast?.add({ type: 'success', title: 'All Summaries Cleared', message: 'All meeting history has been deleted.' });
    } catch (error: any) {
      console.error(`[${agentDisplayName.value}] Error clearing all sessions:`, error);
      toast?.add({ type: 'error', title: 'Clear All Error', message: 'Could not clear all summaries.' });
      agentErrorMessage.value = 'Failed to clear all summaries.';
    } finally {
      isProcessingLocal.value = false;
      _updateChatStoreMainContent();
    }
  }

  /**
   * @private
   * @async
   * @function _callMeetingLLM
   * @description Centralized function for making LLM calls for the meeting agent.
   * @param {string} mainText - The primary text input for the LLM (e.g., notes to summarize, summary for entity extraction).
   * @param {string | undefined} contextText - Additional contextual text (e.g., meeting title).
   * @param {'summarize_notes' | 'extract_entities' | 'resummarize_with_clarification' | 'generate_follow_up_email'} actionHint - Hint for the LLM about the desired action.
   * @param {Record<string, any>} [additionalPayload] - Any additional data to include in the LLM request payload.
   * @returns {Promise<string | Partial<ExtractMeetingEntitiesToolOutput> | null>}
   * String for summaries/emails, structured object for entity extraction, or null on error.
   */
  async function _callMeetingLLM(
    mainText: string,
    contextText: string | undefined,
    actionHint: 'summarize_notes' | 'extract_entities' | 'resummarize_with_clarification' | 'generate_follow_up_email',
    additionalPayload?: Record<string, any>
  ): Promise<string | Partial<ExtractMeetingEntitiesToolOutput> | null> {
    isLoadingLLM.value = true;
    agentErrorMessage.value = null;

    const messages: ChatMessageFE[] = [
      { role: 'system', content: currentSystemPrompt.value },
      // Potentially add previous turns if contextually relevant for some actions
      { role: 'user', content: `${contextText ? `Context: ${contextText}\n\n` : ''}Input Text:\n${mainText}` }
    ];

    const payload: ChatMessagePayloadFE = {
      messages,
      mode: `meeting-${actionHint}`, // e.g., meeting-summarize_notes
      ...(additionalPayload || {}),
      // TODO: Define if function/tool definitions should be sent for 'extract_entities'
      // This depends on backend implementation. For now, assuming backend handles tool use based on 'mode'.
    };

    try {
      const response = await chatAPI.sendMessage(payload);
      const responseData = response.data;

      if (responseData.type === 'function_call_data' && actionHint === 'extract_entities') {
        // Assuming function call directly returns ExtractMeetingEntitiesToolOutput structure
        return responseData.toolArguments as Partial<ExtractMeetingEntitiesToolOutput>;
      } else if (responseData.type === 'text_response' || !responseData.type) {
        const content = (responseData as TextResponseDataFE).content;
        if (actionHint === 'extract_entities' && content) {
            // If entities are returned as a JSON string in content (fallback if no function call)
            try {
                return JSON.parse(content) as Partial<ExtractMeetingEntitiesToolOutput>;
            } catch (parseError) {
                console.warn(`[${agentDisplayName.value}] Failed to parse text_response content as JSON for entity extraction. Content:`, content, parseError);
                toast?.add({ type: 'warning', title: 'Entity Format', message: 'Entities received in unexpected text format.' });
                return null; // Or attempt a more robust text parsing if necessary
            }
        }
        return content || null; // For summarize_notes, resummarize, generate_follow_up_email
      } else {
        throw new Error(`Unexpected response type from LLM: ${responseData.type}`);
      }
    } catch (error: any) {
      console.error(`[${agentDisplayName.value}] Error in _callMeetingLLM for action ${actionHint}:`, error);
      const message = error.response?.data?.message || error.message || `LLM call failed for ${actionHint}.`;
      agentErrorMessage.value = message;
      toast?.add({ type: 'error', title: `LLM Error (${actionHint})`, message });
      return null;
    } finally {
      isLoadingLLM.value = false;
    }
  }
  /**
   * @private
   * @function _mapEntitiesToSession
   * @description Maps extracted entities from LLM output to a partial RichMeetingSession object.
   * @param {Partial<ExtractMeetingEntitiesToolOutput>} entities - The extracted entities.
   * @param {string} sessionId - The ID of the parent session for action items.
   * @returns {Partial<RichMeetingSession>} A partial session object with mapped entities.
   */
  function _mapEntitiesToSession(entities: Partial<ExtractMeetingEntitiesToolOutput>, sessionId: string): Partial<RichMeetingSession> {
    const now = new Date().toISOString();
    const mappedAttendees = (entities.attendees || []).map((a, index) => ({
        id: generateId(), // Ensure unique ID for each attendee
        name: a.name || `Attendee ${index + 1}`,
        role: a.role,
        isPresent: true, // Default assumption
        email: a.email,
    }));

    return {
      actionItems: (entities.actionItems || []).map(ai => ({
        ...ai,
        id: generateId(),
        parentId: sessionId,
        assignedTo: ai.assignedTo || [],
        status: ai.status || config.value.defaultActionItemStatus,
        priority: ai.priority || config.value.defaultActionItemPriority,
        createdAt: now,
        updatedAt: now,
      })),
      decisionsMade: (entities.decisionsMade || []).map(d => ({
        ...d,
        id: generateId(),
        timestamp: d.timestamp || now,
      })),
      keyDiscussionPoints: (entities.keyDiscussionPoints || []).map(dp => ({
        ...dp,
        id: generateId(),
      })),
      attendees: mappedAttendees,
      title: entities.meetingTitleSuggestion, // Will be undefined if not suggested, handled by caller
      meetingDate: entities.meetingDateSuggestion, // Same here
      tags: entities.tagsSuggestion, // Same here
    };
  }

  /**
   * @private
   * @function _extractInitialTags
   * @description Extracts some initial tags from the meeting title or summary (basic implementation).
   * @param {string} title - The meeting title.
   * @param {string} summaryMarkdown - The summary markdown.
   * @returns {string[]} An array of initial tags.
   */
  function _extractInitialTags(title: string, summaryMarkdown: string): string[] {
    const tags = new Set<string>();
    // Simple extraction from title (e.g., words starting with # or common project names if pattern exists)
    title.split(/\s+/).forEach(word => {
        if (word.startsWith('#') && word.length > 1) {
            tags.add(word.substring(1).toLowerCase());
        }
        // Add more sophisticated keyword extraction if needed
        if (word.toLowerCase() === 'project' || word.toLowerCase() === 'planning' || word.toLowerCase() === 'update') {
             // Example: Infer "Project Update" if both present, etc.
        }
    });
    // For V1, keeping it simple. Could use LLM for better tag suggestion later.
    return Array.from(tags);
  }


  async function processNotesForSummary(notes: string, suggestedTitle?: string): Promise<RichMeetingSession | null> {
    if (!notes.trim()) {
      toast?.add({ type: 'warning', title: 'Empty Notes', message: 'Please provide some notes to summarize.' });
      setViewMode('input_new_notes');
      return null;
    }

    isLoadingLLM.value = true;
    currentRawNotesInput.value = notes; // Store for potential re-processing
    setViewMode('process_notes'); // Show loading/processing UI state
     _updateChatStoreMainContent(); // Update main content view for processing state

    const tempTitle = suggestedTitle || `${config.value.defaultMeetingTitle} - ${new Date().toLocaleDateString()}`;

    try {
      const summaryMarkdown = await _callMeetingLLM(notes, tempTitle, 'summarize_notes') as string;
      if (!summaryMarkdown) {
        throw new Error("LLM did not return a summary.");
      }

      const newSessionId = generateId();
      const now = new Date().toISOString();
      const mdTitleMatch = summaryMarkdown.match(/^#\s*(.*)/m); // Extract title from markdown H1
      const finalTitle = mdTitleMatch && mdTitleMatch[1] ? mdTitleMatch[1].trim() : tempTitle;

      let newSession: RichMeetingSession = {
        id: newSessionId,
        title: finalTitle,
        meetingDate: new Date().toISOString().split('T')[0], // Default to today
        attendees: [],
        rawInputNotes: notes,
        summaryMarkdown: summaryMarkdown,
        keyDiscussionPoints: [],
        decisionsMade: [],
        actionItems: [],
        tags: _extractInitialTags(finalTitle, summaryMarkdown),
        createdAt: now,
        updatedAt: now,
        schemaVersion: 1.2,
        isArchived: false,
      };

      if (config.value.autoExtractEntities) {
        const entities = await _callMeetingLLM(summaryMarkdown, finalTitle, 'extract_entities') as Partial<ExtractMeetingEntitiesToolOutput> | null;
        if (entities) {
          const mappedEntities = _mapEntitiesToSession(entities, newSessionId);
          newSession = {
            ...newSession,
            actionItems: mappedEntities.actionItems || [],
            decisionsMade: mappedEntities.decisionsMade || [],
            keyDiscussionPoints: mappedEntities.keyDiscussionPoints || [],
            attendees: mappedEntities.attendees || newSession.attendees, // Keep existing if LLM doesn't provide
            tags: Array.from(new Set([...newSession.tags, ...(mappedEntities.tags || [])])), // Merge tags
            // Update title/date if LLM suggested better ones and they are valid
            title: mappedEntities.title || newSession.title,
            meetingDate: mappedEntities.meetingDate || newSession.meetingDate,
          };
        }
      }

      const savedSession = await saveMeetingSession(newSession);
      if (savedSession) {
        selectSessionToView(savedSession.id); // This will also call _updateChatStoreMainContent
        toast?.add({ type: 'success', title: 'Summary Generated', message: `Notes summarized: "${savedSession.title}"` });
        return savedSession;
      }
      return null; // Should not happen if saveMeetingSession is robust

    } catch (error: any) {
      console.error(`[${agentDisplayName.value}] Error processing notes:`, error);
      agentErrorMessage.value = error.message || 'Failed to generate summary.';
      toast?.add({ type: 'error', title: 'Summarization Error', message: agentErrorMessage.value ?? undefined });
      setViewMode('input_new_notes'); // Revert to input mode on error
      _updateChatStoreMainContent();
      return null;
    } finally {
      isLoadingLLM.value = false;
      // _updateChatStoreMainContent() is called by selectSessionToView or setViewMode already
    }
  }

  async function clarifyAndResummarize(sessionId: string, clarification: string): Promise<RichMeetingSession | null> {
    const session = allMeetingSessions.value.find(s => s.id === sessionId);
    if (!session) {
        toast?.add({type: 'error', title: 'Session Not Found', message: 'Cannot clarify a non-existent session.'});
        return null;
    }
    if (!clarification.trim()) {
        toast?.add({type: 'warning', title: 'Empty Clarification', message: 'Please provide some clarification text.'});
        return session; // Return current session without changes
    }

    isLoadingLLM.value = true;
    const originalViewMode = currentViewMode.value; // Store to revert if needed
    setViewMode('process_notes');
    _updateChatStoreMainContent();

    try {
        // Combine original notes (if available) or summary with clarification
        const textToResummarize = `${session.rawInputNotes || session.summaryMarkdown}\n\n--- User Clarification ---\n${clarification}`;
        const updatedSummaryMarkdown = await _callMeetingLLM(textToResummarize, session.title, 'resummarize_with_clarification') as string;

        if(!updatedSummaryMarkdown) throw new Error("LLM failed to resummarize with clarification.");

        session.summaryMarkdown = updatedSummaryMarkdown;
        // Update rawInputNotes to include the clarification for future reference/reprocessing
        session.rawInputNotes = textToResummarize;

        if (config.value.autoExtractEntities) {
            const entities = await _callMeetingLLM(updatedSummaryMarkdown, session.title, 'extract_entities') as Partial<ExtractMeetingEntitiesToolOutput> | null;
            if (entities) {
                const updatedEntities = _mapEntitiesToSession(entities, sessionId);
                session.actionItems = updatedEntities.actionItems || session.actionItems;
                session.decisionsMade = updatedEntities.decisionsMade || session.decisionsMade;
                session.keyDiscussionPoints = updatedEntities.keyDiscussionPoints || session.keyDiscussionPoints;
                session.attendees = updatedEntities.attendees || session.attendees;
                session.tags = Array.from(new Set([...(session.tags || []), ...(updatedEntities.tags || [])]));
            }
        }
        const savedSession = await saveMeetingSession(session);
        if(savedSession) {
            selectSessionToView(savedSession.id); // Will set view mode to 'view_summary'
            toast?.add({type: 'success', title: 'Summary Updated', message: 'Summary has been updated with your clarification.'});
        }
        return savedSession;
    } catch (error: any) {
        console.error(`[${agentDisplayName.value}] Error re-summarizing with clarification:`, error);
        toast?.add({ type: 'error', title: 'Update Error', message: error.message || 'Failed to update summary with clarification.' });
        setViewMode(originalViewMode); // Revert to original view on error
        _updateChatStoreMainContent();
        return null;
    } finally {
        isLoadingLLM.value = false;
        // selectSessionToView or setViewMode handles the final _updateChatStoreMainContent
    }
  }

  async function extractEntitiesFromSummary(sessionId: string, forceExtraction: boolean = false): Promise<Partial<ExtractMeetingEntitiesToolOutput> | null> {
    const session = allMeetingSessions.value.find(s => s.id === sessionId);
    if (!session) {
        toast?.add({type: 'error', title: 'Session Not Found', message: 'Cannot extract entities for a non-existent session.'});
        return null;
    }
    if (!forceExtraction && (session.actionItems?.length || 0) > 0 && (session.decisionsMade?.length || 0) > 0) {
        // Simple check; more robust might be needed if entities can be partially extracted
        const reconfirm = confirm("Entities seem to exist already. Re-extract and overwrite existing Action Items, Decisions, etc.?");
        if (!reconfirm) {
            toast?.add({type: 'info', title: 'Extraction Cancelled', message: 'Entity re-extraction cancelled by user.'});
            return { actionItems: session.actionItems, decisionsMade: session.decisionsMade, keyDiscussionPoints: session.keyDiscussionPoints, attendees: session.attendees, tagsSuggestion: session.tags };
        }
    }

    isLoadingLLM.value = true;
    toast?.add({type: 'info', title: 'Extracting Entities', message: `Analyzing "${session.title}" for structured data...`});
    const originalViewMode = currentViewMode.value;
    setViewMode('process_notes'); // Indicate processing
    _updateChatStoreMainContent();

    try {
        const entities = await _callMeetingLLM(session.summaryMarkdown, session.title, 'extract_entities') as Partial<ExtractMeetingEntitiesToolOutput> | null;
        if (entities) {
            const updatedSessionData = _mapEntitiesToSession(entities, sessionId);
            // Merge smartly: overwrite extracted fields, keep others.
            session.actionItems = updatedSessionData.actionItems || [];
            session.decisionsMade = updatedSessionData.decisionsMade || [];
            session.keyDiscussionPoints = updatedSessionData.keyDiscussionPoints || [];
            session.attendees = updatedSessionData.attendees || session.attendees; // Prefer new if available
            session.tags = Array.from(new Set([...(session.tags || []), ...(updatedSessionData.tags || [])]));

            await saveMeetingSession(session);
            toast?.add({type: 'success', title: 'Entities Extracted', message: 'Action items, decisions, and other details updated.'});
            setViewMode(originalViewMode); // Revert to previous view
             _updateChatStoreMainContent();
            return entities;
        } else {
            toast?.add({type: 'info', title: 'No New Entities', message: 'Could not extract additional structured entities.'});
            setViewMode(originalViewMode);
            _updateChatStoreMainContent();
            return null;
        }
    } catch (error: any) {
        console.error(`[${agentDisplayName.value}] Error extracting entities:`, error);
        toast?.add({type: 'error', title: 'Extraction Error', message: error.message || 'Failed to extract entities.'});
        setViewMode(originalViewMode);
        _updateChatStoreMainContent();
        return null;
    } finally {
        isLoadingLLM.value = false;
    }
  }

  async function generateFollowUpEmail(sessionId: string): Promise<string | null> {
    const session = allMeetingSessions.value.find(s => s.id === sessionId);
    if(!session) {
        toast?.add({type: 'error', title: 'Session Not Found', message: 'Cannot generate email for non-existent session.'});
        return null;
    }
    isLoadingLLM.value = true;
    toast?.add({type: 'info', title: 'Generating Email Draft', message: `Drafting follow-up for "${session.title}"...`});
    _updateChatStoreMainContent(`## Generating Follow-up Email for "${session.title}"...\n\n_Please wait while the AI drafts the email content based on the summary._`);

    try {
        const emailDraft = await _callMeetingLLM(session.summaryMarkdown, session.title, 'generate_follow_up_email') as string;
        if (emailDraft) {
            toast?.add({type: 'success', title: 'Email Draft Ready', message: 'Follow-up email draft has been generated.'});
            // The component should handle displaying this draft.
            // For now, we can update the main content area with the draft.
            _updateChatStoreMainContent(`## Follow-up Email Draft for "${session.title}"\n\n---\n\n${emailDraft}\n\n---\n\n_You can copy this draft. Consider adding specific recipients and a subject line._`);
        } else {
            throw new Error("LLM did not return an email draft.");
        }
        return emailDraft;
    } catch(e: any) {
        console.error(`[${agentDisplayName.value}] Error generating follow-up email:`, e);
        const message = e.message || 'Failed to generate email draft.';
        toast?.add({type: 'error', title: 'Email Generation Error', message});
        _updateChatStoreMainContent(`## Error Generating Email\n\nAn error occurred: ${message}`);
        return null;
    } finally {
        isLoadingLLM.value = false;
    }
  }

  async function addActionItem(sessionId: string, itemData: Omit<ActionItem, 'id' | 'parentId' | 'createdAt' | 'updatedAt'>): Promise<ActionItem | null> {
    const session = allMeetingSessions.value.find(s => s.id === sessionId);
    if (!session) {
        toast?.add({type: 'error', title: 'Add Action Item Error', message: 'Session not found.'});
        return null;
    }
    const now = new Date().toISOString();
    const newActionItem: ActionItem = {
        ...itemData,
        id: generateId(),
        parentId: sessionId,
        status: itemData.status || config.value.defaultActionItemStatus,
        priority: itemData.priority || config.value.defaultActionItemPriority,
        assignedTo: itemData.assignedTo || [],
        createdAt: now,
        updatedAt: now,
    };
    session.actionItems = [...(session.actionItems || []), newActionItem];
    await saveMeetingSession(session);
    toast?.add({type: 'success', title: 'Action Item Added', message: `Task "${newActionItem.taskDescription.substring(0,30)}..." added.`});
    _updateChatStoreMainContent(); // Refresh if view depends on this
    return newActionItem;
  }

  async function updateActionItem(sessionId: string, itemId: string, updates: Partial<ActionItem>): Promise<ActionItem | null> {
    const session = allMeetingSessions.value.find(s => s.id === sessionId);
    if (!session || !session.actionItems) {
        toast?.add({type: 'error', title: 'Update Action Item Error', message: 'Session or action item not found.'});
        return null;
    }
    const itemIndex = session.actionItems.findIndex(ai => ai.id === itemId);
    if (itemIndex === -1) {
        toast?.add({type: 'error', title: 'Update Action Item Error', message: 'Action item to update not found.'});
        return null;
    }

    const updatedItem = { ...session.actionItems[itemIndex], ...updates, updatedAt: new Date().toISOString() };
    if(updates.status === 'Completed' && !session.actionItems[itemIndex].completedAt) {
        updatedItem.completedAt = new Date().toISOString();
    } else if (updates.status && updates.status !== 'Completed') {
        updatedItem.completedAt = undefined; // Clear completedAt if status is no longer completed
    }
    session.actionItems.splice(itemIndex, 1, updatedItem);

    await saveMeetingSession(session);
    toast?.add({type: 'success', title: 'Action Item Updated', message: `Task "${updatedItem.taskDescription.substring(0,30)}..." updated.`});
    _updateChatStoreMainContent(); // Refresh if view depends on this
    return updatedItem;
  }

  async function deleteActionItem(sessionId: string, itemId: string): Promise<boolean> {
    const session = allMeetingSessions.value.find(s => s.id === sessionId);
    if (!session || !session.actionItems) {
        toast?.add({type: 'error', title: 'Delete Action Item Error', message: 'Session not found.'});
        return false;
    }
    const initialLength = session.actionItems.length;
    session.actionItems = session.actionItems.filter(ai => ai.id !== itemId);
    if (session.actionItems.length < initialLength) {
        await saveMeetingSession(session);
        toast?.add({type: 'success', title: 'Action Item Deleted', message: 'Task removed from session.'});
        _updateChatStoreMainContent(); // Refresh if view depends on this
        return true;
    }
    toast?.add({type: 'warning', title: 'Delete Action Item', message: 'Action item not found for deletion.'});
    return false;
  }

  function setViewMode(mode: MeetingViewMode): void {
    currentViewMode.value = mode;
    // Clear error message when changing view
    agentErrorMessage.value = null;
    _updateChatStoreMainContent();
  }

  function toggleSessionListPanel(force?: boolean): void {
    showSessionListPanel.value = force !== undefined ? force : !showSessionListPanel.value;
  }

  function updateFilters(newFilters: Partial<MeetingFilterOptions>): void {
    activeFilters.value = { ...activeFilters.value, ...newFilters };
    // No automatic content update here, list component will re-render
  }

  function clearFilters(): void {
    activeFilters.value = { sortBy: 'updatedAt', sortOrder: 'desc', isArchived: false }; // Reset to defaults
  }

  async function importSessions(file: File): Promise<{ importedCount: number; skippedCount: number; error?: string }> {
    isProcessingLocal.value = true;
    agentErrorMessage.value = null;
    let result = { importedCount: 0, skippedCount: 0, error: undefined as (string | undefined) };
    try {
        const reader = new FileReader();
        result = await new Promise((resolve) => {
            reader.onload = async (e) => {
                try {
                    const jsonString = e.target?.result as string;
                    const data = JSON.parse(jsonString);
                    if (data && Array.isArray(data.sessions) && data.exportVersion?.startsWith("1.")) {
                        let imported = 0; let skipped = 0;
                        for (const entry of data.sessions as RichMeetingSession[]) {
                            if (entry.id && entry.title && entry.summaryMarkdown) { // Basic validation
                                if (!allMeetingSessions.value.find(s => s.id === entry.id)) { // Avoid duplicates by ID
                                    // Ensure imported data conforms to the current RichMeetingSession structure
                                    const newSession: RichMeetingSession = {
                                        id: entry.id,
                                        title: entry.title,
                                        meetingDate: entry.meetingDate || new Date().toISOString().split('T')[0],
                                        attendees: entry.attendees || [],
                                        rawInputNotes: entry.rawInputNotes,
                                        summaryMarkdown: entry.summaryMarkdown,
                                        keyDiscussionPoints: entry.keyDiscussionPoints || [],
                                        decisionsMade: entry.decisionsMade || [],
                                        actionItems: (entry.actionItems || []).map(ai => ({...ai, parentId: entry.id})), // Ensure parentId link
                                        tags: entry.tags || [],
                                        createdAt: entry.createdAt || new Date().toISOString(),
                                        updatedAt: entry.updatedAt || new Date().toISOString(),
                                        schemaVersion: entry.schemaVersion || 1.2,
                                        isArchived: entry.isArchived || false,
                                        // Fill in other optional fields with defaults if missing
                                        startTime: entry.startTime,
                                        endTime: entry.endTime,
                                        durationMinutes: entry.durationMinutes,
                                        location: entry.location,
                                        facilitator: entry.facilitator,
                                        noteTaker: entry.noteTaker,
                                        fullTranscriptMarkdown: entry.fullTranscriptMarkdown,
                                        keyQuestionsRaised: entry.keyQuestionsRaised,
                                        unresolvedIssues: entry.unresolvedIssues,
                                        overallMeetingPurpose: entry.overallMeetingPurpose,
                                        sentimentAnalysis: entry.sentimentAnalysis,
                                        linkedMeetingIds: entry.linkedMeetingIds,
                                        llmInteractionLog: entry.llmInteractionLog,
                                    };
                                    allMeetingSessions.value.push(newSession); // Add to local state
                                    await storage.setItem(config.value.storageNamespace, newSession.id, newSession); // Save to storage
                                    imported++;
                                } else { skipped++; }
                            } else { skipped++; }
                        }
                        _updateAvailableTagsAndAssignees();
                         allMeetingSessions.value.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                        toast?.add({type:'success', title: 'Import Complete', message: `Imported ${imported} summaries, skipped ${skipped} (duplicates/invalid).`});
                        resolve({ importedCount: imported, skippedCount: skipped, error: undefined });
                    } else { resolve({ importedCount:0, skippedCount:0, error: "Invalid file format or version."}); }
                } catch (err:any) { resolve({ importedCount:0, skippedCount:0, error: `Error parsing file: ${err.message}` }); }
            };
            reader.onerror = () => resolve({ importedCount:0, skippedCount:0, error: "File could not be read."});
            reader.readAsText(file);
        });
    } catch (e: any) { // Catch errors from the overall importSessions async function itself
        result = { importedCount: 0, skippedCount: 0, error: e.message };
    } finally {
        isProcessingLocal.value = false;
        if (result.error) {
            toast?.add({type: 'error', title: 'Import Failed', message: result.error});
            agentErrorMessage.value = result.error;
        }
        _updateChatStoreMainContent(); // Refresh view
        return result;
    }
  }

  /**
   * @private
   * @function _generateICalForActionItems
   * @description Generates an iCalendar (.ics) string for open action items with due dates.
   * @returns {string} The iCalendar data as a string.
   */
  function _generateICalForActionItems(): string {
    let icalContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//VoiceCodingAssistant//MeetingActionItems//EN\nX-WR-CALNAME:Meeting Action Items\n`;
    const nowTimestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    allOpenActionItemsGlobally.value.forEach(item => {
        if (item.dueDate) {
            try {
                // Attempt to parse various common date formats for dueDate
                let startDate = new Date(item.dueDate);
                if (isNaN(startDate.getTime())) { // Invalid date from direct construction
                    // Try to parse "YYYY-MM-DD" by ensuring it's treated as UTC to avoid timezone shifts
                    const parts = item.dueDate.split('-');
                    if (parts.length === 3) {
                        startDate = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
                    }
                }
                if (isNaN(startDate.getTime())) { // Still invalid
                     console.warn(`[${agentDisplayName.value}] Invalid due date for iCal export: ${item.dueDate} for item ID ${item.id}`);
                     return; // Skip this item
                }

                // Ensure the date is treated as a full day event, starting at midnight UTC
                const year = startDate.getUTCFullYear();
                const month = (startDate.getUTCMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
                const day = startDate.getUTCDate().toString().padStart(2, '0');

                const dtstartDate = `${year}${month}${day}`;
                // For all-day events, DTEND should be the day after DTSTART
                const endDate = new Date(startDate);
                endDate.setUTCDate(startDate.getUTCDate() + 1);
                const dtendDate = `${endDate.getUTCFullYear()}${(endDate.getUTCMonth() + 1).toString().padStart(2, '0')}${endDate.getUTCDate().toString().padStart(2, '0')}`;


                icalContent += `BEGIN:VEVENT\n`;
                icalContent += `UID:${item.id}@voicecodingassistant.com\n`; // Domain should be specific to app
                icalContent += `DTSTAMP:${nowTimestamp}\n`;
                icalContent += `DTSTART;VALUE=DATE:${dtstartDate}\n`;
                icalContent += `DTEND;VALUE=DATE:${dtendDate}\n`; // For all-day event
                icalContent += `SUMMARY:Action: ${item.taskDescription.substring(0,70)}\n`;
                const meeting = allMeetingSessions.value.find(s => s.id === item.parentId);
                const description = `Task: ${item.taskDescription}\\nAssigned to: ${item.assignedTo.join(', ')}\\nStatus: ${item.status}${item.priority ? '\\nPriority: ' + item.priority : ''}${meeting ? '\\nFrom Meeting: ' + meeting.title : ''}${item.notes ? '\\nNotes: ' + item.notes.replace(/\n/g, '\\n') : ''}\n`;
                icalContent += `DESCRIPTION:${description.replace(/\r\n|\r|\n/g, '\\n')}\n`; // Ensure newlines are escaped
                icalContent += `STATUS:${item.status === 'Completed' ? 'COMPLETED' : (item.status === 'In Progress' ? 'IN-PROCESS' : 'NEEDS-ACTION')}\n`;
                if(item.priority) icalContent += `PRIORITY:${item.priority === 'High' ? 1 : item.priority === 'Medium' ? 5 : 9}\n`;
                // Optional: Add Alarm
                // icalContent += `BEGIN:VALARM\nTRIGGER:-PT15H\nACTION:DISPLAY\nDESCRIPTION:Reminder: ${item.taskDescription}\nEND:VALARM\n`;
                icalContent += `END:VEVENT\n`;
            } catch (dateError) {
                console.warn(`[${agentDisplayName.value}] Error processing due date for iCal export: ${item.dueDate} (ID: ${item.id})`, dateError);
            }
        }
    });
    icalContent += `END:VCALENDAR`;
    return icalContent;
  }


  async function exportSessions(format: 'json_all' | 'markdown_selected' | 'csv_action_items' | 'ical_action_items'): Promise<void> {
    isProcessingLocal.value = true;
    agentErrorMessage.value = null;
    try {
        let blob: Blob; let filename: string;
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];

        if (format === 'json_all') {
            const exportData = { exportVersion: "1.2-rich", exportedAt: new Date().toISOString(), sessions: allMeetingSessions.value };
            blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8;' });
            filename = `MeetingScribe_AllSessions_${timestamp}.json`;
        } else if (format === 'markdown_selected' && activeSession.value) {
            const session = activeSession.value;
            const mdContent = `# ${session.title}\n**Date:** ${new Date(session.meetingDate).toLocaleDateString()}\n\n${session.summaryMarkdown}`;
            blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
            filename = `${session.title.replace(/[^a-z0-9_.-]/gi, '_')}_${timestamp}.md`;
        } else if (format === 'csv_action_items') {
            const headers = "Meeting Title,Task Description,Assigned To,Due Date,Status,Priority,Meeting Date,Session ID,Action ID,Notes";
            const rows = allMeetingSessions.value.flatMap(s =>
                (s.actionItems || []).map(ai => {
                    const escapeCsv = (val: string | undefined) => val ? `"${val.replace(/"/g, '""')}"` : '""';
                    return [
                        escapeCsv(s.title),
                        escapeCsv(ai.taskDescription),
                        escapeCsv(ai.assignedTo.join('; ')),
                        escapeCsv(ai.dueDate),
                        escapeCsv(ai.status),
                        escapeCsv(ai.priority),
                        escapeCsv(new Date(s.meetingDate).toLocaleDateString()),
                        escapeCsv(s.id),
                        escapeCsv(ai.id),
                        escapeCsv(ai.notes)
                    ].join(',');
                })
            );
            blob = new Blob([[headers, ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8;' });
            filename = `MeetingScribe_ActionItems_${timestamp}.csv`;
        } else if (format === 'ical_action_items') {
            const cal = _generateICalForActionItems();
            blob = new Blob([cal], { type: 'text/calendar;charset=utf-8;' });
            filename = `MeetingActionItems_${timestamp}.ics`;
        }
         else {
            toast?.add({type: 'warning', title: 'Export Error', message: 'Invalid format or no active session for Markdown export.'});
            isProcessingLocal.value = false;
            return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast?.add({type:'success', title:'Export Successful', message:`Data exported as ${filename}.`});
    } catch (error: any) {
        console.error(`[${agentDisplayName.value}] Error exporting sessions:`, error);
        toast?.add({type: 'error', title: 'Export Failed', message: `Could not export data: ${error.message}`});
        agentErrorMessage.value = `Export failed: ${error.message}`;
    } finally {
        isProcessingLocal.value = false;
    }
  }

  /**
   * @private
   * @function _updateChatStoreMainContent
   * @description Updates the main content display in the chat store.
   * This is used to reflect the agent's current view or output in the UI.
   * @param {string} [customMarkdown] - Optional Markdown string to display directly. If not provided, uses `displayMarkdownForWorkspace`.
   */
  function _updateChatStoreMainContent(customMarkdown?: string): void {
    const markdownToDisplay = customMarkdown !== undefined ? customMarkdown : displayMarkdownForWorkspace.value;
    const currentSessionTitle = activeSession.value?.title || agentDisplayName.value;
    const modeTitle = currentViewMode.value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    const content: MainContent = {
        agentId: agentConfigRef.value.id,
        type: 'markdown', // Assuming all agent views are Markdown for now
        data: markdownToDisplay,
        title: activeSessionId.value ? `${currentSessionTitle} - ${modeTitle}` : `${agentDisplayName.value} - ${modeTitle}`,
        timestamp: Date.now(),
    };
    chatStore.updateMainContent(content);
  }

  return {
    // State
    isLoadingLLM, isProcessingLocal, currentSystemPrompt, agentErrorMessage,
    allMeetingSessions, activeSessionId, currentRawNotesInput,
    currentViewMode, showSessionListPanel, isEditingTitle, titleEditBuffer,
    activeFilters, availableTags, availableAssignees, editingActionItem,

    // Computeds
    agentDisplayName, filteredAndSortedSessions, activeSession, displayMarkdownForWorkspace, stats, allOpenActionItemsGlobally,

    // Actions
    initialize, cleanup,
    loadAllSessions, selectSessionToView, startNewSummaryProcess,
    saveMeetingSession, deleteSession, updateSessionMetadata, archiveSession, clearAllSessions,
    processNotesForSummary, clarifyAndResummarize, extractEntitiesFromSummary, generateFollowUpEmail,
    addActionItem, updateActionItem, deleteActionItem,
    setViewMode, toggleSessionListPanel, updateFilters, clearFilters,
    importSessions, exportSessions,
  };
}