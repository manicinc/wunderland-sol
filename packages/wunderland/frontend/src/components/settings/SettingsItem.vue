// File: frontend/src/components/settings/SettingsItem.vue
/**
 * @file SettingsItem.vue
 * @description A reusable UI component for displaying a single setting item.
 * It includes a label, an optional description, and a slot for the input control.
 * @version 1.1.0 - Updated styles to use theme CSS custom properties for labels and descriptions, ensuring theme-wide consistency and readability.
 * @author Your Name / AI Architect
 */

<template>
  <div :class="['setting-item-wrapper', props.fullWidthDescription ? 'full-width-desc-item' : '']">
    <div class="setting-item-label-action">
      <label :for="props.labelFor" class="setting-label">
        {{ props.label }}
      </label>
      <div class="setting-control">
        <slot />
      </div>
    </div>
    <p v-if="props.description" class="setting-description">
      {{ props.description }}
    </p>
  </div>
</template>

<script setup lang="ts">

/**
 * @interface SettingsItemProps
 * @description Props definition for the SettingsItem component.
 */
interface SettingsItemProps {
  /**
   * @prop {string} label - The display label for the setting item.
   * @required
   */
  label: string;
  /**
   * @prop {string} [description] - An optional description or help text for the setting.
   * @optional
   */
  description?: string;
  /**
   * @prop {string} [labelFor] - The ID of the input control this label is associated with, for accessibility.
   * @optional
   */
  labelFor?: string;
  /**
   * @prop {boolean} [fullWidthDescription=false] - If true, the description will span the full width below the label and control,
   * suitable for longer descriptions or when the control is also full-width.
   * @default false
   * @optional
   */
  fullWidthDescription?: boolean;
}

const props = withDefaults(defineProps<SettingsItemProps>(), {
  fullWidthDescription: false,
});

</script>

<style scoped lang="postcss">
/**
 * Styles for the SettingsItem component.
 * These styles are scoped and aim to provide a clear and consistent layout for individual settings.
 * Colors now use CSS Custom Properties from the theme for better integration and readability across all themes.
 */
.setting-item-wrapper {
  @apply py-3 sm:py-4;
}

/* Modifier for when the description should be full width and appear below the control */
.setting-item-wrapper.full-width-desc-item .setting-item-label-action {
  @apply flex-col items-start; /* Stack label and control vertically */
}
.setting-item-wrapper.full-width-desc-item .setting-label {
  @apply mb-2; /* Add space between label and control */
}
.setting-item-wrapper.full-width-desc-item .setting-description {
  @apply pt-1.5 text-left; /* Ensure description aligns left */
}


.setting-item-label-action {
  @apply flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4;
}

.setting-label {
  @apply text-sm font-medium flex-shrink-0 cursor-default;
  /* Use theme's primary text color for labels for maximum clarity and boldness */
  color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
  opacity: 0.95; /* Slightly reduced opacity if needed, but primary text should generally be fully opaque */
}

.setting-control {
  @apply flex-grow flex sm:justify-end items-center;
  /* Ensures control area takes available space and aligns control to the right on larger screens */
}

/* Ensure the control itself doesn't unnecessarily expand beyond its content unless specified by its own styles */
.setting-item-label-action .setting-control {
  @apply w-full sm:w-auto;
}

.setting-description {
  @apply text-xs mt-1;
  /* Use theme's secondary text color for descriptions for good readability with slightly less emphasis */
  color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));
  opacity: 0.9; /* Ensure good opacity */
}

/* Default alignment for description when not full-width */
.setting-item-wrapper:not(.full-width-desc-item) .setting-item-label-action + .setting-description {
  @apply pt-1 sm:text-right; /* Aligns description to the right, below the control on small screens */
}
</style>