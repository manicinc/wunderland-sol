/**
 * Shared theme type definitions
 * @module types/theme
 * 
 * @remarks
 * Centralized theme types to prevent prop type mismatches across components
 */

/**
 * All available theme options
 */
export type ThemeName =
  | 'light'
  | 'dark'
  | 'sepia-light'
  | 'sepia-dark'
  | 'terminal-light'
  | 'terminal-dark'
  | 'oceanic-light'
  | 'oceanic-dark'

/**
 * Theme categories
 */
export type ThemeCategory = 'standard' | 'sepia' | 'terminal' | 'oceanic'

/**
 * Theme metadata
 */
export interface ThemeMetadata {
  name: ThemeName
  label: string
  description: string
  category: ThemeCategory
  isDark: boolean
  accentColor: string
  backgroundColor: string
}

/**
 * All theme metadata
 */
export const THEME_METADATA: Record<ThemeName, ThemeMetadata> = {
  'light': {
    name: 'light',
    label: 'Light',
    description: 'Clean modern design',
    category: 'standard',
    isDark: false,
    accentColor: '#06B6D4',
    backgroundColor: '#FFFFFF',
  },
  'dark': {
    name: 'dark',
    label: 'Dark',
    description: 'Midnight elegance',
    category: 'standard',
    isDark: true,
    accentColor: '#06B6D4',
    backgroundColor: '#0F0F0F',
  },
  'sepia-light': {
    name: 'sepia-light',
    label: 'Sepia Light',
    description: 'Sunlit parchment',
    category: 'sepia',
    isDark: false,
    accentColor: '#D95D00',
    backgroundColor: '#FCF9F2',
  },
  'sepia-dark': {
    name: 'sepia-dark',
    label: 'Sepia Dark',
    description: 'Candlelit study',
    category: 'sepia',
    isDark: true,
    accentColor: '#E8B850',
    backgroundColor: '#0E0704',
  },
  'terminal-light': {
    name: 'terminal-light',
    label: 'Terminal Amber',
    description: 'Retro CRT amber',
    category: 'terminal',
    isDark: false,
    accentColor: '#FFB000',
    backgroundColor: '#000000',
  },
  'terminal-dark': {
    name: 'terminal-dark',
    label: 'Terminal Green',
    description: 'Hacker mode',
    category: 'terminal',
    isDark: true,
    accentColor: '#00FF00',
    backgroundColor: '#000000',
  },
  'oceanic-light': {
    name: 'oceanic-light',
    label: 'Oceanic Light',
    description: 'Coastal sunrise',
    category: 'oceanic',
    isDark: false,
    accentColor: '#F96716',
    backgroundColor: '#F2FBFC',
  },
  'oceanic-dark': {
    name: 'oceanic-dark',
    label: 'Oceanic Dark',
    description: 'Midnight abyss',
    category: 'oceanic',
    isDark: true,
    accentColor: '#5EEAD4',
    backgroundColor: '#010408',
  },
}

/**
 * Helper: Check if theme is dark
 */
export function isDarkTheme(theme: ThemeName): boolean {
  return THEME_METADATA[theme]?.isDark ?? false
}

/**
 * Helper: Check if theme is terminal
 */
export function isTerminalTheme(theme: ThemeName): boolean {
  return THEME_METADATA[theme]?.category === 'terminal'
}

/**
 * Helper: Check if theme is sepia
 */
export function isSepiaTheme(theme: ThemeName): boolean {
  return THEME_METADATA[theme]?.category === 'sepia'
}

/**
 * Helper: Check if theme is oceanic
 */
export function isOceanicTheme(theme: ThemeName): boolean {
  return THEME_METADATA[theme]?.category === 'oceanic'
}

/**
 * Helper: Get theme category
 */
export function getThemeCategory(theme: ThemeName): ThemeCategory {
  return THEME_METADATA[theme]?.category ?? 'standard'
}

/**
 * Helper: Get next theme in sequence
 */
export function getNextTheme(current: ThemeName): ThemeName {
  const sequence: ThemeName[] = [
    'light',
    'dark',
    'sepia-light',
    'sepia-dark',
    'terminal-light',
    'terminal-dark',
    'oceanic-light',
    'oceanic-dark',
  ]
  const currentIndex = sequence.indexOf(current)
  return sequence[(currentIndex + 1) % sequence.length]
}

/**
 * Helper: Get previous theme in sequence
 */
export function getPreviousTheme(current: ThemeName): ThemeName {
  const sequence: ThemeName[] = [
    'light',
    'dark',
    'sepia-light',
    'sepia-dark',
    'terminal-light',
    'terminal-dark',
    'oceanic-light',
    'oceanic-dark',
  ]
  const currentIndex = sequence.indexOf(current)
  return sequence[(currentIndex - 1 + sequence.length) % sequence.length]
}

