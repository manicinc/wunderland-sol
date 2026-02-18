// File: frontend/src/components/agents/DiaryAgent/DiaryAgentView.vue
/**
 * @file DiaryAgentView.vue
 * @description Main view component for the Echo (Diary) agent.
 * Orchestrates various child components (list panel, workspace, chat, modals)
 * and uses the useDiaryAgent composable for all its logic and state management.
 * @version 2.2.0 - Fully integrated with corrected useDiaryAgent, child components, and fixed TS errors.
 */
<template>
  <div class="diary-agent-view-v2">
    <div class="diary-header-v2">
      <div class="header-title-group-v2">
        <BookOpenIcon class="header-icon-v2" />
        <span>{{ agentDisplayName }}</span>
        <span v-if="currentViewMode" class="view-mode-chip-v2">{{ currentViewMode.replace(/_/g, ' ') }}</span>
      </div>
      <div class="header-actions-v2">
        <button
          @click="() => toggleEntryListPanel()"
          class="btn-futuristic-toggle btn-sm"
          title="Toggle Entry List Panel"
          aria-label="Toggle entry list panel"
          :aria-expanded="showEntryListPanel"
        >
          <Bars3Icon class="btn-icon-sm"/>
          <span>Entries ({{ filteredAndSortedEntries.length }})</span>
        </button>
        <button @click="handleStartNewEntry" class="btn-futuristic-primary btn-sm" title="Start a New Diary Entry" aria-label="Start a new diary entry">
          <PlusCircleIcon class="btn-icon-sm"/> New Entry
        </button>
          <button @click="() => setViewMode('dashboard')" class="btn-futuristic-secondary btn-sm" title="Go to Dashboard" aria-label="Go to dashboard">
          <HomeIcon class="btn-icon-sm"/> Dashboard
        </button>
      </div>
    </div>

    <div class="diary-main-layout-v2">
      <Transition name="slide-fade-left-diary">
        <DiaryEntryListPanel
          v-if="showEntryListPanel"
          :entries="filteredAndSortedEntries"
          :active-entry-id="activeEntryId"
          :is-loading="isProcessingLocal"
          :filters="activeFilters"
          :available-tags="availableTags"
          :available-moods="availableMoods"
          @select-entry="handleSelectEntry"
          @delete-entry="handleDeleteEntry"
          @clear-all-entries="handleClearAllEntries"
          @update-filters="handleUpdateFilters"
          @export-data="handleExportData"
          @import-data-trigger="triggerImportFileInput"
        />
      </Transition>

      <input type="file" ref="importFileInputRef" @change="handleFileImportChange" accept=".json,application/json" style="display: none;" aria-hidden="true" />

      <div class="diary-workspace-container-v2">
        <DiaryChatInterface
          v-if="currentViewMode === 'chat_interface' || (isComposing && currentViewMode === 'compose_new_entry')"
          :messages="chatMessages"
          :is-loading-llm="isLoadingLLM"
          :agent-display-name="agentDisplayName"
          @send-message="handleSendChatMessage"
          class="diary-chat-interface-v2"
        />

        <DiaryWorkspace
          v-if="currentViewMode === 'view_entry' || currentViewMode === 'edit_entry' || (currentViewMode === 'compose_new_entry' && currentDraft)"
          :entry="currentViewMode === 'view_entry' ? activeEntry : currentDraft"
          :view-mode="currentViewMode"
          :is-loading="isLoadingLLM || isProcessingLocal"
          :can-save="canSaveChanges"
          :common-moods="availableMoods"
          :default-tags="availableTags.slice(0, 10)"
          @save-entry="handleSaveEntry"
          @update-draft="handleUpdateDraft"
          @delete-entry="handleDeleteCurrentActiveEntry"
          @edit-entry="handleEditActiveEntry"
          @toggle-favorite="handleToggleFavoriteActiveEntry"
          @request-analysis="handleRequestAnalysis"
          @request-metadata-suggestion="handleRequestMetadataSuggestion"
          class="diary-workspace-v2"
        />

        <div v-if="currentViewMode === 'dashboard'" class="diary-dashboard-v2">
            <h2 class="dashboard-title-v2">{{ agentDisplayName }} Dashboard</h2>
            <div class="dashboard-stats-grid-v2">
                <div class="stat-card-v2">Total Entries: <span>{{ statistics.totalEntries }}</span></div>
                <div class="stat-card-v2">Avg Mood: <span>{{ statistics.averageMood ? statistics.averageMood.toFixed(1) + '/5' : 'N/A' }}</span></div>
                <div class="stat-card-v2">Common Tags:
                    <span v-if="statistics.commonTags.length">{{ statistics.commonTags.map(t => t.tag).join(', ') }}</span>
                    <span v-else>N/A</span>
                </div>
            </div>
            <div
              v-if="onThisDayEntry"
              class="on-this-day-card-v2"
              @click="() => handleSelectEntry(onThisDayEntry!.id)"
              @keyup.enter="() => handleSelectEntry(onThisDayEntry!.id)"
              tabindex="0"
              role="button"
              :aria-label="`View 'On This Day' entry: ${onThisDayEntry.title}`"
            >
                <h3>On This Day... <span class="text-xxs">({{ new Date(onThisDayEntry.createdAt).toLocaleDateString() }})</span></h3>
                <h4>{{ onThisDayEntry.title }}</h4>
                <p class="line-clamp-3">{{ onThisDayEntry.summary || onThisDayEntry.contentMarkdown }}</p>
            </div>
            <div v-if="reflectionPrompt" class="reflection-prompt-card-v2">
                <h3>Reflection Prompt</h3>
                <p>{{ reflectionPrompt }}</p>
                <button @click="startNewEntryWithPrompt" class="btn-futuristic-outline btn-sm">Write about this</button>
            </div>
            <button @click="requestReflectionPrompt" class="btn-futuristic-secondary btn-sm mt-4">
              Get New Reflection Prompt
            </button>
        </div>
      </div>
    </div>

    <DiaryMetadataModal
        v-if="showMetadataModal && llmSuggestedMetadata"
        :suggested-title="llmSuggestedMetadata.tentativeTitle"
        :suggested-tags="llmSuggestedMetadata.suggestedTags"
        :suggested-mood="llmSuggestedMetadata.mood"
        :suggested-summary="llmSuggestedMetadata.briefSummary"
        :default-moods="availableMoods"
        @confirm="handleConfirmMetadata"
        @cancel="handleCancelMetadata"
    />
    <DiaryAnalysisModal
        v-if="showAnalysisModal && activeEntry && activeEntry.analysis"
        :entry="activeEntry"
        @close="showAnalysisModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted, onUnmounted, type PropType, toRef } from 'vue';
import type { IAgentDefinition, AgentId } from '@/services/agent.service';
import type { ToastService } from '@/services/services';
// Assuming child components and composable are in ./ subdirectory
import { useDiaryAgent } from './useDiaryAgent';
import type { RichDiaryEntry, DiaryFilterOptions, SuggestDiaryMetadataToolOutput, DiaryViewMode } from './DiaryAgentTypes';

import DiaryEntryListPanel from './DiaryEntryListPanel.vue';
import DiaryWorkspace from './DiaryWorkspace.vue'; // Assuming this will be created/provided
import DiaryChatInterface from './DiaryChatInterface.vue';
import DiaryMetadataModal from './DiaryMetadataModal.vue'; // Assuming this will be created/provided
import DiaryAnalysisModal from './DiaryAnalysisModal.vue';

import {
  BookOpenIcon, PlusCircleIcon, Bars3Icon, HomeIcon,
} from '@heroicons/vue/24/solid';

/**
 * @props agentId - The unique identifier for this agent instance.
 * @props agentConfig - The full configuration object for this agent.
 */
const props = defineProps({
  agentId: { type: String as PropType<AgentId>, required: true },
  agentConfig: { type: Object as PropType<IAgentDefinition>, required: true },
});

/**
 * @emits agent-event - Emits agent-specific events for potential global handling or logging.
 */
const emit = defineEmits<{
  (e: 'agent-event', event: { type: string; agentId: string; label?: string; data?: any }): void;
}>();

const toast = inject<ToastService>('toast');
const importFileInputRef = ref<HTMLInputElement | null>(null);

// Pass agentConfig as a Ref to the composable, ensuring reactivity if props.agentConfig changes.
const agentConfigAsRef = toRef(props, 'agentConfig');

const {
  // State
  isLoadingLLM, isProcessingLocal, activeEntryId, currentDraft, isComposing, currentViewMode,
  showEntryListPanel, showMetadataModal, showAnalysisModal, activeFilters,
  availableTags, availableMoods, llmSuggestedMetadata, chatMessages,
  onThisDayEntry, reflectionPrompt,

  // Computeds
  agentDisplayName, filteredAndSortedEntries, activeEntry, canSaveChanges, statistics,
  // displayContentMarkdown is used by useDiaryAgent to update chatStore, not directly in this template

  // Actions
  initialize, cleanup, createNewEntry, selectEntryToView,
  editSelectedEntry, saveCurrentEntry, deleteEntry, toggleFavorite,
  clearAllEntries, processUserInputForEntry,
  confirmAndFinalizeEntryWithLLM, requestReflectionPrompt,
  analyzeEntrySentiment, extractEntryKeywords, findRelatedEntries, setViewMode,
  toggleEntryListPanel, updateFilters, handleFileUploadForImport,
  exportDiaryData, sendChatMessage, requestMetadataSuggestion,
} = useDiaryAgent(agentConfigAsRef, toast);

// --- Event Handlers ---

/** Handles starting a new diary entry. */
const handleStartNewEntry = (): void => {
  createNewEntry();
};

/** Handles selecting an entry from the list panel. */
const handleSelectEntry = (entryId: string): void => {
  selectEntryToView(entryId);
};

/** Handles deleting an entry, typically via the list panel. */
const handleDeleteEntry = async (entryId: string): Promise<void> => {
  await deleteEntry(entryId);
  emit('agent-event', { type: 'diary_entry_deleted', agentId: props.agentId, data: { entryId } });
};

/** Handles clearing all diary entries. */
const handleClearAllEntries = async (): Promise<void> => {
  await clearAllEntries();
  emit('agent-event', { type: 'diary_all_entries_cleared', agentId: props.agentId });
};

/** Handles updates to filter criteria from the list panel. */
const handleUpdateFilters = (filters: Partial<DiaryFilterOptions>): void => {
  updateFilters(filters);
};

/** Handles requests to export diary data. */
const handleExportData = (format: 'json' | 'markdown_bundle'): void => {
  exportDiaryData(format);
  emit('agent-event', { type: 'diary_data_exported', agentId: props.agentId, data: { format } });
};

/** Triggers the hidden file input for importing data. */
const triggerImportFileInput = (): void => {
  importFileInputRef.value?.click();
};

/** Handles the file selection for import. */
const handleFileImportChange = async (event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const result = await handleFileUploadForImport(input.files[0]);
    if (result && !result.error && result.importedCount > 0) {
        emit('agent-event', { type: 'diary_entries_imported', agentId: props.agentId, data: { count: result.importedCount } });
    }
    // Toast notifications are handled within the composable for import results
    if(input) input.value = ''; // Reset file input to allow re-importing the same file
  }
};

/** Handles sending a message from the chat interface. */
const handleSendChatMessage = async (text: string): Promise<void> => {
  if (isComposing.value && currentDraft.value && (currentViewMode.value === 'compose_new_entry' || currentViewMode.value === 'edit_entry') ) {
    // If composing/editing an entry, input is appended to the entry and LLM might continue reflection
    await processUserInputForEntry(text);
  } else {
    // Otherwise, it's a general chat with Echo
    await sendChatMessage(text);
  }
};

/** Handles saving the current draft or edited entry. */
const handleSaveEntry = async (): Promise<void> => {
  const saved = await saveCurrentEntry();
  if (saved) {
    emit('agent-event', { type: 'diary_entry_saved', agentId: props.agentId, data: { entryId: saved.id, title: saved.title } });
  }
};

/** Handles updates to the current draft from the workspace. */
const handleUpdateDraft = (draftUpdate: Partial<RichDiaryEntry>): void => {
  if (currentDraft.value) {
    const currentId = currentDraft.value.id; // Preserve ID if it exists
    const currentCreatedAt = currentDraft.value.createdAt; // Preserve original creation if exists
    currentDraft.value = {
        ...(typeof currentDraft.value === 'object' && currentDraft.value !== null ? currentDraft.value : {}),
        ...(typeof draftUpdate === 'object' && draftUpdate !== null ? draftUpdate : {}),
        id: (typeof draftUpdate === 'object' && draftUpdate !== null && draftUpdate.id) ? draftUpdate.id : currentId, // Prioritize update's ID, then existing draft's
        createdAt: (typeof draftUpdate === 'object' && draftUpdate !== null && draftUpdate.createdAt) ? draftUpdate.createdAt : currentCreatedAt, // Prioritize update's, then existing draft's
        updatedAt: new Date().toISOString() // Always update timestamp
    };
  } else if (isComposing.value && !currentDraft.value && draftUpdate.contentMarkdown) {
    // If starting new entry directly in workspace without prior draft init
    createNewEntry(draftUpdate.contentMarkdown); // This will create currentDraft
    if (currentDraft.value) { // Then apply other updates
        currentDraft.value = {
          ...(typeof currentDraft.value === 'object' && currentDraft.value !== null ? currentDraft.value : {}),
          ...(typeof draftUpdate === 'object' && draftUpdate !== null ? draftUpdate : {}),
          updatedAt: new Date().toISOString()
        };
    }
  }
};

/** Handles deleting the currently active entry (from workspace) or discarding a new draft. */
const handleDeleteCurrentActiveEntry = (): void => {
  if(activeEntryId.value) {
    deleteEntry(activeEntryId.value); // This will emit event from within deleteEntry
  } else if (currentDraft.value && isComposing.value){
    if(confirm("Discard this new draft? It has not been saved.")) {
        currentDraft.value = null;
        isComposing.value = false;
        setViewMode('dashboard'); // Go back to dashboard
        toast?.add({type: 'info', title: 'Draft Discarded', message: 'New entry draft was discarded.'});
    }
  }
};

/** Handles request to edit the currently viewed active entry. */
const handleEditActiveEntry = (): void => {
  if(activeEntryId.value){
    editSelectedEntry();
  }
};

/** Handles toggling the favorite status of the currently active entry. */
const handleToggleFavoriteActiveEntry = (): void => {
  if(activeEntryId.value){
    toggleFavorite(activeEntryId.value);
  }
};

/** Handles requests for analysis (sentiment, keywords) from the workspace. */
const handleRequestAnalysis = async (type: 'sentiment' | 'keywords' | 'themes' | 'actionable' | 'questions'): Promise<void> => {
    if(activeEntryId.value){
        if (type === 'sentiment' || type === 'keywords' || type === 'themes') {
            // analyzeEntrySentiment now handles keywords and themes too via 'analyze_entry_content'
            await analyzeEntrySentiment(activeEntryId.value);
        } else {
            toast?.add({type: 'info', title: 'Analysis Feature', message: `Analysis for '${type}' is a great idea for future versions!`});
        }
    } else {
        toast?.add({type: 'warning', title: 'No Active Entry', message: 'Please select an entry to analyze.'});
    }
};

/** Handles request to suggest metadata (from workspace or after chat). */
const handleRequestMetadataSuggestion = (): void => {
    const content = currentDraft.value?.contentMarkdown || activeEntry.value?.contentMarkdown;
    if(content) {
        requestMetadataSuggestion(content);
    } else {
        toast?.add({type: 'warning', title: 'No Content', message: 'Please write some content before suggesting metadata.'});
    }
};

/** Handles confirmation of metadata from the DiaryMetadataModal. */
const handleConfirmMetadata = (confirmed: { title: string; tags: string[]; mood?: string; summary: string }): void => {
  confirmAndFinalizeEntryWithLLM(confirmed);
};

/** Handles cancellation from the DiaryMetadataModal. */
const handleCancelMetadata = (): void => {
  llmSuggestedMetadata.value = null; // Clear the suggestion
  showMetadataModal.value = false;
  toast?.add({type: 'info', title: 'Metadata Cancelled', message: 'You can continue editing your entry or save as is.'});
};

/** Starts a new entry using the current reflection prompt. */
const startNewEntryWithPrompt = async (): Promise<void> => {
  if(reflectionPrompt.value){
    await createNewEntry(`${reflectionPrompt.value}\n\n`); // Add some newlines for writing space
    reflectionPrompt.value = null; // Clear prompt after use or allow re-use based on desired UX
  }
};

// --- Lifecycle Hooks ---
onMounted(async () => {
  await initialize(props.agentConfig);
  emit('agent-event', { type: 'diary_agent_view_mounted', agentId: props.agentId, label: agentDisplayName.value });
});

onUnmounted(() => {
  cleanup();
});

// --- Expose (if needed by parent through template refs) ---
defineExpose({
  // Example: allow parent to trigger a new entry if needed, though usually handled internally
  startNewDiaryEntry: handleStartNewEntry,
  // Example: if an external event should feed text into the diary
  processExternalText: processUserInputForEntry,
});

</script>

<style lang="scss" scoped>
@use 'sass:math';
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;

// Define Diary-specific CSS variables, falling back to global theme variables
.diary-agent-view-v2 {
  --diary-accent-h: var(--color-accent-secondary-h, #{var.$default-color-accent-secondary-h});
  --diary-accent-s: var(--color-accent-secondary-s, #{var.$default-color-accent-secondary-s});
  --diary-accent-l: var(--color-accent-secondary-l, #{var.$default-color-accent-secondary-l});
  --diary-bg-h: var(--color-bg-primary-h, #{var.$default-color-bg-primary-h});
  --diary-bg-s: var(--color-bg-primary-s, #{var.$default-color-bg-primary-s});
  --diary-bg-l: calc(var(--color-bg-primary-l, #{var.$default-color-bg-primary-l}) + 1%); // Slightly distinct background

  color: var(--color-text-primary);
  @apply flex flex-col h-full w-full overflow-hidden;
  background-color: hsl(var(--diary-bg-h), var(--diary-bg-s), var(--diary-bg-l));
}

.diary-header-v2 {
  @apply flex items-center justify-between p-2.5 px-4 border-b shadow-sm shrink-0;
  background-color: hsla(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) + 4%), 0.9); // Lighter header
  border-bottom-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.2);
  backdrop-filter: blur(4px); // Subtle blur for header
  z-index: 20; // Ensure header is above content during scroll/transitions

  .header-title-group-v2 {
    @apply flex items-center gap-2.5 text-lg font-semibold tracking-tight;
    color: hsl(var(--diary-accent-h), var(--diary-accent-s), calc(var(--diary-accent-l) + 10%));
    .header-icon-v2 { @apply w-5 h-5 shrink-0 opacity-90; } // Slightly smaller icon
  }
  .view-mode-chip-v2 {
    @apply text-xxs px-2 py-0.5 rounded-full ml-2 font-medium capitalize shadow-sm border;
    background-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.1);
    border-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.2);
    color: hsl(var(--diary-accent-h), var(--diary-accent-s), calc(var(--diary-accent-l) + 20%));
  }
  .header-actions-v2 { @apply flex items-center gap-1.5; }
}

.diary-main-layout-v2 {
  @apply flex-grow flex flex-row overflow-hidden relative; // Ensures children can use flex-grow

  // Styling for when the list panel is shown next to the workspace
  & > :deep(.diary-entry-list-panel-v2) { // Targeting child specifically, :deep needed for scoped styles
    // Assuming DiaryEntryListPanel.vue has its own width and styles
    border-right: 1px solid hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.12);
  }
}

.diary-workspace-container-v2 {
  @apply flex-grow flex flex-col overflow-hidden; // Allows workspace or chat to fill height
  background-color: hsl(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) - 2%)); // Slightly darker workspace
}

// Ensure child components fill the container
.diary-chat-interface-v2, .diary-workspace-v2, .diary-dashboard-v2 {
  @apply h-full w-full flex flex-col; // Added flex flex-col for internal layout
}
.diary-dashboard-v2 {
  @apply p-4 sm:p-5 md:p-6 overflow-y-auto; // Adjusted padding
  @include mixins.custom-scrollbar-for-themed-panel('--diary');

  .dashboard-title-v2 {
    @apply text-xl font-semibold mb-4 pb-2 border-b;
    color: hsl(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l));
    border-bottom-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.2);
  }
  .dashboard-stats-grid-v2 {
    @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6; // Added lg:grid-cols-3
    .stat-card-v2 {
      @apply p-3 rounded-lg text-sm text-center sm:text-left;
      background-color: hsla(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) + 5%), 0.8);
      border: 1px solid hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.15);
      color: var(--color-text-secondary);
      span { @apply font-semibold; color: var(--color-text-primary); }
    }
  }
  .on-this-day-card-v2, .reflection-prompt-card-v2 {
    @apply p-3.5 mb-4 rounded-lg border transition-all duration-150;
    background-color: hsla(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) + 3%), 0.9);
    border-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.2);
    &:hover {
      border-color: hsl(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l));
      transform: translateY(-2px);
      box-shadow: 0 4px 12px hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.1);
    }
    &.on-this-day-card-v2 { @apply cursor-pointer; }
    h3 { @apply text-xs font-semibold uppercase tracking-wider mb-1; color: hsl(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l)); }
    h4 { @apply font-medium text-sm mb-1; color: var(--color-text-primary); }
    p { @apply text-xs mb-1.5; color: var(--color-text-muted); } // Removed line-clamp for full text
    span { @apply text-[0.7rem] opacity-60; } // For date on "On this day"
  }
  .reflection-prompt-card-v2 p { font-style: italic; margin-bottom: 0.75rem; }
}

// Transitions
.slide-fade-left-diary-enter-active,
.slide-fade-left-diary-leave-active {
  transition: opacity 0.3s var(--ease-out-quad), transform 0.35s var(--ease-out-cubic);
}
.slide-fade-left-diary-enter-from,
.slide-fade-left-diary-leave-to {
  opacity: 0;
  transform: translateX(-100%); // Ensures it slides out completely
}
.slide-fade-left-diary-leave-to {
  position: absolute; // Avoid layout shifts during leave
}


// Shared button styles (assuming these are defined globally or in `btn-futuristic-*` classes)
// If not, minimal definitions:
.btn-futuristic-toggle, .btn-futuristic-primary, .btn-futuristic-secondary, .btn-futuristic-outline {
  @apply px-3 py-1.5 rounded-md font-medium transition-all duration-150 ease-out flex items-center justify-center shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed;
  // Add specific background/text colors based on your theme for each type
}
.btn-sm { @apply text-xs px-2 py-1; } // Adjusted padding for sm
.btn-icon-sm { @apply w-4 h-4 mr-1.5; } // Consistent icon sizing
</style>