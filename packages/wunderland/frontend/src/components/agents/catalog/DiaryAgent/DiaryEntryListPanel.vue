<template>
  <div class="diary-entry-list-panel-v2">
    <div class="panel-header-v2">
      <h3 class="panel-title-v2">My Reflections</h3>
      <div class="panel-actions-v2">
        <button @click="showFilters = !showFilters" class="btn-icon-futuristic smallest" title="Filters">
          <AdjustmentsHorizontalIcon class="w-4 h-4" />
        </button>
        <button @click="$emit('import-data-trigger')" class="btn-icon-futuristic smallest" title="Import Entries">
          <ArrowUpTrayIcon class="w-4 h-4" />
        </button>
        <button @click="$emit('export-data', 'json')" class="btn-icon-futuristic smallest" title="Export All (JSON)">
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
          placeholder="Search entries..."
          class="form-input-futuristic small w-full mb-2"
        />
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label class="form-label-v2">Tags (any):</label>
            <select multiple :value="filters.tags" @change="updateTagFilter(($event.target as HTMLSelectElement))" class="form-select-futuristic small w-full h-20">
              <option v-for="tag in availableTags" :key="tag" :value="tag">{{ tag }}</option>
            </select>
          </div>
          <div>
            <label class="form-label-v2">Moods (any):</label>
            <select multiple :value="filters.moods" @change="updateMoodFilter(($event.target as HTMLSelectElement))" class="form-select-futuristic small w-full h-20">
              <option v-for="mood in availableMoods" :key="mood" :value="mood">{{ mood }}</option>
            </select>
          </div>
          <div>
            <label class="form-label-v2">Sort by:</label>
            <select :value="filters.sortBy" @change="updateSortBy(($event.target as HTMLSelectElement).value as any)" class="form-select-futuristic small w-full">
              <option value="updatedAt">Last Updated</option>
              <option value="createdAt">Date Created</option>
              <option value="title">Title</option>
              <option value="moodRating">Mood Rating</option>
            </select>
          </div>
          <div>
            <label class="form-label-v2">Order:</label>
            <select :value="filters.sortOrder" @change="updateSortOrder(($event.target as HTMLSelectElement).value as any)" class="form-select-futuristic small w-full">
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
        <label class="filter-checkbox-wrapper-v2 mt-2">
            <input type="checkbox" :checked="filters.isFavorite" @change="updateFavoriteFilter(($event.target as HTMLInputElement).checked)" class="form-checkbox-futuristic"/>
            <span>Favorites Only</span>
        </label>
        <button @click="clearLocalFilters" class="btn-futuristic-secondary btn-xs w-full mt-2">Clear Filters</button>
      </div>
    </Transition>

    <div class="entry-list-scroll-area-v2">
      <div v-if="isLoading && entries.length === 0" class="list-message-v2">Loading entries...</div>
      <div v-else-if="entries.length === 0" class="list-message-v2">No entries yet. Start writing!</div>
      <TransitionGroup name="diary-entry-anim" tag="ul" class="space-y-1.5">
        <li
          v-for="entry in entries"
          :key="entry.id"
          @click="$emit('select-entry', entry.id)"
          class="entry-list-item-v2"
          :class="{ 'active': entry.id === activeEntryId, 'favorite': entry.isFavorite }"
          tabindex="0"
        >
          <div class="entry-item-flair-v2" :style="{ backgroundColor: getMoodColor(entry.moodRating) }"></div>
          <div class="entry-item-content-v2">
            <h4 class="entry-title-v2">{{ entry.title }}</h4>
            <p class="entry-summary-v2">{{ entry.summary || entry.contentMarkdown.substring(0, 70) + '...' }}</p>
            <div class="entry-meta-v2">
              <span>{{ new Date(entry.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}</span>
              <span v-if="entry.mood" class="mood-tag-v2">{{ entry.mood }}</span>
              <StarIcon v-if="entry.isFavorite" class="favorite-icon-v2 w-3 h-3" />
            </div>
          </div>
           <button @click.stop="$emit('delete-entry', entry.id)" class="delete-btn-v2" title="Delete Entry">
              <XMarkIcon class="w-3.5 h-3.5"/>
          </button>
        </li>
      </TransitionGroup>
    </div>
     <button
        v-if="entries.length > 0"
        @click="$emit('clear-all-entries')"
        class="btn-futuristic-danger btn-xs w-full mt-2"
        title="Delete All Diary Entries"
        :disabled="isLoading"
      >
        <TrashIcon class="btn-icon-xs" /> Clear All History
      </button>
  </div>
</template>

<script setup lang="ts">
import { ref, type PropType } from 'vue';
import type { RichDiaryEntry, DiaryFilterOptions, MoodRating } from './DiaryAgentTypes';
import { AdjustmentsHorizontalIcon, ArrowUpTrayIcon, ArrowDownTrayIcon, StarIcon, XMarkIcon, TrashIcon } from '@heroicons/vue/24/solid';

const props = defineProps({
  entries: { type: Array as PropType<RichDiaryEntry[]>, required: true },
  activeEntryId: { type: String as PropType<string | null>, default: null },
  isLoading: { type: Boolean, default: false },
  filters: { type: Object as PropType<DiaryFilterOptions>, required: true },
  availableTags: { type: Array as PropType<string[]>, required: true },
  availableMoods: { type: Array as PropType<string[]>, required: true },
});

const emit = defineEmits<{
  (e: 'select-entry', entryId: string): void;
  (e: 'delete-entry', entryId: string): void;
  (e: 'clear-all-entries'): void;
  (e: 'update-filters', filters: Partial<DiaryFilterOptions>): void;
  (e: 'export-data', format: 'json' | 'markdown_bundle'): void;
  (e: 'import-data-trigger'): void;
}>();

const showFilters = ref(false);

const updateSearchTerm = (term: string) => emit('update-filters', { searchTerm: term });
const updateTagFilter = (selectElement: HTMLSelectElement) => {
    const selectedTags = Array.from(selectElement.selectedOptions).map(opt => opt.value);
    emit('update-filters', { tags: selectedTags });
};
const updateMoodFilter = (selectElement: HTMLSelectElement) => {
    const selectedMoods = Array.from(selectElement.selectedOptions).map(opt => opt.value);
    emit('update-filters', { moods: selectedMoods });
};
const updateSortBy = (sortBy: DiaryFilterOptions['sortBy']) => emit('update-filters', { sortBy });
const updateSortOrder = (sortOrder: 'asc' | 'desc') => emit('update-filters', { sortOrder });
const updateFavoriteFilter = (isFavorite: boolean) => emit('update-filters', { isFavorite });

const clearLocalFilters = () => {
    showFilters.value = false; // Optionally close filter panel
    emit('update-filters', { searchTerm: '', tags: [], moods: [], isFavorite: false, sortBy: 'updatedAt', sortOrder: 'desc' });
};

const getMoodColor = (moodRating?: MoodRating): string => {
  if (!moodRating) return 'hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.1)';
  const colors = [
    'hsl(0, 70%, 60%)',   // Very Negative (1) - Reddish
    'hsl(30, 70%, 60%)',  // Negative (2) - Orangeish
    'hsl(60, 50%, 60%)',  // Neutral (3) - Yellowish
    'hsl(90, 60%, 55%)',  // Positive (4) - Greenish
    'hsl(120, 60%, 50%)'  // Very Positive (5) - Green
  ];
  return colors[moodRating -1] || 'hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.1)';
};

</script>

<style lang="scss" scoped>
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;

.diary-entry-list-panel-v2 {
  @apply w-full md:w-[300px] lg:w-[360px] p-2.5 flex flex-col shrink-0 overflow-hidden;
  background-color: hsla(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) + 4%), 0.98);
  border-right: 1px solid hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.1);
}
.panel-header-v2 {
  @apply flex justify-between items-center mb-2 pb-2 border-b shrink-0;
  border-bottom-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.15);
  .panel-title-v2 { @apply text-sm font-semibold; color: var(--color-text-secondary); }
  .panel-actions-v2 { @apply flex items-center gap-1.5; }
}
.filter-area-v2 {
  @apply p-2 mb-2 rounded-md border text-xs space-y-1.5;
  background-color: hsla(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) + 2%), 0.9);
  border-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.1);
  .form-label-v2 { @apply block mb-0.5 text-xxs font-medium; color: var(--color-text-muted); }
  .filter-checkbox-wrapper-v2 { @apply flex items-center gap-1.5; span {color: var(--color-text-secondary); } }
}
.filter-slide-v2-enter-active, .filter-slide-v2-leave-active { transition: all 0.3s ease-out; max-height: 300px; }
.filter-slide-v2-enter-from, .filter-slide-v2-leave-to { opacity: 0; transform: translateY(-10px); max-height: 0px; }

.entry-list-scroll-area-v2 {
  @apply flex-grow overflow-y-auto -mr-1 pr-1; // For custom scrollbar
  @include mixins.custom-scrollbar-for-themed-panel('--diary');
}
.list-message-v2 { @apply text-center text-xs py-8; color: var(--color-text-muted); }

.diary-entry-anim-move, .diary-entry-anim-enter-active, .diary-entry-anim-leave-active { transition: all 0.35s var(--ease-out-cubic); }
.diary-entry-anim-enter-from, .diary-entry-anim-leave-to { opacity: 0; transform: translateY(15px); }
.diary-entry-anim-leave-active { position: absolute; width: calc(100% - theme('spacing.2')); }


.entry-list-item-v2 {
  @apply p-2.5 rounded-lg cursor-pointer transition-all duration-150 ease-out border flex items-start gap-2 relative overflow-hidden;
  background-color: hsla(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) + 6%), 0.7);
  border-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.08);
  &:hover, &.active {
    background-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.1);
    border-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.3);
  }
  &.active {
     box-shadow: 0 0 0 2px hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.5);
  }
  &.favorite .entry-item-flair-v2 { opacity: 1; width: 5px; background-color: hsl(50, 90%, 60%) !important; }
}
.entry-item-flair-v2 {
    @apply absolute left-0 top-0 bottom-0 w-1 opacity-60 transition-all duration-200;
}
.entry-item-content-v2 { @apply flex-grow min-w-0 pl-1.5; } // Pl-1.5 to account for flair
.entry-title-v2 { @apply text-xs font-semibold mb-0.5 truncate; color: var(--color-text-primary); }
.entry-summary-v2 { @apply text-xxs leading-snug text-gray-400 dark:text-gray-500 line-clamp-2 mb-1; }
.entry-meta-v2 {
  @apply flex items-center gap-1.5 text-[0.65rem]; color: var(--color-text-muted);
  .mood-tag-v2 { @apply px-1 py-0.5 rounded text-xxs; background-color: hsla(var(--diary-accent-h),var(--diary-accent-s),var(--diary-accent-l),0.1); }
  .favorite-icon-v2 { @apply text-yellow-500; }
}
.delete-btn-v2 {
    @apply absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity;
    color: var(--color-text-muted);
    &:hover { color: var(--color-error-default); background-color: hsla(var(--color-error-h), var(--color-error-s), var(--color-error-l), 0.1); }
}

/* Assume btn-icon-futuristic, btn-futuristic-*, form-input-futuristic are globally defined */
.btn-icon-futuristic.smallest { svg { @apply w-3.5 h-3.5; }}
.btn-icon-xs { /* ensure defined */ }
.form-input-futuristic.small { /* ensure defined */ }
.form-select-futuristic.small { /* ensure defined */ }
.form-checkbox-futuristic { /* ensure defined */ }
.btn-futuristic-danger.btn-xs { /* ensure defined */ }
.btn-futuristic-outline.btn-xs { /* ensure defined */ }
.btn-futuristic-secondary.btn-xs { /* ensure defined */ }

</style>
