<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PlanCatalogEntry } from '@framers/shared/planCatalog';
import { usePlans } from '@/composables/usePlans';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
}>();

const { t } = useI18n();
const { plans } = usePlans();

const visiblePlans = computed(() => plans.value);

const close = () => emit('close');

const numberFormatter = new Intl.NumberFormat('en-US');
const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const formatTokens = (value?: number | null): string => (value == null ? '-' : numberFormatter.format(value));
const priceLabel = (plan: PlanCatalogEntry): string => (
  plan.monthlyPriceUsd === 0
    ? t('plans.free')
    : t('plans.pricePerMonth', { price: priceFormatter.format(plan.monthlyPriceUsd) })
);
const allowancePrimary = (plan: PlanCatalogEntry): string => (
  t('plans.dailyAllowancePrimary', { tokens: formatTokens(plan.usage.approxGpt4oTokensPerDay) })
);
const allowanceSecondary = (plan: PlanCatalogEntry): string => (
  t('plans.dailyAllowanceSecondary', { tokens: formatTokens(plan.usage.approxGpt4oMiniTokensPerDay) })
);
</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="open" class="plan-modal-backdrop" role="dialog" aria-modal="true">
        <div class="plan-modal" role="document">
          <header class="plan-modal__header">
            <h2>{{ t('plans.compareTitle') }}</h2>
            <button type="button" class="close-button" @click="close" :aria-label="t('common.close')">
              �
            </button>
          </header>
          <div class="plan-modal__body">
            <table class="plan-table">
              <thead>
                <tr>
                  <th scope="col">{{ t('plans.columnPlan') }}</th>
                  <th scope="col">{{ t('plans.columnPrice') }}</th>
                  <th scope="col">{{ t('plans.columnDailyAllowance') }}</th>
                  <th scope="col">{{ t('plans.columnHighlights') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="plan in visiblePlans" :key="plan.id">
                  <th scope="row">
                    <div class="plan-name">{{ plan.displayName }}</div>
                    <p class="plan-headline">{{ plan.headline }}</p>
                  </th>
                  <td>
                    <strong>{{ priceLabel(plan) }}</strong>
                  </td>
                  <td>
                    <div class="allowance">
                      <span class="allowance-primary">{{ allowancePrimary(plan) }}</span>
                      <span class="allowance-secondary">{{ allowanceSecondary(plan) }}</span>
                      <span class="allowance-note">{{ plan.usage.notes }}</span>
                    </div>
                  </td>
                  <td>
                    <ul class="plan-bullets">
                      <li v-for="bullet in plan.bullets" :key="bullet">{{ bullet }}</li>
                    </ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <footer class="plan-modal__footer">
            <p>{{ t('plans.rolloverNote') }}</p>
            <button type="button" class="btn btn-secondary-ephemeral" @click="close">{{ t('common.close') }}</button>
          </footer>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped lang="scss">
.plan-modal-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(15, 23, 42, 0.6);
  z-index: 60;
}

.plan-modal {
  width: min(960px, 90vw);
  max-height: 90vh;
  background: var(--color-bg-elevated, #0f172a);
  border-radius: 18px;
  border: 1px solid hsla(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.5);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--color-text-primary, #f8fafc);
}

.plan-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid hsla(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.2);

  h2 {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 600;
  }
}

.plan-modal__body {
  overflow: auto;
  padding: 1.5rem 2rem;
}

.plan-modal__footer {
  padding: 1.5rem 2rem;
  border-top: 1px solid hsla(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.2);
  font-size: 0.9rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.close-button {
  background: none;
  border: none;
  color: currentColor;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  line-height: 1;
}

.plan-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;

  th,
  td {
    border-bottom: 1px solid hsla(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.12);
    padding: 1rem;
    vertical-align: top;
  }

  thead th {
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.75rem;
    color: hsla(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l), 0.9);
  }
}

.plan-name {
  font-size: 1.1rem;
  font-weight: 600;
}

.plan-headline {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: hsla(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l), 0.9);
}

.allowance {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.allowance-primary {
  font-weight: 600;
}

.allowance-secondary {
  font-size: 0.8rem;
  color: hsla(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l), 0.9);
}

.allowance-note {
  font-size: 0.75rem;
  color: hsla(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l), 0.8);
}

.plan-bullets {
  display: grid;
  gap: 0.35rem;
  padding-left: 1rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 150ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
