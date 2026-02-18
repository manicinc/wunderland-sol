<template>
  <div class="meeting-summary-workspace-v2" :class="`mode-${viewMode}`" :aria-live="isLoading ? 'polite' : 'off'">
    <div v-if="isLoading && (!session || viewMode === 'process_notes')" class="workspace-loading-v2">
      <div class="meeting-scribe-spinner large"></div>
      <p>{{ viewMode === 'process_notes' ? 'Processing notes into summary...' : 'Loading summary...' }}</p>
    </div>

    <template v-if="session || (viewMode === 'edit_summary' && currentLocalDraft && session)">
      <div class="workspace-header-v2">
        <div v-if="isEditingTitleInternal && session" class="title-edit-group-v2">
          <input
            type="text"
            v-model="editableTitle"
            placeholder="Meeting Title"
            class="title-input-v2 form-input-futuristic large"
            aria-label="Editable Meeting Title"
            @input="emit('update:title-buffer', ($event.target as HTMLInputElement).value)"
            @keyup.enter="saveTitle"
            @keyup.esc="cancelTitleEdit"
            @blur="saveTitle"
          />
          <button @click="saveTitle" class="btn-futuristic-primary btn-xs ml-2" title="Save Title" aria-label="Save Title"><CheckIcon class="w-4 h-4"/></button>
          <button @click="cancelTitleEdit" class="btn-futuristic-secondary btn-xs ml-1" title="Cancel Title Edit" aria-label="Cancel Title Edit"><XMarkIcon class="w-4 h-4"/></button>
        </div>
        <h2 v-else @dblclick="startTitleEdit" :title="session?.title || 'Meeting Summary'" class="summary-title-display-v2">
          {{ session?.title || (isLoading ? 'Processing...' : 'Meeting Summary') }}
        </h2>

        <div class="workspace-actions-v2">
          <button v-if="session && (viewMode === 'view_summary' || viewMode === 'edit_summary')" @click="startTitleEdit" class="btn-icon-futuristic small" title="Edit Title" aria-label="Edit Title">
            <PencilIcon class="w-4 h-4"/>
          </button>
          <button v-if="session" @click="$emit('download-summary')" class="btn-icon-futuristic small" title="Download Summary (Markdown)" aria-label="Download Summary">
            <ArrowDownTrayIcon class="w-4 h-4"/>
          </button>
          <div class="relative"> <button v-if="session" @click="showExtraActionsMenu = !showExtraActionsMenu" class="btn-icon-futuristic small" title="More Actions" aria-label="More Actions" :aria-expanded="showExtraActionsMenu">
              <EllipsisVerticalIcon class="w-4 h-4"/>
            </button>
            <Transition name="dropdown-float-enhanced">
              <div v-if="showExtraActionsMenu && session" class="extra-actions-menu-v2 card-neo-raised" role="menu" @mouseleave="showExtraActionsMenu = false">
                <button role="menuitem" @click="() => { $emit('request-entity-extraction'); showExtraActionsMenu = false; }">Re-Extract Entities</button>
                <button role="menuitem" @click="() => { $emit('archive-session'); showExtraActionsMenu = false; }">{{ session.isArchived ? 'Unarchive' : 'Archive' }} Session</button>
                <button role="menuitem" @click="() => { $emit('delete-entry'); showExtraActionsMenu = false; }" class="text-danger-ephemeral hover:bg-danger-hover-ephemeral">Delete Summary</button>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <div v-if="session && currentLocalDraft && (viewMode === 'view_summary' || viewMode === 'edit_summary')" class="summary-metadata-editor-v2">
        <div>
          <label class="form-label-v2" :for="`meetingDate-${session.id}`">Meeting Date:</label>
          <input :id="`meetingDate-${session.id}`" type="date" :value="currentLocalDraft.meetingDate || ''" @change="updateDraftField('meetingDate', ($event.target as HTMLInputElement).value)" :disabled="viewMode !== 'edit_summary'" class="form-input-futuristic small"/>
        </div>
        <div>
          <label class="form-label-v2" :for="`meetingTags-${session.id}`">Tags (comma-separated):</label>
          <input :id="`meetingTags-${session.id}`" type="text" :value="(currentLocalDraft.tags || []).join(', ')" @input="updateDraftTags(($event.target as HTMLInputElement).value)" :disabled="viewMode !== 'edit_summary'" class="form-input-futuristic small"/>
        </div>
        <div>
          <label class="form-label-v2" :for="`meetingAttendees-${session.id}`">Attendees (comma-separated):</label>
          <input :id="`meetingAttendees-${session.id}`" type="text" :value="(currentLocalDraft.attendees || []).map(a => a.name).join(', ')" @input="updateDraftAttendees(($event.target as HTMLInputElement).value)" :disabled="viewMode !== 'edit_summary'" class="form-input-futuristic small"/>
        </div>
        <button v-if="viewMode === 'edit_summary'" @click="saveMetadataChanges" class="btn-futuristic-primary btn-xs col-span-full sm:col-span-1 justify-self-start self-end" :disabled="isLoading">Save Metadata</button>
      </div>

      <CompactMessageRenderer
        v-if="displayMarkdown"
        :key="`${session?.id || 'new'}-${session?.updatedAt || ''}-${viewMode}`"
        :content="displayMarkdown"
        :mode="`${agentIdForRenderer}-meetingSummary`"
        class="summary-content-renderer-v2"
        :class="{'opacity-60 blur-sm pointer-events-none': isLoading && viewMode !== 'process_notes'}"
      />
      <div v-else-if="!isLoading && (viewMode === 'view_summary' || viewMode === 'edit_summary')" class="summary-placeholder-v2">
          <p>No summary content available for this meeting.</p>
      </div>

      <div v-if="session && (viewMode === 'view_summary' || viewMode === 'edit_summary')" class="action-items-section-v2">
          <h4 class="section-title-v2">Action Items ({{ (session.actionItems || []).length }})</h4>
          <div v-if="!(session.actionItems && session.actionItems.length)" class="text-xs text-[var(--color-text-muted)] italic py-2">No action items identified for this meeting.</div>
          <ul v-else class="action-item-list-v2">
              <li v-for="item in (session.actionItems || [])" :key="item.id" class="action-item-v2 group">
                  <input type="checkbox" :id="`actionItem-${item.id}`" :checked="item.status === 'Completed'" @change="toggleActionItemStatus(item, $event)" class="form-checkbox-futuristic small mr-2 shrink-0" :disabled="viewMode !== 'edit_summary' && viewMode !== 'view_summary'" />
                  <div class="flex-grow min-w-0">
                      <label :for="`actionItem-${item.id}`" class="cursor-pointer" :class="{'line-through text-[var(--color-text-muted)]': item.status === 'Completed'}">{{ item.taskDescription }}</label>
                      <div class="text-xxs text-[var(--color-text-muted)]">
                          <span v-if="item.assignedTo && item.assignedTo.length">To: {{ item.assignedTo.join(', ') }}</span>
                          <span v-if="item.dueDate"> | Due: {{ item.dueDate }}</span>
                          <span v-if="item.priority"> | Prio: {{ item.priority }}</span>
                      </div>
                  </div>
                  <button @click="editActionItem(item)" class="btn-icon-futuristic smallest opacity-0 group-hover:opacity-100 focus-visible:opacity-100" title="Edit Action Item" aria-label="Edit Action Item" :disabled="viewMode !== 'edit_summary'">
                    <PencilIcon class="w-3 h-3"/>
                  </button>
              </li>
          </ul>
          <button v-if="viewMode === 'edit_summary'" @click="addNewActionItem" class="btn-futuristic-outline btn-xs mt-2">
              <PlusIcon class="w-3 h-3 mr-1"/> Add Action Item
          </button>
      </div>

      <div v-if="session && viewMode === 'view_summary'" class="clarification-section-v2">
        <textarea v-model="clarificationText" placeholder="Have a clarification or something to add to this summary for re-processing?" rows="2" class="form-input-futuristic small w-full" aria-label="Clarification Text"></textarea>
        <button @click="submitClarification" class="btn-futuristic-secondary btn-sm" :disabled="!clarificationText.trim() || isLoading">Add Clarification & Re-Summarize</button>
      </div>
    </template>

    <div v-else-if="!isLoading && viewMode !== 'process_notes' && viewMode !== 'input_new_notes' && viewMode !== 'compose_new_entry'" class="workspace-placeholder-v2">
        <BriefcaseIcon class="w-20 h-20 opacity-10 mb-3"/>
        <p>Select a meeting summary to view or edit, or start a new one from the panel.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Script content remains the same as user provided
import { ref, computed, watch, type PropType, inject } from 'vue';
import type {
  RichMeetingSession,
  MeetingViewMode,
  ActionItem,
  MeetingAttendee,
} from './BusinessMeetingAgentTypes';
import { DEFAULT_MEETING_AGENT_CONFIG } from './BusinessMeetingAgentTypes';
import CompactMessageRenderer from '@/components/layouts/CompactMessageRenderer/CompactMessageRenderer.vue';
import {
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  EllipsisVerticalIcon,
  BriefcaseIcon,
  PlusIcon,
} from '@heroicons/vue/24/solid';
import { useAgentStore } from '@/store/agent.store';
import { generateId } from '@/utils/ids';
import type { ToastService } from '@/services/services';

const props = defineProps({
  session: { type: Object as PropType<RichMeetingSession | null>, default: null },
  isLoading: { type: Boolean, default: false },
  viewMode: { type: String as PropType<MeetingViewMode>, required: true },
  displayMarkdown: { type: String, required: true },
  isEditingTitle: { type: Boolean, default: false },
  titleEditBuffer: { type: String, default: '' },
});

const emit = defineEmits<{
  (e: 'update:title-buffer', value: string): void;
  (e: 'save-title-edit'): void;
  (e: 'cancel-title-edit'): void;
  (e: 'start-title-edit'): void;
  (e: 'request-clarification', text: string): void;
  (e: 'request-entity-extraction'): void;
  (e: 'download-summary'): void;
  (e: 'delete-entry'): void;
  (e: 'archive-session'): void;
  (e: 'update-session-metadata', metadata: Partial<RichMeetingSession>): void;
  (e: 'add-action-item', itemData: Omit<ActionItem, 'id' | 'parentId' | 'createdAt' | 'updatedAt'>): void;
  (e: 'update-action-item', payload: { itemId: string; updates: Partial<ActionItem> }): void;
  (e: 'delete-action-item', itemId: string): void;
  (e: 'edit-action-item-modal', item: ActionItem): void;
}>();

const agentStore = useAgentStore();
const toast = inject<ToastService>('toast');

const agentIdForRenderer = computed(() => agentStore.activeAgentId || 'meeting-scribe-generic');

const clarificationText = ref('');
const showExtraActionsMenu = ref(false);

const editableTitle = ref('');
const currentLocalDraft = ref<Partial<RichMeetingSession> | null>(null);
const isEditingTitleInternal = ref(false);

watch(() => props.session, (newSession) => {
  if (newSession) {
    currentLocalDraft.value = {
      id: newSession.id,
      title: newSession.title,
      meetingDate: newSession.meetingDate,
      tags: [...(newSession.tags || [])],
      attendees: (newSession.attendees || []).map(att => ({ ...att })),
    };
    editableTitle.value = newSession.title;
  } else {
    currentLocalDraft.value = null;
    editableTitle.value = '';
  }
}, { immediate: true, deep: true });

watch(() => props.isEditingTitle, (newVal) => {
  isEditingTitleInternal.value = newVal;
  if (newVal && props.session) {
    editableTitle.value = props.session.title;
  } else if (!newVal) {
    if (props.session) editableTitle.value = props.session.title;
  }
});

watch(() => props.titleEditBuffer, (newVal) => {
  if (isEditingTitleInternal.value) {
    editableTitle.value = newVal;
  }
});

const startTitleEdit = (): void => {
  if (props.session && !isEditingTitleInternal.value) {
    emit('start-title-edit');
  }
};

const saveTitle = (): void => {
  if (isEditingTitleInternal.value) {
    emit('update:title-buffer', editableTitle.value);
    emit('save-title-edit');
  }
};

const cancelTitleEdit = (): void => {
  if (isEditingTitleInternal.value) {
    emit('cancel-title-edit');
  }
};

const updateDraftField = (field: keyof Pick<RichMeetingSession, 'meetingDate'>, value: any): void => {
  if (currentLocalDraft.value && props.viewMode === 'edit_summary') {
    (currentLocalDraft.value as any)[field] = value;
  }
};

const updateDraftTags = (tagsString: string): void => {
  if (currentLocalDraft.value && props.viewMode === 'edit_summary') {
    currentLocalDraft.value.tags = tagsString.split(',').map(t => t.trim()).filter(t => t);
  }
};

const updateDraftAttendees = (attendeesString: string): void => {
    if (currentLocalDraft.value && props.viewMode === 'edit_summary') {
        currentLocalDraft.value.attendees = attendeesString.split(',')
            .map(name => name.trim())
            .filter(name => name)
            .map(name => {
                const existingAttendee = props.session?.attendees?.find(a => a.name === name);
                return existingAttendee ? { ...existingAttendee } : { id: generateId(), name };
            });
    }
};

const saveMetadataChanges = (): void => {
  if (currentLocalDraft.value && props.session && props.viewMode === 'edit_summary') {
    const metadataUpdate: Partial<RichMeetingSession> = {
      meetingDate: currentLocalDraft.value.meetingDate,
      tags: currentLocalDraft.value.tags,
      attendees: currentLocalDraft.value.attendees,
    };
    emit('update-session-metadata', metadataUpdate);
  }
};

const submitClarification = (): void => {
  if (clarificationText.value.trim() && props.session) {
    emit('request-clarification', clarificationText.value.trim());
    clarificationText.value = '';
  }
};

const toggleActionItemStatus = (item: ActionItem, event: Event): void => {
  if (!props.session) return;
  const newStatus = (event.target as HTMLInputElement).checked ? 'Completed' : 'Open';
  emit('update-action-item', { itemId: item.id, updates: { status: newStatus } });
};

const addNewActionItem = (): void => {
  if (!props.session) return;
  const taskDescription = prompt("Enter new action item description:");
  if (taskDescription && taskDescription.trim()) {
    const newItemData: Omit<ActionItem, 'id' | 'parentId' | 'createdAt' | 'updatedAt'> = {
      taskDescription: taskDescription.trim(),
      assignedTo: [],
      status: 'Open',
      priority: DEFAULT_MEETING_AGENT_CONFIG.defaultActionItemPriority,
    };
    emit('add-action-item', newItemData);
  }
};

const editActionItem = (item: ActionItem): void => {
  if (!props.session) return;
  emit('edit-action-item-modal', item);
};

// Add your dropdown transition name if it's different or specific
// Ensure 'dropdown-float-enhanced-enter-active', etc. keyframes/transitions are defined in your global styles.
</script>

<style lang="scss" scoped>
// CORRECTED: Changed @import to @use and aliased
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins; // For custom-scrollbar-for-themed-panel

.meeting-summary-workspace-v2 {
  @apply flex-grow flex flex-col overflow-hidden relative;
  background-color: hsl(var(--meeting-bg-h, var.$default-color-bg-primary-h), var(--meeting-bg-s, var.$default-color-bg-primary-s), var(--meeting-bg-l, var.$default-color-bg-primary-l));
}

.workspace-loading-v2 {
  @apply absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 z-10;
  background-color: hsla(var(--meeting-bg-h, var.$default-color-bg-primary-h), var(--meeting-bg-s, var.$default-color-bg-primary-s), calc(var(--meeting-bg-l, #{var.$default-color-bg-primary-l}) + 5%), 0.8);
  backdrop-filter: blur(4px);
  color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));
  .meeting-scribe-spinner.large {
    @apply w-12 h-12; // Assuming spinner style exists or defined elsewhere
    // Basic spinner fallback:
    // border: 4px solid hsla(var(--meeting-accent-h), var(--meeting-accent-s), var(--meeting-accent-l), 0.2);
    // border-top-color: hsl(var(--meeting-accent-h), var(--meeting-accent-s), var(--meeting-accent-l));
    // border-radius: 50%;
    // animation: spin 1s linear infinite; // Ensure 'spin' keyframe is defined
  }
}

.workspace-header-v2 {
  @apply flex items-center justify-between p-2.5 px-3 border-b shrink-0 gap-2;
  background-color: hsla(var(--meeting-bg-h, var.$default-color-bg-primary-h), var(--meeting-bg-s, var.$default-color-bg-primary-s), calc(var(--meeting-bg-l, #{var.$default-color-bg-primary-l}) + 2%), 0.9);
  border-bottom-color: hsla(var(--meeting-accent-h, var.$default-color-accent-interactive-h), var(--meeting-accent-s, var.$default-color-accent-interactive-s), var(--meeting-accent-l, var.$default-color-accent-interactive-l), 0.1);

  .title-edit-group-v2 {
    @apply flex-grow flex items-center;
  }
  .title-input-v2.form-input-futuristic.large {
    @apply text-base font-semibold flex-grow;
    // Additional specific styles for title input might be needed if form-input-futuristic isn't enough
  }
  .summary-title-display-v2 {
    @apply text-base font-semibold truncate cursor-pointer py-1;
    color: hsl(var(--meeting-accent-h, var.$default-color-accent-interactive-h), var(--meeting-accent-s, var.$default-color-accent-interactive-s), calc(var(--meeting-accent-l, #{var.$default-color-accent-interactive-l}) + 15%));
    flex-grow: 1;
    min-width: 0;
    &:hover { text-decoration: underline dashed hsla(var(--meeting-accent-h, var.$default-color-accent-interactive-h), var(--meeting-accent-s, var.$default-color-accent-interactive-s), calc(var(--meeting-accent-l, #{var.$default-color-accent-interactive-l}) + 15%), 0.5); }
  }
  .workspace-actions-v2 {
    @apply flex items-center gap-1 shrink-0; // Removed relative from here
    .extra-actions-menu-v2 {
      @apply absolute top-full right-0 mt-1 py-1 w-48 rounded-md shadow-lg z-20;
      // Assuming card-neo-raised provides appropriate background and border.
      // If not, define them here:
      background-color: hsl(var(--meeting-bg-h, var.$default-color-bg-primary-h), var(--meeting-bg-s, var.$default-color-bg-primary-s), calc(var(--meeting-bg-l, #{var.$default-color-bg-primary-l}) + 8%));
      border: 1px solid hsla(var(--meeting-accent-h, var.$default-color-accent-interactive-h), var(--meeting-accent-s, var.$default-color-accent-interactive-s), var(--meeting-accent-l, var.$default-color-accent-interactive-l), 0.2);

      button {
        @apply block w-full text-left px-3 py-1.5 text-xs hover:opacity-80 transition-opacity;
        color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));
        &:hover {
          background-color: hsla(var(--meeting-accent-h, var.$default-color-accent-interactive-h), var(--meeting-accent-s, var.$default-color-accent-interactive-s), var(--meeting-accent-l, var.$default-color-accent-interactive-l), 0.1);
        }
        &.text-danger-ephemeral { // For Tailwind JIT to pick up arbitrary values, they might need to be fully specified or use theme colors
           color: hsl(var(--color-danger-h, var.$default-color-error-h), var(--color-danger-s, var.$default-color-error-s), var(--color-danger-l, var.$default-color-error-l)) !important;
           &:hover {
             background-color: hsla(var(--color-danger-h, var.$default-color-error-h), var(--color-danger-s, var.$default-color-error-s), var(--color-danger-l, var.$default-color-error-l), 0.1) !important;
           }
        }
      }
    }
  }
}

.summary-metadata-editor-v2 {
  @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-3 gap-y-2 p-2.5 text-xs border-b shrink-0 items-end;
  background-color: hsla(var(--meeting-bg-h, var.$default-color-bg-primary-h), var(--meeting-bg-s, var.$default-color-bg-primary-s), calc(var(--meeting-bg-l, #{var.$default-color-bg-primary-l}) + 0.5%), 0.85);
  border-bottom-color: hsla(var(--meeting-accent-h, var.$default-color-accent-interactive-h), var(--meeting-accent-s, var.$default-color-accent-interactive-s), var(--meeting-accent-l, var.$default-color-accent-interactive-l), 0.08);
  .form-label-v2 {
    @apply text-xxs font-medium mb-0.5 block; // text-xxs is now defined in _typography.scss
    color: hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l));
  }
  .form-input-futuristic.small { font-size: 0.7rem; padding: 0.3rem 0.5rem;} // Ensure this matches actual desired size
}

.summary-content-renderer-v2 {
  @apply flex-grow overflow-y-auto p-3 md:p-4;
  // CORRECTED: Call mixin with the new SASS module syntax
  @include mixins.custom-scrollbar-for-themed-panel('--meeting');
}

.workspace-placeholder-v2, .summary-placeholder-v2 {
  @apply flex-grow flex flex-col items-center justify-center p-6 text-center;
  color: hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l));
  p { @apply text-sm; }
}
.summary-placeholder-v2 {
  @apply py-10;
}

.action-items-section-v2 {
  @apply p-3 border-t mt-auto shrink-0;
  max-height: 35vh;
  overflow-y: auto;
  @include mixins.custom-scrollbar-for-themed-panel('--meeting');
  background-color: hsla(var(--meeting-bg-h, var.$default-color-bg-primary-h), var(--meeting-bg-s, var.$default-color-bg-primary-s), calc(var(--meeting-bg-l, #{var.$default-color-bg-primary-l}) + 1%), 0.8);
  border-top-color: hsla(var(--meeting-accent-h, var.$default-color-accent-interactive-h), var(--meeting-accent-s, var.$default-color-accent-interactive-s), var(--meeting-accent-l, var.$default-color-accent-interactive-l), 0.1);
  .section-title-v2 {
    @apply text-xs font-semibold uppercase tracking-wider mb-1.5;
    color: hsl(var(--meeting-accent-h, var.$default-color-accent-interactive-h), var(--meeting-accent-s, var.$default-color-accent-interactive-s), calc(var(--meeting-accent-l, #{var.$default-color-accent-interactive-l}) + 10%));
  }
}
.action-item-list-v2 { @apply space-y-1; }
.action-item-v2 {
  @apply flex items-start gap-2 p-1.5 rounded text-xs;
  background-color: hsla(var(--meeting-bg-h, var.$default-color-bg-primary-h), var(--meeting-bg-s, var.$default-color-bg-primary-s), calc(var(--meeting-bg-l, #{var.$default-color-bg-primary-l}) + 4%), 0.7);
  border: 1px solid hsla(var(--meeting-accent-h, var.$default-color-accent-interactive-h), var(--meeting-accent-s, var.$default-color-accent-interactive-s), var(--meeting-accent-l, var.$default-color-accent-interactive-l), 0.1);
  &:hover { background-color: hsla(var(--meeting-bg-h, var.$default-color-bg-primary-h), var(--meeting-bg-s, var.$default-color-bg-primary-s), calc(var(--meeting-bg-l, #{var.$default-color-bg-primary-l}) + 6%), 0.8); }
  .form-checkbox-futuristic.small { @apply w-3.5 h-3.5 mt-0.5; }
  label { // Applied to the text label for the checkbox for better click area
    @apply cursor-pointer;
  }
}

.clarification-section-v2 {
  @apply p-3 border-t shrink-0 flex flex-col gap-2;
  background-color: hsla(var(--meeting-bg-h, var.$default-color-bg-primary-h), var(--meeting-bg-s, var.$default-color-bg-primary-s), calc(var(--meeting-bg-l, #{var.$default-color-bg-primary-l}) + 1.5%), 0.85);
  border-top-color: hsla(var(--meeting-accent-h, var.$default-color-accent-interactive-h), var(--meeting-accent-s, var.$default-color-accent-interactive-s), var(--meeting-accent-l, var.$default-color-accent-interactive-l), 0.1);
  textarea { min-height: 60px; }
  button { @apply self-end; }
}

// Dropdown transition styles
.dropdown-float-enhanced-enter-active,
.dropdown-float-enhanced-leave-active {
  transition: opacity 0.25s var.$ease-out-quint, transform 0.3s var.$ease-elastic;
}
.dropdown-float-enhanced-enter-from,
.dropdown-float-enhanced-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.94);
}
</style>