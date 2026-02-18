<script setup lang="ts">
import { computed } from 'vue';
import { usePlatformStore } from '@/store/platform.store';
import { useConnectivityStore } from '@/store/connectivity.store';
import { useAuth } from '@/composables/useAuth';

const platform = usePlatformStore();
const connectivity = useConnectivityStore();
const auth = useAuth();

const isSubscribed = computed<boolean>(() => {
  const status = auth.user.value?.subscriptionStatus;
  return status === 'active' || status === 'trialing';
});

const bannerKind = computed<'cloud'|'desktop'|'mobile'|'browser'>(() => {
  if (platform.isCloudPostgres) return 'cloud';
  if (platform.isDesktopSqlite) return 'desktop';
  if (platform.isMobileCapacitor) return 'mobile';
  return 'browser';
});

const available = computed<string[]>(() => {
  const cloud = platform.isCloudPostgres;
  const mobile = platform.isMobileCapacitor;
  const desktop = platform.isDesktopSqlite;
  const browser = platform.isBrowserSqlJs;
  const online = connectivity.isOnline;
  const authed = auth.isAuthenticated.value;
  const subscribed = isSubscribed.value;

  const list: string[] = [];
  if (cloud) {
    list.push('Durable persistence (PostgreSQL)');
    list.push('Organizations & team management');
    list.push('Marketplace publishing');
    list.push('Billing and quotas');
  }
  if (desktop) {
    list.push('Local persistence (SQLite)');
    list.push('Optional cloud backups');
  }
  if (mobile) {
    list.push('On-device persistence (SQLite)');
    if (online) list.push('Background sync to cloud when connected');
  }
  if (browser) {
    list.push('In-memory demo mode (export/import)');
  }

  // Auth/subscription gated features
  if (cloud && authed && subscribed) {
    list.push('Team features enabled for your subscription');
  }
  return list;
});

const unavailable = computed<string[]>(() => {
  const cloud = platform.isCloudPostgres;
  const mobile = platform.isMobileCapacitor;
  const desktop = platform.isDesktopSqlite;
  const browser = platform.isBrowserSqlJs;
  const online = connectivity.isOnline;
  const authed = auth.isAuthenticated.value;
  const subscribed = isSubscribed.value;

  const list: string[] = [];
  if (!cloud) {
    list.push('Multi-tenant organizations');
    list.push('Billing portal');
  }
  if (desktop || mobile) {
    list.push('Server-side marketplace management');
  }
  if (browser) {
    list.push('Durable storage (export/import only)');
  }
  if (mobile && !online) {
    list.push('Cloud sync (offline)');
    list.push('Team features (offline)');
  }
  if (cloud && authed && !subscribed) {
    list.push('Team features (subscription required)');
  }
  return list;
});
</script>

<template>
  <div class="capability-banner-ephemeral" role="status" aria-live="polite">
    <div
      class="capability-banner-ephemeral__inner"
      :class="{
        'is-cloud': bannerKind === 'cloud',
        'is-desktop': bannerKind === 'desktop',
        'is-mobile': bannerKind === 'mobile',
        'is-browser': bannerKind === 'browser'
      }"
    >
      <div class="capability-banner-ephemeral__summary">
        <strong class="mr-2">Platform:</strong>
        <span v-if="bannerKind === 'cloud'">Cloud (PostgreSQL)</span>
        <span v-else-if="bannerKind === 'desktop'">Desktop (SQLite)</span>
        <span v-else-if="bannerKind === 'mobile'">Mobile (Capacitor)</span>
        <span v-else>Browser (sql.js)</span>
        <span class="ml-3 text-xs opacity-80">
          • {{ connectivity.isOnline ? 'Online' : 'Offline' }}
        </span>
      </div>
      <div class="capability-banner-ephemeral__lists">
        <div class="capability-banner-ephemeral__list">
          <p class="capability-banner-ephemeral__list-title">Available</p>
          <ul>
            <li v-for="(item, i) in available" :key="'a-'+i">{{ item }}</li>
          </ul>
        </div>
        <div class="capability-banner-ephemeral__list" v-if="unavailable.length">
          <p class="capability-banner-ephemeral__list-title">Unavailable</p>
          <ul>
            <li v-for="(item, i) in unavailable" :key="'u-'+i">{{ item }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
  
</template>

<style scoped>
.capability-banner-ephemeral {
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: linear-gradient(180deg, rgba(2,6,23,0.55), rgba(2,6,23,0.35));
}
.capability-banner-ephemeral__inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0.75rem 1rem;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
}
.capability-banner-ephemeral__summary { color: rgba(255,255,255,0.85); font-size: 0.9rem; }
.capability-banner-ephemeral__lists { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.capability-banner-ephemeral__list { background: rgba(15,23,42,0.35); border: 1px solid rgba(255,255,255,0.06); border-radius: 0.75rem; padding: 0.5rem 0.75rem; }
.capability-banner-ephemeral__list-title { font-size: 0.7rem; opacity: 0.8; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.08em; }
.capability-banner-ephemeral__list ul { margin: 0; padding-left: 1rem; }
.capability-banner-ephemeral__list li { color: rgba(255,255,255,0.85); font-size: 0.82rem; list-style: disc; }

@media (max-width: 720px) {
  .capability-banner-ephemeral__lists { grid-template-columns: 1fr; }
}
</style>


