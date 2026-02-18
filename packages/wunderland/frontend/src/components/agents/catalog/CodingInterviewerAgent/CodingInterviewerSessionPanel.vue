<template>
  <div class="session-list-panel-interview">
    <div class="panel-header-interview">
      <h3 class="panel-title-interview">Interview History</h3>
      <div class="panel-actions-interview">
        <button
          @click="$emit('clear-all')"
          class="btn-icon-futuristic smallest danger-hover"
          title="Clear All Interview History"
          :disabled="isLoading || !sessions.length"
          aria-label="Clear all interview history"
        >
          <TrashIcon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div class="entry-list-scroll-area-interview">
      <p v-if="isLoading && !sessions.length" class="list-message-interview" aria-live="polite">Loading history...</p>
      <p v-else-if="!sessions.length && !isLoading" class="list-message-interview">No interview sessions found.</p>
      <TransitionGroup v-else name="interview-session-anim" tag="ul" class="space-y-1.5">
        <li
          v-for="session in sessions"
          :key="session.id"
          @click="handleSessionSelect(session.id)"
          @keyup.enter="handleSessionSelect(session.id)"
          class="session-list-item-interview group"
          :class="{ 'active': session.id === activeReviewSessionId, 'editing': isEditingTitle && editingSessionId === session.id }"
          tabindex="0"
          role="button"
          :aria-label="`Select interview: ${session.title}, status ${session.status}, dated ${new Date(session.createdAt).toLocaleDateString()}`"
          :aria-current="session.id === activeReviewSessionId ? 'true' : 'false'"
        >
          <div class="item-flair-interview" :style="{ backgroundColor: getSessionStatusColor(session.status) }" aria-hidden="true"></div>
          <div class="item-content-interview">
            <div v-if="isEditingTitle && editingSessionId === session.id" class="title-edit-input-group-interview">
              <input
                type="text"
                :value="titleEditBuffer"
                @input="$emit('update:title-edit-buffer', ($event.target as HTMLInputElement).value)"
                @keyup.enter="$emit('edit-title-confirm')"
                @keyup.esc="$emit('edit-title-cancel')"
                @blur="$emit('edit-title-confirm')"
                class="title-edit-input-interview form-input-futuristic smallest"
                placeholder="Enter session title"
                aria-label="Edit session title"
                ref="titleInputRef"
              />
            </div>
            <h4 v-else class="item-title-interview" :title="session.title">{{ session.title }}</h4>
            <p class="item-meta-interview">
              Status: <span :class="`status-chip-interview status-${session.status}`">{{ session.status.replace(/_/g, ' ') }}</span> |
              Problems: {{ session.problemSessions.length }} |
              {{ new Date(session.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
            </p>
          </div>
          <div class="item-actions-interview">
            <button
              @click.stop="handleEditTitleStart(session.id)"
              class="btn-icon-futuristic smallest"
              title="Edit Title"
              :aria-label="`Edit title for session ${session.title}`"
              :disabled="isLoading"
            >
              <PencilIcon class="w-3.5 h-3.5"/>
            </button>
            <button
              @click.stop="$emit('delete-session', session.id)"
              class="btn-icon-futuristic smallest danger-hover"
              title="Delete Session"
              :aria-label="`Delete session ${session.title}`"
              :disabled="isLoading"
            >
              <TrashIcon class="w-3.5 h-3.5"/>
            </button>
          </div>
        </li>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, type PropType } from 'vue';
import type { FullInterviewSession } from './CodingInterviewerAgentTypes';
import {
  TrashIcon,
  PencilIcon,
} from '@heroicons/vue/24/solid';

const props = defineProps({
  sessions: { type: Array as PropType<FullInterviewSession[]>, required: true },
  activeReviewSessionId: { type: String as PropType<string | null>, default: null },
  isLoading: { type: Boolean, default: false },
  isEditingTitle: { type: Boolean, default: false },
  titleEditBuffer: { type: String, default: '' },
});

const emit = defineEmits<{
  (e: 'select-session', sessionId: string): void;
  (e: 'delete-session', sessionId: string): void;
  (e: 'clear-all'): void;
  (e: 'edit-title-start', sessionId: string): void;
  (e: 'edit-title-confirm'): void;
  (e: 'edit-title-cancel'): void;
  (e: 'update:title-edit-buffer', value: string): void;
}>();

const titleInputRef = ref<HTMLInputElement | null>(null);
const editingSessionId = ref<string | null>(null); // To track which session's title is being edited

watch(() => props.isEditingTitle, async (isEditing) => {
  if (isEditing && editingSessionId.value) { // Only focus if a session is marked for editing title
    await nextTick();
    titleInputRef.value?.focus();
  }
});

const handleSessionSelect = (sessionId: string) => {
  if (props.isEditingTitle && editingSessionId.value === sessionId) {
    // If clicking on the session already being edited, do nothing or confirm save/cancel
    return;
  }
  emit('select-session', sessionId);
};

const handleEditTitleStart = (sessionId: string) => {
  editingSessionId.value = sessionId; // Set which session's title is being targeted
  emit('edit-title-start', sessionId); // Inform parent
};

const getSessionStatusColor = (status: FullInterviewSession['status']): string => {
  switch (status) {
    case 'completed': return 'hsl(var(--color-success-h, 120), 60%, 65%)';
    case 'in_progress': return 'hsl(var(--color-info-h, 200), 60%, 65%)';
    case 'aborted': return 'hsl(var(--color-warning-h, 40), 60%, 65%)';
    default: return 'hsl(var(--color-text-muted-h, 0), 0%, 70%)';
  }
};

</script>

<style lang="scss" scoped>
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;

.session-list-panel-interview {
  @apply w-full md:w-[300px] lg:w-[360px] p-2.5 flex flex-col shrink-0 overflow-hidden;
  // Use interviewer-specific theme variables, falling back to defaults
  --panel-accent-h: var(--interviewer-accent-h, var(--color-accent-secondary-h, #{var.$default-color-accent-secondary-h}));
  --panel-accent-s: var(--interviewer-accent-s, var(--color-accent-secondary-s, #{var.$default-color-accent-secondary-s}));
  --panel-accent-l: var(--interviewer-accent-l, var(--color-accent-secondary-l, #{var.$default-color-accent-secondary-l}));
  --panel-bg-h: var(--interviewer-bg-h, var(--color-bg-secondary-h, #{var.$default-color-bg-secondary-h}));
  --panel-bg-s: var(--interviewer-bg-s, var(--color-bg-secondary-s, #{var.$default-color-bg-secondary-s}));
  --panel-bg-l: var(--interviewer-bg-l, var(--color-bg-secondary-l, #{var.$default-color-bg-secondary-l}));

  background-color: hsla(var(--panel-bg-h), var(--panel-bg-s), calc(var(--panel-bg-l) + 3%), 0.97);
  border-right: 1px solid hsla(var(--panel-accent-h), var(--panel-accent-s), var(--panel-accent-l), 0.1);
}

.panel-header-interview {
  @apply flex justify-between items-center mb-2 pb-2 border-b shrink-0;
  border-bottom-color: hsla(var(--panel-accent-h), var(--panel-accent-s), var(--panel-accent-l), 0.15);
  .panel-title-interview {
    @apply text-sm font-semibold;
    color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));
  }
  .panel-actions-interview { @apply flex items-center gap-1; }
}

.entry-list-scroll-area-interview {
  @apply flex-grow overflow-y-auto -mr-1 pr-1;
  @include mixins.custom-scrollbar-for-themed-panel('--interviewer'); // Using '--interviewer' prefix
}

.list-message-interview {
  @apply text-center text-xs py-6;
  color: hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l));
}

.interview-session-anim-move,
.interview-session-anim-enter-active,
.interview-session-anim-leave-active {
  transition: all 0.3s var.$ease-out-quint;
}
.interview-session-anim-enter-from,
.interview-session-anim-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}
.interview-session-anim-leave-active {
  position: absolute;
  width: calc(100% - var.$spacing-xs);
}

.session-list-item-interview {
  @apply p-2.5 rounded-lg cursor-pointer transition-all duration-150 ease-out border flex items-start gap-2.5 relative overflow-hidden;
  background-color: hsla(var(--panel-bg-h), var(--panel-bg-s), calc(var(--panel-bg-l) + 6%), 0.75);
  border-color: hsla(var(--panel-accent-h), var(--panel-accent-s), var(--panel-accent-l), 0.1);

  &.active {
    border-color: hsla(var(--panel-accent-h), var(--panel-accent-s), var(--panel-accent-l), 0.5);
    background-color: hsla(var(--panel-accent-h), var(--panel-accent-s), var(--panel-accent-l), 0.12);
    box-shadow: 0 0 0 1.5px hsla(var(--panel-accent-h), var(--panel-accent-s), var(--panel-accent-l), 0.4),
                inset 0 0 10px hsla(var(--panel-accent-h), var(--panel-accent-s), var(--panel-accent-l), 0.08);
  }
  &:hover, &:focus-visible {
    background-color: hsla(var(--panel-accent-h), var(--panel-accent-s), var(--panel-accent-l), 0.08);
    border-color: hsla(var(--panel-accent-h), var(--panel-accent-s), var(--panel-accent-l), 0.3);
    .item-actions-interview { opacity: 1; }
    outline: none;
  }
}

.item-flair-interview {
  @apply absolute left-0 top-0 bottom-0 w-1 opacity-70 transition-all duration-200 rounded-l-lg;
}

.item-content-interview {
  @apply flex-grow min-w-0 pl-1.5; // For flair
  .title-edit-input-group-interview {
    @apply flex items-center w-full; // Allow input to take space
  }
  .title-edit-input-interview.form-input-futuristic.smallest {
    @apply py-0.5 px-1 text-xs h-auto leading-tight flex-grow; // Make input smaller and take available space
  }
  .item-title-interview {
    @apply text-xs font-semibold mb-0.5 truncate;
    color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
  }
  .item-meta-interview {
    @apply text-xxs opacity-80;
    color: hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l));
  }
  .status-chip-interview {
    @apply inline-block px-1.5 py-0.5 rounded-full text-white text-[0.6rem] leading-none font-medium;
    &.status-completed { background-color: hsl(var(--color-success-h), 60%, 55%); }
    &.status-in_progress { background-color: hsl(var(--color-info-h), 60%, 55%); }
    &.status-aborted { background-color: hsl(var(--color-warning-h), 60%, 55%); }
    &.status-not_started { background-color: hsl(var(--color-text-muted-h), 20%, 55%); }
  }
}

.item-actions-interview {
  @apply flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 shrink-0;
  .btn-icon-futuristic.smallest {
    background-color: hsla(var(--panel-bg-h), var(--panel-bg-s), calc(var(--panel-bg-l) + 10%), 0.6);
    backdrop-filter: blur(2px);
    &:hover {
      background-color: hsla(var(--panel-bg-h), var(--panel-bg-s), calc(var(--panel-bg-l) + 15%), 0.8);
    }
  }
}

// Global button styles like .btn-icon-futuristic, .smallest, .danger-hover should be defined in _buttons.scss
// Ensure form-input-futuristic.smallest is also defined or inherits correctly.
</style>