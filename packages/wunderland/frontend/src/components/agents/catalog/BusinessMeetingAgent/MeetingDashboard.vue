<template>
  <div class="meeting-dashboard-v2">
    <div class="dashboard-header-v2">
      <ChartBarSquareIcon class="header-icon-v2" />
      <h2 class="header-title-v2">Meeting Agent Dashboard</h2>
    </div>

    <div class="dashboard-grid-v2">
      <div class="dashboard-card-v2 stat-card-v2 col-span-1 md:col-span-2">
        <h3 class="card-title-v2">Session Statistics</h3>
        <div class="stat-grid-v2">
          <div class="stat-item-v2">
            <span class="stat-value-v2">{{ stats.totalSessions }}</span>
            <span class="stat-label-v2">Total Summaries</span>
          </div>
          <div class="stat-item-v2">
            <span class="stat-value-v2">{{ stats.totalActionItems }}</span>
            <span class="stat-label-v2">Total Action Items</span>
          </div>
          <div class="stat-item-v2">
            <span class="stat-value-v2 stat-value-highlight-v2">{{ stats.openActionItems }}</span>
            <span class="stat-label-v2">Open Action Items</span>
          </div>
          <div class="stat-item-v2">
            <span class="stat-value-v2">{{ stats.avgActionItemsPerSession.toFixed(1) }}</span>
            <span class="stat-label-v2">Avg. Actions/Session</span>
          </div>
        </div>
      </div>

      <div class="dashboard-card-v2 quick-actions-card-v2">
        <h3 class="card-title-v2">Quick Actions</h3>
        <div class="actions-grid-v2">
          <button @click="$emit('start-new-summary')" class="btn-futuristic-primary w-full">
            <PlusCircleIcon class="btn-icon-sm" /> New Summary
          </button>
          <button @click="$emit('view-all-actions')" class="btn-futuristic-secondary w-full">
            <ClipboardDocumentCheckIcon class="btn-icon-sm" /> View All Action Items
          </button>
          <input type="text" v-model="quickSearchTerm" @keyup.enter="triggerQuickSearch" placeholder="Quick search summaries..." class="form-input-futuristic small w-full" aria-label="Quick search summaries"/>
        </div>
      </div>

      <div class="dashboard-card-v2 recent-sessions-card-v2 col-span-1 md:col-span-2 lg:col-span-1">
        <h3 class="card-title-v2">Recent Summaries</h3>
        <ul v-if="recentSessions.length" class="content-list-v2">
          <li v-for="session in recentSessions" :key="session.id" @click="$emit('select-session', session.id)" class="list-item-interactive-v2">
            <span class="item-main-text-v2 truncate">{{ session.title }}</span>
            <span class="item-meta-text-v2">{{ new Date(session.updatedAt).toLocaleDateString() }}</span>
          </li>
        </ul>
        <p v-else class="text-xs text-[hsl(var(--color-text-muted-h),var(--color-text-muted-s),var(--color-text-muted-l))] italic">No recent summaries.</p>
      </div>

      <div class="dashboard-card-v2 open-actions-card-v2 col-span-1 md:col-span-2 lg:col-span-2">
        <h3 class="card-title-v2">Urgent: Open Action Items ({{ openActionItems.length }})</h3>
        <div v-if="openActionItems.length" class="content-scroll-area-v2">
          <ul class="content-list-v2 dense">
            <li v-for="item in openActionItems" :key="item.id" @click="$emit('view-session', item.parentId)" class="list-item-interactive-v2 action-item-preview-v2" :title="`Action: ${item.taskDescription}\nFrom session: ${getSessionTitle(item.parentId)}`">
              <ExclamationTriangleIcon class="w-3.5 h-3.5 shrink-0" :class="getActionItemPriorityClass(item.priority)" />
              <div class="truncate flex-grow">
                <span class="item-main-text-v2">{{ item.taskDescription }}</span>
                <span class="item-meta-text-v2 ml-2">(Due: {{ item.dueDate || 'N/A' }}, {{ getSessionTitle(item.parentId) }})</span>
              </div>
              <span class="item-status-chip-v2" :class="`status-${item.status.toLowerCase().replace(/\s+/g, '-')}`">{{ item.status }}</span>
            </li>
          </ul>
        </div>
        <p v-else class="text-xs text-[hsl(var(--color-text-muted-h),var(--color-text-muted-s),var(--color-text-muted-l))] italic">No open action items. Well done!</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Script content remains the same as user provided
import { ref, type PropType } from 'vue';
import type { RichMeetingSession, ActionItem, MeetingDashboardStats, ActionItemPriority } from './BusinessMeetingAgentTypes';
import {
  ChartBarSquareIcon,
  PlusCircleIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/solid';

const props = defineProps({
  stats: { type: Object as PropType<MeetingDashboardStats>, required: true },
  recentSessions: { type: Array as PropType<RichMeetingSession[]>, default: () => [] },
  openActionItems: { type: Array as PropType<ActionItem[]>, default: () => [] },
  sessions: { type: Array as PropType<RichMeetingSession[]>, default: () => [] },
});

const emit = defineEmits<{
  (e: 'select-session', sessionId: string): void;
  (e: 'start-new-summary'): void;
  (e: 'view-all-actions'): void;
  (e: 'quick-search', searchTerm: string): void;
  (e: 'view-session', sessionId: string): void;
}>();

const quickSearchTerm = ref('');

const triggerQuickSearch = () => {
  if (quickSearchTerm.value.trim()) {
    emit('quick-search', quickSearchTerm.value.trim());
  }
};

const getSessionTitle = (sessionId: string): string => {
  const session = props.sessions.find(s => s.id === sessionId);
  return session?.title || 'Unknown Session';
};

const getActionItemPriorityClass = (priority?: ActionItemPriority): string => {
  if (priority === 'High') return 'text-red-500'; // Standard Tailwind color
  if (priority === 'Medium') return 'text-yellow-500'; // Standard Tailwind color
  return 'text-gray-400'; // Standard Tailwind color
};
</script>

<style lang="scss" scoped>
// CORRECTED: Changed @import to @use and aliased
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;

.meeting-dashboard-v2 {
  @apply flex flex-col h-full p-3 overflow-hidden;
  // Use meeting-specific variables if defined in a parent scope for this agent,
  // otherwise fallback to global theme variables for accents and backgrounds.
  --dash-accent-h: var(--meeting-accent-h, var(--color-accent-interactive-h, #{var.$default-color-accent-interactive-h}));
  --dash-accent-s: var(--meeting-accent-s, var(--color-accent-interactive-s, #{var.$default-color-accent-interactive-s}));
  --dash-accent-l: var(--meeting-accent-l, var(--color-accent-interactive-l, #{var.$default-color-accent-interactive-l}));
  --dash-bg-h: var(--meeting-bg-h, var(--color-bg-primary-h, #{var.$default-color-bg-primary-h}));
  --dash-bg-s: var(--meeting-bg-s, var(--color-bg-primary-s, #{var.$default-color-bg-primary-s}));
  --dash-bg-l: var(--meeting-bg-l, var(--color-bg-primary-l, #{var.$default-color-bg-primary-l}));

  background-color: hsl(var(--dash-bg-h), var(--dash-bg-s), var(--dash-bg-l));
}

.dashboard-header-v2 {
  @apply flex items-center gap-3 pb-2 mb-3 border-b shrink-0 px-1;
  border-bottom-color: hsla(var(--dash-accent-h), var(--dash-accent-s), var(--dash-accent-l), 0.2);
  .header-icon-v2 {
    @apply w-6 h-6;
    color: hsl(var(--dash-accent-h), var(--dash-accent-s), var(--dash-accent-l));
  }
  .header-title-v2 {
    @apply font-semibold text-lg; // Standard Tailwind text-lg
    color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
  }
}

.dashboard-grid-v2 {
  @apply flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto;
  // CORRECTED: Use SASS module syntax for mixin
  @include mixins.custom-scrollbar-for-themed-panel('--meeting'); // Assumes '--meeting' is the desired prefix for this panel's theme
}

.dashboard-card-v2 {
  @apply p-3 rounded-xl shadow-lg flex flex-col;
  background-color: hsla(var(--dash-bg-h), var(--dash-bg-s), calc(var(--dash-bg-l) + 4%), 0.9);
  border: 1px solid hsla(var(--dash-accent-h), var(--dash-accent-s), var(--dash-accent-l), 0.15);
  transition: all 0.2s ease-out;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px hsla(var(--shadow-color-h, var.$default-shadow-color-h), var(--shadow-color-s, var.$default-shadow-color-s), var(--shadow-color-l, var.$default-shadow-color-l), 0.15);
  }
  .card-title-v2 {
    @apply text-sm font-semibold mb-2 pb-1.5 border-b;
    color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));
    border-bottom-color: hsla(var(--dash-accent-h), var(--dash-accent-s), var(--dash-accent-l), 0.1);
  }
}

.stat-card-v2 .stat-grid-v2 {
  @apply grid grid-cols-2 sm:grid-cols-4 gap-2 flex-grow items-center;
  .stat-item-v2 {
    @apply flex flex-col items-center justify-center p-2 rounded-md text-center;
    background-color: hsla(var(--dash-bg-h), var(--dash-bg-s), calc(var(--dash-bg-l) + 2%), 0.7);
  }
  .stat-value-v2 {
    @apply text-xl font-bold; // Standard Tailwind
    color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
    &.stat-value-highlight-v2 { color: hsl(var(--dash-accent-h), var(--dash-accent-s), var(--dash-accent-l)); }
  }
  .stat-label-v2 {
    @apply text-xxs; // Use custom defined .text-xxs (defined in _typography.scss / _helpers.scss)
    color: hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l));
  }
}

.quick-actions-card-v2 .actions-grid-v2 {
  @apply flex flex-col gap-2;
  .form-input-futuristic.small { @apply text-xs; } // Ensure .small variant is defined for form-input-futuristic
}

.recent-sessions-card-v2, .open-actions-card-v2 {
  .content-list-v2 { @apply space-y-1.5 flex-grow; }
  .content-scroll-area-v2 {
    @apply flex-grow overflow-y-auto -mr-1 pr-1;
    // CORRECTED: Use SASS module syntax for mixin
    @include mixins.custom-scrollbar-for-themed-panel('--meeting');
  }
  .list-item-interactive-v2 {
    @apply flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer;
    background-color: hsla(var(--dash-bg-h), var(--dash-bg-s), calc(var(--dash-bg-l) + 2%), 0.7);
    border: 1px solid transparent;
    &:hover {
      background-color: hsla(var(--dash-accent-h), var(--dash-accent-s), var(--dash-accent-l), 0.1);
      border-color: hsla(var(--dash-accent-h), var(--dash-accent-s), var(--dash-accent-l), 0.2);
    }
  }
  .item-main-text-v2 { color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l)); }
  .item-meta-text-v2 {
    @apply opacity-70 text-xxs; // Use custom defined .text-xxs
     color: hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l));
  }
}
.open-actions-card-v2 .action-item-preview-v2 {
  .item-status-chip-v2 {
    @apply px-1.5 py-0.5 rounded-full font-medium shrink-0 text-xxs; // Use custom defined .text-xxs
    // Status specific colors can be defined here or via dynamic classes in template
    // e.g. &.status-open { background-color: hsl(var(--color-warning-h), ...); color: ...; }
  }
}
</style>