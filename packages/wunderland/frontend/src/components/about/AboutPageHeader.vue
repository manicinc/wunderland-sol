<script setup lang="ts">
import AnimatedGlyph from '@/components/about/AnimatedGlyph.vue';

const emit = defineEmits<{
  (event: 'back'): void;
}>();
</script>

<template>
  <header class="about-header-ephemeral">
    <div class="header-content-container">
      <div class="logo-title-group text-center">
        <slot name="title" />
      </div>
      <button
        type="button"
        class="btn btn-secondary-ephemeral btn-sm back-button-ephemeral"
        @click="emit('back')"
      >
        <AnimatedGlyph name="arrow-left" class="icon-sm" :size="20" />
        Back to App
      </button>
    </div>
  </header>
</template>
