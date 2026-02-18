<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useRegistrationStore } from '@/store/registration.store';

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const registrationStore = useRegistrationStore();

const emailCache = ref(registrationStore.account.email);

onMounted(() => {
  registrationStore.reset();
});

const customerEmail = computed(() => emailCache.value);

const goToApp = () => {
  router.push({ name: 'Login', params: { locale: route.params.locale } });
};
</script>

<template>
  <div class="register-panel success-panel">
    <div class="success-icon" aria-hidden="true">✨</div>
    <h2>{{ t('register.success.title') }}</h2>
    <p>
      {{ t('register.success.subtitle', { email: customerEmail || t('register.success.placeholderEmail') }) }}
    </p>
    <button class="btn btn-primary-ephemeral" type="button" @click="goToApp">
      {{ t('register.success.cta') }}
    </button>
    <p class="success-support">
      {{ t('register.success.support') }}
      <a href="mailto:team@vca.chat" class="footer-link">team@vca.chat</a>
    </p>
  </div>
</template>

<style scoped>
.success-panel {
  text-align: center;
  display: grid;
  gap: 1.5rem;
  justify-items: center;
}

.success-icon {
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 2rem;
  background: linear-gradient(145deg, hsla(335, 90%, 72%, 0.2), hsla(335, 60%, 18%, 0.6));
  border: 1px solid hsla(335, 80%, 75%, 0.4);
}

.success-support {
  font-size: 0.9rem;
  opacity: 0.75;
}
</style>
