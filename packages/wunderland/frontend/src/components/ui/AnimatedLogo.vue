// File: frontend/src/components/ui/AnimatedLogo.vue
/**
 * @file AnimatedLogo.vue
 * @description Enhanced animated logo with agent name transitions and reactive state integration
 * Features smooth morphing between agent names with gradient animations based on theme
 * @version 3.0.1 - Applied TypeScript fixes and GSAP import.
 */
<template>
  <div
    :class="logoContainerClasses"
    :style="logoContainerStyles"
    ref="rootEl"
    @click="handleLogoClick"
  >
    <div class="logo-neural-bg" v-if="showNeuralEffect">
      <svg viewBox="0 0 200 200" class="neural-svg">
        <defs>
          <radialGradient id="neural-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" :stop-color="neuralGradientStart" stop-opacity="0.6" />
            <stop offset="100%" :stop-color="neuralGradientEnd" stop-opacity="0" />
          </radialGradient>
          <filter id="neural-blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
          </filter>
        </defs>
        <g class="neural-lines" filter="url(#neural-blur)">
          <path
            v-for="(path, i) in neuralPaths"
            :key="`neural-${i}`"
            :d="path"
            fill="none"
            stroke="url(#neural-gradient)"
            :stroke-width="1 + reactiveStore.neuralActivity * 2"
            :opacity="0.3 + reactiveStore.neuralActivity * 0.5"
            :class="`neural-path neural-path-${i}`"
          />
        </g>
      </svg>
    </div>

    <svg
      class="logo-svg-enhanced"
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      :aria-label="`${currentAgentName} assistant logo`"
    >
      <defs>
        <radialGradient id="logo-core-gradient-dynamic" cx="50%" cy="50%" r="50%">
          <stop offset="0%" :stop-color="gradientColors.start" :stop-opacity="0.9" />
          <stop offset="50%" :stop-color="gradientColors.mid" :stop-opacity="0.7" />
          <stop offset="100%" :stop-color="gradientColors.end" :stop-opacity="0.5" />
        </radialGradient>

        <filter id="logo-glow-enhanced" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur :stdDeviation="3 + reactiveStore.glowIntensity * 5" result="coloredBlur" />
          <feFlood :flood-color="glowColor" :flood-opacity="reactiveStore.glowIntensity" />
          <feComposite in2="coloredBlur" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <radialGradient id="ripple-gradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" :stop-color="rippleColor" stop-opacity="0" />
          <stop offset="70%" :stop-color="rippleColor" :stop-opacity="0.4" />
          <stop offset="100%" :stop-color="rippleColor" stop-opacity="0" />
        </radialGradient>
      </defs>

      <g v-if="reactiveStore.rippleActive" class="ripple-group">
        <circle
          v-for="i in 3"
          :key="`ripple-${i}`"
          cx="60" cy="60"
          :r="30 + i * 15"
          fill="none"
          stroke="url(#ripple-gradient)"
          :stroke-width="2 - i * 0.5"
          :class="`ripple ripple-${i}`"
          :style="`animation-delay: ${i * 0.2}s`"
        />
      </g>

      <g class="orbit-group" :style="`transform: rotate(${orbitRotation}deg)`">
        <circle
          v-for="(orbit, i) in orbits"
          :key="`orbit-${i}`"
          :cx="60 + orbit.radius * Math.cos(orbit.angle)"
          :cy="60 + orbit.radius * Math.sin(orbit.angle)"
          :r="orbit.size"
          :fill="orbit.color"
          :opacity="orbit.opacity"
          class="orbit-dot"
        />
      </g>

      <circle
        class="logo-core-enhanced"
        cx="60" cy="60"
        :r="coreRadius"
        fill="url(#logo-core-gradient-dynamic)"
        filter="url(#logo-glow-enhanced)"
      />

      <circle
        v-if="showPulseRing"
        class="pulse-ring"
        cx="60" cy="60"
        :r="coreRadius - 5"
        fill="none"
        :stroke="pulseRingColor"
        :stroke-width="2"
        :opacity="0.5 + reactiveStore.pulseIntensity * 0.5"
      />

      <path
        v-if="showWaveform"
        class="logo-waveform"
        :d="waveformPath"
        fill="none"
        :stroke="waveformColor"
        :stroke-width="1.5"
        :opacity="0.7 + reactiveStore.intensity * 0.3"
      />
    </svg>

    <div class="agent-name-container" ref="agentNameContainer">
      <transition
        name="agent-name-transition"
        @before-enter="beforeEnterName"
        @enter="enterName"
        @leave="leaveName"
      >
        <div
          v-if="currentAgentName"
          :key="currentAgentName"
          class="agent-name"
          :style="agentNameStyles"
        >
          <span
            v-for="(char, index) in currentAgentNameChars"
            :key="`${currentAgentName}-${index}`"
            class="agent-name-char"
            :style="getCharStyle(index)"
            :data-char="char"
          >
            {{ char }}
          </span>
        </div>
      </transition>

      <div v-if="showSubtitle" class="agent-subtitle">
        <span class="subtitle-text">{{ subtitle }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, type PropType } from 'vue';
import { useReactiveStore } from '@/store/reactive.store';
import { useUiStore } from '@/store/ui.store';
import { useAgentStore } from '@/store/agent.store';
import gsap from 'gsap'; // Assuming GSAP is installed

const props = defineProps({
  appNameMain: {
    type: String as PropType<string>,
    default: 'VCA',
  },
  showSubtitle: {
    type: Boolean as PropType<boolean>,
    default: true,
  },
  subtitle: {
    type: String as PropType<string>,
    default: 'Voice Assistant',
  },
  isMobileContext: {
    type: Boolean as PropType<boolean>,
    default: false,
  },
  animateOnMount: {
    type: Boolean as PropType<boolean>,
    default: true,
  },
  interactive: {
    type: Boolean as PropType<boolean>,
    default: true,
  }
});

const emit = defineEmits<{
  (e: 'click'): void;
  (e: 'agent-change', agentName: string): void;
}>();

const reactiveStore = useReactiveStore();
const uiStore = useUiStore();
const agentStore = useAgentStore();

const agentNameContainer = ref<HTMLElement>();
const orbitRotation = ref(0);
const waveformPhase = ref(0);
const coreRadius = ref(35);

// Agent name management
const currentAgentName = computed(() =>
  agentStore.activeAgent?.label || props.appNameMain
);

const currentAgentNameChars = computed(() =>
  currentAgentName.value.split('')
);

const previousAgentName = ref(currentAgentName.value);

// Logo container classes
const logoContainerClasses = computed(() => ({
  'animated-logo-container-enhanced': true,
  'is-mobile': props.isMobileContext,
  'is-interactive': props.interactive,
  // Accessing  for reactive properties from Pinia store
  'is-transitioning': reactiveStore.isTransitioning,
  [`state-${reactiveStore.appState}`]: true,
  [`mood-${reactiveStore.moodState}`]: true,
}));

// Dynamic styles based on reactive state
const logoContainerStyles = computed(() => ({
  // reactiveStore.cssVariables is a ComputedRef,  gives the object
  ...reactiveStore.cssVariables,
  '--logo-warmth': reactiveStore.warmth,
}));

// Gradient colors for neural effect
const neuralGradientStart = computed(() => 
  reactiveStore.cssVariables['--reactive-neural-color'] || 'rgba(100, 100, 255, 0.5)' // Fallback
);
const neuralGradientEnd = computed(() => 
  reactiveStore.cssVariables['--reactive-neural-color'] || 'rgba(100, 100, 255, 0.5)' // Fallback, opacity is handled by stop-opacity
);


// Gradient colors based on theme and state
const gradientColors = computed(() => {
  // Corrected: Removed unused 'theme' variable. uiStore.theme would be the way to get it if needed.
  const warmth = reactiveStore.warmth;
  const shift = reactiveStore.gradientShift;

  // CSS variables like --color-accent-primary-h are assumed to be globally available from the theme system
  return {
    start: `hsl(calc(var(--color-accent-primary-h) + ${shift * 30}),
                  calc(var(--color-accent-primary-s) * ${1 + warmth * 0.2}),
                  calc(var(--color-accent-primary-l) * ${0.9 + warmth * 0.3}))`,
    mid: `hsl(calc(var(--color-accent-secondary-h) + ${shift * 15}),
                 var(--color-accent-secondary-s),
                 var(--color-accent-secondary-l))`,
    end: `hsl(calc(var(--color-accent-glow-h) - ${shift * 20}),
                 var(--color-accent-glow-s),
                 calc(var(--color-accent-glow-l) * ${0.8 + warmth * 0.2}))`
  };
});

const glowColor = computed(() =>
  `hsl(var(--color-accent-glow-h), var(--color-accent-glow-s), var(--color-accent-glow-l))`
);

const rippleColor = computed(() =>
  `hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l))`
);

const pulseRingColor = computed(() =>
  gradientColors.value.mid
);

const waveformColor = computed(() =>
  gradientColors.value.start
);

// Visual features based on state
const showNeuralEffect = computed(() =>
  uiStore.effectiveNeuralActivity > 0.3 && !uiStore.isReducedMotionPreferred
);

const showPulseRing = computed(() =>
  reactiveStore.pulseIntensity > 0.4 && !uiStore.isReducedMotionPreferred // Added .value
);

const showWaveform = computed(() =>
  ['listening', 'transcribing', 'speaking'].includes(reactiveStore.appState) &&
  !uiStore.isReducedMotionPreferred // Added .value
);

// Neural paths for background effect
const neuralPaths = computed(() => {
  const paths = [];
  const centerX = 100;
  const centerY = 100;
  const nodeCount = 6;

  for (let i = 0; i < nodeCount; i++) {
    const angle = (i / nodeCount) * Math.PI * 2;
    const radius = 40 + Math.sin(waveformPhase.value + i) * 20;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    for (let j = i + 1; j < nodeCount; j++) {
      const angle2 = (j / nodeCount) * Math.PI * 2;
      const radius2 = 40 + Math.sin(waveformPhase.value + j) * 20;
      const x2 = centerX + Math.cos(angle2) * radius2;
      const y2 = centerY + Math.sin(angle2) * radius2;

      paths.push(`M${x},${y} Q${centerX},${centerY} ${x2},${y2}`);
    }
  }
  return paths;
});

// Orbiting elements
const orbits = computed(() => {
  const orbitData = [];
  const count = 5;
  const baseRadius = 45;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + orbitRotation.value * 0.017;
    const radiusVariation = Math.sin(waveformPhase.value * 2 + i) * 5;

    orbitData.push({
      angle,
      radius: baseRadius + radiusVariation,
      size: 2 + reactiveStore.particleActivity * 3,
      color: i % 2 === 0 ? gradientColors.value.start : gradientColors.value.end,
      opacity: 0.3 + reactiveStore.particleActivity * 0.5
    });
  }
  return orbitData;
});

// Waveform path
const waveformPath = computed(() => {
  const centerX = 60;
  const centerY = 60;
  const radius = coreRadius.value + 10; // coreRadius is a ref, so .value
  const points = 60;
  let path = '';

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const waveAmp = Math.sin(waveformPhase.value + angle * 3) * 5 * reactiveStore.intensity;
    const r = radius + waveAmp;
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;

    if (i === 0) {
      path = `M${x},${y}`;
    } else {
      path += ` L${x},${y}`;
    }
  }
  return path + ' Z';
});

// Agent name styles
const agentNameStyles = computed(() => ({
  '--name-gradient-start': gradientColors.value.start,
  '--name-gradient-end': gradientColors.value.end,
  '--text-glow-color': glowColor.value,
  '--text-glow-intensity': reactiveStore.glowIntensity,
}));

// Character animation styles
const getCharStyle = (index: number) => {
  const stagger = index * 30; // ms
  const duration = 600 + index * 50;

  return {
    '--char-index': index,
    '--char-delay': `${stagger}ms`,
    '--char-duration': `${duration}ms`,
  };
};

// Animation lifecycle hooks
const beforeEnterName = (el: Element) => {
  const chars = el.querySelectorAll('.agent-name-char');
  gsap.set(chars, {
    opacity: 0,
    y: 20,
    rotationX: -90,
    transformOrigin: '50% 50%',
  });
};

const enterName = (el: Element, done: () => void) => {
  const chars = el.querySelectorAll('.agent-name-char');

  gsap.to(chars, {
    opacity: 1,
    y: 0,
    rotationX: 0,
    duration: 0.8,
    stagger: 0.03,
    ease: 'back.out(1.7)',
    onComplete: done,
  });

  reactiveStore.triggerPulse(0.8, 800);
};

const leaveName = (el: Element, done: () => void) => {
  const chars = el.querySelectorAll('.agent-name-char');

  gsap.to(chars, {
    opacity: 0,
    y: -20,
    rotationX: 90,
    duration: 0.5,
    stagger: 0.02,
    ease: 'power2.in',
    onComplete: done,
  });
};

// Handle logo click
const handleLogoClick = () => {
  if (props.interactive) {
    reactiveStore.triggerRipple({ duration: 1200, intensity: 0.8 });
    emit('click');
  }
};

// Animation loop
let animationFrameId: number | null = null;
let lastTick = performance.now();
const targetFps = 45;
const minDeltaMs = 1000 / targetFps;
const isComponentVisible = ref(true);
const rootEl = ref<HTMLElement | null>(null);
let visibilityHandler: (() => void) | null = null;
let intersectionObserver: IntersectionObserver | null = null;

const animate = (timestamp?: number) => {
  if (uiStore.isReducedMotionPreferred || !isComponentVisible.value) return;

  const now = timestamp ?? performance.now();
  const deltaMs = now - lastTick;
  if (deltaMs < minDeltaMs) {
    animationFrameId = requestAnimationFrame(animate);
    return;
  }
  lastTick = now;

  const delta = deltaMs / 16.6667; // normalize vs ~60fps frame

  orbitRotation.value += reactiveStore.gradientSpeed * 2 * delta;
  if (orbitRotation.value > 360) orbitRotation.value -= 360;

  waveformPhase.value += 0.05 * reactiveStore.intensity * delta;

  const pulseMagnitude = 2 * reactiveStore.pulseIntensity;
  coreRadius.value = 35 + Math.sin(waveformPhase.value * 2) * pulseMagnitude;

  animationFrameId = requestAnimationFrame(animate);
};

const startAnimationIfNeeded = () => {
  if (animationFrameId != null) return;
  if (uiStore.isReducedMotionPreferred || !isComponentVisible.value) return;
  lastTick = performance.now();
  animationFrameId = requestAnimationFrame(animate);
};

const stopAnimation = () => {
  if (animationFrameId != null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
};

// Watch for agent changes
watch(currentAgentName, (newName, oldName) => {
  if (newName !== oldName) {
    previousAgentName.value = oldName;
    emit('agent-change', newName);

    reactiveStore.triggerGlowBurst(0.9, 600);
    reactiveStore.setMoodState('curious');

    // GSAP tweening a store's ref value.
    // Target the reactive store, and GSAP's Vue plugin will animate the  of the ref.
    const currentShift = reactiveStore.gradientShift;
    gsap.to(reactiveStore, {
      gradientShift: currentShift + 0.3, // Target value for gradientShift.value
      duration: 1,
      ease: 'power2.inOut',
      onComplete: () => {
        gsap.to(reactiveStore, {
          gradientShift: currentShift, // Return to original or the new base value
          duration: 0.8,
          ease: 'power2.out',
        });
      }
    });
  }
});

// Mount animation
onMounted(() => {
  if (props.animateOnMount) {
    gsap.from('.logo-core-enhanced', {
      scale: 0,
      duration: 1.2,
      ease: 'elastic.out(1, 0.5)',
      delay: 0.2,
    });

    gsap.from('.orbit-dot', {
      scale: 0,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: 'back.out(1.7)',
      delay: 0.5,
    });
  }

  // Visibility and intersection handling to pause work offscreen
  if (typeof document !== 'undefined') {
    visibilityHandler = () => {
      const hidden = document.visibilityState === 'hidden';
      isComponentVisible.value = !hidden && isComponentVisible.value;
      if (hidden) {
        stopAnimation();
      } else {
        startAnimationIfNeeded();
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
  }

  if (typeof IntersectionObserver !== 'undefined' && rootEl.value) {
    intersectionObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];
      isComponentVisible.value = entry?.isIntersecting ?? true;
      if (isComponentVisible.value) {
        startAnimationIfNeeded();
      } else {
        stopAnimation();
      }
    }, { root: null, threshold: 0.05 });
    intersectionObserver.observe(rootEl.value);
  }

  startAnimationIfNeeded();
});

onUnmounted(() => {
  stopAnimation();
  if (intersectionObserver && rootEl.value) {
    intersectionObserver.unobserve(rootEl.value);
  }
  intersectionObserver?.disconnect();
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
  }
});

// React to motion preference changes
watch(() => uiStore.isReducedMotionPreferred, (reduced) => {
  if (reduced) {
    stopAnimation();
  } else {
    startAnimationIfNeeded();
  }
});
</script>

<style lang="scss" scoped>
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;

.animated-logo-container-enhanced {
  display: flex;
  align-items: center;
  gap: var.$spacing-sm;
  position: relative;
  min-width: 0;
  cursor: default;
  user-select: none;
  contain: layout paint style; // isolate for performance

  &.is-interactive {
    cursor: pointer;

    &:hover {
      .logo-core-enhanced {
        transform: scale(1.05);
      }

      .agent-name {
        // Access CSS var from computed style
        text-shadow: 0 0 20px var(--text-glow-color);
      }
    }
  }

  &.is-mobile {
    gap: var.$spacing-xs;

    .logo-svg-enhanced {
      width: calc(var.$header-height-mobile * 0.7);
      height: calc(var.$header-height-mobile * 0.7);
    }

    .agent-name {
      font-size: var.$font-size-lg;
    }
  }
}

.logo-neural-bg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200%;
  height: 200%;
  pointer-events: none;
  opacity: 0.7;

  .neural-svg {
    width: 100%;
    height: 100%;
  }

  .neural-path {
    @for $i from 0 through 20 {
      &-#{$i} {
        animation: neural-pulse-#{$i} #{3 + $i * 0.5}s ease-in-out infinite;
        animation-delay: #{$i * 0.1}s;
      }
    }
  }
}

.logo-svg-enhanced {
  width: calc(var.$header-height-desktop * 0.65);
  height: calc(var.$header-height-desktop * 0.65);
  filter: drop-shadow(0 2px 8px hsla(var(--shadow-color-h), var(--shadow-color-s), var(--shadow-color-l), 0.2));
  transition: transform var.$duration-smooth var.$ease-elastic;
  position: relative;
  z-index: 2;

  @media (min-width: var.$breakpoint-md) {
    width: calc(var.$header-height-desktop * 0.7);
    height: calc(var.$header-height-desktop * 0.7);
  }
}

.logo-core-enhanced {
  transform-origin: center;
  transition: r var.$duration-smooth var.$ease-elastic;
  will-change: r, filter;
}

.orbit-group {
  transform-origin: 60px 60px;
  will-change: transform;
}

.orbit-dot {
  transition: all var.$duration-smooth ease-out;

  &:hover {
    r: 4;
  }
}

.ripple-group {
  pointer-events: none;

  .ripple {
    animation: ripple-expand 2s ease-out forwards;
    transform-origin: center;

    @for $i from 1 through 3 {
      &-#{$i} {
        animation-delay: #{$i * 0.2}s;
      }
    }
  }
}

.pulse-ring {
  animation: pulse-ring-glow 2s ease-in-out infinite;
  transform-origin: center;
}

.logo-waveform {
  transform-origin: center;
  will-change: d;
}

.agent-name-container {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  position: relative;
  z-index: 2;
}

.agent-name {
  font-family: var.$font-family-display;
  font-weight: 700;
  font-size: var.$font-size-xl;
  letter-spacing: 0.02em;
  background: linear-gradient(
    135deg,
    var(--name-gradient-start) 0%,
    var(--name-gradient-end) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  // Access CSS var for glow intensity
  text-shadow: 0 0 calc(10px * var(--text-glow-intensity)) var(--text-glow-color);
  transition: text-shadow var.$duration-quick ease-out;

  @media (min-width: var.$breakpoint-md) {
    font-size: var.$font-size-2xl;
  }
}

.agent-name-char {
  display: inline-block;
  will-change: transform, opacity;
  backface-visibility: hidden;

  &[data-char=" "] {
    width: 0.3em;
  }
}

.agent-subtitle {
  margin-top: var.$spacing-xs;
  opacity: 0.8;

  .subtitle-text {
    font-family: var.$font-family-sans;
    font-weight: 500;
    font-size: var.$font-size-xs;
    color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));
    letter-spacing: 0.05em;
  }
}

.agent-name-transition-enter-active,
.agent-name-transition-leave-active {
  transition: none; // GSAP handles animations
}

.state-listening {
  .logo-core-enhanced {
    animation: core-breathe 2s ease-in-out infinite;
  }
}

.state-thinking {
  .orbit-group {
    animation: orbit-accelerate 1s ease-in-out infinite;
  }
}

.state-responding {
  .logo-svg-enhanced {
    animation: subtle-float 3s ease-in-out infinite;
  }
}

.mood-excited {
  .orbit-dot {
    animation: orbit-dot-pulse 0.5s ease-out infinite alternate;
  }
}

.mood-contemplative {
  .neural-path {
    animation-duration: 6s !important;
  }
}

@keyframes ripple-expand {
  from {
    transform: scale(0.5);
    opacity: 0.8;
  }
  to {
    transform: scale(2);
    opacity: 0;
  }
}

@keyframes pulse-ring-glow {
  0%, 100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

@keyframes core-breathe {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.08);
  }
}

@keyframes orbit-accelerate {
  0%, 100% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(180deg);
  }
}

@keyframes subtle-float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2px);
  }
}

@keyframes orbit-dot-pulse {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.3);
  }
}

@for $i from 0 through 20 {
  @keyframes neural-pulse-#{$i} {
    0%, 100% {
      opacity: 0.1;
      stroke-width: 1;
    }
    50% {
      opacity: 0.6;
      stroke-width: 2;
    }
  }
}
</style>