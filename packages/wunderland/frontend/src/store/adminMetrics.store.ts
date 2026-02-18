/**
 * @file adminMetrics.store.ts
 * @description Admin metrics store for evaluation, marketplace, and system metrics.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { adminAPI } from '@/utils/api';
import { track } from '@/utils/analytics';

/**
 * Evaluation run summary
 */
export interface EvaluationRunSummary {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageScore: number;
  duration?: number;
}

/**
 * System metrics summary
 */
export interface SystemMetrics {
  activeUsers: number;
  totalConversations: number;
  totalMessages: number;
  avgResponseTimeMs: number;
  agentsDeployed: number;
  evaluationRunsTotal: number;
  evaluationPassRate: number;
  marketplaceInstalls: number;
  errorRate: number;
  uptime: number;
}

/**
 * Usage breakdown by time period
 */
export interface UsageMetrics {
  period: string;
  conversations: number;
  messages: number;
  tokensUsed: number;
  costUSD: number;
}

/**
 * Admin metrics store
 */
export const useAdminMetricsStore = defineStore('adminMetrics', () => {
  // State
  const systemMetrics = ref<SystemMetrics | null>(null);
  const evaluationRuns = ref<EvaluationRunSummary[]>([]);
  const usageHistory = ref<UsageMetrics[]>([]);
  const isLoading = ref(false);
  const loadedAt = ref<number | null>(null);
  const loadError = ref<string | null>(null);

  // Computed
  const latestEvaluationRun = computed(() =>
    evaluationRuns.value.length > 0 ? evaluationRuns.value[0] : null
  );

  const overallPassRate = computed(() => {
    if (evaluationRuns.value.length === 0) return 0;
    const completedRuns = evaluationRuns.value.filter(r => r.status === 'completed');
    if (completedRuns.length === 0) return 0;
    const totalPassed = completedRuns.reduce((sum, r) => sum + r.passedTests, 0);
    const totalTests = completedRuns.reduce((sum, r) => sum + r.totalTests, 0);
    return totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
  });

  const totalUsageCost = computed(() => usageHistory.value.reduce((sum, u) => sum + u.costUSD, 0));

  // Actions
  async function fetchSystemMetrics(): Promise<void> {
    try {
      const response = await adminAPI.getSystemMetrics();
      if (response?.data) {
        systemMetrics.value = response.data;
      }
    } catch (error: unknown) {
      console.error('[AdminMetrics] Failed to fetch system metrics:', error);
      // Use mock data for development
      systemMetrics.value = getMockSystemMetrics();
    }
  }

  async function fetchEvaluationRuns(): Promise<void> {
    try {
      const response = await adminAPI.getEvaluationRuns();
      if (response?.data) {
        evaluationRuns.value = response.data;
      }
    } catch (error: unknown) {
      console.error('[AdminMetrics] Failed to fetch evaluation runs:', error);
      evaluationRuns.value = getMockEvaluationRuns();
    }
  }

  async function fetchUsageHistory(period: 'day' | 'week' | 'month' = 'week'): Promise<void> {
    try {
      const response = await adminAPI.getUsageHistory(period);
      if (response?.data) {
        usageHistory.value = response.data;
      }
    } catch (error: unknown) {
      console.error('[AdminMetrics] Failed to fetch usage history:', error);
      usageHistory.value = getMockUsageHistory();
    }
  }

  async function fetchAllMetrics(force = false): Promise<void> {
    if (isLoading.value) return;
    if (!force && loadedAt.value && Date.now() - loadedAt.value < 60_000) {
      return;
    }

    isLoading.value = true;
    loadError.value = null;

    try {
      await Promise.all([fetchSystemMetrics(), fetchEvaluationRuns(), fetchUsageHistory()]);
      loadedAt.value = Date.now();
      track({ action: 'admin_metrics_loaded', category: 'admin' });
    } catch (error: unknown) {
      console.error('[AdminMetrics] Failed to load metrics:', error);
      loadError.value = error instanceof Error ? error.message : 'Failed to load metrics';
    } finally {
      isLoading.value = false;
    }
  }

  async function runEvaluation(
    agentId: string,
    testCaseIds: string[]
  ): Promise<EvaluationRunSummary | null> {
    try {
      const response = await adminAPI.runEvaluation(agentId, testCaseIds);
      if (response?.data) {
        evaluationRuns.value.unshift(response.data);
        track({ action: 'evaluation_started', category: 'admin', value: testCaseIds.length });
        return response.data;
      }
      return null;
    } catch (error: unknown) {
      console.error('[AdminMetrics] Failed to run evaluation:', error);
      return null;
    }
  }

  return {
    // State
    systemMetrics,
    evaluationRuns,
    usageHistory,
    isLoading,
    loadError,
    // Computed
    latestEvaluationRun,
    overallPassRate,
    totalUsageCost,
    // Actions
    fetchSystemMetrics,
    fetchEvaluationRuns,
    fetchUsageHistory,
    fetchAllMetrics,
    runEvaluation,
  };
});

// Mock data generators
function getMockSystemMetrics(): SystemMetrics {
  return {
    activeUsers: 1247,
    totalConversations: 45678,
    totalMessages: 234567,
    avgResponseTimeMs: 1250,
    agentsDeployed: 42,
    evaluationRunsTotal: 156,
    evaluationPassRate: 87.5,
    marketplaceInstalls: 3456,
    errorRate: 0.23,
    uptime: 99.97,
  };
}

function getMockEvaluationRuns(): EvaluationRunSummary[] {
  return [
    {
      id: '1',
      name: 'Nightly Regression #142',
      status: 'completed',
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      completedAt: new Date(Date.now() - 3500000).toISOString(),
      totalTests: 50,
      passedTests: 47,
      failedTests: 3,
      averageScore: 0.92,
      duration: 100000,
    },
    {
      id: '2',
      name: 'Nightly Regression #141',
      status: 'completed',
      startedAt: new Date(Date.now() - 90000000).toISOString(),
      completedAt: new Date(Date.now() - 89900000).toISOString(),
      totalTests: 50,
      passedTests: 45,
      failedTests: 5,
      averageScore: 0.88,
      duration: 100000,
    },
    {
      id: '3',
      name: 'Code Gen Benchmark',
      status: 'completed',
      startedAt: new Date(Date.now() - 172800000).toISOString(),
      completedAt: new Date(Date.now() - 172700000).toISOString(),
      totalTests: 30,
      passedTests: 24,
      failedTests: 6,
      averageScore: 0.78,
      duration: 150000,
    },
  ];
}

function getMockUsageHistory(): UsageMetrics[] {
  return [
    { period: 'Mon', conversations: 1234, messages: 5678, tokensUsed: 234567, costUSD: 12.34 },
    { period: 'Tue', conversations: 1456, messages: 6789, tokensUsed: 278901, costUSD: 14.56 },
    { period: 'Wed', conversations: 1678, messages: 7890, tokensUsed: 312345, costUSD: 16.78 },
    { period: 'Thu', conversations: 1890, messages: 8901, tokensUsed: 356789, costUSD: 18.9 },
    { period: 'Fri', conversations: 2012, messages: 9012, tokensUsed: 401234, costUSD: 20.12 },
    { period: 'Sat', conversations: 987, messages: 4567, tokensUsed: 198765, costUSD: 9.87 },
    { period: 'Sun', conversations: 765, messages: 3456, tokensUsed: 156789, costUSD: 7.65 },
  ];
}
