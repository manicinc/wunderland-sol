/**
 * Card Size Utilities
 * @module lib/supernotes/cardSizes
 *
 * Utilities for working with supernote card sizes and dimensions.
 */

import { 
  CARD_SIZE_PRESETS, 
  type SupernoteCardSize, 
  type CardDimensions 
} from './types'

// ============================================================================
// SIZE UTILITIES
// ============================================================================

/**
 * Get dimensions for a card size preset
 */
export function getCardSizeDimensions(
  size: SupernoteCardSize,
  customDimensions?: { width: number; height: number }
): CardDimensions {
  if (size === 'custom') {
    if (!customDimensions) {
      // Fallback to 3x5 if no custom dimensions
      return CARD_SIZE_PRESETS['3x5']
    }
    return {
      width: customDimensions.width,
      height: customDimensions.height,
      aspectRatio: customDimensions.width / customDimensions.height,
      label: 'Custom Size',
    }
  }
  
  return CARD_SIZE_PRESETS[size] || CARD_SIZE_PRESETS['3x5']
}

/**
 * Get all available card size options for UI selectors
 */
export function getCardSizeOptions(): Array<{
  value: SupernoteCardSize
  label: string
  dimensions: string
}> {
  return [
    { value: '3x5', label: '3×5 Index Card', dimensions: '320 × 200' },
    { value: '4x6', label: '4×6 Photo Card', dimensions: '384 × 256' },
    { value: '5x7', label: '5×7 Note Card', dimensions: '448 × 320' },
    { value: 'a7', label: 'A7 Card', dimensions: '298 × 210' },
    { value: 'square', label: 'Square Card', dimensions: '280 × 280' },
    { value: 'compact', label: 'Compact Card', dimensions: '260 × 180' },
    { value: 'custom', label: 'Custom Size', dimensions: 'User defined' },
  ]
}

/**
 * Calculate scaled dimensions while maintaining aspect ratio
 */
export function scaleCardDimensions(
  dimensions: CardDimensions,
  scale: number
): { width: number; height: number } {
  return {
    width: Math.round(dimensions.width * scale),
    height: Math.round(dimensions.height * scale),
  }
}

/**
 * Fit card dimensions within a container while maintaining aspect ratio
 */
export function fitCardInContainer(
  cardDimensions: CardDimensions,
  containerWidth: number,
  containerHeight: number,
  padding: number = 0
): { width: number; height: number; scale: number } {
  const availableWidth = containerWidth - padding * 2
  const availableHeight = containerHeight - padding * 2
  
  const scaleX = availableWidth / cardDimensions.width
  const scaleY = availableHeight / cardDimensions.height
  const scale = Math.min(scaleX, scaleY, 1) // Don't scale up, only down
  
  return {
    width: Math.round(cardDimensions.width * scale),
    height: Math.round(cardDimensions.height * scale),
    scale,
  }
}

/**
 * Get the closest preset size for given dimensions
 */
export function findClosestPreset(
  width: number,
  height: number
): SupernoteCardSize {
  const aspectRatio = width / height
  
  let closestSize: SupernoteCardSize = '3x5'
  let closestDiff = Infinity
  
  for (const [size, dims] of Object.entries(CARD_SIZE_PRESETS)) {
    const diff = Math.abs(dims.aspectRatio - aspectRatio)
    if (diff < closestDiff) {
      closestDiff = diff
      closestSize = size as SupernoteCardSize
    }
  }
  
  return closestSize
}

// ============================================================================
// CANVAS CONSTRAINTS
// ============================================================================

/**
 * Minimum and maximum dimensions for supernotes on canvas
 */
export const SUPERNOTE_SIZE_CONSTRAINTS = {
  minWidth: 180,
  minHeight: 120,
  maxWidth: 600,
  maxHeight: 450,
}

/**
 * Clamp dimensions to valid supernote range
 */
export function clampSupernoteDimensions(
  width: number,
  height: number
): { width: number; height: number } {
  return {
    width: Math.max(
      SUPERNOTE_SIZE_CONSTRAINTS.minWidth,
      Math.min(SUPERNOTE_SIZE_CONSTRAINTS.maxWidth, width)
    ),
    height: Math.max(
      SUPERNOTE_SIZE_CONSTRAINTS.minHeight,
      Math.min(SUPERNOTE_SIZE_CONSTRAINTS.maxHeight, height)
    ),
  }
}

// ============================================================================
// PRINT/EXPORT UTILITIES
// ============================================================================

/**
 * Get dimensions for printing at specific DPI
 */
export function getCardPrintDimensions(
  size: SupernoteCardSize,
  dpi: number = 300
): { widthPx: number; heightPx: number; widthInches: number; heightInches: number } {
  const dims = getCardSizeDimensions(size)
  
  // Convert from screen pixels (96 DPI) to print pixels
  const scaleFactor = dpi / 96
  
  return {
    widthPx: Math.round(dims.width * scaleFactor),
    heightPx: Math.round(dims.height * scaleFactor),
    widthInches: dims.width / 96,
    heightInches: dims.height / 96,
  }
}

/**
 * Get CSS styles for card container
 */
export function getCardContainerStyles(
  size: SupernoteCardSize,
  customDimensions?: { width: number; height: number }
): React.CSSProperties {
  const dims = getCardSizeDimensions(size, customDimensions)
  
  return {
    width: dims.width,
    height: dims.height,
    minWidth: SUPERNOTE_SIZE_CONSTRAINTS.minWidth,
    minHeight: SUPERNOTE_SIZE_CONSTRAINTS.minHeight,
    maxWidth: SUPERNOTE_SIZE_CONSTRAINTS.maxWidth,
    maxHeight: SUPERNOTE_SIZE_CONSTRAINTS.maxHeight,
  }
}

