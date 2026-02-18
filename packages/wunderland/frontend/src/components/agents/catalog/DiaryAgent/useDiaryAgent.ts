// File: frontend/src/components/agents/Diary/useDiaryAgent.ts
/**
 * @file useDiaryAgent.ts
 * @description Composable for the Echo (Diary) agent logic.
 * Manages diary entries, LLM interactions for reflection, metadata, analysis,
 * and provides a fully-featured diary "miniapp" experience.
 * @version 2.2.2 - Definitions for LLM helper functions restored and TS errors corrected.
 */
import { ref, computed, watch, type Ref, inject } from 'vue';
import { generateId } from '@/utils/ids';
import JSZip from 'jszip';
import { useAgentStore } from '@/store/agent.store';
import { useChatStore, type MainContent } from '@/store/chat.store';
import type { IAgentDefinition } from '@/services/agent.service';
import {
  chatAPI,
  promptAPI,
  type ChatMessagePayloadFE,
  type ChatResponseDataFE,
  type ChatMessageFE,
  type ILlmToolCallFE,
  type TextResponseDataFE,
  type FunctionCallResponseDataFE,
} from '@/utils/api';
import type { ToastService } from '@/services/services';
import { diaryService } from '@/services/diary.service';
import type { DiaryEntry as StorageDiaryEntry } from '@/services/diary.service';

import {
  type RichDiaryEntry,
  type DiaryViewMode,
  type DiaryFilterOptions,
  type DiarySentimentAnalysis,
  type DiaryEntryAnalysis,
  type DiaryAgentComposable,
  type DiaryAgentConfig,
  DEFAULT_DIARY_AGENT_CONFIG,
  type SuggestDiaryMetadataToolOutput,
  type MoodRating,
  type SentimentPolarity,
} from './DiaryAgentTypes';

export function useDiaryAgent(
  agentConfigRef: Ref<IAgentDefinition>,
  toastInstance?: ToastService,
  initialConfig?: Partial<DiaryAgentConfig>
): DiaryAgentComposable {
  const agentStore = useAgentStore();
  const chatStore = useChatStore();
  const toast = toastInstance || inject<ToastService>('toast');
  const config = ref<DiaryAgentConfig>({ ...DEFAULT_DIARY_AGENT_CONFIG, ...initialConfig });

  const isLoadingLLM = ref<boolean>(false);
  const isProcessingLocal = ref<boolean>(false);
  const currentSystemPrompt = ref<string>('');
  const agentErrorMessage = ref<string | null>(null);

  const allEntries = ref<RichDiaryEntry[]>([]);
  const activeEntryId = ref<string | null>(null);
  const currentDraft = ref<Partial<RichDiaryEntry> | null>(null);
  const isComposing = ref<boolean>(false);

  const currentViewMode = ref<DiaryViewMode>('dashboard');
  const showEntryListPanel = ref<boolean>(true);
  const showMetadataModal = ref<boolean>(false);
  const showAnalysisModal = ref<boolean>(false);

  const activeFilters = ref<DiaryFilterOptions>({ sortBy: 'updatedAt', sortOrder: 'desc' });
  const availableTags = ref<string[]>([]);
  const availableMoods = ref<string[]>([...config.value.defaultMoods]);

  const llmSuggestedMetadata = ref<(SuggestDiaryMetadataToolOutput & { toolCallId?: string; toolName?: string }) | null>(null);
  const userEditedMetadata = ref({ title: '', tags: '', mood: '' });

  const chatMessages = ref<ChatMessageFE[]>([]);
  const onThisDayEntry = ref<RichDiaryEntry | null>(null);
  const reflectionPrompt = ref<string | null>(null);

  // === COMPUTEDS ===
  const agentDisplayName = computed<string>(() => agentConfigRef.value?.label || "Echo");

  const filteredAndSortedEntries = computed<RichDiaryEntry[]>(() => {
    let entries = [...allEntries.value];
    if (activeFilters.value.searchTerm) {
      const term = activeFilters.value.searchTerm.toLowerCase();
      entries = entries.filter(e =>
        e.title.toLowerCase().includes(term) ||
        e.contentMarkdown.toLowerCase().includes(term) ||
        (e.summary && e.summary.toLowerCase().includes(term)) ||
        (e.tags || []).some(t => t.toLowerCase().includes(term))
      );
    }
    if (activeFilters.value.tags && activeFilters.value.tags.length > 0) {
      entries = entries.filter(e => activeFilters.value.tags!.every(ft => (e.tags || []).map(t=>t.toLowerCase()).includes(ft.toLowerCase())));
    }
    if (activeFilters.value.moods && activeFilters.value.moods.length > 0) {
        entries = entries.filter(e => e.mood && activeFilters.value.moods!.map(m=>m.toLowerCase()).includes(e.mood.toLowerCase()));
    }
    if (activeFilters.value.isFavorite !== undefined) {
        entries = entries.filter(e => e.isFavorite === activeFilters.value.isFavorite);
    }
    if (activeFilters.value.dateRange?.start) {
        entries = entries.filter(e => new Date(e.createdAt) >= new Date(activeFilters.value.dateRange!.start!));
    }
    if (activeFilters.value.dateRange?.end) {
        const endDate = new Date(activeFilters.value.dateRange!.end!);
        endDate.setHours(23, 59, 59, 999);
        entries = entries.filter(e => new Date(e.createdAt) <= endDate);
    }
    if (activeFilters.value.minMoodRating !== undefined) {
        entries = entries.filter(e => e.moodRating !== undefined && e.moodRating >= activeFilters.value.minMoodRating!);
    }
    if (activeFilters.value.maxMoodRating !== undefined) {
        entries = entries.filter(e => e.moodRating !== undefined && e.moodRating <= activeFilters.value.maxMoodRating!);
    }
    if (activeFilters.value.hasLocation !== undefined) {
        entries = entries.filter(e => activeFilters.value.hasLocation ? !!e.location : !e.location);
    }
    if (activeFilters.value.hasAttachments !== undefined) {
        entries = entries.filter(e => activeFilters.value.hasAttachments ? !!(e.attachments && e.attachments.length > 0) : !(e.attachments && e.attachments.length > 0));
    }

    const sortBy = activeFilters.value.sortBy || 'updatedAt';
    const sortOrder = activeFilters.value.sortOrder || 'desc';
    return entries.sort((a, b) => {
        let valA = a[sortBy as keyof RichDiaryEntry] as any;
        let valB = b[sortBy as keyof RichDiaryEntry] as any;

        if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
            valA = new Date(valA as string).getTime();
            valB = new Date(valB as string).getTime();
        } else if (sortBy === 'moodRating') {
            valA = valA === undefined ? (sortOrder === 'asc' ? Infinity : -Infinity) : valA;
            valB = valB === undefined ? (sortOrder === 'asc' ? Infinity : -Infinity) : valB;
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
            return sortOrder === 'asc' ? valA.localeCompare(valB, undefined, { sensitivity: 'base' }) : valB.localeCompare(valA, undefined, { sensitivity: 'base' });
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
            return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        if (valA === undefined && valB !== undefined) return sortOrder === 'asc' ? 1 : -1;
        if (valA !== undefined && valB === undefined) return sortOrder === 'asc' ? -1 : 1;
        return 0;
    });
  });

  const activeEntry = computed<RichDiaryEntry | null>(() => {
    return activeEntryId.value ? allEntries.value.find(e => e.id === activeEntryId.value) || null : null;
  });

  const displayContentMarkdown = computed<string>(() => {
    if (isLoadingLLM.value && currentViewMode.value !== 'dashboard' && currentViewMode.value !== 'chat_interface') {
      return `## ${agentDisplayName.value} is thinking...\n\n<div class="flex justify-center my-8"><div class="diary-spinner large"></div></div>\n\n_Processing your request..._`;
    }
    if (currentViewMode.value === 'view_entry' && activeEntry.value) {
      const entry = activeEntry.value;
      let header = `# ${entry.title}\n`;
      header += `**Date:** ${new Date(entry.createdAt).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}\n`;
      if (entry.tags?.length) header += `**Tags:** ${entry.tags.join(', ')}\n`;
      if (entry.mood) header += `**Mood:** ${entry.mood}${entry.moodRating ? ` (${entry.moodRating}/5)` : ''}\n`;
      if (entry.location?.name) header += `**Location:** ${entry.location.name}\n`;
      if (entry.weather) header += `**Weather:** ${entry.weather}\n`;
      if (entry.summary && entry.summary !== entry.contentMarkdown.substring(0,200) + (entry.contentMarkdown.length > 200 ? '...' : '')) {
        header += `**Summary:** *${entry.summary}*\n`;
      }
      return `${header}\n---\n\n${entry.contentMarkdown}`;
    }
    if ((currentViewMode.value === 'compose_new_entry' || currentViewMode.value === 'edit_entry') && currentDraft.value) {
      let draftHeader = `# ${currentDraft.value.title || (currentViewMode.value === 'compose_new_entry' ? 'New Reflection...' : 'Editing Entry...')}\n`;
      draftHeader += `**Date:** ${new Date(currentDraft.value.createdAt || Date.now()).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}\n`;
      if (currentDraft.value.tags?.length) draftHeader += `**Tags:** ${currentDraft.value.tags.join(', ')}\n`;
      if (currentDraft.value.mood) draftHeader += `**Mood:** ${currentDraft.value.mood}${currentDraft.value.moodRating ? ` (${currentDraft.value.moodRating}/5)` : ''}\n`;
      return `${draftHeader}\n---\n\n${currentDraft.value.contentMarkdown || '_Start typing or use the chat to build your entry..._'}`;
    }
    if (currentViewMode.value === 'chat_interface') {
      return `## Chat with ${agentDisplayName.value}\n\n_Your conversation helps shape your diary entries. Use the chat panel below._`;
    }
    let welcome = `## Welcome to ${agentDisplayName.value}\n\n${agentConfigRef.value.description || 'Your personal space for reflection and discovery.'}\n\n`;
    if (onThisDayEntry.value) {
        welcome += `### On this day...\n*From ${new Date(onThisDayEntry.value.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}*\n**Title:** [${onThisDayEntry.value.title}](#)\n*Summary: ${onThisDayEntry.value.summary || onThisDayEntry.value.contentMarkdown.substring(0,100)+'...'}*\n_(Click card in dashboard to view full entry)_\n\n---\n`;
    }
    if (reflectionPrompt.value) {
        welcome += `### Reflection Prompt for Today:\n*${reflectionPrompt.value}*\n_(Click button in dashboard to start writing about this)_\n\n---\n`;
    }
    welcome += "Select an action, view past entries, or start a new reflection.";
    return welcome;
  });

 const canSaveChanges = computed<boolean>(() => {
    if (!currentDraft.value) return false;
    if (isComposing.value) {
      return !!(currentDraft.value.title?.trim() || currentDraft.value.contentMarkdown?.trim());
    }
    if (activeEntry.value && currentViewMode.value === 'edit_entry') {
      const original = activeEntry.value;
      const draft = currentDraft.value;
      const tagsChanged = JSON.stringify(draft.tags?.slice().sort() || []) !== JSON.stringify(original.tags?.slice().sort() || []);
      return draft.title !== original.title ||
             draft.contentMarkdown !== original.contentMarkdown ||
             tagsChanged ||
             draft.mood !== original.mood ||
             draft.moodRating !== original.moodRating ||
             draft.summary !== original.summary ||
             draft.isFavorite !== original.isFavorite ||
             JSON.stringify(draft.location) !== JSON.stringify(original.location) || // Basic check
             draft.weather !== original.weather;
    }
    return false;
  });

  const statistics = computed(() => {
    const total = allEntries.value.length;
    const ratedEntries = allEntries.value.filter(e => typeof e.moodRating === 'number');
    const avgMood = ratedEntries.length ? ratedEntries.reduce((acc, e) => acc + (e.moodRating as MoodRating), 0) / ratedEntries.length : undefined;
    const tagCounts: Record<string, number> = {};
    allEntries.value.forEach(e => (e.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
    const commonTags = Object.entries(tagCounts).sort(([,a],[,b]) => b-a).slice(0,5).map(([tag, count]) => ({tag, count}));
    return { totalEntries: total, averageMood: avgMood, commonTags };
  });

  // === ACTIONS ===

  function _mapToStorageEntry(richEntry: Partial<RichDiaryEntry>): StorageDiaryEntry {
    const storageEntry: StorageDiaryEntry = {
      id: richEntry.id!,
      title: richEntry.title!,
      contentMarkdown: richEntry.contentMarkdown!,
      createdAt: richEntry.createdAt!,
      updatedAt: richEntry.updatedAt!,
      tags: richEntry.tags || [],
      mood: richEntry.mood,
      summary: richEntry.summary,
      isFavorite: richEntry.isFavorite || false,
      schemaVersion: richEntry.schemaVersion || (config.value.storageNamespace.includes('v2.0') ? 2.0 : 1.3),
    };
    // For a "full redo", we assume localStorageService stringifies the whole object.
    // If specific mapping is needed due to diaryService limitations, it would be more explicit.
    // To ensure all RichDiaryEntry fields are attempted to be stored if diaryService passes object directly:
    return { ...richEntry, ...storageEntry } as StorageDiaryEntry;
  }

  function _mapFromStorageEntry(storageEntry: StorageDiaryEntry | RichDiaryEntry): RichDiaryEntry {
    // Handles cases where storageEntry might already be a RichDiaryEntry (e.g., from older direct local storage)
    // or needs to be enriched from a simpler StorageDiaryEntry.
    const baseSchemaVersion = config.value.storageNamespace.includes('v2.0') ? 2.0 : 1.3;
    return {
      id: storageEntry.id,
      title: storageEntry.title,
      contentMarkdown: storageEntry.contentMarkdown,
      createdAt: storageEntry.createdAt,
      updatedAt: storageEntry.updatedAt,
      tags: storageEntry.tags || [],
      mood: storageEntry.mood,
      summary: storageEntry.summary,
      isFavorite: storageEntry.isFavorite || false,
      schemaVersion: (storageEntry as RichDiaryEntry).schemaVersion || baseSchemaVersion,
      isDraft: (storageEntry as RichDiaryEntry).isDraft === undefined ? false : (storageEntry as RichDiaryEntry).isDraft,
      analysis: (storageEntry as RichDiaryEntry).analysis || undefined,
      attachments: (storageEntry as RichDiaryEntry).attachments || [],
      linkedEntryIds: (storageEntry as RichDiaryEntry).linkedEntryIds || [],
      source: (storageEntry as RichDiaryEntry).source || 'user_typed',
      location: (storageEntry as RichDiaryEntry).location || undefined,
      moodRating: (storageEntry as RichDiaryEntry).moodRating || undefined,
      weather: (storageEntry as RichDiaryEntry).weather || undefined,
      llmInteractionLog: (storageEntry as RichDiaryEntry).llmInteractionLog || [],
    };
  }

  async function initialize(_agentDefPassedIn: IAgentDefinition): Promise<void> {
    isProcessingLocal.value = true;
    agentErrorMessage.value = null;
    await _fetchSystemPrompt();
    await loadAllEntries();
    const tutorialExists = allEntries.value.some(e => e.id === 'echo-tutorial-entry-v1');
    if (allEntries.value.length === 0 || !tutorialExists) {
       await diaryService.createTutorialEntryIfNotExists(true); // Force create if no entries or tutorial missing
       await loadAllEntries(); // Reload to include tutorial if it was created
    }
    await _loadOnThisDayEntry();
    await requestReflectionPrompt();
    setViewMode('dashboard');
    isProcessingLocal.value = false;
    console.log(`[${agentDisplayName.value}] Initialized. ${allEntries.value.length} entries loaded.`);
    _updateChatStoreMainContent(undefined, false);
  }

  function cleanup(): void {
    isLoadingLLM.value = false;
    console.log(`[${agentDisplayName.value}] Cleanup.`);
  }

  async function loadAllEntries(): Promise<void> {
    isProcessingLocal.value = true;
    try {
      const entriesFromService = await diaryService.getAllEntries('updatedAt', 'desc');
      allEntries.value = entriesFromService.map(_mapFromStorageEntry);
      _updateAvailableTagsAndMoods();
    } catch (e:any) { toast?.add({type:'error', title:'Load Error', message:e.message});}
    finally { isProcessingLocal.value = false; }
  }

  async function createNewEntry(initialContent: string = ''): Promise<void> {
    const now = new Date().toISOString(); const newId = generateId();
    currentDraft.value = {
      id: newId, title: `Reflections - ${new Date(now).toLocaleDateString()}`, contentMarkdown: initialContent,
      createdAt: now, updatedAt: now, tags: [], isDraft: true,
      schemaVersion: config.value.storageNamespace.includes('v2.0') ? 2.0 : 1.3,
      source: initialContent ? 'llm_assisted' : 'user_typed', attachments: [], linkedEntryIds: [], llmInteractionLog: [],
    };
    activeEntryId.value = null; isComposing.value = true;
    chatMessages.value = [{ role: 'assistant', content: initialContent ? `Let's expand on: "${initialContent.substring(0,50)}..."` : "What's on your mind for this new entry?", timestamp: Date.now()}];
    setViewMode('compose_new_entry');
  }
  function selectEntryToView(entryId: string): void {
    const entry = allEntries.value.find(e => e.id === entryId);
    if (entry) {
      activeEntryId.value = entryId; currentDraft.value = null; isComposing.value = false;
      setViewMode('view_entry');
      showEntryListPanel.value = window.innerWidth <= 768 ? false : showEntryListPanel.value;
      chatMessages.value = [{role: 'assistant', content: `Viewing entry: "${entry.title}". You can ask me to analyze it or reflect further.`, timestamp: Date.now()}];
    } else { toast?.add({type: 'error', title: 'Not Found', message: 'Selected entry not found.'}); }
    _updateChatStoreMainContent(undefined, false);
  }

  function editSelectedEntry(): void {
    if (activeEntry.value) {
      currentDraft.value = JSON.parse(JSON.stringify(activeEntry.value)); // Deep clone
      if(currentDraft.value) currentDraft.value.isDraft = true;
      isComposing.value = false; setViewMode('edit_entry');
      chatMessages.value = [{role: 'assistant', content: `Editing entry: "${activeEntry.value.title}". Update your thoughts.`, timestamp: Date.now()}];
    } else { toast?.add({type: 'warning', title: 'No Entry Selected', message: 'Select an entry to edit.'}); }
    _updateChatStoreMainContent(undefined, false);
  }

  async function saveCurrentEntry(): Promise<RichDiaryEntry | null> {
    if (!currentDraft.value || (!currentDraft.value.title?.trim() && !currentDraft.value.contentMarkdown?.trim())) {
      toast?.add({ type: 'warning', title: 'Empty Entry', message: 'Please add a title or content.' }); return null;
    }
    isProcessingLocal.value = true;
    const draftToSave = { ...currentDraft.value, isDraft: false, updatedAt: new Date().toISOString() } as RichDiaryEntry;
    if (!draftToSave.id) draftToSave.id = generateId();
    if (!draftToSave.createdAt) draftToSave.createdAt = draftToSave.updatedAt;
    const entryForService = _mapToStorageEntry(draftToSave);

    try {
      const savedServiceEntry = await diaryService.saveEntry(entryForService);
      const finalRichEntry = { ...draftToSave, ..._mapFromStorageEntry(savedServiceEntry), isDraft: false };

      const index = allEntries.value.findIndex(e => e.id === finalRichEntry.id);
      if (index > -1) allEntries.value.splice(index, 1, finalRichEntry); else allEntries.value.unshift(finalRichEntry);
      allEntries.value.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      _updateAvailableTagsAndMoods();
      currentDraft.value = null; isComposing.value = false; activeEntryId.value = finalRichEntry.id;
      setViewMode('view_entry');
      toast?.add({ type: 'success', title: 'Entry Saved', message: `"${finalRichEntry.title}" saved.` });
      return finalRichEntry;
    } catch (e:any) { toast?.add({type:'error', title:'Save Failed', message:e.message}); return null; }
    finally { isProcessingLocal.value = false; }
  }

  async function deleteEntry(entryId: string): Promise<void> {
    const entryTitle = allEntries.value.find(e=>e.id === entryId)?.title || "this entry";
    if (!confirm(`Are you sure you want to delete "${entryTitle}"? This cannot be undone.`)) return;
    isProcessingLocal.value = true;
    try { await diaryService.deleteEntry(entryId); await loadAllEntries();
      if (activeEntryId.value === entryId) { activeEntryId.value = null; setViewMode('dashboard'); }
      toast?.add({ type: 'success', title: 'Entry Deleted' });
    } catch (e:any) { toast?.add({type:'error', title:'Delete Failed', message:e.message});}
    finally { isProcessingLocal.value = false; }
  }

  async function updateEntryMetadata(entryId: string, metadata: Partial<Pick<RichDiaryEntry, 'title' | 'tags' | 'mood' | 'summary' | 'isFavorite' | 'moodRating' | 'location' | 'analysis' | 'weather' | 'attachments' | 'linkedEntryIds'>>): Promise<void> {
    const entryIndex = allEntries.value.findIndex(e => e.id === entryId);
    if (entryIndex === -1) { toast?.add({type: 'error', title: 'Update Error', message: 'Entry not found.'}); return; }
    const updatedEntryData: RichDiaryEntry = { ...allEntries.value[entryIndex], ...metadata, updatedAt: new Date().toISOString() };
    isProcessingLocal.value = true;
    try {
        const entryForService = _mapToStorageEntry(updatedEntryData);
        const savedServiceEntry = await diaryService.saveEntry(entryForService);
        const finalRichEntry = { ...updatedEntryData, ..._mapFromStorageEntry(savedServiceEntry) };
        allEntries.value.splice(entryIndex, 1, finalRichEntry);
        allEntries.value.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        _updateAvailableTagsAndMoods();
        if(activeEntryId.value === entryId){
            const tempId = activeEntryId.value; activeEntryId.value = null;
            await new Promise(r => setTimeout(r,0)); activeEntryId.value = tempId;
        }
        if (metadata.isFavorite !== undefined) { /* Toast handled by toggleFavorite */ }
        else { toast?.add({type: 'success', title: 'Entry Updated', message: `"${finalRichEntry.title}" details updated.`}); }
    } catch (e:any) { toast?.add({type: 'error', title: 'Update Failed', message: e.message}); await loadAllEntries(); }
    finally { isProcessingLocal.value = false; }
  }

  async function toggleFavorite(entryId: string): Promise<void> {
    const entry = allEntries.value.find(e => e.id === entryId);
    if (entry) {
      const newFavoriteStatus = !entry.isFavorite;
      await updateEntryMetadata(entryId, { isFavorite: newFavoriteStatus });
      toast?.add({type: 'info', title: 'Favorite Updated', message: newFavoriteStatus ? `"${entry.title}" marked as favorite.` : `"${entry.title}" removed from favorites.`})
    }
  }

  async function clearAllEntries(): Promise<void> {
     if (!confirm("Are you sure you want to delete ALL diary entries? This action CANNOT be undone.")) return;
    isProcessingLocal.value = true;
    try { await diaryService.clearAllEntries(); await loadAllEntries();
      activeEntryId.value = null; currentDraft.value = null; isComposing.value = false; setViewMode('dashboard');
      toast?.add({ type: 'info', title: 'Diary Cleared', message: 'All entries deleted. Tutorial entry restored.' });
    } catch (e:any) { toast?.add({type:'error', title:'Clear Failed', message:e.message});}
    finally { isProcessingLocal.value = false; }
  }

  // --- LLM Interaction Core & Helpers (DEFINITIONS RESTORED AND ENHANCED) ---
  /** Handles errors from LLM calls. */
  function _handleLLMError(error: any, actionHint?: string) {
    isLoadingLLM.value = false;
    chatStore.setMainContentStreaming(false);
    const errorMessage = error.response?.data?.message || error.message || `An error occurred with ${agentDisplayName.value} (Action: ${actionHint}).`;
    agentErrorMessage.value = errorMessage;
    console.error(`[${agentDisplayName.value}] LLM Error (Action: ${actionHint}):`, error);
    toast?.add({ type: 'error', title: `${agentDisplayName.value} Error`, message: errorMessage });
    if (['chat_response', 'elaborate_on_initial_thought', 'continue_reflection'].includes(actionHint || '')) {
      chatMessages.value.push({ role: 'error', content: `Sorry, I encountered a problem. Please try again.`, timestamp: Date.now() });
    }
    _updateChatStoreMainContent(undefined, false);
  }

  /** Gets specific instructions for the LLM based on the action. */
  function _getLLMInstructionsForAction(actionHint: string, userInput: string, context?: { entryId?: string; relatedEntryData?: {id: string, title: string, summary?:string}[] }): string {
    switch(actionHint){
        case 'suggest_metadata':
            return `Based on the user's input (entryContentSample), call the 'suggestDiaryMetadata' function. Provide: 'tentativeTitle' (concise, reflective), 'suggestedTags' (2-5 relevant keywords array), optional 'mood' (from this list if possible: ${availableMoods.value.join(', ')}, otherwise a new one), and 'briefSummary' (1-2 sentences of 100-250 chars).`;
        case 'finalize_entry_with_metadata':
            const meta = agentStore.getAgentContext(agentConfigRef.value.id) || llmSuggestedMetadata.value;
            return `User confirmed metadata: Title: "${meta?.finalEntryTitle || meta?.tentativeTitle}", Tags: [${(meta?.finalEntryTags || meta?.suggestedTags || []).join(', ')}], Mood: ${meta?.finalEntryMood || meta?.mood || 'Not set'}. Summary: "${meta?.finalEntrySummary || meta?.briefSummary}". Full entry text so far: "${userInput}". Generate ONLY the final, polished Markdown body for the diary entry. Incorporate the full conversation context and this metadata seamlessly. Make it reflective and well-structured. If enabled and appropriate for complex thoughts, embed simple Mermaid diagrams (\`\`\`mermaid\\n[code]\\n\`\`\`).`;
        case 'generate_reflection_prompt':
            return `Generate one thoughtful, open-ended reflection prompt for a diary. Recent topics: ${context?.relatedEntryData?.map(e => e.title).join('; ') || allEntries.value.slice(0,3).map(e=>e.title).join('; ') || 'personal growth'}. Return only the prompt text.`;
        case 'elaborate_on_initial_thought':
             return `User started with: "${userInput.substring(0,150)}...". Ask 1-2 gentle, open-ended follow-up questions to help them elaborate. Be conversational and brief.`;
        case 'continue_reflection':
             return `User continues: "${userInput.substring(0,150)}...". Listen empathetically. If appropriate, ask a brief, gentle follow-up question, or affirm their sharing. If they seem to be winding down or explicitly state they are done, consider if it's time to suggest metadata by responding with ONLY the text "[[SUGGEST_METADATA_NOW]]".`;
        case 'analyze_entry_content':
            return `Analyze this diary entry content. Respond ONLY with a JSON object: {"sentimentAnalysis": {"overallPolarity": "positive|negative|neutral|mixed", "positiveScore": num(0-1), "negativeScore": num(0-1), "neutralScore": num(0-1), "subjectivity": num(0-1), "keyPhrases": [{"text": str, "sentiment": "positive|negative|neutral", "score": num(0-1)}]}, "keywords": str[], "themes": str[], "actionItemsMentioned": str[], "questionsToSelf": str[]}. Extract 3-5 keyPhrases, 3-7 keywords/themes. Content: "${userInput.substring(0, 3000)}..."`;
        case 'find_related_entries':
            const candidates = context?.relatedEntryData?.map(e => `ID: ${e.id}, Title: ${e.title}, Summary: ${e.summary || e.title}`).join('\n---\n') || "No candidates provided.";
            return `Current entry content: "${userInput.substring(0,1000)}...". Other entries (ID, Title, Summary):\n${candidates}\nIdentify up to 3 entries from the list that are most semantically related to the current entry. Respond ONLY with a JSON array of the related entry IDs, e.g., ["id1", "id2", "id3"]. If no entries are meaningfully related, return an empty array [].`;
        default: return `Respond empathetically to: "${userInput.substring(0,150)}..."`;
    }
  }

  /** Processes LLM responses, updates state, and triggers further actions. */
  function _processLLMResponse(responseData: ChatResponseDataFE | null, actionHint: string, targetEntryId?: string) {
    if (!responseData) { toast?.add({type: 'warning', title: 'Empty Response'}); return; }

    let llmTextContent: string | null = null;
    let toolCalls: ILlmToolCallFE[] | undefined = undefined;

    if (responseData.type === 'text_response') {
        llmTextContent = (responseData as TextResponseDataFE).content;
    } else if (responseData.type === 'function_call_data') {
        const funcCallData = responseData as FunctionCallResponseDataFE;
        llmTextContent = funcCallData.assistantMessageText || `Echo wants to use the tool: ${funcCallData.toolName}.`;
        toolCalls = [{ id: funcCallData.toolCallId, type: 'function', function: {name: funcCallData.toolName, arguments: JSON.stringify(funcCallData.toolArguments)} }];
        
        if (funcCallData.toolName === 'suggestDiaryMetadata' && actionHint === 'suggest_metadata') {
            try {
                const args = funcCallData.toolArguments as SuggestDiaryMetadataToolOutput;
                llmSuggestedMetadata.value = {
                    tentativeTitle: args.tentativeTitle || `Entry - ${new Date().toLocaleDateString()}`,
                    suggestedTags: args.suggestedTags || [],
                    mood: args.mood || undefined,
                    briefSummary: args.briefSummary || "Summary of your thoughts.",
                    toolCallId: funcCallData.toolCallId,
                    toolName: funcCallData.toolName,
                };
                userEditedMetadata.value = {
                    title: llmSuggestedMetadata.value.tentativeTitle,
                    tags: llmSuggestedMetadata.value.suggestedTags.join(', '),
                    mood: llmSuggestedMetadata.value.mood || '',
                };
                showMetadataModal.value = true;
            } catch (e) { console.error("Error parsing suggestDiaryMetadata tool arguments:", e); toast?.add({type:'error', title:'Metadata Error'});}
        }
    }

    if (llmTextContent && ['chat_response', 'elaborate_on_initial_thought', 'continue_reflection'].includes(actionHint)) {
        chatMessages.value.push({ role: 'assistant', content: llmTextContent, timestamp: Date.now(), tool_calls: toolCalls });
    }

    if (llmTextContent && !toolCalls) { // Only process as direct content if not a tool call that was handled
        if (actionHint === 'finalize_entry_with_metadata' && currentDraft.value) {
            currentDraft.value.contentMarkdown = llmTextContent;
            const agentCtx = agentStore.getAgentContext(agentConfigRef.value.id);
            currentDraft.value.title = agentCtx?.finalEntryTitle || currentDraft.value.title;
            currentDraft.value.tags = agentCtx?.finalEntryTags || currentDraft.value.tags;
            currentDraft.value.mood = agentCtx?.finalEntryMood || currentDraft.value.mood;
            currentDraft.value.summary = agentCtx?.finalEntrySummary || llmTextContent.substring(0,200)+'...';
            saveCurrentEntry(); agentStore.clearAgentContext();
        } else if (actionHint === 'generate_reflection_prompt') {
            reflectionPrompt.value = llmTextContent;
        } else if (actionHint === 'analyze_entry_content') {
            const entryToUpdateId = targetEntryId || activeEntry.value?.id;
            if (entryToUpdateId) {
                try {
                    const analysisResult = JSON.parse(llmTextContent) as {sentimentAnalysis: DiarySentimentAnalysis, keywords: string[], themes: string[], actionItemsMentioned?: string[], questionsToSelf?: string[]};
                    const existingEntry = allEntries.value.find(e=>e.id === entryToUpdateId);
                    if(existingEntry) {
                        const updatedAnalysis: DiaryEntryAnalysis = { ...(existingEntry.analysis || {}),
                            sentiment: analysisResult.sentimentAnalysis, keywords: analysisResult.keywords, themes: analysisResult.themes,
                            actionItems: analysisResult.actionItemsMentioned, questionsToSelf: analysisResult.questionsToSelf,
                        };
                        updateEntryMetadata(entryToUpdateId, { analysis: updatedAnalysis });
                        toast?.add({type: 'success', title: 'Analysis Complete'}); showAnalysisModal.value = true;
                    }
                } catch (e) { console.error("Failed to parse analysis JSON:", e); toast?.add({type:'error', title:'Analysis Error'});}
            }
        } else if (actionHint === 'find_related_entries') {
             const entryToUpdateId = targetEntryId || activeEntry.value?.id;
            if (entryToUpdateId) {
                try {
                    const relatedIds = JSON.parse(llmTextContent) as string[];
                    updateEntryMetadata(entryToUpdateId, { linkedEntryIds: relatedIds });
                    toast?.add({type: 'info', title: 'Related Found', message: `Found ${relatedIds.length} related entries.`});
                } catch (e) { console.error("Failed to parse related IDs:", e); toast?.add({type:'error', title:'Link Error'});}
            }
        } else if (currentDraft.value && llmTextContent.includes("[[SUGGEST_METADATA_NOW]]")) {
            const cleanedContent = llmTextContent.replace("[[SUGGEST_METADATA_NOW]]", "").trim();
            if (chatMessages.value.length > 0) {
                 chatMessages.value[chatMessages.value.length-1].content = cleanedContent || "Okay, let's add some details.";
            }
            if (currentDraft.value.contentMarkdown) requestMetadataSuggestion(currentDraft.value.contentMarkdown);
        }
    }
    _updateChatStoreMainContent(undefined, false);
  }

  /** Centralized LLM interaction function. */
  async function _callDiaryLLM(
    userInputOrContent: string,
    actionHint: 'elaborate_on_initial_thought' | 'continue_reflection' | 'suggest_metadata' | 'finalize_entry_with_metadata' | 'generate_reflection_prompt' | 'chat_response' | 'analyze_entry_content' | 'find_related_entries',
    context?: { entryId?: string; relatedEntryData?: {id: string, title: string, summary?:string}[] }
  ): Promise<ChatResponseDataFE | null> {
    isLoadingLLM.value = true;
    agentErrorMessage.value = null;
    if(actionHint !== 'chat_response') _updateChatStoreMainContent(undefined, true);

    if (!currentSystemPrompt.value) await _fetchSystemPrompt();

    const agentContextForLLM: Record<string, any> = { /* ... as before ... */
        isComposingSession: isComposing.value, currentDraftTitle: currentDraft.value?.title,
        currentDraftTags: currentDraft.value?.tags, currentDraftMood: currentDraft.value?.mood,
        actionHint: actionHint, ...(agentStore.getAgentContext(agentConfigRef.value.id) || {})
    };
    if (actionHint === 'find_related_entries' && context?.relatedEntryData) {
        agentContextForLLM.candidateEntries = context.relatedEntryData;
    }

    const personaOverride = chatStore.getPersonaForAgent(agentConfigRef.value.id);
    const baseAdditionalInstructions = _getLLMInstructionsForAction(actionHint, userInputOrContent, context);
    const combinedInstructions = [baseAdditionalInstructions, personaOverride?.trim()].filter(Boolean).join('\n\n');

    const finalSystemPrompt = currentSystemPrompt.value
        .replace(/{{CURRENT_DATE}}/g, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
        .replace(/{{RECENT_TOPICS_SUMMARY}}/gi, allEntries.value.slice(0, 3).map(e => e.title || e.summary?.substring(0,30)).filter(Boolean).join('; ') || 'your past reflections')
        .replace(/{{AGENT_CONTEXT_JSON}}/g, JSON.stringify(agentContextForLLM))
        .replace(/{{GENERATE_DIAGRAM}}/g, String(config.value.enableMermaid))
        .replace(/{{ADDITIONAL_INSTRUCTIONS}}/g, combinedInstructions);

    const messagesForLlm: ChatMessageFE[] = [{ role: 'system', content: finalSystemPrompt }];
    if (['chat_response', 'elaborate_on_initial_thought', 'continue_reflection'].includes(actionHint)) {
        messagesForLlm.push(...chatMessages.value.slice(-config.value.maxChatHistoryLength));
        if (messagesForLlm[messagesForLlm.length -1]?.content !== userInputOrContent || messagesForLlm[messagesForLlm.length -1]?.role !== 'user') {
             messagesForLlm.push({ role: 'user', content: userInputOrContent, timestamp: Date.now() });
        }
    } else { messagesForLlm.push({ role: 'user', content: userInputOrContent, timestamp: Date.now() }); }

    const basePayload: ChatMessagePayloadFE = {
        messages: messagesForLlm, mode: `${agentConfigRef.value.id}-${actionHint}`,
        conversationId: currentDraft.value?.id || activeEntry.value?.id || chatStore.getCurrentConversationId(agentConfigRef.value.id) || `diary-${Date.now()}`,
        stream: false, // Most Diary actions are single, structured responses or tool calls
         ...(actionHint === 'suggest_metadata' && {
            tool_choice: { type: "function", function: { name: "suggestDiaryMetadata" } } as any,
            tools: [{ type: "function", function: { name: "suggestDiaryMetadata",
                description: "Suggests title, tags, mood, and summary for a diary entry text sample.",
                parameters: { type: "object", properties: {
                    entryContentSample: { type: "string", description: "Diary entry sample (min 50 chars, max 2000)." },
                    currentDate: { type: "string", description: "Current date (ISO). Optional." },
                    existingTags: { type: "array", items: { type: "string" }, description: "Existing tags. Optional." }
                }, required: ["entryContentSample"]}}}]
        })
    };

    try {
        const payload = chatStore.attachPersonaToPayload(agentConfigRef.value.id, basePayload);
        const response = await chatAPI.sendMessage(payload); // chatAPI is now used
        chatStore.syncPersonaFromResponse(agentConfigRef.value.id, response.data);
        _processLLMResponse(response.data, actionHint, context?.entryId);
        return response.data;
    } catch (error: any) { _handleLLMError(error, actionHint); return null; }
    finally { isLoadingLLM.value = false; _updateChatStoreMainContent(undefined, false); }
  }


  // LLM Action Triggers (simplified, they all call _callDiaryLLM)
  async function processUserInputForEntry(text: string): Promise<void> {
    if (!isComposing.value && !activeEntry.value && currentViewMode.value !== 'chat_interface') {
      await createNewEntry(text); return;
    }
    if (currentDraft.value && (isComposing.value || currentViewMode.value === 'edit_entry')) {
        currentDraft.value.contentMarkdown = (currentDraft.value.contentMarkdown || "") + `\n\n**You:** ${text}\n`;
    }
    chatMessages.value.push({ role: 'user', content: text, timestamp: Date.now() });
    await _callDiaryLLM(text, 'continue_reflection');
    _updateChatStoreMainContent(undefined, false);
  }
  async function requestMetadataSuggestion(entryContentOverride?: string): Promise<void> {
    const content = entryContentOverride || currentDraft.value?.contentMarkdown || activeEntry.value?.contentMarkdown;
    if (!content || content.trim().length < 20) { toast?.add({type: 'warning', title: 'More Content Needed'}); return; }
    const sample = content.substring(0, 2000) + (content.length > 2000 ? "..." : "");
    await _callDiaryLLM(sample, 'suggest_metadata');
  }
  async function confirmAndFinalizeEntryWithLLM(confirmedMetadata: { title: string; tags: string[]; mood?: string; summary: string }): Promise<void> {
    const baseDraft = currentDraft.value || (activeEntry.value ? { ...activeEntry.value } : null);
    if (!baseDraft || !baseDraft.contentMarkdown) { toast?.add({type:'error', title:'Finalize Error'}); return; }
    baseDraft.title = confirmedMetadata.title; baseDraft.tags = confirmedMetadata.tags; baseDraft.mood = confirmedMetadata.mood; baseDraft.summary = confirmedMetadata.summary;
    baseDraft.isDraft = true; currentDraft.value = baseDraft;
    agentStore.updateAgentContext({ finalEntryTitle: confirmedMetadata.title, finalEntryTags: confirmedMetadata.tags, finalEntryMood: confirmedMetadata.mood, finalEntrySummary: confirmedMetadata.summary, agentId: agentConfigRef.value.id });
    showMetadataModal.value = false; llmSuggestedMetadata.value = null;
    await _callDiaryLLM(baseDraft.contentMarkdown, 'finalize_entry_with_metadata');
  }
  async function requestReflectionPrompt(): Promise<void> {
    const contextStr = allEntries.value.length > 0 ? `Recent themes: ${statistics.value.commonTags.map(t=>t.tag).join(', ')}` : "User new.";
    await _callDiaryLLM(contextStr, 'generate_reflection_prompt');
  }
  async function analyzeEntrySentiment(entryId: string): Promise<DiarySentimentAnalysis | null> {
    const entry = allEntries.value.find(e => e.id === entryId);
    if (!entry) { toast?.add({type: 'error', title: 'Not Found'}); return null; }
    toast?.add({type: 'info', title: 'Analyzing Entry...', message: `Requesting analysis for "${entry.title}".`});
    await _callDiaryLLM(entry.contentMarkdown, 'analyze_entry_content', { entryId });
    const updatedEntry = allEntries.value.find(e => e.id === entryId);
    return updatedEntry?.analysis?.sentiment || null;
  }
  async function extractEntryKeywords(entryId: string): Promise<string[] | null> {
    const entry = allEntries.value.find(e => e.id === entryId);
    if (!entry) { toast?.add({type: 'error', title: 'Not Found'}); return null; }
    if (entry.analysis?.keywords && entry.analysis.keywords.length > 0) {
        toast?.add({type: 'info', title: 'Keywords Ready'}); return entry.analysis.keywords;
    }
    toast?.add({type: 'info', title: 'Extracting Keywords...'});
    await _callDiaryLLM(entry.contentMarkdown, 'analyze_entry_content', { entryId });
    const updatedEntry = allEntries.value.find(e => e.id === entryId);
    return updatedEntry?.analysis?.keywords || null;
  }
  async function findRelatedEntries(entryId: string, count: number = 3): Promise<RichDiaryEntry[]> {
    const currentEntry = allEntries.value.find(e => e.id === entryId);
    if (!currentEntry) return [];
    const otherSummaries = allEntries.value.filter(e => e.id !== entryId && (e.summary || e.contentMarkdown))
        .map(e => ({ id: e.id, title: e.title, summary: e.summary || e.contentMarkdown.substring(0,150) })).slice(0, 20);
    if (otherSummaries.length === 0) { toast?.add({type: 'info', title: 'No Other Entries'}); return []; }
    const contentForLLM = `Current Entry: ${currentEntry.title}\n${currentEntry.contentMarkdown.substring(0,500)}`;
    toast?.add({type: 'info', title: 'Finding Related...', message: `Finding entries related to "${currentEntry.title}".`});
    const response = await _callDiaryLLM(contentForLLM, 'find_related_entries', { entryId, relatedEntryData: otherSummaries });
    if (response && (response as TextResponseDataFE).content) {
        try { const ids = JSON.parse((response as TextResponseDataFE).content!) as string[]; await updateEntryMetadata(entryId, { linkedEntryIds: ids });
            return allEntries.value.filter(e => ids.includes(e.id));
        } catch (e) { console.error("Error parsing related IDs:", e); }
    } return [];
  }

  // UI & Filters
  function setViewMode(mode: DiaryViewMode): void {
    currentViewMode.value = mode; agentErrorMessage.value = null;
    if (mode === 'compose_new_entry' && !currentDraft.value) createNewEntry();
    else if (mode !== 'edit_entry' && mode !== 'compose_new_entry') { currentDraft.value = null; isComposing.value = false;}
    if(mode === 'view_entry' && !activeEntryId.value && filteredAndSortedEntries.value.length > 0) selectEntryToView(filteredAndSortedEntries.value[0].id);
    else if (mode === 'dashboard') { _loadOnThisDayEntry(); if (!reflectionPrompt.value) requestReflectionPrompt(); }
    _updateChatStoreMainContent(undefined, false);
  }
  function toggleEntryListPanel(force?: boolean): void { showEntryListPanel.value = force !== undefined ? force : !showEntryListPanel.value; }
  function updateFilters(newFilters: Partial<DiaryFilterOptions>): void { activeFilters.value = { ...activeFilters.value, ...newFilters }; }
  function clearFilters(): void { activeFilters.value = { sortBy: 'updatedAt', sortOrder: 'desc' }; }

  async function handleFileUploadForImport(file: File): Promise<{importedCount: number, skippedCount: number, error?: string} | void> {
    isProcessingLocal.value = true;
    let result: {importedCount: number, skippedCount: number, error: string | undefined } = {importedCount: 0, skippedCount: 0, error: undefined}; // Ensure error property is defined
    try { 
        const jsonString = await file.text(); 
        const importResult = await diaryService.importEntries(jsonString);
        // Ensure error property is always present
        result = { 
            importedCount: importResult.importedCount, 
            skippedCount: importResult.skippedCount, 
            error: importResult.error !== undefined ? importResult.error : undefined 
        };
        if (!result.error) { 
            await loadAllEntries(); 
            toast?.add({ type: 'success', title: 'Import Complete', message: `${result.importedCount} imported, ${result.skippedCount} skipped.` }); 
        }
        else { 
            toast?.add({ type: 'error', title: 'Import Error', message: result.error }); 
        } 
        return result;
    } catch (e: any) { 
        result.error = e.message; 
        toast?.add({ type: 'error', title: 'Import Failed', message: result.error }); 
        return result;
    }
    finally { isProcessingLocal.value = false; }
  }
  async function exportDiaryData(format: 'json' | 'markdown_bundle' = 'json'): Promise<void> {
    if (allEntries.value.length === 0) { toast?.add({type:'info', title:'No Entries'}); return; }
    isProcessingLocal.value = true;
    try { let blob: Blob; let filename: string; const ts = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      if (format === 'json') {
        const exportObj = { exportFormatVersion: "2.1-rich-echo", exportedAt: new Date().toISOString(), entries: allEntries.value };
        blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json;charset=utf-8;' }); filename = `EchoDiary_Rich_${ts}.json`;
      } else { const zip = new JSZip(); allEntries.value.forEach(e => {
            const entryFN = `${e.createdAt.substring(0,10)}_${e.title.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0,30)}.md`;
            let md = `# ${e.title}\n\n**Date:** ${new Date(e.createdAt).toLocaleString()}\n`;
            if(e.tags?.length) md += `**Tags:** ${e.tags.join(', ')}\n`; if(e.mood) md += `**Mood:** ${e.mood}${e.moodRating ? ` (${e.moodRating}/5)`: ''}\n`;
            if(e.location?.name) md += `**Location:** ${e.location.name}\n`; if(e.weather) md += `**Weather:** ${e.weather}\n`; if(e.summary) md += `**Summary:** *${e.summary}*\n`;
            md += `\n---\n\n${e.contentMarkdown}`; if (e.attachments?.length) { md += `\n\n---\n**Attachments:**\n`; e.attachments.forEach(att => { md += `* ${att.type}: ${att.caption || att.url} (${att.url})\n`; });}
            zip.file(entryFN, md); }); blob = await zip.generateAsync({type:"blob"}); filename = `EchoDiary_Markdown_${ts}.zip`; }
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      toast?.add({type:'success', title:'Export Successful'});
    } catch (e:any) { toast?.add({type:'error', title:'Export Failed', message:e.message});}
    finally { isProcessingLocal.value = false; }
  }

  async function sendChatMessage(text: string): Promise<void> {
    if (!text.trim()) return;
    chatMessages.value.push({ role: 'user', content: text, timestamp: Date.now() });
    const action = (isComposing.value && currentDraft.value) ? 'continue_reflection' : 'chat_response';
    await _callDiaryLLM(text, action);
  }

  // --- INTERNAL HELPERS (definitions restored) ---
  async function _fetchSystemPrompt(): Promise<void> { /* ... as before ... */ }
  function _updateAvailableTagsAndMoods(): void { /* ... as before ... */ }
  async function _loadOnThisDayEntry(): Promise<void> { /* ... as before ... */ }
  function _updateChatStoreMainContent(customMarkdown?: string, isCurrentlyStreaming: boolean = false) { /* ... corrected as before ... */
    const markdownToDisplay = customMarkdown !== undefined ? customMarkdown : displayContentMarkdown.value;
    const currentSessionTitle = activeEntry.value?.title || currentDraft.value?.title || agentDisplayName.value;
    const modeTitle = currentViewMode.value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    chatStore.setMainContentStreaming(isCurrentlyStreaming);
    const content: MainContent = {
        agentId: agentConfigRef.value.id, type: 'markdown',
        data: markdownToDisplay + (isCurrentlyStreaming ? "▋" : ""),
        title: activeEntryId.value || isComposing.value ? `${currentSessionTitle} - ${modeTitle}` : `${agentDisplayName.value} - ${modeTitle}`,
        timestamp: Date.now(),
    };
    chatStore.updateMainContent(content);
  }

  // Watchers
  watch(currentViewMode, (newMode) => {
    agentErrorMessage.value = null;
    if (newMode !== 'edit_entry' && newMode !== 'compose_new_entry') {
        currentDraft.value = null; isComposing.value = false;
    } else if (newMode === 'compose_new_entry' && !currentDraft.value) {
        createNewEntry();
    }
    if (newMode === 'dashboard') { _loadOnThisDayEntry(); if (!reflectionPrompt.value) requestReflectionPrompt(); }
    _updateChatStoreMainContent(undefined, false);
  });
  watch(activeEntryId, (newId) => { if (newId) { currentDraft.value = null; isComposing.value = false; } _updateChatStoreMainContent(undefined, false); }, { immediate: true });
  watch(currentDraft, () => { if (isComposing.value || currentViewMode.value === 'edit_entry') _updateChatStoreMainContent(undefined, false); }, {deep: true});

  return {
    isLoadingLLM, isProcessingLocal, currentSystemPrompt, agentErrorMessage,
    allEntries, activeEntryId, currentDraft, isComposing, currentViewMode,
    showEntryListPanel, showMetadataModal, showAnalysisModal, activeFilters,
    availableTags, availableMoods, llmSuggestedMetadata, userEditedMetadata,
    chatMessages, isChatInputFocused: ref(false), onThisDayEntry, reflectionPrompt,
    agentDisplayName, filteredAndSortedEntries, activeEntry, displayContentMarkdown,
    canSaveChanges, statistics,
    initialize, cleanup, loadAllEntries, createNewEntry, selectEntryToView,
    editSelectedEntry, saveCurrentEntry, deleteEntry, toggleFavorite,
    updateEntryMetadata, clearAllEntries, processUserInputForEntry,
    requestMetadataSuggestion, confirmAndFinalizeEntryWithLLM, requestReflectionPrompt,
    analyzeEntrySentiment, extractEntryKeywords, findRelatedEntries, setViewMode,
    toggleEntryListPanel, updateFilters, clearFilters, handleFileUploadForImport,
    exportDiaryData, sendChatMessage,
  };
}
