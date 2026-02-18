<!--
  @file CodingSessionPanel.vue
  @description Session management sidebar for the CodePilot agent.
  Displays, filters, and manages coding sessions with storage-agnostic design
  for future PostgreSQL migration capabilities.
  @version 1.0.0 - Initial implementation with comprehensive session management
-->
<template>
  <div class="session-list-panel-coding">
    <!-- Panel Header -->
    <div class="panel-header">
      <h3 class="panel-title">Coding Sessions</h3>
      <div class="panel-controls">
        <input 
          type="search" 
          :value="searchTerm"
          @input="$emit('update:search-term', ($event.target as HTMLInputElement).value)"
          placeholder="Search sessions..." 
          class="form-input-futuristic small search-sessions-input"
          :disabled="isLlmBusy"
        />
        <button
          v-if="sessions.length > 0"
          @click="showFilterOptions = !showFilterOptions"
          class="btn-icon-futuristic smallest"
          title="Filter Options"
          :disabled="isLlmBusy"
        >
          <AdjustmentsHorizontalIcon class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Filter Options (Expandable) -->
    <Transition name="slide-down">
      <div v-if="showFilterOptions" class="filter-options-panel">
        <div class="filter-row">
          <label class="filter-label">Language:</label>
          <select 
            v-model="selectedLanguageFilter"
            class="form-select-futuristic small"
            @change="applyFilters"
            :disabled="isLlmBusy"
          >
            <option value="">All Languages</option>
            <option 
              v-for="lang in availableLanguages" 
              :key="lang" 
              :value="lang"
            >
              {{ lang }}
            </option>
          </select>
        </div>
        
        <div class="filter-row">
          <label class="filter-label">Sort by:</label>
          <select 
            v-model="selectedSortOption"
            class="form-select-futuristic small"
            @change="applyFilters"
            :disabled="isLlmBusy"
          >
            <option value="updatedAt">Last Modified</option>
            <option value="createdAt">Date Created</option>
            <option value="title">Title</option>
            <option value="language">Language</option>
          </select>
        </div>
        
        <div class="filter-row">
          <label class="filter-checkbox-wrapper">
            <input 
              type="checkbox" 
              v-model="showFavoritesOnly"
              @change="applyFilters"
              :disabled="isLlmBusy"
            />
            <span class="filter-checkbox-label">Favorites Only</span>
          </label>
        </div>
      </div>
    </Transition>

    <!-- Session Statistics -->
    <div v-if="sessions.length > 0" class="session-stats">
      <span class="stat-item">
        {{ filteredSessionsComputed.length }} of {{ sessions.length }} sessions
      </span>
      <span v-if="sessionsByLanguage.size > 1" class="stat-item">
        {{ sessionsByLanguage.size }} languages
      </span>
    </div>

    <!-- Action Buttons -->
    <div class="panel-actions">
      <button 
        v-if="sessions.length > 0"
        @click="confirmClearAllSessions" 
        class="btn-futuristic-danger btn-xs w-full" 
        title="Delete All Sessions"
        :disabled="isLlmBusy || isProcessing"
      >
        <TrashIcon class="btn-icon-xs" />
        Clear All Sessions
      </button>
      
      <button
        v-if="sessions.length > 10"
        @click="exportSessions"
        class="btn-futuristic-outline btn-xs w-full mt-1"
        title="Export Sessions"
        :disabled="isLlmBusy || isProcessing"
      >
        <DocumentArrowDownIcon class="btn-icon-xs" />
        Export Sessions
      </button>
    </div>

    <!-- Sessions List -->
    <div class="session-list-scroll-area">
      <!-- Loading State -->
      <div 
        v-if="isProcessing && filteredSessionsComputed.length === 0" 
        class="list-loading-state"
      >
        <div class="coding-agent-spinner small"></div>
        <span class="ml-2 text-xs">Loading sessions...</span>
      </div>

      <!-- Empty State -->
      <div 
        v-else-if="filteredSessionsComputed.length === 0 && !searchTerm" 
        class="list-empty-state"
      >
        <CodeBracketSquareIcon class="empty-icon" />
        <p class="empty-title">No saved sessions yet</p>
        <p class="empty-subtitle">
          Create your first coding session by asking a question!
        </p>
      </div>

      <!-- No Search Results -->
      <div 
        v-else-if="filteredSessionsComputed.length === 0 && searchTerm" 
        class="list-empty-state"
      >
        <MagnifyingGlassIcon class="empty-icon" />
        <p class="empty-title">No sessions match "{{ searchTerm }}"</p>
        <p class="empty-subtitle">
          Try adjusting your search or filters
        </p>
      </div>

      <!-- Session Items -->
      <TransitionGroup name="session-list" tag="div">
        <div
          v-for="session in filteredSessionsComputed"
          :key="session.id"
          @click="handleSessionClick(session)"
          class="session-item"
          :class="{ 
            'active': activeSessionId === session.id,
            'favorite': session.isFavorite 
          }"
        >
          <!-- Session Icon -->
          <div class="item-icon-wrapper">
            <CodeBracketSquareIcon 
              class="item-icon" 
              :class="`lang-icon-${session.language.toLowerCase()}`"
            />
            <StarIcon 
              v-if="session.isFavorite" 
              class="favorite-badge"
            />
          </div>

          <!-- Session Details -->
          <div class="item-details">
            <!-- Title (Editable) -->
            <div class="item-title-section">
              <input 
                v-if="isEditingTitle && activeSessionId === session.id" 
                type="text" 
                :id="`session-title-editor-${session.id}`"
                :value="titleEditBuffer" 
                @input="updateTitleBuffer"
                @keyup.enter="$emit('edit-title-confirm')" 
                @keyup.esc="$emit('edit-title-cancel')"
                @blur="$emit('edit-title-confirm')"
                @click.stop 
                class="form-input-futuristic small inline-title-editor"
                :disabled="isLlmBusy"
              />
              <span 
                v-else 
                class="item-title truncate" 
                :title="session.title" 
                @dblclick="handleTitleEdit(session.id)"
              >
                {{ session.title }}
              </span>
            </div>

            <!-- Metadata -->
            <div class="item-meta">
              <span class="item-lang-tag">{{ session.language }}</span>
              <span class="item-date">
                {{ formatSessionDate(session.updatedAt) }}
              </span>
              <span 
                v-if="session.estimatedTimeMinutes" 
                class="item-time-estimate"
                :title="`Estimated time: ${session.estimatedTimeMinutes} minutes`"
              >
                {{ session.estimatedTimeMinutes }}min
              </span>
            </div>

            <!-- Tags -->
            <div 
              v-if="session.tags && session.tags.length" 
              class="item-tags"
            >
              <span 
                v-for="tag in session.tags.slice(0, 3)" 
                :key="tag" 
                class="tag-chip"
                @click.stop="filterByTag(tag)"
              >
                {{ tag }}
              </span>
              <span 
                v-if="session.tags.length > 3" 
                class="tag-chip more-tags"
                :title="session.tags.slice(3).join(', ')"
              >
                +{{ session.tags.length - 3 }}
              </span>
            </div>

            <!-- Query Preview -->
            <div 
              v-if="session.userInputQuery" 
              class="item-query-preview"
              :title="session.userInputQuery"
            >
              {{ session.userInputQuery.substring(0, 80) }}
              <span v-if="session.userInputQuery.length > 80">...</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="item-actions">
            <button 
              @click.stop="toggleFavorite(session)"
              class="btn-icon-futuristic smallest"
              :title="session.isFavorite ? 'Remove from favorites' : 'Add to favorites'"
              :disabled="isLlmBusy"
            >
              <StarIcon 
                v-if="session.isFavorite"
                class="w-3.5 h-3.5 text-yellow-400"
              />
              <StarIcon 
                v-else
                class="w-3.5 h-3.5 opacity-50"
              />
            </button>

            <button 
              @click.stop="handleTitleEdit(session.id)" 
              class="btn-icon-futuristic smallest" 
              title="Edit Title"
              :disabled="isLlmBusy"
            > 
              <PencilSquareIcon class="w-3.5 h-3.5" /> 
            </button>

            <button 
              @click.stop="duplicateSession(session)" 
              class="btn-icon-futuristic smallest" 
              title="Duplicate Session"
              :disabled="isLlmBusy"
            > 
              <DocumentDuplicateIcon class="w-3.5 h-3.5" /> 
            </button>

            <button 
              @click.stop="handleSessionDelete(session.id)" 
              class="btn-icon-futuristic smallest danger-hover" 
              title="Delete Session"
              :disabled="isLlmBusy"
            > 
              <TrashIcon class="w-3.5 h-3.5" /> 
            </button>
          </div>

          <!-- Session Status Indicator -->
          <div 
            v-if="getSessionStatus(session)" 
            class="session-status-indicator"
            :class="getSessionStatus(session)"
            :title="getSessionStatusTitle(session)"
          ></div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Import/Export Modal -->
    <Transition name="modal-fade">
      <div 
        v-if="showExportModal" 
        class="modal-backdrop" 
        @click.self="showExportModal = false"
      >
        <div class="modal-content export-modal">
          <div class="modal-header">
            <h3 class="modal-title">Export Sessions</h3>
            <button 
              @click="showExportModal = false" 
              class="btn-modal-close"
            >
              &times;
            </button>
          </div>
          
          <div class="modal-body">
            <p class="mb-3">Choose export format:</p>
            <div class="export-options">
              <button 
                @click="exportAs('json')"
                class="btn-futuristic-outline btn-sm export-option"
              >
                <DocumentTextIcon class="w-4 h-4 mr-2" />
                JSON Format
              </button>
              <button 
                @click="exportAs('markdown')"
                class="btn-futuristic-outline btn-sm export-option"
              >
                <DocumentTextIcon class="w-4 h-4 mr-2" />
                Markdown Report
              </button>
              <button 
                @click="exportAs('csv')"
                class="btn-futuristic-outline btn-sm export-option"
              >
                <TableCellsIcon class="w-4 h-4 mr-2" />
                CSV Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
/**
 * @file CodingSessionPanel.vue Script
 * @description Vue 3 Composition API setup for the coding session management panel.
 * Provides comprehensive session management with filtering, searching, and export capabilities.
 */
import { ref, computed, nextTick, watch, type PropType } from 'vue';
import type { CodingSession, SessionFilterOptions } from './CodingAgentTypes';

// Icons
import {
  CodeBracketSquareIcon,
  TrashIcon,
  PencilSquareIcon,
  DocumentDuplicateIcon,
  StarIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  TableCellsIcon,
} from '@heroicons/vue/24/solid';

// ============================
// COMPONENT PROPS & EMITS
// ============================

/**
 * @interface Props
 * @description Component props for session panel
 */
interface Props {
  /** Array of coding sessions to display */
  sessions: CodingSession[];
  /** ID of currently active session */
  activeSessionId: string | null;
  /** Current search term */
  searchTerm: string;
  /** Whether title editing is active */
  isEditingTitle: boolean;
  /** Title edit buffer content */
  titleEditBuffer: string;
  /** Whether local processing is occurring */
  isProcessing: boolean;
  /** Whether LLM is busy (disables interactions) */
  isLlmBusy: boolean;
}

const props = defineProps<Props>();

/**
 * @interface Emits
 * @description Component events
 */
interface Emits {
  (e: 'update:search-term', value: string): void;
  (e: 'session-selected', sessionId: string): void;
  (e: 'session-deleted', sessionId: string): void;
  (e: 'edit-title-start', sessionId: string): void;
  (e: 'edit-title-confirm'): void;
  (e: 'edit-title-cancel'): void;
  (e: 'clear-all-sessions'): void;
  (e: 'session-updated', session: CodingSession): void;
}

const emit = defineEmits<Emits>();

// ============================
// REACTIVE STATE
// ============================

const showFilterOptions = ref(false);
const selectedLanguageFilter = ref('');
const selectedSortOption = ref<'updatedAt' | 'createdAt' | 'title' | 'language'>('updatedAt');
const showFavoritesOnly = ref(false);
const showExportModal = ref(false);

// ============================
// COMPUTED PROPERTIES
// ============================

/**
 * @computed availableLanguages
 * @description List of unique languages from all sessions
 */
const availableLanguages = computed(() => {
  const languages = new Set(props.sessions.map(s => s.language));
  return Array.from(languages).sort();
});

/**
 * @computed sessionsByLanguage
 * @description Map of sessions grouped by language
 */
const sessionsByLanguage = computed(() => {
  const groups = new Map<string, CodingSession[]>();
  props.sessions.forEach(session => {
    if (!groups.has(session.language)) {
      groups.set(session.language, []);
    }
    groups.get(session.language)!.push(session);
  });
  return groups;
});

/**
 * @computed filteredSessionsComputed
 * @description Filtered and sorted sessions based on current filters
 */
const filteredSessionsComputed = computed(() => {
  let filtered = [...props.sessions];

  // Apply search filter
  if (props.searchTerm.trim()) {
    const searchTerm = props.searchTerm.toLowerCase();
    filtered = filtered.filter(session =>
      session.title.toLowerCase().includes(searchTerm) ||
      session.userInputQuery.toLowerCase().includes(searchTerm) ||
      session.language.toLowerCase().includes(searchTerm) ||
      (session.tags && session.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
    );
  }

  // Apply language filter
  if (selectedLanguageFilter.value) {
    filtered = filtered.filter(session => session.language === selectedLanguageFilter.value);
  }

  // Apply favorites filter
  if (showFavoritesOnly.value) {
    filtered = filtered.filter(session => session.isFavorite);
  }

  // Apply sorting
  filtered.sort((a, b) => {
    switch (selectedSortOption.value) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'language':
        return a.language.localeCompare(b.language);
      case 'createdAt':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'updatedAt':
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });

  return filtered;
});

// ============================
// METHODS
// ============================

/**
 * @method handleSessionClick
 * @description Handle clicking on a session item
 */
function handleSessionClick(session: CodingSession): void {
  if (props.isLlmBusy || props.isEditingTitle) return;
  emit('session-selected', session.id);
}

/**
 * @method handleSessionDelete
 * @description Handle session deletion request
 */
function handleSessionDelete(sessionId: string): void {
  if (props.isLlmBusy) return;
  emit('session-deleted', sessionId);
}

/**
 * @method handleTitleEdit
 * @description Start editing a session title
 */
function handleTitleEdit(sessionId: string): void {
  if (props.isLlmBusy) return;
  emit('edit-title-start', sessionId);
}

/**
 * @method updateTitleBuffer
 * @description Update title edit buffer
 */
function updateTitleBuffer(event: Event): void {
  // This would typically be handled by v-model, but we're using events
  // The parent component manages the titleEditBuffer
}

/**
 * @method confirmClearAllSessions
 * @description Confirm and clear all sessions
 */
function confirmClearAllSessions(): void {
  if (props.isLlmBusy) return;
  emit('clear-all-sessions');
}

/**
 * @method toggleFavorite
 * @description Toggle favorite status of a session
 */
function toggleFavorite(session: CodingSession): void {
  if (props.isLlmBusy) return;
  
  const updatedSession: CodingSession = {
    ...session,
    isFavorite: !session.isFavorite,
    updatedAt: new Date().toISOString()
  };
  
  emit('session-updated', updatedSession);
}

/**
 * @method duplicateSession
 * @description Create a duplicate of a session
 */
function duplicateSession(session: CodingSession): void {
  if (props.isLlmBusy) return;
  
  const duplicatedSession: CodingSession = {
    ...session,
    id: `${session.id}_copy_${Date.now()}`,
    title: `${session.title} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isFavorite: false
  };
  
  emit('session-updated', duplicatedSession);
}

/**
 * @method filterByTag
 * @description Filter sessions by clicking on a tag
 */
function filterByTag(tag: string): void {
  if (props.isLlmBusy) return;
  emit('update:search-term', tag);
}

/**
 * @method applyFilters
 * @description Apply current filter settings
 */
function applyFilters(): void {
  // Filters are reactive, so this is mainly for explicit refresh
  console.log('[CodingSessionPanel] Filters applied');
}

/**
 * @method exportSessions
 * @description Show export modal
 */
function exportSessions(): void {
  if (props.isLlmBusy) return;
  showExportModal.value = true;
}

/**
 * @method exportAs
 * @description Export sessions in specified format
 */
function exportAs(format: 'json' | 'markdown' | 'csv'): void {
  const sessionsToExport = filteredSessionsComputed.value;
  const timestamp = new Date().toISOString().split('T')[0];
  
  let content: string;
  let filename: string;
  let mimeType: string;

  switch (format) {
    case 'json':
      content = JSON.stringify(sessionsToExport, null, 2);
      filename = `coding-sessions-${timestamp}.json`;
      mimeType = 'application/json';
      break;
      
    case 'markdown':
      content = generateMarkdownReport(sessionsToExport);
      filename = `coding-sessions-report-${timestamp}.md`;
      mimeType = 'text/markdown';
      break;
      
    case 'csv':
      content = generateCSVData(sessionsToExport);
      filename = `coding-sessions-${timestamp}.csv`;
      mimeType = 'text/csv';
      break;
  }

  // Create and download file
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showExportModal.value = false;
}

/**
 * @method generateMarkdownReport
 * @description Generate markdown report of sessions
 */
function generateMarkdownReport(sessions: CodingSession[]): string {
  const report = [
    '# Coding Sessions Report',
    `Generated on: ${new Date().toLocaleDateString()}`,
    `Total Sessions: ${sessions.length}`,
    '',
    '## Sessions',
    ''
  ];

  sessions.forEach((session, index) => {
    report.push(`### ${index + 1}. ${session.title}`);
    report.push(`**Language:** ${session.language}`);
    report.push(`**Created:** ${new Date(session.createdAt).toLocaleDateString()}`);
    report.push(`**Updated:** ${new Date(session.updatedAt).toLocaleDateString()}`);
    
    if (session.tags?.length) {
      report.push(`**Tags:** ${session.tags.join(', ')}`);
    }
    
    report.push('');
    report.push('**Query:**');
    report.push('```');
    report.push(session.userInputQuery);
    report.push('```');
    
    if (session.generatedCode) {
      report.push('');
      report.push('**Generated Code:**');
      report.push(`\`\`\`${session.language}`);
      report.push(session.generatedCode);
      report.push('```');
    }
    
    report.push('');
    report.push('**Explanation:**');
    report.push(session.explanationMarkdown);
    report.push('');
    report.push('---');
    report.push('');
  });

  return report.join('\n');
}

/**
 * @method generateCSVData
 * @description Generate CSV data from sessions
 */
function generateCSVData(sessions: CodingSession[]): string {
  const headers = [
    'ID', 'Title', 'Language', 'Created', 'Updated', 
    'Tags', 'Query Length', 'Has Code', 'Is Favorite'
  ];
  
  const rows = sessions.map(session => [
    session.id,
    `"${session.title.replace(/"/g, '""')}"`,
    session.language,
    session.createdAt,
    session.updatedAt,
    `"${(session.tags || []).join(', ')}"`,
    session.userInputQuery.length,
    session.generatedCode ? 'Yes' : 'No',
    session.isFavorite ? 'Yes' : 'No'
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

/**
 * @method formatSessionDate
 * @description Format session date for display
 */
function formatSessionDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    return 'Just now';
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}h ago`;
  } else if (diffInHours < 168) { // 7 days
    return `${Math.floor(diffInHours / 24)}d ago`;
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

/**
 * @method getSessionStatus
 * @description Get session status indicator class
 */
function getSessionStatus(session: CodingSession): string {
  if (session.isFavorite) return 'favorite';
  if (session.generatedCode) return 'has-code';
  return '';
}

/**
 * @method getSessionStatusTitle
 * @description Get session status tooltip text
 */
function getSessionStatusTitle(session: CodingSession): string {
  if (session.isFavorite) return 'Favorite session';
  if (session.generatedCode) return 'Contains generated code';
  return '';
}

// ============================
// WATCHERS
// ============================

/**
 * @watcher showFilterOptions
 * @description Reset filters when panel is closed
 */
watch(showFilterOptions, (newValue) => {
  if (!newValue) {
    // Optionally reset filters when closing
    // selectedLanguageFilter.value = '';
    // showFavoritesOnly.value = false;
  }
});
</script>

<style lang="scss" scoped>
/**
 * @file CodingSessionPanel.vue Styles
 * @description SCSS styles for the coding session management panel.
 * Provides comprehensive styling for session management UI components.
 */
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;

// ============================
// MAIN PANEL LAYOUT
// ============================

.session-list-panel-coding {
  @apply w-full lg:w-[320px] xl:w-[380px] p-3 flex flex-col shrink-0;
  background-color: hsla(var(--coding-bg-h), var(--coding-bg-s), calc(var(--coding-bg-l) + 3%), 0.96);
  border-right: 1px solid hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.2);
  
  @include mixins.custom-scrollbar(
    $thumb-color-var-prefix: '--coding-accent', 
    $thumb-base-alpha: 0.3, 
    $thumb-hover-alpha: 0.5,
    $track-color-var-prefix: '--coding-bg', 
    $track_alpha: 0.1
  );
}

// ============================
// PANEL HEADER
// ============================

.panel-header {
  @apply flex flex-col gap-2 mb-3 pb-2 border-b;
  border-bottom-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.2);
}

.panel-title {
  @apply text-sm font-semibold;
  color: var(--color-text-secondary);
}

.panel-controls {
  @apply flex items-center gap-2;
}

.search-sessions-input {
  @apply text-xs py-1 flex-grow;
  background-color: hsla(var(--coding-bg-h), var(--coding-bg-s), calc(var(--coding-bg-l) + 10%), 0.8);
  border-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.2);
}

// ============================
// FILTER OPTIONS
// ============================

.filter-options-panel {
  @apply p-2 mb-2 rounded-md border space-y-2;
  background-color: hsla(var(--coding-bg-h), var(--coding-bg-s), calc(var(--coding-bg-l) + 5%), 0.9);
  border-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.15);
}

.filter-row {
  @apply flex items-center justify-between gap-2;
}

.filter-label {
  @apply text-xs font-medium;
  color: var(--color-text-secondary);
}

.form-select-futuristic {
  @apply text-xs py-1 px-2 rounded border bg-transparent;
  background-color: hsla(var(--coding-bg-h), var(--coding-bg-s), calc(var(--coding-bg-l) + 8%), 0.8);
  border-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.2);
  color: var(--color-text-primary);
  
  &.small {
    min-width: 100px;
  }
}

.filter-checkbox-wrapper {
  @apply flex items-center gap-1.5 cursor-pointer;
}

.filter-checkbox-label {
  @apply text-xs;
  color: var(--color-text-secondary);
}

// ============================
// SESSION STATISTICS
// ============================

.session-stats {
  @apply flex items-center justify-between text-xs mb-2 px-1;
  color: var(--color-text-muted);
}

.stat-item {
  @apply font-medium;
}

// ============================
// PANEL ACTIONS
// ============================

.panel-actions {
  @apply mt-1 mb-2;
}

.btn-futuristic-danger {
  @apply px-2 py-1 rounded font-medium transition-all duration-200;
  background: linear-gradient(135deg, 
    hsla(var(--color-danger-h), var(--color-danger-s), var(--color-danger-l), 0.8),
    hsla(var(--color-danger-h), var(--color-danger-s), calc(var(--color-danger-l) - 10%), 0.9)
  );
  color: var(--color-danger-text);
  border: 1px solid hsla(var(--color-danger-h), var(--color-danger-s), var(--color-danger-l), 0.3);
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, 
      hsla(var(--color-danger-h), var(--color-danger-s), calc(var(--color-danger-l) + 5%), 0.9),
      hsla(var(--color-danger-h), var(--color-danger-s), calc(var(--color-danger-l) - 5%), 0.95)
    );
  }
  
  &:disabled {
    @apply opacity-50 cursor-not-allowed;
  }
}

.btn-futuristic-outline {
  @apply px-2 py-1 rounded font-medium transition-all duration-200;
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.3);
  
  &:hover:not(:disabled) {
    background: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.1);
    color: hsl(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l));
  }
  
  &:disabled {
    @apply opacity-50 cursor-not-allowed;
  }
}

// ============================
// SESSIONS LIST
// ============================

.session-list-scroll-area {
  @apply flex-grow overflow-y-auto space-y-1.5 pr-0.5;
  
  @include mixins.custom-scrollbar(
    $thumb-color-var-prefix: '--coding-accent', 
    $thumb-base-alpha: 0.3, 
    $thumb-hover-alpha: 0.5,
    $track-color-var-prefix: '--coding-bg', 
    $track_alpha: 0.1
  );
}

.list-loading-state,
.list-empty-state {
  @apply flex flex-col items-center justify-center text-center py-8 px-4;
  color: var(--color-text-muted);
  
  .empty-icon {
    @apply w-12 h-12 mb-3 opacity-30;
  }
  
  .empty-title {
    @apply text-sm font-medium mb-1;
    color: var(--color-text-secondary);
  }
  
  .empty-subtitle {
    @apply text-xs;
  }
}

// ============================
// SESSION ITEMS
// ============================

.session-item {
  @apply relative p-2.5 rounded-md cursor-pointer transition-all duration-150 ease-out border flex flex-col gap-2;
  background-color: hsla(var(--coding-bg-h), var(--coding-bg-s), calc(var(--coding-bg-l) + 6%), 0.6);
  border-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.12);
  
  &:hover:not(.active) {
    background-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.15);
    border-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.4);
    transform: translateX(2px);
  }
  
  &.active {
    background-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.25);
    border-color: hsl(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l));
    box-shadow: 0 2px 8px hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.3);
  }
  
  &.favorite {
    border-left: 3px solid #fbbf24; // yellow-400
  }
}

.item-icon-wrapper {
  @apply relative flex items-center justify-between;
}

.item-icon {
  @apply w-4 h-4 opacity-70 shrink-0;
  color: hsl(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l));
}

.favorite-badge {
  @apply w-3 h-3 text-yellow-400 absolute -top-1 -right-1;
}

.item-details {
  @apply flex-grow min-w-0;
}

.item-title-section {
  @apply mb-1;
}

.item-title {
  @apply text-sm font-medium block cursor-pointer;
  color: var(--color-text-primary);
  
  .session-item.active & {
    color: hsl(var(--coding-accent-h), var(--coding-accent-s), calc(var(--coding-accent-l) + 15%));
  }
}

.inline-title-editor {
  @apply w-full text-sm py-0.5 px-1;
}

.item-meta {
  @apply flex items-center gap-2 text-[0.7rem] mb-1;
  color: var(--color-text-muted);
}

.item-lang-tag {
  @apply px-1.5 py-0.5 rounded-sm font-medium;
  background-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.2);
  color: hsl(var(--coding-accent-h), var(--coding-accent-s), calc(var(--coding-accent-l) + 20%));
}

.item-date,
.item-time-estimate {
  @apply font-mono;
}

.item-tags {
  @apply flex flex-wrap gap-1 mb-1;
}

.tag-chip {
  @apply px-1.5 py-0.5 text-[0.6rem] rounded cursor-pointer transition-colors;
  background-color: hsla(var(--coding-bg-h), var(--coding-bg-s), calc(var(--coding-bg-l) + 10%), 0.7);
  color: var(--color-text-muted);
  
  &:hover {
    background-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.15);
    color: var(--color-text-secondary);
  }
  
  &.more-tags {
    cursor: default;
    font-style: italic;
  }
}

.item-query-preview {
  @apply text-[0.65rem] leading-tight opacity-60 italic;
  color: var(--color-text-muted);
}

.item-actions {
  @apply flex gap-1 justify-end mt-1;
}

.session-status-indicator {
  @apply absolute top-1 right-1 w-2 h-2 rounded-full;
  
  &.favorite {
    background-color: #fbbf24; // yellow-400
  }
  
  &.has-code {
    background-color: hsl(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l));
  }
}

// ============================
// BUTTON STYLES
// ============================

.btn-icon-futuristic {
  @apply p-1 rounded transition-colors duration-150 border border-transparent;
  color: var(--color-text-muted);
  
  &:hover:not(:disabled) {
    background-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.1);
    color: var(--color-text-secondary);
    border-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.2);
  }
  
  &.danger-hover:hover:not(:disabled) {
    background-color: hsla(var(--color-danger-h), var(--color-danger-s), var(--color-danger-l), 0.1);
    color: var(--color-danger-text);
  }
  
  &.smallest {
    @apply p-0.5;
  }
  
  &:disabled {
    @apply opacity-50 cursor-not-allowed;
  }
}

.btn-xs {
  @apply py-1 px-2 text-xs;
}

.btn-icon-xs {
  @apply w-3.5 h-3.5 mr-1;
}

// ============================
// EXPORT MODAL
// ============================

.modal-backdrop {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50;
}

.modal-content {
  @apply bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full;
  background-color: hsl(var(--coding-bg-h), var(--coding-bg-s), calc(var(--coding-bg-l) + 8%));
  border: 1px solid hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.2);
}

.modal-header {
  @apply flex items-center justify-between p-4 border-b;
  border-bottom-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.2);
}

.modal-title {
  @apply text-lg font-semibold;
  color: var(--color-text-primary);
}

.btn-modal-close {
  @apply text-xl font-bold transition-colors;
  color: var(--color-text-muted);
  
  &:hover {
    color: var(--color-text-primary);
  }
}

.modal-body {
  @apply p-4;
}

.export-options {
  @apply space-y-2;
}

.export-option {
  @apply w-full justify-start;
}

// ============================
// TRANSITIONS
// ============================

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
}

.session-list-enter-active,
.session-list-leave-active {
  transition: all 0.3s ease;
}

.session-list-enter-from,
.session-list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

// ============================
// RESPONSIVE DESIGN
// ============================

@media (max-width: 768px) {
  .session-list-panel-coding {
    @apply w-full;
  }
  
  .panel-controls {
    @apply flex-col gap-1;
  }
  
  .search-sessions-input {
    @apply w-full;
  }
  
  .session-item {
    @apply p-2;
  }
  
  .item-actions {
    @apply justify-center mt-2;
  }
}
</style>