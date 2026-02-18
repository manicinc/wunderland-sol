// File: frontend/src/theme/ThemeManager.ts
/**
 * @file ThemeManager.ts
 * @description Central theme controller for the "Ephemeral Harmony" application.
 * This manager handles the initialization of themes, allows users to select
 * and persist their preferred theme, and responds to system dark mode preferences
 * if no user choice has been made. It uses definitions from `themes.config.ts`.
 *
 * @role Manages current theme state, applies themes to the DOM, and persists user preferences.
 * @dependencies `vue` (for reactive refs), `@vueuse/core` (for `useStorage`, `usePreferredDark`),
 * `./themes.config` (for `availableThemes`, `ThemeDefinition`, default theme IDs).
 * @assumptions `themes.config.ts` provides accurate theme definitions and default IDs.
 * SCSS theme engine (`_theme-engine.scss`) correctly applies `data-theme` attributes.
 * @version 3.0.1 - Refined logging and initialization consistency.
 */
import { ref, readonly, watch, type Ref } from 'vue';
import { useStorage, usePreferredDark } from '@vueuse/core';
import {
  availableThemes,
  type ThemeDefinition,
  DEFAULT_OVERALL_THEME_ID, // Default if nothing else matches
  DEFAULT_DARK_THEME_ID,    // Default for dark system preference
  DEFAULT_LIGHT_THEME_ID    // Default for light system preference
} from './themes.config';

// Re-export default theme IDs for convenience in other modules.
export {
  DEFAULT_OVERALL_THEME_ID,
  DEFAULT_DARK_THEME_ID,
  DEFAULT_LIGHT_THEME_ID
} from './themes.config';
// Export ThemeDefinition type for components that might need it.
export type { ThemeDefinition } from './themes.config';

/**
 * @const {string} THEME_STORAGE_KEY - Key used for storing the selected theme ID in localStorage.
 * Versioned to allow for clean reset of stored preferences if theme system changes significantly.
 */
const THEME_STORAGE_KEY = 'vca-ephemeral-harmony-theme-v3.0.1';

const isSystemDark = usePreferredDark();
const storedThemeId = useStorage<string | null>(THEME_STORAGE_KEY, null);

/**
 * @private
 * @type {Ref<string>} _currentThemeId - Reactive ref holding the ID of the currently active theme.
 */
const _currentThemeId: Ref<string> = ref(DEFAULT_OVERALL_THEME_ID);

/**
 * @private
 * @type {Ref<ThemeDefinition | undefined>} _currentTheme - Reactive ref holding the full definition object
 * of the currently active theme.
 */
const _currentTheme: Ref<ThemeDefinition | undefined> = ref(
  availableThemes.find(t => t.id === DEFAULT_OVERALL_THEME_ID)
);

/**
 * @private
 * @type {Ref<boolean>} _userHasManuallySelected - Reactive ref indicating if the user has
 * actively chosen a theme, as opposed to using a system default.
 */
const _userHasManuallySelected = ref(storedThemeId.value !== null && availableThemes.some(t => t.id === storedThemeId.value));


/**
 * @function applyTheme
 * @private
 * @description Applies a theme by setting the `data-theme` attribute on the `<html>` element,
 * updating the `color-scheme` CSS property, and managing internal reactive state.
 * It includes fallback logic if the requested `themeId` is invalid.
 *
 * @param {string} themeId - The ID of the theme to apply.
 * @param {boolean} [isUserChoice=false] - Indicates if this theme change was a direct user selection.
 * If true, the choice is persisted to localStorage.
 * @returns {void}
 */
function applyTheme(themeId: string, isUserChoice = false): void {
  let themeToApply = availableThemes.find(t => t.id === themeId);

  if (!themeToApply) {
    // Fallback logic if the requested themeId is not found or invalid
    const systemPreferenceThemeId = isSystemDark.value ? DEFAULT_DARK_THEME_ID : DEFAULT_LIGHT_THEME_ID;
    themeToApply = availableThemes.find(t => t.id === systemPreferenceThemeId) ||
                   availableThemes.find(t => t.id === DEFAULT_OVERALL_THEME_ID)!; // Final fallback

    console.warn(
      `[ThemeManager] Theme ID "${themeId}" not found or invalid. ` +
      `Falling back to "${themeToApply.id}" (System: ${isSystemDark.value ? 'dark' : 'light'}, Default: ${DEFAULT_OVERALL_THEME_ID}).`
    );
  }

  // Avoid redundant DOM manipulations if the theme is already active
  if (document.documentElement.getAttribute('data-theme') === themeToApply.id && _currentThemeId.value === themeToApply.id) {
    _currentTheme.value = themeToApply; // Ensure internal state is consistent
    return;
  }

  document.documentElement.setAttribute('data-theme', themeToApply.id);
  // Ensure Tailwind's dark variants and UA styling are in sync
  document.documentElement.classList.toggle('dark', !!themeToApply.isDark);
  document.documentElement.style.colorScheme = themeToApply.isDark ? 'dark' : 'light';

  _currentThemeId.value = themeToApply.id;
  _currentTheme.value = themeToApply;

  if (isUserChoice) {
    storedThemeId.value = themeToApply.id; // Persist user's choice
    if (!_userHasManuallySelected.value) {
      _userHasManuallySelected.value = true; // Mark that a manual selection has now occurred
    }
  }
  // console.log(`[ThemeManager] Applied theme: ${themeToApply.name}${isUserChoice ? ' (user choice)' : ''}`);
}

/**
 * @function setTheme
 * @description Public method to set the application theme based on user selection.
 * This action is considered a manual user choice and will be persisted.
 *
 * @param {string} id - The ID of the theme to set.
 * @returns {void}
 */
function setTheme(id: string): void {
  applyTheme(id, true);
}

/**
 * @function setThemeFlexible
 * @description Public method to set the theme based on a specific theme ID or a generic mode ('dark'/'light').
 * If 'dark' or 'light' is provided, it applies the corresponding default dark/light theme.
 * This action is considered a manual user choice.
 *
 * @param {string} idOrMode - The theme ID (e.g., 'sakura-sunset') or mode ('dark'/'light').
 * @returns {void}
 */
function setThemeFlexible(idOrMode: string): void {
  if (idOrMode === 'dark') {
    setTheme(DEFAULT_DARK_THEME_ID);
  } else if (idOrMode === 'light') {
    setTheme(DEFAULT_LIGHT_THEME_ID);
  } else if (availableThemes.some(theme => theme.id === idOrMode)) {
    setTheme(idOrMode);
  } else {
    console.warn(`[ThemeManager] setThemeFlexible: Unknown theme ID or mode "${idOrMode}". Applying overall default theme.`);
    setTheme(DEFAULT_OVERALL_THEME_ID);
  }
}

/**
 * @function initialize
 * @description Initializes the theme manager. It determines the initial theme to apply based on
 * persisted user preference (from localStorage) or system dark mode preference.
 * It also sets up a watcher to react to changes in system dark mode if the user
 * has not made a manual theme selection. This should be called once when the application starts.
 *
 * @returns {void}
 */
function initialize(): void {
  let initialThemeIdToApply: string;

  if (storedThemeId.value && availableThemes.some(t => t.id === storedThemeId.value)) {
    // Valid theme preference found in storage
    initialThemeIdToApply = storedThemeId.value;
    _userHasManuallySelected.value = true; // Confirm manual selection status
  } else {
    // No valid stored theme, or storage is empty; use system preference
    initialThemeIdToApply = isSystemDark.value ? DEFAULT_DARK_THEME_ID : DEFAULT_LIGHT_THEME_ID;
    _userHasManuallySelected.value = false; // No manual selection active
    storedThemeId.value = null; // Clear invalid stored ID if any
  }
  applyTheme(initialThemeIdToApply, _userHasManuallySelected.value);

  // Watch for changes in system dark mode preference
  watch(isSystemDark, (prefersDarkSystemMode) => {
    if (!_userHasManuallySelected.value) {
      // If the user hasn't picked a theme, follow the system's dark/light mode
      const themeToApplyBasedOnSystem = prefersDarkSystemMode ? DEFAULT_DARK_THEME_ID : DEFAULT_LIGHT_THEME_ID;
      applyTheme(themeToApplyBasedOnSystem, false); // This is not a direct user choice
    }
  });
  // console.log(`[ThemeManager] Initialized. Active theme: ${_currentThemeId.value}. User manually selected: ${_userHasManuallySelected.value}. System prefers dark: ${isSystemDark.value}`);
}

/**
 * @function getCurrentTheme
 * @description Provides readonly reactive access to the current theme definition object.
 * @returns {Readonly<Ref<ThemeDefinition | undefined>>} The current theme object.
 */
const getCurrentTheme = (): Readonly<Ref<ThemeDefinition | undefined>> => readonly(_currentTheme);

/**
 * @function getCurrentThemeId
 * @description Provides readonly reactive access to the ID of the current theme.
 * @returns {Readonly<Ref<string>>} The current theme ID.
 */
const getCurrentThemeId = (): Readonly<Ref<string>> => readonly(_currentThemeId);

/**
 * @function getAvailableThemes
 * @description Provides a readonly array of all available theme definitions.
 * @returns {readonly ThemeDefinition[]} The list of available themes.
 */
const getAvailableThemes = (): readonly ThemeDefinition[] => availableThemes;

/**
 * @name themeManager
 * @description Exported singleton object containing all public methods and reactive properties
 * for managing themes within the application.
 */
export const themeManager = {
  initialize,
  setTheme,
  setThemeFlexible,
  getCurrentTheme,
  getCurrentThemeId,
  getAvailableThemes,
  /** Provides readonly reactive access to the system's dark mode preference. */
  isSystemDark: readonly(isSystemDark),
  /** Indicates if the current theme was a result of direct user selection. */
  hasUserManuallySelectedTheme: readonly(_userHasManuallySelected),
};

// Note: Initialization is typically called from the main application entry point (e.g., App.vue's onMounted or main.ts)
// to ensure it runs after the app is mounted and reactive systems are ready.
// Example: In App.vue -> onMounted(() => { themeManager.initialize(); });