<!-- ═══════════════════════════════════════════════════════════════════════════
     File: frontend/src/components/Header.vue  ·  v12.1.1 (async-imports fixed)
     ═══════════════════════════════════════════════════════════════════════════ -->
<script setup lang="ts">
/* ────────────────── imports ────────────────── */
import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  defineAsyncComponent,
  type Ref,
  type PropType,
} from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

import { useUiStore } from '@/store/ui.store';
import { useAuth } from '@/composables/useAuth';
import { useChatStore } from '@/store/chat.store';
import { useAgentStore } from '@/store/agent.store';
import type { IAgentDefinition } from '@/services/agent.service';

import AnimatedLogoIcon from '@/components/ui/AnimatedLogoIcon.vue';
import AnimatedTextLogo from '@/components/ui/AnimatedTextLogo.vue';

/* 100 % ASYNC  (wrapped with defineAsyncComponent) */
const ThemeDropdown = defineAsyncComponent(() => import('./header/ThemeSelectionDropdown.vue'));
const UserDropdown = defineAsyncComponent(() => import('./header/UserSettingsDropdown.vue'));
const VoiceDropdown = defineAsyncComponent(() => import('./header/VoiceControlsDropdown.vue'));
const SiteMenuDropdown = defineAsyncComponent(() => import('./header/SiteMenuDropdown.vue'));
const AgentHubTrigger = defineAsyncComponent(() => import('./header/AgentHubTrigger.vue'));
const AgentHub = defineAsyncComponent(() => import('@/components/agents/AgentHub.vue'));
const MobileNavPanel = defineAsyncComponent(() => import('./header/MobileNavPanel.vue'));
const LanguageSwitcher = defineAsyncComponent(() => import('@/components/LanguageSwitcher.vue'));
const DarkLightToggle = defineAsyncComponent(() => import('./header/DarkLightToggle.vue'));

import {
  Bars3Icon,
  XMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/vue/24/outline';

/* ────────────────── props / emits ────────────────── */
const props = defineProps({
  /** STT: user microphone live */
  isUserListening: { type: Boolean as PropType<boolean>, default: false },
  /** AI is streaming text or TTS speaking */
  isAssistantSpeaking: { type: Boolean as PropType<boolean>, default: false },
});

const emit = defineEmits<{
  (e: 'toggle-fullscreen'): void;
  (e: 'logout'): void;
  (e: 'clear-chat-and-session'): void;
  (e: 'show-prior-chat-log'): void;
}>();

/* ────────────────── stores / state ────────────────── */
const uiStore = useUiStore();
const auth = useAuth();
const chatStore = useChatStore();
const agentStore = useAgentStore();
const { t } = useI18n();

const router = useRouter();
const route = useRoute();

const activeAgent = computed<IAgentDefinition | undefined>(() => agentStore.activeAgent);

const isAiActive = computed(() => props.isAssistantSpeaking || chatStore.isMainContentStreaming);
const isUserActive = computed(() => props.isUserListening && !isAiActive.value);
const isFullscreen = computed(() => uiStore.isBrowserFullscreenActive);

const isMuted: Ref<boolean> = ref(false);

const isMobileMenu = ref(false);
const isAgentHubOpen = ref(false);

/* ─── intro animation: wait until page fully rendered ─── */
const introFlagKey = 'vca-hdr-played';
const playIntroNow = ref(false);

function startIntroIfFirstVisit() {
  if (sessionStorage.getItem(introFlagKey)) return;
  sessionStorage.setItem(introFlagKey, '1');
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      playIntroNow.value = true;
    })
  );
}

onMounted(() => {
  if (document.readyState === 'complete') {
    startIntroIfFirstVisit();
  } else {
    window.addEventListener('load', startIntroIfFirstVisit, { once: true });
  }
});

/* ────────────────── navigation helpers ────────────────── */
function gotoHome() {
  isMobileMenu.value = false;
  route.path === '/' ? window.location.reload() : router.push('/');
}
function keyHome(e: KeyboardEvent) {
  if (e.key === 'Enter') gotoHome();
}

function openAgentHub() {
  isMobileMenu.value = false;
  isAgentHubOpen.value = true;
}
function closeAgentHub() {
  isAgentHubOpen.value = false;
}

/* disable body scroll when overlay open */
watch([isMobileMenu, isAgentHubOpen], ([m, h]) => {
  document.body.classList.toggle('overflow-hidden-by-app-overlay', m || h);
});
onUnmounted(() => document.body.classList.remove('overflow-hidden-by-app-overlay'));
</script>

<template>
  <header
    class="vca-header"
    :class="{
      'intro-play': playIntroNow,
      'ai-active': isAiActive,
      'user-active': isUserActive,
      fullscreen: isFullscreen,
      'hub-open': isAgentHubOpen,
    }"
  >
    <div class="hdr-wrap">
      <!-- LOGO -->
      <div
        class="logo-block"
        role="button"
        tabindex="0"
        aria-label="Voice Chat Assistant — Home"
        @click="gotoHome"
        @keydown="keyHome"
      >
        <AnimatedLogoIcon
          :is-user-listening="isUserActive"
          :is-ai-speaking-or-processing="isAiActive"
          :is-mobile-context="uiStore.isSmallScreen"
        />

        <AnimatedTextLogo :play="playIntroNow" />
      </div>

      <!-- CENTER: hearing icon -->
      <div
        class="hear-wrap"
        :title="
          isUserActive ? t('voice.listening') : isAiActive ? t('voice.speaking') : t('common.idle')
        "
      >
        <img src="@/assets/hearing.svg" class="hear-icon" alt="" />
      </div>

      <!-- DESKTOP CONTROLS -->
      <nav class="desk-ctrls" aria-label="Desktop navigation">
        <Suspense><AgentHubTrigger @open-agent-hub="openAgentHub" class="ctrl-btn" /></Suspense>
        <Suspense><ThemeDropdown class="ctrl-btn" /></Suspense>
        <Suspense><DarkLightToggle class="ctrl-btn" /></Suspense>

        <!-- language switcher -->
        <Suspense><LanguageSwitcher class="lang-switcher-header" /></Suspense>

        <!-- fullscreen -->
        <button
          class="ctrl-btn"
          @click="emit('toggle-fullscreen')"
          :title="isFullscreen ? t('common.exitFullscreen') : t('common.enterFullscreen')"
        >
          <component :is="isFullscreen ? ArrowsPointingInIcon : ArrowsPointingOutIcon" />
        </button>

        <!-- mute -->
        <button
          class="ctrl-btn"
          @click="isMuted = !isMuted"
          :title="isMuted ? t('voice.unmute') : t('voice.mute')"
        >
          <component :is="isMuted ? SpeakerXMarkIcon : SpeakerWaveIcon" />
        </button>

        <RouterLink
          :to="`/${$route.params.locale || 'en-US'}/about`"
          class="ctrl-btn header-nav-link"
        >
          {{ t('common.about') }}
        </RouterLink>

        <Suspense><VoiceDropdown class="ctrl-btn" /></Suspense>

        <template v-if="auth.isAuthenticated.value">
          <Suspense>
            <UserDropdown
              class="ctrl-btn"
              @logout="emit('logout')"
              @clear-chat-and-session="emit('clear-chat-and-session')"
              @show-prior-chat-log="emit('show-prior-chat-log')"
            />
          </Suspense>
        </template>
        <template v-else>
          <RouterLink :to="`/${$route.params.locale || 'en-US'}/login`" class="ctrl-btn">
            <ArrowLeftOnRectangleIcon /> {{ t('common.login') }}
          </RouterLink>
        </template>

        <Suspense><SiteMenuDropdown class="ctrl-btn" /></Suspense>
      </nav>

      <!-- MOBILE BURGER -->
      <div class="m-burger">
        <button
          class="burger-btn"
          @click="isMobileMenu = !isMobileMenu"
          :aria-expanded="isMobileMenu"
        >
          <component :is="isMobileMenu ? XMarkIcon : Bars3Icon" />
        </button>
      </div>
    </div>

    <!-- MOBILE DRAWER & AGENT HUB -->
    <Suspense>
      <MobileNavPanel
        :is-open="isMobileMenu"
        :is-user-listening="isUserActive"
        :is-ai-state-active="isAiActive"
        :is-authenticated="auth.isAuthenticated.value"
        @close-panel="isMobileMenu = false"
        @open-agent-hub="openAgentHub"
        @logout="
          emit('logout');
          isMobileMenu = false;
        "
      />
    </Suspense>
    <Suspense><AgentHub :is-open="isAgentHubOpen" @close="closeAgentHub" /></Suspense>
  </header>
</template>

<style lang="scss" scoped>
@use '@/styles/abstracts/variables' as v;
@use '@/styles/abstracts/mixins' as m;

/* keyframes */
@keyframes intro-slide {
  0% {
    opacity: 0;
    transform: translateY(-60%) scale(0.92);
  }
  60% {
    opacity: 1;
    transform: translateY(6%) scale(1.03);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes glow-user {
  0%,
  100% {
    box-shadow: 0 0 8px
      hsla(var(--color-voice-user-h), var(--color-voice-user-s), var(--color-voice-user-l), 0.55);
  }
  50% {
    box-shadow: 0 0 12px 4px
      hsla(var(--color-voice-user-h), var(--color-voice-user-s), var(--color-voice-user-l), 0.9);
  }
}
@keyframes glow-ai {
  0%,
  100% {
    box-shadow: 0 0 8px
      hsla(
        var(--color-voice-ai-speaking-h),
        var(--color-voice-ai-speaking-s),
        var(--color-voice-ai-speaking-l),
        0.55
      );
  }
  50% {
    box-shadow: 0 0 12px 4px
      hsla(
        var(--color-voice-ai-speaking-h),
        var(--color-voice-ai-speaking-s),
        var(--color-voice-ai-speaking-l),
        0.9
      );
  }
}

/* header shell */
.vca-header {
  position: sticky;
  top: 0;
  inset-inline: 0;
  z-index: calc(v.$z-index-sticky + 20);
  height: var(--header-height-mobile, 60px);
  padding-inline: v.$spacing-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(9px);
  background-color: hsla(
    var(--color-bg-primary-h),
    var(--color-bg-primary-s),
    var(--color-bg-primary-l),
    0.85
  );
  border-bottom: 1px solid
    hsla(
      var(--color-border-primary-h),
      var(--color-border-primary-s),
      var(--color-border-primary-l),
      0.3
    );
  transition:
    background-color 0.35s,
    border-color 0.35s;

  @media (min-width: v.$breakpoint-md) {
    height: var(--header-height-desktop, 72px);
    padding-inline: v.$spacing-lg;
  }

  &.intro-play {
    animation: intro-slide 0.7s cubic-bezier(0.64, -0.58, 0.34, 1.56) both;
  }
  &.user-active {
    animation: glow-user 3.5s ease-in-out infinite alternate;
  }
  &.ai-active {
    animation: glow-ai 2.6s ease-in-out infinite alternate;
  }
}

/* layout wrapper */
.hdr-wrap {
  display: flex;
  width: 100%;
  max-width: v.$site-max-width;
  align-items: center;
  justify-content: space-between;
}

/* logo block */
.logo-block {
  display: inline-flex;
  gap: 0.55rem;
  align-items: center;
  cursor: pointer;
  height: calc(var(--header-height-mobile, 60px) * 0.65);

  @media (min-width: v.$breakpoint-md) {
    height: calc(var(--header-height-desktop, 72px) * 0.55);
  }

  &:hover .logo-word,
  &:focus-visible .logo-word {
    text-decoration: underline;
  }
  &:focus-visible {
    @include m.focus-ring();
  }
}

/* hearing icon */
.hear-wrap {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  .hear-icon {
    width: 26px;
    height: 26px;
    @media (min-width: v.$breakpoint-md) {
      width: 30px;
      height: 30px;
    }
  }
}

/* desktop control cluster */
.desk-ctrls {
  display: none;
  gap: v.$spacing-xs;
  align-items: center;
  @media (min-width: v.$breakpoint-lg) {
    display: flex;
  }

  .ctrl-btn {
    @include m.button-base;
    @include m.button-ghost();
    padding: 0.45rem;
    border-radius: v.$radius-lg;
    svg {
      width: 1.35rem;
      height: 1.35rem;
    }
  }

  .header-nav-link {
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding-inline: 1rem;
    font-size: 0.82rem;
  }

  .lang-switcher-header {
    padding: 0.25rem 0.5rem;
    background-color: hsla(
      var(--color-bg-secondary-h),
      var(--color-bg-secondary-s),
      var(--color-bg-secondary-l),
      0.5
    );
    border-radius: v.$radius-md;
    transition: background-color 0.2s;

    &:hover {
      background-color: hsla(
        var(--color-bg-secondary-h),
        var(--color-bg-secondary-s),
        var(--color-bg-secondary-l),
        0.7
      );
    }
  }
}

/* mobile burger */
.m-burger {
  display: flex;
  align-items: center;
  @media (min-width: v.$breakpoint-lg) {
    display: none;
  }
  .burger-btn {
    @include m.button-base;
    padding: 0.55rem;
    svg {
      width: 1.5rem;
      height: 1.5rem;
    }
  }
}
</style>
