/**
 * Prompt Gallery Types
 * @module lib/prompts/types
 *
 * Extended prompt types with image support for the Prompt Gallery feature.
 * Builds on top of lib/quarry/prompts.ts WritingPrompt interface.
 */

import type { MoodState } from '@/lib/codex/mood'
import type { PromptCategory, PromptMode, WritingPrompt } from '@/lib/codex/prompts'

// Re-export base types for convenience
export type { MoodState, PromptCategory, PromptMode, WritingPrompt }

/**
 * Image generation style options
 */
export type ImageStyle =
  | 'watercolor'    // Soft, artistic, gentle flowing colors
  | 'minimalist'    // Clean lines, simple geometric shapes
  | 'abstract'      // Bold colors, conceptual art
  | 'nature'        // Botanical illustration, organic elements
  | 'cosmic'        // Space art, stars and galaxies
  | 'vintage'       // Retro style, aged paper texture

/**
 * Style configuration for image generation
 */
export interface ImageStyleConfig {
  id: ImageStyle
  label: string
  description: string
  promptSuffix: string
}

/**
 * All available image styles with their configurations
 */
export const IMAGE_STYLES: Record<ImageStyle, ImageStyleConfig> = {
  watercolor: {
    id: 'watercolor',
    label: 'Watercolor',
    description: 'Soft, artistic, gentle flowing colors',
    promptSuffix: 'soft watercolor painting style, gentle flowing colors, artistic and dreamy, delicate brushstrokes',
  },
  minimalist: {
    id: 'minimalist',
    label: 'Minimalist',
    description: 'Clean lines, simple geometric shapes',
    promptSuffix: 'minimalist design, clean lines, simple geometric shapes, lots of white space, modern aesthetic',
  },
  abstract: {
    id: 'abstract',
    label: 'Abstract',
    description: 'Bold colors, conceptual art',
    promptSuffix: 'abstract expressionist style, bold vibrant colors, geometric shapes, modern conceptual art',
  },
  nature: {
    id: 'nature',
    label: 'Nature',
    description: 'Botanical illustration, organic elements',
    promptSuffix: 'botanical illustration style, natural organic elements, leaves and plants, earthy tones, detailed',
  },
  cosmic: {
    id: 'cosmic',
    label: 'Cosmic',
    description: 'Space art, stars and galaxies',
    promptSuffix: 'cosmic space art style, stars galaxies nebulae, deep blues and purples, ethereal and vast',
  },
  vintage: {
    id: 'vintage',
    label: 'Vintage',
    description: 'Retro style, aged paper texture',
    promptSuffix: 'vintage retro illustration style, aged paper texture, muted warm tones, nostalgic aesthetic',
  },
}

/**
 * Extended prompt with image and gallery metadata
 */
export interface GalleryPrompt extends WritingPrompt {
  /** Base64 encoded image or URL */
  imageUrl?: string
  /** The prompt used for DALL-E generation */
  imagePrompt?: string
  /** Style used for image generation */
  imageStyle?: ImageStyle
  /** When the image was generated */
  imageGeneratedAt?: string
  /** Whether this is a user-created prompt */
  isCustom: boolean
  /** Whether user has favorited this prompt */
  isFavorite: boolean
  /** Number of times this prompt has been used */
  useCount: number
  /** Last time this prompt was used */
  lastUsedAt?: string
  /** When this prompt was created (for custom prompts) */
  createdAt: string
  /** Which mode this prompt appears in (write, reflect, or both) */
  mode: PromptMode
}

/**
 * Filter options for prompt gallery
 */
export interface PromptFilter {
  /** Filter by category */
  category?: PromptCategory
  /** Filter by mood compatibility */
  mood?: MoodState
  /** Filter by difficulty level */
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  /** Filter by mode (write, reflect) - prompts with 'both' are always included */
  mode?: 'write' | 'reflect'
  /** Only show favorites */
  onlyFavorites?: boolean
  /** Only show prompts with images */
  onlyWithImages?: boolean
  /** Only show custom prompts */
  onlyCustom?: boolean
  /** Text search query */
  search?: string
}

/**
 * Image generation request
 */
export interface ImageGenerationRequest {
  /** Prompt ID */
  promptId: string
  /** The writing prompt text */
  promptText: string
  /** Desired image style */
  style: ImageStyle
}

/**
 * Image generation result
 */
export interface ImageGenerationResult {
  /** Base64 encoded image data */
  imageData: string
  /** The actual prompt used by DALL-E (may be revised) */
  revisedPrompt: string
  /** Generation timestamp */
  generatedAt: string
}

/**
 * User preferences for prompts
 */
export interface PromptPreferences {
  /** Default image style for generation */
  defaultImageStyle: ImageStyle
  /** Auto-generate images when creating custom prompts */
  autoGenerateImages: boolean
  /** Show daily prompt widget in sidebar */
  showDailyPromptWidget: boolean
  /** Favorite categories for personalized suggestions */
  favoriteCategories: PromptCategory[]
  /** Default view mode for gallery */
  galleryViewMode: 'grid' | 'list'
  /** Number of columns in grid view */
  gridColumns: 2 | 3 | 4
}

/**
 * Default prompt preferences
 */
export const DEFAULT_PROMPT_PREFERENCES: PromptPreferences = {
  defaultImageStyle: 'watercolor',
  autoGenerateImages: false,
  showDailyPromptWidget: true,
  favoriteCategories: [],
  galleryViewMode: 'grid',
  gridColumns: 3,
}

/**
 * Prompt store state for persistence
 */
export interface PromptStoreState {
  /** Version for migrations */
  version: number
  /** All prompts (curated + custom) */
  prompts: GalleryPrompt[]
  /** User preferences */
  preferences: PromptPreferences
  /** Last sync timestamp */
  lastUpdated: string
}

/**
 * Category configuration with visual styling
 */
export interface PromptCategoryDisplay {
  id: PromptCategory
  label: string
  emoji: string
  gradient: string
  description: string
}

/**
 * Category display configurations for the gallery UI
 */
export const CATEGORY_DISPLAY: Record<PromptCategory, PromptCategoryDisplay> = {
  reflection: {
    id: 'reflection',
    label: 'Self',
    emoji: '🪞',
    gradient: 'from-indigo-500/20 to-purple-500/20',
    description: 'Look inward and document your thoughts',
  },
  creative: {
    id: 'creative',
    label: 'Creative',
    emoji: '🎨',
    gradient: 'from-pink-500/20 to-orange-500/20',
    description: 'Unleash your imagination',
  },
  technical: {
    id: 'technical',
    label: 'Technical',
    emoji: '⚙️',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    description: 'Document systems and processes',
  },
  philosophical: {
    id: 'philosophical',
    label: 'Deep',
    emoji: '🤔',
    gradient: 'from-rose-500/20 to-pink-500/20',
    description: 'Explore deep questions',
  },
  practical: {
    id: 'practical',
    label: 'Practical',
    emoji: '🛠️',
    gradient: 'from-amber-500/20 to-yellow-500/20',
    description: 'How-tos and guides',
  },
  exploration: {
    id: 'exploration',
    label: 'Explore',
    emoji: '🔭',
    gradient: 'from-cyan-500/20 to-teal-500/20',
    description: 'Discover and document',
  },
  personal: {
    id: 'personal',
    label: 'Personal',
    emoji: '📝',
    gradient: 'from-emerald-500/20 to-green-500/20',
    description: 'Your story and experiences',
  },
  learning: {
    id: 'learning',
    label: 'Learning',
    emoji: '📚',
    gradient: 'from-orange-500/20 to-red-500/20',
    description: 'Document what you learn',
  },
}

/**
 * Mood to gradient mapping for prompt cards without images
 */
export const MOOD_GRADIENTS: Record<MoodState, string> = {
  focused: 'from-blue-500/20 to-indigo-500/20',
  creative: 'from-purple-500/20 to-pink-500/20',
  curious: 'from-amber-500/20 to-orange-500/20',
  relaxed: 'from-emerald-500/20 to-teal-500/20',
  energetic: 'from-orange-500/20 to-red-500/20',
  reflective: 'from-indigo-500/20 to-violet-500/20',
  anxious: 'from-orange-500/20 to-amber-500/20',
  grateful: 'from-rose-500/20 to-pink-500/20',
  tired: 'from-slate-500/20 to-gray-500/20',
  peaceful: 'from-teal-500/20 to-cyan-500/20',
  excited: 'from-violet-500/20 to-purple-500/20',
  neutral: 'from-zinc-500/20 to-slate-500/20',
}
