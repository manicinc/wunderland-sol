// File: frontend/src/components/header/SiteMenuDropdown.vue
/**
 * @file SiteMenuDropdown.vue
 * @description A dropdown menu component for primary site navigation links (About, App Settings).
 * Features a custom animated "Nexus Orb" SVG icon as its trigger, which is theme-aware
 * and responds to interaction states. Adheres to the "Ephemeral Harmony" design system.
 *
 * @component SiteMenuDropdown
 * @props None
 * @emits None directly. Navigation is handled by Vue Router.
 *
 * @example
 * <SiteMenuDropdown />
 */
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, type Ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
// Icons for navigation items within the panel
import {
  InformationCircleIcon, // For "About VCA"
  Cog8ToothIcon,         // For "App Settings"
} from '@heroicons/vue/24/outline';

const route = useRoute();

/**
 * @ref {Ref<boolean>} isOpen - Reactive ref to control the visibility of the dropdown panel.
 * True if the dropdown is open, false otherwise.
 */
const isOpen: Ref<boolean> = ref(false);

/**
 * @ref {Ref<HTMLElement | null>} dropdownContainerRef - Template ref for the root `div` of the dropdown.
 * This is used to detect clicks outside the dropdown area to close it.
 */
const dropdownContainerRef: Ref<HTMLElement | null> = ref(null);

/**
 * @function toggleDropdown
 * @description Toggles the visibility state (`isOpen`) of the dropdown panel.
 * Activates or deactivates icon animations based on the new state.
 * @returns {void}
 */
const toggleDropdown = (): void => {
  isOpen.value = !isOpen.value;
};

/**
 * @function closeDropdown
 * @description Closes the dropdown panel by setting `isOpen` to false.
 * @returns {void}
 */
const closeDropdown = (): void => {
  isOpen.value = false;
};

/**
 * @function handleClickOutside
 * @description Event handler for 'mousedown' events on the document. If a click occurs
 * outside the `dropdownContainerRef` element, it closes the dropdown.
 * @param {MouseEvent} event - The mousedown event object.
 * @returns {void}
 */
const handleClickOutside = (event: MouseEvent): void => {
  if (dropdownContainerRef.value && !dropdownContainerRef.value.contains(event.target as Node)) {
    closeDropdown();
  }
};

// Lifecycle hooks to add/remove the click-outside listener
onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside, true);
});
onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside, true);
});

/**
 * @computed iconStateClass
 * @description Determines the CSS class for the icon based on the dropdown's open state.
 * This class is used to trigger different animations for the "Nexus Orb" icon.
 * @returns {object} An object with a single key 'active' which is true if the dropdown is open.
 */
const iconStateClass = computed(() => ({
  'active': isOpen.value,
}));

</script>

<template>
  <div class="relative header-control-item site-menu-dropdown-wrapper" ref="dropdownContainerRef">
    <button
      @click="toggleDropdown"
      id="site-menu-trigger-button"
      class="btn btn-ghost-ephemeral btn-icon-ephemeral direct-header-button nexus-orb-trigger"
      aria-haspopup="true"
      :aria-expanded="isOpen"
      aria-controls="site-menu-panel"
      title="Site Menu"
      :class="iconStateClass"
    >
      <svg
        class="nexus-orb-svg"
        viewBox="-70 -70 140 140"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <filter id="nexus-glow-filter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
           <filter id="nexus-satellite-glow-filter" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.5" result="satelliteBlur"/>
            <feMerge>
              <feMergeNode in="satelliteBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <circle class="nexus-orb-center" cx="0" cy="0" r="15" />

        <g class="nexus-orb-satellites">
          <circle class="nexus-orb-satellite satellite-1" r="8" />
          <circle class="nexus-orb-satellite satellite-2" r="8" />
          <circle class="nexus-orb-satellite satellite-3" r="8" />
        </g>

        <path class="nexus-orb-tendril tendril-1" d="M0,0 Q20,-30 40,-50" />
        <path class="nexus-orb-tendril tendril-2" d="M0,0 Q-12,35 -30,55" />
        <path class="nexus-orb-tendril tendril-3" d="M0,0 Q35,20 55,12" />
      </svg>
      <span class="sr-only">Open Site Menu</span>
    </button>

    <Transition name="dropdown-float-enhanced">
      <div
        v-if="isOpen"
        id="site-menu-panel"
        class="dropdown-panel-ephemeral absolute right-0 mt-2 w-64 origin-top-right"
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="site-menu-trigger-button"
      >
        <div class="dropdown-header-ephemeral">
          <h3 class="dropdown-title">Site Navigation</h3>
        </div>
        <div class="dropdown-content-ephemeral p-1" role="none">
          <RouterLink
            :to="`/${$route.params.locale || 'en-US'}/about`"
            class="dropdown-item-ephemeral group"
            role="menuitem"
            @click="closeDropdown"
          >
            <InformationCircleIcon class="dropdown-item-icon" aria-hidden="true" />
            About VCA
          </RouterLink>

          <RouterLink
            :to="`/${$route.params.locale || 'en-US'}/settings`"
            class="dropdown-item-ephemeral group"
            role="menuitem"
            @click="closeDropdown"
          >
            <Cog8ToothIcon class="dropdown-item-icon" aria-hidden="true" />
            App Settings
          </RouterLink>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
/**
 * Scoped SCSS for SiteMenuDropdown.vue.
 * Contains styles for the custom "Nexus Orb" SVG trigger icon and its animations.
 * Relies on shared dropdown styles for the panel and items.
 */
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins; // For potential mixin use

.header-control-item {
  position: relative; // Context for the absolute dropdown panel
}

.nexus-orb-trigger {
  // Optimized button size to fit perfectly within nav
  padding: 1px !important; // Minimal padding to prevent overflow
  width: 48px; // Smaller size for guaranteed fit
  height: 48px;
  min-width: 48px;
  min-height: 48px;
  // Ensure the button fits within nav constraints
  max-width: 48px;
  max-height: 48px;
  // Override any default button styles that might add excessive spacing
  border: none !important;
  border-radius: 4px; // Smaller border radius to fit nav better

  @media (min-width: var.$breakpoint-md) {
    width: 56px; // Smaller desktop size
    height: 56px;
    min-width: 56px;
    min-height: 56px;
    max-width: 56px;
    max-height: 56px;
    padding: 2px !important; // Minimal padding for desktop
    border-radius: 6px;
  }

  .nexus-orb-svg {
    width: 100%; // SVG takes full space of button
    height: 100%;
    overflow: visible; // Allow glows to extend slightly
    transition: transform var.$duration-smooth var.$ease-elastic;

    // Base colors from theme using CSS variables
    --orb-center-fill: hsl(var(--color-text-muted-h), var(--color-text-muted-s), calc(var(--color-text-muted-l) + 10%));
    --orb-satellite-fill: hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l));
    --orb-tendril-stroke: hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0); // Initially transparent
    --orb-center-glow: hsla(var(--color-accent-secondary-h), var(--color-accent-secondary-s), var(--color-accent-secondary-l), 0.3);
    --orb-satellite-glow: hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.2);
  }
}


.nexus-orb-center {
  fill: var(--orb-center-fill);
  filter: url(#nexus-glow-filter);
  animation: nexus-center-pulse 4s var.$ease-in-out-sine infinite alternate;
  transition: fill var.$duration-quick, r var.$duration-smooth var.$ease-elastic;
}

.nexus-orb-satellites {
  // Group for collective transformations if needed (e.g., on open state)
  transition: transform var.$duration-smooth var.$ease-elastic;
}

.nexus-orb-satellite {
  fill: var(--orb-satellite-fill);
  filter: url(#nexus-satellite-glow-filter);
  transform-origin: center;
  // Individual satellite animation for orbiting with larger radius
  &.satellite-1 { animation: nexus-orbit-1 7s linear infinite; }
  &.satellite-2 { animation: nexus-orbit-2 7.5s linear infinite reverse; } // Slightly different timing/direction
  &.satellite-3 { animation: nexus-orbit-3 8s linear infinite; }
  transition: fill var.$duration-quick, r var.$duration-smooth var.$ease-elastic;
}

.nexus-orb-tendril {
  stroke: var(--orb-tendril-stroke);
  stroke-width: 1.5; // Slightly thicker for visibility at larger size
  fill: none;
  stroke-linecap: round;
  opacity: 0;
  transition: opacity var.$duration-smooth, stroke var.$duration-quick,
              stroke-dasharray var.$duration-smooth var.$ease-out-quad,
              stroke-dashoffset var.$duration-smooth var.$ease-out-quad;
}

// --- Hover and Focus States for the Trigger Button ---
.nexus-orb-trigger:hover,
.nexus-orb-trigger:focus-visible {
  .nexus-orb-svg {
    // Change SVG element colors using updated CSS variable values
    --orb-center-fill: hsl(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l));
    --orb-satellite-fill: hsl(var(--color-accent-secondary-h), var(--color-accent-secondary-s), var(--color-accent-secondary-l));
    --orb-tendril-stroke: hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.8);
    --orb-center-glow: hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.6);
    --orb-satellite-glow: hsla(var(--color-accent-secondary-h), var(--color-accent-secondary-s), var(--color-accent-secondary-l), 0.4);
  }

  .nexus-orb-center {
    animation-play-state: paused; // Pause idle pulse to replace with hover glow
  }
  .nexus-orb-satellite {
    animation-play-state: running; // Ensure orbit continues
  }
  .nexus-orb-tendril {
    opacity: 1;
  }
}

// --- Active/Open State (Dropdown is visible) ---
.nexus-orb-trigger.active { // When isOpen is true
  .nexus-orb-svg {
    --orb-center-fill: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l));
    --orb-satellite-fill: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), calc(var(--color-accent-interactive-l) + 10%));
    --orb-tendril-stroke: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.9);
    --orb-center-glow: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.7);
  }
  .nexus-orb-center {
    r: 13; // Slightly smaller when active
    animation: none; // Stop idle pulse
  }
  .nexus-orb-satellites {
    transform: scale(1.1); // Satellites expand slightly
  }
  .nexus-orb-satellite {
    animation-play-state: paused; // Pause orbiting
  }
  .nexus-orb-tendril {
    opacity: 1;
  }
}

// --- Keyframe Animations for the Nexus Orb ---
@keyframes nexus-center-pulse {
  0%, 100% {
    r: 14;
    filter: drop-shadow(0 0 4px var(--orb-center-glow));
  }
  50% {
    r: 16;
    filter: drop-shadow(0 0 10px var(--orb-center-glow));
  }
}

// Define orbital paths using transforms with larger radius for bigger orb
@keyframes nexus-orbit-1 {
  0% { transform: rotate(0deg) translateX(40px) rotate(0deg) translateY(0px); }
  100% { transform: rotate(360deg) translateX(40px) rotate(-360deg) translateY(0px); }
}
@keyframes nexus-orbit-2 {
  0% { transform: rotate(120deg) translateX(43px) rotate(-120deg) translateY(0px); }
  100% { transform: rotate(480deg) translateX(43px) rotate(-480deg) translateY(0px); }
}
@keyframes nexus-orbit-3 {
  0% { transform: rotate(240deg) translateX(37px) rotate(-240deg) translateY(0px); }
  100% { transform: rotate(600deg) translateX(37px) rotate(-600deg) translateY(0px); }
}
</style>