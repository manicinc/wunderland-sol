<template>
  <div class="session-list-panel-meeting-v2">
    <div class="panel-header-v2">
      <h3 class="panel-title-v2">Meeting Summaries</h3>
      <div class="panel-actions-v2">
        <button @click="showFilters = !showFilters" class="btn-icon-futuristic smallest" title="Toggle Filters" :aria-expanded="showFilters">
          <AdjustmentsHorizontalIcon class="w-4 h-4" />
        </button>
        <button @click="$emit('import-data-trigger')" class="btn-icon-futuristic smallest" title="Import Summaries" aria-label="Import meeting summaries">
          <ArrowUpTrayIcon class="w-4 h-4" />
        </button>
        <button @click="$emit('export-data', 'json_all')" class="btn-icon-futuristic smallest" title="Export All Summaries (JSON)" aria-label="Export all summaries as JSON">
          <ArrowDownTrayIcon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <Transition name="filter-slide-v2">
      <div v-if="showFilters" class="filter-area-v2">
        <input
          type="text"
          :value="filters.searchTerm"
          @input="updateSearchTerm(($event.target as HTMLInputElement).value)"
          placeholder="Search summaries..."
          class="form-input-futuristic small w-full mb-2"
          aria-label="Search meeting summaries by keyword"
        />
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label class="form-label-v2" for="filter-tags">Tags (select any):</label>
            <select
              id="filter-tags"
              multiple
              :value="filters.tags || []"
              @change="updateTagFilter($event.target as HTMLSelectElement)"
              class="form-select-futuristic small w-full h-20"
              aria-label="Filter by tags"
            >
              <option v-for="tag in availableTags" :key="tag" :value="tag">{{ tag }}</option>
            </select>
          </div>
          <div>
            <label class="form-label-v2" for="filter-assignee">Action Item Assignee:</label>
            <select
              id="filter-assignee"
              :value="filters.actionItemAssignedTo || ''"
              @change="updateAssigneeFilter(($event.target as HTMLSelectElement).value)"
              class="form-select-futuristic small w-full"
              aria-label="Filter by action item assignee"
            >
              <option value="">Any Assignee</option>
              <option v-for="assignee in availableAssignees" :key="assignee" :value="assignee">{{ assignee }}</option>
            </select>
          </div>
          <div>
            <label class="form-label-v2" for="filter-sortby">Sort by:</label>
            <select
              id="filter-sortby"
              :value="filters.sortBy || 'updatedAt'"
              @change="updateSortBy(($event.target as HTMLSelectElement).value as MeetingFilterOptions['sortBy'])"
              class="form-select-futuristic small w-full"
              aria-label="Sort summaries by"
            >
              <option value="updatedAt">Last Updated</option>
              <option value="meetingDate">Meeting Date</option>
              <option value="createdAt">Date Created</option>
              <option value="title">Title</option>
              <option value="actionItemCount">Open Action Items</option>
            </select>
          </div>
          <div>
            <label class="form-label-v2" for="filter-sortorder">Order:</label>
            <select
              id="filter-sortorder"
              :value="filters.sortOrder || 'desc'"
              @change="updateSortOrder(($event.target as HTMLSelectElement).value as 'asc' | 'desc')"
              class="form-select-futuristic small w-full"
              aria-label="Sort order"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 mt-1.5">
            <label class="filter-checkbox-wrapper-v2 items-center">
                <input
                  type="checkbox"
                  :checked="filters.hasOpenActionItems || false"
                  @change="updateOpenActionItemsFilter(($event.target as HTMLInputElement).checked)"
                  class="form-checkbox-futuristic small"
                  id="filter-open-actions"
                />
                <span :for="`filter-open-actions`">Has Open Actions</span> </label>
            <label class="filter-checkbox-wrapper-v2 items-center">
                <input
                  type="checkbox"
                  :checked="filters.isArchived || false"
                  @change="updateArchivedFilter(($event.target as HTMLInputElement).checked)"
                  class="form-checkbox-futuristic small"
                  id="filter-show-archived"
                />
                <span :for="`filter-show-archived`">Show Archived Only</span> </label>
        </div>
        <button @click="clearLocalFilters" class="btn-futuristic-secondary btn-xs w-full mt-2">Clear All Filters</button>
      </div>
    </Transition>

    <div class="entry-list-scroll-area-v2">
      <p v-if="isLoading && sessions.length === 0" class="list-message-v2" aria-live="polite">Loading summaries...</p>
      <p v-else-if="sessions.length === 0 && !isLoading" class="list-message-v2">No meeting summaries found matching your criteria.</p>
      <TransitionGroup v-else name="meeting-session-anim" tag="ul" class="space-y-1.5">
        <li
          v-for="session in sessions"
          :key="session.id"
          @click="$emit('select-session', session.id)"
          @keyup.enter="$emit('select-session', session.id)"
          class="session-list-item-meeting-v2 group"
          :class="{ 'active': session.id === activeSessionId, 'archived': session.isArchived }"
          tabindex="0"
          role="button"
          :aria-label="`Select summary: ${session.title}, dated ${new Date(session.meetingDate).toLocaleDateString()}${session.isArchived ? '. This summary is archived.' : ''}`"
          :aria-current="session.id === activeSessionId ? 'true' : 'false'"
        >
          <div class="item-flair-v2" :style="{ backgroundColor: getSessionColor(session.meetingDate) }" aria-hidden="true"></div>
          <div class="item-content-v2">
            <h4 class="item-title-v2">{{ session.title }}</h4>
            <p class="item-date-v2">
              {{ new Date(session.meetingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}
              <span v-if="session.tags?.length" class="item-tags-preview-v2">
                | {{ session.tags.slice(0,2).join(', ') }}{{ (session.tags?.length || 0) > 2 ? '...' : '' }}
              </span>
            </p>
            <div class="item-indicators-v2">
              <span v-if="session.actionItems?.some(ai => ai.status === 'Open' || ai.status === 'In Progress')" class="item-action-indicator-v2" title="Open Action Items">
                <ExclamationTriangleIcon class="w-3 h-3 text-yellow-500 shrink-0" aria-hidden="true"/>
                <span class="ml-0.5">{{ session.actionItems.filter(ai => ai.status === 'Open' || ai.status === 'In Progress').length }} open</span>
              </span>
              <span v-if="session.isArchived" class="item-archived-indicator-v2" title="Archived Summary">
                <ArchiveBoxArrowDownIcon class="w-3 h-3 shrink-0" aria-hidden="true"/>
                <span class="ml-0.5">Archived</span>
              </span>
            </div>
          </div>
          <div class="item-actions-v2">
            <button @click.stop="$emit('archive-session', session.id, !session.isArchived)" class="btn-icon-futuristic smallest" :title="session.isArchived ? 'Unarchive Summary' : 'Archive Summary'" :aria-label="session.isArchived ? `Unarchive summary ${session.title}` : `Archive summary ${session.title}`">
              <ArchiveBoxIcon class="w-3.5 h-3.5" :class="{'text-[var(--color-accent-interactive)]': session.isArchived}"/>
            </button>
            <button @click.stop="$emit('delete-session', session.id)" class="btn-icon-futuristic smallest danger-hover" title="Delete Summary" :aria-label="`Delete summary ${session.title}`">
              <TrashIcon class="w-3.5 h-3.5"/>
            </button>
          </div>
        </li>
      </TransitionGroup>
    </div>
    <button
        v-if="sessions.length > 0 && !isLoading"
        @click="$emit('clear-all-entries')"
        class="btn-futuristic-danger btn-xs w-full mt-2"
        title="Delete All Meeting Summaries (use with caution)"
        aria-label="Delete all meeting summaries"
        :disabled="isLoading"
      >
      <TrashIcon class="btn-icon-xs" /> Clear All History
    </button>
  </div>
</template>

<script setup lang="ts">
// Script content remains the same as user provided
import { ref, type PropType } from 'vue';
import type { RichMeetingSession, MeetingFilterOptions } from './BusinessMeetingAgentTypes';
import {
  AdjustmentsHorizontalIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  ArchiveBoxIcon,
  ArchiveBoxArrowDownIcon
} from '@heroicons/vue/24/solid';

const props = defineProps({
  sessions: { type: Array as PropType<RichMeetingSession[]>, required: true },
  activeSessionId: { type: String as PropType<string | null>, default: null },
  isLoading: { type: Boolean, default: false },
  filters: { type: Object as PropType<MeetingFilterOptions>, required: true },
  availableTags: { type: Array as PropType<string[]>, default: () => [] },
  availableAssignees: { type: Array as PropType<string[]>, default: () => [] },
});

const emit = defineEmits<{
  (e: 'select-session', sessionId: string): void;
  (e: 'delete-session', sessionId: string): void;
  (e: 'clear-all-entries'): void;
  (e: 'update-filters', filters: Partial<MeetingFilterOptions>): void;
  (e: 'export-data', format: 'json_all' | 'markdown_selected' | 'csv_action_items' | 'ical_action_items'): void;
  (e: 'import-data-trigger'): void;
  (e: 'archive-session', sessionId: string, archive: boolean): void;
}>();

const showFilters = ref(false);

const updateSearchTerm = (term: string): void => emit('update-filters', { searchTerm: term });
const updateTagFilter = (selectElement: HTMLSelectElement): void => {
  emit('update-filters', { tags: Array.from(selectElement.selectedOptions).map(opt => opt.value) });
};
const updateAssigneeFilter = (assignee: string): void => emit('update-filters', { actionItemAssignedTo: assignee || undefined });
const updateSortBy = (sortBy: MeetingFilterOptions['sortBy']): void => emit('update-filters', { sortBy });
const updateSortOrder = (sortOrder: 'asc' | 'desc'): void => emit('update-filters', { sortOrder });
const updateOpenActionItemsFilter = (hasOpen: boolean): void => emit('update-filters', { hasOpenActionItems: hasOpen });
const updateArchivedFilter = (isArchived: boolean): void => emit('update-filters', { isArchived: isArchived });

const clearLocalFilters = (): void => {
  showFilters.value = false;
  emit('update-filters', {
    searchTerm: '',
    tags: [],
    actionItemAssignedTo: undefined,
    hasOpenActionItems: false,
    isArchived: false,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });
};

const getSessionColor = (meetingDate: string): string => {
  try {
    const date = new Date(meetingDate);
    if (isNaN(date.getTime())) return 'hsl(0, 0%, 70%)';
    const hue = (date.getUTCFullYear() * 17 + date.getUTCMonth() * 30 + date.getUTCDate()) % 360;
    return `hsl(${hue}, 55%, 70%)`;
  } catch (e) {
    return 'hsl(0, 0%, 70%)';
  }
};
</script>

<style lang="scss" scoped>
// CORRECTED: Changed @import to @use and aliased
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;

.session-list-panel-meeting-v2 {
  @apply w-full md:w-[320px] lg:w-[380px] p-2.5 flex flex-col shrink-0 overflow-hidden;
  // CSS variables for meeting panel theme (can be overridden by a more specific theme if needed)
  --meeting-accent-h: var(--color-accent-secondary-h, 260); // Default to a violet/purple
  --meeting-accent-s: var(--color-accent-secondary-s, 75%);
  --meeting-accent-l: var(--color-accent-secondary-l, 65%);
  --meeting-bg-h: var(--color-bg-secondary-h, 220);
  --meeting-bg-s: var(--color-bg-secondary-s, 20%);
  --meeting-bg-l: var(--color-bg-secondary-l, 25%);

  background-color: hsla(var(--meeting-bg-h), var(--meeting-bg-s), calc(var(--meeting-bg-l) + 3%), 0.97);
  border-right: 1px solid hsla(var(--meeting-accent-h), var(--meeting-accent-s), var(--meeting-accent-l), 0.1);
}
.panel-header-v2 {
  @apply flex justify-between items-center mb-2 pb-2 border-b shrink-0;
  border-bottom-color: hsla(var(--meeting-accent-h), var(--meeting-accent-s), var(--meeting-accent-l), 0.15);
  .panel-title-v2 {
    @apply text-sm font-semibold;
    color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));
  }
  .panel-actions-v2 { @apply flex items-center gap-1; }
}
.filter-area-v2 {
  @apply p-2 mb-2 rounded-md border text-xs space-y-1.5;
  background-color: hsla(var(--meeting-bg-h), var(--meeting-bg-s), calc(var(--meeting-bg-l) + 1%), 0.9);
  border-color: hsla(var(--meeting-accent-h), var(--meeting-accent-s), var(--meeting-accent-l), 0.12);
  .form-label-v2 {
    @apply block font-medium mb-0.5 text-xxs; // Used .text-xxs
    color: hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l));
  }
  .filter-checkbox-wrapper-v2 {
    @apply flex gap-1.5;
    span {
      @apply cursor-pointer;
      color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));
    }
  }
  .form-select-futuristic.small, .form-input-futuristic.small, .form-checkbox-futuristic.small {
    @apply text-xs;
  }
}
.filter-slide-v2-enter-active, .filter-slide-v2-leave-active { transition: all 0.25s ease-out; max-height: 500px; }
.filter-slide-v2-enter-from, .filter-slide-v2-leave-to { opacity: 0; transform: translateY(-10px); max-height: 0px; overflow: hidden; }

.entry-list-scroll-area-v2 {
  @apply flex-grow overflow-y-auto -mr-1 pr-1;
  @include mixins.custom-scrollbar-for-themed-panel('--meeting');
}
.list-message-v2 {
  @apply text-center text-xs py-6;
  color: hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l));
}

.meeting-session-anim-move,
.meeting-session-anim-enter-active,
.meeting-session-anim-leave-active {
  transition: all 0.3s var(--ease-out-back, #{var.$ease-out-quint}); // Added fallback for custom property
}
.meeting-session-anim-enter-from,
.meeting-session-anim-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
.meeting-session-anim-leave-active {
  position: absolute;
  width: calc(100% - #{var.$spacing-xs}); // Use SASS variable for spacing if needed, or a CSS var
}

.session-list-item-meeting-v2 {
  @apply p-2.5 rounded-lg cursor-pointer transition-all duration-150 ease-out border flex items-start gap-2.5 relative overflow-hidden;
  background-color: hsla(var(--meeting-bg-h), var(--meeting-bg-s), calc(var(--meeting-bg-l) + 5%), 0.75);
  border-color: hsla(var(--meeting-accent-h), var(--meeting-accent-s), var(--meeting-accent-l), 0.1);

  &.archived {
    opacity: 0.65;
    background-color: hsla(var(--meeting-bg-h), var(--meeting-bg-s), var(--meeting-bg-l), 0.5);
    .item-title-v2 { font-style: italic; }
  }

  &:hover, &:focus-visible {
    background-color: hsla(var(--meeting-accent-h), var(--meeting-accent-s), var(--meeting-accent-l), 0.08);
    border-color: hsla(var(--meeting-accent-h), var(--meeting-accent-s), var(--meeting-accent-l), 0.3);
    .item-actions-v2 { opacity: 1; }
    outline: none;
  }
  &.active {
    border-color: hsla(var(--meeting-accent-h), var(--meeting-accent-s), var(--meeting-accent-l), 0.4);
    background-color: hsla(var(--meeting-accent-h), var(--meeting-accent-s), var(--meeting-accent-l), 0.1);
    box-shadow: 0 0 0 1.5px hsla(var(--meeting-accent-h), var(--meeting-accent-s), var(--meeting-accent-l), 0.3),
                inset 0 0 10px hsla(var(--meeting-accent-h), var(--meeting-accent-s), var(--meeting-accent-l), 0.05);
  }
}
.item-flair-v2 {
  @apply absolute left-0 top-0 bottom-0 w-1 opacity-70 transition-all duration-200 rounded-l-lg;
}
.item-content-v2 { @apply flex-grow min-w-0 pl-1.5; }
.item-title-v2 {
  @apply text-xs font-semibold mb-0.5 truncate;
  color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
}
.item-date-v2 {
  @apply mb-0.5 text-xxs; // Used .text-xxs
  color: hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l), 0.8);
}
.item-tags-preview-v2 {
  @apply italic opacity-80 text-xxs; // Used .text-xxs
}

.item-indicators-v2 {
  @apply flex items-center flex-wrap gap-1.5 mt-1;
  .item-action-indicator-v2, .item-archived-indicator-v2 {
    @apply font-medium flex items-center px-1.5 py-0.5 rounded-full text-xxs; // Used .text-xxs
    background-color: hsla(var(--meeting-bg-h), var(--meeting-bg-s), calc(var(--meeting-bg-l) + 10%), 0.7);
    border: 1px solid hsla(var(--meeting-bg-h), var(--meeting-bg-s), calc(var(--meeting-bg-l) + 15%), 0.9);
    color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));
  }
  .item-archived-indicator-v2 {
    color: hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l));
    background-color: hsla(var(--meeting-bg-h), var(--meeting-bg-s), calc(var(--meeting-bg-l) + 5%), 0.7);
  }
}

.item-actions-v2 {
  @apply absolute top-1.5 right-1.5 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150;
  .btn-icon-futuristic.smallest {
    background-color: hsla(var(--meeting-bg-h), var(--meeting-bg-s), calc(var(--meeting-bg-l) + 10%), 0.6);
    backdrop-filter: blur(2px);
    &:hover {
      background-color: hsla(var(--meeting-bg-h), var(--meeting-bg-s), calc(var(--meeting-bg-l) + 15%), 0.8);
    }
  }
}

.btn-icon-futuristic.smallest svg { @apply w-3.5 h-3.5; }
.form-checkbox-futuristic.small { @apply w-3.5 h-3.5; }
</style>