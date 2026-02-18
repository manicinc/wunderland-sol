// File: frontend/src/components/settings/SettingsSection.vue
/**
 * @file SettingsSection.vue
 * @description A reusable UI component to group related settings, styled as an
 * "Ephemeral Harmony" neomorphic card.
 * @version 1.1.0 - Corrected Tailwind class, applied neomorphic card style.
 */
<template>
  <section
    class="settings-section-card-ephemeral"
    :aria-labelledby="sectionTitleId"
  >
    <div v-if="title" class="section-header-ephemeral">
      <component
        :is="icon"
        v-if="icon"
        class="section-icon-ephemeral"
        aria-hidden="true"
      />
      <h2 :id="sectionTitleId" class="section-title-ephemeral">
        {{ title }}
      </h2>
    </div>
    <div class="section-content-ephemeral">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, type Component as VueComponent } from 'vue';

interface SettingsSectionProps {
  title: string;
  icon?: VueComponent;
}
const props = defineProps<SettingsSectionProps>();
const sectionTitleId = computed<string>(() => `${props.title.toLowerCase().replace(/\s+/g, '-')}-settings-title`);
</script>

<style lang="scss" scoped>
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;
@use '@/styles/components/cards' as cardsFile;

.settings-section-card-ephemeral {
  @include cardsFile.card-base-styles;
  @include cardsFile.card-neo-look;
  padding: var.$spacing-lg var.$spacing-xl;

  @media (max-width: var.$breakpoint-sm) {
    padding: var.$spacing-md var.$spacing-lg;
  }
}

.section-header-ephemeral {
  display: flex;
  align-items: center;
  gap: var.$spacing-md;
  padding-bottom: var.$spacing-md;
  margin-bottom: var.$spacing-lg;
  border-bottom: 1px solid hsla(var(--color-border-secondary-h), var(--color-border-secondary-s), var(--color-border-secondary-l), 0.3);
}

.section-icon-ephemeral {
  width: 1.75rem; // 28px
  height: 1.75rem;
  flex-shrink: 0;
  // Directly use themed HSL variables for the icon color
  color: hsl(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l));
  opacity: 0.85;
  // For dark mode, the HSL variables themselves should change if a different color is desired.
  // Or, you can use a specific dark mode variable if defined in your theme:
  // .is-dark-mode & { // If App.vue adds 'is-dark-mode' to html/body
  //   color: hsl(var(--color-accent-primary-dark-h, var(--color-accent-primary-h)), ...);
  // }
}

.section-title-ephemeral {
  font-size: var.$font-size-xl;
  font-weight: 600;
  color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
  line-height: 1.3;
  @include mixins.text-glow(
    '--color-accent-primary',
    4px,
    var.$default-color-accent-primary-h,
    var.$default-color-accent-primary-s,
    var.$default-color-accent-primary-l,
    0.4
  );
}

.section-content-ephemeral {
  // Styles for the content area if needed
}
</style>