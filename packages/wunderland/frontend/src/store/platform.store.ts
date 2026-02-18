import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { systemAPI } from '@/utils/api';

export type StorageAdapterKind = 'postgres' | 'better-sqlite3' | 'capacitor' | 'sqljs' | string;

export const usePlatformStore = defineStore('platform', () => {
  const kind = ref<StorageAdapterKind>('sqljs');
  const capabilities = ref<ReadonlyArray<string>>([]);
  const persistence = ref<boolean>(false);
  const status = ref<'ok'|'degraded'|'unknown'>('unknown');

  const isCloudPostgres = computed(() => kind.value === 'postgres');
  const isDesktopSqlite = computed(() => kind.value === 'better-sqlite3');
  const isMobileCapacitor = computed(() => kind.value === 'capacitor');
  const isBrowserSqlJs = computed(() => kind.value === 'sqljs');

  const canUseOrganizations = computed(() => isCloudPostgres.value);
  const canUseBilling = computed(() => isCloudPostgres.value);
  const canUseCloudBackups = computed(() => isCloudPostgres.value || isDesktopSqlite.value || isMobileCapacitor.value);

  async function initialize(): Promise<void> {
    try {
      const { data } = await systemAPI.getStorageStatus();
      kind.value = (data?.kind || 'sqljs') as StorageAdapterKind;
      capabilities.value = Array.isArray(data?.capabilities) ? data.capabilities : [];
      persistence.value = Boolean(data?.persistence);
      status.value = (data?.status as any) || 'ok';
    } catch {
      status.value = 'degraded';
      kind.value = 'sqljs';
      capabilities.value = [];
      persistence.value = false;
    }
  }

  return {
    // state
    kind, capabilities, persistence, status,
    // computed
    isCloudPostgres, isDesktopSqlite, isMobileCapacitor, isBrowserSqlJs,
    canUseOrganizations, canUseBilling, canUseCloudBackups,
    // actions
    initialize,
  };
});


