// File: frontend/src/views/About.vue /** * @file About.vue - Ephemeral Harmony Theme * @description
Composes the About page using dedicated section components. */
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import logoSvg from '@/assets/logo.svg';
import { useAuth } from '@/composables/useAuth';

import AboutPageHeader from '@/components/about/AboutPageHeader.vue';
import AboutHeroSection from '@/components/about/AboutHeroSection.vue';
import AboutMissionSection from '@/components/about/AboutMissionSection.vue';
import AboutAgentosSection from '@/components/about/AboutAgentosSection.vue';
import AboutPricingSection from '@/components/about/AboutPricingSection.vue';
import AboutArchitectureSection from '@/components/about/AboutArchitectureSection.vue';
import AboutRoadmapSection from '@/components/about/AboutRoadmapSection.vue';
import AboutFooterSection from '@/components/about/AboutFooterSection.vue';

const router = useRouter();
const route = useRoute();
const auth = useAuth();
const activeLocale = computed(() => (route.params.locale as string) || 'en-US');
const isGuestSession = computed(() => !auth.isAuthenticated.value);

const aboutMetaTitle = 'About Voice Chat Assistant & AgentOS';
const aboutMetaDescription =
  'Voice Chat Assistant is built by The Framers and AgentOS team—AI/NLP engineers, product designers, and game designers creating open-source, AGI-ready tooling.';
const aboutMetaKeywords =
  'Voice Chat Assistant, AgentOS, Framers, AGI, AI engineers, NLP, multi-agent, product designers, Frame.dev';

type MetaAttr = 'name' | 'property';
type MetaEntry = { attr: MetaAttr; key: string; value: string };

const metaSnapshots: Array<{
  element: HTMLMetaElement;
  attr: MetaAttr;
  key: string;
  previous: string | null;
  created: boolean;
}> = [];
let previousDocumentTitle = '';

const updateMetaTag = (entry: MetaEntry) => {
  if (typeof document === 'undefined') return;
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${entry.attr}="${entry.key}"]`);
  let created = false;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(entry.attr, entry.key);
    document.head.appendChild(element);
    created = true;
  }
  metaSnapshots.push({
    element,
    attr: entry.attr,
    key: entry.key,
    previous: element.getAttribute('content'),
    created,
  });
  element.setAttribute('content', entry.value);
};

onMounted(() => {
  if (typeof document === 'undefined') return;
  previousDocumentTitle = document.title;
  metaSnapshots.length = 0;

  const aboutUrl = `https://voice-chat-assistant.com/${activeLocale.value}/about`;
  const entries: MetaEntry[] = [
    { attr: 'name', key: 'description', value: aboutMetaDescription },
    { attr: 'name', key: 'keywords', value: aboutMetaKeywords },
    { attr: 'property', key: 'og:title', value: aboutMetaTitle },
    { attr: 'property', key: 'og:description', value: aboutMetaDescription },
    { attr: 'property', key: 'og:url', value: aboutUrl },
    { attr: 'name', key: 'twitter:title', value: aboutMetaTitle },
    { attr: 'name', key: 'twitter:description', value: aboutMetaDescription },
  ];

  entries.forEach(updateMetaTag);
  document.title = `${aboutMetaTitle} | Voice Chat Assistant`;
});

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return;
  metaSnapshots.forEach(({ element, previous, created }) => {
    if (created) {
      element.remove();
    } else if (previous !== null) {
      element.setAttribute('content', previous);
    } else {
      element.removeAttribute('content');
    }
  });
  metaSnapshots.length = 0;
  if (previousDocumentTitle) {
    document.title = previousDocumentTitle;
  }
});

const goHome = (): void => {
  router.push({ name: 'PublicHome', params: { locale: activeLocale.value } });
};
</script>

<template>
  <div class="about-page-ephemeral">
    <AboutPageHeader @back="goHome">
      <template #title>
        <h1 class="main-page-title">
          About <strong>Voice Chat Assistant</strong> and <strong>AgentOS</strong>
        </h1>
      </template>
    </AboutPageHeader>

    <main class="about-main-content-area">
      <AboutHeroSection :logo-src="logoSvg" :show-guest-badge="isGuestSession" />
      <AboutMissionSection />
      <AboutPricingSection />
      <AboutAgentosSection />
      <AboutArchitectureSection />
      <AboutRoadmapSection />
      <AboutFooterSection />
    </main>
  </div>
</template>

<style lang="scss">
// Styles remain defined in frontend/src/styles/views/_about-page.scss
</style>
