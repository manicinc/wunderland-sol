/**
 * Glossary Module
 *
 * Provides hybrid NLP + LLM glossary generation with:
 * - Persistent caching via SQL storage
 * - Platform-aware feature gating
 * - Provider waterfall (Claude → OpenAI → NLP)
 *
 * @module lib/glossary
 */

// Cache service
export {
  getFromCache,
  saveToCache,
  invalidateCache,
  cleanupExpired,
  getCacheStats,
  resetStats,
  hashContent,
  generateCacheKey,
  isCached,
  getCacheAge,
  type GlossaryTerm,
  type CachedGlossary,
  type GlossaryCacheEntry,
  type CacheStats,
  type GenerationMethod,
} from './glossaryCache'

// Settings
export {
  loadGlossarySettings,
  saveGlossarySettings,
  resetGlossarySettings,
  getPlatformFeatures,
  isMethodAvailable,
  getAvailableMethods,
  getFeatureMessage,
  resolveBackend,
  getBackendDescription,
  resolveLLMProvider,
  getAvailableLLMProviders,
  getLLMProviderDescription,
  DEFAULT_SETTINGS,
  type GlossarySettings,
  type PlatformFeatures,
  type BackendOption,
  type LLMProviderOption,
} from './glossarySettings'

// Generator
export {
  generateGlossary,
  generateGlossaryDirect,
  generateGlossaryWithWorker,
  generateWithNLP,
  generateWithLLM,
  generateHybrid,
  getTermDefinition,
  isKnownAcronym,
  type GlossaryGenerationOptions,
  type GlossaryResult,
  type NLPGenerationOptions,
} from './glossaryGenerator'

// Term extraction utilities
export {
  extractTerms,
  extractDefinitions,
  extractAcronyms,
  deduplicateTerms,
  createGlossaryTerm,
  normalizeTerm,
  inferCategory,
  generateTermId,
  COMMON_ACRONYMS,
  type ExtractedDefinition,
  type ExtractedAcronym,
} from './glossaryGeneration'

// Worker types
export type {
  GlossaryTask,
  GlossaryProgress,
  GlossaryStage,
  GlossaryWorkerResult,
  GlossaryWorkerMessage,
  GlossaryWorkerResponse,
  GlossaryGenerationPayload,
  GlossaryGenerationResult,
} from './workerTypes'
