<!--
  @file HitlNotificationBadge.vue
  @description Badge component showing pending HITL interaction count.
  Displays critical items with visual urgency indicators.
  
  @module VCA/Components/HITL
  @version 1.0.0
-->

<template>
  <div
    v-if="pendingCount > 0"
    class="hitl-badge"
    :class="badgeClass"
    :title="badgeTitle"
    @click="handleClick"
  >
    <span class="hitl-badge__icon">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
    </span>
    <span class="hitl-badge__count">{{ displayCount }}</span>
    <span v-if="hasCritical" class="hitl-badge__pulse"></span>
  </div>
</template>

<script setup lang="ts">
/**
 * @component HitlNotificationBadge
 * @description Compact badge for displaying pending HITL items.
 *
 * @example
 * <HitlNotificationBadge @click="openHitlPanel" />
 */

import { computed, onMounted, onUnmounted } from 'vue';
import { useHitlStore } from '@/store/hitl.store';

// ============================================================================
// Props & Emits
// ============================================================================

const emit = defineEmits<{
  (e: 'click'): void;
}>();

// ============================================================================
// Store
// ============================================================================

const hitlStore = useHitlStore();

// ============================================================================
// Computed
// ============================================================================

const pendingCount = computed(() => hitlStore.pendingCount);
const hasCritical = computed(() => hitlStore.criticalPending.length > 0);
const pendingBySeverity = computed(() => hitlStore.pendingBySeverity);

/**
 * Display count (shows 99+ for large numbers).
 */
const displayCount = computed(() => {
  const count = pendingCount.value;
  return count > 99 ? '99+' : count.toString();
});

/**
 * Badge CSS class based on severity.
 */
const badgeClass = computed(() => {
  if (pendingBySeverity.value.critical > 0) {
    return 'hitl-badge--critical';
  }
  if (pendingBySeverity.value.high > 0) {
    return 'hitl-badge--high';
  }
  if (pendingBySeverity.value.medium > 0) {
    return 'hitl-badge--medium';
  }
  return 'hitl-badge--low';
});

/**
 * Tooltip text showing breakdown.
 */
const badgeTitle = computed(() => {
  const parts: string[] = [];
  if (pendingBySeverity.value.critical > 0) {
    parts.push(`${pendingBySeverity.value.critical} critical`);
  }
  if (pendingBySeverity.value.high > 0) {
    parts.push(`${pendingBySeverity.value.high} high`);
  }
  if (pendingBySeverity.value.medium > 0) {
    parts.push(`${pendingBySeverity.value.medium} medium`);
  }
  if (pendingBySeverity.value.low > 0) {
    parts.push(`${pendingBySeverity.value.low} low`);
  }
  return `${pendingCount.value} pending: ${parts.join(', ')}`;
});

// ============================================================================
// Methods
// ============================================================================

function handleClick(): void {
  emit('click');
}

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(() => {
  hitlStore.startPolling(30000); // Poll every 30 seconds
});

onUnmounted(() => {
  hitlStore.stopPolling();
});
</script>

<style scoped lang="scss">
.hitl-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }

  &--low {
    background: var(--color-bg-secondary, #e5e7eb);
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
    animation: pulse-border 2s ease-in-out infinite;
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__count {
    min-width: 1rem;
    text-align: center;
  }

  &__pulse {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 8px;
    height: 8px;
    background: #ef4444;
    border-radius: 50%;
    animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: #ef4444;
      border-radius: 50%;
      animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
      animation-delay: 0.5s;
    }
  }
}

@keyframes ping {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  75%,
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

@keyframes pulse-border {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(220, 38, 38, 0);
  }
}
</style>
