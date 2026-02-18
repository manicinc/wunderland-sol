// File: frontend/src/components/ui/AnimatedLogoIcon.vue
/**
 * @file AnimatedLogoIcon.vue
 * @version 3.0.0
 *
 * @description
 *  Circular SVG “comms-ring” icon used throughout VCA.
 *  Pulselike breathing, orbit traces, sparkles, and
 *  activity states (user-listening / ai-speaking).
 *
 * @props
 *  @prop {boolean} isUserListening          – highlights ripples.
 *  @prop {boolean} isAiSpeakingOrProcessing – speeds orbits / core pulse.
 *  @prop {boolean} isMobileContext          – scales down stroke widths.
 *
 *  *Extracted from the legacy AnimatedLogo* so text can now
 *  live in its own component (AnimatedTextLogo.vue).
 */

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { useUiStore } from '@/store/ui.store';

const props = defineProps({
  isUserListening:          { type: Boolean as PropType<boolean>, default: false },
  isAiSpeakingOrProcessing:  { type: Boolean as PropType<boolean>, default: false },
  isMobileContext:          { type: Boolean as PropType<boolean>, default: false },
});

const ui = useUiStore();

/** dynamic wrapper classes */
const c = computed(() => ({
  'logo-icon-container': true,
  'user-listening'      : props.isUserListening,
  'ai-active'           : props.isAiSpeakingOrProcessing,
  'mobile'              : props.isMobileContext,
  'reduced-motion'      : ui.isReducedMotionPreferred,
}));
</script>

<template>
  <svg viewBox="0 0 100 100" :class="c" aria-hidden="true">
    <defs>
      <filter id="logoIconGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <radialGradient id="logoCoreGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%"  stop-color="hsl(var(--color-accent-primary-h), var(--color-accent-primary-s), calc(var(--color-accent-primary-l) + 10%))"/>
        <stop offset="100%" stop-color="hsl(var(--color-accent-secondary-h), var(--color-accent-secondary-s), var(--color-accent-secondary-l))"/>
      </radialGradient>
    </defs>

    <!-- breath-ring -->
    <g filter="url(#logoIconGlow)">
      <circle class="ring trace-1" cx="50" cy="50" r="45"/>
      <circle class="ring trace-2" cx="50" cy="50" r="40"/>
      <circle class="core" cx="50" cy="50" r="28" fill="url(#logoCoreGrad)"/>
      <!-- stylised waveform -->
      <path class="accent a-1" d="M50 25 Q65 40 60 50 Q65 60 50 75"/>
      <path class="accent a-2" d="M50 25 Q35 40 40 50 Q35 60 50 75"/>
      <!-- sparkles -->
      <circle class="sparkle s-1" cx="30" cy="35" r="3"/>
      <circle class="sparkle s-2" cx="70" cy="65" r="2.5"/>
    </g>
  </svg>
</template>

<style lang="scss" scoped>
@use '@/styles/abstracts/variables' as v;
/* CSS variables for colours come from the theme engine */

.logo-icon-container {
  width: calc(v.$header-height-mobile * 0.65);
  height: calc(v.$header-height-mobile * 0.65);
  @media (min-width: v.$breakpoint-md) {
    width: calc(v.$header-height-desktop * 0.55);
    height: calc(v.$header-height-desktop * 0.55);
  }
  .ring {
    fill:none;
    stroke:hsla(var(--color-border-primary-h),var(--color-border-primary-s),var(--color-border-primary-l),0.22);
    stroke-width:1.5;
    transform-origin:center;
    opacity:.7;
  }
  .trace-1 { animation: orbit 20s linear infinite; }
  .trace-2 { animation: orbit 28s linear infinite reverse; }
  .core    { filter:url(#logoIconGlow); transition:r .35s cubic-bezier(.64,-.58,.34,1.56); }
  .accent  { stroke: hsl(var(--color-accent-secondary-h),var(--color-accent-secondary-s),var(--color-accent-secondary-l));
             stroke-width:3; fill:none; opacity:0; transition:opacity .15s; }
  .sparkle { fill:hsl(var(--color-accent-glow-h),var(--color-accent-glow-s),var(--color-accent-glow-l));
             animation: sparkle 3s ease-in-out infinite alternate; opacity:0; }
  .s-2 { animation-delay:.5s; }

  &.user-listening {
    .core { r:30; }
    .accent, .sparkle { opacity:.9; }
  }
  &.ai-active {
    .core { r:32; }
    .trace-1 { animation-duration:8s; }
    .trace-2 { animation-duration:12s; }
    .accent  { opacity:.95; stroke-width:3.5; }
    .sparkle { opacity:1; animation-duration:1.5s; }
  }
  &.reduced-motion {
    .ring, .sparkle { animation:none !important; }
    .accent { opacity:.6; }
    .sparkle{ opacity:.8; }
  }
}

/* keyframes */
@keyframes orbit   { to { transform:rotate(360deg); } }
@keyframes sparkle {
  0%,100% { opacity:.3; transform:scale(.8); }
  50%     { opacity:.9; transform:scale(1.1); }
}
</style>
