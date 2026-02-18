<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  type Ref,
  type Component as VueComponentType,
} from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import SystemLogDisplay from './ui/SystemLogDisplay.vue';
import { RouterLink } from 'vue-router';
// Import the COMPLEX, stateful HearingIndicator
import HearingIndicator from '@/components/ui/HearingIndicator.vue';
import { useReactiveStore, type AppState } from '@/store/reactive.store';
import { useUiStore } from '@/store/ui.store'; // For isReducedMotionPreferred

import {
  Cog6ToothIcon as ConfigIcon,
  CommandLineIcon as LogsIcon,
  CloudIcon as ApiDegradedIcon,
  WifiIcon as ApiOnlineIcon,
  NoSymbolIcon as ApiOfflineIcon,
  CodeBracketSquareIcon as SourceIcon,
  QuestionMarkCircleIcon as ApiCheckingIcon,
} from '@heroicons/vue/24/outline';

const APP_VERSION = '5.0.6';
const repositoryUrl: Ref<string> = ref('https://github.com/wearetheframers/agentos');
const logsOpen: Ref<boolean> = ref(false);
type ApiStatusValue = 'Operational' | 'Degraded' | 'Down' | 'Checking';
const apiStatus: Ref<ApiStatusValue> = ref<ApiStatusValue>('Checking');
let apiStatusInterval: number | undefined;

const reactiveStore = useReactiveStore();
const uiStore = useUiStore();
const { t } = useI18n();
const route = useRoute();

const currentLocale = computed(() => (route.params.locale as string) || 'en-US');

const withLocale = (path: string) => {
  if (!path) return `/${currentLocale.value}/`;
  if (path.startsWith('http') || path.startsWith('mailto:')) return path;
  if (path === '/') return `/${currentLocale.value}/`;
  if (path.startsWith('/#')) return `/${currentLocale.value}${path}`;
  return `/${currentLocale.value}${path}`;
};

const footerSections = computed(() => [
  {
    title: t('footer.company'),
    links: [
      { label: t('footer.links.about'), to: '/about' },
      { label: t('footer.links.careers'), href: 'https://frame.dev/careers' },
      { label: t('footer.links.frame'), href: 'https://frame.dev' },
      { label: t('footer.links.contact'), href: 'mailto:hello@frame.dev' },
    ],
  },
  {
    title: t('footer.product'),
    links: [
      { label: t('footer.links.features'), to: '/#features' },
      { label: t('footer.links.proWorkspace'), to: '/pro' },
      { label: t('footer.links.marketplace'), href: 'https://agentos.sh/marketplace' },
      { label: t('footer.links.docs'), href: 'https://docs.agentos.sh' },
    ],
  },
  {
    title: t('footer.resources'),
    links: [
      { label: t('footer.links.api'), href: 'https://docs.agentos.sh/api' },
      { label: t('footer.links.blog'), to: '/blog' },
      { label: t('footer.links.faq'), to: '/faq' },
      { label: t('footer.links.security'), href: 'https://agentos.sh/security' },
    ],
  },
  {
    title: t('footer.legal'),
    links: [
      { label: t('footer.links.privacy'), href: 'https://agentos.sh/legal/privacy' },
      { label: t('footer.links.terms'), href: 'https://agentos.sh/legal/terms' },
      { label: t('footer.links.sitemap'), href: '/sitemap.xml' },
    ],
  },
]);

// The HearingIndicator will use this appState to show its dynamic visuals
const appStateForFooterIndicator = computed<AppState>(() => reactiveStore.appState);

const apiStatusInfo = computed(() => {
  // ... (same as your provided code)
  switch (apiStatus.value) {
    case 'Operational':
      return {
        text: t('status.online'),
        class: 'text-status-success',
        icon: ApiOnlineIcon,
        dotClass: 'bg-status-success',
      };
    case 'Degraded':
      return {
        text: t('status.degraded'),
        class: 'text-status-warning',
        icon: ApiDegradedIcon,
        dotClass: 'bg-status-warning',
      };
    case 'Down':
      return {
        text: t('status.offline'),
        class: 'text-status-error',
        icon: ApiOfflineIcon,
        dotClass: 'bg-status-error',
      };
    default:
      return {
        text: t('status.checking'),
        class: 'text-status-muted',
        icon: ApiCheckingIcon,
        dotClass: 'bg-status-muted animate-pulse',
      };
  }
});

const toggleLogsPanel = (): void => {
  logsOpen.value = !logsOpen.value;
};

const checkApiStatus = async (): Promise<void> => {
  const statuses: ApiStatusValue[] = [
    'Operational',
    'Degraded',
    'Down',
    'Operational',
    'Operational',
    'Checking',
  ];
  apiStatus.value = statuses[Math.floor(Math.random() * statuses.length)];
};

const handleFooterHearingIndicatorClick = () => {
  // This is the main interaction point, e.g., toggle microphone listening state
  // This should ideally call a method in a store (e.g., appManager.toggleListening())
  console.log(
    'Footer HearingIndicator Clicked. Current App State:',
    appStateForFooterIndicator.value
  );
  if (reactiveStore.appState === 'idle' || reactiveStore.appState === 'error') {
    reactiveStore.transitionToState('listening');
  } else if (
    reactiveStore.appState === 'listening' ||
    reactiveStore.appState === 'speaking' ||
    reactiveStore.appState === 'responding'
  ) {
    reactiveStore.transitionToState('idle'); // or a specific 'stop' state
  }
  // Add actual logic to toggle listening state via a store action
};

onMounted(() => {
  checkApiStatus();
  apiStatusInterval = window.setInterval(checkApiStatus, 30000);
});

onUnmounted(() => {
  if (apiStatusInterval) clearInterval(apiStatusInterval);
});
</script>

<template>
  <footer class="app-footer-ephemeral" role="contentinfo">
    <Transition name="slide-up-fade-logs">
      <div v-if="logsOpen" class="logs-panel-wrapper-ephemeral">
        <SystemLogDisplay class="logs-display-card-ephemeral" />
      </div>
    </Transition>

    <div class="footer-content-wrapper-ephemeral">
      <div class="footer-main-row-ephemeral">
        <div class="footer-branding-ephemeral">
          <img src="@/assets/logo.svg" alt="VCA Logo" class="footer-logo-ephemeral" />
          <p class="footer-copyright-ephemeral">
            &copy; {{ new Date().getFullYear() }} VCA.Chat. {{ t('common.allRightsReserved') }}
          </p>
        </div>

        <div
          class="footer-center-indicator-ephemeral"
          @click="handleFooterHearingIndicatorClick"
          role="button"
          tabindex="0"
        >
          <HearingIndicator
            :customState="appStateForFooterIndicator"
            :size="44"
            :interactive="true"
            :showLabel="false"
          />
        </div>

        <div class="footer-status-actions-ephemeral">
          <div class="api-status-indicator-ephemeral" :title="apiStatusInfo.text">
            <component
              :is="apiStatusInfo.icon"
              class="icon api-status-icon"
              :class="apiStatusInfo.class"
              aria-hidden="true"
            />
            <span class="status-text hidden md:inline" :class="apiStatusInfo.class">{{
              apiStatusInfo.text
            }}</span>
            <span class="status-dot" :class="apiStatusInfo.dotClass" aria-hidden="true"></span>
          </div>
          <button
            @click="toggleLogsPanel"
            class="footer-action-button-ephemeral"
            :class="{ active: logsOpen }"
            title="Toggle System Logs"
            aria-label="Toggle System Logs Display"
            :aria-pressed="logsOpen"
          >
            <LogsIcon class="icon" aria-hidden="true" />
            <span class="action-text hidden sm:inline">{{ t('common.logs') }}</span>
          </button>
          <a
            :href="repositoryUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="footer-action-button-ephemeral"
            title="View Source Code on GitHub"
            aria-label="View Source Code on GitHub"
          >
            <SourceIcon class="icon" aria-hidden="true" />
            <span class="action-text hidden sm:inline">{{ t('common.source') }}</span>
          </a>
          <RouterLink
            :to="`/${route.params.locale || 'en-US'}/settings`"
            class="footer-action-button-ephemeral"
            title="Open Application Settings"
            aria-label="Open Application Settings"
          >
            <ConfigIcon class="icon" aria-hidden="true" />
            <span class="action-text hidden sm:inline">{{ t('common.settings') }}</span>
          </RouterLink>
        </div>
      </div>

      <div class="footer-links-grid-ephemeral" aria-label="Footer navigation">
        <div
          v-for="section in footerSections"
          :key="section.title"
          class="footer-links-column-ephemeral"
        >
          <p class="footer-section-title-ephemeral">{{ section.title }}</p>
          <ul class="footer-links-list-ephemeral">
            <li v-for="link in section.links" :key="link.label">
              <RouterLink v-if="link.to" :to="withLocale(link.to)" class="footer-link-ephemeral">
                {{ link.label }}
              </RouterLink>
              <a
                v-else
                :href="link.href"
                class="footer-link-ephemeral"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ link.label }}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </footer>
</template>

<style lang="scss" scoped>
.footer-links-grid-ephemeral {
  margin-top: 2.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1.5rem;
}

.footer-links-column-ephemeral {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.footer-section-title-ephemeral {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.85rem;
  color: hsla(
    var(--color-text-primary-h),
    var(--color-text-primary-s),
    var(--color-text-primary-l),
    0.85
  );
}

.footer-links-list-ephemeral {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.footer-link-ephemeral {
  font-size: 0.9rem;
  color: hsla(
    var(--color-text-secondary-h),
    var(--color-text-secondary-s),
    var(--color-text-secondary-l),
    0.85
  );
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover,
  &:focus-visible {
    color: hsl(
      var(--color-accent-primary-h),
      var(--color-accent-primary-s),
      var(--color-accent-primary-l)
    );
    text-decoration: underline;
  }
}

@media (max-width: 640px) {
  .footer-links-grid-ephemeral {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }
}
</style>
