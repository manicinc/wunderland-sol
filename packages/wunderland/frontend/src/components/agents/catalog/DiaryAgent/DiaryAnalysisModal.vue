<template>
  <Transition name="modal-fade-futuristic">
    <div class="modal-backdrop-futuristic" @click.self="$emit('close')">
      <div class="modal-content-futuristic diary-analysis-modal-v2">
        <div class="modal-header-futuristic">
          <h3 class="modal-title-futuristic">
            <ChartBarIcon class="w-5 h-5 mr-2 opacity-80"/> Entry Analysis: {{ entry.title }}
          </h3>
          <button @click="$emit('close')" class="btn-modal-close-futuristic">&times;</button>
        </div>
        <div class="modal-body-futuristic analysis-content-v2">
          <div v-if="!entry.analysis || (!entry.analysis.sentiment && !entry.analysis.keywords)" class="text-center py-4">
            <p class="text-sm text-gray-500">No analysis data available for this entry yet.</p>
            <p class="text-xs mt-1">You can request analysis from the entry view.</p>
          </div>

          <div v-if="entry.analysis?.sentiment" class="analysis-section-v2">
            <h4 class="section-title-v2">Sentiment</h4>
            <p><strong>Overall:</strong> <span :class="`sentiment-${entry.analysis.sentiment.overallPolarity}`">{{ entry.analysis.sentiment.overallPolarity }}</span></p>
            <div class="sentiment-scores-v2">
              <div v-if="entry.analysis.sentiment.positiveScore">Positive: <span>{{ (entry.analysis.sentiment.positiveScore * 100).toFixed(1) }}%</span></div>
              <div v-if="entry.analysis.sentiment.negativeScore">Negative: <span>{{ (entry.analysis.sentiment.negativeScore * 100).toFixed(1) }}%</span></div>
              <div v-if="entry.analysis.sentiment.neutralScore">Neutral: <span>{{ (entry.analysis.sentiment.neutralScore * 100).toFixed(1) }}%</span></div>
              <div v-if="entry.analysis.sentiment.subjectivity">Subjectivity: <span>{{ (entry.analysis.sentiment.subjectivity * 100).toFixed(1) }}%</span></div>
            </div>
          </div>

          <div v-if="entry.analysis?.keywords && entry.analysis.keywords.length > 0" class="analysis-section-v2">
            <h4 class="section-title-v2">Keywords</h4>
            <div class="keywords-list-v2">
              <span v-for="keyword in entry.analysis.keywords" :key="keyword" class="keyword-tag-v2">{{ keyword }}</span>
            </div>
          </div>

           <div v-if="entry.analysis?.themes && entry.analysis.themes.length > 0" class="analysis-section-v2">
            <h4 class="section-title-v2">Identified Themes</h4>
            <ul class="themes-list-v2">
              <li v-for="theme in entry.analysis.themes" :key="theme">{{ theme }}</li>
            </ul>
          </div>

        </div>
        <div class="modal-footer-futuristic">
          <button @click="$emit('close')" class="btn-futuristic-secondary btn-sm">Close</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { RichDiaryEntry } from './DiaryAgentTypes';
import { ChartBarIcon } from '@heroicons/vue/24/solid';

const props = defineProps({
  entry: { type: Object as PropType<RichDiaryEntry>, required: true },
});

defineEmits(['close']);

</script>

<style lang="scss" scoped>
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;

.diary-analysis-modal-v2 {
  max-width: 560px;
}
.analysis-content-v2 {
  @apply space-y-4 text-sm;
  max-height: 70vh;
  overflow-y: auto;
  @include mixins.custom-scrollbar-for-themed-panel('--diary');
}
.analysis-section-v2 {
  @apply p-3 rounded-md;
  background-color: hsla(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) + 3%), 0.7);
  border: 1px solid hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.1);
}
.section-title-v2 {
  @apply text-xs font-semibold uppercase tracking-wider mb-2 pb-1 border-b;
  color: hsl(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l));
  border-bottom-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.2);
}
.sentiment-scores-v2 {
  @apply grid grid-cols-2 gap-x-3 gap-y-1 text-xs;
  color: var(--color-text-secondary);
  span { font-weight: 500; color: var(--color-text-primary); }
}
.sentiment-positive { color: hsl(var(--color-success-h), var(--color-success-s), var(--color-success-l)); font-weight: 600; }
.sentiment-negative { color: hsl(var(--color-error-h), var(--color-error-s), var(--color-error-l)); font-weight: 600; }
.sentiment-neutral { color: var(--color-text-muted); font-weight: 600; }
.sentiment-mixed { color: hsl(var(--color-warning-h), var(--color-warning-s), var(--color-warning-l)); font-weight: 600; }

.keywords-list-v2 {
  @apply flex flex-wrap gap-1.5;
  .keyword-tag-v2 {
    @apply text-xs px-2 py-0.5 rounded-full;
    background-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.15);
    color: hsl(var(--diary-accent-h), var(--diary-accent-s), calc(var(--diary-accent-l) + 20%));
    border: 1px solid hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.2);
  }
}
.themes-list-v2 {
    @apply list-disc list-inside pl-1 space-y-0.5 text-xs;
    color: var(--color-text-secondary);
}

/* Global modal styles assumed */
</style>
