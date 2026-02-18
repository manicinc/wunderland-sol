// File: frontend/src/components/AgentCard.vue
/**
 * @file AgentCard.vue
 * @description Displays an individual AI agent with its details in a visually rich card format.
 * Features dynamic hover/active animations, capability tags, access tier indicators, and
 * adheres to the "Ephemeral Harmony" neo-holographic design language.
 *
 * @component AgentCard
 * @props {IAgentDefinition} agent - The definition object for the agent to display.
 * @emits select-agent - Emitted when a selectable agent card is clicked, passing the agent's ID.
 * @emits show-agent-info - Emitted when the info button on an agent card is clicked, passing the agent definition.
 * @emits interaction - Emitted for miscellaneous interactions, typically to request a toast message display.
 *
 * @version 1.1.1 - Enhanced JSDoc, confirmed class bindings for SCSS, refined type safety for icons.
 */
<script setup lang="ts">
import { computed, type Component as VueComponentType, type PropType, type FunctionalComponent, type DefineComponent } from 'vue';
import { type IAgentDefinition, type IDetailedCapabilityItem, type AgentId } from '@/services/agent.service';
import type { MarketplaceAgentSummaryFE } from '@/utils/api';
import { useAgentStore } from '@/store/agent.store';
import { useAuth } from '@/composables/useAuth';
import {
  CheckCircleIcon,
  LockClosedIcon,
  InformationCircleIcon,
  TagIcon,
  CogIcon, // Default for capability icon
  ShieldCheckIcon,
} from '@heroicons/vue/24/outline';

/**
 * @props - Defines the properties accepted by the AgentCard component.
 */
const props = defineProps({
  /** * @prop {IAgentDefinition} agent - The agent definition object.
   * Contains all details required to display the agent card, such as label, description,
   * icon, category, tags, capabilities, and access tier.
   * @required 
   */
  agent: { type: Object as PropType<IAgentDefinition>, required: true },
  marketplace: { type: Object as PropType<MarketplaceAgentSummaryFE | null>, required: false, default: null },
});

/**
 * @emits - Defines the custom events emitted by the AgentCard component.
 */
const emit = defineEmits<{
  /**
   * @event select-agent
   * @description Emitted when a selectable (not locked) agent card is clicked by the user.
   * @param {AgentId} agentId - The unique identifier of the selected agent.
   */
  (e: 'select-agent', agentId: AgentId): void;
  /**
   * @event show-agent-info
   * @description Emitted when the information button on an agent card is clicked.
   * This typically triggers a modal or detailed view for the agent.
   * @param {IAgentDefinition} agent - The full agent definition object.
   */
  (e: 'show-agent-info', agent: IAgentDefinition): void;
  /**
   * @event interaction
   * @description Emitted for miscellaneous interactions that need to be handled by a parent,
   * such as requesting a toast notification (e.g., when a locked card is clicked).
   * @param payload - An object containing the interaction type and any relevant data.
   * @param {string} payload.type - The type of interaction (e.g., 'toast').
   * @param {any} [payload.data] - Data associated with the interaction.
   */
  (e: 'interaction', payload: { type: string; data?: any }): void;
}>();

const agentStore = useAgentStore();
const auth = useAuth();

/**
 * @computed isActiveAgent
 * @description Determines if the agent displayed by this card is the currently active agent in the application.
 * @returns {boolean} `true` if this agent is active, `false` otherwise.
 */
const isActiveAgent = computed<boolean>(() => agentStore.activeAgentId === props.agent.id);

/**
 * @computed isLocked
 * @description Determines if the agent card should be displayed as locked (inaccessible) to the current user.
 * Considers the agent's public status, the user's authentication state, and agent access tiers.
 * @returns {boolean} `true` if the agent is locked for the current user, `false` otherwise.
 */
const isLocked = computed<boolean>(() => {
  if (props.agent.isPublic && (!props.agent.accessTier || props.agent.accessTier === 'public')) {
    return false; // Publicly accessible agents are never locked.
  }
  if (!auth.isAuthenticated.value) {
    // If not public and user is not authenticated, it's locked.
    return true;
  }
  // User is authenticated. Check tiers if defined.
  if (props.agent.accessTier === 'member') return false; // Authenticated users can access member-tier.
  if (props.agent.accessTier === 'premium') {
    // TODO: Implement a real check against user's premium status: return !auth.user.value?.hasPremiumAccess;
    return false; // Simplified: if authenticated, assume premium access for now.
  }
  // If authenticated and no specific tier restriction (or tier is 'member'), it's accessible.
  return false;
});

const marketplaceMeta = computed<MarketplaceAgentSummaryFE | null>(() => props.marketplace ?? null);

const displayTagline = computed<string>(() => {
  return (
    marketplaceMeta.value?.tagline?.trim() ||
    props.agent.longDescription ||
    props.agent.description
  );
});

const pricingBadge = computed<{ label: string; variant: 'free' | 'paid' | 'freemium' | 'unknown'; price?: string }>(() => {
  const meta = marketplaceMeta.value;
  if (!meta?.pricing) {
    return { label: props.agent.isPublic ? 'Included' : 'Restricted', variant: props.agent.isPublic ? 'free' : 'unknown' };
  }
  const { model, priceCents, currency } = meta.pricing;
  switch (model) {
    case 'free':
      return { label: 'Free', variant: 'free' };
    case 'freemium':
      return { label: 'Free tier', variant: 'freemium' };
    case 'paid': {
      const price =
        typeof priceCents === 'number'
          ? `${((priceCents ?? 0) / 100).toLocaleString(undefined, {
              style: 'currency',
              currency: currency ?? 'USD',
              minimumFractionDigits: 0,
            })}/mo`
          : 'Paid';
      return { label: price, variant: 'paid', price };
    }
    default:
      return { label: 'Marketplace', variant: 'unknown' };
  }
});

const ratingSummary = computed<string | null>(() => {
  const rating = marketplaceMeta.value?.metrics?.rating;
  const downloads = marketplaceMeta.value?.metrics?.downloads;
  if (!rating && !downloads) return null;
  const ratingText = rating ? `${rating.toFixed(1)}★` : '';
  const downloadText =
    typeof downloads === 'number' ? `${downloads.toLocaleString()} installs` : '';
  return [ratingText, downloadText].filter(Boolean).join(' · ') || null;
});

/**
 * @computed cardClasses
 * @description Computes a dynamic list of CSS classes for the root `div` of the agent card.
 * These classes reflect the card's state (active, locked) and its access tier, enabling
 * specific styling via SCSS.
 * @returns {string[]} An array of CSS class names.
 */
const cardClasses = computed<string[]>(() => {
  const base: Array<string | false> = [
    'agent-card-ephemeral',
    isActiveAgent.value && !isLocked.value && 'is-active-agent',
    isLocked.value ? 'is-locked-agent' : 'card-interactive-ephemeral',
    `tier--${props.agent.accessTier || (props.agent.isPublic ? 'public' : 'member')}`,
  ];
  return base.filter(Boolean) as string[];
});

/**
 * @function handleSelectAgent
 * @description Handles click events on the agent card.
 * If the agent is not locked, it emits the 'select-agent' event.
 * If locked, it emits an 'interaction' event to request a toast message.
 */
const handleSelectAgent = (): void => {
  if (!isLocked.value) {
    emit('select-agent', props.agent.id);
  } else {
    let message = `Access to "${props.agent.label}" requires login.`;
    if (auth.isAuthenticated.value) {
      if (props.agent.accessTier === 'member') message = `Access to "${props.agent.label}" requires active member status.`;
      else if (props.agent.accessTier === 'premium') message = `"${props.agent.label}" is a premium assistant. Please upgrade for access.`;
      else message = `You do not have sufficient permissions to access "${props.agent.label}".`;
    }
    emit('interaction', {
      type: 'toast',
      data: { type: 'warning', title: 'Access Restricted', message: message, duration: 6000 }
    });
  }
};

/**
 * @function handleShowInfo
 * @description Handles click events on the information button within the card.
 * Stops event propagation (to prevent selecting the card) and emits 'show-agent-info'.
 * @param {MouseEvent} event - The click event object.
 */
const handleShowInfo = (event: MouseEvent): void => {
  event.stopPropagation();
  emit('show-agent-info', props.agent);
};

/**
 * @computed agentIconToDisplay
 * @description Determines the Vue component to use for the agent's main icon.
 * Prioritizes `props.agent.iconComponent` and falls back to `InformationCircleIcon`.
 * @returns {VueComponentType | FunctionalComponent | DefineComponent} The icon component.
 */
const agentIconToDisplay = computed<VueComponentType | FunctionalComponent | DefineComponent>(() => {
    const icon = props.agent.iconComponent;
    if (typeof icon === 'object' || typeof icon === 'function') {
        return icon as VueComponentType; // Basic check for a Vue component structure
    }
    return InformationCircleIcon as VueComponentType; // Default fallback
});

/**
 * @function getCapabilityIcon
 * @description Determines the Vue component for a specific capability's icon.
 * Prioritizes `capability.icon` and falls back to `CogIcon`.
 * @param {IDetailedCapabilityItem} capability - The capability item.
 * @returns {VueComponentType | FunctionalComponent | DefineComponent} The icon component for the capability.
 */
const getCapabilityIcon = (capability: IDetailedCapabilityItem): VueComponentType | FunctionalComponent | DefineComponent => {
    const icon = capability.icon;
     if (typeof icon === 'object' || typeof icon === 'function') {
        return icon as VueComponentType;
    }
    return CogIcon as VueComponentType; // Default fallback for capability icons
};

</script>

<template>
  <div
    :class="cardClasses"
    @click="handleSelectAgent"
    @keydown.enter.prevent="handleSelectAgent"
    @keydown.space.prevent="handleSelectAgent"
    :tabindex="isLocked ? -1 : 0"
    role="button"
    :aria-pressed="isActiveAgent && !isLocked"
    :aria-label="`Select assistant: ${agent.label}. ${displayTagline}. ${isLocked ? (agent.accessTier === 'premium' ? 'Premium access required.' : (agent.accessTier === 'member' ? 'Member access required.' : 'Login required.')) : 'Selectable.'}`"
    :aria-disabled="isLocked"
  >
    <div v-if="isLocked" class="locked-overlay-ephemeral" aria-hidden="true">
      <LockClosedIcon class="locked-icon" />
      <span class="locked-text">
        {{ agent.accessTier === 'premium' ? 'Premium Tier' : (agent.accessTier === 'member' ? 'Member Access' : 'Login Required') }}
      </span>
    </div>

    <div class="agent-card-content-wrapper">
      <header class="agent-card-header-ephemeral">
        <div class="agent-icon-wrapper-ephemeral" :class="agent.iconClass" aria-hidden="true">
          <component :is="agentIconToDisplay" class="agent-icon-ephemeral" />
        </div>
        <div class="agent-title-group-ephemeral">
          <h3 class="agent-name-ephemeral">{{ agent.label }}</h3>
          <p v-if="agent.category" class="agent-category-ephemeral">
            {{ agent.category }}
          </p>
          <div class="agent-metadata-ephemeral">
            <span class="filter-chip-ephemeral agent-pricing-chip" :data-variant="pricingBadge.variant">
              {{ pricingBadge.label }}
            </span>
            <span v-if="ratingSummary" class="agent-rating-ephemeral">
              {{ ratingSummary }}
            </span>
          </div>
        </div>
        <CheckCircleIcon v-if="isActiveAgent && !isLocked" class="selected-checkmark-ephemeral" aria-label="Currently selected assistant"/>
        <button
          v-if="agent.longDescription || (agent.detailedCapabilities && agent.detailedCapabilities.length > 0)"
          @click.stop="handleShowInfo"
          class="info-button-ephemeral btn btn-ghost-ephemeral btn-icon-ephemeral btn-xs-ephemeral"
          title="More Information"
          aria-label="Show more information about this assistant"
        >
          <InformationCircleIcon class="icon-xs" />
        </button>
      </header>

      <p class="agent-description-ephemeral">
        {{ displayTagline }}
      </p>

      <div class="agent-details-section-ephemeral" v-if="(agent.tags && agent.tags.length > 0) || (agent.detailedCapabilities && agent.detailedCapabilities.length > 0)">
        <div class="agent-tags-ephemeral" v-if="agent.tags && agent.tags.length > 0">
          <TagIcon class="details-section-icon" aria-hidden="true" />
          <div class="tags-list-ephemeral" aria-label="Tags">
            <span v-for="tag in agent.tags.slice(0, 3)" :key="tag" class="tag-chip-ephemeral">{{ tag }}</span>
            <span v-if="agent.tags.length > 3" class="tag-chip-ephemeral more-tags-chip" :title="agent.tags.slice(3).join(', ')">
              +{{ agent.tags.length - 3 }} more
            </span>
          </div>
        </div>

        <div class="agent-capabilities-ephemeral" v-if="agent.detailedCapabilities && agent.detailedCapabilities.length > 0">
          <CogIcon class="details-section-icon" aria-hidden="true"/>
          <div class="capabilities-list-ephemeral" aria-label="Key Capabilities">
            <span
              v-for="cap in agent.detailedCapabilities.slice(0, 2)" :key="cap.id" class="capability-chip-ephemeral" :title="cap.description"
            >
              <component :is="getCapabilityIcon(cap)" class="capability-icon-ephemeral" aria-hidden="true"/>
              {{ cap.label }}
            </span>
             <span v-if="agent.detailedCapabilities.length > 2" class="capability-chip-ephemeral more-tags-chip" :title="agent.detailedCapabilities.slice(2).map(c => c.label).join(', ')">
              +{{ agent.detailedCapabilities.length - 2 }} more
            </span>
          </div>
        </div>
      </div>
    </div>
     <div v-if="agent.accessTier && agent.accessTier !== 'public'" class="access-tier-badge-ephemeral" :class="`tier--${agent.accessTier}`" aria-hidden="true">
        <ShieldCheckIcon v-if="agent.accessTier === 'member'" class="tier-icon" aria-hidden="true"/>
        <LockClosedIcon v-else-if="agent.accessTier === 'premium'" class="tier-icon" aria-hidden="true"/>
        {{ agent.accessTier.charAt(0).toUpperCase() + agent.accessTier.slice(1) }}
    </div>
  </div>
</template>

<style lang="scss">
// Styles for this component are primarily located in:
// frontend/src/styles/components/agents/_agent-card.scss
// This ensures a separation of concerns and better organization.
// The SCSS file should be imported into the main SCSS entry point (e.g., main.scss).
</style>
