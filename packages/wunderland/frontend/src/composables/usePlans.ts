import { computed } from 'vue';
import { getPublicPlans, PLAN_CATALOG, type PlanCatalogEntry, type PlanId } from '@framers/shared/planCatalog';

export interface PlanGrouping {
  featured: PlanCatalogEntry | null;
  standard: PlanCatalogEntry[];
}

export function usePlans() {
  const publicPlans = computed(() => getPublicPlans());

  const featuredPlan = computed(() => publicPlans.value.find((plan) => plan.metadata?.featured) ?? null);
  const standardPlans = computed(() =>
    publicPlans.value.filter((plan) => plan.id !== featuredPlan.value?.id),
  );

  const findPlan = (id: PlanId): PlanCatalogEntry => PLAN_CATALOG[id];

  return {
    plans: publicPlans,
    featuredPlan,
    standardPlans,
    findPlan,
  };
}
