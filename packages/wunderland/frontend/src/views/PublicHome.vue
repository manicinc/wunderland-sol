// File: frontend/src/views/PublicHome.vue
/**
 * @file PublicHome.vue
 * @description Public-facing home page using UnifiedChatLayout.
 * Features rate limiting, public agent selection, themed placeholders, API-driven prompt loading,
 * dynamic loading of custom agent views, and session-specific userId.
 * @version 3.5.3 - Corrected dynamic agent view loading to use `agent.component`.
 */
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject, watch, defineAsyncComponent, type Component as VueComponentType } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter, RouterLink } from 'vue-router';
import {
  chatAPI,
  promptAPI,
  type ChatMessagePayloadFE,
  type ProcessedHistoryMessageFE,
  type ChatMessageFE,
} from '@/utils/api';
import { AdvancedHistoryConfig } from '@/services/advancedConversation.manager';
import { agentService, type IAgentDefinition, type AgentId } from '@/services/agent.service';
import { useAgentStore } from '@/store/agent.store';
import { useChatStore, type MainContent } from '@/store/chat.store';
import { voiceSettingsManager } from '@/services/voice.settings.service';
import type { ToastService } from '@/services/services';
import { useAuth } from '@/composables/useAuth';

import UnifiedChatLayout from '@/components/layouts/UnifiedChatLayout.vue';
import MainContentView from '@/components/agents/common/MainContentView.vue';
import CompactMessageRenderer from '@/components/layouts/CompactMessageRenderer/CompactMessageRenderer.vue';
import PersonaToolbar from '@/components/common/PersonaToolbar.vue';
import { usePlans } from '@/composables/usePlans';
import { useRegistrationStore } from '@/store/registration.store';
import type { PlanId } from '@framers/shared/planCatalog';
import type { RateLimitInfo, RateLimitInfoPublic } from '@framers/shared/rateLimitTypes';
import { isPublicRateLimit } from '@framers/shared/rateLimitTypes';

import {
  SparklesIcon,
  KeyIcon,
  ChevronDownIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckIcon as CheckOutlineIcon, // Renamed to avoid conflict if CheckIcon from solid is also used
  BuildingStorefrontIcon,
  MicrophoneIcon,
  CpuChipIcon,
  ArrowDownTrayIcon,
  CloudArrowDownIcon,
  RocketLaunchIcon
} from '@heroicons/vue/24/outline'; // Using outline as per original imports

const router = useRouter();
const { t } = useI18n();
const toast = inject<ToastService>('toast');
const agentStore = useAgentStore();
const chatStore = useChatStore();
const auth = useAuth(); // For sessionUserId
const { plans: publicPlans } = usePlans();
const registrationStore = useRegistrationStore();

const availablePublicAgents = ref<IAgentDefinition[]>([]);
const currentPublicAgent = computed<IAgentDefinition | undefined>(() => agentStore.activeAgent);
const agentViewRef = ref<any>(null); // Used to call methods on the loaded agent component
const agentSelectorSectionRef = ref<HTMLElement | null>(null);

const heroVideoSources = {
  mp4: '/media/landing/voice-hero-loop.mp4',
  webm: '/media/landing/voice-hero-loop.webm',
  poster: '/media/landing/voice-hero-poster.jpg'
};
const pipelineImageSources = {
  light: '/media/landing/voice-pipeline-light.svg',
  dark: '/media/landing/voice-pipeline-dark.svg'
};

const heroVideoMissing = ref(false);
const pipelineImageMissing = ref(false);

const onHeroVideoError = () => {
  heroVideoMissing.value = true;
};

const onPipelineImageError = () => {
  pipelineImageMissing.value = true;
};

const scrollToAgentSelector = () => {
  if (agentSelectorSectionRef.value) {
    agentSelectorSectionRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const heroHighlights = computed(() => [
  {
    icon: MicrophoneIcon,
    text: t('landing.heroHighlightVoice', 'Multilingual STT & TTS with Whisper fallback')
  },
  {
    icon: CpuChipIcon,
    text: t('landing.heroHighlightGMIs', 'AgentOS GMIs orchestrate tools, guardrails, and workflows')
  },
  {
    icon: ArrowDownTrayIcon,
    text: t('landing.heroHighlightExport', 'Export personas, transcripts, and artifacts as JSON anytime')
  }
]);

const pipelineSteps = computed(() => [
  {
    title: t('landing.pipelineStepCaptureTitle', 'Capture voice or text'),
    body: t('landing.pipelineStepCaptureBody', 'Use the browser microphone or upload audio to Whisper. Client-side noise gating keeps transcripts clean.')
  },
  {
    title: t('landing.pipelineStepLanguageTitle', 'Negotiate languages & guardrails'),
    body: t('landing.pipelineStepLanguageBody', 'Language detection, pivot translation, and guardrail checks run before the request ever hits the LLM.')
  },
  {
    title: t('landing.pipelineStepOrchestrateTitle', 'Orchestrate GMIs & toolchains'),
    body: t('landing.pipelineStepOrchestrateBody', 'AgentOS GMIs evaluate policies, trigger tools, and stream structured responses with usage metadata.')
  },
  {
    title: t('landing.pipelineStepOwnTitle', 'Own the results'),
    body: t('landing.pipelineStepOwnBody', 'Download artifacts, export conversation state, and publish agents to vca.chat without losing IP.')
  }
]);

const integrationCards = computed(() => [
  {
    icon: BuildingStorefrontIcon,
    title: t('landing.integrationAuthTitle', 'Authentication & billing in minutes'),
    body: t('landing.integrationAuthBody', 'Supabase auth plus Stripe or Lemon Squeezy checkouts are wired in, including webhook handling and seat management.'),
    links: [
      {
        label: t('landing.integrationAuthDoc', 'View signup implementation plan'),
        href: 'https://github.com/wearetheframers/voice-chat-assistant/blob/main/docs/SIGNUP_BILLING_IMPLEMENTATION_PLAN.md'
      },
      {
        label: t('landing.integrationStripeDoc', 'Supabase & Stripe setup guide'),
        href: 'https://github.com/wearetheframers/voice-chat-assistant/blob/main/docs/SUPABASE_STRIPE_SETUP.md'
      }
    ]
  },
  {
    icon: CloudArrowDownIcon,
    title: t('landing.integrationStorageTitle', 'Portable storage adapters'),
    body: t('landing.integrationStorageBody', 'Use Postgres, better-sqlite3, or sql.js with automatic fallbacks. Deploy on desktop, web, or mobile without rewriting persistence.'),
    links: [
      {
        label: t('landing.integrationStorageDoc', 'Read storage adapter design'),
        href: 'https://github.com/wearetheframers/voice-chat-assistant/blob/main/docs/STORAGE_ADAPTER_DESIGN.md'
      }
    ]
  },
  {
    icon: RocketLaunchIcon,
    title: t('landing.integrationReleaseTitle', 'Release automation & mirroring'),
    body: t('landing.integrationReleaseBody', 'Publish @agentos/core, sync landing sites, and keep private assets private with scripted mirrors.'),
    links: [
      {
        label: t('landing.integrationReleaseDoc', 'See release automation checklist'),
        href: 'https://github.com/wearetheframers/voice-chat-assistant/blob/main/docs/RELEASE_AUTOMATION.md'
      }
    ]
  }
]);

const faqEntries = computed(() => [
  {
    question: t('landing.faqOwnershipQuestion', 'Do I keep ownership of my agents and data?'),
    answer: t('landing.faqOwnershipAnswer', 'Yes. Personas, prompts, transcripts, and artifacts can be exported as JSON whenever you like and imported into any AgentOS deployment.')
  },
  {
    question: t('landing.faqApacheQuestion', 'What does the Apache 2.0 transition mean for me?'),
    answer: t('landing.faqApacheAnswer', 'Upcoming releases of @agentos/core will ship under Apache 2.0 so you get explicit patent protection and attribution guidance. Existing MIT versions remain available.')
  },
  {
    question: t('landing.faqUsageQuestion', 'What happens when I exceed the included usage?'),
    answer: t('landing.faqUsageAnswer', 'Free plans simply rate limit. Creator and Organization plans automatically fall back to your own API keys when the platform allowance is consumed.')
  },
  {
    question: t('landing.faqSelfHostQuestion', 'Can I self-host the backend and voice UI?'),
    answer: t('landing.faqSelfHostAnswer', 'Absolutely. Deploy the Express backend and Vue frontend anywhere, point them at your AgentOS config, and keep everything inside your infrastructure.')
  }
]);

/**
 * @computed currentAgentViewComponent
 * @description Dynamically resolves the component for the active public agent's dedicated view.
 * Uses the `component` property from the agent definition, which is expected to be
 * a function returning a dynamic import promise.
 * @returns {VueComponentType | null} The asynchronously loaded agent view component or null.
 */
const currentAgentViewComponent = computed<VueComponentType | null>(() => {
  const agent = currentPublicAgent.value;
  // Check if the agent is public and has a component factory function
  if (agent && agent.isPublic && agent.component && typeof agent.component === 'function') {
    const agentLabel = agent.label || 'Current Public Agent';
    try {
      // agent.component is expected to be like: () => import('@/path/to/Component.vue')
      return defineAsyncComponent(agent.component);
    } catch (e) {
      console.error(`[PublicHome] Synchronous error setting up dynamic import for public agent view: ${agentLabel}`, e);
      toast?.add({ type: 'error', title: 'UI Setup Error', message: `Error preparing interface for ${agentLabel}.` });
      return null; // Fallback if defineAsyncComponent itself throws (unlikely for valid function)
    }
  }
  return null;
});

const showPublicAgentSelector = ref(false);
const publicAgentSelectorDropdownRef = ref<HTMLElement | null>(null);

const isLoadingResponse = ref(false);
const isVoiceInputCurrentlyProcessingAudio = ref(false);

const currentSystemPromptText = ref('');
const rateLimitInfo = ref<RateLimitInfo | null>(null);
const demoUsageInfo = computed(() => auth.demoUsage.value);
const landingLocale = computed<string>(() => (router.currentRoute.value.params.locale as string) || 'en-US');

// Demo usage banner reactive state (public preview rate limit / upsell)
const showDemoUsageBanner = computed<boolean>(() => {
  // Show when unauthenticated and public tier has remaining lower than a threshold or message present
  const rl = rateLimitInfo.value;
  if (!auth.isAuthenticated.value && rl && rl.tier === 'public') {
    // Show if remaining is defined and below 5 or a message exists
    return (typeof rl.remaining === 'number' && rl.remaining <= 5) || !!rl.message;
  }
  return false;
});
const demoUsageBannerSeverity = computed<'info' | 'warning' | 'error'>(() => {
  const rl = rateLimitInfo.value;
  if (!rl || rl.tier !== 'public') return 'info';
  if (typeof rl.remaining === 'number') {
    if (rl.remaining <= 0) return 'error';
    if (rl.remaining <= 3) return 'warning';
  }
  return 'info';
});
const demoUsageBannerMessage = computed<string>(() => {
  const rl = rateLimitInfo.value;
  if (!rl || rl.tier !== 'public') return '';
  if (typeof rl.remaining === 'number') {
    if (rl.remaining <= 0) return 'Daily public preview limit reached.';
    return `Public preview remaining: ${rl.remaining}/${rl.limit ?? '–'}`;
  }
  return rl.message || 'Public preview usage information unavailable.';
});

const landingPriceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const formatLandingCount = (value?: number | null): string => (value == null ? '-' : value.toLocaleString());

interface LandingPlanCard {
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
}

const landingPlanCards = computed<LandingPlanCard[]>(() => {
  return publicPlans.value
    .filter((plan) => plan.public && !plan.metadata?.hiddenOnMarketing)
    .sort((a, b) => a.monthlyPriceUsd - b.monthlyPriceUsd)
    .map((plan) => ({
      id: plan.id,
      title: plan.displayName,
      priceText: plan.monthlyPriceUsd === 0
        ? t('plans.free', 'Free')
        : landingPriceFormatter.format(plan.monthlyPriceUsd),
      priceValue: plan.monthlyPriceUsd,
      allowance: t('plans.dailyAllowancePrimaryShort', {
        tokens: formatLandingCount(plan.usage.approxGpt4oTokensPerDay),
      }),
      allowanceNote: plan.usage.notes,
      bullets: plan.bullets.slice(0, 3),
      ctaLabel: plan.metadata?.requiresContact
        ? t('plans.contactUsCta', 'Contact sales')
        : plan.monthlyPriceUsd === 0
          ? t('plans.startFreeCta', 'Get started')
          : t('plans.choosePlanCta', 'Choose plan'),
      isFeatured: Boolean(plan.metadata?.featured),
      requiresContact: Boolean(plan.metadata?.requiresContact),
    }));
});

const landingStartingPrice = computed(() => {
  const paidPlan = landingPlanCards.value.find((plan) => plan.priceValue > 0);
  if (paidPlan) return paidPlan.priceText;
  const firstPlan = landingPlanCards.value[0];
  return firstPlan ? firstPlan.priceText : '$9';
});

const handleLandingPlanAction = async (plan: LandingPlanCard): Promise<void> => {
  if (plan.requiresContact) {
    const email = import.meta.env.VITE_SALES_EMAIL || 'team@voicechatassistant.com';
    const subject = encodeURIComponent(`Voice Chat Assistant ${plan.title} Plan Inquiry`);
    window.location.href = `mailto:${email}?subject=${subject}`;
    return;
  }

  try {
    await registrationStore.setPlan({ planId: plan.id });
  } catch (error) {
    console.warn('[PublicHome] Failed to preset registration plan:', error);
  }

  if (auth.isAuthenticated.value) {
    router.push({
      name: 'Settings',
      params: { locale: landingLocale.value },
      query: { tab: 'billing', plan: plan.id },
    });
    return;
  }

  router.push({
    name: 'RegisterAccount',
    params: { locale: landingLocale.value },
    query: { plan: plan.id },
  });
};

const mainContentData = computed<MainContent | null>(() => {
  // Use type-safe helper to check for rate limit exhaustion
  if (rateLimitInfo.value && isPublicRateLimit(rateLimitInfo.value) && rateLimitInfo.value.remaining <= 0) {
    return {
      agentId: 'rate-limit-exceeded' as AgentId, type: 'custom-component',
      data: 'RateLimitExceededPlaceholder', title: 'Daily Public Limit Reached', timestamp: Date.now()
    };
  }
  if (!currentPublicAgent.value && availablePublicAgents.value.length > 0) {
    return {
      agentId: 'public-welcome-placeholder' as AgentId, type: 'custom-component',
      data: 'PublicWelcomePlaceholder', title: 'Welcome to Voice AI Assistant', timestamp: Date.now()
    };
  }
  if (availablePublicAgents.value.length === 0 && !currentPublicAgent.value) {
    return {
      agentId: 'no-public-agents-placeholder' as AgentId, type: 'custom-component',
      data: 'NoPublicAgentsPlaceholder', title: 'Assistants Unavailable', timestamp: Date.now()
    };
  }
  // If agent has dedicated view AND handlesOwnInput, mainContentData should be null for it
  if (currentPublicAgent.value?.isPublic && currentAgentViewComponent.value && currentPublicAgent.value?.capabilities?.handlesOwnInput) {
    return null; // Dedicated view is responsible for its display
  }
  // Otherwise, get content from chatStore or provide default welcome/loading for general agents
  return currentPublicAgent.value ? (
    chatStore.getCurrentMainContentDataForAgent(currentPublicAgent.value.id) || {
      agentId: currentPublicAgent.value.id, type: 'welcome',
      data: `<div class="prose dark:prose-invert max-w-none mx-auto text-center py-8">
               <h2 class="text-3xl font-bold mb-4 text-[var(--color-text-primary)]">${currentPublicAgent.value.label} is Ready</h2>
               <p class="text-lg text-[var(--color-text-secondary)]">${currentPublicAgent.value.description}</p>
               <p class="mt-6 text-base text-[var(--color-text-muted)]">${currentPublicAgent.value.inputPlaceholder || 'Use the input below to start.'}</p>
             </div>`,
      title: `${currentPublicAgent.value.label} Ready`, timestamp: Date.now()
    }
  ) : null;
});

const showEphemeralLogForCurrentAgent = computed(() => {
  return currentPublicAgent.value?.capabilities?.showEphemeralChatLog ?? true;
});

const fetchRateLimitInfo = async (): Promise<void> => {
  if (auth.isAuthenticated.value) {
    rateLimitInfo.value = { tier: 'authenticated' };
    return;
  }
  await auth.refreshDemoUsage();
  const usage = auth.demoUsage.value;
  if (usage) {
    // Normalize potential null resetAt from usage and ensure all required fields
    const { resetAt, ...rest } = usage as any;
    rateLimitInfo.value = { 
      tier: 'public',
      ip: null, // Public view doesn't expose IP
      ...rest, 
      resetAt: resetAt ?? null 
    } as RateLimitInfoPublic;
  } else {
    rateLimitInfo.value = {
      tier: 'public',
      ip: null,
      limit: 20,
      remaining: 20,
      used: 0,
      resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      message: 'Demo limits unavailable. Using defaults.',
    };
  }
};

const loadCurrentAgentSystemPrompt = async (): Promise<void> => {
  const agent = currentPublicAgent.value;
  const agentLabel = agent?.label || 'Public Agent';
  if (!agent) {
    currentSystemPromptText.value = "No agent selected. Please choose an assistant.";
    return;
  }

  if (agent.capabilities?.handlesOwnInput && currentAgentViewComponent.value) {
    currentSystemPromptText.value = '';
    console.log(`[PublicHome] Agent ${agentLabel} handles its own input, skipping general prompt load.`);
    return;
  }

  const systemPromptKey = agent.systemPromptKey;
  let defaultPromptText = `You are ${agentLabel}. As a public assistant, be helpful and concise.`;

  if (systemPromptKey) {
      try {
        console.log(`[PublicHome] Loading prompt for key: ${systemPromptKey}.md for agent: ${agentLabel}`);
        const promptResponse = await promptAPI.getPrompt(`${systemPromptKey}.md`);
        currentSystemPromptText.value = promptResponse.data?.content || defaultPromptText;
      } catch (e: any) {
        console.error(`[PublicHome] Failed to load prompt "${systemPromptKey}.md" for agent "${agentLabel}":`, e.response?.data || e.message || e);
        currentSystemPromptText.value = defaultPromptText;
      }
  } else {
      console.warn(`[PublicHome] Agent "${agentLabel}" has no systemPromptKey defined. Using default prompt.`);
      currentSystemPromptText.value = defaultPromptText;
  }
};

const loadPublicAgentsAndSetDefault = async (): Promise<void> => {
  availablePublicAgents.value = agentService.getPublicAgents().filter(agent => agent.isPublic);
  if (availablePublicAgents.value.length > 0) {
    const currentAgentInStoreId = agentStore.activeAgentId;
    let agentToSet: IAgentDefinition | undefined;
    if (currentAgentInStoreId && availablePublicAgents.value.some(pa => pa.id === currentAgentInStoreId)) {
      agentToSet = agentService.getAgentById(currentAgentInStoreId);
    } else {
      agentToSet = agentService.getDefaultPublicAgent() || availablePublicAgents.value[0];
    }
    if (agentToSet && agentStore.activeAgentId !== agentToSet.id) {
      agentStore.setActiveAgent(agentToSet.id); // Watcher will trigger prompt load & content ensure
    } else if (agentToSet) { // Agent is already set, ensure prompt and content are loaded
      await loadCurrentAgentSystemPrompt();
      chatStore.ensureMainContentForAgent(agentToSet.id);
    }
  } else {
    console.warn("[PublicHome] No publicly available agents found or configured.");
    if (agentStore.activeAgentId) agentStore.setActiveAgent(null); // Clear if previously set to non-public
     chatStore.updateMainContent({
        agentId: 'no-public-agents-placeholder' as AgentId, type: 'custom-component',
        data: 'NoPublicAgentsPlaceholder', title: 'Assistants Unavailable', timestamp: Date.now()
    });
  }
};

watch(() => auth.isAuthenticated.value, (authed) => {
  if (authed) {
    rateLimitInfo.value = { tier: 'authenticated' };
  } else {
    void fetchRateLimitInfo();
  }
});

watch(demoUsageInfo, (value) => {
  if (!auth.isAuthenticated.value && value) {
    const { resetAt, ...rest } = value as any;
    rateLimitInfo.value = { ...rest, resetAt: resetAt ?? undefined, tier: 'public' } as RateLimitInfo;
  }
});


const selectPublicAgent = (agentId: AgentId): void => {
  const agent = availablePublicAgents.value.find(a => a.id === agentId);
  if (agent && agentStore.activeAgentId !== agentId) {
    agentStore.setActiveAgent(agentId);
  }
  showPublicAgentSelector.value = false;
};

watch(() => agentStore.activeAgentId, async (newAgentId, oldAgentId) => {
  if (newAgentId && newAgentId !== oldAgentId) {
    // Check if the new agent is actually public, if not, reset to a valid public one
    const agentDef = agentService.getAgentById(newAgentId);
    if (agentDef && agentDef.isPublic) {
        isLoadingResponse.value = false;
        isVoiceInputCurrentlyProcessingAudio.value = false;
        if(chatStore.isMainContentStreaming) chatStore.setMainContentStreaming(false);
        await loadCurrentAgentSystemPrompt(); // This is important to run
        chatStore.ensureMainContentForAgent(newAgentId); // This sets up welcome message if needed
    } else if (newAgentId && !auth.isAuthenticated.value) { // User somehow tried to activate non-public on public page
        console.warn(`[PublicHome] Non-public agent (${newAgentId}) activation attempted. Resetting to default public agent.`);
        await loadPublicAgentsAndSetDefault(); // This will re-evaluate and set a valid public agent
    }
  } else if (!newAgentId && availablePublicAgents.value.length === 0) {
    currentSystemPromptText.value = "No public assistants are currently available.";
    chatStore.updateMainContent({
        agentId: 'no-public-agents-placeholder' as AgentId, type: 'custom-component',
        data: 'NoPublicAgentsPlaceholder', title: 'Assistants Unavailable', timestamp: Date.now()
    });
  } else if (newAgentId && newAgentId === oldAgentId ) { // Agent is same (e.g. on initial load or refresh)
    const agent = agentService.getAgentById(newAgentId);
    if (agent && agent.isPublic && (!currentAgentViewComponent.value || !agent.capabilities?.handlesOwnInput)) {
      await loadCurrentAgentSystemPrompt(); // Refresh prompt if needed
    }
    chatStore.ensureMainContentForAgent(newAgentId); // Ensure welcome screen is there
  }
}, { immediate: true });


const handleTranscriptionFromLayout = async (transcriptionText: string): Promise<void> => {
  console.log("[PublicHome] handleTranscriptionFromLayout received:", `"${transcriptionText}"`);
  if (!transcriptionText.trim()) {
    console.log("[PublicHome] Transcription was empty or whitespace. Ignoring.");
    return;
  }
  const agent = currentPublicAgent.value;

  if (!agent) {
    toast?.add({ type: 'warning', title: 'No Assistant Selected', message: 'Please select an assistant to interact with.' });
    return;
  }
  if (isLoadingResponse.value) {
    toast?.add({ type: 'info', title: 'Assistant Busy', message: 'Please wait for the current response.' });
    return;
  }
  if (rateLimitInfo.value?.tier === 'public' && (rateLimitInfo.value.remaining ?? 1) <= 0) {
    toast?.add({ type: 'error', title: 'Daily Limit Reached', message: 'Public preview limit reached. Please log in or try again later.'});
    chatStore.updateMainContent({
      agentId: 'rate-limit-exceeded' as AgentId, type: 'custom-component',
      data: 'RateLimitExceededPlaceholder', title: 'Daily Public Limit Reached', timestamp: Date.now()
    });
    return;
  }

  isLoadingResponse.value = true;

  try {
    if (agent.isPublic && agent.capabilities?.handlesOwnInput && currentAgentViewComponent.value && agentViewRef.value) {
      console.log(`[PublicHome] Agent ${agent.label} handles own input. Calling dedicated handler.`);
      if (typeof agentViewRef.value.handleNewUserInput === 'function') {
        await agentViewRef.value.handleNewUserInput(transcriptionText);
      } else {
        console.warn(`[PublicHome] Agent "${agent.label}" has no 'handleNewUserInput'. Falling back.`);
        await standardLlmCallPublic(transcriptionText, agent);
      }
    } else {
      await standardLlmCallPublic(transcriptionText, agent);
    }
  } catch (error: any) {
    console.error(`[PublicHome] Error during transcription handling for agent "${agent.label}":`, error);
    toast?.add({type: 'error', title: 'Processing Error', message: error.message || `Error with ${agent.label}.`});
  } finally {
    // isLoadingResponse is managed within standardLlmCallPublic or should be reset if dedicated handler was used
    // For dedicated handlers, it's reset in the block above. For standard calls, it's reset within standardLlmCallPublic.
    // If an error occurs before standardLlmCallPublic's finally, ensure it's reset:
    if(isLoadingResponse.value && !(agent.isPublic && agent.capabilities?.handlesOwnInput && currentAgentViewComponent.value && agentViewRef.value)) {
        // Only reset if standardLlmCallPublic was supposed to handle it and didn't reach its own finally
    }
    if (!(agent.isPublic && agent.capabilities?.handlesOwnInput && currentAgentViewComponent.value && agentViewRef.value)) {
         // if it was not a dedicated agent, ensure loading is false
         // standardLlmCallPublic should handle this, but as a safeguard:
         // isLoadingResponse.value = false; // This might be too aggressive here if standardLlmCallPublic is async and hasn't finished
    } else {
        // if it was a dedicated agent, it should have reset its own or we reset it above
        isLoadingResponse.value = false;
    }
  }
  console.log(`[PublicHome] handleTranscriptionFromLayout finished for "${transcriptionText}". isLoadingResponse: ${isLoadingResponse.value}`);
};

async function standardLlmCallPublic(transcriptionText: string, agentInstance: IAgentDefinition) {
  const agentId = agentInstance.id;
  const agentLabel = agentInstance.label || 'Assistant';
  const userMessageTimestamp = Date.now();

  if (!isLoadingResponse.value) isLoadingResponse.value = true; // Ensure it's true

  chatStore.addMessage({ role: 'user', content: transcriptionText, agentId: agentId, timestamp: userMessageTimestamp });

  const streamingPlaceholder = `Contacting ${agentLabel}...`;
    if (agentStore.activeAgentId === agentId) {
      chatStore.setMainContentStreaming(true, streamingPlaceholder);
      chatStore.updateMainContent({
        agentId, type: 'loading', data: streamingPlaceholder,
        title: `Contacting ${agentLabel}...`, timestamp: Date.now()
      });
  }

  try {
    if (!agentInstance.capabilities?.handlesOwnInput || !currentAgentViewComponent.value) {
        if (!currentSystemPromptText.value || currentSystemPromptText.value.startsWith(`You are ${agentLabel}`)) {
            await loadCurrentAgentSystemPrompt();
            if (!currentSystemPromptText.value) throw new Error("System prompt could not be established.");
        }
    }
    let finalSystemPrompt = currentSystemPromptText.value;
    if (!finalSystemPrompt.trim()) {
        finalSystemPrompt = `You are ${agentLabel}. ${agentInstance.description || 'Provide helpful assistance.'}`;
    }

    finalSystemPrompt = finalSystemPrompt
      .replace(/{{LANGUAGE}}/g, voiceSettingsManager.settings.preferredCodingLanguage || 'not specified')
      .replace(/{{MODE}}/g, agentId)
      .replace(/{{GENERATE_DIAGRAM}}/g, ((agentInstance.capabilities?.canGenerateDiagrams && voiceSettingsManager.settings.generateDiagrams) ?? false).toString())
      .replace(/{{USER_QUERY}}/g, transcriptionText)
      .replace(/{{ADDITIONAL_INSTRUCTIONS}}/g, 'You are in a public preview mode. Be helpful but concise. Avoid offering actions you cannot perform like file access. Keep responses relatively short.');

    const historyConfig: Partial<AdvancedHistoryConfig> = {
      maxContextTokens: voiceSettingsManager.settings.useAdvancedMemory ? 1800 : (agentInstance.capabilities?.maxChatHistory || 2) * 100,
      numRecentMessagesToPrioritize: agentInstance.capabilities?.maxChatHistory || 2,
      simpleRecencyMessageCount: agentInstance.capabilities?.maxChatHistory || 2,
    };
    const historyForApi: ProcessedHistoryMessageFE[] = await chatStore.getHistoryForApi(agentId, transcriptionText, finalSystemPrompt, historyConfig);

    let messagesForApiPayload: ChatMessageFE[] = historyForApi.map(hMsg => ({
        role: hMsg.role, content: hMsg.content, timestamp: hMsg.timestamp, agentId: hMsg.agentId,
        name: (hMsg as any).name, tool_calls: (hMsg as any).tool_calls, tool_call_id: (hMsg as any).tool_call_id,
    }));
    if (!messagesForApiPayload.some(m => m.role === 'user' && m.content === transcriptionText && m.timestamp === userMessageTimestamp)) {
        messagesForApiPayload.push({ role: 'user', content: transcriptionText, timestamp: userMessageTimestamp, agentId });
    }
    messagesForApiPayload.sort((a,b) => (a.timestamp || 0) - (b.timestamp || 0));

    const basePayload: ChatMessagePayloadFE = {
      messages: messagesForApiPayload,
      mode: agentInstance.systemPromptKey || agentId,
      systemPromptOverride: finalSystemPrompt,
      language: voiceSettingsManager.settings.preferredCodingLanguage,
      generateDiagram: agentInstance.capabilities?.canGenerateDiagrams && voiceSettingsManager.settings.generateDiagrams,
      userId: auth.sessionUserId.value || `public_session_${Date.now().toString(36)}`,
      conversationId: chatStore.getCurrentConversationId(agentId),
      stream: true,
    };
    const payload = chatStore.attachPersonaToPayload(agentId, basePayload);

    let accumulatedResponse = "";
    const finalResponse = await chatAPI.sendMessageStream(
      payload,
      (chunk: string) => {
        accumulatedResponse += chunk;
        if (agentStore.activeAgentId === agentId) {
          chatStore.updateMainContent({
            agentId: agentId,
            type: agentInstance.capabilities?.usesCompactRenderer ? 'compact-message-renderer-data' : 'markdown',
            data: accumulatedResponse + "▋",
            title: `${agentLabel} Responding...`,
            timestamp: Date.now()
          });
        }
      },
      async () => { // onStreamEnd
        chatStore.setMainContentStreaming(false);
        const finalContent = accumulatedResponse.trim();
        if (agentStore.activeAgentId === agentId) {
          chatStore.addMessage({ role: 'assistant', content: finalContent, agentId: agentId, model:"StreamedModel (Public)", timestamp: Date.now() });
          chatStore.updateMainContent({
            agentId: agentId,
            type: agentInstance.capabilities?.usesCompactRenderer ? 'compact-message-renderer-data' : 'markdown',
            data: finalContent, title: `${agentLabel} Response`, timestamp: Date.now()
          });
        }
        await fetchRateLimitInfo();
        isLoadingResponse.value = false;
      },
      async (error: Error | any) => { // onStreamError
        console.error(`[PublicHome] Chat Stream API error for agent "${agentLabel}":`, error);
        const errorMsg = error.message || 'An error occurred during the stream.';
        if (agentStore.activeAgentId === agentId) {
          chatStore.addMessage({ role: 'error', content: `Stream Error: ${errorMsg}`, agentId, timestamp: Date.now() });
          chatStore.updateMainContent({
            agentId, type: 'error',
            data: `### ${agentLabel} Stream Error\n${errorMsg}`,
            title: `Error Processing Request with ${agentLabel}`, timestamp: Date.now()
          });
        }
        chatStore.setMainContentStreaming(false);
        await fetchRateLimitInfo();
        isLoadingResponse.value = false;
      }
    );
    chatStore.syncPersonaFromResponse(agentId, finalResponse);
  } catch (error: any) {
    console.error(`[PublicHome] Chat API interaction setup error for agent "${agentLabel}":`, error.response?.data || error.message || error);
    const errorMsg = error.response?.data?.message || error.message || 'An unexpected error occurred.';
    if (agentStore.activeAgentId === agentId) {
        chatStore.addMessage({ role: 'error', content: `Interaction Error: ${errorMsg}`, agentId, timestamp: Date.now() });
        chatStore.updateMainContent({
            agentId, type: 'error',
            data: `### ${agentLabel} Interaction Error\n${errorMsg}`,
            title: `Error Communicating with ${agentLabel}`, timestamp: Date.now()
        });
    }
    isLoadingResponse.value = false;
    chatStore.setMainContentStreaming(false);
    if (error.response?.status === 429 || error.message?.includes('429')) {
        await fetchRateLimitInfo();
        chatStore.updateMainContent({
            agentId: 'rate-limit-exceeded' as AgentId, type: 'custom-component',
            data: 'RateLimitExceededPlaceholder', title: 'Daily Public Limit Reached', timestamp: Date.now()
        });
    }
  }
}

const formatResetTime = (dateInput?: string | Date): string => {
  if (!dateInput) return 'soon';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return 'shortly';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
};

const handleClickOutsidePublicAgentSelector = (event: MouseEvent) => {
  if (publicAgentSelectorDropdownRef.value && !publicAgentSelectorDropdownRef.value.contains(event.target as Node)) {
    showPublicAgentSelector.value = false;
  }
};
let rateLimitIntervalId: number | undefined;

onMounted(async () => {
  document.addEventListener('click', handleClickOutsidePublicAgentSelector, true);
  auth.checkAuthStatus(); // Not async!
  if (auth.isAuthenticated.value) {
    router.replace({ name: 'AuthenticatedHome' });
    return;
  }
  await fetchRateLimitInfo();
  if (!auth.isAuthenticated.value && rateLimitInfo.value?.tier !== 'authenticated') {
    await loadPublicAgentsAndSetDefault();
    rateLimitIntervalId = window.setInterval(fetchRateLimitInfo, 60000 * 5);
  }
});

onUnmounted(() => {
  if (rateLimitIntervalId) clearInterval(rateLimitIntervalId);
  document.removeEventListener('click', handleClickOutsidePublicAgentSelector, true);
});

</script>

<template>
  <div class="public-home-view-ephemeral">
    <UnifiedChatLayout
      :is-voice-input-processing="isVoiceInputCurrentlyProcessingAudio"
      :show-ephemeral-log="showEphemeralLogForCurrentAgent"
      :current-agent-input-placeholder="currentPublicAgent?.inputPlaceholder || 'Type your message or use voice (public preview)...'"
      @transcription="handleTranscriptionFromLayout"
      @voice-input-processing="(status: boolean) => { isVoiceInputCurrentlyProcessingAudio = status; }"
    >
      <template #voice-toolbar>
        <PersonaToolbar
          :agent="currentPublicAgent"
          variant="compact"
        />
      </template>

      <template #above-main-content>
        <section class="landing-hero" aria-labelledby="landing-hero-heading">
          <div class="landing-hero__content">
            <span class="landing-hero__badge">
              <SparklesIcon class="landing-hero__badge-icon" aria-hidden="true" />
              {{ t('landing.heroBadge', 'Voice-first agent workbench') }}
            </span>
            <h2 id="landing-hero-heading" class="landing-hero__headline">
              {{ t('landing.heroHeadline', 'Your voice-first agent workbench on AgentOS') }}
            </h2>
            <p class="landing-hero__subtitle">
              {{ t('landing.heroSubtitle', 'Speak ideas, orchestrate multi-agent workflows, and keep ownership of every persona, prompt, and tool you build.') }}
            </p>
            <div class="landing-hero__ctas">
              <button type="button" class="landing-hero__cta landing-hero__cta--primary" @click="scrollToAgentSelector">
                {{ t('landing.heroPrimaryCta', 'See it in action') }}
              </button>
              <a
                href="https://vca.chat"
                target="_blank"
                rel="noopener noreferrer"
                class="landing-hero__cta landing-hero__cta--ghost"
              >
                {{ t('landing.heroMarketplaceCta', 'Browse marketplace') }}
              </a>
              <RouterLink
                to="/register"
                class="landing-hero__cta landing-hero__cta--outline"
              >
                {{ t('landing.heroRegisterCta', 'Create an account') }}
              </RouterLink>
            </div>
            <ul class="landing-hero__highlights">
              <li v-for="highlight in heroHighlights" :key="highlight.text">
                <component :is="highlight.icon" class="landing-hero__highlight-icon" aria-hidden="true" />
                <span>{{ highlight.text }}</span>
              </li>
            </ul>
          </div>
          <div class="landing-hero__media">
            <video
              v-if="!heroVideoMissing"
              class="landing-hero__video"
              autoplay
              muted
              loop
              playsinline
              :poster="heroVideoSources.poster"
              @error="onHeroVideoError"
            >
              <source v-if="heroVideoSources.webm" :src="heroVideoSources.webm" type="video/webm" />
              <source v-if="heroVideoSources.mp4" :src="heroVideoSources.mp4" type="video/mp4" />
            </video>
            <div v-else class="media-placeholder">
              <p>
                {{ t('landing.heroVideoPlaceholder', 'Hero media missing. Upload /public/media/landing/voice-hero-loop.mp4 (optional .webm and poster.jpg) to replace this placeholder.') }}
              </p>
            </div>
          </div>
        </section>

        <div
          v-if="showDemoUsageBanner"
          class="demo-usage-banner"
          :class="`demo-usage-banner--${demoUsageBannerSeverity}`"
        >
          <ExclamationTriangleIcon class="demo-usage-icon" aria-hidden="true" />
          <span class="demo-usage-text">{{ demoUsageBannerMessage }}</span>
          <RouterLink to="/login" class="demo-usage-link">
            {{ t('landing.demoBannerCta', 'Log in for unlimited access') }}
          </RouterLink>
        </div>

        <section class="landing-pipeline" aria-labelledby="landing-pipeline-heading">
          <div class="landing-section-header">
            <h3 id="landing-pipeline-heading">{{ t('landing.pipelineHeading', 'From whisper to workflow in seconds') }}</h3>
            <p>{{ t('landing.pipelineSubheading', 'Capture voice or text, negotiate languages and policies, and let AgentOS orchestrate the tools.') }}</p>
          </div>
          <div class="landing-pipeline__media">
            <picture v-if="!pipelineImageMissing">
              <source :srcset="pipelineImageSources.dark" media="(prefers-color-scheme: dark)" />
              <img
                :src="pipelineImageSources.light"
                :alt="t('landing.pipelineAlt', 'Diagram of Voice Chat Assistant flowing into AgentOS GMIs and tool outputs.')"
                @error="onPipelineImageError"
              />
            </picture>
            <div v-else class="media-placeholder">
              <p>
                {{ t('landing.pipelinePlaceholder', 'Upload /public/media/landing/voice-pipeline-light.svg (and voice-pipeline-dark.svg) to replace this placeholder diagram.') }}
              </p>
            </div>
          </div>
          <ul class="landing-pipeline__steps">
            <li v-for="step in pipelineSteps" :key="step.title">
              <h4>{{ step.title }}</h4>
              <p>{{ step.body }}</p>
            </li>
          </ul>
        </section>

        <section class="landing-ownership" aria-labelledby="landing-ownership-heading">
          <div class="landing-section-header">
            <h3 id="landing-ownership-heading">{{ t('landing.ownershipHeading', 'Mini-app agents you own forever') }}</h3>
            <p>{{ t('landing.ownershipSubheading', 'Agents are modular Vue mini-apps tied to AgentOS personas. Export them as JSON and redeploy anywhere.') }}</p>
          </div>
          <div class="landing-ownership__content">
            <ul>
              <li>{{ t('landing.ownershipPoint1', 'One registry powers both the voice UI and backend GMIs.') }}</li>
              <li>{{ t('landing.ownershipPoint2', 'Export personas, tool packs, transcripts, and artifacts whenever you like.') }}</li>
              <li>{{ t('landing.ownershipPoint3', 'Publish to vca.chat or import into self-hosted AgentOS instances.') }}</li>
            </ul>
            <div class="landing-ownership__links">
              <RouterLink to="/register" class="landing-link">
                {{ t('landing.ownershipCreateLink', 'Create your first agent') }}
              </RouterLink>
              <a
                href="https://github.com/wearetheframers/voice-chat-assistant/blob/main/docs/CREATING_NEW_AGENT.md"
                target="_blank"
                rel="noopener noreferrer"
                class="landing-link"
              >
                {{ t('landing.ownershipDocsLink', 'Read the agent creation guide') }}
              </a>
            </div>
          </div>
        </section>

        <section class="landing-integrations" aria-labelledby="landing-integrations-heading">
          <div class="landing-section-header">
            <h3 id="landing-integrations-heading">{{ t('landing.integrationsHeading', 'SaaS starter ready out of the box') }}</h3>
            <p>{{ t('landing.integrationsSubheading', 'Supabase auth, billing, storage adapters, and release automation are already wired in.') }}</p>
          </div>
          <div class="landing-integrations__grid">
            <article v-for="card in integrationCards" :key="card.title" class="landing-integrations__card">
              <component :is="card.icon" aria-hidden="true" class="landing-integrations__icon" />
              <h4>{{ card.title }}</h4>
              <p>{{ card.body }}</p>
              <div class="landing-integrations__links">
                <a v-for="link in card.links" :key="link.href" :href="link.href" target="_blank" rel="noopener noreferrer">
                  {{ link.label }}
                </a>
              </div>
            </article>
          </div>
        </section>

        <section
          v-if="landingPlanCards.length"
          class="public-pricing-showcase-ephemeral landing-plans"
          aria-labelledby="landing-plans-heading"
        >
          <header class="public-pricing-header">
            <div class="public-pricing-heading">
              <h3 id="landing-plans-heading">{{ t('landing.plansHeading', 'Predictable billing with BYO keys') }}</h3>
              <p>{{ t('landing.plansSubheading', 'Track usage in real time, enjoy included GPT-4o allowances, and fall back to your own API keys when you need more.') }}</p>
            </div>
            <span class="public-pricing-starting">
              <span class="public-pricing-label">{{ t('landing.plansStartLabel', 'Plans start at') }}</span>
              <strong>{{ landingStartingPrice }}</strong>
              <span class="public-pricing-period">/ {{ t('auth.perMonth', 'month') }}</span>
            </span>
          </header>

          <div class="public-pricing-grid-ephemeral">
            <article
              v-for="(plan, index) in landingPlanCards"
              :key="plan.id"
              class="public-pricing-card"
              :class="{
                'public-pricing-card--featured': plan.isFeatured,
                'public-pricing-card--free': plan.priceValue === 0
              }"
              :style="{ '--plan-stagger': `${index * 80}ms` }"
            >
              <header class="public-pricing-card__header">
                <span class="public-pricing-card__name">{{ plan.title }}</span>
                <div class="public-pricing-card__price">
                  <span class="public-pricing-card__price-value">{{ plan.priceText }}</span>
                  <span v-if="plan.priceValue > 0" class="public-pricing-card__price-period">/ {{ t('auth.perMonth', 'month') }}</span>
                </div>
                <span class="public-pricing-card__allowance">{{ plan.allowance }}</span>
                <span v-if="plan.allowanceNote" class="public-pricing-card__note">{{ plan.allowanceNote }}</span>
                <span v-if="plan.isFeatured" class="public-pricing-card__badge">{{ t('plans.mostPopular', 'Most popular') }}</span>
              </header>

              <ul class="public-pricing-card__features">
                <li v-for="(bullet, bulletIndex) in plan.bullets" :key="bulletIndex">{{ bullet }}</li>
              </ul>

              <button
                type="button"
                class="public-pricing-card__cta"
                :class="{
                  'public-pricing-card__cta--primary': plan.priceValue > 0,
                  'public-pricing-card__cta--ghost': plan.priceValue === 0
                }"
                @click="handleLandingPlanAction(plan)"
              >
                {{ plan.ctaLabel }}
              </button>
            </article>
          </div>
          <p class="landing-plans__footnote">
            {{ t('landing.plansFootnote', 'Included allowances refresh daily. Creator and Organization tiers automatically switch to your own API keys after the platform budget is exhausted.') }}
          </p>
        </section>

        <section class="landing-faq" aria-labelledby="landing-faq-heading">
          <div class="landing-section-header">
            <h3 id="landing-faq-heading">{{ t('landing.faqHeading', 'Frequently asked questions') }}</h3>
          </div>
          <div class="landing-faq__items">
            <details v-for="item in faqEntries" :key="item.question" class="landing-faq__item">
              <summary>{{ item.question }}</summary>
              <p>{{ item.answer }}</p>
            </details>
          </div>
        </section>

        <section
          ref="agentSelectorSectionRef"
          id="public-agent-selector-section"
          class="landing-try"
          aria-labelledby="landing-try-heading"
        >
          <h3 id="landing-try-heading">{{ t('landing.tryHeading', 'Try it live in your browser') }}</h3>
          <p class="landing-try__subtitle">
            {{ t('landing.trySubheading', 'Pick a public assistant, ask a question, and watch streaming responses arrive in real time.') }}
          </p>

          <div
            v-if="availablePublicAgents.length > 0 && (!rateLimitInfo || (isPublicRateLimit(rateLimitInfo) && rateLimitInfo.remaining > 0) || rateLimitInfo.tier === 'authenticated')"
            class="public-agent-selector-area-ephemeral"
          >
            <p v-if="availablePublicAgents.length > 1" class="selector-title-ephemeral">
              {{ t('landing.agentSelectorTitle', 'Select an assistant') }}
            </p>
            <div class="relative inline-block text-left" ref="publicAgentSelectorDropdownRef">
              <button
                @click="showPublicAgentSelector = !showPublicAgentSelector"
                class="agent-selector-button-ephemeral"
                aria-haspopup="true"
                :aria-expanded="showPublicAgentSelector"
                aria-controls="public-agent-select-dropdown"
              >
                <component :is="currentPublicAgent?.iconComponent || UserGroupIcon" class="selected-agent-icon" :class="currentPublicAgent?.iconClass" aria-hidden="true" />
                <span>{{ currentPublicAgent?.label || (availablePublicAgents.length > 0 ? t('landing.agentSelectorPrompt', 'Choose assistant') : t('landing.agentSelectorEmpty', 'No assistants available')) }}</span>
                <ChevronDownIcon class="chevron-icon" :class="{'open': showPublicAgentSelector}" aria-hidden="true" />
              </button>
              <Transition name="dropdown-float-neomorphic">
                <div
                  v-if="showPublicAgentSelector"
                  id="public-agent-select-dropdown"
                  class="agent-selector-dropdown-panel-ephemeral"
                  role="menu"
                >
                  <div class="dropdown-header-holographic">
                    <h3 class="dropdown-title">{{ t('landing.agentSelectorDropdownTitle', 'Public assistants') }}</h3>
                  </div>
                  <div class="dropdown-content-holographic custom-scrollbar-thin">
                    <button
                      v-for="agentDef in availablePublicAgents"
                      :key="agentDef.id"
                      @click="selectPublicAgent(agentDef.id)"
                      class="dropdown-item-holographic"
                      :class="{ 'active': currentPublicAgent?.id === agentDef.id }"
                      role="menuitemradio"
                      :aria-checked="currentPublicAgent?.id === agentDef.id"
                    >
                      <div class="mode-icon-dd-holographic" :class="agentDef.iconClass" aria-hidden="true">
                        <component :is="agentDef.iconComponent || SparklesIcon" class="icon-base" />
                      </div>
                      <span class="dropdown-item-label">{{ agentDef.label }}</span>
                      <CheckOutlineIcon v-if="currentPublicAgent?.id === agentDef.id" class="icon-sm checkmark-icon-active" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
          <div
            v-else
            class="media-placeholder landing-try__placeholder"
          >
            <p>{{ t('landing.agentSelectorPlaceholder', 'No public assistants configured yet. Publish one to showcase the live demo or adjust your rate limits.') }}</p>
          </div>
        </section>
      </template>

      <template #main-content>
        <component
          :is="currentAgentViewComponent"
          v-if="currentPublicAgent && currentPublicAgent.isPublic && currentAgentViewComponent && typeof currentAgentViewComponent !== 'string' && currentPublicAgent.capabilities?.handlesOwnInput"
          :key="currentPublicAgent.id + '-dedicated-public-ui'"
          ref="agentViewRef"
          :agent-id="currentPublicAgent.id"
          :agent-config="currentPublicAgent"
          class="dedicated-agent-view h-full w-full"
          @agent-event="() => {}"
        />
        <div
          v-else-if="mainContentData?.type === 'custom-component' && mainContentData.data === 'RateLimitExceededPlaceholder'"
          class="rate-limit-banner-ephemeral"
        >
          <ExclamationTriangleIcon class="banner-icon-ephemeral" aria-hidden="true" />
          <h3 class="banner-title-ephemeral">Daily Public Preview Limit Reached</h3>
          <p class="banner-text-ephemeral">
            Thank you for trying our public preview! You've reached the daily interaction limit.
            Access will reset around <strong>{{ formatResetTime((rateLimitInfo && isPublicRateLimit(rateLimitInfo) && rateLimitInfo.resetAt) || undefined) }}</strong>.
          </p>
          <RouterLink to="/login" class="login-prompt-link-ephemeral btn btn-primary-ephemeral btn-sm">
            <KeyIcon class="icon-sm mr-1.5" aria-hidden="true" /> Log In for Full Access
          </RouterLink>
        </div>
        <div
          v-else-if="mainContentData?.type === 'custom-component' && mainContentData.data === 'PublicWelcomePlaceholder'"
          class="public-welcome-placeholder-ephemeral"
        >
          <BuildingStorefrontIcon class="hero-icon-ephemeral" aria-hidden="true" />
          <h2 class="welcome-title-ephemeral">Welcome to Voice AI Assistant</h2>
          <p class="welcome-subtitle-ephemeral">
            This is a public preview. {{ availablePublicAgents.length > 1 ? 'Select an assistant above to begin.' : (currentPublicAgent ? `You are interacting with ${currentPublicAgent.label}.` : 'Use the default assistant to begin.') }}
            Interactions are rate-limited for public users. For unlimited access and more features, please <RouterLink to="/login" class="link-ephemeral">log in or sign up</RouterLink>.
          </p>
        </div>
        <div
          v-else-if="mainContentData?.type === 'custom-component' && mainContentData.data === 'NoPublicAgentsPlaceholder'"
          class="public-welcome-placeholder-ephemeral"
        >
          <UserGroupIcon class="hero-icon-ephemeral no-agents-icon" aria-hidden="true" />
          <h2 class="welcome-title-ephemeral">Assistants Currently Unavailable</h2>
          <p class="welcome-subtitle-ephemeral">
            We're sorry, but there are no public assistants configured for preview at this moment. Please check back later or <RouterLink to="/login" class="link-ephemeral">log in</RouterLink> for access to private assistants.
          </p>
        </div>
        <MainContentView
          v-else-if="currentPublicAgent && mainContentData && mainContentData.type !== 'custom-component'"
          :agent="currentPublicAgent"
          class="main-content-view-wrapper-ephemeral default-agent-mcv h-full w-full"
        >
          <div
            v-if="currentPublicAgent?.capabilities?.usesCompactRenderer && (mainContentData.type === 'compact-message-renderer-data' || (mainContentData.type === 'markdown' && !chatStore.isMainContentStreaming))"
            class="content-renderer-container-ephemeral"
          >
            <CompactMessageRenderer
              :content="mainContentData.data"
              :mode="currentPublicAgent.id"
              class="content-renderer-ephemeral"
            />
          </div>
          <div
            v-else-if="mainContentData.type === 'markdown' || mainContentData.type === 'welcome'"
            class="prose-ephemeral content-renderer-ephemeral content-renderer-container-ephemeral"
            v-html='chatStore.isMainContentStreaming && (mainContentData.type === "markdown") && chatStore.getCurrentMainContentDataForAgent(currentPublicAgent.id)?.agentId === currentPublicAgent.id ?
                     chatStore.streamingMainContentText + "<span class=\"streaming-cursor-ephemeral\">|</span>" :
                     mainContentData.data'
            aria-atomic="true"
          >
          </div>
          <div
            v-else-if="mainContentData.type === 'loading'"
            class="prose-ephemeral content-renderer-ephemeral content-renderer-container-ephemeral"
            v-html='mainContentData.data + (chatStore.isMainContentStreaming ? "<span class=\"streaming-cursor-ephemeral\">|</span>" : "")'
            aria-atomic="true"
          >
          </div>
          <div
            v-else-if="mainContentData.type === 'error'"
            class="prose-ephemeral prose-error content-renderer-ephemeral content-renderer-container-ephemeral"
            v-html="mainContentData.data"
            aria-atomic="true"
          >
          </div>
          <div
            v-else
            class="content-renderer-ephemeral text-[var(--color-text-muted)] italic p-6 text-center content-renderer-container-ephemeral"
          >
            <p class="text-lg">Interacting with {{ currentPublicAgent.label }}.</p>
            <p class="text-sm mt-2">(Displaying content type: {{ mainContentData.type }})</p>
          </div>
        </MainContentView>
        <div
          v-else-if="isLoadingResponse && !mainContentData"
          class="loading-placeholder-ephemeral"
        >
          <div class="loading-animation-content">
            <div class="loading-spinner-ephemeral !w-12 !h-12"><div v-for="i in 8" :key="`blade-${i}`" class="spinner-blade-ephemeral !w-1.5 !h-4"></div></div>
            <p class="loading-text-ephemeral !text-base mt-3">Loading Assistant...</p>
          </div>
        </div>
        <div
          v-else
          class="public-welcome-placeholder-ephemeral"
        >
          <SparklesIcon class="hero-icon-ephemeral !text-[var(--color-text-muted)]" />
          <h2 class="welcome-title-ephemeral">Initializing Public Interface</h2>
          <p class="welcome-subtitle-ephemeral">Please wait a moment. Assistants are loading...</p>
        </div>
      </template>
    </UnifiedChatLayout>
  </div>
</template>

<style lang="scss">
// Marketing sections
.landing-hero {
  display: grid;
  gap: 2.5rem;
  margin-bottom: 3rem;
  padding: clamp(1.5rem, 2vw, 2.75rem);
  border-radius: 1.75rem;
  background: linear-gradient(180deg, rgba(250, 250, 255, 0.75), rgba(244, 244, 254, 0.5));
  backdrop-filter: blur(24px);
  @media (min-width: 1024px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
    align-items: center;
  }
  @media (prefers-color-scheme: dark) {
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8));
    border: 1px solid rgba(148, 163, 184, 0.1);
  }
}
.landing-hero__content {
  display: grid;
  gap: 1.5rem;
}
.landing-hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.875rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.35em;
  background: rgba(99, 102, 241, 0.12);
  color: #4f46e5;
}
.landing-hero__badge-icon {
  width: 1.1rem;
  height: 1.1rem;
}
.landing-hero__headline {
  font-size: clamp(2rem, 3.5vw, 3rem);
  line-height: 1.1;
  color: var(--color-text, #0f172a);
}
.landing-hero__subtitle {
  font-size: clamp(1rem, 1.5vw, 1.2rem);
  color: rgba(15, 23, 42, 0.75);
  @media (prefers-color-scheme: dark) {
    color: rgba(226, 232, 240, 0.75);
  }
}
.landing-hero__ctas {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.landing-hero__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border-radius: 9999px;
  font-size: 0.9375rem;
  font-weight: 600;
  transition: transform 150ms ease, box-shadow 150ms ease, background 150ms ease, color 150ms ease;
  cursor: pointer;
  text-decoration: none;
}
.landing-hero__cta--primary {
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: #fff;
  box-shadow: 0 20px 45px -20px rgba(99, 102, 241, 0.6);
}
.landing-hero__cta--ghost {
  border: 1px solid rgba(99, 102, 241, 0.35);
  color: #4f46e5;
  background: rgba(99, 102, 241, 0.1);
}
.landing-hero__cta--outline {
  border: 1px solid rgba(148, 163, 184, 0.6);
  color: rgba(15, 23, 42, 0.8);
  background: transparent;
}
.landing-hero__cta:hover {
  transform: translateY(-2px);
}
.landing-hero__cta--primary:hover {
  box-shadow: 0 24px 50px -18px rgba(99, 102, 241, 0.65);
}
.landing-hero__highlights {
  display: grid;
  gap: 0.75rem;
  margin-top: 0.5rem;
  list-style: none;
  padding: 0;
}
.landing-hero__highlights li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.95rem;
  color: rgba(15, 23, 42, 0.7);
  @media (prefers-color-scheme: dark) {
    color: rgba(226, 232, 240, 0.75);
  }
}
.landing-hero__highlight-icon {
  width: 1.125rem;
  height: 1.125rem;
  color: rgba(99, 102, 241, 0.8);
}
.landing-hero__media {
  position: relative;
  border-radius: 1.5rem;
  overflow: hidden;
  box-shadow: 0 25px 65px -35px rgba(15, 23, 42, 0.55);
  background: rgba(15, 23, 42, 0.05);
}
.landing-hero__video {
  width: 100%;
  display: block;
  border-radius: inherit;
}
.media-placeholder {
  display: grid;
  place-items: center;
  min-height: 260px;
  padding: 1.5rem;
  border-radius: 1.5rem;
  border: 1px dashed rgba(148, 163, 184, 0.5);
  text-align: center;
  color: rgba(15, 23, 42, 0.65);
  font-size: 0.9rem;
  background: rgba(248, 250, 252, 0.7);
  @media (prefers-color-scheme: dark) {
    background: rgba(15, 23, 42, 0.45);
    color: rgba(226, 232, 240, 0.7);
    border-color: rgba(148, 163, 184, 0.3);
  }
}

.landing-section-header {
  text-align: center;
  max-width: 720px;
  margin: 0 auto 2.25rem;
}
.landing-section-header h3 {
  font-size: clamp(1.5rem, 2.5vw, 2.1rem);
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: var(--color-text, #0f172a);
}
.landing-section-header p {
  font-size: 1rem;
  color: rgba(15, 23, 42, 0.7);
  @media (prefers-color-scheme: dark) {
    color: rgba(226, 232, 240, 0.7);
  }
}

.landing-pipeline {
  margin: 4rem 0;
}
.landing-pipeline__media {
  margin: 0 auto 1.75rem;
  max-width: 880px;
  border-radius: 1.5rem;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.2);
  backdrop-filter: blur(12px);
}
.landing-pipeline__media img {
  display: block;
  width: 100%;
  height: auto;
}
.landing-pipeline__steps {
  display: grid;
  gap: 1.5rem;
  margin: 0 auto;
  max-width: 960px;
  padding: 0;
  list-style: none;
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.landing-pipeline__steps li {
  padding: 1.5rem;
  border-radius: 1.25rem;
  background: rgba(248, 250, 252, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.2);
  @media (prefers-color-scheme: dark) {
    background: rgba(15, 23, 42, 0.55);
    border-color: rgba(148, 163, 184, 0.15);
  }
}
.landing-pipeline__steps h4 {
  font-size: 1.05rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--color-text, #0f172a);
}
.landing-pipeline__steps p {
  font-size: 0.95rem;
  color: rgba(15, 23, 42, 0.7);
  @media (prefers-color-scheme: dark) {
    color: rgba(226, 232, 240, 0.75);
  }
}

.landing-ownership {
  margin: 4rem 0;
}
.landing-ownership__content {
  display: grid;
  gap: 1.5rem;
  max-width: 900px;
  margin: 0 auto;
  text-align: left;
}
.landing-ownership__content ul {
  list-style: disc;
  padding-left: 1.5rem;
  display: grid;
  gap: 0.75rem;
  font-size: 0.95rem;
  color: rgba(15, 23, 42, 0.75);
  @media (prefers-color-scheme: dark) {
    color: rgba(226, 232, 240, 0.75);
  }
}
.landing-ownership__links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.landing-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.6rem 1.1rem;
  border-radius: 9999px;
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #4f46e5;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  transition: background 150ms ease, color 150ms ease, border 150ms ease;
}
.landing-link:hover {
  background: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.4);
}

.landing-integrations {
  margin: 4rem 0;
}
.landing-integrations__grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
.landing-integrations__card {
  padding: 1.5rem;
  border-radius: 1.25rem;
  background: rgba(248, 250, 252, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.2);
  display: grid;
  gap: 0.75rem;
  @media (prefers-color-scheme: dark) {
    background: rgba(15, 23, 42, 0.55);
    border-color: rgba(148, 163, 184, 0.15);
  }
}
.landing-integrations__icon {
  width: 1.5rem;
  height: 1.5rem;
  color: rgba(99, 102, 241, 0.8);
}
.landing-integrations__card h4 {
  font-weight: 600;
  font-size: 1.05rem;
  color: var(--color-text, #0f172a);
}
.landing-integrations__card p {
  font-size: 0.95rem;
  color: rgba(15, 23, 42, 0.7);
  @media (prefers-color-scheme: dark) {
    color: rgba(226, 232, 240, 0.75);
  }
}
.landing-integrations__links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.landing-integrations__links a {
  font-size: 0.85rem;
  color: rgba(99, 102, 241, 0.85);
  text-decoration: none;
}
.landing-integrations__links a:hover {
  text-decoration: underline;
}

.landing-plans {
  margin: 4rem 0;
}
.landing-plans__footnote {
  margin-top: 1.75rem;
  text-align: center;
  font-size: 0.85rem;
  color: rgba(15, 23, 42, 0.65);
  @media (prefers-color-scheme: dark) {
    color: rgba(226, 232, 240, 0.65);
  }
}

.landing-faq {
  margin: 4rem 0;
}
.landing-faq__items {
  max-width: 780px;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}
.landing-faq__item {
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  padding: 1rem 1.25rem;
  background: rgba(248, 250, 252, 0.85);
  @media (prefers-color-scheme: dark) {
    background: rgba(15, 23, 42, 0.55);
    border-color: rgba(148, 163, 184, 0.15);
  }
}
.landing-faq__item summary {
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--color-text, #0f172a);
  list-style: none;
}
.landing-faq__item summary::-webkit-details-marker {
  display: none;
}
.landing-faq__item[open] summary {
  color: rgba(99, 102, 241, 0.95);
}
.landing-faq__item p {
  margin-top: 0.75rem;
  font-size: 0.9rem;
  color: rgba(15, 23, 42, 0.7);
  @media (prefers-color-scheme: dark) {
    color: rgba(226, 232, 240, 0.7);
  }
}

.landing-try {
  margin: 4rem 0 2rem;
  text-align: center;
}
.landing-try__subtitle {
  max-width: 560px;
  margin: 0.5rem auto 2rem;
  font-size: 0.95rem;
  color: rgba(15, 23, 42, 0.65);
  @media (prefers-color-scheme: dark) {
    color: rgba(226, 232, 240, 0.7);
  }
}
.landing-try__placeholder {
  margin-top: 1.5rem;
}

// Styles for PublicHome are in frontend/src/styles/views/_public-home.scss
.dedicated-agent-view { // Ensure dedicated views fill space
  height: 100%;
  width: 100%;
  overflow: auto; // Or hidden, depending on internal scrolling of agent view
}
.default-agent-mcv { // Ensure default view also fills space
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
}
.content-renderer-container-ephemeral { // Ensure this exists if used by default MainContentView structure
    flex-grow: 1;
    overflow-y: auto; // Manages scroll for default content types
}
</style>









