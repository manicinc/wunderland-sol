<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline';
import { useOrganizations } from '@/composables/useOrganizations';
import { useAuth } from '@/composables/useAuth';
import type { ToastService } from '@/services/services';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const toast = inject<ToastService>('toast');

const { acceptInvite } = useOrganizations();
const auth = useAuth();

const token = computed(() => route.params.token as string | undefined);
const status = ref<'pending' | 'success' | 'error'>('pending');
const errorMessage = ref('');

const localeParam = computed(() => route.params.locale as string);

const redirectToSettings = () => {
  void router.replace({ name: 'Settings', params: { locale: localeParam.value } });
};

onMounted(async () => {
  if (!token.value) {
    status.value = 'error';
    errorMessage.value = t('organization.inviteAccept.missingToken');
    return;
  }

  if (!auth.isAuthenticated.value) {
    await router.replace({
      name: 'Login',
      params: { locale: localeParam.value },
      query: { redirect: route.fullPath },
    });
    return;
  }

  try {
    await acceptInvite(token.value);
    status.value = 'success';
    toast?.add({
      type: 'success',
      title: t('organization.inviteAccept.toastTitle'),
      message: t('organization.inviteAccept.toastMessage'),
    });
  } catch (error: any) {
    console.error('[AcceptInvite] Failed to accept invite', error);
    status.value = 'error';
    errorMessage.value = error?.response?.data?.message ?? t('organization.toast.genericError');
  }
});
</script>

<template>
  <div class="invite-accept">
    <div v-if="status === 'pending'" class="invite-state pending">
      <ArrowPathIcon class="icon-spin" aria-hidden="true" />
      <h1>{{ t('organization.inviteAccept.pendingTitle') }}</h1>
      <p>{{ t('organization.inviteAccept.pendingMessage') }}</p>
    </div>

    <div v-else-if="status === 'success'" class="invite-state success">
      <CheckCircleIcon class="icon-success" aria-hidden="true" />
      <h1>{{ t('organization.inviteAccept.successTitle') }}</h1>
      <p>{{ t('organization.inviteAccept.successMessage') }}</p>
      <button class="btn btn-primary" @click="redirectToSettings">
        {{ t('organization.inviteAccept.goToSettings') }}
      </button>
    </div>

    <div v-else class="invite-state error">
      <ExclamationTriangleIcon class="icon-error" aria-hidden="true" />
      <h1>{{ t('organization.inviteAccept.errorTitle') }}</h1>
      <p>{{ errorMessage }}</p>
      <button class="btn btn-secondary" @click="redirectToSettings">
        {{ t('organization.inviteAccept.backToSettings') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.invite-accept {
  min-height: calc(100vh - 6rem);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
}

.invite-state {
  max-width: 520px;
  width: 100%;
  border-radius: 1.25rem;
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  text-align: center;
  box-shadow: 0 24px 60px hsla(var(--color-shadow-h), var(--color-shadow-s), var(--color-shadow-l), 0.18);
  background: hsla(var(--color-surface-primary-h), var(--color-surface-primary-s), var(--color-surface-primary-l), 0.75);
}

.invite-state h1 {
  font-size: 1.4rem;
  font-weight: 600;
}

.invite-state p {
  color: hsla(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l), 0.95);
}

.icon-spin {
  width: 3rem;
  height: 3rem;
  align-self: center;
  animation: spin 1s linear infinite;
  color: hsla(var(--color-accent-h), var(--color-accent-s), var(--color-accent-l), 0.65);
}

.icon-success {
  width: 3rem;
  height: 3rem;
  align-self: center;
  color: hsl(var(--color-success-h), var(--color-success-s), var(--color-success-l));
}

.icon-error {
  width: 3rem;
  height: 3rem;
  align-self: center;
  color: hsl(var(--color-error-h), var(--color-error-s), var(--color-error-l));
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
