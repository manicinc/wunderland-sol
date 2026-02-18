// File: frontend/src/components/LanguageSwitcher.vue
/**
 * @file LanguageSwitcher.vue
 * @description A dropdown component for selecting application language/locale.
 * It dynamically lists available locales and allows users to switch between them.
 * Styled according to the "Ephemeral Harmony" design system, matching the theme switcher design.
 *
 * @component LanguageSwitcher
 * @props None
 * @emits None directly, but interacts with `i18n` and routing system.
 *
 * @example
 * <LanguageSwitcher />
 */
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter, useRoute } from 'vue-router';
import { AVAILABLE_LOCALES, setLocale, getCurrentLocale, type AvailableLocale } from '@/i18n';
import {
  GlobeAltIcon,
  CheckIcon
} from '@heroicons/vue/24/outline';

/**
 * @const {I18n} i18n - Vue i18n instance for translations
 */
const { locale, t } = useI18n();
const router = useRouter();
const route = useRoute();

/**
 * @ref {Ref<boolean>} isOpen - Controls the visibility of the dropdown panel.
 */
const isOpen: Ref<boolean> = ref(false);

/**
 * @ref {Ref<HTMLElement | null>} dropdownContainerRef - Template ref for the root div, used for click-outside detection.
 */
const dropdownContainerRef: Ref<HTMLElement | null> = ref(null);

/**
 * @ref {Ref<AvailableLocale>} currentLocale - Current selected locale
 */
const currentLocale = ref(getCurrentLocale());

/**
 * @computed {typeof AVAILABLE_LOCALES} availableLocales - Available language options
 */
const availableLocales = computed(() => AVAILABLE_LOCALES);

/**
 * @computed {string} currentLocaleName - Display name of current locale
 */
// Display name lookup can directly reference AVAILABLE_LOCALES when needed

// Watch for route changes to update the currentLocale
watch(() => route.params.locale, (newLocale) => {
  if (newLocale && newLocale !== currentLocale.value) {
    console.log('[LanguageSwitcher] Route locale changed. Updating selector to:', newLocale);
    currentLocale.value = newLocale as AvailableLocale;
    // Also ensure i18n is synced
    if (locale.value !== newLocale) {
      console.log('[LanguageSwitcher] Syncing i18n locale with route:', newLocale);
      setLocale(newLocale as AvailableLocale);
      locale.value = newLocale as AvailableLocale;
      // Force re-render for languages with special characters
      if (newLocale === 'ja-JP' || newLocale === 'zh-CN') {
        console.log('[LanguageSwitcher] Special character locale detected, testing translation:');
        console.log('[LanguageSwitcher] Test welcome message:', t('common.welcome'));
      }
    }
  }
}, { immediate: true });

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
 * @function selectLanguage - Sets the selected language and updates routing.
 * @param {AvailableLocale} newLocale - The locale code to select.
 */
const selectLanguage = (newLocale: AvailableLocale): void => {
  console.log('[LanguageSwitcher] Changing language to:', newLocale);
  console.log('[LanguageSwitcher] Current route path:', route.path);
  console.log('[LanguageSwitcher] Current locale in path:', route.params.locale);

  setLocale(newLocale);
  locale.value = newLocale;
  currentLocale.value = newLocale;

  // Notify backend of language change if needed
  syncLanguageWithBackend(newLocale);

  // Navigate to the new locale route with proper error handling
  const currentPath = route.path;
  const currentLocaleInPath = route.params.locale as string;

  // Use nextTick to ensure DOM updates are complete before navigation
  nextTick(() => {
    if (currentLocaleInPath) {
      // Replace the locale in the current path
      const newPath = currentPath.replace(`/${currentLocaleInPath}/`, `/${newLocale}/`);
      console.log('[LanguageSwitcher] Navigating from', currentPath, 'to', newPath);
      router.replace(newPath).catch(err => {
        console.warn('[LanguageSwitcher] Navigation error handled:', err);
      });
    } else {
      // If no locale in path, prepend the new locale
      const newPath = `/${newLocale}${currentPath === '/' ? '/' : currentPath}`;
      console.log('[LanguageSwitcher] No locale in current path. Navigating to:', newPath);
      router.replace(newPath).catch(err => {
        console.warn('[LanguageSwitcher] Navigation error handled:', err);
      });
    }
  });

  console.log('[LanguageSwitcher] After change - i18n locale:', locale.value);

  // Close dropdown after selection
  closeDropdown();
};

/**
 * @function syncLanguageWithBackend - Syncs language preference with backend.
 * @param {string} locale - The locale to sync.
 */
const syncLanguageWithBackend = async (locale: string): Promise<void> => {
  try {
    // Set language preference in cookie for backend
    document.cookie = `i18next-lng=${locale};path=/;max-age=${30 * 24 * 60 * 60}`;

    // Also set Accept-Language header for future requests
    // This will be picked up by axios interceptor if configured
    localStorage.setItem('accept-language', locale);
  } catch (error) {
    console.error('Failed to sync language with backend:', error);
  }
};

/**
 * @function getLanguageIndicator - Gets appropriate flag or indicator for the language.
 * @param {AvailableLocale} localeCode - The locale code.
 * @returns {string} A flag emoji or indicator.
 */
const getLanguageIndicator = (localeCode: AvailableLocale): string => {
  const indicators: Record<AvailableLocale, string> = {
    'en': '🇺🇸',
    'es-ES': '🇪🇸',
    'fr-FR': '🇫🇷',
    'de-DE': '🇩🇪',
    'it-IT': '🇮🇹',
    'pt-BR': '🇧🇷',
    'ja-JP': '🇯🇵',
    'ko-KR': '🇰🇷',
    'zh-CN': '🇨🇳'
  };
  return indicators[localeCode] || '🌐';
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
      id="language-selection-trigger-button"
      class="btn btn-ghost-ephemeral btn-icon-ephemeral direct-header-button"
      :aria-label="$t('settings.selectLanguage')"
      :aria-expanded="isOpen"
      aria-controls="language-selection-panel"
      :title="$t('settings.selectLanguage')"
    >
      <GlobeAltIcon class="icon-base" />
    </button>

    <Transition name="dropdown-float-enhanced">
      <div
        v-if="isOpen"
        id="language-selection-panel"
        class="dropdown-panel-ephemeral absolute right-0 mt-2 w-72 origin-top-right
               lg:right-auto lg:left-1/2 lg:-translate-x-1/2 lg:origin-top-center"
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="language-selection-trigger-button"
      >
        <div class="dropdown-header-ephemeral">
          <h3 class="dropdown-title">{{ $t('settings.selectLanguage') }}</h3>
        </div>
        <div class="dropdown-content-ephemeral custom-scrollbar-thin p-1">
          <div class="language-selector-grid-ephemeral">
            <button
              v-for="(name, code) in availableLocales"
              :key="code"
              @click="selectLanguage(code as AvailableLocale)"
              class="dropdown-item-ephemeral language-button-ephemeral"
              :class="{ 'active': currentLocale === code }"
              :title="`Switch to ${name}`"
              role="menuitemradio"
              :aria-checked="currentLocale === code"
            >
              <span class="language-indicator-flag-ephemeral">
                {{ getLanguageIndicator(code as AvailableLocale) }}
              </span>
              <span class="language-name-ephemeral">{{ name }}</span>
              <CheckIcon v-if="currentLocale === code" class="checkmark-icon-ephemeral ml-auto" aria-hidden="true" />
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

// Enhance the dropdown panel with glassmorphism (matching theme switcher)
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
  border-radius: var.$radius-xl;
  overflow: hidden;
  z-index: 50;
}

.dropdown-header-ephemeral {
  padding: var.$spacing-md var.$spacing-md var.$spacing-sm;
  border-bottom: 1px solid hsla(var(--color-border-primary-h),
                                var(--color-border-primary-s),
                                var(--color-border-primary-l), 0.1);
  background: linear-gradient(180deg,
              hsla(var(--color-bg-secondary-h),
                   var(--color-bg-secondary-s),
                   var(--color-bg-secondary-l), 0.1),
              transparent);

  .dropdown-title {
    font-size: var.$font-size-sm;
    font-weight: 600;
    color: hsl(var(--color-text-primary-h),
               var(--color-text-primary-s),
               var(--color-text-primary-l));
    margin: 0;
  }
}

.dropdown-content-ephemeral {
  max-height: 280px;
  overflow-y: auto;
}

.language-selector-grid-ephemeral {
  display: grid;
  grid-template-columns: 1fr;
  gap: var.$spacing-xs;
  padding: var.$spacing-xs;
}

.language-button-ephemeral {
  display: flex;
  align-items: center;
  width: 100%;
  text-align: left;
  position: relative;
  padding: var.$spacing-sm var.$spacing-md;
  border-radius: var.$radius-lg;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  color: hsl(var(--color-text-primary-h),
             var(--color-text-primary-s),
             var(--color-text-primary-l));

  // Neumorphic effect on hover (matching theme switcher)
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
    font-weight: 600;
  }

  .language-indicator-flag-ephemeral {
    font-size: 1.25rem;
    margin-right: var.$spacing-sm;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    border-radius: var.$radius-sm;
  }

  .language-name-ephemeral {
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
    .checkmark-icon-ephemeral {
      opacity: 1;
    }

    .language-indicator-flag-ephemeral {
      box-shadow: 0 0 0 2px hsl(var(--color-bg-panel, var(--color-bg-secondary-h))),
                  0 0 0 3px hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l));
      border-radius: var.$radius-sm;
    }
  }

  &:hover:not(.active) {
    .language-indicator-flag-ephemeral {
      transform: scale(1.05);
    }
  }
}

// Dropdown animation (matching theme switcher)
.dropdown-float-enhanced-enter-active,
.dropdown-float-enhanced-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.dropdown-float-enhanced-enter-from,
.dropdown-float-enhanced-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}

.dropdown-float-enhanced-enter-to,
.dropdown-float-enhanced-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

// Custom scrollbar for dropdown content
.custom-scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar-thin::-webkit-scrollbar-track {
  background: hsla(var(--color-bg-secondary-h),
                   var(--color-bg-secondary-s),
                   var(--color-bg-secondary-l), 0.2);
  border-radius: 2px;
}

.custom-scrollbar-thin::-webkit-scrollbar-thumb {
  background: hsla(var(--color-accent-primary-h),
                   var(--color-accent-primary-s),
                   var(--color-accent-primary-l), 0.4);
  border-radius: 2px;
}

.custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: hsla(var(--color-accent-primary-h),
                   var(--color-accent-primary-s),
                   var(--color-accent-primary-l), 0.6);
}
</style>