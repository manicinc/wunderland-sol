<script setup lang="ts">
/**
 * @file AdminMetricsDashboard.vue
 * @description Admin dashboard for viewing system metrics, evaluation results,
 * and usage analytics. Provides insights into agent performance and system health.
 */

import { ref, computed, onMounted } from 'vue';
import { useAdminMetricsStore } from '@/store/adminMetrics.store';
import { storeToRefs } from 'pinia';

// Store
const adminStore = useAdminMetricsStore();
const {
  systemMetrics,
  evaluationRuns,
  usageHistory,
  isLoading,
  loadError,
  latestEvaluationRun,
  overallPassRate,
  totalUsageCost,
} = storeToRefs(adminStore);

// Selected period for usage chart
const usagePeriod = ref<'day' | 'week' | 'month'>('week');

// Format helpers
const formatNumber = (num: number | undefined): string => {
  if (num === undefined) return '-';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatPercent = (num: number | undefined): string => {
  if (num === undefined) return '-';
  return `${num.toFixed(1)}%`;
};

const formatCurrency = (num: number | undefined): string => {
  if (num === undefined) return '-';
  return `$${num.toFixed(2)}`;
};

const formatDuration = (ms: number | undefined): string => {
  if (ms === undefined) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

// Status helpers
const getEvalStatusClass = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-green-500/20 text-green-400';
    case 'failed':
      return 'bg-red-500/20 text-red-400';
    case 'running':
      return 'bg-yellow-500/20 text-yellow-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
};

const getScoreColor = (score: number): string => {
  if (score >= 0.8) return 'text-green-400';
  if (score >= 0.6) return 'text-yellow-400';
  return 'text-red-400';
};

// Computed for chart data
const usageChartData = computed(() => {
  return usageHistory.value.map(u => ({
    label: u.period,
    conversations: u.conversations,
    messages: u.messages,
    cost: u.costUSD,
  }));
});

// Actions
const refreshMetrics = async () => {
  await adminStore.fetchAllMetrics(true);
};

const changePeriod = async (period: 'day' | 'week' | 'month') => {
  usagePeriod.value = period;
  await adminStore.fetchUsageHistory(period);
};

// Lifecycle
onMounted(async () => {
  await adminStore.fetchAllMetrics();
});
</script>

<template>
  <div class="admin-dashboard">
    <!-- Header -->
    <header class="dashboard-header">
      <div>
        <h1 class="text-2xl font-bold">Admin Dashboard</h1>
        <p class="text-muted text-sm">System metrics, evaluations, and usage analytics</p>
      </div>
      <button class="btn-refresh" :disabled="isLoading" @click="refreshMetrics">
        <svg class="icon" :class="{ 'animate-spin': isLoading }" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"
          />
        </svg>
        Refresh
      </button>
    </header>

    <!-- Error Banner -->
    <div v-if="loadError" class="error-banner">
      {{ loadError }}
    </div>

    <!-- System Metrics Cards -->
    <section class="metrics-grid">
      <div class="metric-card">
        <div class="metric-icon bg-blue-500/20 text-blue-400">
          <svg viewBox="0 0 24 24" class="w-6 h-6">
            <path
              fill="currentColor"
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
            />
          </svg>
        </div>
        <div class="metric-content">
          <span class="metric-value">{{ formatNumber(systemMetrics?.activeUsers) }}</span>
          <span class="metric-label">Active Users</span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon bg-green-500/20 text-green-400">
          <svg viewBox="0 0 24 24" class="w-6 h-6">
            <path
              fill="currentColor"
              d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"
            />
          </svg>
        </div>
        <div class="metric-content">
          <span class="metric-value">{{ formatNumber(systemMetrics?.totalConversations) }}</span>
          <span class="metric-label">Conversations</span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon bg-purple-500/20 text-purple-400">
          <svg viewBox="0 0 24 24" class="w-6 h-6">
            <path
              fill="currentColor"
              d="M13 9h-2v2H9v2h2v2h2v-2h2v-2h-2V9zm6-4h-4.18C14.4 3.84 13.3 3 12 3c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-7-.25c.41 0 .75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75z"
            />
          </svg>
        </div>
        <div class="metric-content">
          <span class="metric-value">{{ systemMetrics?.agentsDeployed }}</span>
          <span class="metric-label">Deployed Agents</span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon bg-yellow-500/20 text-yellow-400">
          <svg viewBox="0 0 24 24" class="w-6 h-6">
            <path
              fill="currentColor"
              d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"
            />
          </svg>
        </div>
        <div class="metric-content">
          <span class="metric-value">{{ formatDuration(systemMetrics?.avgResponseTimeMs) }}</span>
          <span class="metric-label">Avg Response</span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon bg-emerald-500/20 text-emerald-400">
          <svg viewBox="0 0 24 24" class="w-6 h-6">
            <path
              fill="currentColor"
              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
            />
          </svg>
        </div>
        <div class="metric-content">
          <span class="metric-value">{{ formatPercent(systemMetrics?.evaluationPassRate) }}</span>
          <span class="metric-label">Eval Pass Rate</span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon bg-rose-500/20 text-rose-400">
          <svg viewBox="0 0 24 24" class="w-6 h-6">
            <path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
        </div>
        <div class="metric-content">
          <span class="metric-value">{{ formatPercent(systemMetrics?.errorRate) }}</span>
          <span class="metric-label">Error Rate</span>
        </div>
      </div>
    </section>

    <!-- Main Content Grid -->
    <div class="content-grid">
      <!-- Evaluation Runs -->
      <section class="panel">
        <header class="panel-header">
          <h2 class="text-lg font-semibold">Recent Evaluations</h2>
          <span class="text-sm text-muted">
            Overall: {{ formatPercent(overallPassRate) }} pass rate
          </span>
        </header>

        <div v-if="evaluationRuns.length === 0" class="empty-state">No evaluation runs yet</div>

        <ul class="eval-list">
          <li v-for="run in evaluationRuns" :key="run.id" class="eval-item">
            <div class="eval-status">
              <span class="status-badge" :class="getEvalStatusClass(run.status)">
                {{ run.status }}
              </span>
            </div>
            <div class="eval-info">
              <span class="eval-name">{{ run.name }}</span>
              <span class="eval-date text-muted text-sm">
                {{ new Date(run.startedAt).toLocaleDateString() }}
              </span>
            </div>
            <div class="eval-results">
              <span class="text-green-400">{{ run.passedTests }}</span>
              <span class="text-muted">/</span>
              <span class="text-red-400">{{ run.failedTests }}</span>
            </div>
            <div class="eval-score" :class="getScoreColor(run.averageScore)">
              {{ formatPercent(run.averageScore * 100) }}
            </div>
          </li>
        </ul>
      </section>

      <!-- Usage Chart -->
      <section class="panel">
        <header class="panel-header">
          <h2 class="text-lg font-semibold">Usage Analytics</h2>
          <div class="period-selector">
            <button :class="{ active: usagePeriod === 'day' }" @click="changePeriod('day')">
              Day
            </button>
            <button :class="{ active: usagePeriod === 'week' }" @click="changePeriod('week')">
              Week
            </button>
            <button :class="{ active: usagePeriod === 'month' }" @click="changePeriod('month')">
              Month
            </button>
          </div>
        </header>

        <div class="usage-summary">
          <div class="usage-stat">
            <span class="stat-value">{{ formatCurrency(totalUsageCost) }}</span>
            <span class="stat-label">Total Cost</span>
          </div>
          <div class="usage-stat">
            <span class="stat-value">
              {{ formatNumber(usageHistory.reduce((sum, u) => sum + u.messages, 0)) }}
            </span>
            <span class="stat-label">Total Messages</span>
          </div>
          <div class="usage-stat">
            <span class="stat-value">
              {{ formatNumber(usageHistory.reduce((sum, u) => sum + u.tokensUsed, 0)) }}
            </span>
            <span class="stat-label">Tokens Used</span>
          </div>
        </div>

        <!-- Simple bar chart representation -->
        <div class="usage-chart">
          <div v-for="data in usageChartData" :key="data.label" class="chart-bar">
            <div
              class="bar-fill"
              :style="{ height: `${Math.min(100, (data.messages / 10000) * 100)}%` }"
            />
            <span class="bar-label">{{ data.label }}</span>
          </div>
        </div>
      </section>
    </div>

    <!-- System Status -->
    <section class="system-status">
      <div class="status-item">
        <span class="status-indicator online" />
        <span>System Uptime: {{ formatPercent(systemMetrics?.uptime) }}</span>
      </div>
      <div class="status-item">
        <span
          class="status-indicator"
          :class="systemMetrics?.errorRate && systemMetrics.errorRate < 1 ? 'online' : 'warning'"
        />
        <span>Marketplace Installs: {{ formatNumber(systemMetrics?.marketplaceInstalls) }}</span>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
// ============================================================================
// Mobile-First Responsive Admin Dashboard Styles
// ============================================================================

// Touch target minimum (WCAG 2.1)
$touch-target-min: 44px;

// Breakpoints
$bp-xs: 320px;
$bp-sm: 480px;
$bp-md: 768px;
$bp-lg: 1024px;
$bp-xl: 1280px;

.admin-dashboard {
  padding: 1rem;
  max-width: 1400px;
  margin: 0 auto;
  // Safe area for notched devices
  padding-left: max(env(safe-area-inset-left), 1rem);
  padding-right: max(env(safe-area-inset-right), 1rem);
  padding-bottom: max(env(safe-area-inset-bottom), 1rem);

  @media (min-width: $bp-md) {
    padding: 1.5rem;
  }
}

// ============================================================================
// Header - Mobile Responsive
// ============================================================================

.dashboard-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (min-width: $bp-sm) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  h1 {
    color: var(--color-text);
    font-size: clamp(1.25rem, 4vw, 1.5rem);
  }

  p {
    display: none;

    @media (min-width: $bp-sm) {
      display: block;
    }
  }
}

.btn-refresh {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: $touch-target-min;
  padding: 0.75rem 1.25rem;
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-divider);
  border-radius: 0.5rem;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
  // Full width on mobile
  width: 100%;

  @media (min-width: $bp-sm) {
    width: auto;
    padding: 0.5rem 1rem;
  }

  // Touch-friendly: only apply hover on non-touch devices
  @media (hover: hover) {
    &:hover:not(:disabled) {
      background: var(--color-accent-subtle);
      border-color: var(--color-accent);
    }
  }

  // Active state for touch feedback
  &:active:not(:disabled) {
    transform: scale(0.98);
    background: var(--color-accent-subtle);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .icon {
    width: 1.25rem;
    height: 1.25rem;

    @media (min-width: $bp-sm) {
      width: 1rem;
      height: 1rem;
    }
  }
}

// ============================================================================
// Error Banner
// ============================================================================

.error-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: rgb(239, 68, 68);
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

// ============================================================================
// Metrics Grid - Responsive Cards
// ============================================================================

.metrics-grid {
  display: grid;
  // 2 columns on mobile, scales up
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;

  @media (min-width: $bp-sm) {
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  @media (min-width: $bp-lg) {
    grid-template-columns: repeat(6, 1fr);
  }

  // Landscape phone: show 3 columns
  @media (max-height: 500px) and (orientation: landscape) {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }
}

.metric-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-divider);
  border-radius: 0.75rem;
  // Touch feedback
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;

  &:active {
    transform: scale(0.98);
  }

  @media (min-width: $bp-md) {
    flex-direction: row;
    text-align: left;
    gap: 1rem;
    padding: 1rem;
  }

  // Landscape phone adjustments
  @media (max-height: 500px) and (orientation: landscape) {
    flex-direction: row;
    padding: 0.5rem;
    gap: 0.5rem;
  }
}

.metric-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  flex-shrink: 0;

  @media (min-width: $bp-md) {
    width: 3rem;
    height: 3rem;
  }

  svg {
    width: 1.25rem;
    height: 1.25rem;

    @media (min-width: $bp-md) {
      width: 1.5rem;
      height: 1.5rem;
    }
  }
}

.metric-content {
  display: flex;
  flex-direction: column;
  min-width: 0; // Prevent overflow
}

.metric-value {
  font-size: clamp(1rem, 3vw, 1.5rem);
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.2;
}

.metric-label {
  font-size: 0.65rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (min-width: $bp-md) {
    font-size: 0.75rem;
  }
}

// ============================================================================
// Content Grid - Stack on Mobile
// ============================================================================

.content-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (min-width: $bp-lg) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }

  // Landscape tablet: side by side
  @media (min-width: $bp-md) and (orientation: landscape) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
}

// ============================================================================
// Panel Component
// ============================================================================

.panel {
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-divider);
  border-radius: 0.75rem;
  overflow: hidden;
}

.panel-header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-divider);

  @media (min-width: $bp-sm) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
  }

  h2 {
    font-size: clamp(0.95rem, 2.5vw, 1.125rem);
  }
}

.empty-state {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--color-text-muted);
}

// ============================================================================
// Evaluation List - Mobile Optimized
// ============================================================================

.eval-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 300px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;

  @media (min-width: $bp-md) {
    max-height: 350px;
  }
}

.eval-item {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  gap: 0.5rem 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-divider);
  // Touch feedback
  transition: background 0.15s ease;

  &:active {
    background: var(--color-surface);
  }

  @media (min-width: $bp-sm) {
    grid-template-columns: auto 1fr auto auto;
    grid-template-rows: auto;
    gap: 1rem;
  }

  &:last-child {
    border-bottom: none;
  }
}

.eval-status {
  grid-row: 1;
  grid-column: 1;
}

.eval-info {
  grid-row: 1;
  grid-column: 2;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.eval-results {
  grid-row: 2;
  grid-column: 1;
  font-family: monospace;
  font-size: 0.875rem;

  @media (min-width: $bp-sm) {
    grid-row: 1;
    grid-column: 3;
  }
}

.eval-score {
  grid-row: 2;
  grid-column: 2;
  font-weight: 600;
  text-align: right;

  @media (min-width: $bp-sm) {
    grid-row: 1;
    grid-column: 4;
    text-align: left;
  }
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: capitalize;
  white-space: nowrap;

  @media (min-width: $bp-sm) {
    font-size: 0.75rem;
  }
}

.eval-name {
  font-weight: 500;
  color: var(--color-text);
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (min-width: $bp-md) {
    font-size: 1rem;
  }
}

// ============================================================================
// Period Selector - Touch Friendly
// ============================================================================

.period-selector {
  display: flex;
  gap: 0.25rem;
  // Full width on mobile
  width: 100%;

  @media (min-width: $bp-sm) {
    width: auto;
  }

  button {
    flex: 1;
    min-height: $touch-target-min;
    padding: 0.5rem 0.75rem;
    background: transparent;
    border: 1px solid var(--color-divider);
    border-radius: 0.375rem;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.875rem;

    @media (min-width: $bp-sm) {
      flex: none;
      min-height: auto;
      padding: 0.25rem 0.75rem;
    }

    &.active {
      background: var(--color-accent);
      border-color: var(--color-accent);
      color: white;
    }

    // Touch-friendly hover
    @media (hover: hover) {
      &:hover:not(.active) {
        background: var(--color-surface);
      }
    }

    &:active:not(.active) {
      background: var(--color-surface);
      transform: scale(0.98);
    }
  }
}

// ============================================================================
// Usage Summary - Responsive
// ============================================================================

.usage-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-divider);

  @media (min-width: $bp-sm) {
    padding: 1rem;
    gap: 1rem;
  }
}

.usage-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-value {
  font-size: clamp(0.875rem, 3vw, 1.25rem);
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.2;
}

.stat-label {
  font-size: 0.6rem;
  color: var(--color-text-muted);
  white-space: nowrap;

  @media (min-width: $bp-sm) {
    font-size: 0.75rem;
  }
}

// ============================================================================
// Usage Chart - Touch Scrollable
// ============================================================================

.usage-chart {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 100px;
  padding: 0.75rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (min-width: $bp-sm) {
    height: 120px;
    padding: 1rem;
  }
}

.chart-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  flex: 1;
  min-width: 36px;

  @media (min-width: $bp-sm) {
    gap: 0.5rem;
    min-width: 44px;
  }
}

.bar-fill {
  width: 18px;
  background: linear-gradient(to top, var(--color-accent), var(--color-accent-hover));
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: height 0.3s ease;

  @media (min-width: $bp-sm) {
    width: 24px;
  }
}

.bar-label {
  font-size: 0.6rem;
  color: var(--color-text-muted);

  @media (min-width: $bp-sm) {
    font-size: 0.7rem;
  }
}

// ============================================================================
// System Status - Mobile Layout
// ============================================================================

.system-status {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-divider);
  border-radius: 0.75rem;

  @media (min-width: $bp-sm) {
    flex-direction: row;
    gap: 2rem;
  }
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-secondary);

  @media (min-width: $bp-sm) {
    font-size: 0.875rem;
  }
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-text-muted);
  flex-shrink: 0;

  &.online {
    background: rgb(34, 197, 94);
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
  }

  &.warning {
    background: rgb(250, 204, 21);
    box-shadow: 0 0 8px rgba(250, 204, 21, 0.5);
  }
}

// ============================================================================
// Utility Classes
// ============================================================================

.text-muted {
  color: var(--color-text-muted);
}

.text-green-400 {
  color: rgb(74, 222, 128);
}

.text-red-400 {
  color: rgb(248, 113, 113);
}

.text-yellow-400 {
  color: rgb(250, 204, 21);
}

// ============================================================================
// Animation
// ============================================================================

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

// ============================================================================
// Dark Mode Color Adjustments
// ============================================================================

@media (prefers-color-scheme: dark) {
  .bg-blue-500\/20 {
    background-color: rgba(59, 130, 246, 0.2);
  }
  .bg-green-500\/20 {
    background-color: rgba(34, 197, 94, 0.2);
  }
  .bg-purple-500\/20 {
    background-color: rgba(168, 85, 247, 0.2);
  }
  .bg-yellow-500\/20 {
    background-color: rgba(234, 179, 8, 0.2);
  }
  .bg-emerald-500\/20 {
    background-color: rgba(16, 185, 129, 0.2);
  }
  .bg-rose-500\/20 {
    background-color: rgba(244, 63, 94, 0.2);
  }
}
</style>
