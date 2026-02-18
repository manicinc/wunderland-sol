// File: frontend/src/components/ui/HearingIndicator.vue
/**
 * @file HearingIndicator.vue
 * @description State-aware hearing indicator with distinct visual modes for each app state
 * Features geometric patterns, wave effects, and neural-inspired animations
 * @version 1.0.2 - Corrected Pinia store reactive property access in script setup.
 */
<template>
  <div
    class="hearing-indicator-container"
    :class="containerClasses"
    :style="containerStyles"
    @click="handleClick"
  >
    <svg
      class="hearing-svg"
      :viewBox="viewBox"
      xmlns="http://www.w3.org/2000/svg"
      :aria-label="ariaLabel"
    >
      <defs>
        <linearGradient id="hearing-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" :stop-color="gradientStart" :stop-opacity="0.9" />
          <stop offset="100%" :stop-color="gradientEnd" :stop-opacity="0.7" />
        </linearGradient>

        <radialGradient id="hearing-glow-gradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" :stop-color="glowColor" :stop-opacity="glowOpacity" />
          <stop offset="100%" :stop-color="glowColor" stop-opacity="0" />
        </radialGradient>

        <filter id="hearing-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur :stdDeviation="glowRadius" result="coloredBlur" />
          <feFlood :flood-color="glowColor" :flood-opacity="glowOpacity * 0.5" />
          <feComposite in2="coloredBlur" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="hearing-blur">
          <feGaussianBlur :stdDeviation="blurAmount" />
        </filter>

        <pattern id="hearing-dots" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.5" :fill="patternColor" :opacity="0.3" />
        </pattern>
      </defs>

      <circle
        v-if="showBackgroundCircle"
        class="hearing-bg-circle"
        :cx="centerX"
        :cy="centerY"
        :r="bgRadius"
        fill="url(#hearing-glow-gradient)"
        :opacity="0.1 + reactiveStore.intensity * 0.2"
      />

      <g class="state-visualization">
        <g v-if="appState === 'idle'" class="idle-visual">
          <path
            class="ear-icon"
            :d="earPath"
            fill="url(#hearing-gradient)"
            :opacity="0.7 + reactiveStore.intensity * 0.3"
            filter="url(#hearing-glow)"
          />
        </g>

        <g v-else-if="appState === 'listening'" class="listening-visual">
          <circle
            v-for="i in 4"
            :key="`listen-${i}`"
            :cx="centerX"
            :cy="centerY"
            :r="10 + i * 8"
            fill="none"
            :stroke="gradientStart"
            :stroke-width="2 - i * 0.3"
            :opacity="0.8 - i * 0.2"
            :class="`listen-ring listen-ring-${i}`"
          />
          <circle
            class="listen-core"
            :cx="centerX"
            :cy="centerY"
            r="8"
            fill="url(#hearing-gradient)"
            filter="url(#hearing-glow)"
          />
        </g>

        <g v-else-if="appState === 'transcribing'" class="transcribing-visual">
          <path
            v-for="(wave, i) in waveforms"
            :key="`wave-${i}`"
            :d="wave"
            fill="none"
            :stroke="i === 1 ? gradientEnd : gradientStart"
            :stroke-width="2"
            :opacity="0.6 + i * 0.2"
            :class="`transcribe-wave transcribe-wave-${i}`"
            filter="url(#hearing-blur)"
          />
          <circle
            class="transcribe-dot"
            :cx="centerX"
            :cy="centerY"
            r="4"
            fill="url(#hearing-gradient)"
          />
        </g>

        <g v-else-if="appState === 'thinking'" class="thinking-visual">
          <g class="neural-nodes">
            <circle
              v-for="(node, i) in neuralNodes"
              :key="`node-${i}`"
              :cx="node.x"
              :cy="node.y"
              :r="node.r"
              :fill="node.active ? gradientStart : patternColor"
              :opacity="node.opacity"
              class="neural-node"
            />
          </g>
          <g class="neural-connections">
            <line
              v-for="(conn, i) in neuralConnections"
              :key="`conn-${i}`"
              :x1="conn.x1"
              :y1="conn.y1"
              :x2="conn.x2"
              :y2="conn.y2"
              :stroke="conn.active ? gradientEnd : patternColor"
              :stroke-width="conn.width"
              :opacity="conn.opacity"
              class="neural-connection"
            />
          </g>
        </g>

        <g v-else-if="appState === 'responding'" class="responding-visual">
          <g class="radiate-lines">
            <path
              v-for="(ray, i) in radiateRays"
              :key="`ray-${i}`"
              :d="ray.path"
              fill="none"
              :stroke="i % 2 === 0 ? gradientStart : gradientEnd"
              :stroke-width="ray.width"
              :opacity="ray.opacity"
              :class="`radiate-ray radiate-ray-${i}`"
              filter="url(#hearing-blur)"
            />
          </g>
          <circle
            class="radiate-core"
            :cx="centerX"
            :cy="centerY"
            r="10"
            fill="url(#hearing-gradient)"
            filter="url(#hearing-glow)"
          />
        </g>

        <g v-else-if="appState === 'speaking'" class="speaking-visual">
          <path
            v-for="(arc, i) in soundArcs"
            :key="`arc-${i}`"
            :d="arc"
            fill="none"
            :stroke="gradientStart"
            :stroke-width="2.5"
            :opacity="0.8 - i * 0.15"
            :class="`sound-arc sound-arc-${i}`"
            stroke-linecap="round"
          />
          <circle
            class="sound-source"
            :cx="centerX - 15"
            :cy="centerY"
            r="6"
            fill="url(#hearing-gradient)"
            filter="url(#hearing-glow)"
          />
        </g>

        <g v-else-if="appState === 'vad-wake'" class="vad-wake-visual">
          <circle
            class="vad-outer"
            :cx="centerX"
            :cy="centerY"
            :r="vadRadius" fill="none"
            :stroke="patternColor"
            stroke-width="2"
            stroke-dasharray="5 5"
            :opacity="0.5"
          />
          <circle
            class="vad-inner"
            :cx="centerX"
            :cy="centerY"
            r="8"
            fill="url(#hearing-gradient)"
            :opacity="0.6"
          />
        </g>

        <g v-else-if="appState === 'vad-active'" class="vad-active-visual">
          <circle
            v-for="i in 3"
            :key="`vad-${i}`"
            :cx="centerX"
            :cy="centerY"
            :r="12 + i * 6"
            fill="none"
            :stroke="gradientStart"
            :stroke-width="2"
            :stroke-dasharray="'10 2'"
            :opacity="0.7 - i * 0.15"
            :class="`vad-ring vad-ring-${i}`"
          />
          <circle
            class="vad-core"
            :cx="centerX"
            :cy="centerY"
            r="8"
            fill="url(#hearing-gradient)"
            filter="url(#hearing-glow)"
          />
        </g>

        <g v-else-if="appState === 'error'" class="error-visual">
          <path
            class="error-triangle"
            :d="errorTrianglePath"
            fill="none"
            :stroke="errorColor"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <circle
            class="error-dot"
            :cx="centerX"
            :cy="centerY + 5"
            r="2"
            :fill="errorColor"
          />
        </g>
      </g>

      <g v-if="showRipple" class="ripple-overlay">
        <circle
          v-for="i in rippleCount"
          :key="`ripple-${i}`"
          :cx="centerX"
          :cy="centerY"
          :r="20 + i * 10"
          fill="none"
          :stroke="rippleColor"
          :stroke-width="1"
          :opacity="0"
          :class="`ripple-ring ripple-ring-${i}`"
        />
      </g>

      <g v-if="showParticles" class="particle-effects">
        <circle
          v-for="particle in particles"
          :key="particle.id"
          :cx="particle.x"
          :cy="particle.y"
          :r="particle.r"
          :fill="particle.color"
          :opacity="particle.opacity"
          class="particle"
        />
      </g>
    </svg>

    <div v-if="showLabel" class="state-label">
      {{ stateLabel }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, type PropType } from 'vue';
import { useReactiveStore, type AppState as ReactiveAppState } from '@/store/reactive.store';
import { useUiStore } from '@/store/ui.store';

interface Particle {
  id: number;
  x: number;
  y: number;
  r: number;
  color: string;
  opacity: number;
  vx: number;
  vy: number;
}

interface NeuralNode {
  x: number;
  y: number;
  r: number;
  active: boolean;
  opacity: number;
}

interface NeuralConnection {
  x1: number; y1: number; x2: number; y2: number;
  active: boolean; width: number; opacity: number;
}

interface RadiateRay {
  path: string;
  width: number;
  opacity: number;
}


const props = defineProps({
  size: {
    type: Number as PropType<number>,
    default: 60,
  },
  showLabel: {
    type: Boolean as PropType<boolean>,
    default: false,
  },
  interactive: {
    type: Boolean as PropType<boolean>,
    default: true,
  },
  customState: {
    type: String as PropType<string | null>,
    default: null,
  }
});

const emit = defineEmits<{
  (e: 'click'): void;
  (e: 'state-change', state: ReactiveAppState): void;
}>();

const reactiveStore = useReactiveStore();
const uiStore = useUiStore();

const animationPhase = ref(0);
const vadRadius = ref(20);
const particles = ref<Particle[]>([]);

const appState = computed((): ReactiveAppState => (props.customState || reactiveStore.appState) as ReactiveAppState);
const centerX = computed(() => props.size / 2);
const centerY = computed(() => props.size / 2);
const viewBox = computed(() => `0 0 ${props.size} ${props.size}`);
const bgRadius = computed(() => props.size * 0.45);

const containerClasses = computed(() => ({
  'hearing-indicator-container': true,
  'is-interactive': props.interactive,
  [`state-${appState.value}`]: true,
  'is-animating': !uiStore.isReducedMotionPreferred, // .value is not needed here as it's a computed from store, accessed within another computed
}));

const containerStyles = computed(() => ({
  '--indicator-size': `${props.size}px`,
  '--glow-intensity': reactiveStore.glowIntensity,
  '--pulse-rate': reactiveStore.pulseRate,
  '--animation-phase': animationPhase.value,
  ...Object.fromEntries(
    Object.entries(reactiveStore.cssVariables ?? {}).map(([k, v]) => [k, typeof v === 'object' && 'value' in v ? v : v])
  ),
}));

const gradientStart = computed(() =>
  `hsl(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l))`
);

const gradientEnd = computed(() =>
  `hsl(var(--color-accent-secondary-h), var(--color-accent-secondary-s), var(--color-accent-secondary-l))`
);

const glowColor = computed(() =>
  `hsl(var(--color-accent-glow-h), var(--color-accent-glow-s), var(--color-accent-glow-l))`
);

const patternColor = computed(() =>
  `hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l))`
);

const rippleColor = computed(() =>
  `hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l))`
);

const errorColor = computed(() =>
  `hsl(var(--color-error-h), var(--color-error-s), var(--color-error-l))`
);

const glowOpacity = computed(() => 0.3 + reactiveStore.glowIntensity * 0.5);
const glowRadius = computed(() => 3 + reactiveStore.glowIntensity * 5);
const blurAmount = computed(() => 1 + reactiveStore.intensity * 2);

const showBackgroundCircle = computed(() =>
  ['listening', 'transcribing', 'responding', 'speaking'].includes(appState.value)
);

const showRipple = computed(() =>
  reactiveStore.rippleActive && ['listening', 'responding'].includes(appState.value)
);

const showParticles = computed(() =>
  reactiveStore.particleActivity > 0.3 && !uiStore.isReducedMotionPreferred // isReducedMotionPreferred is already a computed. No .value needed if it's directly from store and simple.
                                                                                // Let's assume uiStore.isReducedMotionPreferred itself is the boolean value or a ref that Vue handles.
                                                                                // Given uiStore.isReducedMotionPreferred is a computed, it's a ref, so .value is needed if used in JS expression.
                                                                                // Correction: !uiStore.isReducedMotionPreferred.value
);
// Re-evaluating showParticles based on ui.store.ts:
// isReducedMotionPreferred = computed(...)
// So in script, it should be uiStore.isReducedMotionPreferred.value
const correctedShowParticles = computed(() =>
  reactiveStore.particleActivity > 0.3 && !uiStore.isReducedMotionPreferred
);


const rippleCount = computed(() =>
  appState.value === 'responding' ? 4 : 3 // Corrected: appState.value
);

const stateLabel = computed(() => {
  const labels: Record<string, string> = {
    idle: 'Ready',
    listening: 'Listening',
    transcribing: 'Transcribing',
    thinking: 'Processing',
    responding: 'Responding',
    speaking: 'Speaking',
    'vad-wake': 'Voice Activated',
    'vad-active': 'Voice Detected',
    error: 'Error',
    connecting: 'Connecting',
  };
  return labels[appState.value] || appState.value;
});

const ariaLabel = computed(() =>
  `Hearing indicator: ${stateLabel.value}`
);

const earPath = computed(() => {
  const cx = centerX.value;
  const cy = centerY.value;
  return `
    M ${cx - 10} ${cy - 5}
    C ${cx - 10} ${cy - 15}, ${cx} ${cy - 20}, ${cx + 8} ${cy - 15}
    C ${cx + 12} ${cy - 12}, ${cx + 12} ${cy + 12}, ${cx + 8} ${cy + 15}
    C ${cx} ${cy + 20}, ${cx - 10} ${cy + 15}, ${cx - 10} ${cy + 5}
    L ${cx - 10} ${cy - 5}
    M ${cx - 5} ${cy - 8}
    C ${cx - 5} ${cy - 10}, ${cx} ${cy - 12}, ${cx + 3} ${cy - 10}
    C ${cx + 5} ${cy - 8}, ${cx + 5} ${cy + 8}, ${cx + 3} ${cy + 10}
    C ${cx} ${cy + 12}, ${cx - 5} ${cy + 10}, ${cx - 5} ${cy + 8}
  `;
});

const errorTrianglePath = computed(() => {
  const cx = centerX.value;
  const cy = centerY.value;
  const s = 15;
  return `
    M ${cx} ${cy - s}
    L ${cx - s} ${cy + s}
    L ${cx + s} ${cy + s}
    Z
  `;
});

const waveforms = computed((): string[] => {
  const wavesArr: string[] = [];
  const amplitude = 10;
  const frequency = 0.2;

  for (let i = 0; i < 3; i++) {
    let path = `M ${centerX.value - 25} ${centerY.value}`;
    for (let x = -25; x <= 25; x += 2) {
      const y = Math.sin((x * frequency) + animationPhase.value + (i * Math.PI / 3)) * amplitude;
      path += ` L ${centerX.value + x} ${centerY.value + y}`;
    }
    wavesArr.push(path);
  }
  return wavesArr;
});

const neuralNodes = computed((): NeuralNode[] => {
  const nodesArr: NeuralNode[] = [];
  const layers = [3, 4, 3];
  const layerSpacing = props.size / (layers.length + 1);

  layers.forEach((count, layerIndex) => {
    const x = layerSpacing * (layerIndex + 1);
    const ySpacing = props.size / (count + 1);

    for (let i = 0; i < count; i++) {
      const y = ySpacing * (i + 1);
      const active = Math.sin(animationPhase.value + layerIndex + i) > 0; // animationPhase.value
      nodesArr.push({
        x, y,
        r: active ? 4 : 3,
        active,
        opacity: active ? (0.7 + reactiveStore.neuralActivity * 0.2) : (0.3 + reactiveStore.neuralActivity * 0.1),
      });
    }
  });
  return nodesArr;
});

const neuralConnections = computed((): NeuralConnection[] => {
  const connectionsArr: NeuralConnection[] = [];
  const currentNodes: NeuralNode[] = neuralNodes.value;

  for (let i = 0; i < currentNodes.length; i++) {
    for (let j = i + 1; j < currentNodes.length; j++) {
      if (Math.abs(currentNodes[i].x - currentNodes[j].x) < (props.size / 3) + 5 && currentNodes[i].x !== currentNodes[j].x) {
        const active = currentNodes[i].active && currentNodes[j].active;
        connectionsArr.push({
          x1: currentNodes[i].x, y1: currentNodes[i].y,
          x2: currentNodes[j].x, y2: currentNodes[j].y,
          active,
          width: active ? (1 + reactiveStore.neuralActivity * 1) : (0.5 + reactiveStore.neuralActivity * 0.5),
          opacity: active ? (0.5 + reactiveStore.neuralActivity * 0.3) : (0.1 + reactiveStore.neuralActivity * 0.2),
        });
      }
    }
  }
  return connectionsArr;
});

const radiateRays = computed((): RadiateRay[] => {
  const raysArr: RadiateRay[] = [];
  const count = 8;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const innerRadius = 15;
    const outerRadius = 30 + Math.sin(animationPhase.value + i + reactiveStore.intensity * 5) * 10; // .value for animationPhase & intensity

    const x1 = centerX.value + Math.cos(angle) * innerRadius; // .value for centerX
    const y1 = centerY.value + Math.sin(angle) * innerRadius; // .value for centerY
    const x2 = centerX.value + Math.cos(angle) * outerRadius;
    const y2 = centerY.value + Math.sin(angle) * outerRadius;

    raysArr.push({
      path: `M ${x1} ${y1} L ${x2} ${y2}`,
      width: 2 + Math.sin(animationPhase.value + i) * 0.5, // .value for animationPhase
      opacity: 0.6 + Math.sin(animationPhase.value + i) * 0.3, // .value for animationPhase
    });
  }
  return raysArr;
});

const soundArcs = computed((): string[] => {
  const arcsArr: string[] = [];
  const count = 4;

  for (let i = 0; i < count; i++) {
    const radius = 10 + i * 8 + reactiveStore.intensity * 5; // .value for intensity
    const startAngle = -Math.PI / 3;
    const endAngle = Math.PI / 3;

    const x1 = centerX.value - 15 + Math.cos(startAngle) * radius; // .value for centerX
    const y1 = centerY.value + Math.sin(startAngle) * radius;     // .value for centerY
    const x2 = centerX.value - 15 + Math.cos(endAngle) * radius;
    const y2 = centerY.value + Math.sin(endAngle) * radius;

    arcsArr.push(`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`);
  }
  return arcsArr;
});

const handleClick = () => {
  if (props.interactive) {
    emit('click');
    reactiveStore.triggerRipple({ duration: 800, intensity: 0.6 });
  }
};

const updateParticles = () => {
  if (!correctedShowParticles.value) { // Use the explicitly corrected computed property
    particles.value = [];
    return;
  }

  if (particles.value.length < 10 && Math.random() < reactiveStore.particleActivity) { // .value for particleActivity
    particles.value.push({
      id: Date.now() + Math.random(),
      x: centerX.value + (Math.random() - 0.5) * props.size * 0.8, // .value for centerX
      y: centerY.value + (Math.random() - 0.5) * props.size * 0.8, // .value for centerY
      r: Math.random() * 2 + 1,
      color: Math.random() > 0.5 ? gradientStart.value : gradientEnd.value, // .value for computed colors
      opacity: 0.8,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
    });
  }

  particles.value = particles.value
    .map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      opacity: p.opacity - 0.01,
    }))
    .filter(p => p.opacity > 0 && p.x > 0 && p.x < props.size && p.y > 0 && p.y < props.size);
};

let animationFrameId: number | null = null;

const animate = () => {
  if (uiStore.isReducedMotionPreferred) { // .value for store computed
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    return;
  }

  animationPhase.value += 0.05 * reactiveStore.intensity; // .value for animationPhase and intensity

  if (appState.value === 'vad-wake' || appState.value === 'vad-active') { // .value for appState
    vadRadius.value = 20 + Math.sin(animationPhase.value * 2) * 3; // .value for vadRadius and animationPhase
  }

  updateParticles();

  animationFrameId = requestAnimationFrame(animate);
};

watch(appState, (newState, oldState) => {
  if (newState !== oldState) {
    emit('state-change', newState);
  }
});

onMounted(() => {
  if (!uiStore.isReducedMotionPreferred) { // .value for store computed
    animationFrameId = requestAnimationFrame(animate);
  }
});

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
});
</script>

<style lang="scss" scoped>
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;

.hearing-indicator-container {
  width: var(--indicator-size);
  height: var(--indicator-size);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  user-select: none;

  &.is-interactive {
    cursor: pointer;

    &:hover {
      .hearing-svg {
        transform: scale(1.05);
      }
    }
  }
}

.hearing-svg {
  width: 100%;
  height: 100%;
  transition: transform var.$duration-smooth var.$ease-out-quad;
  overflow: visible;
}

.state-idle {
  .ear-icon {
    animation: gentle-pulse 3s ease-in-out infinite;
    transform-origin: center;
  }
}

.state-listening {
  .listen-ring {
    animation: expand-fade calc(2s / (var(--pulse-rate, 0.5) + 0.5)) ease-out infinite;
    transform-origin: center;
    @for $i from 1 through 4 {
      &-#{$i} {
        animation-delay: #{calc($i * 0.3s / (var(--pulse-rate, 0.5) + 0.5))};
      }
    }
  }

  .listen-core {
    animation: core-glow calc(1.5s / (var(--pulse-rate, 0.5) + 0.5)) ease-in-out infinite alternate;
  }
}

.state-transcribing {
  .transcribe-wave {
    animation: wave-flow calc(2s / (var(--reactive-intensity, 0.5) + 0.5)) linear infinite; // Changed to --reactive-intensity
    &-1 { animation-delay: 0s; }
    &-2 { animation-delay: calc(0.3s / (var(--reactive-intensity, 0.5) + 0.5)); }
    &-3 { animation-delay: calc(0.6s / (var(--reactive-intensity, 0.5) + 0.5)); }
  }

  .transcribe-dot {
    animation: dot-pulse calc(1s / (var(--reactive-intensity, 0.5) + 0.5)) ease-in-out infinite;
  }
}

.state-thinking {
  .neural-node {
    transition: all 0.3s ease-out;
    animation: neural-node-pulse calc(1.5s + (var(--reactive-neural-activity, 0) * 1s)) ease-in-out infinite alternate; // Changed
  }

  .neural-connection {
    transition: all 0.3s ease-out;
    animation: neural-connection-flow calc(2s + (var(--reactive-neural-activity, 0) * 1s)) ease-in-out infinite alternate; // Changed
  }
}


.state-responding {
  .radiate-ray {
    animation: ray-pulse calc(1.5s / (var(--reactive-intensity, 0.5) + 0.5)) ease-out infinite; // Changed
    transform-origin: center;
    @for $i from 0 through 7 {
      &-#{$i} {
        animation-delay: #{calc($i * 0.1s / (var(--reactive-intensity, 0.5) + 0.5))};
      }
    }
  }

  .radiate-core {
    animation: core-brighten calc(1s / (var(--reactive-intensity, 0.5) + 0.5)) ease-in-out infinite alternate; // Changed
  }
}

.state-speaking {
  .sound-arc {
    animation: arc-expand calc(1.5s / (var(--reactive-intensity, 0.5) + 0.5)) ease-out infinite; // Changed
    transform-origin: center;
    @for $i from 0 through 3 {
      &-#{$i} {
        animation-delay: #{calc($i * 0.2s / (var(--reactive-intensity, 0.5) + 0.5))};
      }
    }
  }

  .sound-source {
    animation: source-vibrate calc(0.1s / (var(--reactive-intensity, 0.5) + 0.5)) linear infinite; // Changed
  }
}

.state-vad-wake {
  .vad-outer {
    animation: rotate-dash 4s linear infinite;
    transform-origin: center;
  }

  .vad-inner {
    animation: gentle-glow 2s ease-in-out infinite;
  }
}

.state-vad-active {
  .vad-ring {
    animation: vad-pulse 1.5s ease-out infinite;
    transform-origin: center;
    @for $i from 1 through 3 {
      &-#{$i} {
        animation-delay: #{$i * 0.2}s;
      }
    }
  }

  .vad-core {
    animation: core-flash 0.5s ease-out infinite alternate;
  }
}

.state-error {
  .error-triangle {
    animation: error-shake 0.5s ease-in-out infinite;
    transform-origin: center;
  }

  .error-dot {
    animation: error-blink 1s step-start infinite;
  }
}

.ripple-ring {
  animation: ripple-out calc(1.5s / (var(--reactive-ripple-intensity, 0.5) + 0.5)) ease-out forwards; // Changed
  transform-origin: center;
  @for $i from 1 through 4 {
    &-#{$i} {
      animation-delay: #{calc($i * 0.15s / (var(--reactive-ripple-intensity, 0.5) + 0.5))};
    }
  }
}

.particle {
  /* Particle animation handled by JS */
}

.state-label {
  margin-top: var.$spacing-xs;
  font-size: var.$font-size-xs;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));
  opacity: 0.8;
}

@keyframes gentle-pulse {
  0%, 100% { opacity: calc(0.7 * (0.5 + var(--reactive-intensity, 0.5))); transform: scale(1); } // Changed
  50% { opacity: calc(1 * (0.5 + var(--reactive-intensity, 0.5))); transform: scale(1.05); }
}


@keyframes expand-fade {
  0% { transform: scale(0.5); opacity: 0.8; }
  100% { transform: scale(1.5); opacity: 0; }
}

@keyframes core-glow {
  from { filter: brightness(calc(1 + var(--reactive-glow-intensity, 0) * 0.2)); } // Changed
  to { filter: brightness(calc(1.3 + var(--reactive-glow-intensity, 0) * 0.3)); }
}

@keyframes wave-flow {
  0% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
  100% { transform: translateX(-5px); }
}

@keyframes dot-pulse {
  0%, 100% { r: 4; }
  50% { r: 6; }
}

@keyframes ray-pulse {
  0% { opacity: 0.3; stroke-width: 1; }
  50% { opacity: 0.9; stroke-width: 3; }
  100% { opacity: 0.3; stroke-width: 1; }
}

@keyframes core-brighten {
  from { filter: brightness(1); }
  to { filter: brightness(1.5); }
}

@keyframes arc-expand {
  0% { transform: scale(0.8); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: scale(1.3); opacity: 0; }
}

@keyframes source-vibrate {
  0% { transform: translateX(0); }
  25% { transform: translateX(-0.5px); }
  75% { transform: translateX(0.5px); }
  100% { transform: translateX(0); }
}

@keyframes rotate-dash {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes gentle-glow {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.9; }
}

@keyframes vad-pulse {
  0% { transform: scale(1); opacity: 0.7; }
  100% { transform: scale(1.3); opacity: 0; }
}

@keyframes core-flash {
  from { filter: brightness(1); }
  to { filter: brightness(1.4); }
}

@keyframes error-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-3px) rotate(-2deg); }
  40% { transform: translateX(3px) rotate(2deg); }
  60% { transform: translateX(-3px) rotate(-2deg); }
  80% { transform: translateX(3px) rotate(2deg); }
}


@keyframes error-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

@keyframes ripple-out {
  0% { transform: scale(0.5); opacity: 0.6; }
  100% { transform: scale(2); opacity: 0; }
}

@keyframes neural-node-pulse {
  0%, 100% { r: 3; opacity: 0.6; }
  50% { r: 4.5; opacity: 1; }
}

@keyframes neural-connection-flow {
  0%, 100% { stroke-dashoffset: 20; opacity: 0.3; }
  50% { stroke-dashoffset: 0; opacity: 0.7; }
}

</style>