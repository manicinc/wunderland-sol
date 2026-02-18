/**
 * Supernote Constants and Defaults
 * @module lib/supernotes
 * 
 * Re-exports supernote-related constants from canvas shapes for convenience.
 * These are the default values used when creating new supernotes.
 */

// Re-export card sizes from canvas shapes
export { SUPERNOTE_CARD_SIZES, SUPERNOTE_STYLE_COLORS, DEFAULT_SHAPE_PROPS } from '@/components/quarry/ui/canvas/shapes/types'

/**
 * Default supernote background color (paper/amber theme)
 */
export const DEFAULT_SUPERNOTE_COLOR = '#fffbeb'

/**
 * Default supernote text color
 */
export const DEFAULT_SUPERNOTE_TEXT_COLOR = '#78350f'

/**
 * Default supernote border color
 */
export const DEFAULT_SUPERNOTE_BORDER_COLOR = '#fde68a'

/**
 * Default supernote font family
 */
export const DEFAULT_SUPERNOTE_FONT_FAMILY = 'system-ui, -apple-system, sans-serif'

/**
 * Default supernote texture
 */
export const DEFAULT_SUPERNOTE_TEXTURE = 'paper'

/**
 * Default supernote corner fold visibility
 */
export const DEFAULT_SUPERNOTE_HAS_CORNER_FOLD = true

/**
 * Available card size options for UI
 */
export const SUPERNOTE_CARD_SIZE_OPTIONS = [
  { value: '3x5', label: '3×5 Index Card', description: 'Standard index card' },
  { value: '4x6', label: '4×6 Index Card', description: 'Large index card' },
  { value: '5x7', label: '5×7 Note Card', description: 'Extra large note card' },
  { value: 'a7', label: 'A7 Size', description: 'European standard' },
  { value: 'square', label: 'Square', description: 'Perfect square' },
  { value: 'compact', label: 'Compact', description: 'Minimal footprint' },
] as const

/**
 * Available texture options for supernotes
 */
export const SUPERNOTE_TEXTURE_OPTIONS = [
  { value: 'paper', label: 'Paper', description: 'Subtle paper texture' },
  { value: 'smooth', label: 'Smooth', description: 'Clean flat surface' },
  { value: 'canvas', label: 'Canvas', description: 'Fabric-like texture' },
  { value: 'lined', label: 'Lined', description: 'Ruled lines' },
  { value: 'grid', label: 'Grid', description: 'Grid pattern' },
  { value: 'dotted', label: 'Dotted', description: 'Dot grid' },
] as const

