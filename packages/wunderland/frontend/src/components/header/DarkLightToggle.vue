<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '@/store/ui.store';

const ui = useUiStore();
const isDark = computed(() => ui.isCurrentThemeDark);

const toggle = () => {
  ui.toggleColorMode();
};
</script>

<template>
  <button
    class="ctrl-btn organic-toggle"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    :title="isDark ? 'Light mode' : 'Dark mode'"
    @click="toggle"
  >
    <!-- Organic animated SVG: morphing aura with sun/moon core -->
    <svg class="organic-icon" viewBox="0 0 48 48" role="img" aria-hidden="true">
      <!-- Aura -->
      <defs>
        <radialGradient id="aura" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  :stop-color="isDark ? 'rgba(180,220,255,0.45)' : 'rgba(255,170,210,0.35)'" />
          <stop offset="60%" :stop-color="isDark ? 'rgba(120,180,255,0.15)' : 'rgba(255,200,230,0.12)'" />
          <stop offset="100%" :stop-color="isDark ? 'rgba(20,40,80,0.0)' : 'rgba(255,255,255,0.0)'" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#aura)">
        <animate attributeName="r" dur="3s" values="21;23;21" repeatCount="indefinite" />
      </circle>
      <!-- Core: moon mask over sun to create crescent -->
      <g class="core">
        <circle :fill="isDark ? 'hsl(200,80%,65%)' : 'hsl(45,95%,60%)'" cx="24" cy="24" r="8">
          <animate attributeName="r" dur="2.8s" values="7.6;8;7.6" repeatCount="indefinite" />
        </circle>
        <circle v-if="!isDark" fill="rgba(255,255,255,0.35)" cx="24" cy="24" r="10">
          <animate attributeName="r" dur="2.8s" values="9.5;10;9.5" repeatCount="indefinite" />
        </circle>
        <g v-if="isDark">
          <circle fill="hsl(220,30%,12%)" cx="28" cy="20" r="8" />
        </g>
      </g>
      <!-- Orbits -->
      <g stroke="currentColor" :opacity="isDark ? 0.4 : 0.35" fill="none" stroke-width="0.7">
        <path d="M10,24a14,14 0 1,0 28,0a14,14 0 1,0 -28,0">
          <animate attributeName="stroke-opacity" dur="4s" values="0.2;0.5;0.2" repeatCount="indefinite" />
        </path>
        <path d="M16,24a8,8 0 1,0 16,0a8,8 0 1,0 -16,0" />
      </g>
    </svg>
  </button>
</template>

<style scoped>
.organic-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.45rem;
  border-radius: var(--radius-lg, 0.5rem);
  transition: background-color var(--duration-smooth, 220ms) var(--ease-out-quad, ease-out);
}
.organic-toggle:hover {
  background: hsla(var(--color-bg-secondary-h, 220), var(--color-bg-secondary-s, 15%), var(--color-bg-secondary-l, 15%), 0.4);
}
.organic-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: hsl(var(--color-accent-interactive-h, 330), var(--color-accent-interactive-s, 85%), var(--color-accent-interactive-l, 60%));
  filter: drop-shadow(0 0 6px hsla(var(--color-accent-glow-h, 330), var(--color-accent-glow-s, 90%), var(--color-accent-glow-l, 70%), 0.35));
  transition: filter var(--duration-smooth, 220ms) var(--ease-out-quad, ease-out);
}
.organic-toggle:hover .organic-icon {
  filter: drop-shadow(0 0 10px hsla(var(--color-accent-glow-h, 330), var(--color-accent-glow-s, 90%), var(--color-accent-glow-l, 70%), 0.55));
}
</style>

