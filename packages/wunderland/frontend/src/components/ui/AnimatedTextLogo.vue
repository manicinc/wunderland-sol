// File: frontend/src/components/ui/AnimatedTextLogo.vue
/**
 * @file AnimatedTextLogo.vue
 * @description A text-only variant of the VCA logo that animates
 *              “Voice Chat Assistant” on first mount and adapts its
 *              gradient/animation to theme + state (user-speaking /
 *              AI-processing).
 *
 * @component AnimatedTextLogo
 * @prop {boolean} [initialReveal=true]   – Run the intro animation once
 *                                         per mount.
 * @prop {boolean} [isUserListening]      – Triggers “listening” accent.
 * @prop {boolean} [isAiSpeaking]         – Triggers “AI active” accent.
 *
 * @version 1.0.1 – Added SCSS `@use variables as var` so Sass
 *                 namespace look-ups compile under Vite.
 */

<script setup lang="ts">
import { ref, onMounted, type PropType } from 'vue';

const props = defineProps({
  initialReveal: { type: Boolean as PropType<boolean>, default: true },
  isUserListening: { type: Boolean as PropType<boolean>, default: false },
  isAiSpeaking:   { type: Boolean as PropType<boolean>, default: false }
});

const didReveal = ref(!props.initialReveal);

onMounted(() => {
  if (props.initialReveal) requestAnimationFrame(() => { didReveal.value = true; });
});
</script>

<template>
  <h1
    class="vca-text-logo"
    :class="{
      reveal:       didReveal,
      listening:    props.isUserListening && !props.isAiSpeaking,
      aiActive:     props.isAiSpeaking
    }"
  >
    <span class="v">V</span><span class="c">C</span><span class="a mr-2">A</span>
    <span class="subtitle">Voice Chat Assistant</span>
  </h1>
</template>

<style lang="scss" scoped>
/* ▸ FIX: import the Sass variables namespace */
@use '@/styles/abstracts/variables' as var;

.vca-text-logo {
  --grad-start: hsl(var(--color-accent-primary-h),
                   var(--color-accent-primary-s),
                   var(--color-accent-primary-l));
  --grad-end:   hsl(var(--color-accent-secondary-h),
                   var(--color-accent-secondary-s),
                   var(--color-accent-secondary-l));

  font-family: var.$font-family-display;
  font-weight: 800;
  display: flex;
  align-items: baseline;
  gap: 0.15em;
  line-height: 1;

  /* main V C A letters */
  > .v, > .c, > .a {
    font-size: clamp(1.6rem, 5vw, 2rem);
    background: linear-gradient(120deg, var(--grad-start), var(--grad-end));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    opacity: 0;
    transform: translateY(0.7em);
    transition: opacity .6s var(--ease-out-quart),
                transform .6s var(--ease-out-quart);
  }

  /* subtitle */
  .subtitle {
    margin-left: .35em;
    font-size: clamp(.60rem, 2.1vw, .78rem);
    font-weight: 600;
    letter-spacing: .05em;
    color: hsl(var(--color-text-secondary-h),
               var(--color-text-secondary-s),
               var(--color-text-secondary-l));
    opacity: 0;
    transform: translateY(0.7em);
    transition: opacity .65s var(--ease-out-quart) .1s,
                transform .65s var(--ease-out-quart) .1s;
  }

  /* first-mount reveal */
  &.reveal {
    > .v, > .c, > .a,
    .subtitle {
      opacity: 1; transform: translateY(0);
    }
    > .v   { transition-delay: .00s; }
    > .c   { transition-delay: .07s; }
    > .a   { transition-delay: .14s; }
    .subtitle { transition-delay: .22s, .22s; }
  }

  /* reactive states */
  &.listening   { filter: drop-shadow(0 0 6px hsla(var(--color-voice-user-h),
                                                  var(--color-voice-user-s),
                                                  var(--color-voice-user-l), .7)); }

  &.aiActive    { filter: drop-shadow(0 0 6px hsla(var(--color-voice-ai-speaking-h),
                                                  var(--color-voice-ai-speaking-s),
                                                  var(--color-voice-ai-speaking-l), .75))
                            contrast(1.05); }
}
</style>
