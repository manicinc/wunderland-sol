<template>
  <section class="tutorial-library">
    <header class="tutorial-library__header">
      <div>
        <p class="eyebrow">{{ t('onboarding.tutorials.eyebrow') }}</p>
        <h3>{{ t('onboarding.tutorials.heading') }}</h3>
        <p>{{ t('onboarding.tutorials.description') }}</p>
      </div>
      <button class="btn-dismiss" type="button" @click="$emit('dismiss')">
        {{ t('onboarding.tutorials.hide') }}
      </button>
    </header>

    <div class="tutorial-cards">
      <article v-for="tutorial in tutorials" :key="tutorial.id" class="tutorial-card">
        <div>
          <span class="tutorial-duration">{{ tutorial.duration }}</span>
          <h4>{{ tutorial.title }}</h4>
          <p>{{ tutorial.summary }}</p>
        </div>
        <div class="tutorial-card__footer">
          <ul class="tutorial-tags">
            <li v-for="tag in tutorial.tags" :key="tag">{{ tag }}</li>
          </ul>
          <div class="tutorial-card__actions">
            <button class="btn btn-secondary" type="button" @click="selectTutorial(tutorial.id)">
              View
            </button>
            <a :href="buildRepoLink(tutorial.source)" target="_blank" rel="noreferrer">
              Open source
            </a>
          </div>
        </div>
      </article>
    </div>

    <transition name="slide">
      <div v-if="activeTutorial" class="tutorial-viewer">
        <header>
          <div>
            <p class="viewer-label">{{ t('onboarding.tutorials.nowReading') }}</p>
            <h4>{{ activeTutorial.title }}</h4>
          </div>
          <button class="btn btn-secondary" type="button" @click="activeTutorialId = null">
            {{ t('onboarding.tutorials.close') }}
          </button>
        </header>
        <div class="tutorial-viewer__content" v-html="renderedTutorial"></div>
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useI18n } from 'vue-i18n';
import type { TutorialEntry } from '@/tutorials/tutorialCatalog';

const props = defineProps<{
  tutorials: TutorialEntry[];
}>();

defineEmits<{
  (e: 'dismiss'): void;
}>();

const { t } = useI18n();
const activeTutorialId = ref<string | null>(null);

const activeTutorial = computed(() => props.tutorials.find((tutorial) => tutorial.id === activeTutorialId.value));

const renderedTutorial = computed(() => {
  if (!activeTutorial.value) {
    return '';
  }
  const raw = marked.parse(activeTutorial.value.content, { async: false });
  return DOMPurify.sanitize(raw as string);
});

function selectTutorial(id: string): void {
  activeTutorialId.value = id;
}

function buildRepoLink(source: string): string {
  return `https://github.com/framersai/voice-chat-assistant/blob/main/${source}`;
}
</script>

<style scoped>
.tutorial-library {
  margin-top: 2rem;
  padding: 2rem;
  border-radius: 1.5rem;
  background: hsla(225, 25%, 12%, 0.95);
  border: 1px solid hsla(220, 40%, 90%, 0.08);
  color: var(--color-text-primary, #f7f9fc);
}

.tutorial-library__header {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.75rem;
  color: var(--color-text-muted, #9ca3af);
  margin-bottom: 0.5rem;
}

.tutorial-library__header h3 {
  margin: 0;
  font-size: clamp(1.5rem, 1.8rem, 2rem);
}

.btn-dismiss {
  background: transparent;
  border: 1px solid hsla(220, 40%, 90%, 0.2);
  color: var(--color-text-secondary, #c2c8d6);
  border-radius: 999px;
  padding: 0.35rem 1rem;
  cursor: pointer;
}

.tutorial-cards {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.tutorial-card {
  padding: 1.25rem;
  border-radius: 1rem;
  background: hsla(220, 45%, 18%, 0.9);
  border: 1px solid hsla(220, 40%, 90%, 0.08);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.tutorial-duration {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: hsl(210, 95%, 75%);
  letter-spacing: 0.2em;
}

.tutorial-card h4 {
  margin: 0.5rem 0;
  font-size: 1.1rem;
}

.tutorial-card__footer {
  margin-top: 1rem;
}

.tutorial-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  list-style: none;
  padding: 0;
  margin: 0 0 0.75rem;
}

.tutorial-tags li {
  font-size: 0.75rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: hsla(210, 90%, 60%, 0.15);
  color: hsl(210, 95%, 75%);
}

.tutorial-card__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn {
  border: none;
  border-radius: 999px;
  padding: 0.45rem 1rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary {
  background: hsla(210, 90%, 60%, 0.2);
  color: hsl(210, 95%, 75%);
}

.tutorial-viewer {
  margin-top: 2rem;
  border-radius: 1rem;
  background: hsla(220, 40%, 10%, 0.85);
  border: 1px solid hsla(220, 40%, 90%, 0.08);
  padding: 1.5rem;
}

.tutorial-viewer header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.viewer-label {
  text-transform: uppercase;
  letter-spacing: 0.3em;
  font-size: 0.7rem;
  color: var(--color-text-muted, #9ca3af);
  margin-bottom: 0.25rem;
}

.tutorial-viewer__content :deep(h1),
.tutorial-viewer__content :deep(h2),
.tutorial-viewer__content :deep(h3) {
  margin-top: 1.25rem;
}

.tutorial-viewer__content :deep(p) {
  line-height: 1.65;
  color: var(--color-text-secondary, #c2c8d6);
}

.tutorial-viewer__content :deep(code),
.tutorial-viewer__content :deep(pre) {
  background: hsla(210, 30%, 15%, 0.9);
  border-radius: 0.5rem;
  padding: 0.35rem 0.5rem;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
