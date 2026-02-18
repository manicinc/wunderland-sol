<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { query } from '../capacitor/sqlite';
import { isSyncConfigured } from '../capacitor/sync';

interface Strand {
  id: string;
  title: string;
  content: string;
  updated_at: number;
}

interface Loom {
  id: string;
  title: string;
  strand_count: number;
}

const recentStrands = ref<Strand[]>([]);
const looms = ref<Loom[]>([]);
const isSynced = ref(false);

onMounted(async () => {
  isSynced.value = isSyncConfigured();

  // Fetch recent strands
  recentStrands.value = await query<Strand>(
    'SELECT id, title, content, updated_at FROM strands ORDER BY updated_at DESC LIMIT 10'
  );

  // Fetch looms with strand count
  looms.value = await query<Loom>(
    `SELECT l.id, l.title, COUNT(s.id) as strand_count
     FROM looms l
     LEFT JOIN strands s ON s.loom_id = l.id
     GROUP BY l.id
     ORDER BY l.updated_at DESC
     LIMIT 5`
  );
});

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString();
}
</script>

<template>
  <div class="home-view">
    <header class="header">
      <h1 class="logo">FABRIC</h1>
      <div v-if="isSynced" class="sync-badge">Synced</div>
    </header>

    <section class="section">
      <h2 class="section-title">Recent Strands</h2>
      <div v-if="recentStrands.length === 0" class="empty-state">
        No strands yet. Add content or sync with a backend.
      </div>
      <div v-else class="strand-list">
        <router-link
          v-for="strand in recentStrands"
          :key="strand.id"
          :to="`/strand/${strand.id}`"
          class="strand-card"
        >
          <h3 class="strand-title">{{ strand.title }}</h3>
          <p class="strand-preview">{{ strand.content.slice(0, 100) }}...</p>
          <span class="strand-date">{{ formatDate(strand.updated_at) }}</span>
        </router-link>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Looms</h2>
      <div v-if="looms.length === 0" class="empty-state">
        No looms created yet.
      </div>
      <div v-else class="loom-grid">
        <div v-for="loom in looms" :key="loom.id" class="loom-card">
          <h3 class="loom-title">{{ loom.title }}</h3>
          <span class="loom-count">{{ loom.strand_count }} strands</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-view {
  flex: 1;
  padding: 16px;
  padding-bottom: 80px;
  overflow-y: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.logo {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #40e0d0 0%, #20b2aa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.sync-badge {
  font-size: 12px;
  padding: 4px 12px;
  background: rgba(64, 224, 208, 0.2);
  color: #40e0d0;
  border-radius: 12px;
}

.section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #e5e5e5;
  margin-bottom: 16px;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: rgba(229, 229, 229, 0.5);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
}

.strand-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.strand-card {
  display: block;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(64, 224, 208, 0.1);
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.strand-card:active {
  background: rgba(64, 224, 208, 0.1);
  transform: scale(0.98);
}

.strand-title {
  font-size: 16px;
  font-weight: 600;
  color: #e5e5e5;
  margin-bottom: 8px;
}

.strand-preview {
  font-size: 14px;
  color: rgba(229, 229, 229, 0.6);
  line-height: 1.4;
  margin-bottom: 8px;
}

.strand-date {
  font-size: 12px;
  color: rgba(229, 229, 229, 0.4);
}

.loom-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.loom-card {
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(64, 224, 208, 0.1);
  border-radius: 12px;
}

.loom-title {
  font-size: 14px;
  font-weight: 600;
  color: #e5e5e5;
  margin-bottom: 4px;
}

.loom-count {
  font-size: 12px;
  color: #40e0d0;
}
</style>
