// File: frontend/src/components/header/AgentHubTrigger.vue
/**
 * @file AgentHubTrigger.vue
 * @description A prominent and dynamically animated button in the application header
 * that opens the main Agent Hub/Catalog. It is styled to have significant visual weight
 * and provides engaging feedback on interaction, aligning with the "Ephemeral Harmony"
 * and "evolutionary organism" UI concepts.
 *
 * @component AgentHubTrigger
 * @props None
 * @emits open-agent-hub - Signals a request to open the Agent Hub modal.
 *
 * @example
 * <AgentHubTrigger @open-agent-hub="handleOpenAgentHub" />
 */
<script setup lang="ts">
import { Squares2X2Icon } from '@heroicons/vue/24/outline';

/**
 * @emits - Defines the events emitted by this component.
 */
const emit = defineEmits<{
  /**
   * Emitted when the button is clicked, signaling to the parent component
   * that the Agent Hub should be opened.
   */
  (e: 'open-agent-hub'): void;
}>();

/**
 * @function handleClick
 * @description Handles the click event on the button. Emits the 'open-agent-hub' event.
 * @returns {void}
 */
const handleClick = (): void => {
  emit('open-agent-hub');
};
</script>

<template>
  <button
    @click="handleClick"
    class="agent-hub-trigger-button btn btn-ghost-ephemeral btn-icon-ephemeral direct-header-button"
    title="Voice Assistants Hub"
    aria-label="Open assistant catalog"
  >
    <Squares2X2Icon class="icon-base icon-trigger" />
    <span class="trigger-text-ephemeral hidden xl:inline">Assistants</span>
  </button>
</template>

<style lang="scss" scoped>
/**
 * Scoped SCSS for AgentHubTrigger.vue.
 * Defines a more prominent and dynamic appearance for this key header button.
 */
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;

.agent-hub-trigger-button {
  // Base styles inherited from .direct-header-button in _header.scss
  // We'll add specific overrides and enhancements here for "more weight".
  padding: calc(var.$spacing-sm + 2px) calc(var.$spacing-md - 2px) !important; // Slightly more padding
  gap: calc(var.$spacing-xs + 2px); // More gap for visual separation
  border-radius: var.$radius-lg; // Consistent with other header items
  position: relative; // For pseudo-elements used in animations
  overflow: hidden; // Contain pseudo-element effects

  // Subtle idle state effect - a very faint, slow-breathing border or background shimmer
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(
      160deg,
      hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.03),
      hsla(var(--color-accent-secondary-h), var(--color-accent-secondary-s), var(--color-accent-secondary-l), 0.05),
      hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.03)
    );
    background-size: 300% 300%; // For animation
    opacity: 0.6;
    animation: subtle-shimmer-idle 12s var.$ease-in-out-sine infinite alternate;
    z-index: 0; // Behind icon and text
    transition: opacity var.$duration-quick;
  }

  .icon-trigger,
  .trigger-text-ephemeral {
    position: relative; // Ensure icon and text are above the ::before pseudo-element
    z-index: 1;
    transition: transform var.$duration-smooth var.$ease-elastic, // Elastic transform for icon
                color var.$duration-quick var.$ease-out-quad,
                text-shadow var.$duration-quick var.$ease-out-quad; // For text glow
  }

  .icon-trigger {
    // Base animation or state for the icon if needed even in idle
    // The icon itself (Squares2X2Icon) is an SVG imported as a component.
    // Direct manipulation of its internal paths via pure CSS is limited here.
    // We can apply filters or transforms to the whole icon.
    filter: drop-shadow(0 0 1px hsla(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l), 0.2));
  }

  .trigger-text-ephemeral {
    font-size: var.$font-size-xs;
    font-weight: 500; // Slightly less bold than primary buttons, but clear
    letter-spacing: 0.025em; // More refined spacing
  }

  // --- Hover and Focus States ---
  &:hover,
  &:focus-visible {
    // General hover effect from .direct-header-button (background color change) will apply.
    // We add more specific enhancements here.
    &::before { // Enhance the shimmer/glow
      opacity: 1;
      animation-duration: 4s; // Faster shimmer on hover
    }

    .icon-trigger {
      transform: scale(1.2) rotate(30deg); // More dynamic rotation and scale
      color: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l));
      filter: drop-shadow(0 0 8px hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.7))
              drop-shadow(0 0 3px hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.5));
    }

    .trigger-text-ephemeral {
      color: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l));
      // Subtle text glow effect
      text-shadow: 0 0 6px hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.5);
    }
  }

  // --- Active (Pressed) State ---
  &:active {
    transform: scale(0.96); // More pronounced press-in effect for the whole button
    &::before {
      opacity: 0.7;
      animation-duration: 2s; // Even faster shimmer when active
      background-size: 400% 400%; // Make shimmer more dynamic
    }
    .icon-trigger {
      transform: scale(1.05) rotate(15deg); // Icon slightly rebounds or jitters
      filter: drop-shadow(0 0 5px hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.8));
    }
    .trigger-text-ephemeral {
      text-shadow: 0 0 8px hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.6);
    }
  }
}

// Keyframes for subtle background shimmer
@keyframes subtle-shimmer-idle {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
</style>