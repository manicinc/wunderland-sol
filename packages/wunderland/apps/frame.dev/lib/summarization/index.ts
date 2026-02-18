/**
 * Summarization Module
 * @module lib/summarization
 *
 * AI-powered summarization for research results.
 */

// Types
export * from './types'

// Core functionality
export {
  summarize,
  summarizeComplete,
  digestSources,
  extractKeyPoints,
  compareSources,
  generateAbstract,
  generateExecutiveSummary,
} from './summarizer'

// Prompts (for advanced use)
export {
  buildSystemPrompt,
  buildUserPrompt,
  buildQuoteExtractionPrompt,
  buildDiscussionQuestionsPrompt,
  buildLitReviewOutlinePrompt,
} from './prompts'

// Cache
export {
  generateCacheKey,
  getCachedSummary,
  cacheSummary,
  deleteCachedSummary,
  clearSummarizationCache,
  cleanupExpiredSummaries,
  getCacheStats,
} from './cache'

// Hooks
export { useSummarization, useQuickSummarize } from './hooks/useSummarization'

// Worker client (client-side extractive summarization)
export {
  summarizeWithWorker,
  summarizeStrand,
  summarizeBlocks,
  quickSummarize,
  preloadSummarizationModel,
  clearSummarizationCache as clearWorkerCache,
  updateSummarizationFlags,
  getSummarizationFlags,
  getDefaultAlgorithm,
  initializeSummarization,
} from './summarizationWorkerClient'

// Worker types
export type {
  SummarizationAlgorithm,
  SummarizationTask,
  SummarizationResult,
  SummarizationProgress,
  SummarizationFeatureFlags,
} from './workerTypes'
