<script setup lang="ts">
import { ref, watch } from 'vue';
import { query } from '../capacitor/sqlite';
import { semanticSearch, generateEmbedding, getModelStatus } from '../ml/transformers';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  score?: number;
}

const searchQuery = ref('');
const results = ref<SearchResult[]>([]);
const isSearching = ref(false);
const searchMode = ref<'text' | 'semantic'>('text');
const modelStatus = ref(getModelStatus());

// Debounced search
let searchTimeout: ReturnType<typeof setTimeout>;

watch(searchQuery, (value) => {
  clearTimeout(searchTimeout);
  if (!value.trim()) {
    results.value = [];
    return;
  }
  searchTimeout = setTimeout(() => performSearch(value), 300);
});

async function performSearch(queryText: string) {
  if (!queryText.trim()) return;

  isSearching.value = true;
  try {
    if (searchMode.value === 'semantic') {
      // Semantic search using embeddings
      const strands = await query<SearchResult>(
        'SELECT id, title, content FROM strands LIMIT 100'
      );

      const docs = strands.map(s => ({
        id: s.id,
        text: `${s.title} ${s.content}`,
      }));

      const searchResults = await semanticSearch(queryText, docs, 10);

      results.value = searchResults.map(r => {
        const strand = strands.find(s => s.id === r.id)!;
        return { ...strand, score: r.score };
      });
    } else {
      // Text search using SQLite FTS
      results.value = await query<SearchResult>(
        `SELECT id, title, content FROM strands
         WHERE title LIKE ? OR content LIKE ?
         LIMIT 20`,
        [`%${queryText}%`, `%${queryText}%`]
      );
    }

    // Haptic feedback
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    console.error('[Search] Error:', error);
  } finally {
    isSearching.value = false;
    modelStatus.value = getModelStatus();
  }
}

function toggleMode() {
  searchMode.value = searchMode.value === 'text' ? 'semantic' : 'text';
  if (searchQuery.value) {
    performSearch(searchQuery.value);
  }
}
</script>

<template>
  <div class="search-view">
    <header class="header">
      <h1 class="title">Search</h1>
      <button class="mode-toggle" @click="toggleMode">
        {{ searchMode === 'text' ? '📝 Text' : '🧠 Semantic' }}
      </button>
    </header>

    <div class="search-box">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search your knowledge..."
        class="search-input"
      />
      <div v-if="isSearching" class="search-spinner" />
    </div>

    <div v-if="searchMode === 'semantic' && !modelStatus.embedding" class="model-loading">
      Loading AI model for semantic search...
    </div>

    <div class="results">
      <div v-if="results.length === 0 && searchQuery" class="empty-state">
        No results found for "{{ searchQuery }}"
      </div>

      <router-link
        v-for="result in results"
        :key="result.id"
        :to="`/strand/${result.id}`"
        class="result-card"
      >
        <div class="result-header">
          <h3 class="result-title">{{ result.title }}</h3>
          <span v-if="result.score" class="result-score">
            {{ Math.round(result.score * 100) }}%
          </span>
        </div>
        <p class="result-preview">{{ result.content.slice(0, 150) }}...</p>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.search-view {
  flex: 1;
  padding: 16px;
  padding-bottom: 80px;
  overflow-y: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #e5e5e5;
}

.mode-toggle {
  padding: 8px 16px;
  background: rgba(64, 224, 208, 0.1);
  border: 1px solid rgba(64, 224, 208, 0.2);
  border-radius: 20px;
  color: #40e0d0;
  font-size: 13px;
  cursor: pointer;
}

.search-box {
  position: relative;
  margin-bottom: 24px;
}

.search-input {
  width: 100%;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(64, 224, 208, 0.2);
  border-radius: 12px;
  color: #e5e5e5;
  font-size: 16px;
  outline: none;
  transition: all 0.2s ease;
}

.search-input:focus {
  border-color: #40e0d0;
  background: rgba(64, 224, 208, 0.05);
}

.search-input::placeholder {
  color: rgba(229, 229, 229, 0.4);
}

.search-spinner {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  border: 2px solid rgba(64, 224, 208, 0.2);
  border-top-color: #40e0d0;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: translateY(-50%) rotate(360deg); }
}

.model-loading {
  padding: 12px;
  margin-bottom: 16px;
  background: rgba(64, 224, 208, 0.1);
  border-radius: 8px;
  color: #40e0d0;
  font-size: 13px;
  text-align: center;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  padding: 32px;
  text-align: center;
  color: rgba(229, 229, 229, 0.5);
}

.result-card {
  display: block;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(64, 224, 208, 0.1);
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.result-card:active {
  background: rgba(64, 224, 208, 0.1);
  transform: scale(0.98);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.result-title {
  font-size: 16px;
  font-weight: 600;
  color: #e5e5e5;
}

.result-score {
  font-size: 12px;
  padding: 4px 8px;
  background: rgba(64, 224, 208, 0.2);
  color: #40e0d0;
  border-radius: 8px;
}

.result-preview {
  font-size: 14px;
  color: rgba(229, 229, 229, 0.6);
  line-height: 1.4;
}
</style>
