import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  userAgentsAPI,
  type UserAgentDto,
  type AgentPlanSnapshotDto,
} from '@/utils/api';

export const useUserAgentsStore = defineStore('userAgents', () => {
  const agents = ref<UserAgentDto[]>([]);
  const planSnapshot = ref<AgentPlanSnapshotDto | null>(null);
  const isLoading = ref(false);
  const planLoading = ref(false);
  const error = ref<string | null>(null);

  const activeAgents = computed(() =>
    agents.value.filter((agent) => agent.status === 'active'),
  );

  const archivedAgents = computed(() =>
    agents.value.filter((agent) => agent.status !== 'active'),
  );

  async function fetchAgents(force = false): Promise<void> {
    if (isLoading.value) return;
    if (!force && agents.value.length > 0) return;

    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await userAgentsAPI.list();
      agents.value = data?.agents ?? [];
    } catch (err: any) {
      console.error('[UserAgentsStore] Failed to load agents.', err);
      error.value = err?.response?.data?.message ?? err?.message ?? 'Failed to load agents.';
    } finally {
      isLoading.value = false;
    }
  }

  async function refreshPlanSnapshot(): Promise<void> {
    planLoading.value = true;
    error.value = null;
    try {
      const { data } = await userAgentsAPI.snapshot();
      planSnapshot.value = data ?? null;
    } catch (err: any) {
      console.error('[UserAgentsStore] Failed to load plan snapshot.', err);
      error.value = err?.response?.data?.message ?? err?.message ?? 'Failed to load plan snapshot.';
    } finally {
      planLoading.value = false;
    }
  }

  async function createAgent(payload: { label: string; slug?: string | null; config: Record<string, unknown> }) {
    const { data } = await userAgentsAPI.create(payload);
    agents.value = [data, ...agents.value];
    await refreshPlanSnapshot();
    return data;
  }

  async function updateAgent(agentId: string, payload: Partial<{ label: string; slug: string | null; status: string; config: Record<string, unknown>; archived: boolean }>) {
    const { data } = await userAgentsAPI.update(agentId, payload);
    agents.value = agents.value.map((agent) => (agent.id === agentId ? data : agent));
    await refreshPlanSnapshot();
    return data;
  }

  async function removeAgent(agentId: string): Promise<void> {
    await userAgentsAPI.remove(agentId);
    agents.value = agents.value.filter((agent) => agent.id !== agentId);
    await refreshPlanSnapshot();
  }

  return {
    agents,
    activeAgents,
    archivedAgents,
    planSnapshot: computed(() => planSnapshot.value),
    isLoading: computed(() => isLoading.value),
    planLoading: computed(() => planLoading.value),
    error: computed(() => error.value),
    fetchAgents,
    refreshPlanSnapshot,
    createAgent,
    updateAgent,
    removeAgent,
  };
});
