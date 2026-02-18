/**
 * Image Generation Service
 * @module lib/images
 *
 * Unified interface for AI image generation with multiple providers.
 * Supports OpenAI DALL-E 3 and Replicate Flux.
 */

export {
  generateImage,
  getProvider,
  getAvailableProviders,
  estimateCost,
  type ImageProvider,
  type GenerateOptions,
  type GeneratedImage,
  type ProviderConfig,
} from './service'

export {
  OpenAIProvider,
  type OpenAIConfig,
} from './providers/openai'

export {
  ReplicateProvider,
  type ReplicateConfig,
} from './providers/replicate'

export {
  StyleMemory,
  type CharacterMemory,
  type CharacterDefinition,
  type SettingDefinition,
  type GlobalStyle,
} from './styleMemory'
