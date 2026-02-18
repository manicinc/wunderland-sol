<script setup lang="ts">
import { computed } from 'vue';

type GlyphName =
  | 'spark'
  | 'arrow-left'
  | 'currency'
  | 'check'
  | 'lightbulb'
  | 'rocket'
  | 'people'
  | 'prism'
  | 'cube'
  | 'academic'
  | 'sliders'
  | 'chevron'
  | 'orbit'
  | 'layers'
  | 'wave'
  | 'code'
  | 'map'
  | 'shield'
  | 'mic';

const props = withDefaults(defineProps<{
  name: GlyphName;
  size?: number | string;
}>(), {
  size: 28,
});

const sizePx = computed(() => {
  if (typeof props.size === 'number') return props.size;
  const numeric = parseFloat(String(props.size));
  return Number.isFinite(numeric) ? numeric : 28;
});

const uid = `animated-glyph-${Math.random().toString(36).slice(2, 9)}`;
const gradientId = (suffix: string) => `${uid}-${suffix}`;

const accentPrimary = 'var(--color-accent-primary, #8B5CF6)';
const accentSecondary = 'var(--color-accent-secondary, #38BDF8)';
const accentTertiary = 'var(--color-info, #0EA5E9)';
const successColor = 'var(--color-success, #22C55E)';
const warningColor = 'var(--color-warning, #F59E0B)';
const textPrimary = 'var(--color-text-primary, #FFFFFF)';
const borderColor = 'var(--color-border-primary, rgba(148,163,184,0.55))';
const subtleGlow = 'var(--color-bg-secondary, rgba(148, 163, 184, 0.12))';
</script>

<template>
  <!-- Spark burst -->
  <svg
    v-if="props.name === 'spark'"
    class="animated-glyph"
    v-bind="$attrs"
    :width="sizePx"
    :height="sizePx"
    viewBox="0 0 64 64"
    fill="none"
  >
    <defs>
      <linearGradient
        :id="gradientId('spark-stroke')"
        x1="12"
        y1="12"
        x2="52"
        y2="52"
        gradientUnits="userSpaceOnUse"
      >
        <stop :stop-color="accentPrimary">
          <animate attributeName="stop-color" :values="`${accentPrimary};${accentSecondary};${accentPrimary}`" dur="6s" repeatCount="indefinite" />
        </stop>
        <stop :stop-color="accentSecondary">
          <animate attributeName="stop-color" :values="`${accentSecondary};${accentTertiary};${accentSecondary}`" dur="6s" repeatCount="indefinite" />
        </stop>
      </linearGradient>
      <radialGradient :id="gradientId('spark-core')" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(32 32) scale(12)">
        <stop offset="0" :stop-color="accentSecondary" stop-opacity="0.95" />
        <stop offset="1" :stop-color="accentSecondary" stop-opacity="0.05" />
      </radialGradient>
    </defs>
    <polygon
      :points="'32,7 38,24 57,26 42,38 48,55 32,45 16,55 22,38 7,26 26,24'"
      :stroke="`url(#${gradientId('spark-stroke')})`"
      stroke-width="3"
      stroke-linejoin="round"
      fill="none"
    >
      <animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="12s" repeatCount="indefinite" />
    </polygon>
    <circle
      cx="32"
      cy="32"
      r="11"
      :fill="`url(#${gradientId('spark-core')})`"
    >
      <animate attributeName="r" values="10;12;10" dur="4s" repeatCount="indefinite" />
    </circle>
  </svg>

  <!-- Arrow Left -->
  <svg
    v-else-if="props.name === 'arrow-left'"
    class="animated-glyph"
    v-bind="$attrs"
    :width="sizePx"
    :height="sizePx"
    viewBox="0 0 64 64"
    fill="none"
  >
    <defs>
      <linearGradient :id="gradientId('arrow')" x1="16" y1="12" x2="56" y2="52" gradientUnits="userSpaceOnUse">
        <stop :stop-color="accentSecondary" />
        <stop offset="1" :stop-color="accentPrimary" />
      </linearGradient>
    </defs>
    <path
      d="M40 16 L24 32 L40 48"
      :stroke="`url(#${gradientId('arrow')})`"
      stroke-width="4"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-dasharray="36"
    >
      <animate attributeName="stroke-dashoffset" values="36;0" dur="1.8s" repeatCount="indefinite" />
    </path>
    <line
      x1="24"
      y1="32"
      x2="50"
      y2="32"
      :stroke="`url(#${gradientId('arrow')})`"
      stroke-width="4"
      stroke-linecap="round"
      stroke-dasharray="30"
    >
      <animate attributeName="stroke-dashoffset" values="30;0" dur="1.8s" repeatCount="indefinite" />
    </line>
  </svg>

  <!-- Currency -->
  <svg
    v-else-if="props.name === 'currency'"
    class="animated-glyph"
    v-bind="$attrs"
    :width="sizePx"
    :height="sizePx"
    viewBox="0 0 64 64"
    fill="none"
  >
    <defs>
      <radialGradient :id="gradientId('currency-fill')" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(32 32) scale(30)">
        <stop offset="0" :stop-color="accentSecondary" stop-opacity="0.8" />
        <stop offset="1" :stop-color="accentPrimary" stop-opacity="0.1" />
      </radialGradient>
    </defs>
    <circle
      cx="32"
      cy="32"
      r="24"
      :fill="`url(#${gradientId('currency-fill')})`"
      :stroke="accentPrimary"
      stroke-width="2"
      stroke-opacity="0.35"
    />
    <path
      d="M38 21C36.2 19.2 33.8 18 30.8 18C25.6 18 22 21.4 22 26C22 33 34 31 34 38C34 41.4 31.6 44 27.9 44C24.6 44 21.8 42.5 20 40"
      :stroke="accentSecondary"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-dasharray="60"
    >
      <animate attributeName="stroke-dashoffset" values="60;0" dur="2.8s" repeatCount="indefinite" />
    </path>
    <line x1="32" y1="16" x2="32" y2="48" :stroke="accentPrimary" stroke-width="2" stroke-linecap="round" stroke-dasharray="32" opacity="0.6">
      <animate attributeName="stroke-dashoffset" values="0;32;0" dur="3.6s" repeatCount="indefinite" />
    </line>
  </svg>

  <!-- Check -->
  <svg
    v-else-if="props.name === 'check'"
    class="animated-glyph"
    v-bind="$attrs"
    :width="sizePx"
    :height="sizePx"
    viewBox="0 0 64 64"
    fill="none"
  >
    <circle cx="32" cy="32" r="20" :stroke="successColor" stroke-width="3" stroke-dasharray="8 6" opacity="0.4">
      <animate attributeName="stroke-dashoffset" values="0;14" dur="2.4s" repeatCount="indefinite" />
    </circle>
    <path
      d="M22 33.5L29.5 40.5L42.5 24"
      :stroke="successColor"
      stroke-width="4"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-dasharray="40"
    >
      <animate attributeName="stroke-dashoffset" values="40;0;40" keyTimes="0;0.4;1" dur="2.6s" repeatCount="indefinite" />
    </path>
  </svg>

  <!-- Lightbulb -->
  <svg
    v-else-if="props.name === 'lightbulb'"
    class="animated-glyph"
    v-bind="$attrs"
    :width="sizePx"
    :height="sizePx"
    viewBox="0 0 64 64"
    fill="none"
  >
    <defs>
      <radialGradient :id="gradientId('lightbulb-glow')" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(32 24) scale(22)">
        <stop offset="0" :stop-color="warningColor" stop-opacity="0.8" />
        <stop offset="1" :stop-color="warningColor" stop-opacity="0.05" />
      </radialGradient>
    </defs>
    <circle
      cx="32"
      cy="26"
      r="16"
      :fill="`url(#${gradientId('lightbulb-glow')})`"
    >
      <animate attributeName="r" values="14;16;14" dur="4s" repeatCount="indefinite" />
    </circle>
    <path
      d="M32 14C24.8 14 19 19.7 19 26.8C19 31 20.5 35.4 24.2 38.8C26 40.5 27 43 27 45.6V48H37V45.6C37 43 38 40.4 39.8 38.8C43.5 35.4 45 31 45 26.8C45 19.7 39.2 14 32 14Z"
      :stroke="warningColor"
      stroke-width="2"
      fill="none"
    />
    <rect x="27" y="48" width="10" height="6" rx="2" :fill="warningColor" opacity="0.35" />
    <line x1="27" y1="52" x2="37" y2="52" :stroke="warningColor" stroke-width="2" stroke-linecap="round" opacity="0.6">
      <animate attributeName="stroke-dashoffset" values="0;8;0" dur="2.2s" repeatCount="indefinite" />
    </line>
  </svg>

  <!-- Rocket -->
  <svg
    v-else-if="props.name === 'rocket'"
    class="animated-glyph"
    v-bind="$attrs"
    :width="sizePx"
    :height="sizePx"
    viewBox="0 0 64 64"
    fill="none"
  >
    <defs>
      <linearGradient :id="gradientId('rocket-body')" x1="24" y1="10" x2="40" y2="54" gradientUnits="userSpaceOnUse">
        <stop :stop-color="accentPrimary" />
        <stop offset="1" :stop-color="accentSecondary" />
      </linearGradient>
      <linearGradient :id="gradientId('rocket-trail')" x1="28" y1="50" x2="36" y2="62" gradientUnits="userSpaceOnUse">
        <stop offset="0" :stop-color="accentSecondary" stop-opacity="0.9" />
        <stop offset="1" :stop-color="accentSecondary" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path
      d="M32 8C24 16 21.5 30 22.5 40L32 54L41.5 40C42.5 30 40 16 32 8Z"
      :fill="`url(#${gradientId('rocket-body')})`"
      :stroke="accentSecondary"
      stroke-width="1.5"
    />
    <circle cx="32" cy="26" r="6" fill="rgba(15,23,42,0.85)" :stroke="accentSecondary" stroke-width="1.5">
      <animate attributeName="r" values="5.5;6;5.5" dur="3s" repeatCount="indefinite" />
    </circle>
    <path
      d="M32 54L28 44L20 44"
      :stroke="accentPrimary"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M32 54L36 44L44 44"
      :stroke="accentPrimary"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M32 54C32 54 29 60 29 62C29 63.1 34.9 63.1 35 62C35.1 60 32 54 32 54Z"
      :fill="`url(#${gradientId('rocket-trail')})`"
    >
      <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2.2s" repeatCount="indefinite" />
    </path>
  </svg>

  <!-- People -->
  <svg
    v-else-if="props.name === 'people'"
    class="animated-glyph"
    v-bind="$attrs"
    :width="sizePx"
    :height="sizePx"
    viewBox="0 0 64 64"
    fill="none"
  >
    <circle cx="24" cy="26" r="8" :stroke="accentSecondary" stroke-width="2.4" fill="none" />
    <circle cx="40" cy="26" r="7" :stroke="accentPrimary" stroke-width="2" fill="none" opacity="0.7" />
    <path
      d="M16 46C16 38 22 36 24 36C26 36 32 38 32 46"
      :stroke="accentSecondary"
      stroke-width="2.4"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
    >
      <animate attributeName="stroke-dashoffset" values="0;12;0" dur="2.6s" repeatCount="indefinite" />
    </path>
    <path
      d="M34 45.5C34 39.5 38.5 38 40 38C41.5 38 46 39.6 46 45.5"
      :stroke="accentPrimary"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
      opacity="0.7"
    >
      <animate attributeName="stroke-dashoffset" values="8;0;8" dur="3.2s" repeatCount="indefinite" />
    </path>
  </svg>

  <!-- Prism / Transform -->
  <svg
    v-else-if="props.name === 'prism'"
    class="animated-glyph"
    v-bind="$attrs"
    :width="sizePx"
    :height="sizePx"
    viewBox="0 0 64 64"
    fill="none"
  >
    <defs>
      <linearGradient :id="gradientId('prism')" x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop :stop-color="accentSecondary" />
        <stop offset="1" :stop-color="accentPrimary" />
      </linearGradient>
    </defs>
    <polygon
      :points="'32,12 52,44 12,44'"
      :stroke="`url(#${gradientId('prism')})`"
      stroke-width="3"
      stroke-linejoin="round"
      fill="rgba(30, 64, 175, 0.08)"
    >
      <animateTransform attributeName="transform" type="scale" values="1;1.05;1" dur="5s" repeatCount="indefinite" additive="sum" />
    </polygon>
    <line x1="32" y1="12" x2="32" y2="44" :stroke="accentSecondary" stroke-width="2" stroke-dasharray="4 6" opacity="0.7">
      <animate attributeName="stroke-dashoffset" values="0;10" dur="2.4s" repeatCount="indefinite" />
    </line>
  </svg>

  <!-- Cube -->
  <svg
    v-else-if="props.name === 'cube'"
    class="animated-glyph"
    v-bind="$attrs"
    :width="sizePx"
    :height="sizePx"
    viewBox="0 0 64 64"
    fill="none"
  >
    <path
      d="M18 22L32 14L46 22V42L32 50L18 42V22Z"
      :stroke="accentSecondary"
      stroke-width="2.2"
      stroke-linejoin="round"
      fill="rgba(56, 189, 248, 0.08)"
    />
    <path
      d="M18 22L32 30L46 22"
      :stroke="accentPrimary"
      stroke-width="2"
      stroke-linejoin="round"
      fill="none"
    >
      <animate attributeName="stroke-dashoffset" values="0;12;0" dur="3.6s" repeatCount="indefinite" />
    </path>
    <path
      d="M32 30V50"
      :stroke="accentPrimary"
      stroke-width="2"
      stroke-linejoin="round"
      fill="none"
      opacity="0.6"
    />
  </svg>

  <!-- Academic -->
  <svg
    v-else-if="props.name === 'academic'"
    class="animated-glyph"
    v-bind="$attrs"
    :width="sizePx"
    :height="sizePx"
    viewBox="0 0 64 64"
    fill="none"
  >
    <path
      d="M12 26L32 16L52 26L32 36L12 26Z"
      :stroke="accentSecondary"
      stroke-width="2"
      stroke-linejoin="round"
      fill="rgba(56, 189, 248, 0.12)"
    />
    <path
      d="M20 30V40C20 43 22 46 32 46C42 46 44 43 44 40V30"
      :stroke="accentPrimary"
      stroke-width="2"
      stroke-linejoin="round"
      fill="none"
    />
    <line x1="32" y1="36" x2="32" y2="50" :stroke="accentSecondary" stroke-width="2" stroke-linecap="round" opacity="0.7">
      <animate attributeName="stroke-dashoffset" values="6;0;6" dur="2.4s" repeatCount="indefinite" />
    </line>
  </svg>

  <!-- Sliders -->
  <svg
    v-else-if="props.name === 'sliders'"
    class="animated-glyph"
    v-bind="$attrs"
    :width="sizePx"
    :height="sizePx"
    viewBox="0 0 64 64"
    fill="none"
  >
    <line x1="18" y1="20" x2="50" y2="20" :stroke="accentSecondary" stroke-width="3" stroke-linecap="round" stroke-dasharray="28">
      <animate attributeName="stroke-dashoffset" values="28;0;28" dur="4s" repeatCount="indefinite" />
    </line>
    <line x1="18" y1="32" x2="50" y2="32" :stroke="accentPrimary" stroke-width="3" stroke-linecap="round" stroke-dasharray="32">
      <animate attributeName="stroke-dashoffset" values="0;32;0" dur="3.2s" repeatCount="indefinite" />
    </line>
    <line x1="18" y1="44" x2="50" y2="44" :stroke="accentSecondary" stroke-width="3" stroke-linecap="round" stroke-dasharray="24">
      <animate attributeName="stroke-dashoffset" values="24;0;24" dur="3.6s" repeatCount="indefinite" />
    </line>
    <circle cx="28" cy="20" r="4" :fill="accentSecondary" opacity="0.65">
      <animate attributeName="cx" values="28;38;28" dur="4s" repeatCount="indefinite" />
    </circle>
    <circle cx="42" cy="32" r="4.5" :fill="accentPrimary" opacity="0.7">
      <animate attributeName="cx" values="42;26;42" dur="3.2s" repeatCount="indefinite" />
    </circle>
    <circle cx="30" cy="44" r="3.8" :fill="accentSecondary" opacity="0.6">
      <animate attributeName="cx" values="30;44;30" dur="3.6s" repeatCount="indefinite" />
    </circle>
  </svg>

  <!-- Chevron -->
  <svg
    v-else-if="props.name === 'chevron'"
    class="animated-glyph"
    v-bind="$attrs"
    :width="sizePx"
    :height="sizePx"
    viewBox="0 0 64 64"
    fill="none"
  >
    <polyline
      points="18,26 32,38 46,26"
      :stroke="accentSecondary"
      stroke-width="4"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-dasharray="40"
    >
      <animate attributeName="stroke-dashoffset" values="40;0" dur="1.6s" repeatCount="indefinite" />
    </polyline>
  </svg>

  <!-- Orbit -->
  <svg
    v-else-if="props.name === 'orbit'"
    class="animated-glyph"
    v-bind="$attrs"
    :width="sizePx"
    :height="sizePx"
    viewBox="0 0 64 64"
    fill="none"
  >
    <circle cx="32" cy="32" r="10" :fill="accentPrimary" opacity="0.15" />
    <circle cx="32" cy="32" r="9" :stroke="accentPrimary" stroke-width="2" stroke-dasharray="6 4">
      <animate attributeName="stroke-dashoffset" values="0;20" dur="4s" repeatCount="indefinite" />
    </circle>
    <path
      d="M16 32C16 22 22 16 32 16C42 16 48 22 48 32C48 42 42 48 32 48C22 48 16 42 16 32Z"
      :stroke="accentSecondary"
      stroke-width="2"
      stroke-dasharray="100"
    >
      <animate attributeName="stroke-dashoffset" values="0;100" dur="6s" repeatCount="indefinite" />
    </path>
    <circle cx="45" cy="24" r="3" :fill="accentSecondary">
      <animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="6s" repeatCount="indefinite" />
    </circle>
  </svg>

  <!-- Layers -->
  <svg
    v-else-if="props.name === 'layers'"
    class="animated-glyph"
    v-bind="$attrs"
    :width="sizePx"
    :height="sizePx"
    viewBox="0 0 64 64"
    fill="none"
  >
    <polygon points="32,14 56,26 32,38 8,26" :fill="accentSecondary" opacity="0.12" :stroke="accentSecondary" stroke-width="1.8" />
    <polygon points="32,26 56,38 32,50 8,38" :fill="accentPrimary" opacity="0.1" :stroke="accentPrimary" stroke-width="1.8">
      <animateTransform attributeName="transform" type="translate" values="0 0;0 -2;0 0" dur="3.6s" repeatCount="indefinite" />
    </polygon>
    <polygon points="32,20 56,32 32,44 8,32" fill="none" :stroke="accentPrimary" stroke-width="1.4" stroke-dasharray="6 6">
      <animate attributeName="stroke-dashoffset" values="0;12;0" dur="3.2s" repeatCount="indefinite" />
    </polygon>
  </svg>

  <!-- Wave -->
  <svg
    v-else-if="props.name === 'wave'"
    class="animated-glyph"
    v-bind="$attrs"
    :width="sizePx"
    :height="sizePx"
    viewBox="0 0 64 64"
    fill="none"
  >
    <path
      d="M12 38C18 32 22 32 28 38C34 44 38 44 44 38C50 32 54 32 60 38"
      :stroke="accentSecondary"
      stroke-width="2.8"
      stroke-linecap="round"
      stroke-dasharray="50"
    >
      <animate attributeName="stroke-dashoffset" values="50;0;50" dur="4s" repeatCount="indefinite" />
    </path>
    <path
      d="M12 28C18 22 22 22 28 28C34 34 38 34 44 28C50 22 54 22 60 28"
      :stroke="accentPrimary"
      stroke-width="2"
      stroke-linecap="round"
      stroke-opacity="0.6"
      stroke-dasharray="50"
    >
      <animate attributeName="stroke-dashoffset" values="0;50;0" dur="4s" repeatCount="indefinite" />
    </path>
  </svg>

  <!-- Code -->
  <svg
    v-else-if="props.name === 'code'"
    class="animated-glyph"
    v-bind="$attrs"
    :width="sizePx"
    :height="sizePx"
    viewBox="0 0 64 64"
    fill="none"
  >
    <defs>
      <radialGradient :id="gradientId('code-bg')" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(32 32) scale(26)">
        <stop offset="0" :stop-color="accentSecondary" stop-opacity="0.18" />
        <stop offset="1" :stop-color="accentPrimary" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect x="14" y="16" width="36" height="32" rx="8" :fill="`url(#${gradientId('code-bg')})`" :stroke="borderColor" stroke-width="1.5" stroke-dasharray="6 5">
      <animate attributeName="stroke-dashoffset" values="0;22" dur="3.8s" repeatCount="indefinite" />
    </rect>
    <polyline
      points="26,24 20,32 26,40"
      :stroke="accentSecondary"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-dasharray="28"
    >
      <animate attributeName="stroke-dashoffset" values="28;0;28" dur="3.2s" repeatCount="indefinite" />
    </polyline>
    <polyline
      points="38,24 44,32 38,40"
      :stroke="accentPrimary"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-dasharray="28"
    >
      <animate attributeName="stroke-dashoffset" values="0;28;0" dur="3.2s" repeatCount="indefinite" />
    </polyline>
  </svg>

  <!-- Map -->
  <svg
    v-else-if="props.name === 'map'"
    class="animated-glyph"
    v-bind="$attrs"
    :width="sizePx"
    :height="sizePx"
    viewBox="0 0 64 64"
    fill="none"
  >
    <path
      d="M16 20L28 16L36 20L48 16V44L36 48L28 44L16 48V20Z"
      :stroke="accentPrimary"
      stroke-width="2"
      stroke-linejoin="round"
      fill="rgba(56, 189, 248, 0.08)"
    />
    <path
      d="M28 16V44"
      :stroke="accentSecondary"
      stroke-width="2"
      stroke-linejoin="round"
      fill="none"
    />
    <path
      d="M36 20V48"
      :stroke="accentSecondary"
      stroke-width="2"
      stroke-linejoin="round"
      fill="none"
    />
    <circle cx="32" cy="30" r="5" :stroke="accentSecondary" stroke-width="2" fill="none">
      <animate attributeName="stroke-dashoffset" values="0;18;0" dur="3s" repeatCount="indefinite" />
    </circle>
    <circle cx="32" cy="30" r="2.5" :fill="accentSecondary">
      <animateTransform attributeName="transform" type="scale" values="1;1.2;1" dur="3s" repeatCount="indefinite" />
    </circle>
  </svg>

  <!-- Shield -->
  <svg
    v-else-if="props.name === 'shield'"
    class="animated-glyph"
    v-bind="$attrs"
    :width="sizePx"
    :height="sizePx"
    viewBox="0 0 64 64"
    fill="none"
  >
    <path
      d="M32 10L16 16V30C16 42 23.2 50.5 32 54C40.8 50.5 48 42 48 30V16L32 10Z"
      :stroke="accentSecondary"
      stroke-width="2.2"
      stroke-linejoin="round"
      fill="rgba(56, 189, 248, 0.12)"
    />
    <path
      d="M24 32L30 38L40 26"
      :stroke="successColor"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-dasharray="36"
    >
      <animate attributeName="stroke-dashoffset" values="36;0;36" dur="3.4s" repeatCount="indefinite" />
    </path>
  </svg>

  <!-- Microphone -->
  <svg
    v-else-if="props.name === 'mic'"
    class="animated-glyph"
    v-bind="$attrs"
    :width="sizePx"
    :height="sizePx"
    viewBox="0 0 64 64"
    fill="none"
  >
    <rect x="24" y="14" width="16" height="26" rx="8" :stroke="accentSecondary" stroke-width="2" fill="rgba(56, 189, 248, 0.1)" />
    <path
      d="M20 30C20 38 25 44 32 44C39 44 44 38 44 30"
      :stroke="accentPrimary"
      stroke-width="2"
      stroke-linecap="round"
      fill="none"
    >
      <animate attributeName="stroke-dashoffset" values="24;0;24" dur="3s" repeatCount="indefinite" />
    </path>
    <line x1="32" y1="44" x2="32" y2="52" :stroke="accentSecondary" stroke-width="2" stroke-linecap="round" />
    <line x1="26" y1="52" x2="38" y2="52" :stroke="accentPrimary" stroke-width="2" stroke-linecap="round">
      <animate attributeName="stroke-dashoffset" values="0;12;0" dur="2.4s" repeatCount="indefinite" />
    </line>
    <circle cx="32" cy="22" r="4" :fill="accentPrimary" opacity="0.6">
      <animate attributeName="r" values="3.5;4.5;3.5" dur="2s" repeatCount="indefinite" />
    </circle>
  </svg>

  <!-- Default fallback -->
  <svg
    v-else
    class="animated-glyph"
    v-bind="$attrs"
    :width="sizePx"
    :height="sizePx"
    viewBox="0 0 64 64"
    fill="none"
  >
    <circle cx="32" cy="32" r="20" :stroke="accentPrimary" stroke-width="2" :fill="subtleGlow" />
  </svg>
</template>

<style scoped>
.animated-glyph {
  display: inline-block;
}
</style>
