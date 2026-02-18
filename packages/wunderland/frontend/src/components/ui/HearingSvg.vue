<template>
  <div
    class="hearing-svg-wrapper"
    :class="wrapperClasses"
    :style="wrapperStyle"
    @click="handleClick"
    role="button"
    :aria-label="ariaLabel"
    tabindex="0"
    @keydown.enter="handleClick"
    @keydown.space="handleClick"
  >
    <svg
      :width="size"
      :height="size"
      viewBox="0 0 800 600"
      xmlns="http://www.w3.org/2000/svg"
      class="hearing-smil-svg"
      style="background-color: transparent;"
    >
      <defs>
        <radialGradient :id="corePulseGradientId" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stop-color="#FF8C00">
            <animate attributeName="stop-color" values="#FF8C00;#FF7F50;#FF69B4;#DA70D6;#87CEEB;#AFEEEE;#FF8C00" dur="60s" repeatCount="indefinite" />
          </stop>
          <stop offset="30%" stop-color="#FF4500">
            <animate attributeName="stop-color" values="#FF7F50;#FF69B4;#DA70D6;#87CEEB;#AFEEEE;#FF8C00;#FF7F50" dur="60s" begin="-10s" repeatCount="indefinite" />
          </stop>
          <stop offset="70%" stop-color="#FF69B4" stop-opacity="0.8">
            <animate attributeName="stop-color" values="#FF69B4;#DA70D6;#87CEEB;#AFEEEE;#FF8C00;#FF7F50;#FF69B4" dur="60s" begin="-20s" repeatCount="indefinite" />
            <animate attributeName="stop-opacity" values="0.8;0.3;0.7;0.4;0.8" dur="20s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stop-color="#1A1A2E" stop-opacity="0">
            <animate attributeName="stop-color" values="#DA70D6;#87CEEB;#AFEEEE;#FF8C00;#FF7F50;#FF69B4;#DA70D6" dur="60s" begin="-30s" repeatCount="indefinite" />
          </stop>
        </radialGradient>

        <linearGradient :id="rippleWaveGradientId" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#00BFFF">
            <animate attributeName="stop-color" values="#00BFFF;#4682B4;#32CD32;#ADFF2F;#FFD700;#FFA500;#FF6347;#DC143C;#00BFFF" dur="18s" repeatCount="indefinite" />
          </stop>
          <stop offset="50%" stop-color="#32CD32">
            <animate attributeName="stop-color" values="#32CD32;#ADFF2F;#FFD700;#FFA500;#FF6347;#DC143C;#00BFFF;#4682B4;#32CD32" dur="18s" begin="-4.5s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stop-color="#FFD700">
            <animate attributeName="stop-color" values="#FFD700;#FFA500;#FF6347;#DC143C;#00BFFF;#4682B4;#32CD32;#ADFF2F;#FFD700" dur="18s" begin="-9s" repeatCount="indefinite" />
          </stop>
        </linearGradient>

        <radialGradient :id="sparkleGradientId" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stop-color="rgba(220, 220, 255, 0.7)">
            <animate attributeName="stop-color" values="rgba(220, 220, 255, 0.7);rgba(200, 255, 200, 0.6);rgba(255, 200, 200, 0.7);rgba(200,200,255,0.5);rgba(220, 220, 255, 0.7)" dur="14s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stop-color="rgba(100, 100, 150, 0)">
            <animate attributeName="stop-color" values="rgba(100,100,150,0);rgba(80,150,80,0);rgba(150,80,80,0);rgba(100,80,120,0);rgba(100,100,150,0)" dur="14s" repeatCount="indefinite" />
          </stop>
        </radialGradient>

        <filter :id="softGlowFilterId" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        <filter :id="rippleGlowFilterId" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="rippleBlur"/>
          <feMerge>
            <feMergeNode in="rippleBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <g transform="translate(400, 300)">
        <g id="centralHerElement" :filter="`url(#${softGlowFilterId})`">
          <circle cx="0" cy="0" r="40" :fill="`url(#${corePulseGradientId})`" opacity="0.9">
            <animate attributeName="r" values="39;41;39" dur="15s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1"/>
            <animateTransform attributeName="transform" type="scale" values="1;1.03;1" dur="15s" repeatCount="indefinite" additive="sum" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1"/>
          </circle>
          <g id="petalPaths">
            <path d="M0,-35 Q18,-50 35,-35 T70,-35 Q50,-18 35,0 T0,0 Q-18,-18 -35,0 T-70,-35 Q-50,-50 -35,-35 T0,-35Z" fill="#87CEEB" opacity="0">
              <animateTransform attributeName="transform" type="scale" values="0.9;1.05;0.95;1.02;0.9" dur="25s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" keySplines="0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1"/>
              <animate attributeName="opacity" values="0;0;0.5;0.5;0;0" dur="25s" begin="0s" repeatCount="indefinite" keyTimes="0;0.35;0.45;0.55;0.65;1"/>
              <animate attributeName="fill" values="#87CEEB;#ADD8E6;#B0E0E6;#87CEEB" dur="70s" repeatCount="indefinite" />
            </path>
            <path d="M0,-35 Q18,-50 35,-35 T70,-35 Q50,-18 35,0 T0,0 Q-18,-18 -35,0 T-70,-35 Q-50,-50 -35,-35 T0,-35Z" fill="#DA70D6" opacity="0" transform="rotate(120)">
              <animateTransform attributeName="transform" type="scale" values="0.95;1.03;0.9;1.05;0.95" dur="25s" begin="8s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" keySplines="0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1"/>
              <animate attributeName="opacity" values="0;0;0.45;0.45;0;0" dur="25s" begin="8s" repeatCount="indefinite" keyTimes="0;0.35;0.45;0.55;0.65;1"/>
              <animate attributeName="fill" values="#DA70D6;#D8BFD8;#C8A2C8;#DA70D6" dur="70s" begin="-15s" repeatCount="indefinite" />
            </path>
            <path d="M0,-35 Q18,-50 35,-35 T70,-35 Q50,-18 35,0 T0,0 Q-18,-18 -35,0 T-70,-35 Q-50,-50 -35,-35 T0,-35Z" fill="#FFB6C1" opacity="0" transform="rotate(240)">
              <animateTransform attributeName="transform" type="scale" values="1.02;0.92;1.05;0.95;1.02" dur="25s" begin="16s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" keySplines="0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1"/>
              <animate attributeName="opacity" values="0;0;0.5;0.5;0;0" dur="25s" begin="16s" repeatCount="indefinite" keyTimes="0;0.35;0.45;0.55;0.65;1"/>
              <animate attributeName="fill" values="#FFB6C1;#FFC0CB;#FFDAB9;#FFB6C1" dur="70s" begin="-30s" repeatCount="indefinite" />
            </path>
          </g>
        </g>

        <g id="rippleContainer" :filter="`url(#${rippleGlowFilterId})`">
          <circle cx="0" cy="0" r="10" :stroke="`url(#${rippleWaveGradientId})`" stroke-width="1.2" fill="none" opacity="0.6">
            <animate attributeName="r" values="30;150" dur="7s" begin="0s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.1 0.7 0.9 1"/>
            <animate attributeName="opacity" values="0.6;0;0;0.6;0" dur="7s" begin="0s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.7;0.8;0.9;1" keySplines="0.5 0 1 0.5;0.5 0 1 0.5;0.5 0 1 0.5;0.5 0 1 0.5"/>
            <animate attributeName="stroke-width" values="1.2;0.3" dur="7s" begin="0s" repeatCount="indefinite"/>
          </circle>
          <circle cx="0" cy="0" r="10" :stroke="`url(#${rippleWaveGradientId})`" stroke-width="1.2" fill="none" opacity="0.6">
            <animate attributeName="r" values="30;150" dur="7s" begin="1.8s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.1 0.7 0.9 1"/>
            <animate attributeName="opacity" values="0.6;0;0;0.6;0" dur="7s" begin="1.8s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.7;0.8;0.9;1" keySplines="0.5 0 1 0.5;0.5 0 1 0.5;0.5 0 1 0.5;0.5 0 1 0.5"/>
            <animate attributeName="stroke-width" values="1.2;0.3" dur="7s" begin="1.8s" repeatCount="indefinite"/>
          </circle>
          <circle cx="0" cy="0" r="10" :stroke="`url(#${rippleWaveGradientId})`" stroke-width="1.0" fill="none" opacity="0.5">
            <animate attributeName="r" values="30;130" dur="8s" begin="3.5s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.1 0.7 0.9 1"/>
            <animate attributeName="opacity" values="0.5;0;0;0;0.5;0" dur="8s" begin="3.5s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.6;0.7;0.8;0.9;1" keySplines="0.5 0 1 0.5;0.5 0 1 0.5;0.5 0 1 0.5;0.5 0 1 0.5;0.5 0 1 0.5"/>
            <animate attributeName="stroke-width" values="1.0;0.2" dur="8s" begin="3.5s" repeatCount="indefinite"/>
          </circle>
          <circle cx="0" cy="0" r="10" :stroke="`url(#${rippleWaveGradientId})`" stroke-width="1.2" fill="none" opacity="0.6">
            <animate attributeName="r" values="30;150" dur="7s" begin="5.0s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.1 0.7 0.9 1"/>
            <animate attributeName="opacity" values="0.6;0;0;0.6;0" dur="7s" begin="5.0s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.7;0.8;0.9;1" keySplines="0.5 0 1 0.5;0.5 0 1 0.5;0.5 0 1 0.5;0.5 0 1 0.5"/>
            <animate attributeName="stroke-width" values="1.2;0.3" dur="7s" begin="5.0s" repeatCount="indefinite"/>
          </circle>
          <circle cx="0" cy="0" r="10" :stroke="`url(#${rippleWaveGradientId})`" stroke-width="1.0" fill="none" opacity="0.5">
            <animate attributeName="r" values="30;140" dur="7.5s" begin="6.8s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.1 0.7 0.9 1"/>
            <animate attributeName="opacity" values="0.5;0;0;0;0.5;0" dur="7.5s" begin="6.8s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.6;0.7;0.8;0.9;1" keySplines="0.5 0 1 0.5;0.5 0 1 0.5;0.5 0 1 0.5;0.5 0 1 0.5;0.5 0 1 0.5"/>
            <animate attributeName="stroke-width" values="1.0;0.2" dur="7.5s" begin="6.8s" repeatCount="indefinite"/>
          </circle>
          <circle cx="0" cy="0" r="10" :stroke="`url(#${rippleWaveGradientId})`" stroke-width="1.2" fill="none" opacity="0.6">
            <animate attributeName="r" values="30;150" dur="7s" begin="8.2s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.1 0.7 0.9 1"/>
            <animate attributeName="opacity" values="0.6;0;0;0.6;0" dur="7s" begin="8.2s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.7;0.8;0.9;1" keySplines="0.5 0 1 0.5;0.5 0 1 0.5;0.5 0 1 0.5;0.5 0 1 0.5"/>
            <animate attributeName="stroke-width" values="1.2;0.3" dur="7s" begin="8.2s" repeatCount="indefinite"/>
          </circle>

          <circle cx="0" cy="0" r="20" :stroke="`url(#${corePulseGradientId})`" stroke-width="3.5" fill="none" opacity="0.75">
            <animate attributeName="r" values="40;280" dur="7.5s" begin="0s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.2 0.6 0.8 1"/>
            <animate attributeName="opacity" values="0.75;0" dur="7.5s" begin="0s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 1 0.6"/>
            <animate attributeName="stroke-width" values="3.5;12;1.5" dur="7.5s" begin="0s" repeatCount="indefinite"/>
          </circle>
          <circle cx="0" cy="0" r="20" :stroke="`url(#${corePulseGradientId})`" stroke-width="3.5" fill="none" opacity="0.75">
            <animate attributeName="r" values="40;280" dur="7.5s" begin="1.5s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.2 0.6 0.8 1"/>
            <animate attributeName="opacity" values="0.75;0" dur="7.5s" begin="1.5s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 1 0.6"/>
            <animate attributeName="stroke-width" values="3.5;12;1.5" dur="7.5s" begin="1.5s" repeatCount="indefinite"/>
          </circle>
          <circle cx="0" cy="0" r="20" :stroke="`url(#${corePulseGradientId})`" stroke-width="3.5" fill="none" opacity="0.75">
            <animate attributeName="r" values="40;280" dur="7.5s" begin="3.0s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.2 0.6 0.8 1"/>
            <animate attributeName="opacity" values="0.75;0" dur="7.5s" begin="3.0s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 1 0.6"/>
            <animate attributeName="stroke-width" values="3.5;12;1.5" dur="7.5s" begin="3.0s" repeatCount="indefinite"/>
          </circle>
          <circle cx="0" cy="0" r="20" :stroke="`url(#${corePulseGradientId})`" stroke-width="3.5" fill="none" opacity="0.75">
            <animate attributeName="r" values="40;280" dur="7.5s" begin="4.5s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.2 0.6 0.8 1"/>
            <animate attributeName="opacity" values="0.75;0" dur="7.5s" begin="4.5s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 1 0.6"/>
            <animate attributeName="stroke-width" values="3.5;12;1.5" dur="7.5s" begin="4.5s" repeatCount="indefinite"/>
          </circle>
          <circle cx="0" cy="0" r="20" :stroke="`url(#${corePulseGradientId})`" stroke-width="3.5" fill="none" opacity="0.75">
            <animate attributeName="r" values="40;280" dur="7.5s" begin="6.0s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.2 0.6 0.8 1"/>
            <animate attributeName="opacity" values="0.75;0" dur="7.5s" begin="6.0s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 1 0.6"/>
            <animate attributeName="stroke-width" values="3.5;12;1.5" dur="7.5s" begin="6.0s" repeatCount="indefinite"/>
          </circle>

          <circle cx="0" cy="0" r="50" :fill="`url(#${sparkleGradientId})`" opacity="0.45">
            <animate attributeName="r" values="50;380" dur="11s" begin="0s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.3 0.5 0.7 1"/>
            <animate attributeName="opacity" values="0.45;0;0;0.45;0" dur="11s" begin="0s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.7;0.8;0.9;1" keySplines="0.6 0 1 0.4;0.6 0 1 0.4;0.6 0 1 0.4;0.6 0 1 0.4"/>
          </circle>
          <circle cx="0" cy="0" r="50" :fill="`url(#${sparkleGradientId})`" opacity="0.45">
            <animate attributeName="r" values="50;380" dur="11s" begin="2.8s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.3 0.5 0.7 1"/>
            <animate attributeName="opacity" values="0.45;0;0;0.45;0" dur="11s" begin="2.8s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.7;0.8;0.9;1" keySplines="0.6 0 1 0.4;0.6 0 1 0.4;0.6 0 1 0.4;0.6 0 1 0.4"/>
          </circle>
          <circle cx="0" cy="0" r="50" :fill="`url(#${sparkleGradientId})`" opacity="0.40">
            <animate attributeName="r" values="50;360" dur="12s" begin="5.5s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.3 0.5 0.7 1"/>
            <animate attributeName="opacity" values="0.40;0;0;0;0.40;0" dur="12s" begin="5.5s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.6;0.7;0.8;0.9;1" keySplines="0.6 0 1 0.4;0.6 0 1 0.4;0.6 0 1 0.4;0.6 0 1 0.4;0.6 0 1 0.4"/>
          </circle>
          <circle cx="0" cy="0" r="50" :fill="`url(#${sparkleGradientId})`" opacity="0.45">
            <animate attributeName="r" values="50;380" dur="11s" begin="8.0s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.3 0.5 0.7 1"/>
            <animate attributeName="opacity" values="0.45;0;0;0.45;0" dur="11s" begin="8.0s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.7;0.8;0.9;1" keySplines="0.6 0 1 0.4;0.6 0 1 0.4;0.6 0 1 0.4;0.6 0 1 0.4"/>
          </circle>
        </g>

        <g id="backgroundEnergy">
          <circle cx="-50" cy="-80" r="2" :fill="`url(#${sparkleGradientId})`" opacity="0">
            <animate attributeName="cx" values="-50;100;250;400;550;700;850" dur="35s" repeatCount="indefinite" begin="0s"/>
            <animate attributeName="cy" values="-80;-40;-100;-30;-120;-20;-90" dur="35s" repeatCount="indefinite" begin="0s"/>
            <animate attributeName="r" values="1;3;1.5;2.5;1;3;1.5" dur="22s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0;0.5;0.5;0;0;0;0;0.6;0.6;0;0" dur="35s" repeatCount="indefinite" begin="0s"/>
          </circle>
          <circle cx="850" cy="580" r="1.5" :fill="`url(#${sparkleGradientId})`" opacity="0">
            <animate attributeName="cx" values="850;700;550;400;250;100;-50" dur="38s" repeatCount="indefinite" begin="-5s"/>
            <animate attributeName="cy" values="580;540;600;530;610;520;590" dur="38s" repeatCount="indefinite" begin="-5s"/>
            <animate attributeName="r" values="2;1;2.5;1.5;3;1;2" dur="25s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0;0;0.6;0.6;0;0;0;0;0.5;0.5;0;0" dur="38s" repeatCount="indefinite" begin="-5s"/>
          </circle>
          <path d="M0,0 L2,1 L1,3 Z" fill="rgba(200,220,255,0.4)">
            <animateMotion path="M100,50 C150,0 250,100 300,50 S450,0 500,50 S650,100 700,50 C750,0 850,100 900,50" dur="30s" rotate="auto" repeatCount="indefinite" begin="-2s"/>
            <animate attributeName="opacity" values="0;0;0.4;0;0;0.5;0;0" dur="8s" repeatCount="indefinite" begin="-2s" />
            <animateTransform attributeName="transform" type="scale" values="1;1.6;1;1.4;1" additive="sum" dur="8s" repeatCount="indefinite" />
          </path>
          <path d="M0,0 L2,1 L1,3 Z" fill="rgba(220,200,255,0.4)" transform="translate(0, 450)">
            <animateMotion path="M700,50 C650,100 550,0 500,50 S350,100 300,50 S150,0 100,50 C50,100 -50,0 -100,50" dur="33s" rotate="auto" repeatCount="indefinite" begin="-8s"/>
            <animate attributeName="opacity" values="0;0;0;0.5;0;0;0.4;0" dur="7s" repeatCount="indefinite" begin="-8s" />
            <animateTransform attributeName="transform" type="scale" values="1;1.4;1;1.5;1" additive="sum" dur="7s" repeatCount="indefinite" />
          </path>
        </g>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, type PropType } from 'vue';
import type { AppState } from '@/store/reactive.store'; // Assuming AppState is exported

const props = defineProps({
  size: {
    type: Number as PropType<number>,
    default: 40,
  },
  appState: {
    type: String as PropType<AppState>,
    default: 'idle',
  },
  interactive: {
    type: Boolean as PropType<boolean>,
    default: true,
  },
  title: { // For accessibility and tooltip
    type: String as PropType<string>,
    default: 'Hearing status',
  }
});

const emit = defineEmits<{
  (e: 'click'): void;
}>();

const instance = getCurrentInstance();
const uid = instance?.uid || Math.random().toString(36).substring(2); // Fallback for UID

// Computed IDs for SVG definitions to ensure uniqueness if multiple instances are used
const corePulseGradientId = computed(() => `corePulseGradient-${uid}`);
const rippleWaveGradientId = computed(() => `rippleWaveGradient-${uid}`);
const sparkleGradientId = computed(() => `sparkleGradient-${uid}`);
const softGlowFilterId = computed(() => `softGlowFilter-${uid}`);
const rippleGlowFilterId = computed(() => `rippleGlowFilter-${uid}`);

const wrapperClasses = computed(() => [
  'hearing-svg-wrapper',
  `state-${props.appState}`,
  { 'is-interactive': props.interactive },
]);

const wrapperStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}));

const ariaLabel = computed(() => props.title || `Hearing status: ${props.appState}`);

const handleClick = () => {
  if (props.interactive) {
    emit('click');
  }
};
</script>

<style lang="scss" scoped>
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;

.hearing-svg-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative; // For potential pseudo-elements or overlays based on state

  &.is-interactive {
    cursor: pointer;
    &:hover {
      // Example: subtle scale effect on hover for the wrapper
      transform: scale(1.05);
      transition: transform var.$duration-quick var.$ease-out-cubic;
    }
    &:focus-visible {
        @include mixins.focus-ring(
            '--color-bg-primary', // Or a more appropriate background context
            '--color-accent-interactive',
            2px,
            2px,
            0.8
        );
        border-radius: 50%; // Assuming circular focus for an icon
    }
  }

  .hearing-smil-svg {
    display: block;
    max-width: 100%;
    max-height: 100%;
    overflow: visible; // As per original HearingIndicator style for SVG
  }

  // Example of how you might add external state indicators
  // These would be styled based on .state-idle, .state-listening, etc.
  // For example, a border pulse:
  &.state-listening::before {
    content: '';
    position: absolute;
    inset: -4px; // Position outside the SVG
    border: 2px solid hsla(var(--color-voice-user-h, 200), var(--color-voice-user-s, 80%), var(--color-voice-user-l, 60%), 0.5);
    border-radius: 50%;
    animation: external-pulse 1.5s ease-out infinite;
    pointer-events: none;
  }

  &.state-speaking::before, &.state-responding::before {
    content: '';
    position: absolute;
    inset: -4px;
    border: 2px solid hsla(var(--color-voice-ai-speaking-h, 340), var(--color-voice-ai-speaking-s, 80%), var(--color-voice-ai-speaking-l, 70%), 0.5);
    border-radius: 50%;
    animation: external-pulse 1.2s ease-out infinite;
    pointer-events: none;
  }
}

@keyframes external-pulse {
  0% {
    transform: scale(0.9);
    opacity: 0.7;
  }
  70% {
    transform: scale(1.2);
    opacity: 0;
  }
  100% {
    transform: scale(1.2);
    opacity: 0;
  }
}
</style>