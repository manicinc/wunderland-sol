// File: frontend/src/components/header/ThemeSelectionDropdown.vue
/**
 * @file ThemeSelectionDropdown.vue
 * @description A dedicated dropdown component for selecting application themes.
 * It dynamically lists themes from the ThemeManager and allows users to switch between them.
 * Styled according to the "Ephemeral Harmony" design system, utilizing shared dropdown styles.
 *
 * @component ThemeSelectionDropdown
 * @props None
 * @emits None directly, but interacts with `uiStore` which in turn calls `themeManager`.
 *
 * @example
 * <ThemeSelectionDropdown />
 */
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { themeManager, type ThemeDefinition } from '@/theme/ThemeManager';
import { useUiStore } from '@/store/ui.store';
import { CheckIcon, SunIcon, MoonIcon } from '@heroicons/vue/24/outline';

/**
 * @const {Store<UiStore>} uiStore - The Pinia store instance for UI state management.
 */
const uiStore = useUiStore();
const { t } = useI18n();

/**
 * @ref {Ref<boolean>} isOpen - Controls the visibility of the dropdown panel.
 */
const isOpen: Ref<boolean> = ref(false);

/**
 * @ref {Ref<HTMLElement | null>} dropdownContainerRef - Template ref for the root div, used for click-outside detection.
 */
const dropdownContainerRef: Ref<HTMLElement | null> = ref(null);

/**
 * @computed {readonly ThemeDefinition[]} availableThemes - Retrieves available themes from `themeManager`.
 */
const availableThemes = computed<readonly ThemeDefinition[]>(() => themeManager.getAvailableThemes());

/**
 * @computed {string} currentThemeId - Retrieves the current theme ID from `uiStore`.
 */
const currentThemeId = computed<string>(() => uiStore.currentThemeId);

/**
 * @computed {ThemeDefinition | undefined} activeTheme - Currently selected theme details.
 */
const activeTheme = computed(() => availableThemes.value.find((theme) => theme.id === currentThemeId.value));

/**
 * @computed {string} currentThemeLabel - Human readable descriptor for the active theme.
 */
const currentThemeLabel = computed<string>(() => {
  if (!activeTheme.value) return currentThemeId.value;
  return activeTheme.value.descriptor || activeTheme.value.label || currentThemeId.value;
});

/**
 * @computed {VueComponent | null} activeThemeIcon - Icon representing tone of the active theme.
 */
const activeThemeIcon = computed(() => {
  if (!activeTheme.value) return null;
  return activeTheme.value.isDark ? MoonIcon : SunIcon;
});

/**
 * @function toggleDropdown - Toggles the dropdown's visibility.
 */
const toggleDropdown = (): void => {
  isOpen.value = !isOpen.value;
};

/**
 * @function closeDropdown - Closes the dropdown.
 */
const closeDropdown = (): void => {
  isOpen.value = false;
};

/**
 * @function handleClickOutside - Closes dropdown if a click occurs outside of it.
 * @param {MouseEvent} event - The mousedown event.
 */
const handleClickOutside = (event: MouseEvent): void => {
  if (dropdownContainerRef.value && !dropdownContainerRef.value.contains(event.target as Node)) {
    closeDropdown();
  }
};

/**
 * @function selectTheme - Sets the selected theme via `uiStore`.
 * @param {string} themeId - The ID of the theme to select.
 */
const selectTheme = (themeId: string): void => {
  uiStore.setTheme(themeId);
  // Dropdown can remain open to show selection, or add closeDropdown() if preferred.
};

/**
 * @function getThemeIndicatorColor - Provides a representative color for the theme swatch.
 * @param {ThemeDefinition} theme - The theme object.
 * @returns {string} An HSL color string.
 */
const getThemeIndicatorColor = (theme: ThemeDefinition): string => {
  const h = theme.cssVariables['--color-accent-primary-h'] || (theme.isDark ? '270' : '330');
  const s = theme.cssVariables['--color-accent-primary-s'] || '80%';
  const l = theme.cssVariables['--color-accent-primary-l'] || (theme.isDark ? '65%' : '70%');
  return `hsl(${h}, ${s}, ${l})`;
};

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside, true);
});
onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside, true);
});
</script>

<template>
  <div class="relative header-control-item" ref="dropdownContainerRef">
    <button
      @click="toggleDropdown"
      id="theme-selection-trigger-button"
      class="btn btn-ghost-ephemeral btn-icon-ephemeral direct-header-button"
      aria-label="Select Theme"
      :aria-expanded="isOpen"
      aria-controls="theme-selection-panel"
      title="Change Application Theme"
    >
      <span class="theme-trigger-pill">
        <component
          v-if="activeThemeIcon"
          :is="activeThemeIcon"
          class="theme-trigger-icon"
          aria-hidden="true"
        />
        <span class="theme-trigger-label">
          {{ currentThemeLabel }}
        </span>
      </span>
    </button>

    <Transition name="dropdown-float-enhanced">
      <div
        v-if="isOpen"
        id="theme-selection-panel"
        class="dropdown-panel-ephemeral absolute right-0 mt-2 w-72 origin-top-right
               lg:right-auto lg:left-1/2 lg:-translate-x-1/2 lg:origin-top-center"
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="theme-selection-trigger-button"
      >
        <div class="dropdown-header-ephemeral">
          <h3 class="dropdown-title">{{ t('settings.selectTheme') }}</h3>
        </div>
        <div class="dropdown-content-ephemeral custom-scrollbar-thin p-1">
          <div class="theme-selector-grid-ephemeral">
            <button
              v-for="theme in availableThemes"
              :key="theme.id"
              @click="selectTheme(theme.id)"
              class="dropdown-item-ephemeral theme-button-ephemeral"
              :class="{ 'active': currentThemeId === theme.id }"
              :title="`Switch to ${theme.name} theme`"
              role="menuitemradio"
              :aria-checked="currentThemeId === theme.id"
            >
              <span class="theme-indicator-swatch-ephemeral" :style="{ background: getThemeIndicatorColor(theme) }">
                <component :is="theme.isDark ? MoonIcon : SunIcon" class="theme-type-icon" aria-hidden="true" />
              </span>
              <span class="theme-name-ephemeral">{{ theme.name }}</span>
              <CheckIcon v-if="currentThemeId === theme.id" class="checkmark-icon-ephemeral ml-auto" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/abstracts/variables' as var;

.header-control-item {
  position: relative;
}

.theme-trigger-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0.8rem;
  border-radius: var.$radius-full;
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.35);
  transition: background 0.2s ease;

  .direct-header-button:hover & {
    background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.5);
  }
}

.theme-trigger-icon {
  width: 1rem;
  height: 1rem;
  color: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l));
}

.theme-trigger-label {
  font-size: var.$font-size-xs;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: hsla(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l), 0.85);
}

// Enhance the dropdown panel with glassmorphism
.dropdown-panel-ephemeral {
  background: hsla(var(--color-bg-primary-h),
                   var(--color-bg-primary-s),
                   var(--color-bg-primary-l), 0.85);
  backdrop-filter: blur(20px) saturate(1.8);
  border: 1px solid hsla(var(--color-border-primary-h),
                          var(--color-border-primary-s),
                          var(--color-border-primary-l), 0.2);
  box-shadow:
    0 8px 32px hsla(0, 0%, 0%, 0.1),
    0 2px 8px hsla(0, 0%, 0%, 0.05),
    inset 0 1px 0 hsla(255, 255%, 255%, 0.1);
}

.theme-selector-grid-ephemeral {
  display: grid;
  grid-template-columns: 1fr;
  gap: var.$spacing-xs;
  padding: var.$spacing-xs;
}

.theme-button-ephemeral {
  display: flex;
  align-items: center;
  width: 100%;
  text-align: left;
  position: relative;
  padding: var.$spacing-sm var.$spacing-md;
  border-radius: var.$radius-lg;
  background: transparent;
  transition: all 0.3s ease;

  // Neumorphic effect on hover
  &:hover {
    background: hsla(var(--color-bg-secondary-h),
                     var(--color-bg-secondary-s),
                     var(--color-bg-secondary-l), 0.3);
    box-shadow:
      inset 2px 2px 4px hsla(0, 0%, 0%, 0.05),
      inset -2px -2px 4px hsla(255, 255%, 255%, 0.05);
  }

  &.active {
    background: linear-gradient(135deg,
                hsla(var(--color-accent-primary-h),
                     var(--color-accent-primary-s),
                     var(--color-accent-primary-l), 0.1),
                hsla(var(--color-accent-secondary-h),
                     var(--color-accent-secondary-s),
                     var(--color-accent-secondary-l), 0.05));
    box-shadow:
      inset 3px 3px 6px hsla(0, 0%, 0%, 0.08),
      inset -3px -3px 6px hsla(255, 255%, 255%, 0.08),
      0 0 0 1px hsla(var(--color-accent-primary-h),
                     var(--color-accent-primary-s),
                     var(--color-accent-primary-l), 0.2);
  }

  .theme-indicator-swatch-ephemeral {
    width: 22px;
    height: 22px;
    border-radius: var.$radius-md;
    margin-right: var.$spacing-sm;
    border: 1px solid hsla(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: box-shadow 0.2s;

    .theme-type-icon {
      width: 12px;
      height: 12px;
      color: var(--swatch-icon-color, hsla(0, 0%, 100%, 0.7));
    }
  }

  .theme-name-ephemeral {
    flex-grow: 1;
    font-size: var.$font-size-sm;
    font-weight: 500;
  }

  .checkmark-icon-ephemeral {
    width: 1.2rem;
    height: 1.2rem;
    color: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l));
    opacity: 0;
    transition: opacity 0.2s;
  }

  &.active {
    font-weight: 600;
    .theme-indicator-swatch-ephemeral {
      box-shadow: 0 0 0 2px hsl(var(--color-bg-panel, var(--color-bg-secondary-h))),
                  0 0 0 3.5px hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l));
    }
    .checkmark-icon-ephemeral {
      opacity: 1;
    }
  }

  &:hover:not(.active) {
    .theme-indicator-swatch-ephemeral {
      border-color: hsla(var(--color-border-interactive-h), var(--color-border-interactive-s), var(--color-border-interactive-l), 0.7);
    }
  }
}

// Dynamic swatch icon color based on perceived theme brightness (applied globally via data-theme attribute)
:root[data-theme*="light"] .theme-indicator-swatch-ephemeral .theme-type-icon {
  --swatch-icon-color: hsla(0, 0%, 0%, 0.6);
}
:root[data-theme*="dark"] .theme-indicator-swatch-ephemeral .theme-type-icon {
  --swatch-icon-color: hsla(0, 0%, 100%, 0.7);
}
// Specific overrides if a theme's accent is too light/dark for the default icon color
:root[data-theme="warm-embrace"] .theme-indicator-swatch-ephemeral .theme-type-icon {
   // Warm embrace accent is light, so icon should be dark
   --swatch-icon-color: hsla(var(--color-text-on-primary-h), var(--color-text-on-primary-s), var(--color-text-on-primary-l), 0.8);
}
</style>
