<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

const route = useRoute();
const { t } = useI18n();

const stepDefinitions = [
  { key: 'account', name: 'RegisterAccount' },
  { key: 'plan', name: 'RegisterPlan' },
  { key: 'payment', name: 'RegisterPayment' },
  { key: 'success', name: 'RegisterSuccess' },
] as const;

const activeStepIndex = computed(() => {
  const currentName = route.name?.toString();
  const index = stepDefinitions.findIndex((step) => step.name === currentName);
  return index >= 0 ? index : 0;
});
</script>

<template>
  <section class="register-shell card-glass-interactive">
    <header class="register-header hero-animated">
      <p class="register-eyebrow">{{ t('register.eyebrow') }}</p>
      <h1 class="register-title">{{ t('register.headline') }}</h1>
      <p class="register-subtitle">{{ t('register.subheadline') }}</p>
    </header>

    <ol class="register-stepper" role="list">
      <li
        v-for="(step, index) in stepDefinitions"
        :key="step.key"
        class="register-step"
        :class="{
          'register-step--complete': index < activeStepIndex,
          'register-step--active': index === activeStepIndex
        }"
      >
        <span class="register-step__index">{{ index + 1 }}</span>
        <span class="register-step__label">{{ t(`register.steps.${step.key}`) }}</span>
      </li>
    </ol>

    <main class="register-content card-glass-interactive card-glass-interactive--subtle">
      <RouterView />
    </main>
  </section>
</template>

<style scoped>
.register-shell {
  position: relative;
  margin: 0 auto;
  max-width: min(960px, 90vw);
  padding: clamp(2rem, 4vw, 3rem);
  display: grid;
  gap: clamp(1.25rem, 3vw, 2.25rem);
}

.register-header {
  text-align: center;
  display: grid;
  gap: 0.75rem;
}

.register-eyebrow {
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.85rem;
  opacity: 0.7;
}

.register-title {
  font-size: clamp(2.2rem, 4vw, 3rem);
  font-weight: 700;
  line-height: 1.1;
  margin: 0;
}

.register-subtitle {
  max-width: 640px;
  margin: 0 auto;
  opacity: 0.8;
  font-size: 1rem;
}

.register-stepper {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: clamp(0.75rem, 2vw, 1.25rem);
  list-style: none;
  margin: 0;
  padding: 0;
}

.register-step {
  position: relative;
  padding: 0.85rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--color-border-muted, hsl(330 40% 35% / 0.45));
  background: linear-gradient(120deg, hsla(335, 60%, 20%, 0.25), hsla(335, 60%, 18%, 0.15));
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: transform 0.3s ease, border-color 0.3s ease, background 0.3s ease, opacity 0.3s ease;
  opacity: 0.6;
}

.register-step__index {
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  font-weight: 600;
  border: 1px solid currentColor;
  font-size: 0.85rem;
}

.register-step__label {
  font-size: 0.95rem;
  font-weight: 500;
}

.register-step--active {
  opacity: 1;
  border-color: var(--color-accent-primary, hsl(335 80% 72% / 0.65));
  background: linear-gradient(120deg, hsla(335, 85%, 68%, 0.2), hsla(330, 60%, 22%, 0.35));
  transform: translateY(-2px);
}

.register-step--active .register-step__index {
  background: var(--color-accent-primary, hsl(335 80% 72% / 0.92));
  color: hsl(330 15% 12%);
}

.register-step--complete {
  opacity: 1;
  background: linear-gradient(120deg, hsla(135, 65%, 45%, 0.12), hsla(135, 40%, 20%, 0.18));
  border-color: hsla(135, 65%, 45%, 0.45);
  color: hsla(135, 65%, 78%, 0.95);
}

.register-step--complete .register-step__index {
  border-color: transparent;
  background: hsla(135, 65%, 45%, 0.85);
  color: hsl(140 15% 8%);
}

.register-content {
  padding: clamp(1.75rem, 3vw, 2.5rem);
  display: grid;
  gap: 1.5rem;
  backdrop-filter: blur(12px);
}

@media (max-width: 768px) {
  .register-shell {
    padding: clamp(1.5rem, 4vw, 2rem);
  }

  .register-stepper {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .register-step {
    min-height: 64px;
  }
}
</style>
