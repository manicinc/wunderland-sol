<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useRegistrationStore } from '@/store/registration.store';
import { usePlans } from '@/composables/usePlans';
import type { PlanCatalogEntry, PlanId } from '@framers/shared/planCatalog';

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const registrationStore = useRegistrationStore();
const { plans } = usePlans();
const availablePlans = computed<PlanCatalogEntry[]>(() => plans.value);

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const selectedPlanId = computed<PlanId | null>(() => {
  const id = registrationStore.plan?.planId;
  return id ? (id as PlanId) : null;
});

const displayPrice = (plan: PlanCatalogEntry): string => {
  if (plan.monthlyPriceUsd === 0) {
    return t('plans.free');
  }
  return t('plans.pricePerMonth', { price: priceFormatter.format(plan.monthlyPriceUsd) });
};

const handlePlanSelect = async (planId: PlanId) => {
  await registrationStore.setPlan({ planId });
  router.push({ name: 'RegisterPayment', params: { locale: route.params.locale } });
};
</script>

<template>
  <div class="register-panel">
    <header class="register-panel__header">
      <h2>{{ t('register.plan.title') }}</h2>
      <p>{{ t('register.plan.subtitle') }}</p>
    </header>

    <div class="plan-grid">
      <article
        v-for="plan in availablePlans"
        :key="plan.id"
        class="plan-card card-glass-interactive card-glass-interactive--hoverable"
        :class="{ 'plan-card--selected': selectedPlanId === plan.id }"
        @click="handlePlanSelect(plan.id)"
      >
        <header class="plan-card__header">
          <h3>{{ plan.displayName }}</h3>
          <p class="plan-card__price">{{ displayPrice(plan) }}</p>
          <span v-if="plan.metadata?.featured" class="plan-card__badge">{{ t('register.plan.featuredBadge') }}</span>
        </header>
        <ul class="plan-card__highlights">
          <li v-for="bullet in plan.bullets" :key="bullet">{{ bullet }}</li>
        </ul>
        <button type="button" class="btn btn-secondary-ephemeral">{{ t('register.plan.choose') }}</button>
      </article>
    </div>
  </div>
</template>

<style scoped>
.register-panel {
  display: grid;
  gap: 1.75rem;
}

.register-panel__header {
  display: grid;
  gap: 0.45rem;
}

.plan-grid {
  display: grid;
  gap: clamp(1rem, 3vw, 1.5rem);
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.plan-card {
  position: relative;
  padding: clamp(1.5rem, 3vw, 2rem);
  display: grid;
  gap: 1rem;
  border-radius: 18px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.plan-card:hover {
  transform: translateY(-4px);
}

.plan-card--selected {
  border-color: var(--color-accent-primary, hsl(335 80% 72% / 0.7));
  box-shadow: 0 12px 35px hsla(335, 80%, 72%, 0.15);
}

.plan-card__header {
  display: grid;
  gap: 0.4rem;
}

.plan-card__price {
  font-size: 1.15rem;
  opacity: 0.8;
  margin: 0;
}

.plan-card__badge {
  justify-self: flex-start;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: hsla(335, 80%, 70%, 0.18);
  border: 1px solid hsla(335, 80%, 70%, 0.45);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.plan-card__highlights {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.35rem;
  font-size: 0.9rem;
  opacity: 0.85;
}

.plan-card__highlights li::marker {
  color: var(--color-accent-primary, hsl(335 80% 72%));
}

.btn {
  justify-self: flex-start;
}
</style>
