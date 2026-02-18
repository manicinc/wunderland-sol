<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AnimatedGlyph from '@/components/about/AnimatedGlyph.vue';
import { usePlans } from '@/composables/usePlans';
import { useAuth } from '@/composables/useAuth';
import { useRegistrationStore } from '@/store/registration.store';
import type { PlanCatalogEntry, PlanId } from '@framers/shared/planCatalog';

const { t } = useI18n();
const { plans } = usePlans();
const router = useRouter();
const route = useRoute();
const auth = useAuth();
const registrationStore = useRegistrationStore();

const contactEmail = import.meta.env.VITE_SALES_EMAIL || 'team@voicechatassistant.com';
const currentLocale = computed<string>(() => (route.params.locale as string) || 'en-US');

interface PlanCardViewModel {
  id: PlanId;
  title: string;
  priceText: string;
  priceValue: number;
  allowance: string;
  allowanceNote?: string;
  bullets: string[];
  ctaLabel: string;
  isFeatured: boolean;
  requiresContact: boolean;
  planEntry: PlanCatalogEntry;
}

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const formatNumber = (value?: number | null): string => (value == null ? '-' : value.toLocaleString());

const priceLabel = (monthlyPrice: number): string => (
  monthlyPrice === 0 ? t('plans.free') : priceFormatter.format(monthlyPrice)
);

const allowanceLabel = (tokens: number): string => t('plans.dailyAllowancePrimaryShort', { tokens: formatNumber(tokens) });

const buildCardModel = (plan: PlanCatalogEntry | null | undefined): PlanCardViewModel | null => {
  if (!plan) return null;
  return {
    id: plan.id,
    title: plan.displayName,
    priceText: priceLabel(plan.monthlyPriceUsd),
    priceValue: plan.monthlyPriceUsd,
    allowance: allowanceLabel(plan.usage.approxGpt4oTokensPerDay),
    allowanceNote: plan.usage.notes,
    bullets: plan.bullets,
    ctaLabel: plan.metadata?.requiresContact
      ? t('plans.contactUsCta')
      : plan.monthlyPriceUsd === 0
        ? t('plans.startFreeCta')
        : t('plans.choosePlanCta'),
    isFeatured: Boolean(plan.metadata?.featured),
    requiresContact: Boolean(plan.metadata?.requiresContact),
    planEntry: plan,
  };
};

// Sort all plans by price and filter out hidden ones
const visiblePlans = computed(() => {
  return plans.value
    .filter(plan => plan.public && !plan.metadata?.hiddenOnMarketing)
    .sort((a, b) => a.monthlyPriceUsd - b.monthlyPriceUsd)
    .map(plan => buildCardModel(plan))
    .filter(Boolean) as PlanCardViewModel[];
});

const handlePlanAction = async (plan: PlanCardViewModel): Promise<void> => {
  if (plan.requiresContact) {
    const subject = encodeURIComponent(`Voice Chat Assistant ${plan.title} Plan Inquiry`);
    window.location.href = `mailto:${contactEmail}?subject=${subject}`;
    return;
  }

  try {
    await registrationStore.setPlan({ planId: plan.id });
  } catch (error) {
    console.warn('[Pricing] Failed to preset registration plan:', error);
  }

  if (auth.isAuthenticated.value) {
    router.push({
      name: 'Settings',
      params: { locale: currentLocale.value },
      query: { tab: 'billing', plan: plan.id },
    });
  } else {
    router.push({
      name: 'RegisterAccount',
      params: { locale: currentLocale.value },
      query: { plan: plan.id },
    });
  }
};
</script>

<template>
  <section id="pricing" class="pricing-section-enhanced content-section-ephemeral">
    <header class="pricing-header">
      <div class="pricing-title-group">
        <h3 class="section-title-main">
          <AnimatedGlyph name="currency" class="section-title-icon pricing-icon-glow" :size="42" />
          {{ t('plans.sectionTitle') }}
        </h3>
        <p class="pricing-subtitle">
          Flexible plans designed for individuals, creators, and organizations.
          Start free and scale as you grow.
        </p>
      </div>
      <p class="pricing-context-copy">
        Compare plans side-by-side below and choose the option that fits your workflow.
      </p>
    </header>

    <div class="pricing-grid-enhanced">
      <article
        v-for="(plan, index) in visiblePlans"
        :key="plan.id"
        class="pricing-card-enhanced"
        :class="{
          'pricing-card--featured': plan.isFeatured,
          'pricing-card--free': plan.priceValue === 0
        }"
        :style="{ '--stagger-delay': `${index * 100}ms` }"
      >
        <!-- Featured badge -->
        <div v-if="plan.isFeatured" class="featured-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill="currentColor"/>
          </svg>
          <span>{{ t('plans.mostPopular') }}</span>
        </div>

        <!-- Plan header -->
        <div class="plan-header">
          <h4 class="plan-name">{{ plan.title }}</h4>
          <div class="plan-price-section">
            <div class="plan-price-amount">
              <span v-if="plan.priceValue > 0" class="price-symbol">$</span>
              <span class="price-number">{{ plan.priceValue === 0 ? 'Free' : plan.priceValue }}</span>
              <span v-if="plan.priceValue > 0" class="price-period">/month</span>
            </div>
            <p class="plan-allowance">{{ plan.allowance }}</p>
            <p v-if="plan.allowanceNote" class="plan-allowance-note">{{ plan.allowanceNote }}</p>
          </div>
        </div>

        <!-- Features list -->
        <ul class="plan-features">
          <li v-for="(bullet, bulletIndex) in plan.bullets" :key="bulletIndex" class="plan-feature">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="feature-icon">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
              <path d="M8 12l3 3 5-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>{{ bullet }}</span>
          </li>
        </ul>

        <!-- CTA button -->
        <button
          class="btn plan-cta-button"
          :class="{
            'btn-primary-ephemeral': plan.isFeatured,
            'btn-secondary-ephemeral': !plan.isFeatured && plan.priceValue > 0,
            'btn-ghost-ephemeral': plan.priceValue === 0
          }"
          type="button"
          @click="handlePlanAction(plan)"
        >
          {{ plan.ctaLabel }}
        </button>

        <!-- Background decoration -->
        <div class="plan-bg-decoration"></div>
      </article>
    </div>

    <!-- Decorative elements -->
    <div class="pricing-bg-pattern">
      <svg class="pricing-bg-svg" viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="pricing-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:hsla(260, 75%, 78%, 0.05)" />
            <stop offset="50%" style="stop-color:hsla(335, 80%, 72%, 0.08)" />
            <stop offset="100%" style="stop-color:hsla(180, 95%, 60%, 0.05)" />
          </linearGradient>
        </defs>
        <circle cx="200" cy="200" r="150" fill="url(#pricing-gradient)" opacity="0.5"/>
        <circle cx="1000" cy="100" r="200" fill="url(#pricing-gradient)" opacity="0.3"/>
        <circle cx="600" cy="350" r="100" fill="url(#pricing-gradient)" opacity="0.4"/>
      </svg>
    </div>
  </section>
</template>

<style scoped lang="scss">
.pricing-section-enhanced {
  position: relative;
  padding: 4rem 1rem;
  overflow: hidden;

  @media (min-width: 768px) {
    padding: 6rem 2rem;
  }
}

.pricing-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  margin-bottom: 4rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
}

.pricing-title-group {
  flex: 1;
}

.pricing-subtitle {
  margin-top: 1rem;
  font-size: 1.125rem;
  line-height: 1.6;
  color: hsla(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l), 0.85);
  max-width: 600px;
}

.pricing-icon-glow {
  animation: iconPulse 4s ease-in-out infinite;
}

@keyframes iconPulse {
  0%, 100% {
    filter: drop-shadow(0 0 8px hsla(var(--color-accent-secondary-h), var(--color-accent-secondary-s), var(--color-accent-secondary-l), 0.4));
  }
  50% {
    filter: drop-shadow(0 0 16px hsla(var(--color-accent-secondary-h), var(--color-accent-secondary-s), var(--color-accent-secondary-l), 0.7));
  }
}

.pricing-context-copy {
  max-width: 360px;
  font-size: 0.95rem;
  line-height: 1.6;
  color: hsla(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l), 0.75);
  margin-top: 0.75rem;
}

.pricing-grid-enhanced {
  display: grid;
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));

  @media (min-width: 768px) {
    gap: 2.5rem;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
}

.pricing-card-enhanced {
  position: relative;
  background: linear-gradient(
    180deg,
    hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.7),
    hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), calc(var(--color-bg-secondary-l) - 5%), 0.5)
  );
  backdrop-filter: blur(20px);
  border-radius: 1.5rem;
  padding: 2rem;
  border: 1px solid hsla(var(--color-border-h), var(--color-border-s), var(--color-border-l), 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  opacity: 0;
  transform: translateY(28px) scale(0.97);
  animation: pricingCardIn 0.8s cubic-bezier(0.26, 0.75, 0.36, 1) forwards;
  animation-delay: calc(var(--stagger-delay, 0ms) + 120ms);

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 40px hsla(0, 0%, 0%, 0.15);
    border-color: hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.4);

    .plan-bg-decoration {
      opacity: 0.8;
      transform: scale(1.5) rotate(45deg);
    }

    .plan-cta-button {
      transform: scale(1.05);
    }
  }

  &--featured {
    background: linear-gradient(
      180deg,
      hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.1),
      hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.8)
    );
    border-color: hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.3);
    animation-duration: 0.9s;

    &:hover {
      border-color: hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.6);
      box-shadow: 0 25px 50px hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.2);
    }
  }
}

.featured-badge {
  position: absolute;
  top: -1px;
  right: -1px;
  background: linear-gradient(135deg,
    hsl(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l)),
    hsl(var(--color-accent-secondary-h), var(--color-accent-secondary-s), var(--color-accent-secondary-l))
  );
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0 1.5rem 0 1.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  animation: badgeGlow 3s ease-in-out infinite;
}

@keyframes badgeGlow {
  0%, 100% {
    box-shadow: 0 0 10px hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.5);
  }
  50% {
    box-shadow: 0 0 20px hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.8);
  }
}

.plan-header {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid hsla(var(--color-border-h), var(--color-border-s), var(--color-border-l), 0.15);
}

.plan-name {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  background: linear-gradient(
    135deg,
    hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l)),
    hsl(var(--color-accent-secondary-h), var(--color-accent-secondary-s), var(--color-accent-secondary-l))
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.plan-price-section {
  margin-top: 1rem;
}

.plan-price-amount {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
}

.price-symbol {
  font-size: 1.25rem;
  opacity: 0.7;
  font-weight: 500;
}

.price-number {
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1;
}

.price-period {
  font-size: 1rem;
  opacity: 0.7;
  margin-left: 0.25rem;
}

.plan-allowance {
  font-weight: 600;
  font-size: 0.95rem;
  color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
  margin-bottom: 0.5rem;
}

.plan-allowance-note {
  font-size: 0.8rem;
  color: hsla(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l), 0.9);
  line-height: 1.4;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 2rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.plan-feature {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  font-size: 0.9rem;
  line-height: 1.5;
  color: hsla(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l), 0.9);
}

.feature-icon {
  flex-shrink: 0;
  margin-top: 0.1rem;
  color: hsl(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l));
  opacity: 0.8;
}

.plan-cta-button {
  width: 100%;
  padding: 0.875rem 1.5rem;
  font-weight: 600;
  font-size: 0.95rem;
  border-radius: 0.75rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transform: translateX(-100%);
    transition: transform 0.6s ease;
  }

  &:hover::before {
    transform: translateX(100%);
  }
}

.plan-bg-decoration {
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(
    circle,
    hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.1),
    transparent 60%
  );
  opacity: 0;
  transform: scale(1) rotate(0deg);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.pricing-bg-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.3;
  pointer-events: none;
  z-index: 0;
}

.pricing-bg-svg {
  width: 100%;
  height: 100%;
  animation: floatingPattern 20s ease-in-out infinite;
}

@keyframes floatingPattern {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(2deg);
  }
}

@keyframes pricingCardIn {
  0% {
    opacity: 0;
    transform: translateY(28px) scale(0.95);
  }
  60% {
    opacity: 1;
    transform: translateY(-4px) scale(1.01);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

// Mobile optimizations
@media (max-width: 768px) {
  .pricing-card-enhanced {
    padding: 1.5rem;
  }

  .plan-name {
    font-size: 1.25rem;
  }

  .price-number {
    font-size: 2rem;
  }
}

// Dark theme enhancements
@media (prefers-color-scheme: dark) {
  .pricing-card-enhanced {
    background: linear-gradient(
      180deg,
      hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), calc(var(--color-bg-secondary-l) + 3%), 0.8),
      hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.6)
    );
  }
}
</style>
