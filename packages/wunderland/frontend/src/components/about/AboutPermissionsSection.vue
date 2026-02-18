<script setup lang="ts">
import AnimatedGlyph from '@/components/about/AnimatedGlyph.vue';

const featureLines = [
  'Realtime transcription with browser-native STT or Whisper.',
  'Continuous listening for hands-free flow, with instant mute controls.',
  'Push-to-talk capture for precise, short-form dictation.',
  'Wake word activation ("Hey V") so you can stay focused on your work.',
  'Low-latency audio feedback that keeps the conversation natural.',
];
</script>

<template>
  <section id="permissions" class="permissions-section-about content-section-ephemeral">
    <h3 class="section-title-main">
      <AnimatedGlyph name="mic" class="section-title-icon" :size="36" />
      Microphone Permissions
    </h3>
    <div class="permissions-card card-glass-interactive">
      <h4>Why Voice Chat Assistant needs your mic</h4>
      <p class="mb-4">
        Voice Chat Assistant is designed for voice-first collaboration. Granting access unlocks the realtime features that make conversations effortless:
      </p>
      <ul class="permissions-features-list">
        <li v-for="line in featureLines" :key="line">
          <AnimatedGlyph name="wave" class="permissions-item-icon" :size="20" />
          <span>{{ line }}</span>
        </li>
      </ul>
      <p class="mt-4">
        <strong>Privacy first.</strong> Audio is processed either locally in your browser or securely streamed to the transcription provider you select. Nothing is stored or shared without your consent.
      </p>
      <p class="mt-4 text-sm opacity-80">
        You can revoke microphone permissions anytime in your browser settings, and the assistant immediately falls back to text input.
      </p>
    </div>
  </section>
</template>
