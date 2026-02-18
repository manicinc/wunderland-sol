// File: frontend/src/components/agents/common/MainContentView.vue
/**
 * @file MainContentView.vue
 * @description A flexible container for the main content display of an active agent.
 * It acts as a styled wrapper for content slotted in by parent views (PublicHome/PrivateHome).
 * @version 2.0.1 - Simplified props, removed mainContentType logic, cleaned up unused imports.
 */
<script setup lang="ts">
import { computed, type PropType } from 'vue';
import type { IAgentDefinition } from '@/services/agent.service';
// Removed unused agentStore and chatStore imports

const props = defineProps({
  /**
   * The definition of the currently active agent.
   * This is crucial for context and potentially for agent-specific styling via classes.
   */
  agent: {
    type: Object as PropType<IAgentDefinition>,
    required: true,
  },
});

/**
 * @computed contentTitleId
 * @description Accessible heading id used by `aria-labelledby` to describe the region.
 */
const contentTitleId = computed(() => `main-content-title-${props.agent.id}`);

/**
 * @computed containerClasses
 * @description Dynamic container classes providing hooks for agent‑specific styling.
 * Parent views now determine the actual content type and pass it via the slot.
 */
const containerClasses = computed(() => [
  'main-content-view-ephemeral', // Renamed for consistency
  'flex-grow',
  'flex',
  'flex-col',
  'relative', // For potential overlays or absolutely positioned elements within
  // The overflow-y-auto will now typically be on the slotted content itself,
  // or on a direct child wrapper of the slot if MainContentView needs to enforce scrolling.
  // For now, assuming slotted content manages its own scroll.
  // 'overflow-y-auto', // Removed, let slotted content manage its scroll
  `agent-theme-${props.agent.id}`, // For agent-specific theming if needed
  // `content-type-${props.agent.mainContentType ?? 'default'}`, // Removed, mainContentType is not on IAgentDefinition
]);
</script>

<template>
  <div
    :class="containerClasses"
    role="main"
    :aria-labelledby="contentTitleId"
  >
    <h2 :id="contentTitleId" class="sr-only">{{ agent.label }} Main Content Area</h2>

    <!-- Main content slot: Parent views (PublicHome, PrivateHome) will provide the actual
         content here, which could be a dynamic component, CompactMessageRenderer,
         or a simple div with v-html for markdown.
    -->
    <slot>
      <div class="flex-grow flex items-center justify-center p-6 text-center text-[var(--color-text-muted)] italic text-sm">
        Loading {{ agent.label }} interface or content...
      </div>
    </slot>
  </div>
</template>

<style lang="scss">
// Styles are in frontend/src/styles/components/agents/_main-content-view.scss (or similar)
// The emptyRules error for this file means the <style> block was empty.
// Removed the empty <style lang="postcss" scoped> block.
// If specific SCSS styles are needed for MainContentView.vue, they should go into a dedicated SCSS partial.
// For example, frontend/src/styles/components/agents/_main-content-view.scss

// .main-content-view-ephemeral {
//   // Styles for the main wrapper if needed, e.g., default background, padding if not handled by slot
//   // For example, a subtle background to differentiate from the overall page background
//   background-color: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.1);
//   border-radius: var.$radius-lg; // If it should look like a distinct panel
//   // padding: var.$spacing-md; // Default padding if slotted content doesn't have its own
// }
</style>