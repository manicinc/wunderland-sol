<template>
  <Transition name="modal-fade-futuristic">
    <div v-if="item" class="modal-backdrop-futuristic" @click.self="cancel">
      <div class="modal-content-futuristic action-item-edit-modal-v2">
        <div class="modal-header-futuristic">
          <h3 class="modal-title-futuristic">
            <PencilSquareIcon class="w-5 h-5 mr-2 inline" /> {{ isNewItem ? 'Add New Action Item' : 'Edit Action Item' }}
          </h3>
          <button @click="cancel" class="btn-modal-close-futuristic" aria-label="Close modal">&times;</button>
        </div>
        <div class="modal-body-futuristic">
          <div class="form-grid-v2">
            <div class="sm:col-span-2">
              <label for="aiTaskDesc" class="form-label-v2">Task Description:</label>
              <textarea id="aiTaskDesc" v-model="editableItem.taskDescription" class="form-input-futuristic" rows="3"></textarea>
            </div>
            <div>
              <label for="aiAssignedTo" class="form-label-v2">Assigned To (comma-separated):</label>
              <input id="aiAssignedTo" type="text" v-model="assignedToString" class="form-input-futuristic" :list="attendees.length ? 'attendeeDatalist' : undefined" />
              <datalist v-if="attendees.length" id="attendeeDatalist">
                <option v-for="att in attendees" :key="att.id" :value="att.name"></option>
              </datalist>
            </div>
            <div>
              <label for="aiDueDate" class="form-label-v2">Due Date:</label>
              <input id="aiDueDate" type="date" v-model="editableItem.dueDate" class="form-input-futuristic" />
            </div>
            <div>
              <label for="aiStatus" class="form-label-v2">Status:</label>
              <select id="aiStatus" v-model="editableItem.status" class="form-select-futuristic">
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Blocked">Blocked</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label for="aiPriority" class="form-label-v2">Priority:</label>
              <select id="aiPriority" v-model="editableItem.priority" class="form-select-futuristic">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label for="aiNotes" class="form-label-v2">Notes:</label>
              <textarea id="aiNotes" v-model="editableItem.notes" class="form-input-futuristic" rows="2"></textarea>
            </div>
            <div class="sm:col-span-2" v-if="editableItem.status === 'Blocked'">
              <label for="aiBlocker" class="form-label-v2">Blocker Reason:</label>
              <input id="aiBlocker" type="text" v-model="editableItem.blockerReason" class="form-input-futuristic" />
            </div>
          </div>
        </div>
        <div class="modal-footer-futuristic">
          <button @click="cancel" class="btn-futuristic-secondary btn-sm">Cancel</button>
          <button @click="save" class="btn-futuristic-primary btn-sm" :disabled="!editableItem.taskDescription?.trim()">
            <CheckCircleIcon class="btn-icon-sm"/> {{ isNewItem ? 'Add Item' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, type PropType, computed } from 'vue';
import type { ActionItem, MeetingAttendee } from './BusinessMeetingAgentTypes'; // Removed unused Status/Priority
import { PencilSquareIcon, CheckCircleIcon } from '@heroicons/vue/24/solid';
import { DEFAULT_MEETING_AGENT_CONFIG } from './BusinessMeetingAgentTypes';

const props = defineProps({
  item: { type: Object as PropType<ActionItem | null>, default: null },
  sessionId: { type: String, required: true },
  attendees: { type: Array as PropType<MeetingAttendee[]>, default: () => [] },
});

const emit = defineEmits<{
  (e: 'save', itemData: Omit<ActionItem, 'id' | 'parentId' | 'createdAt' | 'updatedAt'> | ActionItem): void;
  (e: 'cancel'): void;
}>();

const isNewItem = computed(() => !props.item || !props.item.id);

const editableItem = ref<Partial<ActionItem>>({});
const assignedToString = ref('');

watch(() => props.item, (newItem) => {
  if (newItem) {
    editableItem.value = { ...newItem };
    assignedToString.value = (newItem.assignedTo || []).join(', ');
  } else {
    editableItem.value = {
      taskDescription: '',
      assignedTo: [],
      status: DEFAULT_MEETING_AGENT_CONFIG.defaultActionItemStatus,
      priority: DEFAULT_MEETING_AGENT_CONFIG.defaultActionItemPriority,
      dueDate: '',
      notes: '',
      blockerReason: ''
    };
    assignedToString.value = '';
  }
}, { immediate: true, deep: true });

const save = () => {
  const finalItemData = {
    ...editableItem.value,
    assignedTo: assignedToString.value.split(',').map(s => s.trim()).filter(s => s),
  };
  Object.keys(finalItemData).forEach(key => {
    if (finalItemData[key as keyof typeof finalItemData] === undefined) {
      delete finalItemData[key as keyof typeof finalItemData];
    }
  });

  if (isNewItem.value) {
    emit('save', finalItemData as Omit<ActionItem, 'id' | 'parentId' | 'createdAt' | 'updatedAt'>);
  } else {
    emit('save', finalItemData as ActionItem);
  }
};

const cancel = () => {
  emit('cancel');
};
</script>

<style lang="scss" scoped>
// CORRECTED: Changed @import to @use
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins; // For custom-scrollbar-for-themed-panel

.action-item-edit-modal-v2 {
  max-width: 600px;
}

.modal-body-futuristic {
  max-height: 75vh; // Consider using dvh for dynamic viewport height
  overflow-y: auto;
  // CORRECTED: Ensure mixin is called with the new syntax if using an alias
  @include mixins.custom-scrollbar-for-themed-panel('--meeting');
}

.form-grid-v2 {
  // Tailwind classes are applied directly in the template for grid layout.
  // No need for @apply grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm; here.
  // REMOVED: .col-span-2 { @apply sm:col-span-2; } // This rule was problematic and redundant.
  // Apply `sm:col-span-2` directly to child divs in the template if they need to span two columns.
  @apply grid grid-cols-1 gap-x-4 gap-y-3 text-sm; // Base is 1 column
  @media (min-width: var.$breakpoint-sm) { // Use SASS variable for breakpoint
    @apply grid-cols-2; // Becomes 2 columns on sm screens
  }
}

.form-label-v2 {
  @apply block text-xs font-medium mb-1;
  color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));
}

/* Other global styles like .form-input-futuristic, .btn-futuristic-*, etc., are assumed to be defined globally. */
/* Ensure your modal transition 'modal-fade-futuristic' is defined in your animations SCSS. */
.modal-fade-futuristic-enter-active,
.modal-fade-futuristic-leave-active {
  transition: opacity 0.3s ease;
}
.modal-fade-futuristic-enter-from,
.modal-fade-futuristic-leave-to {
  opacity: 0;
}
</style>