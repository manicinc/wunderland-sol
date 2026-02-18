// File: backend/middleware/i18n.ts
// cspell:ignore Lngs
/**
  * @fileoverview Initializes and configures i18next for internationalization (i18n)
  * within the Express application.
  * @module backend/middleware/i18n
  * @version 1.0.4 - Refined supportedLngs and fallback logic.
  */

import i18next, { i18n as I18nInstanceType, TFunction } from 'i18next';
import i18nextFsBackend from 'i18next-fs-backend';
import * as i18nextHttpMiddleware from 'i18next-http-middleware';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger, getErrorMessage } from '../utils/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const enableI18nDebug = process.env.I18N_DEBUG === 'true';
const logger = createLogger('i18n');
const middlewareLogger = logger.child('Middleware');

type TranslationOptions = Record<string, unknown>;
type TranslationBundle = Record<string, unknown>;
type MiddlewareI18nInstance = Parameters<typeof i18nextHttpMiddleware.handle>[0];

/**
 * @const {readonly string[]} SUPPORTED_LOCALES
 * @description Specific locales supported by the application with translation files.
 */
export const SUPPORTED_LOCALES: readonly string[] = [
   'en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT',
   'pt-BR', 'ja-JP', 'ko-KR', 'zh-CN'
] as const;

/**
 * @const {typeof SUPPORTED_LOCALES[0]} DEFAULT_LOCALE
 * @description The default locale of the application.
 */
export const DEFAULT_LOCALE: typeof SUPPORTED_LOCALES[0] = 'en-US';

/**
 * @const {readonly string[]} SUPPORTED_LANGUAGES_FOR_DETECTION
 * @description Broader set of language codes (including base codes) that the detector can recognize
 * and which will be mapped to one of the SUPPORTED_LOCALES.
 */
export const SUPPORTED_LANGUAGES_FOR_DETECTION: readonly string[] = [
  'en', 'en-US', 'en-GB',
  'es', 'es-ES', 'es-MX',
  'fr', 'fr-FR', 'fr-CA',
  'de', 'de-DE',
  'it', 'it-IT',
  'pt', 'pt-BR', 'pt-PT',
  'ja', 'ja-JP',
  'ko', 'ko-KR',
  'zh', 'zh-CN', 'zh-TW', 'zh-HK'
];


/**
 * @const {Record<string, typeof SUPPORTED_LOCALES[number]>} LANGUAGE_MAP
 * @description Maps generic or common language codes to a specific supported locale.
 */
const LANGUAGE_MAP: Record<string, typeof SUPPORTED_LOCALES[number]> = {
   'en': 'en-US', 'en-gb': 'en-US', // Fallback en-GB to en-US if specific en-GB translations aren't present
   'es': 'es-ES', 'es-mx': 'es-ES',
   'fr': 'fr-FR', 'fr-ca': 'fr-FR',
   'de': 'de-DE',
   'it': 'it-IT',
   'pt': 'pt-BR', 'pt-pt': 'pt-BR',
   'ja': 'ja-JP',
   'ko': 'ko-KR',
   'zh': 'zh-CN', 'zh-tw': 'zh-CN', 'zh-hk': 'zh-CN', // Example: mapping traditional/HK to simplified
};

async function initializeI18n(): Promise<void> {
   if (i18next.isInitialized) {
      return;
   }
   const localesBasePath = path.resolve(__dirname, '../locales');

   await i18next
      .use(i18nextFsBackend)
      .use(i18nextHttpMiddleware.LanguageDetector)
      .init({
         initImmediate: false, // Recommended for server-side, defers loading until first use
         lng: DEFAULT_LOCALE, // Default language if detection fails
         fallbackLng: DEFAULT_LOCALE, // Fallback if a translation is missing in the detected language
      // `supportedLngs` should only contain locales for which you *actually have translation files*.
      // The LanguageDetector will find a language, then i18next will try to load it.
      // If it's not in `supportedLngs` (or more accurately, if files don't exist for it), it might warn.
      // The `load: 'currentOnly'` or `load: 'languageOnly'` might be useful.
      // For now, let's assume your `SUPPORTED_LOCALES` are the ones you have files for.
         supportedLngs: [...SUPPORTED_LOCALES, 'en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'], // Include base language codes
      load: 'languageOnly', // Will load 'en' if 'en-US' is requested but only 'en.json' exists
         defaultNS: 'common',
         ns: ['common', 'auth', 'errors', 'emails', 'api'], // Your namespaces
         backend: {
            loadPath: path.join(localesBasePath, '{{lng}}/{{ns}}.json'),
            addPath: path.join(localesBasePath, '{{lng}}/{{ns}}.missing.json'),
         },
         detection: {
            order: ['querystring', 'cookie', 'header'],
            lookupQuerystring: 'lng',
            lookupCookie: 'i18next-lng',
            lookupHeader: 'accept-language',
            caches: ['cookie'],
            cookieOptions: {
               path: '/',
               httpOnly: true,
               secure: process.env.NODE_ENV === 'production',
               sameSite: 'strict',
               maxAge: 30 * 24 * 60 * 60 * 1000,
            },
        // Important: Only allow detection of languages you can map to your supported locales.
        // This helps prevent i18next from trying to set unsupported languages internally.
        // We use `checkWhitelist: false` because we'll normalize it ourselves in `normalizeLanguageCode`.
        // Or, we could use `supportedLngs: [...SUPPORTED_LANGUAGES_FOR_DETECTION]` here and let i18next handle it.
        // Let's try with the broader list for detection, and rely on fallbackLng.
        // `supportedLngs` is more about what languages i18next will *try* to load resources for.
        // The `languageUtils.rejecting language code` warning comes if the detected language is not in `supportedLngs`
        // *and* it's not a base form of one (e.g. 'en' for 'en-US').
        // Let's keep `supportedLngs` to actual locales with files.
         },
         saveMissing: process.env.NODE_ENV === 'development',
         debug: enableI18nDebug,
         interpolation: {
            escapeValue: false,
         },
      });

   logger.info('i18next initialized successfully with filesystem backend.');
   if (process.env.NODE_ENV === 'development') {
      logger.debug(`Loading translations from: ${localesBasePath}`);
      logger.debug(
        `Initialized with language: ${i18next.language}, Supported: ${JSON.stringify(i18next.options.supportedLngs)}, Fallback: ${String(i18next.options.fallbackLng)}`
      );
   }
}

/**
 * @function normalizeLanguageCode
 * @description Normalizes a given language code to one of the explicitly supported locales.
 * @param {string} [lang] - The language code to normalize (e.g., 'en', 'en-gb', 'en-US').
 * @returns {typeof SUPPORTED_LOCALES[number]} The corresponding supported locale or the default.
 */
export function normalizeLanguageCode(lang?: string): typeof SUPPORTED_LOCALES[number] {
   if (!lang) return DEFAULT_LOCALE;
   const lowerLang = lang.toLowerCase().trim();

  // Direct match for full locale e.g. "en-us"
   const supportedLocaleMatch = SUPPORTED_LOCALES.find(sl => sl.toLowerCase() === lowerLang);
   if (supportedLocaleMatch) {
      return supportedLocaleMatch;
   }

  // Match base language code e.g. "en" maps to "en-US"
   if (LANGUAGE_MAP[lowerLang]) {
      return LANGUAGE_MAP[lowerLang];
   }

  // Match regional base code e.g. "en" from "en-au" maps to "en-US"
   const shortCode = lowerLang.split('-')[0];
   if (LANGUAGE_MAP[shortCode]) {
      return LANGUAGE_MAP[shortCode];
   }

   logger.warn(`normalizeLanguageCode: Language '${lang}' not fully supported or mapped. Falling back to ${DEFAULT_LOCALE}.`);
   return DEFAULT_LOCALE;
}

/**
 * @function customLanguageHandlerMiddleware
 * @description Express middleware to handle language detection, normalization, and setting on req.i18n.
 * Ensures the language used for the request is always one of the `SUPPORTED_LOCALES`.
 */
export const customLanguageHandlerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // req.lng is populated by i18nextHttpMiddleware.LanguageDetector based on its order.
   let detectedLanguage: string | undefined = req.lng;

  // Allow forcing language via query param (useful for testing/dev)
   if (req.query.force_lang && typeof req.query.force_lang === 'string') {
      detectedLanguage = req.query.force_lang;
   }

   const normalizedLang = normalizeLanguageCode(detectedLanguage);
   req.customLanguage = normalizedLang; // Store our normalized choice

   const i18nInstanceForRequest = req.i18n;

   if (!i18nInstanceForRequest) {
      // This should ideally not happen if i18nextHttpMiddleware.handle runs before this.
   middlewareLogger.error(`Critical error: req.i18n is not available for request to ${req.originalUrl}. Language might not be correctly request-scoped.`);
    // Manually set on req.lng as a fallback for subsequent middleware if any rely on it.
      if (req.lng !== normalizedLang) req.lng = normalizedLang;
      res.setHeader('Content-Language', normalizedLang);
      return next();
   }

  // If the language on req.i18n (which i18next will use for t()) is not our normalized one, change it.
   if (i18nInstanceForRequest.language !== normalizedLang) {
      i18nInstanceForRequest.changeLanguage(normalizedLang, (err: Error | null /* i18next type for err is any */) => {
         if (err) {
            middlewareLogger.error(`Error changing language on req.i18n to '${normalizedLang}': ${getErrorMessage(err)}`);
         } else {
            if (enableI18nDebug) {
               middlewareLogger.debug(
                  `Language explicitly set to ${normalizedLang} for ${req.method} ${req.originalUrl} (was ${req.lng}, i18n instance was ${i18nInstanceForRequest.language})`
               );
            }
      }
         req.lng = normalizedLang; // Ensure req.lng also reflects the final choice
         res.setHeader('Content-Language', normalizedLang);
         next();
      });
   } else {
    // If already correct, still ensure req.lng is aligned if it somehow differed from req.i18n.language
    if (req.lng !== normalizedLang) req.lng = normalizedLang;
      res.setHeader('Content-Language', normalizedLang);
      next();
   }
};

// Global t function and customTranslationHelpersMiddleware remain largely the same.
// Ensuring they use the normalized language.

/**
 * @function t
 * @description Global translation function (server-side). Uses the globally set i18next language
 * or a specified language. Primarily for non-request-scoped translations (e.g., logs, system messages).
 * For request-scoped translations, use `req.translate`.
 * @param {string} key - The translation key.
 * @param {any} [options] - i18next options (e.g., interpolation values).
 * @param {string} [language] - Optional language code to use for this translation.
 * @returns {string} The translated string or the key if not found.
 */
export function t(key: string, options?: TranslationOptions, language?: string): string {
   const lngToUse = normalizeLanguageCode(language || (i18next.isInitialized ? i18next.language : DEFAULT_LOCALE));
   const resolvedOptions: TranslationOptions = { ...(options ?? {}), lng: lngToUse }; // Ensure options is an object
   
   if (!i18next.isInitialized) {
   logger.warn(`(global t): i18next not initialized. Called for key '${key}'. Returning key.`);
      return key;
   }

   const translation = i18next.t(key, resolvedOptions);

   if (typeof translation === 'string') {
      return translation;
   }

   if (process.env.NODE_ENV === 'development') {
      const valueType = typeof translation;
      const valueStr = valueType === 'object' ? JSON.stringify(translation) : String(translation);
         logger.warn(
            `(global t): Expected string for key '${key}' (lang: '${lngToUse}'), received ${valueType}. Value: ${valueStr.substring(0, 100)}. Returning key.`
         );
   }
   return key; // Fallback to key
}


/**
 * @function getTranslations
 * @description Retrieves a specific namespace bundle for a given language.
 * @param {string} namespace - The namespace to retrieve.
 * @param {string} [language] - Optional language code. Defaults to current i18next language.
 * @returns {Record<string, any>} The translation bundle or an empty object.
 */
export function getTranslations(namespace: string, language?: string): TranslationBundle {
   if (!i18next.isInitialized) {
   logger.warn(`(getTranslations): i18next not initialized. Called for namespace '${namespace}'. Returning empty object.`);
      return {};
   }
   const langToUse = normalizeLanguageCode(language || i18next.language || DEFAULT_LOCALE);
   try {
      const bundle = i18next.getResourceBundle(langToUse, namespace) as TranslationBundle | undefined;
      return bundle ?? {};
   } catch (error: unknown) {
      logger.warn(`Failed to get translations for namespace '${namespace}' in language '${langToUse}'. ${getErrorMessage(error)}`);
      return {};
   }
}

/**
 * @function customTranslationHelpersMiddleware
 * @description Express middleware to attach translation helper functions (`req.translate`, `req.getLocaleBundles`)
 * to the request object, using the request-specific language.
 */
export const customTranslationHelpersMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Use req.customLanguage which is set by customLanguageHandlerMiddleware and is guaranteed to be a supported locale
   const userLanguage = req.customLanguage || DEFAULT_LOCALE;

  // req.i18n is provided by i18nextHttpMiddleware.handle
    if (!req.i18n) {
       middlewareLogger.warn(
          `(req.translate): req.i18n missing, falling back to global i18next. This may not use correct request language. Using '${userLanguage}'.`
       );
    }

    const tForRequest = req.i18n?.t ?? i18next.getFixedT(userLanguage);

   req.translate = (key: string, options?: TranslationOptions): string => {
    // Options passed to req.translate should override the language if explicitly provided,
    // otherwise default to the request's resolved language.
    const langForThisCall = options?.lng || userLanguage;
   const resolvedOptions: TranslationOptions = { ...(options ?? {}), lng: langForThisCall };
      const translation = tForRequest(key, resolvedOptions);

      if (typeof translation === 'string') {
            return translation;
      }
      if (process.env.NODE_ENV === 'development') {
            const valueType = typeof translation;
            const valueStr = valueType === 'object' ? JSON.stringify(translation) : String(translation);
            middlewareLogger.warn(
              `(req.translate): Expected string for key '${key}' (lang: '${langForThisCall}'), received ${valueType}. Value: ${valueStr.substring(0,100)}. Returning key.`
            );
      }
      return key; // Fallback to key
   };

   req.getLocaleBundles = (namespace: string): TranslationBundle => {
      return getTranslations(namespace, userLanguage);
   };

   next();
};

/**
 * @function setupI18nMiddleware
 * @description Initializes i18next if not already done, and returns an array of Express middleware handlers.
 * @async
 * @returns {Promise<Array<(req: Request, res: Response, next: NextFunction) => void>>}
 */
export async function setupI18nMiddleware(): Promise<Array<(req: Request, res: Response, next: NextFunction) => void>> {
   if (!i18next.isInitialized) {
      await initializeI18n();
   }

   return [
        // Cast required due to upstream type mismatch between i18next@25 and middleware peer dependency.
        i18nextHttpMiddleware.handle(i18next as unknown as MiddlewareI18nInstance, { /* ignoreRoutes: ["/foo"] */ }), // Standard handler from library
      customLanguageHandlerMiddleware, // Our custom normalizer and setter
      customTranslationHelpersMiddleware, // Helpers like req.translate
   ];
}

// Extend Express Request type
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
   namespace Express {
      interface Request {
      /** Instance of i18next, scoped to the request. Provided by i18next-http-middleware. */
         i18n?: I18nInstanceType;
      /** The language code detected or set for the current request by i18next. */
         lng?: string;
      /** Array of detected languages, in order of preference, by i18next. */
         languages?: string[];
      /** The translation function `t` bound to the request's language. Provided by i18next-http-middleware. */
         t: TFunction; 
         
      /** Our normalized, supported language code for the current request. */
         customLanguage?: typeof SUPPORTED_LOCALES[number];
      /** Custom translation helper attached by our middleware, uses `customLanguage`. */
         translate?: (key: string, options?: TranslationOptions) => string;
      /** Custom helper to get namespaced translations for the request's language. */
         getLocaleBundles?: (namespace: string) => TranslationBundle;
      }
   }
}
/* eslint-enable @typescript-eslint/no-namespace */

export default i18next; // Export the global i18next instance
