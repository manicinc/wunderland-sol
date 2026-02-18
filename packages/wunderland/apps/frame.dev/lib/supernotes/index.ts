/**
 * Supernotes Module
 * @module lib/supernotes
 *
 * Supernotes are compact, structured notecards that require at least one supertag.
 * They are a constrained variant of strands optimized for quick capture and
 * canvas-based organization.
 *
 * @example
 * ```tsx
 * import { 
 *   isSupernoteSchema, 
 *   validateCreateSupernoteInput,
 *   getCardSizeDimensions,
 *   CARD_SIZE_PRESETS,
 * } from '@/lib/supernotes'
 *
 * // Check if a strand is a supernote
 * if (isSupernoteSchema(strand.frontmatter)) {
 *   // Handle supernote-specific logic
 * }
 *
 * // Validate creation input
 * const validation = validateCreateSupernoteInput({
 *   title: 'My Task',
 *   primarySupertag: 'task',
 * })
 * ```
 */

// Types
export type {
  SupernoteCardSize,
  CardDimensions,
  SupernoteStyle,
  SupernoteSchema,
  Supernote,
  SupernoteStats,
  SupernoteFilterMode,
  SupernoteFilterOptions,
  SupernoteBadgeConfig,
  SupernoteShapeProps,
  SupernoteRef,
  CreateSupernoteInput,
} from './types'

export { 
  CARD_SIZE_PRESETS,
  DEFAULT_BADGE_CONFIG,
} from './types'

// Validation
export {
  validateSupernoteSchema,
  validateCreateSupernoteInput,
  validateSupertagExists,
  isSupernoteSchema,
  isSupernoteFromFrontmatter,
  isSupernoteByPath,
  extractSupernoteSchema,
  generateSupernoteFrontmatter,
  getCardDimensions,
  type SupernoteValidationError,
  type SupernoteValidationResult,
} from './validation'

// Card sizes
export {
  getCardSizeDimensions,
  getCardSizeOptions,
  scaleCardDimensions,
  fitCardInContainer,
  findClosestPreset,
  clampSupernoteDimensions,
  getCardPrintDimensions,
  getCardContainerStyles,
  SUPERNOTE_SIZE_CONSTRAINTS,
} from './cardSizes'

