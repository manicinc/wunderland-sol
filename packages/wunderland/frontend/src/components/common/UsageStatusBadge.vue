<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ShieldCheckIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{
  tokensTotal?: number | null;
  tokensUsed?: number | null;
}>();

const { t } = useI18n();

const tokensRemaining = computed(() => {
  if (props.tokensTotal == null || props.tokensUsed == null) return null;
  return Math.max(props.tokensTotal - props.tokensUsed, 0);
});

const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

const formattedTotal = computed(() => (props.tokensTotal == null ? null : formatter.format(props.tokensTotal)));
const formattedRemaining = computed(() => (tokensRemaining.value == null ? null : formatter.format(tokensRemaining.value)));

const tokensText = computed(() => {
  if (formattedRemaining.value && formattedTotal.value) {
    return t('usage.unlimitedTokensRemaining', { remaining: formattedRemaining.value, total: formattedTotal.value });
  }
  return t('usage.calculatingUsage');
});
</script>

<template>
  <div class="usage-badge">
    <ShieldCheckIcon class="usage-badge__icon" aria-hidden="true" />
    <div class="usage-badge__content">
      <span class="usage-badge__label">{{ t('usage.unlimitedAccessLabel') }}</span>
      <span class="usage-badge__tokens">{{ tokensText }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.usage-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 1rem;
  border-radius: 999px;
  background: linear-gradient(135deg,
    hsla(var(--color-accent-gold-h, 42), var(--color-accent-gold-s, 80%), var(--color-accent-gold-l, 50%), 0.35),
    hsla(var(--color-accent-secondary-h), var(--color-accent-secondary-s), calc(var(--color-accent-secondary-l) + 15%), 0.45)
  );
  border: 1px solid hsla(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.4);
  color: var(--color-text-primary);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.25);
  backdrop-filter: blur(6px);
}

.usage-badge__icon {
  width: 1.1rem;
  height: 1.1rem;
  color: var(--color-accent-secondary, #facc15);
}

.usage-badge__content {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.usage-badge__label {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.usage-badge__tokens {
  font-size: 0.74rem;
  color: hsla(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l), 0.85);
}
</style>
