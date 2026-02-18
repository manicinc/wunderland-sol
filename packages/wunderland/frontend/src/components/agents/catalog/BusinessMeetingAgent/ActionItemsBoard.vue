<template>
  <div class="action-items-board-v2">
    <div class="board-header-v2">
      <ClipboardDocumentListIcon class="header-icon-v2" />
      <h2 class="header-title-v2">Global Action Items Kanban</h2>
      <div class="ml-auto flex items-center gap-2">
        <span class="text-xs text-[hsl(var(--color-text-muted-h),var(--color-text-muted-s),var(--color-text-muted-l))]">Group by:</span>
        <select v-model="groupBy" class="form-select-futuristic small short">
          <option value="status">Status</option>
          <option value="priority">Priority</option>
          <option value="sessionId">Meeting Session</option>
        </select>
      </div>
    </div>

    <div class="board-columns-container-v2">
      <div v-for="group in groupedActionItems" :key="group.id" class="board-column-v2">
        <h3 class="column-title-v2">
          {{ group.title }}
          <span class="column-count-v2">{{ group.items.length }}</span>
        </h3>
        <div class="column-items-scroll-area-v2">
          <draggable
            :list="group.items"
            group="actionItems"
            item-key="id"
            class="action-item-drag-list-v2"
            ghost-class="action-item-ghost-v2"
            :animation="200"
            @end="onDragEnd($event, group.id)"
            :data-group-id="group.id"
          >
            <template #item="{ element: item }">
              <div
                class="action-item-card-v2"
                @click="$emit('view-session', item.parentId)"
                :title="`Task: ${item.taskDescription}\nFrom session: ${getSessionTitle(item.parentId)}\nStatus: ${item.status}, Priority: ${item.priority}`"
                tabindex="0"
                role="button"
                :data-id="item.id"
              >
                <div class="card-flair-v2" :style="{ backgroundColor: getActionItemColor(item) }"></div>
                <div class="card-content-v2">
                  <p class="item-description-v2">{{ item.taskDescription }}</p>
                  <div class="item-meta-grid-v2">
                    <span class="meta-label-v2">Assignees:</span>
                    <span class="meta-value-v2 truncate">{{ (item.assignedTo || []).join(', ') || 'N/A' }}</span>

                    <span class="meta-label-v2">Due:</span>
                    <span class="meta-value-v2">{{ item.dueDate || 'N/A' }}</span>

                    <span class="meta-label-v2">Priority:</span>
                    <span class="meta-value-v2 priority-chip-v2" :class="`priority-${item.priority?.toLowerCase()}`">{{ item.priority || 'N/A' }}</span>

                    <span class="meta-label-v2">Status:</span>
                    <span class="meta-value-v2 status-chip-v2" :class="`status-${item.status?.toLowerCase().replace(/\s+/g, '-')}`">{{ item.status || 'N/A' }}</span>
                  </div>
                  <p class="item-session-link-v2" @click.stop="$emit('view-session', item.parentId)">
                    From: {{ getSessionTitle(item.parentId) }}
                  </p>
                </div>
              </div>
            </template>
          </draggable>
          <p v-if="!group.items.length" class="column-empty-message-v2">No items in this section.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Script content remains the same as user provided
import { ref, computed, type PropType } from 'vue';
import type { ActionItem, ActionItemStatus, ActionItemPriority, RichMeetingSession } from './BusinessMeetingAgentTypes';
import { ClipboardDocumentListIcon } from '@heroicons/vue/24/solid';
// @ts-ignore
import draggable from 'vuedraggable';

type GroupById = 'status' | 'priority' | 'sessionId';
interface ActionItemGroup {
  id: string;
  title: string;
  items: ActionItem[];
}

const props = defineProps({
  actionItems: { type: Array as PropType<ActionItem[]>, required: true },
  sessions: { type: Array as PropType<RichMeetingSession[]>, default: () => [] },
});

const emit = defineEmits<{
  (e: 'update-action-item', payload: { sessionId: string; itemId: string; updates: Partial<ActionItem> }): void;
  (e: 'view-session', sessionId: string): void;
}>();

const groupBy = ref<GroupById>('status');

const getSessionTitle = (sessionId: string): string => {
  const session = props.sessions.find(s => s.id === sessionId);
  return session?.title || 'Unknown Session';
};

const groupedActionItems = computed<ActionItemGroup[]>(() => {
  const groups: Record<string, ActionItemGroup> = {};
  const ensureGroup = (id: string, title: string) => {
    if (!groups[id]) {
      groups[id] = { id, title, items: [] };
    }
  };
  props.actionItems.forEach(item => {
    let groupId: string | undefined;
    let groupTitle: string | undefined;
    switch (groupBy.value) {
      case 'status':
        groupId = item.status || 'No Status';
        groupTitle = item.status || 'No Status';
        break;
      case 'priority':
        groupId = item.priority || 'No Priority';
        groupTitle = item.priority || 'No Priority';
        break;
      case 'sessionId':
        groupId = item.parentId;
        groupTitle = getSessionTitle(item.parentId);
        break;
    }
    if(groupId && groupTitle){
        ensureGroup(groupId, groupTitle);
        groups[groupId].items.push(item);
    }
  });
  const sortedGroupArray = Object.values(groups);
  if (groupBy.value === 'status') {
    const statusOrder: ActionItemStatus[] = ['In Progress', 'Open', 'Blocked', 'Completed', 'Cancelled'];
    sortedGroupArray.sort((a, b) => statusOrder.indexOf(a.id as ActionItemStatus) - statusOrder.indexOf(b.id as ActionItemStatus));
  } else if (groupBy.value === 'priority') {
    const priorityOrder: ActionItemPriority[] = ['High', 'Medium', 'Low'];
     sortedGroupArray.sort((a, b) => priorityOrder.indexOf(a.id as ActionItemPriority) - priorityOrder.indexOf(b.id as ActionItemPriority));
  } else if (groupBy.value === 'sessionId') {
    sortedGroupArray.sort((a,b) => {
        const sessionA = props.sessions.find(s => s.id === a.id);
        const sessionB = props.sessions.find(s => s.id === b.id);
        if(sessionA && sessionB) return new Date(sessionB.meetingDate).getTime() - new Date(sessionA.meetingDate).getTime();
        return 0;
    });
  }
  return sortedGroupArray;
});

const onDragEnd = (event: any, targetGroupId: string) => {
  const itemId = event.item?.dataset?.id || event.item?.__draggable_context?.element?.id;
  const originalItem = props.actionItems.find(ai => ai.id === itemId);
  if (!itemId || !originalItem) return;
  const updates: Partial<ActionItem> = {};
  switch (groupBy.value) {
    case 'status':
      if (targetGroupId !== originalItem.status) updates.status = targetGroupId as ActionItemStatus;
      break;
    case 'priority':
      if (targetGroupId !== originalItem.priority) updates.priority = targetGroupId as ActionItemPriority;
      break;
  }
  if (Object.keys(updates).length > 0) {
    emit('update-action-item', { sessionId: originalItem.parentId, itemId, updates });
  }
};

const getActionItemColor = (item: ActionItem): string => {
  if (item.priority === 'High') return 'hsl(var(--color-error-h, 0), 70%, 60%)';
  if (item.priority === 'Medium') return 'hsl(var(--color-warning-h, 40), 70%, 60%)';
  if (item.status === 'Completed') return 'hsl(var(--color-success-h, 130), 70%, 60%)';
  return `hsl(var(--meeting-accent-h, var(--color-accent-primary-h, 200)), 50%, 70%)`;
};
</script>

<style lang="scss" scoped>
// CORRECTED: Changed @import to @use and aliased
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;

.action-items-board-v2 {
  @apply flex flex-col h-full p-3 overflow-hidden;
  --meeting-accent-h: var(--color-accent-secondary-h, #{var.$default-color-accent-secondary-h});
  --meeting-accent-s: var(--color-accent-secondary-s, #{var.$default-color-accent-secondary-s});
  --meeting-accent-l: var(--color-accent-secondary-l, #{var.$default-color-accent-secondary-l});
  --meeting-bg-h: var(--color-bg-primary-h, #{var.$default-color-bg-primary-h});
  --meeting-bg-s: var(--color-bg-primary-s, #{var.$default-color-bg-primary-s});
  --meeting-bg-l: var(--color-bg-primary-l, #{var.$default-color-bg-primary-l});
  background-color: hsl(var(--meeting-bg-h), var(--meeting-bg-s), var(--meeting-bg-l));
}

.board-header-v2 {
  @apply flex items-center gap-3 pb-2 mb-3 border-b shrink-0 px-1;
  border-bottom-color: hsla(var(--meeting-accent-h), var(--meeting-accent-s), var(--meeting-accent-l), 0.2);
  .header-icon-v2 {
    @apply w-5 h-5;
    color: hsl(var(--meeting-accent-h), var(--meeting-accent-s), var(--meeting-accent-l));
  }
  .header-title-v2 {
    @apply font-semibold text-base; // Standard Tailwind
    color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
  }
  .form-select-futuristic.small.short {
    @apply text-xs py-1 px-2 w-32;
    // Ensure form-select-futuristic and its .small & .short variants are globally defined
  }
}

.board-columns-container-v2 {
  @apply flex-grow flex gap-3 overflow-x-auto pb-2;
  // CORRECTED: Use SASS module syntax for mixin
  @include mixins.custom-scrollbar-for-themed-panel('--meeting');
}

.board-column-v2 {
  @apply flex flex-col w-64 md:w-72 shrink-0 rounded-lg p-0 overflow-hidden;
  background-color: hsla(var(--meeting-bg-h), var(--meeting-bg-s), calc(var(--meeting-bg-l) + 3%), 0.8);
  border: 1px solid hsla(var(--meeting-accent-h), var(--meeting-accent-s), var(--meeting-accent-l), 0.1);
  .column-title-v2 {
    @apply font-semibold text-xs p-2 border-b sticky top-0 z-10 backdrop-blur-sm;
    color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));
    background-color: hsla(var(--meeting-bg-h), var(--meeting-bg-s), calc(var(--meeting-bg-l) + 5%), 0.9);
    border-bottom-color: hsla(var(--meeting-accent-h), var(--meeting-accent-s), var(--meeting-accent-l), 0.15);
  }
  .column-count-v2 {
    @apply ml-1.5 px-1.5 py-0.5 rounded-full text-xxs; // Use custom defined .text-xxs
    background-color: hsla(var(--meeting-accent-h), var(--meeting-accent-s), var(--meeting-accent-l), 0.1);
    color: hsl(var(--meeting-accent-h), var(--meeting-accent-s), calc(var(--meeting-accent-l) + 20%));
  }
  .column-items-scroll-area-v2 {
    @apply flex-grow overflow-y-auto p-2;
    // CORRECTED: Use SASS module syntax for mixin
    @include mixins.custom-scrollbar-for-themed-panel('--meeting');
  }
  .action-item-drag-list-v2 { @apply space-y-2 min-h-[50px]; }
  .action-item-ghost-v2 { @apply opacity-50 bg-blue-200 rounded-md; } // Ensure bg-blue-200 is desired or use theme var
  .column-empty-message-v2 {
    @apply p-4 text-center text-xs;
    color: hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l));
  }
}

.action-item-card-v2 {
  @apply p-2.5 rounded-md shadow-sm cursor-grab relative overflow-hidden border border-transparent;
  background-color: hsla(var(--meeting-bg-h), var(--meeting-bg-s), calc(var(--meeting-bg-l) + 7%), 0.95);
  transition: all 0.15s ease-in-out;
  &:hover {
    border-color: hsla(var(--meeting-accent-h), var(--meeting-accent-s), var(--meeting-accent-l), 0.3);
    transform: translateY(-1px);
    box-shadow: var.$shadow-depth-sm; // Use SASS variable for shadow fallback
  }
  .card-flair-v2 { @apply absolute left-0 top-0 bottom-0 w-1 rounded-l-md opacity-80; }
  .card-content-v2 { @apply pl-2; }
  .item-description-v2 {
    @apply text-xs font-medium mb-1.5 leading-snug;
    color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
  }
  .item-meta-grid-v2 {
    @apply grid grid-cols-[auto,1fr] gap-x-2 gap-y-0.5 text-xxs; // Use custom defined .text-xxs
    .meta-label-v2 {
      @apply font-semibold opacity-70;
      color: hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l));
    }
    .meta-value-v2 {
      @apply opacity-90;
      color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));
    }
  }
  .priority-chip-v2, .status-chip-v2 {
    @apply px-1 py-0.5 rounded-full text-white leading-none;
    font-size: 0.6rem; // Even smaller than text-xxs for chips, consider a .text-xxxs or specific style
  }
  .priority-high { background-color: hsl(var(--color-error-h, 0), 70%, 55%); }
  .priority-medium { background-color: hsl(var(--color-warning-h, 40), 70%, 55%); }
  .priority-low { background-color: hsl(var(--color-info-h, 200), 70%, 55%); }
  .status-open, .status-in-progress { background-color: hsl(var(--color-info-h, 200), 60%, 60%); }
  .status-completed { background-color: hsl(var(--color-success-h, 130), 60%, 60%); }
  .status-blocked, .status-cancelled { background-color: hsl(var(--color-text-muted-h, 0), 30%, 60%); }

  .item-session-link-v2 {
    @apply block mt-1.5 italic truncate cursor-pointer text-xxs; // Use custom defined .text-xxs
    color: hsl(var(--meeting-accent-h), var(--meeting-accent-s), calc(var(--meeting-accent-l) + 10%));
    &:hover { text-decoration: underline; }
  }
}
</style>