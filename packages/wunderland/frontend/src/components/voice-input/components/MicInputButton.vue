// File: frontend/src/components/voice-input/components/MicInputButton.vue
/**
 * @file MicInputButton.vue
 * @description A dedicated, themeable, and intricately animated microphone input button.
 * Features multiple states (idle, listening, VAD wake, processing, error, disabled)
 * with dynamic SVG animations, holographic effects, gradients, and theming via CSS variables.
 *
 * @version 1.0.0
 * @created 2025-06-05
 */
<template>
  <button
    class="mic-input-button"
    :class="buttonStateClasses"
    :disabled="props.disabled"
    :aria-label="props.ariaLabel"
    :style="cssThemeVariables"
    @click="$emit('click', $event)"
    @mousedown="$emit('mousedown', $event)"
    @mouseup="$emit('mouseup', $event)"
    @mouseleave="$emit('mouseleave', $event)"
    @touchstart="$emit('touchstart', $event)"
    @touchend="$emit('touchend', $event)"
    @touchcancel="$emit('touchcancel', $event)"
  >
    <svg class="mic-input-button__svg" viewBox="-10 -10 140 140" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter :id="`micGlowSoft_${uniqueId}`" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur :stdDeviation="micGlowSoftStdDeviation" result="coloredBlurSoft"/>
          <feMerge>
            <feMergeNode in="coloredBlurSoft"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter :id="`micGlowIntense_${uniqueId}`" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur :stdDeviation="micGlowIntenseStdDeviation" result="coloredBlurIntense"/>
          <feMerge>
            <feMergeNode in="coloredBlurIntense"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        <radialGradient :id="`coreEnergyGradient_${uniqueId}`" cx="50%" cy="50%" r="50%">
          <stop offset="0%" :stop-color="`hsla(var(--mic-core-energy-h), var(--mic-core-energy-s), var(--mic-core-energy-l), 0.9)`">
            <animate attributeName="stop-color" :values="coreEnergyColorAnimateValues.stop1" dur="var(--mic-core-energy-anim-dur, 2s)" repeatCount="indefinite" v-if="isPulsingState"/>
          </stop>
          <stop offset="50%" :stop-color="`hsla(var(--mic-core-energy-h), var(--mic-core-energy-s), var(--mic-core-energy-l), 0.6)`">
             <animate attributeName="stop-color" :values="coreEnergyColorAnimateValues.stop2" dur="var(--mic-core-energy-anim-dur, 2s)" repeatCount="indefinite" v-if="isPulsingState"/>
          </stop>
          <stop offset="100%" :stop-color="`hsla(var(--mic-core-energy-h), var(--mic-core-energy-s), var(--mic-core-energy-l), 0)`" />
        </radialGradient>

        <linearGradient :id="`micBodyGradient_${uniqueId}`" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" class="mic-body-gradient-start" stop-color="var(--mic-body-gradient-color-start)" />
            <stop offset="100%" class="mic-body-gradient-end" stop-color="var(--mic-body-gradient-color-end)" />
        </linearGradient>

        <clipPath :id="`micCapsuleClip_${uniqueId}`">
            <path d="M60,28 C46.745,28 36,39.745 36,54 L36,66 C36,80.255 46.745,92 60,92 C73.255,92 84,80.255 84,66 L84,54 C84,39.745 73.255,28 60,28 Z"/>
        </clipPath>
      </defs>

      <g class="mic-layer-aura" :style="{ '--mic-aura-opacity-current': auraOpacity }">
        <circle cx="60" cy="60" r="58" fill="var(--mic-aura-color)" class="mic-aura-main-glow"/>
        <circle cx="60" cy="60" r="62" fill="none" stroke="var(--mic-aura-ring-color)" stroke-width="0.7" class="mic-aura-outer-ring"/>
        <circle cx="60" cy="60" r="54" fill="none" stroke="var(--mic-aura-ring-color)" stroke-width="0.3" class="mic-aura-inner-ring" opacity="0.7"/>
      </g>

      <g class="mic-layer-radiant-waves" v-if="isEffectivelyListening">
        <circle
          v-for="i in (props.currentAudioMode === 'continuous' ? 4 : 3)" :key="`wave-${i}`"
          class="mic-radiant-wave"
          cx="60" cy="60" :r="micWaveRadiusStart"
          fill="none"
          stroke="var(--mic-wave-color)"
          :stroke-width="micWaveStrokeInitial"
          :opacity="micWaveOpacityInitial"
        >
          <animate attributeName="r"
            :values="micWaveRadiusAnimateValues"
            :dur="micWaveDuration"
            :begin="`${i * 0.4}s`" fill="freeze" repeatCount="indefinite" />
          <animate attributeName="opacity"
            :values="micWaveOpacityAnimateValues"
            :dur="micWaveDuration"
            :begin="`${i * 0.4}s`" fill="freeze" repeatCount="indefinite" />
          <animate attributeName="stroke-width"
            :values="micWaveStrokeAnimateValues"
            :dur="micWaveDuration"
            :begin="`${i * 0.4}s`" fill="freeze" repeatCount="indefinite" />
        </circle>
      </g>
      
      <g class="mic-body-assembly">
        <path class="mic-stand"
            d="M52,91 L52,98 C52,101.313 54.687,104 58,104 L62,104 C65.313,104 68,101.313 68,98 L68,91"
            fill="none" stroke="var(--mic-stand-color)" stroke-width="2.5" opacity="0.7"/>

        <path class="mic-capsule"
            d="M60,28 C46.745,28 36,39.745 36,54 L36,66 C36,80.255 46.745,92 60,92 C73.255,92 84,80.255 84,66 L84,54 C84,39.745 73.255,28 60,28 Z"
            :fill="`url(#micBodyGradient_${uniqueId})`"
            stroke="var(--mic-casing-stroke-color)" stroke-width="var(--mic-casing-stroke-width, 1.5)"
        />
        
        <g class="mic-grille" opacity="var(--mic-grille-opacity)" :clip-path="`url(#micCapsuleClip_${uniqueId})`">
            <line v-for="i in 11" :key="`grille-v-${i}`"
                :x1="36 + i*4.36" y1="28" :x2="36 + i*4.36" y2="92"
                stroke="var(--mic-grille-line-color)" stroke-width="0.6" opacity="0.4" />
            <path d="M42 35 Q60 32 78 35 L75 40 Q60 43 45 40 Z" fill="var(--mic-grille-highlight-color)" opacity="0.15" class="mic-grille-highlight"/>
        </g>

        <circle class="mic-core-energy" cx="60" cy="60" :r="coreEnergyRadius" 
            :fill="`url(#coreEnergyGradient_${uniqueId})`" 
            :filter="`url(#micGlowIntense_${uniqueId})`"
        />
      </g>
      
      <g class="mic-layer-state-effects">
        <g v-if="isProcessingLLMFiltered" class="mic-processing-swirl-particles">
          <circle v-for="i in 5" :key="`swirl-${i}`"
            r="var(--mic-processing-particle-radius, 1.8)" 
            fill="var(--mic-processing-particle-color)">
            <animateMotion :dur="`${2.5 + i*0.15}s`" :begin="`-${i*0.4}s`" repeatCount="indefinite" rotate="auto">
                <mpath :href="`#swirlPath${i}_${uniqueId}`"/>
            </animateMotion>
            <animate attributeName="opacity" values="0.3;1;0.3" :dur="`${2.5 + i*0.15}s`" repeatCount="indefinite"/>
          </circle>
          <path :id="`swirlPath1_${uniqueId}`" d="M60,40 A20,20 0 1,1 40,60" fill="none" stroke="none"/>
          <path :id="`swirlPath2_${uniqueId}`" d="M55,42 A18,18 0 1,1 42,55" fill="none" stroke="none"/>
          <path :id="`swirlPath3_${uniqueId}`" d="M65,45 A15,15 0 1,0 45,65" fill="none" stroke="none"/>
          <path :id="`swirlPath4_${uniqueId}`" d="M50,38 A22,22 0 1,1 38,50" fill="none" stroke="none"/>
          <path :id="`swirlPath5_${uniqueId}`" d="M70,50 A10,10 0 1,1 50,70" fill="none" stroke="none"/>
        </g>

        <g v-if="props.hasMicError" class="mic-error-indicators" filter="`url(#micGlowSoft_${uniqueId})`">
            <path d="M45 45 L75 75 M75 45 L45 75" stroke="var(--mic-error-cross-color)" stroke-width="3.5" stroke-linecap="round" class="mic-error-cross"/>
            <line class="mic-error-glitch-line" stroke="var(--mic-error-glitch-color)" stroke-width="2"/>
        </g>
        
        <g v-if="!props.hasMicError && !props.disabled && !isProcessingLLMFiltered" class="mic-holographic-particles">
            <circle v-for="i in 9" :key="`hparticle-${i}`"
                :cx="60 + (Math.random() - 0.5) * 70"
                :cy="60 + (Math.random() - 0.5) * 70"
                :r="0.4 + Math.random() * 0.8"
                fill="var(--mic-particle-color)"
                class="mic-holo-particle"
                :style="{ 
                    '--float-delay': `${Math.random() * 2.5}s`, 
                    '--float-dur': `${2 + Math.random()*2}s`,
                    '--float-x-amp': `${(Math.random()-0.5)*5}px`,
                    '--float-y-amp': `${(Math.random()-0.5)*5}px`
                }">
            </circle>
        </g>
      </g>
    </svg>
  </button>
</template>

<script setup lang="ts">
import { computed, ref, getCurrentInstance, type StyleValue } from 'vue';
import type { AudioInputMode } from '@/services/voice.settings.service';

const props = defineProps<{
  isActive: boolean;
  isListeningForWakeWord: boolean;
  isProcessingLLM: boolean;
  hasMicError: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  currentAudioMode?: AudioInputMode;
}>();

defineEmits(['click', 'mousedown', 'mouseup', 'mouseleave', 'touchstart', 'touchend', 'touchcancel']);

const instance = getCurrentInstance();
const uniqueId = ref(instance?.uid || Math.random().toString(36).substring(2,9));

const micGlowSoftStdDeviation = 3;
const micGlowIntenseStdDeviation = 5;
const micWaveRadiusStart = 22;
const micWaveRadiusEnd = computed(() => props.currentAudioMode === 'continuous' ? 60 : 58);
const micWaveStrokeInitial = 1.5;
const micWaveStrokePeak = 2.5;
const micWaveStrokeEnd = 0.5;
const micWaveOpacityInitial = 0;
const micWaveOpacityPeak = 0.6;
const micWaveDurationSeconds = 2;

const micWaveRadiusAnimateValues = computed(() => `${micWaveRadiusStart}; ${micWaveRadiusEnd.value}`);
const micWaveOpacityAnimateValues = `${micWaveOpacityInitial}; ${micWaveOpacityPeak}; 0`;
const micWaveStrokeAnimateValues = `${micWaveStrokeInitial}; ${micWaveStrokePeak}; ${micWaveStrokeEnd}`;
const micWaveDuration = `${micWaveDurationSeconds}s`;

const isProcessingLLMFiltered = computed(() => props.isProcessingLLM && !props.isActive && !props.isListeningForWakeWord);
const isEffectivelyListening = computed(() => (props.isActive || props.isListeningForWakeWord) && !isProcessingLLMFiltered.value && !props.hasMicError && !props.disabled);
const isPulsingState = computed(() => !props.disabled && !props.hasMicError && (props.isActive || props.isListeningForWakeWord || isProcessingLLMFiltered.value || !props.isProcessingLLM ));


const buttonStateClasses = computed(() => ({
  'mic-button--idle': !props.isActive && !props.isListeningForWakeWord && !isProcessingLLMFiltered.value && !props.hasMicError && !props.disabled,
  'mic-button--listening-vad': props.isListeningForWakeWord && !props.isActive,
  'mic-button--listening-active': props.isActive && !props.isListeningForWakeWord,
  'mic-button--processing-llm': isProcessingLLMFiltered.value,
  'mic-button--error': props.hasMicError,
  'mic-button--disabled': props.disabled,
}));

const coreEnergyRadius = computed(() => {
  if (props.hasMicError || props.disabled) return 8;
  if (isProcessingLLMFiltered.value) return 14;
  if (props.isActive || props.isListeningForWakeWord) return 15;
  return 10; // Idle
});

const auraOpacity = computed(() => {
    if (props.disabled) return 'var(--mic-aura-opacity-disabled, 0.05)';
    if (props.hasMicError) return 'var(--mic-aura-opacity-error, 0.2)';
    if (isProcessingLLMFiltered.value) return 'var(--mic-aura-opacity-processing, 0.5)';
    if (props.isActive || props.isListeningForWakeWord) return 'var(--mic-aura-opacity-active, 0.6)';
    return 'var(--mic-aura-opacity-idle, 0.3)';
});


const coreEnergyColorAnimateValues = computed(() => {
    const vars = cssThemeVariables.value as Record<string, string | number>;
    const h = parseFloat(String(vars['--mic-core-energy-h'] ?? 200));
    const s = parseFloat(String((vars['--mic-core-energy-s'] ?? '80%').toString().replace('%','')));
    const l = parseFloat(String((vars['--mic-core-energy-l'] ?? '65%').toString().replace('%','')));

    return {
        stop1: `hsla(${h}, ${s}%, ${l}%, 0.9); hsla(${h + 20}, ${s}%, ${l + 5}%, 1); hsla(${h}, ${s}%, ${l}%, 0.9)`,
        stop2: `hsla(${h + 20}, ${s}%, ${l + 5}%, 0.6); hsla(${h}, ${s}%, ${l}%, 0.4); hsla(${h + 20}, ${s}%, ${l + 5}%, 0.6)`,
    };
});

import type { ComputedRef } from 'vue';

const cssThemeVariables: ComputedRef<Record<string, string | number>> = computed(() => {
  // These are DEFAULT values. Your global theme CSS ([data-theme="..."]) should override these.
  let themeVars: Record<string, string | number> = {
    '--mic-size': '72px',
    '--mic-bg-color': 'hsl(210, 20%, 18%)',
    '--mic-border-color': 'hsla(0,0%,100%,0.1)',
    '--mic-glow-soft-std-deviation': 3,
    '--mic-glow-intense-std-deviation': 5,
    '--mic-aura-opacity-idle': 0.3,
    '--mic-aura-opacity-active': 0.6,
    '--mic-aura-opacity-processing': 0.5,
    '--mic-aura-opacity-error': 0.2,
    '--mic-aura-opacity-disabled': 0.05,
    '--mic-core-energy-anim-dur': '2s',
    '--mic-wave-radius-start': 22,
    '--mic-wave-radius-end': 58,
    '--mic-wave-duration-base': '2s',
    '--mic-wave-opacity-initial': 0,
    '--mic-wave-opacity-peak': 0.6,
    '--mic-wave-stroke-initial': '1.5px',
    '--mic-wave-stroke-peak': '2.5px',
    '--mic-wave-stroke-end': '0.5px',
    '--mic-casing-stroke-width': '1.5px',
    '--mic-processing-particle-radius': 1.8,
    '--mic-shine-color': '#FFFFFF', // Default shine color
  };

  // Base colors (can be overridden by theme)
  let auraC = 'hsla(190, 70%, 60%, 0.1)';
  let auraRingC = 'hsla(190, 70%, 70%, 0.3)';
  let bodyGradStart = 'hsl(210, 30%, 35%)';
  let bodyGradEnd = 'hsl(210, 30%, 20%)';
  let casingStrokeC = 'hsl(210, 20%, 55%)';
  let grilleLineC = 'hsla(210, 15%, 50%, 0.7)';
  let grilleHighlightC = 'hsla(200, 30%, 80%, 0.1)';
  let standC = 'hsl(210, 15%, 40%)';
  let particleC = 'hsla(180, 100%, 80%, 0.7)';
  let coreH = 200, coreS = 80, coreL = 65;
  let waveH = 180, waveS = 90, waveL = 70; // For listening waves
  let processingParticleC = `hsl(${coreH}, ${coreS - 10}%, ${coreL + 10}%)`;
  let errorGlitchC = 'hsl(0, 100%, 70%)';
  let errorCrossC = 'hsl(0, 80%, 60%)';


  if (props.disabled) {
    auraC = 'hsla(210, 10%, 40%, 0.05)'; auraRingC = 'hsla(210, 10%, 50%, 0.1)';
    bodyGradStart = 'hsl(210, 10%, 30%)'; bodyGradEnd = 'hsl(210, 10%, 25%)';
    casingStrokeC = 'hsl(210, 10%, 45%)'; coreH = 210; coreS = 10; coreL = 50;
    particleC = 'hsla(210, 10%, 60%, 0.3)'; waveH = 210; waveS = 10; waveL = 50;
  } else if (props.hasMicError) {
    auraC = 'hsla(0, 70%, 50%, 0.15)'; auraRingC = 'hsla(0, 70%, 60%, 0.3)';
    bodyGradStart = 'hsl(0, 40%, 40%)'; bodyGradEnd = 'hsl(0, 40%, 25%)';
    casingStrokeC = 'hsl(0, 30%, 60%)'; coreH = 0; coreS = 80; coreL = 55;
    particleC = 'hsla(0, 70%, 70%, 0.5)'; waveH = 0; waveS = 80; waveL = 55;
  } else if (isProcessingLLMFiltered.value) {
    auraC = 'hsla(270, 60%, 60%, 0.2)'; auraRingC = 'hsla(270, 60%, 70%, 0.4)';
    bodyGradStart = 'hsl(270, 30%, 38%)'; bodyGradEnd = 'hsl(270, 30%, 22%)';
    casingStrokeC = 'hsl(270, 25%, 60%)'; coreH = 270; coreS = 70; coreL = 60;
    particleC = 'hsla(270, 80%, 80%, 0.6)'; waveH = 270; waveS = 70; waveL = 60; // Waves might be disabled visually for processing
    processingParticleC = `hsl(${coreH}, ${coreS}%, ${coreL + 15}%)`;
  } else if (props.isListeningForWakeWord) {
    auraC = 'hsla(180, 70%, 55%, 0.25)'; auraRingC = 'hsla(180, 70%, 65%, 0.5)';
    bodyGradStart = 'hsl(180, 40%, 40%)'; bodyGradEnd = 'hsl(180, 40%, 25%)';
    casingStrokeC = 'hsl(180, 30%, 65%)'; coreH = 180; coreS = 90; coreL = 60;
    particleC = 'hsla(180, 90%, 75%, 0.8)'; waveH = 180; waveS = 100; waveL = 75;
  } else if (props.isActive) {
    auraC = 'hsla(var(--color-voice-user-h, 140), var(--color-voice-user-s, 70%), var(--color-voice-user-l, 50%), 0.25)'; 
    auraRingC = 'hsla(var(--color-voice-user-h, 140), var(--color-voice-user-s, 70%), var(--color-voice-user-l, 60%), 0.5)';
    bodyGradStart = 'hsl(var(--color-voice-user-h, 140), var(--color-voice-user-s, 45%), 42%)'; 
    bodyGradEnd = 'hsl(var(--color-voice-user-h, 140), var(--color-voice-user-s, 45%), 28%)';
    casingStrokeC = 'hsl(var(--color-voice-user-h, 140), var(--color-voice-user-s, 35%), 68%)';
    coreH = Number(document.documentElement.style.getPropertyValue('--color-voice-user-h') || 140); // Example of reading global theme
    coreS = Number(document.documentElement.style.getPropertyValue('--color-voice-user-s')?.replace('%','') || 85);
    coreL = Number(document.documentElement.style.getPropertyValue('--color-voice-user-l')?.replace('%','') || 58);
    particleC = `hsla(${coreH}, ${coreS}%, ${coreL + 10}%, 0.8)`; 
    waveH = coreH; waveS = coreS; waveL = coreL + 10;
  } else { // Idle
    auraC = 'hsla(200, 60%, 50%, 0.15)'; auraRingC = 'hsla(200, 60%, 60%, 0.3)';
    bodyGradStart = 'hsl(200, 35%, 45%)'; bodyGradEnd = 'hsl(200, 35%, 30%)';
    casingStrokeC = 'hsl(200, 25%, 60%)'; coreH = 200; coreS = 70; coreL = 70;
    particleC = 'hsla(200, 70%, 75%, 0.5)'; waveH = 200; waveS = 80; waveL = 75;
  }

  Object.assign(themeVars, {
    '--mic-aura-color': auraC,
    '--mic-aura-ring-color': auraRingC,
    '--mic-body-gradient-color-start': bodyGradStart,
    '--mic-body-gradient-color-end': bodyGradEnd,
    '--mic-casing-stroke-color': casingStrokeC,
    '--mic-grille-line-color': grilleLineC,
    '--mic-grille-highlight-color': grilleHighlightC,
    '--mic-grille-opacity': props.disabled ? '0.3' : '0.7',
    '--mic-stand-color': standC,
    '--mic-core-energy-h': `${coreH}`,
    '--mic-core-energy-s': `${coreS}%`,
    '--mic-core-energy-l': `${coreL}%`,
    '--mic-wave-color': `hsla(${waveH}, ${waveS}%, ${waveL}%, 1)`,
    '--mic-processing-particle-color': processingParticleC,
    '--mic-error-glitch-color': errorGlitchC,
    '--mic-error-cross-color': errorCrossC,
    '--mic-particle-color': particleC,
  });
  return themeVars;
});

</script>

<style lang="scss">
@use '@/styles/animations/keyframes' as keyframes; // Ensure this path is correct for your project
@use '@/styles/abstracts/variables' as var; // For $duration-* and $ease-*

.mic-input-button {
  position: relative;
  width: var(--mic-size, 72px);
  height: var(--mic-size, 72px);
  border-radius: 50%;
  border: 1px solid var(--mic-border-color);
  cursor: pointer;
  background-color: var(--mic-bg-color);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  transition: transform var.$duration-quick var.$ease-out-quad, 
              box-shadow var.$duration-smooth var.$ease-out-cubic,
              background-color var.$duration-smooth var.$ease-out-quad;
  box-shadow: 0 3px 8px hsla(0,0%,0%,0.3), 
              inset 0 1px 2px hsla(var(--mic-core-energy-h, 200), var(--mic-core-energy-s, 80%), var(--mic-core-energy-l, 100%), 0.1); // Inner subtle highlight

  &__svg {
    width: 100%; 
    height: 100%;
    overflow: visible; // Important for glows and outer effects
  }

  // Base transition for elements that change color/opacity
  .mic-layer-aura circle, .mic-capsule, .mic-stand, .mic-grille, .mic-core-energy {
    transition: fill var.$duration-medium var.$ease-out-quad, 
                stroke var.$duration-medium var.$ease-out-quad,
                opacity var.$duration-medium var.$ease-out-quad;
  }
  
  .mic-body-gradient-start, .mic-body-gradient-end {
      transition: stop-color var.$duration-medium var.$ease-out-quad;
  }

  &:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 5px 15px hsla(var(--mic-core-energy-h,200), var(--mic-core-energy-s,80%), var(--mic-core-energy-l,65%),0.3),
                inset 0 1px 3px hsla(var(--mic-core-energy-h,200), var(--mic-core-energy-s,80%), var(--mic-core-energy-l,100%), 0.2);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
    box-shadow: 0 2px 5px hsla(0,0%,0%,0.2),
                inset 0 2px 4px hsla(0,0%,0%,0.2);
  }

  &.mic-button--disabled {
    cursor: not-allowed;
    // Opacity handled by CSS variables driven by cssThemeVariables
    filter: saturate(0.3);
    .mic-layer-aura, .mic-layer-radiant-waves, .mic-processing-swirl-particles, .mic-holographic-particles {
      display: none; // Hide complex animations when disabled
    }
  }

  &.mic-button--error {
     .mic-error-glitch-line {
        animation: micErrorGlitch 0.3s steps(3, end) infinite;
     }
     .mic-error-cross {
       animation: subtlePulse 1s ease-in-out infinite;
     }
  }

  .mic-layer-aura {
    .mic-aura-main-glow {
        transition: opacity var.$duration-medium var.$ease-out-quad;
        opacity: var(--mic-aura-opacity-current); // Driven by computed auraOpacity
    }
    .mic-aura-outer-ring, .mic-aura-inner-ring {
        transform-origin: 60px 60px;
        animation: spin linear infinite;
        animation-play-state: running; // Always spinning subtly if not disabled
    }
    .mic-aura-outer-ring { animation-duration: 30s; }
    .mic-aura-inner-ring { animation-duration: 25s; animation-direction: reverse; }
  }
  
  .mic-core-energy {
    transform-origin: 60px 60px;
    // SMIL <animateTransform> controls pulsing based on state
  }

  .mic-radiant-wave { // SMIL controls individual wave animation
    transform-origin: 60px 60px;
  }
  
  .mic-holographic-particles .mic-holo-particle {
      // Using CSS variables for stagger and duration variation
      animation: micHoloParticleFloat var(--float-dur) ease-in-out infinite alternate;
      animation-delay: var(--float-delay);
      transform-origin: center; // Ensure particles scale from their center
      will-change: transform, opacity;
  }
   .mic-grille-highlight {
     animation: subtlePulse 3s ease-in-out infinite;
     animation-delay: 0.5s;
   }
}
</style>
