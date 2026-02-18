<template>
  <teleport to="body">
    <transition name="fade">
      <div
        v-if="visible"
        class="subscriber-tour-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Subscriber onboarding tour"
      >
        <div class="subscriber-tour-modal">
          <header class="tour-header">
            <h2>{{ tourHeading }}</h2>
            <p>{{ t('onboarding.tour.subtitle') }}</p>
          </header>
          <ol class="tour-steps">
            <li v-for="step in steps" :key="step.title" class="tour-step">
              <div class="tour-step__icon">
                <component :is="step.icon" />
              </div>
              <div>
                <h3>{{ step.title }}</h3>
                <p>{{ step.description }}</p>
                <span class="tour-step__badge">{{ step.badge }}</span>
              </div>
            </li>
          </ol>
          <footer class="tour-footer">
            <button class="btn btn-primary" type="button" @click="completeTour">
              {{ t('onboarding.tour.ctaPrimary') }}
            </button>
            <button class="btn btn-text" type="button" @click="$emit('close')">
              {{ t('onboarding.tour.ctaSecondary') }}
            </button>
          </footer>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { SparklesIcon, UserGroupIcon, RocketLaunchIcon } from '@heroicons/vue/24/solid';

const props = defineProps<{
  visible: boolean;
  displayName?: string | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'complete'): void;
}>();

const { t } = useI18n();

const greetingName = computed(() => props.displayName || t('onboarding.tour.defaultName'));
const tourHeading = computed(() => t('onboarding.tour.heading', { name: greetingName.value }));

const steps = computed(() => [
  {
    title: t('onboarding.tour.steps.seed.title'),
    description: t('onboarding.tour.steps.seed.description'),
    badge: t('onboarding.tour.steps.seed.badge'),
    icon: SparklesIcon,
  },
  {
    title: t('onboarding.tour.steps.agency.title'),
    description: t('onboarding.tour.steps.agency.description'),
    badge: t('onboarding.tour.steps.agency.badge'),
    icon: UserGroupIcon,
  },
  {
    title: t('onboarding.tour.steps.workflow.title'),
    description: t('onboarding.tour.steps.workflow.description'),
    badge: t('onboarding.tour.steps.workflow.badge'),
    icon: RocketLaunchIcon,
  },
]);

function completeTour(): void {
  emit('complete');
  emit('close');
}
</script>

<style scoped>
.subscriber-tour-overlay {
  position: fixed;
  inset: 0;
  background: hsla(230, 30%, 8%, 0.8);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 80;
}

.subscriber-tour-modal {
  width: min(720px, 100%);
  max-height: 90vh;
  overflow: auto;
  background: var(--color-surface-elevated, hsl(225, 16%, 14%));
  border-radius: 1.5rem;
  border: 1px solid hsla(220, 40%, 80%, 0.08);
  box-shadow: 0 32px 70px rgba(0, 0, 0, 0.45);
  padding: 2rem;
  color: var(--color-text-primary, #f7f9fc);
}

.tour-header h2 {
  font-size: clamp(1.75rem, 2vw, 2.25rem);
  font-weight: 700;
  margin-bottom: 0.35rem;
}

.tour-header p {
  margin: 0;
  color: var(--color-text-secondary, #c2c8d6);
}

.tour-steps {
  list-style: none;
  margin: 2rem 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.tour-step {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-radius: 1rem;
  background: hsla(220, 40%, 90%, 0.03);
  border: 1px solid hsla(220, 40%, 90%, 0.08);
}

.tour-step__icon {
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: hsla(220, 90%, 60%, 0.15);
  color: hsl(210, 95%, 70%);
  flex-shrink: 0;
}

.tour-step__icon :deep(svg) {
  width: 1.5rem;
  height: 1.5rem;
}

.tour-step h3 {
  font-size: 1.1rem;
  margin: 0 0 0.25rem;
}

.tour-step p {
  margin: 0;
  color: var(--color-text-secondary, #c2c8d6);
}

.tour-step__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-top: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background: hsla(210, 90%, 60%, 0.15);
  color: hsl(210, 95%, 70%);
}

.tour-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: flex-end;
}

.btn {
  border-radius: 999px;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: linear-gradient(120deg, hsl(210, 90%, 65%), hsl(280, 75%, 65%));
  color: #0b0d13;
  box-shadow: 0 12px 30px rgba(67, 56, 202, 0.35);
}

.btn-text {
  background: transparent;
  color: var(--color-text-secondary, #c2c8d6);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
