<!--
  @file HitlInteractionPanel.vue
  @description Main panel for viewing and handling HITL interactions.
  Supports approvals, clarifications, and escalations with rich UI.
  
  @module VCA/Components/HITL
  @version 1.0.0
-->

<template>
  <div class="hitl-panel">
    <!-- Header -->
    <header class="hitl-panel__header">
      <h2 class="hitl-panel__title">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 16v-4"></path>
          <path d="M12 8h.01"></path>
        </svg>
        Human Review Required
      </h2>
      <span v-if="pendingCount > 0" class="hitl-panel__count"> {{ pendingCount }} pending </span>
    </header>

    <!-- Tabs -->
    <nav class="hitl-panel__tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="hitl-panel__tab"
        :class="{ 'hitl-panel__tab--active': activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
        <span v-if="tab.count > 0" class="hitl-panel__tab-count">{{ tab.count }}</span>
      </button>
    </nav>

    <!-- Content -->
    <div class="hitl-panel__content">
      <!-- Loading -->
      <div v-if="isLoading" class="hitl-panel__loading">
        <div class="hitl-panel__spinner"></div>
        <p>Loading interactions...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="hitl-panel__error">
        <p>{{ error }}</p>
        <button @click="refresh" class="hitl-panel__retry-btn">Retry</button>
      </div>

      <!-- Empty -->
      <div v-else-if="currentItems.length === 0" class="hitl-panel__empty">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="hitl-panel__empty-icon"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <p>All caught up!</p>
        <span>No pending {{ activeTab }} requests</span>
      </div>

      <!-- Interactions List -->
      <ul v-else class="hitl-panel__list">
        <li
          v-for="item in currentItems"
          :key="item.interactionId"
          class="hitl-panel__item"
          :class="[
            `hitl-panel__item--${item.severity || 'low'}`,
            { 'hitl-panel__item--selected': selectedId === item.interactionId },
          ]"
          @click="selectItem(item)"
        >
          <div class="hitl-panel__item-header">
            <span class="hitl-panel__item-type">{{ formatType(item.type) }}</span>
            <span
              class="hitl-panel__item-severity"
              :class="`hitl-panel__item-severity--${item.severity || 'low'}`"
            >
              {{ item.severity || 'low' }}
            </span>
          </div>
          <h3 class="hitl-panel__item-title">
            {{ item.title || getDefaultTitle(item) }}
          </h3>
          <p class="hitl-panel__item-desc">
            {{ getTruncatedDescription(item) }}
          </p>
          <div class="hitl-panel__item-meta">
            <span class="hitl-panel__item-time">{{ formatTime(item.createdAt) }}</span>
            <span v-if="item.initiatorId" class="hitl-panel__item-agent">
              from {{ item.initiatorId }}
            </span>
          </div>
        </li>
      </ul>
    </div>

    <!-- Detail Panel / Action Panel -->
    <div v-if="selectedItem" class="hitl-panel__detail">
      <header class="hitl-panel__detail-header">
        <h3>{{ selectedItem.title || getDefaultTitle(selectedItem) }}</h3>
        <button @click="clearSelection" class="hitl-panel__close-btn">&times;</button>
      </header>

      <div class="hitl-panel__detail-body">
        <!-- Approval Detail -->
        <template v-if="selectedItem.type === 'approval'">
          <div class="hitl-panel__section">
            <h4>Proposed Action</h4>
            <pre class="hitl-panel__code">{{
              formatContent((selectedItem as HitlApprovalRequestFE).proposedContent)
            }}</pre>
          </div>
          <div
            v-if="(selectedItem as HitlApprovalRequestFE).justification"
            class="hitl-panel__section"
          >
            <h4>Justification</h4>
            <p>{{ (selectedItem as HitlApprovalRequestFE).justification }}</p>
          </div>
          <div
            v-if="(selectedItem as HitlApprovalRequestFE).alternatives?.length"
            class="hitl-panel__section"
          >
            <h4>Alternatives</h4>
            <ul class="hitl-panel__alternatives">
              <li
                v-for="(alt, idx) in (selectedItem as HitlApprovalRequestFE).alternatives"
                :key="idx"
                class="hitl-panel__alternative"
                :class="{ 'hitl-panel__alternative--selected': selectedAlternative === idx }"
                @click="selectedAlternative = idx"
              >
                {{ formatContent(alt) }}
              </li>
            </ul>
          </div>
        </template>

        <!-- Clarification Detail -->
        <template v-else-if="selectedItem.type === 'clarification'">
          <div class="hitl-panel__section">
            <h4>Question</h4>
            <p class="hitl-panel__question">
              {{ (selectedItem as HitlClarificationRequestFE).question }}
            </p>
          </div>
          <div
            v-if="(selectedItem as HitlClarificationRequestFE).context"
            class="hitl-panel__section"
          >
            <h4>Context</h4>
            <pre class="hitl-panel__code">{{
              formatContent((selectedItem as HitlClarificationRequestFE).context)
            }}</pre>
          </div>
          <div
            v-if="(selectedItem as HitlClarificationRequestFE).options?.length"
            class="hitl-panel__section"
          >
            <h4>Options</h4>
            <div class="hitl-panel__options">
              <button
                v-for="(opt, idx) in (selectedItem as HitlClarificationRequestFE).options"
                :key="idx"
                class="hitl-panel__option"
                :class="{ 'hitl-panel__option--selected': selectedOption === opt }"
                @click="selectedOption = opt"
              >
                {{ opt }}
              </button>
            </div>
          </div>
        </template>

        <!-- Escalation Detail -->
        <template v-else-if="selectedItem.type === 'escalation'">
          <div class="hitl-panel__section">
            <h4>Reason</h4>
            <p>{{ (selectedItem as HitlEscalationRequestFE).reason }}</p>
          </div>
          <div class="hitl-panel__section">
            <h4>Problem</h4>
            <p>{{ (selectedItem as HitlEscalationRequestFE).problemDescription }}</p>
          </div>
          <div
            v-if="(selectedItem as HitlEscalationRequestFE).suggestedActions?.length"
            class="hitl-panel__section"
          >
            <h4>Suggested Actions</h4>
            <ul>
              <li
                v-for="action in (selectedItem as HitlEscalationRequestFE).suggestedActions"
                :key="action"
              >
                {{ action }}
              </li>
            </ul>
          </div>
        </template>

        <!-- Response Input -->
        <div class="hitl-panel__response">
          <label for="hitl-comments">
            {{ selectedItem.type === 'clarification' ? 'Your Answer' : 'Comments (optional)' }}
          </label>
          <textarea
            id="hitl-comments"
            v-model="responseText"
            :placeholder="getPlaceholder()"
            rows="3"
          ></textarea>
        </div>
      </div>

      <!-- Actions -->
      <footer class="hitl-panel__detail-footer">
        <template v-if="selectedItem.type === 'approval'">
          <button
            class="hitl-panel__action-btn hitl-panel__action-btn--reject"
            :disabled="isSubmitting"
            @click="handleReject"
          >
            Reject
          </button>
          <button
            class="hitl-panel__action-btn hitl-panel__action-btn--approve"
            :disabled="isSubmitting"
            @click="handleApprove"
          >
            Approve
          </button>
        </template>
        <template v-else-if="selectedItem.type === 'clarification'">
          <button
            class="hitl-panel__action-btn hitl-panel__action-btn--submit"
            :disabled="isSubmitting || !responseText.trim()"
            @click="handleClarify"
          >
            Submit Answer
          </button>
        </template>
        <template v-else-if="selectedItem.type === 'escalation'">
          <button
            class="hitl-panel__action-btn hitl-panel__action-btn--resolve"
            :disabled="isSubmitting || !responseText.trim()"
            @click="handleResolve"
          >
            Resolve
          </button>
        </template>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @component HitlInteractionPanel
 * @description Panel for reviewing and handling HITL interactions.
 */

import { ref, computed, onMounted } from 'vue';
import { useHitlStore } from '@/store/hitl.store';
import type {
  HitlInteractionFE,
  HitlApprovalRequestFE,
  HitlClarificationRequestFE,
  HitlEscalationRequestFE,
  HitlTypeFE,
} from '@/utils/api';

// ============================================================================
// Store
// ============================================================================

const hitlStore = useHitlStore();

// ============================================================================
// State
// ============================================================================

const activeTab = ref<HitlTypeFE | 'all'>('all');
const selectedId = ref<string | null>(null);
const responseText = ref('');
const selectedOption = ref<string | null>(null);
const selectedAlternative = ref<number | null>(null);
const isSubmitting = ref(false);

// ============================================================================
// Computed
// ============================================================================

const isLoading = computed(() => hitlStore.isLoading);
const error = computed(() => hitlStore.error);
const pendingCount = computed(() => hitlStore.pendingCount);

const tabs = computed(() => [
  { id: 'all' as const, label: 'All', count: hitlStore.pendingCount },
  { id: 'approval' as const, label: 'Approvals', count: hitlStore.pendingApprovals.length },
  {
    id: 'clarification' as const,
    label: 'Clarifications',
    count: hitlStore.pendingClarifications.length,
  },
  { id: 'escalation' as const, label: 'Escalations', count: hitlStore.pendingEscalations.length },
]);

const currentItems = computed(() => {
  if (activeTab.value === 'all') {
    return hitlStore.interactions.filter(i => i.status === 'pending');
  }
  return hitlStore.interactions.filter(i => i.type === activeTab.value && i.status === 'pending');
});

const selectedItem = computed(() =>
  selectedId.value ? hitlStore.interactions.find(i => i.interactionId === selectedId.value) : null
);

// ============================================================================
// Methods
// ============================================================================

function refresh(): void {
  hitlStore.fetchPendingInteractions();
}

function selectItem(item: HitlInteractionFE): void {
  selectedId.value = item.interactionId;
  responseText.value = '';
  selectedOption.value = null;
  selectedAlternative.value = null;
}

function clearSelection(): void {
  selectedId.value = null;
  responseText.value = '';
  selectedOption.value = null;
  selectedAlternative.value = null;
}

function formatType(type: HitlTypeFE): string {
  const labels: Record<HitlTypeFE, string> = {
    approval: '⚡ Approval',
    clarification: '❓ Clarification',
    output_review: '📝 Review',
    escalation: '🚨 Escalation',
    feedback: '💬 Feedback',
    workflow_checkpoint: '🔄 Checkpoint',
  };
  return labels[type] || type;
}

function getDefaultTitle(item: HitlInteractionFE): string {
  if (item.type === 'approval') {
    return 'Action requires approval';
  }
  if (item.type === 'clarification') {
    return 'Clarification needed';
  }
  if (item.type === 'escalation') {
    return 'Issue escalated';
  }
  return 'Interaction pending';
}

function getTruncatedDescription(item: HitlInteractionFE): string {
  let desc = item.instructions || '';
  if (!desc && item.type === 'clarification') {
    desc = (item as HitlClarificationRequestFE).question || '';
  }
  if (!desc && item.type === 'escalation') {
    desc = (item as HitlEscalationRequestFE).problemDescription || '';
  }
  return desc.length > 100 ? desc.slice(0, 100) + '...' : desc;
}

function formatContent(content: string | Record<string, unknown> | undefined): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  return JSON.stringify(content, null, 2);
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return date.toLocaleDateString();
}

function getPlaceholder(): string {
  if (selectedItem.value?.type === 'clarification') {
    return 'Type your answer here...';
  }
  if (selectedItem.value?.type === 'escalation') {
    return 'Describe how you resolved this...';
  }
  return 'Add any comments...';
}

async function handleApprove(): Promise<void> {
  if (!selectedItem.value) return;
  isSubmitting.value = true;
  try {
    const alt =
      selectedAlternative.value !== null && selectedItem.value.type === 'approval'
        ? (selectedItem.value as HitlApprovalRequestFE).alternatives?.[selectedAlternative.value]
        : undefined;
    await hitlStore.approveInteraction(
      selectedItem.value.interactionId,
      true,
      responseText.value || undefined,
      alt
    );
    clearSelection();
  } finally {
    isSubmitting.value = false;
  }
}

async function handleReject(): Promise<void> {
  if (!selectedItem.value) return;
  isSubmitting.value = true;
  try {
    await hitlStore.approveInteraction(
      selectedItem.value.interactionId,
      false,
      responseText.value || undefined
    );
    clearSelection();
  } finally {
    isSubmitting.value = false;
  }
}

async function handleClarify(): Promise<void> {
  if (!selectedItem.value || !responseText.value.trim()) return;
  isSubmitting.value = true;
  try {
    await hitlStore.clarifyInteraction(
      selectedItem.value.interactionId,
      responseText.value,
      selectedOption.value || undefined
    );
    clearSelection();
  } finally {
    isSubmitting.value = false;
  }
}

async function handleResolve(): Promise<void> {
  if (!selectedItem.value || !responseText.value.trim()) return;
  isSubmitting.value = true;
  try {
    await hitlStore.resolveEscalation(selectedItem.value.interactionId, responseText.value, true);
    clearSelection();
  } finally {
    isSubmitting.value = false;
  }
}

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(() => {
  refresh();
});
</script>

<style scoped lang="scss">
.hitl-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg, #fff);
  border-radius: 0.75rem;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
    color: var(--color-text, #1f2937);
  }

  &__count {
    font-size: 0.75rem;
    padding: 0.25rem 0.625rem;
    background: var(--color-accent, #3b82f6);
    color: white;
    border-radius: 9999px;
  }

  &__tabs {
    display: flex;
    gap: 0.25rem;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    overflow-x: auto;
  }

  &__tab {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-text-secondary, #6b7280);
    background: transparent;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: var(--color-bg-secondary, #f3f4f6);
    }

    &--active {
      background: var(--color-accent, #3b82f6);
      color: white;
    }
  }

  &__tab-count {
    font-size: 0.6875rem;
    padding: 0.125rem 0.375rem;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 9999px;
  }

  &__content {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  &__loading,
  &__error,
  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    text-align: center;
    color: var(--color-text-secondary, #6b7280);
  }

  &__spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-border, #e5e7eb);
    border-top-color: var(--color-accent, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  &__retry-btn {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: var(--color-accent, #3b82f6);
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
  }

  &__empty-icon {
    color: var(--color-success, #10b981);
    margin-bottom: 1rem;
  }

  &__list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__item {
    padding: 0.875rem 1rem;
    background: var(--color-bg-secondary, #f9fafb);
    border-radius: 0.5rem;
    border-left: 3px solid transparent;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: var(--color-bg-hover, #f3f4f6);
    }

    &--selected {
      background: var(--color-bg-selected, #eff6ff);
    }

    &--low {
      border-left-color: var(--color-text-muted, #9ca3af);
    }

    &--medium {
      border-left-color: #f59e0b;
    }

    &--high {
      border-left-color: #f97316;
    }

    &--critical {
      border-left-color: #ef4444;
    }
  }

  &__item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.375rem;
  }

  &__item-type {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    color: var(--color-text-muted, #9ca3af);
  }

  &__item-severity {
    font-size: 0.625rem;
    padding: 0.125rem 0.375rem;
    border-radius: 9999px;
    text-transform: uppercase;

    &--low {
      background: var(--color-bg-tertiary, #e5e7eb);
      color: var(--color-text-secondary, #6b7280);
    }

    &--medium {
      background: #fef3c7;
      color: #92400e;
    }

    &--high {
      background: #fed7aa;
      color: #c2410c;
    }

    &--critical {
      background: #fecaca;
      color: #dc2626;
    }
  }

  &__item-title {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0 0 0.25rem;
    color: var(--color-text, #1f2937);
  }

  &__item-desc {
    font-size: 0.8125rem;
    color: var(--color-text-secondary, #6b7280);
    margin: 0 0 0.5rem;
    line-height: 1.4;
  }

  &__item-meta {
    display: flex;
    gap: 0.75rem;
    font-size: 0.6875rem;
    color: var(--color-text-muted, #9ca3af);
  }

  // Detail Panel
  &__detail {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(400px, 90%);
    background: var(--color-bg, #fff);
    border-left: 1px solid var(--color-border, #e5e7eb);
    display: flex;
    flex-direction: column;
    box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
    z-index: 10;
  }

  &__detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);

    h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }
  }

  &__close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--color-text-muted, #9ca3af);
    cursor: pointer;
    line-height: 1;

    &:hover {
      color: var(--color-text, #1f2937);
    }
  }

  &__detail-body {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  &__section {
    margin-bottom: 1.25rem;

    h4 {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted, #9ca3af);
      margin: 0 0 0.5rem;
    }

    p {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.5;
    }
  }

  &__code {
    font-family: 'Fira Code', monospace;
    font-size: 0.75rem;
    background: var(--color-bg-secondary, #f3f4f6);
    padding: 0.75rem;
    border-radius: 0.375rem;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }

  &__question {
    font-size: 1rem;
    font-weight: 500;
    color: var(--color-text, #1f2937);
  }

  &__options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  &__option {
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
    background: var(--color-bg-secondary, #f3f4f6);
    border: 2px solid transparent;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: var(--color-bg-hover, #e5e7eb);
    }

    &--selected {
      border-color: var(--color-accent, #3b82f6);
      background: var(--color-bg-selected, #eff6ff);
    }
  }

  &__alternatives {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__alternative {
    padding: 0.625rem 0.75rem;
    font-size: 0.8125rem;
    background: var(--color-bg-secondary, #f3f4f6);
    border: 2px solid transparent;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: var(--color-bg-hover, #e5e7eb);
    }

    &--selected {
      border-color: var(--color-accent, #3b82f6);
      background: var(--color-bg-selected, #eff6ff);
    }
  }

  &__response {
    margin-top: 1rem;

    label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted, #9ca3af);
      margin-bottom: 0.5rem;
    }

    textarea {
      width: 100%;
      padding: 0.75rem;
      font-size: 0.875rem;
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 0.375rem;
      resize: vertical;
      font-family: inherit;

      &:focus {
        outline: none;
        border-color: var(--color-accent, #3b82f6);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
    }
  }

  &__detail-footer {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    border-top: 1px solid var(--color-border, #e5e7eb);
  }

  &__action-btn {
    flex: 1;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.15s ease;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &--approve,
    &--submit {
      background: var(--color-success, #10b981);
      color: white;

      &:hover:not(:disabled) {
        background: #059669;
      }
    }

    &--reject {
      background: var(--color-bg-secondary, #f3f4f6);
      color: var(--color-text, #1f2937);

      &:hover:not(:disabled) {
        background: #fecaca;
        color: #dc2626;
      }
    }

    &--resolve {
      background: var(--color-accent, #3b82f6);
      color: white;

      &:hover:not(:disabled) {
        background: #2563eb;
      }
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
