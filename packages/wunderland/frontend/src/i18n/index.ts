import { createI18n } from 'vue-i18n';
import type { I18n, I18nOptions, Composer } from 'vue-i18n';

// Import locale messages
import en from './locales/en';
import esES from './locales/es-ES';
import frFR from './locales/fr-FR';
import deDE from './locales/de-DE';
import itIT from './locales/it-IT';
import ptBR from './locales/pt-BR';
import jaJP from './locales/ja-JP';
import koKR from './locales/ko-KR';
import zhCN from './locales/zh-CN';
import enNG from './locales/en-NG';

// Define available locales
export const AVAILABLE_LOCALES = {
  'en': 'English',
  'es-ES': 'EspaÃ±ol',
  'fr-FR': 'FranÃ§ais',
  'de-DE': 'Deutsch',
  'it-IT': 'Italiano',
  'pt-BR': 'PortuguÃªs',
  'ja-JP': 'æ—¥æœ¬èªž',
  'ko-KR': 'í•œêµ­ì–´',
  'zh-CN': 'ä¸­æ–‡'
} as const;

export type AvailableLocale = keyof typeof AVAILABLE_LOCALES;

// Get browser language or default to en
function getDefaultLocale(): AvailableLocale {
  const savedLocale = localStorage.getItem('preferred-locale') as AvailableLocale;
  if (savedLocale && savedLocale in AVAILABLE_LOCALES) {
    return savedLocale;
  }

  const browserLang = navigator.language || 'en';

  // Try exact match first
  if (browserLang in AVAILABLE_LOCALES) {
    return browserLang as AvailableLocale;
  }

  // Try to match language code (e.g., 'en' from 'en-GB')
  const langCode = browserLang.split('-')[0];
  const matchedLocale = Object.keys(AVAILABLE_LOCALES).find(
    locale => locale.startsWith(langCode)
  ) as AvailableLocale | undefined;

  return matchedLocale || 'en';
}

const messages = {
  'en': en,
  'es-ES': esES,
  'fr-FR': frFR,
  'de-DE': deDE,
  'it-IT': itIT,
  'pt-BR': ptBR,
  'ja-JP': jaJP,
  'ko-KR': koKR,
  'zh-CN': zhCN,
  'en-NG': enNG
};

const i18nOptions: I18nOptions = {
  legacy: false, // Use Composition API
  locale: getDefaultLocale(),
  fallbackLocale: 'en',
  messages,
  globalInjection: true,
  missingWarn: process.env.NODE_ENV === 'development',
  fallbackWarn: process.env.NODE_ENV === 'development'
};

const i18n: I18n = createI18n(i18nOptions);
// Narrow the global composer type to eliminate union call issues when using legacy: false
const composer: Composer = i18n.global as unknown as Composer;

// Helper function to change locale
export function setLocale(locale: AvailableLocale): void {
  if (!(locale in AVAILABLE_LOCALES)) {
    if (process.env.NODE_ENV === 'development') console.warn('[i18n] Invalid locale:', locale);
    return;
  }
  const previousLocale = composer.locale.value;
  composer.locale.value = locale;
  localStorage.setItem('preferred-locale', locale);
  document.documentElement.setAttribute('lang', locale);
  if (process.env.NODE_ENV === 'development') {
    console.log(`[i18n] Locale changed: ${previousLocale} -> ${locale}`);
  }
}

// Helper function to get current locale
export function getCurrentLocale(): AvailableLocale {
  return composer.locale.value as AvailableLocale;
}

// Safe global translate wrapper (eliminate union type callable ambiguity)
export function tGlobal(key: string, params?: Record<string, any>): string {
  try {
    return composer.t(key, params as any);
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[i18n] Translation error for key', key, e);
    }
    return key;
  }
}

// Export both as named export and default
export { i18n, composer };
export default i18n;

