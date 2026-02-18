<template>
  <div class="workflow-panel" v-if="workflow">
    <header class="workflow-header">
      <h3 class="workflow-title">Workflow: {{ workflow.definitionId }}</h3>
      <span :class="['status-pill', statusClass]">{{ statusLabel }}</span>
    </header>
    <section class="workflow-meta">
      <p><strong>ID:</strong> {{ workflow.workflowId }}</p>
      <p v-if="workflow.conversationId"><strong>Conversation:</strong> {{ workflow.conversationId }}</p>
      <p><strong>Updated:</strong> {{ updatedAtLabel }}</p>
    </section>
    <section class="agency-roster" v-if="agencySnapshot">
      <h4 class="agency-heading">Agency Seats</h4>
      <p class="agency-count">{{ agencySeatCount }} seat{{ agencySeatCount === 1 ? '' : 's' }}</p>
      <ul class="agency-seat-list">
        <li v-for="seat in agencySnapshot.seats" :key="seat.roleId">
          <span class="seat-role">{{ seat.roleId }}</span>
          <span class="seat-persona">{{ seat.personaId }}</span>
          <span class="seat-gmi" v-if="seat.gmiInstanceId">({{ seat.gmiInstanceId }})</span>
        </li>
      </ul>
    </section>
    <section class="workflow-tasks" v-if="taskSummary.total > 0">
      <p class="task-summary">
        {{ taskSummary.completed }} / {{ taskSummary.total }} tasks complete
      </p>
      <div class="task-progress">
        <div class="task-progress-bar" :style="{ width: `${progressPercent}%` }"></div>
      </div>
      <ul class="task-list" v-if="taskPreview.length">
        <li v-for="task in taskPreview" :key="task.definitionId">
          <span class="task-name">{{ task.definitionId }}</span>
          <span :class="['task-status', mapTaskStatus(task.status)]">{{ task.status }}</span>
        </li>
      </ul>
    </section>
    <section class="workflow-events" v-if="events.length">
      <h4>Recent activity</h4>
      <ul>
        <li v-for="event in events" :key="event.eventId">
          <time>{{ formatTimestamp(event.timestamp) }}</time>
          <span class="event-type">{{ event.type }}</span>
          <span v-if="event.taskId" class="event-task">(task {{ event.taskId }})</span>
        </li>
      </ul>
    </section>
  </div>
  <div v-else class="workflow-panel workflow-panel--empty">
    <p>No active workflows for this conversation yet.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { WorkflowInstanceFE, WorkflowEventFE } from '@/types/workflow';
import type { AgencySnapshotFE } from '@/types/agency';

const props = defineProps<{
  workflow: WorkflowInstanceFE | null;
  events: WorkflowEventFE[];
  agency?: AgencySnapshotFE | null;
}>();

const statusLabelMap: Record<string, string> = {
  pending: 'Pending',
  running: 'Running',
  awaiting_input: 'Awaiting Input',
  errored: 'Errored',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const statusLabel = computed(() => {
  if (!props.workflow) return 'Idle';
  return statusLabelMap[props.workflow.status] ?? props.workflow.status;
});

const statusClass = computed(() => {
  if (!props.workflow) return 'status-idle';
  switch (props.workflow.status) {
    case 'completed':
      return 'status-completed';
    case 'errored':
    case 'cancelled':
      return 'status-error';
    case 'running':
      return 'status-active';
    case 'awaiting_input':
      return 'status-awaiting';
    default:
      return 'status-pending';
  }
});

const updatedAtLabel = computed(() => {
  if (!props.workflow) return '—';
  try {
    return new Date(props.workflow.updatedAt).toLocaleString();
  } catch {
    return props.workflow.updatedAt;
  }
});

const taskSummary = computed(() => {
  if (!props.workflow) {
    return { total: 0, completed: 0 };
  }
  const tasks = Object.values(props.workflow.tasks ?? {});
  const completed = tasks.filter((task) => task.status === 'completed').length;
  return {
    total: tasks.length,
    completed,
  };
});

const progressPercent = computed(() => {
  if (taskSummary.value.total === 0) return 0;
  return Math.round((taskSummary.value.completed / taskSummary.value.total) * 100);
});

const taskPreview = computed(() => {
  if (!props.workflow) return [] as WorkflowInstanceFE['tasks'][string][];
  return Object.values(props.workflow.tasks ?? {}).slice(0, 5);
});

const agencySnapshot = computed(() => props.agency ?? null);
const agencySeatCount = computed(() => agencySnapshot.value?.seats.length ?? 0);

const mapTaskStatus = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'task-status-completed';
    case 'in_progress':
      return 'task-status-active';
    case 'blocked':
      return 'task-status-blocked';
    case 'failed':
      return 'task-status-error';
    case 'ready':
      return 'task-status-ready';
    default:
      return 'task-status-pending';
  }
};

const events = computed(() => props.events.slice(-10).reverse());

const formatTimestamp = (value: string): string => {
  try {
    return new Date(value).toLocaleTimeString();
  } catch {
    return value;
  }
};
</script>

<style scoped>
.workflow-panel {
  background: hsla(var(--color-surface-elevated-h), var(--color-surface-elevated-s), var(--color-surface-elevated-l), 0.9);
  border: 1px solid hsla(var(--color-border-muted-h), var(--color-border-muted-s), var(--color-border-muted-l), 0.4);
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
  color: var(--color-text-primary);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 260px;
}

.workflow-panel--empty {
  border-style: dashed;
  text-align: center;
  color: var(--color-text-muted);
}

.workflow-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.workflow-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.status-pill {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-active {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.status-completed {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.status-error {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.status-awaiting {
  background: rgba(249, 115, 22, 0.15);
  color: #f97316;
}

.status-pending {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
}

.status-idle {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
}

.workflow-meta p {
  margin: 0;
  font-size: 0.85rem;
}

.workflow-tasks {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.task-summary {
  font-size: 0.85rem;
  margin: 0;
}

.task-progress {
  height: 6px;
  background: rgba(148, 163, 184, 0.2);
  border-radius: 999px;
  overflow: hidden;
}

.task-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #22c55e);
  transition: width 0.3s ease;
}

.task-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.task-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
}

.task-name {
  font-weight: 500;
  color: var(--color-text-primary);
}

.task-status {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.task-status-completed { color: #22c55e; }
.task-status-active { color: #3b82f6; }
.task-status-blocked { color: #f97316; }
.task-status-error { color: #ef4444; }
.task-status-ready { color: #0ea5e9; }
.task-status-pending { color: #94a3b8; }

.workflow-events h4 {
  margin: 0 0 0.3rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.workflow-events ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 120px;
  overflow-y: auto;
}

.agency-roster {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.agency-heading {
  margin: 0 0 0.35rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.agency-count {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.agency-seat-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.agency-seat-list li {
  display: flex;
  gap: 0.4rem;
  align-items: baseline;
  font-size: 0.8rem;
}

.seat-role {
  font-weight: 600;
  color: var(--color-text-primary);
}

.seat-persona {
  color: var(--color-text-secondary);
}

.seat-gmi {
  color: var(--color-text-muted);
  font-size: 0.7rem;
}

.workflow-events li {
  font-size: 0.75rem;
  display: flex;
  gap: 0.35rem;
  align-items: baseline;
}

.workflow-events time {
  color: var(--color-text-muted);
  font-feature-settings: 'tnum';
}

.event-type {
  font-weight: 500;
}

.event-task {
  color: var(--color-text-muted);
}
</style>
