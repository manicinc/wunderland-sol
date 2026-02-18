/**
 * Prompt Gallery System
 * @module lib/prompts
 *
 * Unified exports for the prompt gallery feature including:
 * - Types and interfaces
 * - IndexedDB storage
 * - DALL-E 3 image generation
 * - High-level prompt management
 */

// Types
export type {
  MoodState,
  PromptCategory,
  PromptMode,
  WritingPrompt,
  ImageStyle,
  ImageStyleConfig,
  GalleryPrompt,
  PromptFilter,
  ImageGenerationRequest,
  ImageGenerationResult,
  PromptPreferences,
  PromptStoreState,
  PromptCategoryDisplay,
} from './types'

export {
  IMAGE_STYLES,
  DEFAULT_PROMPT_PREFERENCES,
  CATEGORY_DISPLAY,
  MOOD_GRADIENTS,
} from './types'

// Store
export { PromptStore, getPromptStore } from './promptStore'

// Image Generator
export {
  PromptImageGenerator,
  getPromptImageGenerator,
  isImageGenerationAvailable,
  NoAPIKeyError,
  ImageGenerationError,
} from './promptImageGenerator'

// Manager
export {
  PromptManager,
  getPromptManager,
  type ProgressCallback,
} from './promptManager'

// Mode Service
export {
  PromptModeService,
  getPromptModeService,
  getCurrentTimeOfDay,
  type ProjectType,
  type TimeOfDay,
  type PromptContext,
} from './promptModeService'
