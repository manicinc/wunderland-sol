<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useRegistrationStore } from '@/store/registration.store';
import { authAPI } from '@/utils/api';

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const registrationStore = useRegistrationStore();

const form = reactive({
  email: registrationStore.account.email,
  password: registrationStore.account.password,
  acceptTerms: registrationStore.account.acceptTerms ?? false,
});

const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);

/**
 * Submit the account form, creating a temporary registration session on the API.
 * The backend returns a short-lived JWT that authorises the subsequent checkout calls.
 */
const handleSubmit = async () => {
  errorMessage.value = null;

  if (!form.email || !form.password) {
    errorMessage.value = t('register.account.errors.missingFields');
    return;
  }
  if (!form.acceptTerms) {
    errorMessage.value = t('register.account.errors.mustAcceptTerms');
    return;
  }

  try {
    isSubmitting.value = true;

    const payload = {
      email: form.email.trim(),
      password: form.password,
    };
    const { data } = await authAPI.register(payload);
    if (!data?.token) {
      throw new Error('REGISTRATION_TOKEN_MISSING');
    }

    await registrationStore.setAccount({
      email: payload.email,
      password: form.password,
      acceptTerms: form.acceptTerms,
    });
    await registrationStore.setAuthToken(data.token);

    await router.push({
      name: 'RegisterPlan',
      params: { locale: route.params.locale },
    });
  } catch (error: unknown) {
    console.error('[RegisterAccount] submit failed', error);
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const response = (error as any).response;
      errorMessage.value = response?.data?.message ?? t('register.account.errors.generic');
    } else {
      errorMessage.value = t('register.account.errors.generic');
    }
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="register-panel">
    <header class="register-panel__header">
      <h2>{{ t('register.account.title') }}</h2>
      <p>{{ t('register.account.subtitle') }}</p>
    </header>

    <form class="register-form" @submit.prevent="handleSubmit">
      <label class="form-field">
        <span class="form-label">{{ t('register.account.emailLabel') }}</span>
        <input
          v-model="form.email"
          type="email"
          inputmode="email"
          autocomplete="email"
          required
          :placeholder="t('register.account.emailPlaceholder')"
        />
      </label>

      <label class="form-field">
        <span class="form-label">{{ t('register.account.passwordLabel') }}</span>
        <input
          v-model="form.password"
          type="password"
          autocomplete="new-password"
          minlength="8"
          required
          :placeholder="t('register.account.passwordPlaceholder')"
        />
        <small class="form-hint">{{ t('register.account.passwordHint') }}</small>
      </label>

      <label class="checkbox-field">
        <input v-model="form.acceptTerms" type="checkbox" />
        <span v-html="t('register.account.termsLabel')"></span>
      </label>

      <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

      <button type="submit" class="btn btn-primary-ephemeral" :disabled="isSubmitting">
        <span v-if="!isSubmitting">{{ t('register.actions.continue') }}</span>
        <span v-else>{{ t('register.actions.processing') }}</span>
      </button>
    </form>
  </div>
</template>

<style scoped>
.register-panel {
  display: grid;
  gap: 1.5rem;
}

.register-panel__header {
  display: grid;
  gap: 0.45rem;
}

.register-panel__header h2 {
  font-size: clamp(1.6rem, 3vw, 1.9rem);
  font-weight: 600;
  margin: 0;
}

.register-panel__header p {
  opacity: 0.8;
  margin: 0;
  font-size: 0.95rem;
}

.register-form {
  display: grid;
  gap: 1.25rem;
}

.form-field {
  display: grid;
  gap: 0.45rem;
}

.form-label {
  font-weight: 500;
  font-size: 0.95rem;
}

input[type='email'],
input[type='password'] {
  width: 100%;
  padding: 0.8rem 1rem;
  border-radius: 12px;
  border: 1px solid hsl(335 25% 40% / 0.6);
  background: hsla(335, 35%, 16%, 0.65);
  color: inherit;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input[type='email']:focus,
input[type='password']:focus {
  outline: none;
  border-color: var(--color-accent-primary, hsl(335 80% 72% / 0.8));
  box-shadow: 0 0 0 3px hsla(335, 80%, 72%, 0.25);
  background: hsla(335, 40%, 18%, 0.85);
}

.form-hint {
  font-size: 0.8rem;
  opacity: 0.65;
}

.checkbox-field {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  font-size: 0.9rem;
  line-height: 1.4;
}

.checkbox-field input[type='checkbox'] {
  margin-top: 0.2rem;
}

.form-error {
  color: hsl(8 82% 68%);
  font-size: 0.9rem;
}

.btn {
  justify-content: center;
}
</style>
