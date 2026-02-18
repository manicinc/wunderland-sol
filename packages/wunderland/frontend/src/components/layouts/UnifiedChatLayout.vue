// File: frontend/src/components/layouts/UnifiedChatLayout.vue /** * @file UnifiedChatLayout.vue *
@description A unified layout component for chat-centric views. * Manages overall page structure,
full-height behavior, themed background effects, * and dynamic sizing for fixed/sticky child
elements like EphemeralChatLog and VoiceInput. * * @component UnifiedChatLayout * @props {boolean}
isVoiceInputProcessing - Indicates if voice input is currently being processed. * @props {boolean}
[isLlmProcessing=false] - Indicates if LLM is currently processing a response. * @props {string}
[currentAgentInputPlaceholder] - Placeholder text for VoiceInput. * @props {boolean}
[showEphemeralLog=true] - Controls visibility of EphemeralChatLog. * * @emits transcription - Emits
transcribed text from VoiceInput. * @emits voice-input-processing - Emits processing state of
VoiceInput. * * @version 2.2.1 - Fixed prop mismatch: Added isLlmProcessing prop to properly pass
LLM state to VoiceInput. * Previously incorrectly passed isVoiceInputProcessing as LLM processing
state. */
<script setup lang="ts">
import {
  ref,
  computed,
  type CSSProperties,
  onMounted,
  onUnmounted,
  type Ref,
  nextTick,
  watch,
} from 'vue';
import EphemeralChatLog from '@/components/EphemeralChatLog.vue';
import VoiceInput from '@/components/voice-input/VoiceInput.vue';
import { useUiStore } from '@/store/ui.store';

const props = withDefaults(
  defineProps<{
    isVoiceInputProcessing: boolean;
    isLlmProcessing?: boolean;
    currentAgentInputPlaceholder?: string;
    showEphemeralLog?: boolean;
  }>(),
  {
    showEphemeralLog: true, // Default to true if not provided
    isLlmProcessing: false, // Default to false if not provided
  }
);

const emit = defineEmits<{
  (e: 'transcription', value: string): void;
  (e: 'voice-input-processing', status: boolean): void;
}>();

const uiStore = useUiStore();
const layoutWrapperRef: Ref<HTMLElement | null> = ref(null);
const ephemeralLogRef: Ref<InstanceType<typeof EphemeralChatLog> | null> = ref(null);
const voiceInputSectionRef: Ref<HTMLElement | null> = ref(null); // This wraps the toolbar (if any) and VoiceInput

const handleTranscription = (transcription: string): void => {
  emit('transcription', transcription);
};

const handleVoiceProcessing = (status: boolean): void => {
  emit('voice-input-processing', status);
};

const numOrbitingShapes = computed(() => (uiStore.isReducedMotionPreferred ? 2 : 6)); // Reduced count for subtlety

const orbitStyleProvider = (_index: number): CSSProperties => ({
  animationDuration: `${50 + Math.random() * 70}s`, // Slower, more ambient
  animationDelay: `-${Math.random() * 90}s`,
  transform: `rotate(${Math.random() * 360}deg) translateX(${25 + Math.random() * 55}vmax) translateY(${Math.random() * 30 - 15}vmax) rotate(-${Math.random() * 360}deg)`,
  opacity: 0.01 + Math.random() * 0.025, // More subtle
  zIndex: 0,
});

const shapeStyleProvider = (_index: number): CSSProperties => {
  const accentVar1 = Math.random() > 0.5 ? '--color-accent-primary' : '--color-accent-secondary';
  const accentVar2 = Math.random() > 0.5 ? '--color-accent-interactive' : '--color-accent-glow'; // Use glow for softer shadows
  return {
    width: `${30 + Math.random() * 80}px`, // Slightly smaller range
    height: `${30 + Math.random() * 80}px`,
    backgroundColor: `hsla(var(${accentVar1}-h), var(${accentVar1}-s), var(${accentVar1}-l), ${0.03 + Math.random() * 0.08})`, // More translucent
    animationDuration: `${35 + Math.random() * 45}s`,
    borderRadius:
      Math.random() > 0.3 ? '50%' : `${Math.random() * 40 + 10}% ${Math.random() * 40 + 10}%`, // More varied shapes
    filter: `blur(${4 + Math.random() * 6}px) saturate(1.1)`, // Slightly more blur
    boxShadow: `0 0 ${8 + Math.random() * 15}px hsla(var(${accentVar2}-h), var(${accentVar2}-s), var(${accentVar2}-l), 0.06)`, // Softer shadow
  };
};

/**
 * Updates CSS custom properties for dynamic layout heights.
 * Sets --header-actual-height on document root.
 * Sets --ephemeral-log-actual-height and --voice-input-actual-height on the layoutWrapperRef
 * for use by styles scoped within/around UnifiedChatLayout.
 */
const updateDynamicLayoutHeights = async () => {
  await nextTick(); // Ensure DOM is updated

  const root = document.documentElement;
  const wrapperEl = layoutWrapperRef.value;

  // Header height (usually fixed, but good to measure for robustness)
  const headerEl = document.querySelector('.app-layout-header-ephemeral') as HTMLElement; // Global header
  const headerHeight =
    headerEl?.offsetHeight ||
    parseFloat(root.style.getPropertyValue('--header-actual-height')) ||
    60;
  root.style.setProperty('--header-actual-height', `${headerHeight}px`); // Still global for App.vue

  if (!wrapperEl) return;

  // Ephemeral Log height
  let ephemeralLogHeight = 0;
  if (
    props.showEphemeralLog &&
    ephemeralLogRef.value?.$el &&
    ephemeralLogRef.value.$el instanceof HTMLElement
  ) {
    ephemeralLogHeight = ephemeralLogRef.value.$el.offsetHeight;
  }
  wrapperEl.style.setProperty('--ephemeral-log-actual-height', `${ephemeralLogHeight}px`);
  // console.log(`[UCL] Ephemeral Log height: ${ephemeralLogHeight}px`);

  // Voice Input section height
  let voiceInputHeight = 0;
  if (voiceInputSectionRef.value && voiceInputSectionRef.value instanceof HTMLElement) {
    voiceInputHeight = voiceInputSectionRef.value.offsetHeight;
  } else {
    // Fallback: read from style if previously set, or use a sensible default
    voiceInputHeight =
      parseFloat(wrapperEl.style.getPropertyValue('--voice-input-actual-height')) || 80; // Adjusted default
  }
  wrapperEl.style.setProperty('--voice-input-actual-height', `${voiceInputHeight}px`);
  // console.log(`[UCL] VoiceInput section height set on wrapper: ${voiceInputHeight}px`);
};

let resizeObserverInstance: ResizeObserver | null = null;
const observedElementsMap = new WeakMap<Element, string>(); // Store a name for logging

const setupResizeObserverForElement = (
  elRef: Ref<HTMLElement | InstanceType<typeof EphemeralChatLog> | null>,
  elementName: string,
  isEphemeralLog: boolean = false
) => {
  if (typeof ResizeObserver === 'undefined' || !resizeObserverInstance) return;

  const targetElement = isEphemeralLog
    ? (elRef.value as InstanceType<typeof EphemeralChatLog>)?.$el
    : (elRef.value as HTMLElement);

  if (targetElement && targetElement instanceof HTMLElement) {
    if (!observedElementsMap.has(targetElement)) {
      resizeObserverInstance.observe(targetElement);
      observedElementsMap.set(targetElement, elementName);
      // console.log(`[UCL] ResizeObserver: Now observing ${elementName}.`);
    }
  } else if (targetElement && observedElementsMap.has(targetElement)) {
    // Element became invalid after being observed
    resizeObserverInstance.unobserve(targetElement);
    observedElementsMap.delete(targetElement);
    // console.log(`[UCL] ResizeObserver: Unobserved ${elementName} (became invalid).`);
  }
};

const teardownResizeObserverForElement = (
  elRef: Ref<HTMLElement | InstanceType<typeof EphemeralChatLog> | null>,
  _elementName: string,
  isEphemeralLog: boolean = false
) => {
  if (typeof ResizeObserver === 'undefined' || !resizeObserverInstance) return;
  const targetElement = isEphemeralLog
    ? (elRef.value as InstanceType<typeof EphemeralChatLog>)?.$el
    : (elRef.value as HTMLElement);

  if (
    targetElement &&
    targetElement instanceof HTMLElement &&
    observedElementsMap.has(targetElement)
  ) {
    resizeObserverInstance.unobserve(targetElement);
    observedElementsMap.delete(targetElement);
    // console.log(`[UCL] ResizeObserver: Explicitly unobserved ${elementName}.`);
  }
};

onMounted(async () => {
  await updateDynamicLayoutHeights(); // Initial calculation
  window.addEventListener('resize', updateDynamicLayoutHeights); // Fallback for general resizes

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserverInstance = new ResizeObserver(async _entries => {
      // console.log('[UCL] ResizeObserver detected changes:', entries.map(e => observedElementsMap.get(e.target)));
      await updateDynamicLayoutHeights(); // Recalculate all relevant heights on any observed change
    });

    // Setup observers for relevant elements
    // voiceInputSectionRef should contain the VoiceInput component directly or its immediate wrapper.
    // It's the height of this section that's crucial for the main content area's padding-bottom.
    setupResizeObserverForElement(voiceInputSectionRef, 'VoiceInputSection');

    if (props.showEphemeralLog) {
      await nextTick(); // Ensure ephemeralLogRef.$el is available if showEphemeralLog is initially true
      setupResizeObserverForElement(ephemeralLogRef, 'EphemeralChatLog', true);
    }
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', updateDynamicLayoutHeights);
  if (resizeObserverInstance) {
    resizeObserverInstance.disconnect(); // Clean up all observations
    resizeObserverInstance = null;
    // console.log('[UCL] ResizeObserver disconnected on unmount.');
  }
});

// Watch for dynamic changes in visibility of EphemeralChatLog
watch(
  () => props.showEphemeralLog,
  async (newValue, oldValue) => {
    if (newValue === oldValue) return;
    // console.log(`[UCL] showEphemeralLog changed: ${oldValue} -> ${newValue}.`);
    await nextTick(); // Allow DOM to update based on v-if

    if (newValue) {
      setupResizeObserverForElement(ephemeralLogRef, 'EphemeralChatLog', true);
    } else {
      teardownResizeObserverForElement(ephemeralLogRef, 'EphemeralChatLog', true);
      // If log is hidden, its height becomes 0 for layout calculation
      if (layoutWrapperRef.value)
        layoutWrapperRef.value.style.setProperty('--ephemeral-log-actual-height', `0px`);
    }
    await updateDynamicLayoutHeights(); // Recalculate layout paddings
  },
  { flush: 'post' }
);

// Watch the refs themselves in case they are initially null then populated
watch(voiceInputSectionRef, async newEl => {
  if (newEl) setupResizeObserverForElement(voiceInputSectionRef, 'VoiceInputSection');
  await updateDynamicLayoutHeights();
});

watch(ephemeralLogRef, async newEl => {
  if (props.showEphemeralLog && newEl?.$el) {
    setupResizeObserverForElement(ephemeralLogRef, 'EphemeralChatLog', true);
  }
  await updateDynamicLayoutHeights();
});
</script>

<template>
  <div class="unified-chat-layout-wrapper" ref="layoutWrapperRef">
    <div class="unified-chat-background-effects" aria-hidden="true">
      <div class="fixed-holo-grid"></div>
      <template v-if="!uiStore.isReducedMotionPreferred">
        <div
          v-for="i in numOrbitingShapes"
          :key="`orbit-${i}`"
          class="orbit-container"
          :style="orbitStyleProvider(i)"
        >
          <div class="orbiting-shape" :style="shapeStyleProvider(i)"></div>
        </div>
      </template>
    </div>

    <EphemeralChatLog
      v-if="props.showEphemeralLog"
      ref="ephemeralLogRef"
      class="unified-ephemeral-log-section"
    />

    <div class="unified-main-content-area">
      <slot name="above-main-content" />
      <slot name="main-content">
        <div class="p-4 text-center text-color-muted">Agent content appears here.</div>
      </slot>
    </div>

    <div class="unified-voice-input-section" ref="voiceInputSectionRef">
      <div v-if="$slots['voice-toolbar']" class="unified-voice-toolbar">
        <slot name="voice-toolbar" />
      </div>
      <VoiceInput
        :is-processing-l-l-m="props.isLlmProcessing"
        :show-embedded-toolbar="!$slots['voice-toolbar']"
        @transcription-ready="handleTranscription"
        @stt-processing-audio="handleVoiceProcessing"
      />
    </div>
  </div>
</template>

<style lang="scss">
// Styles are in frontend/src/styles/layout/_unified-chat-layout.scss
// This component relies on its SCSS file for flex layout, sticky positioning,
// and using CSS variables like --voice-input-actual-height for padding.
</style>
