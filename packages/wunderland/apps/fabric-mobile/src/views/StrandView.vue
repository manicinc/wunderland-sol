<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { query, execute } from '../capacitor/sqlite';
import { answerQuestion, getModelStatus } from '../ml/transformers';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface Strand {
  id: string;
  title: string;
  content: string;
  loom_id: string | null;
  created_at: number;
  updated_at: number;
  metadata: string | null;
}

const route = useRoute();
const router = useRouter();

const strand = ref<Strand | null>(null);
const isBookmarked = ref(false);
const question = ref('');
const answer = ref('');
const isAnswering = ref(false);
const modelStatus = ref(getModelStatus());

const strandId = computed(() => route.params.id as string);

onMounted(async () => {
  const results = await query<Strand>(
    'SELECT * FROM strands WHERE id = ?',
    [strandId.value]
  );
  strand.value = results[0] || null;

  // Check bookmark status
  const bookmarks = await query<{ id: string }>(
    'SELECT id FROM bookmarks WHERE strand_id = ?',
    [strandId.value]
  );
  isBookmarked.value = bookmarks.length > 0;
});

async function toggleBookmark() {
  await Haptics.impact({ style: ImpactStyle.Medium });

  if (isBookmarked.value) {
    await execute('DELETE FROM bookmarks WHERE strand_id = ?', [strandId.value]);
  } else {
    const id = `bm_${Date.now()}`;
    await execute(
      'INSERT INTO bookmarks (id, strand_id) VALUES (?, ?)',
      [id, strandId.value]
    );
  }
  isBookmarked.value = !isBookmarked.value;
}

async function askQuestion() {
  if (!question.value.trim() || !strand.value) return;

  isAnswering.value = true;
  try {
    const result = await answerQuestion(question.value, strand.value.content);
    answer.value = result.answer;
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    console.error('[Q&A] Error:', error);
    answer.value = 'Unable to answer. Try a different question.';
  } finally {
    isAnswering.value = false;
    modelStatus.value = getModelStatus();
  }
}

function goBack() {
  router.back();
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
</script>

<template>
  <div class="strand-view">
    <header class="header">
      <button class="back-btn" @click="goBack">← Back</button>
      <button class="bookmark-btn" @click="toggleBookmark">
        {{ isBookmarked ? '★' : '☆' }}
      </button>
    </header>

    <div v-if="strand" class="content">
      <h1 class="title">{{ strand.title }}</h1>
      <p class="date">{{ formatDate(strand.updated_at) }}</p>

      <div class="body" v-html="strand.content.replace(/\n/g, '<br>')" />

      <!-- Q&A Section -->
      <div class="qa-section">
        <h3 class="qa-title">Ask a Question</h3>
        <div class="qa-input-wrapper">
          <input
            v-model="question"
            type="text"
            placeholder="Ask about this content..."
            class="qa-input"
            @keyup.enter="askQuestion"
          />
          <button
            class="qa-submit"
            :disabled="isAnswering || !question.trim()"
            @click="askQuestion"
          >
            {{ isAnswering ? '...' : '→' }}
          </button>
        </div>

        <div v-if="answer" class="qa-answer">
          <strong>Answer:</strong> {{ answer }}
        </div>

        <div v-if="!modelStatus.qa" class="model-note">
          AI model will load on first question
        </div>
      </div>
    </div>

    <div v-else class="loading">
      Loading...
    </div>
  </div>
</template>

<style scoped>
.strand-view {
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

.back-btn {
  background: none;
  border: none;
  color: #40e0d0;
  font-size: 16px;
  cursor: pointer;
  padding: 8px 0;
}

.bookmark-btn {
  background: none;
  border: none;
  color: #40e0d0;
  font-size: 24px;
  cursor: pointer;
  padding: 8px;
}

.content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.title {
  font-size: 28px;
  font-weight: 700;
  color: #e5e5e5;
  line-height: 1.3;
  margin-bottom: 8px;
}

.date {
  font-size: 14px;
  color: rgba(229, 229, 229, 0.5);
  margin-bottom: 24px;
}

.body {
  font-size: 16px;
  color: rgba(229, 229, 229, 0.9);
  line-height: 1.7;
}

.qa-section {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(64, 224, 208, 0.2);
}

.qa-title {
  font-size: 18px;
  font-weight: 600;
  color: #e5e5e5;
  margin-bottom: 16px;
}

.qa-input-wrapper {
  display: flex;
  gap: 8px;
}

.qa-input {
  flex: 1;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(64, 224, 208, 0.2);
  border-radius: 12px;
  color: #e5e5e5;
  font-size: 16px;
  outline: none;
}

.qa-input:focus {
  border-color: #40e0d0;
}

.qa-submit {
  padding: 12px 20px;
  background: #40e0d0;
  border: none;
  border-radius: 12px;
  color: #0a0a0f;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
}

.qa-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.qa-answer {
  margin-top: 16px;
  padding: 16px;
  background: rgba(64, 224, 208, 0.1);
  border-radius: 12px;
  color: #e5e5e5;
  font-size: 15px;
  line-height: 1.5;
}

.model-note {
  margin-top: 12px;
  font-size: 12px;
  color: rgba(229, 229, 229, 0.4);
  text-align: center;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: rgba(229, 229, 229, 0.5);
}
</style>
