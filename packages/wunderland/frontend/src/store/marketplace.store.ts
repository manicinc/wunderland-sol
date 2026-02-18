import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { marketplaceAPI, type MarketplaceAgentSummaryFE } from '@/utils/api';
import { track } from '@/utils/analytics';

export const useMarketplaceStore = defineStore('marketplace', () => {
  const agents = ref<MarketplaceAgentSummaryFE[]>([]);
  const isLoading = ref(false);
  const loadedAt = ref<number | null>(null);
  const loadError = ref<string | null>(null);

  const featuredAgents = computed(() => agents.value.filter((agent) => agent.featured));

  async function fetchAgents(force = false): Promise<void> {
    if (isLoading.value) return;
    if (!force && loadedAt.value && Date.now() - loadedAt.value < 60_000) {
      return;
    }

    isLoading.value = true;
    loadError.value = null;
    try {
      const { data } = await marketplaceAPI.list();
      agents.value = Array.isArray(data?.agents) ? data.agents : [];
      loadedAt.value = Date.now();
      track({ action: 'marketplace_list', category: 'marketplace', value: agents.value.length });
    } catch (error: any) {
      console.error('[MarketplaceStore] Failed to load marketplace agents.', error);
      loadError.value = error?.message ?? 'Failed to load marketplace data.';
    } finally {
      isLoading.value = false;
    }
  }

  async function ensureLoaded(): Promise<void> {
    if (!loadedAt.value) {
      await fetchAgents();
    }
  }

  function getAgentByPersona(personaId: string): MarketplaceAgentSummaryFE | undefined {
    return agents.value.find((agent) => agent.personaId === personaId || agent.id === personaId);
  }

  return {
    agents,
    featuredAgents,
    isLoading,
    loadError,
    fetchAgents,
    ensureLoaded,
    getAgentByPersona,
  };
});
