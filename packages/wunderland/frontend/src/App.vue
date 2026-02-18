// File: frontend/src/App.vue
/**
 * @file App.vue
 * @version 5.1.0
 * @description Main application shell. Integrates global components like Header and Footer,
 * manages global UI states (loading, toasts, themes via UiStore and ThemeManager),
 * and handles application-level logic such as authentication status checks,
 * voice settings initialization, and a refined logout process that ensures proper
 * page refresh/redirection.
 *
 * @component App
 * @emits None directly from App itself, but provides context for child component emissions.
 */
<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  provide,
  readonly,
  type Component as VueComponentType,
  watch,
  type Ref
} from 'vue';
import { useRouter, useRoute, type RouteLocationNormalized } from 'vue-router';
import AppHeader from '@/components/Header.vue';
import AppFooter from '@/components/Footer.vue';

// Pinia Stores
import { storeToRefs } from 'pinia';
import { useCostStore } from './store/cost.store';
import { useAgentStore } from '@/store/agent.store';
import { useChatStore } from '@/store/chat.store';
import { useUiStore } from '@/store/ui.store';

// Services & Managers
import { themeManager } from '@/theme/ThemeManager';
import { useAuth } from '@/composables/useAuth';
import { voiceSettingsManager } from './services/voice.settings.service';
import { ttsService } from './services/tts.service';
import { agentService } from '@/services/agent.service';
import { systemAPI, type LlmStatusResponseFE } from '@/utils/api';
import { isAxiosError } from 'axios';
import { i18n } from '@/i18n';
import CapabilityBanner from '@/components/system/CapabilityBanner.vue';
import { useConnectivityStore } from '@/store/connectivity.store';

// Icons for Toasts
import {
  CheckCircleIcon as SuccessIcon,
  XCircleIcon as ErrorIcon,
  ExclamationTriangleIcon as WarningIcon,
  InformationCircleIcon as InfoIcon,
  XMarkIcon, // For toast close button
} from '@heroicons/vue/24/solid';

const router = useRouter();
const route = useRoute();

const costStore = useCostStore();
const { totalSessionCost, isLoadingCost } = storeToRefs(costStore);
const agentStore = useAgentStore();
const chatStore = useChatStore();
const uiStore = useUiStore();
const auth = useAuth(); // useAuth composable instance

const isLoadingApp: Ref<boolean> = ref(true);
provide('loading', readonly({
  show: () => isLoadingApp.value = true,
  hide: () => isLoadingApp.value = false,
  isLoading: isLoadingApp
}));
const isLocaleTransitioning = ref(false);
const localeTransitionTimer = ref<number | null>(null);
const connectivityStore = useConnectivityStore();

/**
 * @computed showAppFooter
 * @description Determines if the AppFooter component should be displayed based on route metadata.
 * @returns {boolean} True if the footer should be shown, false otherwise.
 */
const showAppFooter = computed(() => !route.meta.hideFooter);

/**
 * @computed templateThemeId
 * @description Gets the current theme ID from the UI store to apply to the root app shell.
 * @returns {string} The current theme ID.
 */
const templateThemeId = computed<string>(() => uiStore.currentThemeId);

/**
 * @interface Toast
 * @description Defines the structure for a toast notification object.
 */
interface Toast {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}
const toasts: Ref<Toast[]> = ref([]);
let toastIdCounter = 0;

/**
 * @function addToast
 * @description Adds a new toast notification to the display queue.
 * @param {Omit<Toast, 'id'>} toastDetails - The details of the toast to add.
 * @returns {number} The ID of the newly added toast.
 */
const addToast = (toastDetails: Omit<Toast, 'id'>): number => {
  const id = toastIdCounter++;
  const newToast: Toast = {
    id,
    ...toastDetails,
    duration: toastDetails.duration === undefined ? 7000 : toastDetails.duration, // Default duration 7s
  };
  toasts.value.unshift(newToast); // Add to the beginning of the array to show newest on top
  if (newToast.duration && newToast.duration > 0) { // Auto-dismiss if duration is set
    setTimeout(() => removeToast(id), newToast.duration);
  }
  return id;
};

/**
 * @function removeToast
 * @description Removes a toast notification from the display queue by its ID.
 * @param {number} id - The ID of the toast to remove.
 */
const removeToast = (id: number): void => {
  toasts.value = toasts.value.filter(t => t.id !== id);
};
// Provide toast functionality to child components
provide('toast', { add: addToast, remove: removeToast, toasts: readonly(toasts) });

/**
 * @function getToastIcon
 * @description Returns the appropriate Heroicon component based on the toast type.
 * @param {Toast['type']} type - The type of the toast.
 * @returns {VueComponentType} The Vue component for the icon.
 */
const getToastIcon = (type: Toast['type']): VueComponentType => {
  switch (type) {
    case 'success': return SuccessIcon;
    case 'error': return ErrorIcon;
    case 'warning': return WarningIcon;
    default: return InfoIcon;
  }
};

const loadingOverlayMessage = computed(() =>
  isLocaleTransitioning.value ? 'Switching language…' : ''
);

const localeRef = i18n.global.locale;

watch(localeRef, (newLocale, oldLocale) => {
  if (!newLocale || newLocale === oldLocale) return;
  voiceSettingsManager.applyInterfaceLocale(newLocale as string);
});

const summarizeProviderIssues = (providers?: LlmStatusResponseFE['providers']): string => {
  if (!providers) {
    return 'No provider diagnostics available.';
  }
  const unavailable = Object.entries(providers)
    .filter(([, details]) => !details.available);
  if (unavailable.length === 0) {
    return 'All configured providers report ready states.';
  }
  return unavailable.map(([key, details]) => {
    const name = key.toUpperCase();
    const reason = details.reason || 'Unavailable.';
    const hint = details.hint ? ` ${details.hint}` : '';
    const envVar = details.envVar ? ` (env: ${details.envVar})` : '';
    return `<strong>${name}</strong>: ${reason}${envVar}${hint}`;
  }).join('<br />');
};

const checkLlmBootstrapStatus = async (): Promise<void> => {
  try {
    const { data } = await systemAPI.getLlmStatus();
    if (!data.ready) {
      const summary = summarizeProviderIssues(data.providers);
      addToast({
        type: 'error',
        title: 'Assistant Offline',
        message: `${data.message ?? 'LLM services are unavailable.'}<br />${summary}`,
        duration: 12000,
      });
      console.warn('[App.vue] LLM bootstrap status reported unavailable:', data);
    }
  } catch (error) {
    if (isAxiosError<LlmStatusResponseFE>(error) && error.response?.data) {
      const data = error.response.data;
      const summary = summarizeProviderIssues(data.providers);
      addToast({
        type: 'error',
        title: 'Assistant Offline',
        message: `${data.message ?? 'LLM services failed to initialize.'}<br />${summary}`,
        duration: 12000,
      });
      console.error('[App.vue] LLM bootstrap request failed:', error.response.status, data);
    } else {
      console.error('[App.vue] Unexpected error while checking LLM status:', error);
      addToast({
        type: 'warning',
        title: 'Assistant Status Unknown',
        message: 'Could not verify assistant availability. Some features may be offline.',
      });
    }
  }
};

// Session cost is used in the template for display
// const sessionCost = computed<number>(() => costStore.totalSessionCost);

/**
 * @function handleClearChatAndSession
 * @description Clears chat history for the active agent (or all agents if none active)
 * and resets the session cost. Provides user feedback via toasts.
 * @async
 */
const handleClearChatAndSession = async (): Promise<void> => {
  addToast({ type: 'info', title: 'Clearing Session', message: 'Wiping chat history and session costs...' });
  if (agentStore.activeAgentId) {
    await chatStore.clearAgentData(agentStore.activeAgentId);
    chatStore.ensureMainContentForAgent(agentStore.activeAgentId); // Re-ensure welcome/default content
  } else {
    // If no specific agent is active, this might imply clearing all data,
    // or it might be an edge case depending on app flow.
    // Assuming clearAllAgentData is appropriate here.
    chatStore.clearAllAgentData();
  }
  await costStore.resetSessionCost();
  addToast({ type: 'success', title: 'Session Cleared', message: 'Chat and costs for this session have been reset.' });
};

/**
 * @function handleLogoutFromHeader
 * @description Handles the logout process initiated from the header.
 * Calls the `auth.logout` composable function, which manages token clearing,
 * store resets (now handled within useAuth.ts), and page redirection/refresh.
 * @async
 */
const handleLogoutFromHeader = async (): Promise<void> => {
  addToast({ type: 'info', title: 'Logging Out', message: 'Please wait...' });
  
  // The useAuth().logout() composable now handles:
  // 1. Calling backend logout API.
  // 2. Clearing auth tokens from storage.
  // 3. Resetting global auth state.
  // 4. Resetting relevant Pinia stores (chat, cost, agent, ui).
  // 5. Navigating to the specified route (e.g., '/login').
  // 6. Forcing a page reload if necessary for a clean state.
  await auth.logout('/login', true); // Target '/login', forceReload is true by default in useAuth
  
  addToast({ type: 'success', title: 'Logged Out', message: 'You have been successfully logged out.' });
  // Further navigation or reload is handled by auth.logout()
};


const handleShowPriorChatLog = (): void => {
  addToast({ type: 'info', title: 'Feature In Development', message: 'A comprehensive chat history log viewer is planned for a future update.' });
};

// --- Router Transition & Loading State ---
const routeTransitionName: Ref<string> = ref('page-fade'); // Default transition
router.beforeEach((to: RouteLocationNormalized, _from: RouteLocationNormalized, next: () => void) => {
  isLoadingApp.value = true;
  // Set transition name based on route meta, or default
  routeTransitionName.value = (typeof to.meta.transition === 'string' ? to.meta.transition : 'page-fade');
  next();
});
router.afterEach(() => {
  // Add a slight delay to allow transitions to start before hiding loader
  setTimeout(() => {
    if (!isLocaleTransitioning.value) {
      isLoadingApp.value = false;
    }
  }, 250);
});
router.onError((error) => {
  console.error('[App.vue] Vue Router Navigation Error:', error);
  isLoadingApp.value = false;
  addToast({ type: 'error', title: 'Navigation Error', message: (error as Error).message || 'Could not load the requested page.', duration: 7000 });
});

// --- Voice State Management ---
const isUserActuallyListening: Ref<boolean> = ref(false);
const isAiActuallySpeaking = computed<boolean>(() => ttsService.isSpeaking());

provide('updateUserListeningState', (isListening: boolean) => {
  isUserActuallyListening.value = isListening;
});

// --- Application Version (from Vite environment variables) ---
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.0.0'; // Ensure VITE_APP_VERSION is in your .env file

// --- Lifecycle Hooks ---
onMounted(async () => {
  isLoadingApp.value = true;

  themeManager.initialize();    // Initializes theme from storage or system preference
  await uiStore.initializeUiState();  // Initializes UI store state, including listeners for fullscreen etc.
  // Initialize platform detection (storage adapter kind & capabilities) for feature gating
  try {
    const { usePlatformStore } = await import('./store/platform.store');
    const platform = usePlatformStore();
    await platform.initialize();
  } catch (e) {
    console.warn('[App.vue] Platform store init failed; proceeding in degraded mode.', e);
  }

  // Capture AgentOS workflow/agency updates for export parity
  try {
    const { useAgentosEventsStore } = await import('./store/agentosEvents.store');
    const eventsStore = useAgentosEventsStore();
    const onWorkflow = (ev: CustomEvent) => {
      eventsStore.addWorkflowUpdate({ timestamp: Date.now(), workflow: ev.detail?.workflow, metadata: ev.detail?.metadata });
    };
    const onAgency = (ev: CustomEvent) => {
      eventsStore.addAgencyUpdate({ timestamp: Date.now(), agency: ev.detail?.agency, metadata: ev.detail?.metadata });
    };
    window.addEventListener('vca:workflow-update', onWorkflow as EventListener);
    window.addEventListener('vca:agency-update', onAgency as EventListener);
  } catch (e) {
    console.warn('[App.vue] AgentOS events store init failed.', e);
  }

  auth.checkAuthStatus(); // Check auth status first thing (not async!)
  await voiceSettingsManager.initialize(); // Initialize voice settings

  await checkLlmBootstrapStatus();

  // If authenticated, fetch session cost if not already loaded
  if (auth.isAuthenticated.value) {
    if (totalSessionCost.value === 0 && !isLoadingCost.value) {
      await costStore.fetchSessionCost();
    }
  }

  // Set default agent if none is active or if the active one is invalid
  if (!agentStore.activeAgentId || !agentService.getAgentById(agentStore.activeAgentId)) {
    const defaultAgent = auth.isAuthenticated.value 
      ? agentService.getDefaultAgent() 
      : agentService.getDefaultPublicAgent();
      
    if (defaultAgent) {
      agentStore.setActiveAgent(defaultAgent.id); // This will trigger watchers in views to load content
    } else {
      console.error("[App.vue] CRITICAL: No default agent could be determined on application mount.");
      addToast({type: 'error', title: 'Agent Initialization Error', message: 'Could not load a default assistant interface.'});
    }
  } else if (agentStore.activeAgentId) {
    // If an agent is already active (e.g., from persisted store state),
    // ensure its main content (like welcome message) is initialized.
    chatStore.ensureMainContentForAgent(agentStore.activeAgentId);
  }

  setTimeout(() => { isLoadingApp.value = false; }, 350); // Allow initial setup to complete

  // Welcome toast for new version visits
  const currentAppVersion = APP_VERSION; // Use the fetched version
  const hasVisitedKey = `vcaHasVisited_EphemeralHarmony_v${currentAppVersion}`;
  if (!localStorage.getItem(hasVisitedKey)) {
    setTimeout(() => {
      addToast({
        type: 'info', title: `Welcome to VCA ${currentAppVersion}!`,
        message: 'Enjoy the refined "Ephemeral Harmony" experience. Explore assistants and features.',
        duration: 10000
      });
      localStorage.setItem(hasVisitedKey, 'true');
    }, 1200); // Delay welcome toast slightly
  }
});

// Initialize connectivity listeners and show availability toasts on changes
try {
  connectivityStore.initialize();
} catch {}

watch(() => connectivityStore.isOnline, (online) => {
  if (online) {
    addToast({ type: 'success', title: 'Online', message: 'Cloud features and syncing are available where supported.' });
  } else {
    addToast({ type: 'warning', title: 'Offline mode', message: 'Local features available; cloud/team features paused until connection is restored.' });
  }
});

// Watch for theme changes from the uiStore to potentially react (e.g., logging)
watch(
  () => uiStore.currentThemeId,
  (newThemeId: string) => {
    // Log theme changes if needed
    console.log(`[App.vue] Theme changed to: ${newThemeId}`);
  },
  { immediate: true } // Run once on component mount as well
);

watch(
  () => i18n.global.locale.value,
  (newLocale, oldLocale) => {
    if (!oldLocale || newLocale === oldLocale) {
      return;
    }
    if (localeTransitionTimer.value !== null) {
      window.clearTimeout(localeTransitionTimer.value);
    }
    isLocaleTransitioning.value = true;
    isLoadingApp.value = true;
    localeTransitionTimer.value = window.setTimeout(() => {
      isLocaleTransitioning.value = false;
      isLoadingApp.value = false;
      localeTransitionTimer.value = null;
    }, 480);
  }
);

onBeforeUnmount(() => {
  if (localeTransitionTimer.value !== null) {
    window.clearTimeout(localeTransitionTimer.value);
    localeTransitionTimer.value = null;
  }
});

</script>

<template>
  <div
    class="app-shell-ephemeral"
    :data-theme="templateThemeId"
    :class="{
      'is-dark-mode': uiStore.isCurrentThemeDark,
      'is-light-mode': !uiStore.isCurrentThemeDark,
      'ai-is-speaking': isAiActuallySpeaking,
      'user-is-listening': isUserActuallyListening && !isAiActuallySpeaking,
      'locale-transitioning': isLocaleTransitioning,
    }"
    aria-live="polite"
    aria-atomic="true"
  >
    <div
      v-if="isLoadingApp" class="loading-overlay-ephemeral"
      role="status" aria-live="polite" aria-label="Loading application content"
    >
      <div class="loading-animation-content">
        <div class="loading-spinner-ephemeral">
          <div v-for="i in 8" :key="`blade-${i}`" class="spinner-blade-ephemeral"></div>
        </div>
        <p class="loading-text-ephemeral">{{ loadingOverlayMessage }}</p>
      </div>
    </div>

    <a href="#main-app-content" class="skip-link-ephemeral">Skip to main content</a>

    <div class="app-layout-ephemeral">
      <AppHeader
        :is-user-listening="isUserActuallyListening"
        :is-assistant-speaking="isAiActuallySpeaking"
        @toggle-fullscreen="uiStore.toggleBrowserFullscreen()" 
        @clear-chat-and-session="handleClearChatAndSession"
        @logout="handleLogoutFromHeader"
        @show-prior-chat-log="handleShowPriorChatLog"
        class="app-layout-header-ephemeral"
      />

      <!-- Capability banner summarizing available/unavailable features per platform & connectivity -->
      <CapabilityBanner />

      <main id="main-app-content" class="app-layout-main-content-ephemeral">
        <router-view v-slot="{ Component, route: currentRoute }">
          <Transition :name="routeTransitionName" mode="out-in">
            <component :is="Component" :key="`${currentRoute.path}-${$i18n.locale}`" />
          </Transition>
        </router-view>
      </main>

      <AppFooter v-if="showAppFooter" class="app-layout-footer-ephemeral" />
    </div>

    <div aria-live="assertive" class="toast-notifications-container-ephemeral">
      <TransitionGroup name="toast-transition" tag="div">
        <div
          v-for="toastItem in toasts" :key="toastItem.id"
          class="toast-notification-ephemeral"
          :class="`toast--${toastItem.type}`"
          role="alertdialog"
          :aria-labelledby="`toast-title-${toastItem.id}`"
          :aria-describedby="toastItem.message ? `toast-message-${toastItem.id}` : undefined"
        >
          <div class="toast-icon-wrapper-ephemeral">
            <component :is="getToastIcon(toastItem.type)" class="toast-icon-svg" aria-hidden="true" />
          </div>
          <div class="toast-content-ephemeral">
            <p :id="`toast-title-${toastItem.id}`" class="toast-title-ephemeral">{{ toastItem.title }}</p>
            <p v-if="toastItem.message" :id="`toast-message-${toastItem.id}`" class="toast-message-ephemeral" v-html="toastItem.message"></p>
          </div>
          <button
            @click="removeToast(toastItem.id)" class="toast-close-button-ephemeral"
            :aria-label="`Dismiss notification: ${toastItem.title}`"
          >
            <XMarkIcon class="toast-close-icon-svg" aria-hidden="true" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style lang="scss">
// Global styles are in main.scss and its imported partials.
// Specific app-shell styles or overrides can go into frontend/src/styles/layout/_app.scss.
// The transitions 'page-fade' and 'toast-transition' should be defined in your animation styles.
.app-shell-ephemeral .app-layout-ephemeral,
.app-shell-ephemeral .toast-notifications-container-ephemeral {
  transition: opacity 0.35s ease, transform 0.35s ease, filter 0.35s ease;
}

.app-shell-ephemeral.locale-transitioning .app-layout-ephemeral,
.app-shell-ephemeral.locale-transitioning .toast-notifications-container-ephemeral {
  opacity: 0;
  transform: translateY(10px);
  filter: blur(2px);
  pointer-events: none;
}

.loading-text-ephemeral {
  transition: opacity 0.3s ease;
}
</style>
watch(() => auth.isAuthenticated.value, (authed) => {
  if (authed && totalSessionCost.value === 0 && !isLoadingCost.value) {
    void costStore.fetchSessionCost();
  }
});
