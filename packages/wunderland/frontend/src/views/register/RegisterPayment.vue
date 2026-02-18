<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useRegistrationStore } from '@/store/registration.store';
import { usePlans } from '@/composables/usePlans';
import { billingAPI } from '@/utils/api';
import { useAuth } from '@/composables/useAuth';
import type { PlanCatalogEntry, PlanId } from '@framers/shared/planCatalog';

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const registrationStore = useRegistrationStore();
const { findPlan } = usePlans();
const auth = useAuth();

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const isCreatingCheckout = ref(false);
const errorMessage = ref<string | null>(null);
const infoMessage = ref<string | null>(null);
const pollingHandle = ref<number | null>(null);

const selectedPlan = computed<PlanCatalogEntry | null>(() => {
  const planId = registrationStore.plan?.planId as PlanId | null;
  if (!planId) return null;
  try {
    return findPlan(planId);
  } catch (error) {
    console.warn('[RegisterPayment] plan not found', error);
    return null;
  }
});

const checkoutId = computed(() => registrationStore.checkout.checkoutId);
const hasCheckoutUrl = computed(() => Boolean(registrationStore.checkout.url));
const planPriceLabel = computed(() => {
  if (!selectedPlan.value) {
    return '';
  }
  if (selectedPlan.value.monthlyPriceUsd === 0) {
    return t('plans.free');
  }
  return t('plans.pricePerMonth', { price: priceFormatter.format(selectedPlan.value.monthlyPriceUsd) });
});

const buildCheckoutUrls = () => {
  const successTarget = router.resolve({
    name: 'RegisterSuccess',
    params: { locale: route.params.locale },
  });
  const retryTarget = router.resolve({
    name: 'RegisterPayment',
    params: { locale: route.params.locale },
  });
  return {
    successUrl: `${window.location.origin}${successTarget.fullPath}`,
    cancelUrl: `${window.location.origin}${retryTarget.fullPath}`,
  };
};

const stopPolling = () => {
  if (pollingHandle.value !== null) {
    window.clearInterval(pollingHandle.value);
    pollingHandle.value = null;
  }
};

/**
 * Poll checkout status for the current registration session.
 * When the backend reports a paid session with a token, authenticate
 * the user and finish the registration flow.
 */
const pollCheckoutStatus = async () => {
  const id = checkoutId.value;
  const token = registrationStore.authToken;
  if (!id || !token) {
    return;
  }

  try {
    const { data } = await billingAPI.getCheckoutStatus(id, { token });
    if (data.status && data.status !== registrationStore.checkout.status) {
      await registrationStore.updateCheckoutStatus(data.status);
    }

    if (data.status === 'paid' || data.status === 'complete') {
      if (data.token) {
        auth.login(data.token, true, { user: data.user, tokenProvider: 'standard' });
      }
      await registrationStore.markCheckoutComplete(id);
      stopPolling();
      await router.push({ name: 'RegisterSuccess', params: { locale: route.params.locale } });
      return;
    }

    if (data.status === 'failed' || data.status === 'expired') {
      stopPolling();
      errorMessage.value = t('register.payment.errors.generic');
    }
  } catch (error) {
    console.error('[RegisterPayment] polling error', error);
  }
};

const startPolling = () => {
  if (pollingHandle.value !== null) {
    return;
  }
  void pollCheckoutStatus();
  pollingHandle.value = window.setInterval(() => {
    void pollCheckoutStatus();
  }, 3000);
};

const handleContinueToCheckout = async () => {
  if (!selectedPlan.value) {
    errorMessage.value = t('register.payment.errors.missingPlan');
    return;
  }

  errorMessage.value = null;
  infoMessage.value = null;
  isCreatingCheckout.value = true;

  try {
    // TODO: call /api/billing/checkout and redirect to Lemon Squeezy checkout.
    const token = registrationStore.authToken;
    if (!token) {
      throw new Error('MISSING_REGISTRATION_TOKEN');
    }

    const { successUrl, cancelUrl } = buildCheckoutUrls();
    const { data } = await billingAPI.createCheckoutSession(
      {
        planId: selectedPlan.value.id,
        successUrl,
        cancelUrl,
        clientSessionId: registrationStore.checkout.checkoutId ?? undefined,
      },
      { token },
    );

    await registrationStore.setCheckoutDraft({
      planId: selectedPlan.value.id,
      checkoutId: data.checkoutSessionId,
      checkoutUrl: data.checkoutUrl,
    });

    infoMessage.value = t('register.payment.placeholders.checkoutLink');
    window.open(data.checkoutUrl, '_blank', 'noopener');
    startPolling();
  } catch (error: unknown) {
    console.error('[RegisterPayment] checkout creation failed', error);
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const response = (error as any).response;
      errorMessage.value = response?.data?.message ?? t('register.payment.errors.generic');
    } else if ((error as Error)?.message === 'MISSING_REGISTRATION_TOKEN') {
      errorMessage.value = t('register.payment.errors.generic');
    } else {
      errorMessage.value = t('register.payment.errors.generic');
    }
  } finally {
    isCreatingCheckout.value = false;
  }
};

const handleBack = () => {
  router.push({ name: 'RegisterPlan', params: { locale: route.params.locale } });
};

watch(
  checkoutId,
  (id) => {
    if (id && registrationStore.checkout.status !== 'complete') {
      startPolling();
    } else if (!id) {
      stopPolling();
    }
  },
  { immediate: true },
);

// Mirror the browser hint in case the user re-opens the page mid-checkout.
watch(
  hasCheckoutUrl,
  (hasUrl) => {
    if (hasUrl) {
      infoMessage.value = t('register.payment.placeholders.checkoutLink');
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  stopPolling();
});
</script>

<template>
  <div class="register-panel">
    <header class="register-panel__header">
      <h2>{{ t('register.payment.title') }}</h2>
      <p>{{ t('register.payment.subtitle') }}</p>
    </header>

    <div v-if="selectedPlan" class="checkout-card card-glass-interactive">
      <div class="checkout-card__header">
        <h3>{{ selectedPlan.displayName }}</h3>
        <p>{{ planPriceLabel }}</p>
      </div>
      <ul class="checkout-card__highlights">
        <li v-for="bullet in selectedPlan.bullets" :key="bullet">{{ bullet }}</li>
      </ul>
      <dl class="checkout-summary">
        <div>
          <dt>{{ t('register.payment.summary.email') }}</dt>
          <dd>{{ registrationStore.account.email }}</dd>
        </div>
        <div>
          <dt>{{ t('register.payment.summary.billing') }}</dt>
          <dd>{{ t('register.payment.summary.billingNote') }}</dd>
        </div>
      </dl>
    </div>

    <p v-else class="form-error">{{ t('register.payment.errors.missingPlan') }}</p>

    <div class="checkout-actions">
      <button type="button" class="btn btn-ghost-ephemeral" @click="handleBack">
        {{ t('register.actions.back') }}
      </button>
      <button
        type="button"
        class="btn btn-primary-ephemeral"
        :disabled="isCreatingCheckout"
        @click="handleContinueToCheckout"
      >
        <span v-if="!isCreatingCheckout">{{ t('register.payment.cta') }}</span>
        <span v-else>{{ t('register.actions.processing') }}</span>
      </button>
    </div>

    <p v-if="infoMessage" class="form-info">{{ infoMessage }}</p>
    <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
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

.checkout-card {
  display: grid;
  gap: 1.25rem;
  border-radius: 18px;
  padding: clamp(1.5rem, 3vw, 2.25rem);
  border: 1px solid hsla(335, 60%, 45%, 0.3);
}

.checkout-card__header {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.checkout-card__highlights {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.35rem;
  font-size: 0.9rem;
  opacity: 0.85;
}

.checkout-summary {
  display: grid;
  gap: 0.75rem;
  margin: 0;
}

.checkout-summary div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.9rem;
  opacity: 0.85;
}

.checkout-actions {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.form-error {
  color: hsl(8 82% 68%);
}

.form-info {
  color: var(--color-accent-primary, hsl(335 80% 72%));
  font-size: 0.9rem;
}
</style>
