// File: frontend/src/store/reactive.store.ts
/**
 * @file reactive.store.ts
 * @description Core reactive state management for "Her"-inspired visual effects
 * Manages app states, mood states, visual parameters, and dynamic CSS variables
 * @version 1.1.0
 */

import { defineStore } from 'pinia';
import { ref, computed, watch, readonly } from 'vue';

export type AppState = 
  | 'idle' 
  | 'listening' 
  | 'transcribing' 
  | 'thinking' 
  | 'processing'  // Added missing state
  | 'responding' 
  | 'speaking'
  | 'vad-wake'
  | 'vad-active'
  | 'error'
  | 'connecting';

export type MoodState = 
  | 'calm'
  | 'warm'
  | 'engaged'
  | 'excited'
  | 'contemplative'
  | 'attentive'
  | 'curious'
  | 'focused';

export type VisualEffect = 
  | 'ripple'
  | 'glow'
  | 'pulse'
  | 'shimmer'
  | 'neural'
  | 'particle'
  | 'wave';

interface StateConfig {
  intensity: number;
  pulseRate: number;
  glowIntensity: number;
  neuralActivity: number;
  particleActivity: number;
  warmth: number;
  effects: VisualEffect[];
}

interface RippleOptions {
  duration?: number;
  intensity?: number;
  count?: number;
  origin?: { x: number; y: number };
}

// Default configurations for each app state
const STATE_CONFIGS: Record<AppState, StateConfig> = {
  idle: {
    intensity: 0.3,
    pulseRate: 0.3,
    glowIntensity: 0.3,
    neuralActivity: 0,
    particleActivity: 0.2,
    warmth: 0.5,
    effects: ['glow'],
  },
  listening: {
    intensity: 0.7,
    pulseRate: 0.6,
    glowIntensity: 0.5,
    neuralActivity: 0.2,
    particleActivity: 0.4,
    warmth: 0.6,
    effects: ['pulse', 'ripple'],
  },
  transcribing: {
    intensity: 0.8,
    pulseRate: 0.8,
    glowIntensity: 0.6,
    neuralActivity: 0.3,
    particleActivity: 0.5,
    warmth: 0.7,
    effects: ['wave', 'shimmer'],
  },
  thinking: {
    intensity: 0.6,
    pulseRate: 0.4,
    glowIntensity: 0.7,
    neuralActivity: 0.9,
    particleActivity: 0.3,
    warmth: 0.5,
    effects: ['neural', 'glow'],
  },
  processing: {  // Added missing state config
    intensity: 0.7,
    pulseRate: 0.5,
    glowIntensity: 0.6,
    neuralActivity: 0.7,
    particleActivity: 0.4,
    warmth: 0.6,
    effects: ['neural', 'shimmer'],
  },
  responding: {
    intensity: 0.9,
    pulseRate: 0.7,
    glowIntensity: 0.8,
    neuralActivity: 0.5,
    particleActivity: 0.7,
    warmth: 0.8,
    effects: ['ripple', 'particle', 'glow'],
  },
  speaking: {
    intensity: 0.8,
    pulseRate: 0.5,
    glowIntensity: 0.7,
    neuralActivity: 0.2,
    particleActivity: 0.6,
    warmth: 0.9,
    effects: ['wave', 'pulse'],
  },
  'vad-wake': {
    intensity: 0.4,
    pulseRate: 0.4,
    glowIntensity: 0.4,
    neuralActivity: 0.1,
    particleActivity: 0.2,
    warmth: 0.5,
    effects: ['pulse'],
  },
  'vad-active': {
    intensity: 0.6,
    pulseRate: 0.7,
    glowIntensity: 0.5,
    neuralActivity: 0.2,
    particleActivity: 0.3,
    warmth: 0.6,
    effects: ['ripple', 'glow'],
  },
  error: {
    intensity: 0.5,
    pulseRate: 0.9,
    glowIntensity: 0.3,
    neuralActivity: 0,
    particleActivity: 0.1,
    warmth: 0.2,
    effects: ['pulse'],
  },
  connecting: {
    intensity: 0.5,
    pulseRate: 0.5,
    glowIntensity: 0.5,
    neuralActivity: 0.4,
    particleActivity: 0.3,
    warmth: 0.5,
    effects: ['shimmer', 'neural'],
  },
};

// Mood modifiers that adjust the base state config
const MOOD_MODIFIERS: Record<MoodState, Partial<StateConfig>> = {
  calm: {
    intensity: -0.1,
    pulseRate: -0.2,
    warmth: -0.1,
  },
  warm: {
    warmth: 0.3,
    glowIntensity: 0.1,
    particleActivity: 0.1,
  },
  engaged: {
    intensity: 0.1,
    pulseRate: 0.1,
    neuralActivity: 0.1,
  },
  excited: {
    intensity: 0.2,
    pulseRate: 0.3,
    particleActivity: 0.2,
  },
  contemplative: {
    neuralActivity: 0.3,
    pulseRate: -0.1,
    warmth: -0.1,
  },
  attentive: {
    intensity: 0.1,
    glowIntensity: 0.2,
    neuralActivity: 0.1,
  },
  curious: {
    neuralActivity: 0.2,
    particleActivity: 0.1,
    pulseRate: 0.1,
  },
  focused: {
    intensity: 0.2,
    neuralActivity: 0.2,
    pulseRate: -0.2,
  },
};

export const useReactiveStore = defineStore('reactive', () => {
  // Core state
  const appState = ref<AppState>('idle');
  const moodState = ref<MoodState>('calm');
  const activeEffects = ref<Set<VisualEffect>>(new Set(['glow']));
  
  // Visual parameters (all as refs for proper reactivity)
  const intensity = ref(0.3);
  const pulseRate = ref(0.3);
  const pulseIntensity = ref(0.5);
  const gradientShift = ref(0);
  const gradientSpeed = ref(0.5);
  const glowIntensity = ref(0.3);
  const glowRadius = ref(10);
  const particleActivity = ref(0.2);
  const neuralActivity = ref(0);
  const warmth = ref(0.5);
  const rippleScale = ref(0);
  const rippleIntensity = ref(0.5);
  const borderPulseSpeed = ref(2);
  const textStreamSpeed = ref(0.7);
  
  // Animation durations
  const pulseDuration = ref(2);
  const glowDuration = ref(2);
  
  // Ripple state
  const rippleActive = ref(false);
  let rippleTimeout: number | null = null;
  
  // Added missing state
  const isTransitioning = ref(false);
  
  // Computed state config
  const currentStateConfig = computed(() => {
    const baseConfig = STATE_CONFIGS[appState.value];
    const moodModifier = MOOD_MODIFIERS[moodState.value];
    
    // Apply mood modifiers to base config
    const modifiedConfig: StateConfig = { ...baseConfig };
    Object.entries(moodModifier).forEach(([key, modifier]) => {
      if (key in modifiedConfig && typeof modifier === 'number') {
        (modifiedConfig as any)[key] = Math.max(0, Math.min(1, 
          (modifiedConfig as any)[key] + modifier
        ));
      }
    });
    
    return modifiedConfig;
  });
  
  // Effective values (combines manual adjustments with state config)
  const effectiveIntensity = computed(() => 
    Math.max(0, Math.min(1, intensity.value))
  );
  
  const effectivePulseRate = computed(() => 
    Math.max(0, Math.min(1, pulseRate.value))
  );
  
  // CSS variables for direct DOM integration
  const cssVariables = computed(() => ({
    '--reactive-intensity': effectiveIntensity.value.toFixed(2),
    '--reactive-pulse-rate': effectivePulseRate.value.toFixed(2),
    '--reactive-pulse-intensity': pulseIntensity.value.toFixed(2),
    '--reactive-gradient-shift': gradientShift.value.toFixed(2),
    '--reactive-gradient-speed': gradientSpeed.value.toFixed(2),
    '--reactive-glow-intensity': glowIntensity.value.toFixed(2),
    '--reactive-glow-radius': `${glowRadius.value}px`,
    '--reactive-particle-activity': particleActivity.value.toFixed(2),
    '--reactive-neural-activity': neuralActivity.value.toFixed(2),
    '--reactive-warmth': warmth.value.toFixed(2),
    '--reactive-ripple-scale': rippleScale.value.toFixed(2),
    '--reactive-ripple-intensity': rippleIntensity.value.toFixed(2),
    '--reactive-border-pulse-speed': `${borderPulseSpeed.value}s`,
    '--reactive-text-stream-speed': textStreamSpeed.value.toFixed(2),
    '--reactive-pulse-duration': `${pulseDuration.value}s`,
    '--reactive-glow-duration': `${glowDuration.value}s`,
    // Add missing CSS variable
    '--reactive-neural-color': `hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.6)`,
  }));
  
  // State transition with smooth interpolation
  const transitionToState = (newState: AppState, duration: number = 800) => {
    if (appState.value === newState) return;
    
    isTransitioning.value = true;
    const oldConfig = currentStateConfig.value;
    appState.value = newState;
    const newConfig = currentStateConfig.value;
    
    // Smooth interpolation of values
    const startTime = performance.now();
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easeProgress = easeOutCubic(progress);
      
      // Interpolate each value
      intensity.value = lerp(oldConfig.intensity, newConfig.intensity, easeProgress);
      pulseRate.value = lerp(oldConfig.pulseRate, newConfig.pulseRate, easeProgress);
      glowIntensity.value = lerp(oldConfig.glowIntensity, newConfig.glowIntensity, easeProgress);
      neuralActivity.value = lerp(oldConfig.neuralActivity, newConfig.neuralActivity, easeProgress);
      particleActivity.value = lerp(oldConfig.particleActivity, newConfig.particleActivity, easeProgress);
      warmth.value = lerp(oldConfig.warmth, newConfig.warmth, easeProgress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Apply final effects
        activeEffects.value = new Set(newConfig.effects);
        updateCssVariables();
        isTransitioning.value = false;
      }
    };
    
    requestAnimationFrame(animate);
  };
  
  // Mood state setter
  const setMoodState = (mood: MoodState) => {
    moodState.value = mood;
    // Trigger a soft update to current state to apply mood modifiers
    const currentState = appState.value;
    transitionToState(currentState, 600);
  };
  
  // Manual parameter adjustments
  const adjustIntensity = (delta: number) => {
    intensity.value = Math.max(0, Math.min(1, intensity.value + delta));
    updateCssVariables();
  };
  
  const adjustPulseRate = (delta: number) => {
    pulseRate.value = Math.max(0, Math.min(1, pulseRate.value + delta));
    updateCssVariables();
  };
  
  const adjustGlowIntensity = (delta: number) => {
    glowIntensity.value = Math.max(0, Math.min(1, glowIntensity.value + delta));
    updateCssVariables();
  };
  
  const adjustWarmth = (delta: number) => {
    warmth.value = Math.max(0, Math.min(1, warmth.value + delta));
    updateCssVariables();
  };
  
  // Effect management
  const addEffect = (effect: VisualEffect) => {
    activeEffects.value.add(effect);
  };
  
  const removeEffect = (effect: VisualEffect) => {
    activeEffects.value.delete(effect);
  };
  
  const hasEffect = (effect: VisualEffect) => {
    return activeEffects.value.has(effect);
  };
  
  // Trigger animations
  const triggerRipple = (options: RippleOptions = {}) => {
    const { duration = 1000, intensity: rippleInt = 0.8, count = 1 } = options;
    
    rippleActive.value = true;
    rippleIntensity.value = rippleInt;
    
    if (rippleTimeout) clearTimeout(rippleTimeout);
    rippleTimeout = window.setTimeout(() => {
      rippleActive.value = false;
    }, duration * count);
    
    // Animate ripple scale
    const animateRipple = () => {
      const startTime = performance.now();
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = (elapsed % duration) / duration;
        rippleScale.value = easeOutCubic(progress);
        
        if (elapsed < duration * count) {
          requestAnimationFrame(animate);
        } else {
          rippleScale.value = 0;
        }
      };
      requestAnimationFrame(animate);
    };
    
    animateRipple();
  };
  
  const triggerPulse = (pulseInt: number = 0.8, duration: number = 1000) => {
    pulseIntensity.value = pulseInt;
    pulseDuration.value = duration / 1000;
    
    setTimeout(() => {
      pulseIntensity.value = 0.5;
    }, duration);
  };
  
  const triggerGlowBurst = (glowInt: number = 0.9, duration: number = 1500) => {
    const startGlow = glowIntensity.value;
    glowIntensity.value = glowInt;
    glowDuration.value = duration / 1000;
    
    setTimeout(() => {
      glowIntensity.value = startGlow;
    }, duration);
  };
  
  // Update CSS variables on the root element
  const updateCssVariables = () => {
    const root = document.documentElement;
    Object.entries(cssVariables.value).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  };
  
  // Initialize and watch for changes
  watch(cssVariables, () => updateCssVariables(), { deep: true, immediate: true });
  
  // Utility functions
  function lerp(start: number, end: number, progress: number): number {
    return start + (end - start) * progress;
  }
  
  function easeOutCubic(x: number): number {
    return 1 - Math.pow(1 - x, 3);
  }
  
  // Reset function
  const reset = () => {
    appState.value = 'idle';
    moodState.value = 'calm';
    activeEffects.value = new Set(['glow']);
    intensity.value = 0.3;
    pulseRate.value = 0.3;
    pulseIntensity.value = 0.5;
    gradientShift.value = 0;
    gradientSpeed.value = 0.5;
    glowIntensity.value = 0.3;
    glowRadius.value = 10;
    particleActivity.value = 0.2;
    neuralActivity.value = 0;
    warmth.value = 0.5;
    rippleScale.value = 0;
    rippleIntensity.value = 0.5;
    borderPulseSpeed.value = 2;
    textStreamSpeed.value = 0.7;
    isTransitioning.value = false;
    updateCssVariables();
  };
  
  return {
    // State
    appState: readonly(appState),
    moodState: readonly(moodState),
    activeEffects: readonly(activeEffects),
    isTransitioning: readonly(isTransitioning),
    
    // Parameters (exposed as readonly refs)
    intensity: readonly(intensity),
    pulseRate: readonly(pulseRate),
    pulseIntensity: readonly(pulseIntensity),
    gradientShift: readonly(gradientShift),
    gradientSpeed: readonly(gradientSpeed),
    glowIntensity: readonly(glowIntensity),
    glowRadius: readonly(glowRadius),
    particleActivity: readonly(particleActivity),
    neuralActivity: readonly(neuralActivity),
    warmth: readonly(warmth),
    rippleScale: readonly(rippleScale),
    rippleIntensity: readonly(rippleIntensity),
    borderPulseSpeed: readonly(borderPulseSpeed),
    textStreamSpeed: readonly(textStreamSpeed),
    pulseDuration: readonly(pulseDuration),
    glowDuration: readonly(glowDuration),
    rippleActive: readonly(rippleActive),
    
    // Computed
    currentStateConfig: readonly(currentStateConfig),
    effectiveIntensity: readonly(effectiveIntensity),
    effectivePulseRate: readonly(effectivePulseRate),
    cssVariables: readonly(cssVariables),
    
    // Actions
    transitionToState,
    setMoodState,
    adjustIntensity,
    adjustPulseRate,
    adjustGlowIntensity,
    adjustWarmth,
    addEffect,
    removeEffect,
    hasEffect,
    triggerRipple,
    triggerPulse,
    triggerGlowBurst,
    reset,
  };
});