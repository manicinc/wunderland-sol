<template>
  <transition name="speech-credits-modal-fade">
    <div
      v-if="open"
      class="speech-credits-modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="speechCreditsModalTitle"
      @click.self="emit('close')"
    >
      <div class="speech-credits-modal">
        <header class="speech-credits-modal__header">
          <h2 id="speechCreditsModalTitle" class="speech-credits-modal__title">
            Speech & LLM Usage Credits
          </h2>
          <button
            type="button"
            class="speech-credits-modal__close"
            @click="emit('close')"
            aria-label="Close speech credits modal"
          >
            <XMarkIcon class="w-5 h-5" aria-hidden="true" />
          </button>
        </header>

        <section v-if="hasSnapshot" class="speech-credits-modal__body">
          <p class="speech-credits-modal__allocation">
            Allocation: <strong>{{ allocationLabel }}</strong>
          </p>

          <div class="speech-credits-modal__grid">
            <article class="speech-credit-card">
              <header class="speech-credit-card__header">
                <h3>Speech Services</h3>
                <span class="speech-credit-card__tag" :class="speechStatusTagClass">
                  {{ speechStatusTag }}
                </span>
              </header>
              <p class="speech-credit-card__summary">
                {{ speechSummary }}
              </p>
              <div class="speech-credit-card__progress" role="progressbar" :aria-valuenow="speechPercent" aria-valuemin="0" aria-valuemax="100">
                <div class="speech-credit-card__progress-bar" :style="{ width: `${speechPercent}%` }"></div>
              </div>
              <ul class="speech-credit-card__details">
                <li>
                  Remaining budget:
                  <strong>{{ formatUsd(speechBucket?.remainingUsd) }}</strong>
                </li>
                <li>
                  Whisper minutes left:
                  <strong>{{ formatMinutes(speechBucket?.approxWhisperMinutesRemaining) }}</strong>
                </li>
                <li>
                  TTS characters left:
                  <strong>{{ formatCharacters(speechBucket?.approxTtsCharactersRemaining) }}</strong>
                </li>
              </ul>
            </article>

            <article class="speech-credit-card">
              <header class="speech-credit-card__header">
                <h3>LLM Completions</h3>
                <span class="speech-credit-card__tag speech-credit-card__tag--llm">
                  {{ llmStatusTag }}
                </span>
              </header>
              <p class="speech-credit-card__summary">
                {{ llmSummary }}
              </p>
              <div class="speech-credit-card__progress" role="progressbar" :aria-valuenow="llmPercent" aria-valuemin="0" aria-valuemax="100">
                <div class="speech-credit-card__progress-bar speech-credit-card__progress-bar--llm" :style="{ width: `${llmPercent}%` }"></div>
              </div>
              <ul class="speech-credit-card__details">
                <li>
                  Remaining budget:
                  <strong>{{ formatUsd(llmBucket?.remainingUsd) }}</strong>
                </li>
                <li>
                  GPT-4o tokens left:
                  <strong>{{ formatTokens(llmBucket?.approxGpt4oTokensRemaining) }}</strong>
                </li>
                <li>
                  GPT-4o mini tokens left:
                  <strong>{{ formatTokens(llmBucket?.approxGpt4oMiniTokensRemaining) }}</strong>
                </li>
              </ul>
            </article>
          </div>
        </section>

        <section v-else class="speech-credits-modal__body speech-credits-modal__body--empty">
          <p>Collecting usage snapshot&mdash;try again in a moment.</p>
        </section>

        <footer class="speech-credits-modal__footer">
          <button type="button" class="btn btn-secondary-ephemeral btn-sm" @click="emit('close')">
            Close
          </button>
        </footer>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import { voiceSettingsManager } from '@/services/voice.settings.service';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{ (e: 'close'): void }>();

const snapshot = computed(() => voiceSettingsManager.creditsSnapshot.value);
const speechBucket = computed(() => snapshot.value?.speech ?? null);
const llmBucket = computed(() => snapshot.value?.llm ?? null);

const hasSnapshot = computed(() => Boolean(snapshot.value));

const allocationLabel = computed(() => {
  switch (snapshot.value?.allocationKey) {
    case 'public':
      return 'Demo / anonymous usage';
    case 'global':
      return 'Global lifetime access';
    case 'metered':
      return 'Subscriber daily allocation';
    case 'unlimited':
      return 'Unlimited plan';
    default:
      return 'Unknown allocation';
  }
});

const speechPercent = computed(() => {
  if (!speechBucket.value || speechBucket.value.isUnlimited) return 0;
  const total = speechBucket.value.totalUsd ?? 0;
  if (total <= 0) return 100;
  const used = speechBucket.value.usedUsd;
  return Math.min(100, Math.max(0, (used / total) * 100));
});

const llmPercent = computed(() => {
  if (!llmBucket.value || llmBucket.value.isUnlimited) return 0;
  const total = llmBucket.value.totalUsd ?? 0;
  if (total <= 0) return 100;
  const used = llmBucket.value.usedUsd;
  return Math.min(100, Math.max(0, (used / total) * 100));
});

const speechStatusTag = computed(() => {
  if (!speechBucket.value) return 'Fetching';
  if (speechBucket.value.isUnlimited) return 'Unlimited';
  if ((speechBucket.value.remainingUsd ?? 0) <= 0) return 'Browser fallback';
  return 'OpenAI Whisper & TTS active';
});

const speechStatusTagClass = computed(() =>
  speechStatusTag.value === 'Browser fallback'
    ? 'speech-credit-card__tag--warning'
    : 'speech-credit-card__tag--speech'
);

const llmStatusTag = computed(() => {
  if (!llmBucket.value) return 'Fetching';
  if (llmBucket.value.isUnlimited) return 'Unlimited';
  return 'House allowance';
});

const speechSummary = computed(() => {
  if (!speechBucket.value) return 'No speech usage recorded yet.';
  if (speechBucket.value.isUnlimited) {
    return 'OpenAI Whisper and Voice are enabled with no daily cap.';
  }
  const minutes = formatMinutes(speechBucket.value.approxWhisperMinutesRemaining);
  const characters = formatCharacters(speechBucket.value.approxTtsCharactersRemaining);
  return `${minutes} Whisper minutes • ${characters} TTS characters remaining today.`;
});

const llmSummary = computed(() => {
  if (!llmBucket.value) return 'No LLM usage recorded yet.';
  if (llmBucket.value.isUnlimited) {
    return 'LLM completions are unlimited on your current plan.';
  }
  const gpt4oTokens = formatTokens(llmBucket.value.approxGpt4oTokensRemaining);
  const gpt4oMiniTokens = formatTokens(llmBucket.value.approxGpt4oMiniTokensRemaining);
  return `${gpt4oTokens} GPT-4o tokens • ${gpt4oMiniTokens} GPT-4o mini tokens remaining today.`;
});

const usdFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const integerFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

const formatUsd = (value: number | null | undefined): string => {
  if (value == null) return 'Unlimited';
  if (value <= 0) return '$0.000';
  return `$${usdFormatter.format(value)}`;
};

const formatMinutes = (value: number | null | undefined): string => {
  if (value == null) return '∞';
  if (value <= 0) return '0';
  return `${integerFormatter.format(Math.floor(value))}`;
};

const formatCharacters = (value: number | null | undefined): string => {
  if (value == null) return '∞';
  if (value <= 0) return '0';
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return integerFormatter.format(Math.floor(value));
};

const formatTokens = (value: number | null | undefined): string => {
  if (value == null) return '∞';
  if (value <= 0) return '0';
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return integerFormatter.format(Math.floor(value));
};
</script>

<style scoped lang="scss">
.speech-credits-modal-fade-enter-active,
.speech-credits-modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.speech-credits-modal-fade-enter-from,
.speech-credits-modal-fade-leave-to {
  opacity: 0;
}

.speech-credits-modal__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 90;
  padding: 1.5rem;
}

.speech-credits-modal {
  width: min(700px, 100%);
  background: hsla(var(--color-surface-primary-h), var(--color-surface-primary-s), var(--color-surface-primary-l), 0.98);
  border-radius: 1.25rem;
  border: 1px solid hsla(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.35);
  box-shadow: 0 26px 60px rgba(15, 23, 42, 0.35);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.speech-credits-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 1px solid hsla(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.25);
}

.speech-credits-modal__title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.speech-credits-modal__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px;
  width: 2.25rem;
  height: 2.25rem;
  background: rgba(148, 163, 184, 0.18);
  color: inherit;
  transition: background 0.18s ease;
}

.speech-credits-modal__close:hover {
  background: rgba(148, 163, 184, 0.32);
}

.speech-credits-modal__body {
  padding: 1.25rem 1.5rem 0;
  overflow-y: auto;
}

.speech-credits-modal__body--empty {
  padding: 2rem 1.5rem;
  text-align: center;
  color: rgba(148, 163, 184, 0.9);
}

.speech-credits-modal__allocation {
  font-size: 0.9rem;
  opacity: 0.75;
  margin-bottom: 1rem;
}

.speech-credits-modal__grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  margin-bottom: 1.25rem;
}

.speech-credit-card {
  background: hsla(var(--color-surface-secondary-h), var(--color-surface-secondary-s), var(--color-surface-secondary-l), 0.9);
  border-radius: 1rem;
  padding: 1rem 1.2rem 1.1rem;
  border: 1px solid hsla(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.25);
  box-shadow: inset 0 1px 0 hsla(0, 0%, 100%, 0.04);
}

.speech-credit-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.speech-credit-card__header h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.speech-credit-card__tag {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  background: rgba(59, 130, 246, 0.16);
  color: rgba(37, 99, 235, 0.92);
}

.speech-credit-card__tag--speech {
  background: rgba(34, 197, 94, 0.16);
  color: rgba(22, 163, 74, 0.92);
}

.speech-credit-card__tag--warning {
  background: rgba(250, 204, 21, 0.2);
  color: rgba(202, 138, 4, 0.92);
}

.speech-credit-card__tag--llm {
  background: rgba(96, 165, 250, 0.16);
  color: rgba(59, 130, 246, 0.92);
}

.speech-credit-card__summary {
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
  color: hsla(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l), 0.88);
}

.speech-credit-card__progress {
  position: relative;
  width: 100%;
  height: 0.5rem;
  background: rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.speech-credit-card__progress-bar {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(14, 165, 233, 0.8), rgba(79, 70, 229, 0.85));
  transition: width 0.3s ease;
}

.speech-credit-card__progress-bar--llm {
  background: linear-gradient(90deg, rgba(236, 72, 153, 0.8), rgba(168, 85, 247, 0.85));
}

.speech-credit-card__details {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.4rem;
  font-size: 0.88rem;
}

.speech-credit-card__details li {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.speech-credit-card__details strong {
  font-weight: 600;
}

.speech-credits-modal__footer {
  padding: 1rem 1.5rem 1.3rem;
  border-top: 1px solid hsla(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.25);
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 600px) {
  .speech-credits-modal {
    border-radius: 1rem;
    padding: 0;
  }

  .speech-credit-card__details li {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
