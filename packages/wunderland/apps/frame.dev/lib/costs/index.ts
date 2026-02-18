/**
 * LLM Cost Tracking Module
 * @module lib/costs
 *
 * Centralized cost tracking for all LLM API usage.
 * All data is stored locally - nothing is sent to external servers.
 */

// Pricing configuration
export {
  type TokenPricing,
  type ImagePricing,
  type ModelPricing,
  type LLMProviderName,
  ANTHROPIC_PRICING,
  OPENAI_PRICING,
  MISTRAL_PRICING,
  OPENROUTER_PRICING,
  OLLAMA_PRICING,
  getPricing,
  calculateTokenCost,
  calculateImageCost,
  estimateTokens,
  formatCost,
  getSupportedProviders,
  getModelsForProvider,
} from './pricingModels'

// Cost tracking service
export {
  type UsageRecord,
  type ImageUsageRecord,
  type CostSummary,
  type DailyCostEntry,
  type MonthlyProjection,
  recordTokenUsage,
  recordImageUsage,
  getCostSummary,
  getDailyCosts,
  getCurrentMonthProjection,
  getProviderBreakdown,
} from './costTrackingService'
