// File: frontend/src/components/agents/Diary/DiaryWorkspace.vue
/**
 * @file DiaryWorkspace.vue
 * @description Component for viewing, editing, and composing diary entries.
 * Handles main content, metadata editing, and entry-specific actions.
 * @version 1.1.0 - Corrected TypeScript errors, refined editable state management, and improved weather integration.
 */
<template>
  <div class="diary-workspace-v2" :aria-busy="isLoading">
    <div v-if="isLoading && !effectiveEntry" class="workspace-loading-placeholder-v2">
      <div class="diary-spinner large"></div> <p>Loading Entry...</p>
    </div>

    <template v-else-if="effectiveEntry">
      <div class="workspace-header-main-v2">
        <div v-if="isEditing" class="title-input-group-v2">
          <input
            type="text"
            v-model="editableFields.title"
            placeholder="Entry Title"
            class="form-input-futuristic large-title"
            aria-label="Entry Title"
            @input="throttledUpdateDraft"
            @keyup.enter="$emit('save-entry')"
          />
        </div>
        <h2 v-else class="entry-title-display-v2" @dblclick="handleEditClick" :title="effectiveEntry.title || 'Untitled Entry'">
          {{ effectiveEntry.title || 'Untitled Entry' }}
          <PencilSquareIcon v-if="canEditCurrentView" class="edit-icon-inline" @click="handleEditClick" aria-label="Edit title"/>
        </h2>

        <div class="entry-actions-v2">
          <button
            v-if="isEditing"
            @click="$emit('save-entry')"
            :disabled="isLoading || !canSave"
            class="btn-futuristic-primary btn-sm"
            aria-label="Save Entry"
          >
            <CheckIcon class="btn-icon-sm" /> Save
          </button>
          <button
            v-if="isEditing && viewMode === 'edit_entry'"
            @click="handleCancelEditClick"
            class="btn-futuristic-secondary btn-sm"
            aria-label="Cancel Edit"
          >
            <XMarkIcon class="btn-icon-sm" /> Cancel
          </button>
           <button
            v-if="!isEditing && canEditCurrentView"
            @click="handleEditClick"
            class="btn-futuristic-secondary btn-sm"
            aria-label="Edit Entry"
          >
            <PencilSquareIcon class="btn-icon-sm" /> Edit
          </button>
          <button
            v-if="effectiveEntry.id && !isComposingNew"
            @click="$emit('toggle-favorite')"
            class="btn-icon-futuristic smallest"
            :title="effectiveEntry.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'"
            :aria-label="effectiveEntry.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'"
            :aria-pressed="!!effectiveEntry.isFavorite"
          >
            <StarIconSolid v-if="effectiveEntry.isFavorite" class="w-4 h-4 text-yellow-400" />
            <StarIconOutline v-else class="w-4 h-4" />
          </button>
           <button
            v-if="effectiveEntry.id && !isComposingNew"
            @click="$emit('request-analysis', 'sentiment')"
            class="btn-icon-futuristic smallest"
            title="Analyze Entry Sentiment & Keywords"
            aria-label="Analyze Entry"
          >
            <ChartBarIcon class="w-4 h-4" />
          </button>
          <button
            v-if="isEditing"
            @click="$emit('request-metadata-suggestion')"
            class="btn-futuristic-outline btn-xs"
            title="Suggest Title, Tags & Mood with AI"
            aria-label="Suggest metadata with AI"
            :disabled="isLoading || !editableFields.contentMarkdown?.trim()"
          >
            <SparklesIcon class="w-3 h-3 mr-1"/> AI Suggest
          </button>
          <button
            v-if="effectiveEntry.id && !isComposingNew && !isEditing"
            @click="$emit('delete-entry')"
            class="btn-icon-futuristic smallest danger-hover"
            title="Delete Entry"
            aria-label="Delete Entry"
          >
            <TrashIcon class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="metadata-section-v2">
        <div class="meta-item-v2 date-meta">
            <CalendarDaysIcon class="meta-icon-v2"/>
            <span>{{ new Date(effectiveEntry.createdAt || Date.now()).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</span>
            <span v-if="effectiveEntry.updatedAt && effectiveEntry.createdAt !== effectiveEntry.updatedAt" class="text-xxs opacity-70 ml-1">(edited {{ new Date(effectiveEntry.updatedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) }})</span>
        </div>

        <div v-if="isEditing" class="meta-item-v2 mood-edit">
          <FaceSmileIcon class="meta-icon-v2" />
          <input
            type="text"
            v-model="editableFields.mood"
            placeholder="Current Mood"
            list="commonMoodsDatalistWorkspace"
            class="form-input-futuristic extra-small"
            @input="throttledUpdateDraft"
            aria-label="Mood"
          />
          <datalist id="commonMoodsDatalistWorkspace">
            <option v-for="m in commonMoods" :key="`mood-opt-ws-${m}`" :value="m"></option>
          </datalist>
          <input
            type="number"
            min="1" max="5" step="1"
            v-model.number="editableFields.moodRating"
            placeholder="1-5"
            class="form-input-futuristic extra-small rating-input"
            @input="throttledUpdateDraft"
            aria-label="Mood Rating (1 to 5)"
          />
        </div>
        <div v-else-if="effectiveEntry.mood || typeof effectiveEntry.moodRating === 'number'" class="meta-item-v2">
            <FaceSmileIcon class="meta-icon-v2" />
            <span>{{ effectiveEntry.mood || 'Mood not set' }} <span v-if="typeof effectiveEntry.moodRating === 'number'">({{ effectiveEntry.moodRating }}/5)</span></span>
        </div>

        <div v-if="isEditing" class="meta-item-v2 tags-edit">
          <TagIcon class="meta-icon-v2" />
          <input
            type="text"
            v-model="editableFields.tags"
            placeholder="Tags, comma-separated"
            class="form-input-futuristic extra-small"
            @input="throttledUpdateDraft"
            aria-label="Tags (comma-separated)"
          />
        </div>
        <div v-else-if="effectiveEntry.tags && effectiveEntry.tags.length" class="meta-item-v2 tags-display">
            <TagIcon class="meta-icon-v2" />
            <span v-for="tag in effectiveEntry.tags" :key="tag" class="tag-chip-v2">{{ tag }}</span>
        </div>

        <div v-if="isEditing" class="meta-item-v2">
            <MapPinIcon class="meta-icon-v2" />
            <input type="text" v-model="editableFields.locationName" placeholder="Location (e.g. Home)" class="form-input-futuristic extra-small" @input="throttledUpdateDraft" aria-label="Location Name"/>
        </div>
        <div v-else-if="effectiveEntry.location?.name" class="meta-item-v2">
            <MapPinIcon class="meta-icon-v2" /> {{ effectiveEntry.location.name }}
        </div>
         <div v-if="isEditing" class="meta-item-v2">
            <CloudIcon class="meta-icon-v2" />
            <input type="text" v-model="editableFields.weather" placeholder="Weather (e.g. Sunny)" class="form-input-futuristic extra-small" @input="throttledUpdateDraft" aria-label="Weather"/>
        </div>
        <div v-else-if="effectiveEntry.weather" class="meta-item-v2">
            <CloudIcon class="meta-icon-v2" /> {{ effectiveEntry.weather }}
        </div>
      </div>

      <div class="content-area-v2">
        <!-- Content Mode Toggle (Only in Edit Mode) -->
        <div v-if="isEditing" class="content-mode-toggle">
          <button
            @click="contentMode = 'text'"
            :class="{ active: contentMode === 'text' }"
            class="mode-btn"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
            Text
          </button>
          <button
            @click="contentMode = 'canvas'"
            :class="{ active: contentMode === 'canvas' }"
            class="mode-btn"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Canvas
          </button>
          <button
            @click="contentMode = 'both'"
            :class="{ active: contentMode === 'both' }"
            class="mode-btn"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Both
          </button>
        </div>

        <!-- Text Editor (when mode is 'text' or 'both') -->
        <MarkdownEditor
          v-if="isEditing && (contentMode === 'text' || contentMode === 'both')"
          v-model="editableFields.contentMarkdown"
          placeholder="Share your thoughts, reflections, or details of your day..."
          :class="['markdown-editor-enhanced', contentMode === 'both' ? 'half-height' : 'full-height']"
          @update:modelValue="throttledUpdateDraft"
        />

        <!-- Canvas Editor (when mode is 'canvas' or 'both') -->
        <CanvasEditor
          v-if="isEditing && (contentMode === 'canvas' || contentMode === 'both')"
          v-model="editableFields.canvasData"
          :class="['canvas-editor-enhanced', contentMode === 'both' ? 'half-height' : 'full-height']"
          @update:modelValue="throttledUpdateDraft"
        />

        <!-- View Mode Display -->
        <div v-if="!isEditing" class="content-display-v2">
          <!-- Text Content -->
          <div v-if="effectiveEntry.contentMarkdown" class="markdown-display-v2 prose prose-sm sm:prose-base diary-prose-theme max-w-none">
            <CompactMessageRenderer
              :key="(effectiveEntry.id || 'draft') + '-content-' + effectiveEntry.updatedAt"
              :content="effectiveEntry.contentMarkdown"
              :mode="`${agentIdForRenderer}-diaryEntry`"
            />
          </div>

          <!-- Canvas Content -->
          <div v-if="effectiveEntry.canvasData" class="canvas-display-v2">
            <CanvasEditor
              :model-value="effectiveEntry.canvasData"
              :readonly="true"
              class="full-height"
            />
          </div>

          <!-- Empty State -->
          <p v-if="!effectiveEntry.contentMarkdown && !effectiveEntry.canvasData" class="italic text-[var(--color-text-muted)]">
            This entry has no content yet.
          </p>
        </div>
      </div>
    </template>

    <div v-else class="workspace-placeholder-v2">
      <DocumentTextIcon class="w-16 h-16 opacity-10 mb-4"/>
      <p>Select an entry to view, or start a new reflection.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, type PropType } from 'vue';
import type { RichDiaryEntry, DiaryViewMode, MoodRating, DiaryEntryLocation } from './DiaryAgentTypes'; // MoodRating imported
import CompactMessageRenderer from '@/components/layouts/CompactMessageRenderer/CompactMessageRenderer.vue';
import MarkdownEditor from '@/components/shared/MarkdownEditor/MarkdownEditor.vue';
import CanvasEditor from '@/components/shared/CanvasEditor/CanvasEditor.vue';
import { useAgentStore } from '@/store/agent.store';
import {
  PencilSquareIcon, CheckIcon, XMarkIcon, TrashIcon, SparklesIcon,
  StarIcon as StarIconOutline, CalendarDaysIcon, TagIcon, FaceSmileIcon,
  MapPinIcon, CloudIcon, DocumentTextIcon, ChartBarIcon
} from '@heroicons/vue/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/vue/24/solid';

const props = defineProps({
  entry: { type: Object as PropType<RichDiaryEntry | Partial<RichDiaryEntry> | null>, default: null },
  viewMode: { type: String as PropType<DiaryViewMode>, required: true },
  isLoading: { type: Boolean, default: false },
  canSave: { type: Boolean, default: false },
  commonMoods: { type: Array as PropType<string[]>, default: () => [] },
  defaultTags: { type: Array as PropType<string[]>, default: () => [] },
});

const emit = defineEmits<{
  (e: 'save-entry'): void;
  (e: 'update-draft', draftUpdate: Partial<RichDiaryEntry>): void;
  (e: 'delete-entry'): void;
  (e: 'edit-entry'): void;
  (e: 'toggle-favorite'): void;
  (e: 'request-analysis', type: 'sentiment' | 'keywords' | 'themes' | 'actionable' | 'questions'): void;
  (e: 'request-metadata-suggestion'): void;
}>();

const agentStore = useAgentStore();
const agentIdForRenderer = computed(() => agentStore.activeAgentId || 'diary-agent-generic');

const isEditing = computed(() => props.viewMode === 'edit_entry' || props.viewMode === 'compose_new_entry');
const isComposingNew = computed(() => props.viewMode === 'compose_new_entry');
const canEditCurrentView = computed(() => props.viewMode === 'view_entry' && props.entry && !props.entry.isDraft);

// Content mode: 'text', 'canvas', or 'both'
const contentMode = ref<'text' | 'canvas' | 'both'>('text');

// Local reactive state for editable fields
const editableFields = ref({
  title: '',
  contentMarkdown: '',
  canvasData: '',
  tags: '', // Comma-separated string for input
  mood: '',
  moodRating: undefined as MoodRating | undefined,
  locationName: '', // Store only name for simplicity here
  weather: '',
});

let updateDraftTimeout: number | undefined;

watch(
  () => [props.entry, isEditing.value] as const, // Use 'as const' for precise tuple typing
  ([currentEntry, editingNow]) => {
    if (editingNow && currentEntry) {
      editableFields.value = {
        title: currentEntry.title || '',
        contentMarkdown: currentEntry.contentMarkdown || '',
        canvasData: currentEntry.canvasData || '',
        tags: (currentEntry.tags || []).join(', '),
        mood: currentEntry.mood || '',
        moodRating: currentEntry.moodRating,
        locationName: currentEntry.location?.name || '',
        weather: currentEntry.weather || '',
      };

      // Set content mode based on existing data
      const hasText = !!currentEntry.contentMarkdown
      const hasCanvas = !!currentEntry.canvasData
      if (hasText && hasCanvas) {
        contentMode.value = 'both'
      } else if (hasCanvas) {
        contentMode.value = 'canvas'
      } else {
        contentMode.value = 'text'
      }
    } else if (!editingNow && props.viewMode === 'view_entry' && currentEntry) {
      // When switching back to view_entry, ensure editableFields reflects the (potentially non-draft) entry
       editableFields.value = {
        title: currentEntry.title || '',
        contentMarkdown: currentEntry.contentMarkdown || '',
        canvasData: currentEntry.canvasData || '',
        tags: (currentEntry.tags || []).join(', '),
        mood: currentEntry.mood || '',
        moodRating: currentEntry.moodRating,
        locationName: currentEntry.location?.name || '',
        weather: currentEntry.weather || '',
      };
    }
  },
  { immediate: true, deep: true }
);

const throttledUpdateDraft = () => {
  clearTimeout(updateDraftTimeout);
  updateDraftTimeout = window.setTimeout(() => {
    if (isEditing.value) {
      const draftUpdate: Partial<RichDiaryEntry> = {
        title: editableFields.value.title,
        contentMarkdown: editableFields.value.contentMarkdown,
        canvasData: editableFields.value.canvasData || undefined,
        tags: editableFields.value.tags.split(',').map(t => t.trim()).filter(t => t),
        mood: editableFields.value.mood.trim() || undefined,
        moodRating: editableFields.value.moodRating || undefined, // Ensure it can be undefined
        weather: editableFields.value.weather.trim() || undefined,
      };
      if (editableFields.value.locationName.trim()) {
        draftUpdate.location = {
            name: editableFields.value.locationName.trim(),
            latitude: (props.entry as RichDiaryEntry)?.location?.latitude ?? 0, // Preserve existing coords or default
            longitude: (props.entry as RichDiaryEntry)?.location?.longitude ?? 0,
        };
      } else {
        draftUpdate.location = undefined;
      }
      emit('update-draft', draftUpdate);
    }
  }, 300); // Throttle updates
};

const effectiveEntry = computed(() => {
  // If editing, merge props.entry (base) with current editableFields to show live edits
  // props.entry could be Partial<RichDiaryEntry> when composing new (currentDraft from parent)
  // or RichDiaryEntry when editing existing (activeEntry from parent)
  if (isEditing.value && props.entry) {
    return {
      ...(props.entry as Partial<RichDiaryEntry>), // Base data from prop (currentDraft or activeEntry)
      // Override with values from local editable form state
      title: editableFields.value.title,
      contentMarkdown: editableFields.value.contentMarkdown,
      tags: editableFields.value.tags.split(',').map(t => t.trim()).filter(t => t),
      mood: editableFields.value.mood.trim() || undefined,
      moodRating: editableFields.value.moodRating || undefined,
      location: editableFields.value.locationName.trim()
          ? { name: editableFields.value.locationName.trim(), latitude: (props.entry as RichDiaryEntry)?.location?.latitude ?? 0, longitude: (props.entry as RichDiaryEntry)?.location?.longitude ?? 0 }
          : undefined,
      weather: editableFields.value.weather.trim() || undefined,
    } as RichDiaryEntry; // Cast to RichDiaryEntry for template consistency
  }
  return props.entry as RichDiaryEntry | null; // For view_entry mode or if not editing
});

const handleEditClick = () => {
    emit('edit-entry');
};

const handleCancelEditClick = () => {
    // Parent (DiaryAgentView) will call useDiaryAgent.setViewMode('view_entry'),
    // which will clear currentDraft if it was an edit of an existing entry.
    // The watcher for props.entry will then reset editableFields to the view_entry state.
    emit('edit-entry'); // Effectively, this signals to stop editing and revert to view mode
};

// Keyboard shortcuts handler
function handleKeyboardShortcuts(event: KeyboardEvent) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const modKey = isMac ? event.metaKey : event.ctrlKey

  // Cmd/Ctrl + S: Save entry
  if (modKey && event.key === 's') {
    event.preventDefault()
    if (isEditing.value && props.canSave) {
      emit('save-entry')
    }
  }
  // Escape: Cancel editing
  else if (event.key === 'Escape') {
    if (isEditing.value && props.viewMode === 'edit_entry') {
      handleCancelEditClick()
    }
  }
  // Cmd/Ctrl + E: Toggle edit mode
  else if (modKey && event.key === 'e') {
    event.preventDefault()
    if (!isEditing.value && canEditCurrentView.value) {
      handleEditClick()
    }
  }
}

// Add keyboard shortcuts on mount
onMounted(() => {
  window.addEventListener('keydown', handleKeyboardShortcuts)
})

// Remove keyboard shortcuts on unmount
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyboardShortcuts)
})

</script>

<style lang="scss" scoped>
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;

.diary-workspace-v2 {
  @apply flex flex-col h-full overflow-hidden p-3 md:p-4 gap-3;
  background-color: hsl(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) - 2%));
}

.workspace-loading-placeholder-v2 {
  @apply flex-grow flex flex-col items-center justify-center text-center;
  color: var(--color-text-muted);
  .diary-spinner.large { @apply w-12 h-12 mb-3; /* Define spinner CSS elsewhere */ }
}

.workspace-header-main-v2 {
  @apply flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b shrink-0;
  border-bottom-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.15);
}

.title-input-group-v2 {
  @apply flex-grow w-full sm:w-auto;
  .form-input-futuristic.large-title {
    @apply text-xl font-semibold w-full bg-transparent border-2 rounded-md py-1.5 px-2;
    border-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.3);
    color: var(--color-text-primary);
    &:focus {
      border-color: hsl(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l));
      box-shadow: 0 0 0 2.5px hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.3);
    }
  }
}

.entry-title-display-v2 {
  @apply text-xl font-semibold flex-grow cursor-pointer flex items-center gap-2 break-words mr-2;
  color: hsl(var(--diary-accent-h), var(--diary-accent-s), calc(var(--diary-accent-l) + 10%));
  .edit-icon-inline { @apply w-4 h-4 opacity-30 hover:opacity-80 transition-opacity cursor-pointer shrink-0; }
}

.entry-actions-v2 {
  @apply flex items-center gap-1.5 shrink-0 flex-wrap justify-start sm:justify-end mt-2 sm:mt-0;
}

.metadata-section-v2 {
  @apply flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs pb-3 border-b shrink-0;
  border-bottom-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.1);
  color: var(--color-text-secondary);

  .meta-item-v2 {
    @apply flex items-center gap-1 py-0.5;
  }
  .meta-icon-v2 { @apply w-3.5 h-3.5 opacity-70 shrink-0; }
  .form-input-futuristic.extra-small {
    @apply py-1 px-1.5 text-xs max-w-[130px] rounded-sm border; /* Ensure consistent styling */
    background-color: hsla(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) + 2%), 0.8);
    border-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.2);
     &:focus {
      border-color: hsl(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l));
      background-color: hsla(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) + 4%), 1);
    }
    &.rating-input { @apply w-14 text-center; }
  }
  .tags-display .tag-chip-v2 {
    @apply text-xxs px-1.5 py-0.5 rounded-full cursor-default;
    background-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.1);
    border: 1px solid hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.2);
    color: hsl(var(--diary-accent-h), var(--diary-accent-s), calc(var(--diary-accent-l) + 15%));
    margin-right: 0.25rem;
  }
}

.content-area-v2 {
  @apply flex-grow flex flex-col overflow-hidden pt-2;
}

.markdown-editor-enhanced {
  @apply flex-grow;
  border: 2px solid hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.2);
  border-radius: 8px;
  overflow: hidden;

  &:focus-within {
    border-color: hsl(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l));
    box-shadow: 0 0 0 2.5px hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.25);
  }
}

.markdown-display-v2 {
  @apply flex-grow overflow-y-auto p-1 pr-2;
  @include mixins.custom-scrollbar-for-themed-panel('--diary');
  // Apply prose styles for rendered markdown
  &.diary-prose-theme {
    h1,h2,h3,h4,h5,h6 { color: hsl(var(--diary-accent-h), var(--diary-accent-s), calc(var(--diary-accent-l) + 10%)); @apply mt-3 mb-1 font-semibold; }
    h1 {@apply text-xl;} h2 {@apply text-lg;} h3 {@apply text-base;}
    p { @apply mb-2 leading-relaxed; }
    ul, ol { @apply pl-5 my-2 space-y-0.5; }
    li > p { @apply mb-0.5; } // Tighter spacing for p inside li
    code:not(pre code) { background-color: hsla(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) + 5%), 0.8); @apply px-1 py-0.5 rounded text-xs font-mono; color: var(--color-text-accent); }
    pre { @apply my-2 rounded-md bg-black/10 dark:bg-white/5; code { @apply block p-3 whitespace-pre-wrap text-xs; }}
    blockquote { @apply border-l-4 pl-3 italic my-2; border-color: hsl(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l)); color: var(--color-text-secondary); }
    a { color: hsl(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l)); @apply underline hover:opacity-80; }
  }
}

.workspace-placeholder-v2 {
  @apply flex-grow flex flex-col items-center justify-center text-center p-6;
  color: var(--color-text-muted);
}

/* Define styles for btn-icon-futuristic, form-input-futuristic etc if not global */
.btn-icon-futuristic.smallest { svg { @apply w-4 h-4; } /* Slightly larger for better click target */ }
.form-input-futuristic.extra-small { /* Ensure this is defined */ }
.btn-futuristic-primary.btn-sm { /* Ensure this is defined */ }
.btn-futuristic-secondary.btn-sm { /* Ensure this is defined */ }
.btn-futuristic-outline.btn-xs { /* Ensure this is defined */ }
.btn-icon-sm { @apply w-4 h-4 mr-1.5; }

// Additional spinner style if needed
.diary-spinner.large {
  border: 4px solid hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.2);
  border-top-color: hsl(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l));
  @apply rounded-full w-12 h-12 animate-spin;
}

// Content mode toggle
.content-mode-toggle {
  @apply flex items-center gap-1 mb-3 p-1 rounded-md;
  background-color: hsla(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) + 2%), 0.8);
  width: fit-content;

  .mode-btn {
    @apply flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all;
    color: var(--color-text-secondary);
    background-color: transparent;
    border: none;
    cursor: pointer;

    .icon {
      @apply w-4 h-4;
      stroke-width: 2;
    }

    &:hover {
      color: var(--color-text-primary);
      background-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.05);
    }

    &.active {
      color: hsl(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l));
      background-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.15);
    }
  }
}

// Editor height classes
.full-height {
  @apply flex-grow;
  height: 100%;
}

.half-height {
  height: 50%;
  min-height: 300px;
}

// Canvas editor styles
.canvas-editor-enhanced {
  border: 2px solid hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.2);
  border-radius: 8px;
  overflow: hidden;

  &:focus-within {
    border-color: hsl(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l));
    box-shadow: 0 0 0 2.5px hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.25);
  }
}

// Content display in view mode
.content-display-v2 {
  @apply flex-grow flex flex-col gap-4 overflow-y-auto;
  @include mixins.custom-scrollbar-for-themed-panel('--diary');
}

.canvas-display-v2 {
  @apply flex-grow;
  min-height: 400px;
  border: 2px solid hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.1);
  border-radius: 8px;
  overflow: hidden;
}

// Mobile responsive enhancements
@media (max-width: 768px) {
  .content-mode-toggle {
    @apply w-full justify-center;

    .mode-btn {
      @apply flex-1 justify-center px-2;
      min-height: 44px; // iOS recommended touch target size

      .icon {
        @apply w-5 h-5;
      }
    }
  }

  .half-height {
    height: 45%; // Slightly smaller on mobile for better split view
    min-height: 250px;
  }

  .canvas-display-v2 {
    min-height: 300px; // Smaller min-height on mobile
  }

  // Make editors more touch-friendly
  .markdown-editor-enhanced,
  .canvas-editor-enhanced {
    border-width: 1px; // Thinner borders on mobile

    &:focus-within {
      border-width: 2px;
    }
  }

  // Adjust workspace padding for mobile
  .diary-workspace-v2 {
    @apply p-2 gap-2;
  }

  // Stack metadata items vertically on small screens
  .metadata-section-v2 {
    @apply flex-col items-start;

    .meta-item-v2 {
      @apply w-full;
    }

    .form-input-futuristic.extra-small {
      @apply max-w-full;
    }
  }

  // Make action buttons stack on mobile
  .entry-actions-v2 {
    @apply w-full justify-start;

    button {
      @apply flex-1;
      min-height: 44px; // iOS recommended touch target
    }
  }
}

// Extra small devices (phones in portrait)
@media (max-width: 480px) {
  .content-mode-toggle {
    .mode-btn {
      @apply px-1.5 text-xs;

      span {
        @apply hidden; // Hide text labels on very small screens
      }
    }
  }

  // Full screen editors on very small devices
  .half-height {
    height: 50vh;
    min-height: 200px;
  }

  .title-input-group-v2 .form-input-futuristic.large-title {
    @apply text-lg; // Smaller title font on small screens
  }
}
</style>