/**
 * Supernote Type Definitions
 * @module lib/supernotes/types
 *
 * Supernotes are compact, structured notecards that REQUIRE at least one supertag.
 * They are a constrained variant of strands optimized for quick capture and
 * canvas-based organization.
 *
 * Key differences from regular strands:
 * - Size-constrained (index card proportions)
 * - MUST have at least one supertag (provides structure)
 * - Distinctive visual styling (notecard appearance)
 * - Filterable separately from regular strands
 */

import type { SupertagSchema } from '@/lib/supertags/types'

// ============================================================================
// CARD SIZE PRESETS
// ============================================================================

/**
 * Standard card size presets (in pixels at 96 DPI)
 */
export type SupernoteCardSize = 
  | '3x5'      // Standard index card (288x192)
  | '4x6'      // Photo/recipe card (384x256)
  | '5x7'      // Note card (480x336)
  | 'a7'       // A7 paper (283x198)
  | 'square'   // Square card (256x256)
  | 'compact'  // Minimal card (240x160)
  | 'custom'   // User-defined dimensions

/**
 * Card size dimensions in pixels
 */
export interface CardDimensions {
  width: number
  height: number
  /** Aspect ratio (width/height) */
  aspectRatio: number
  /** Display name */
  label: string
  /** Real-world size reference */
  realSize?: string
}

/**
 * Predefined card size dimensions
 */
export const CARD_SIZE_PRESETS: Record<Exclude<SupernoteCardSize, 'custom'>, CardDimensions> = {
  '3x5': {
    width: 320,
    height: 200,
    aspectRatio: 1.6,
    label: '3×5 Index Card',
    realSize: '3" × 5"',
  },
  '4x6': {
    width: 384,
    height: 256,
    aspectRatio: 1.5,
    label: '4×6 Photo Card',
    realSize: '4" × 6"',
  },
  '5x7': {
    width: 448,
    height: 320,
    aspectRatio: 1.4,
    label: '5×7 Note Card',
    realSize: '5" × 7"',
  },
  'a7': {
    width: 298,
    height: 210,
    aspectRatio: 1.42,
    label: 'A7 Card',
    realSize: '74mm × 105mm',
  },
  'square': {
    width: 280,
    height: 280,
    aspectRatio: 1,
    label: 'Square Card',
  },
  'compact': {
    width: 260,
    height: 180,
    aspectRatio: 1.44,
    label: 'Compact Card',
  },
}

// ============================================================================
// SUPERNOTE SCHEMA
// ============================================================================

/**
 * Visual style options for supernotes
 */
export type SupernoteStyle = 
  | 'paper'      // Classic paper/notecard look
  | 'minimal'    // Clean minimal design
  | 'colored'    // Uses supertag color as background
  | 'glass'      // Glassmorphism effect
  | 'terminal'   // Terminal/code aesthetic

/**
 * Supernote schema definition (stored in strand frontmatter/strand.yml)
 */
export interface SupernoteSchema {
  /** Strand is a supernote */
  isSupernote: true
  
  /** Primary supertag (required) - provides structure */
  primarySupertag: string
  
  /** Additional supertags (optional) */
  additionalSupertags?: string[]
  
  /** Card size preset */
  cardSize: SupernoteCardSize
  
  /** Custom dimensions (when cardSize is 'custom') */
  customDimensions?: {
    width: number
    height: number
  }
  
  /** Visual style */
  style?: SupernoteStyle
  
  /** Parent supernote ID (for hierarchical linking) */
  parentSupernoteId?: string
  
  /** Color override (otherwise uses supertag color) */
  colorOverride?: string
}

/**
 * Full supernote data including supertag field values
 */
export interface Supernote {
  /** Unique ID (same as strand ID) */
  id: string
  
  /** Strand path */
  path: string
  
  /** Display title */
  title: string
  
  /** Content (markdown) - typically shorter than regular strands */
  content: string
  
  /** Supernote-specific schema */
  supernoteSchema: SupernoteSchema
  
  /** Primary supertag schema with resolved fields */
  primarySupertagSchema: SupertagSchema
  
  /** Field values from supertag */
  fieldValues: Record<string, unknown>
  
  /** Regular tags (in addition to supertags) */
  tags: string[]
  
  /** Wikilinks found in content */
  wikilinks: string[]
  
  /** Created timestamp */
  createdAt: string
  
  /** Updated timestamp */
  updatedAt: string
  
  /** Collaboration stats (optional) */
  stats?: SupernoteStats
}

/**
 * Collaboration and engagement stats
 */
export interface SupernoteStats {
  /** Number of likes/hearts */
  likes?: number
  /** Number of comments */
  comments?: number
  /** Number of contributors */
  contributors?: number
  /** Number of views */
  views?: number
}

// ============================================================================
// FILTER TYPES
// ============================================================================

/**
 * Filter mode for strand lists
 */
export type SupernoteFilterMode = 
  | 'all'           // Show all strands (regular + supernotes)
  | 'supernotes'    // Show only supernotes
  | 'regular'       // Show only regular strands (exclude supernotes)

/**
 * Supernote filter options
 */
export interface SupernoteFilterOptions {
  /** Filter mode */
  mode: SupernoteFilterMode
  
  /** Filter by specific supertag */
  supertagFilter?: string
  
  /** Filter by card size */
  cardSizeFilter?: SupernoteCardSize
  
  /** Filter by style */
  styleFilter?: SupernoteStyle
  
  /** Only show supernotes with parent */
  hasParent?: boolean
  
  /** Only show root supernotes (no parent) */
  isRoot?: boolean
}

// ============================================================================
// VISUAL MARKERS
// ============================================================================

/**
 * Badge/marker configuration for supernotes
 */
export interface SupernoteBadgeConfig {
  /** Show the supernote indicator badge */
  showBadge: boolean
  
  /** Badge position */
  badgePosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  
  /** Show supertag icon */
  showSupertagIcon: boolean
  
  /** Show card size indicator */
  showSizeIndicator: boolean
  
  /** Show parent link */
  showParentLink: boolean
}

/**
 * Default badge configuration
 */
export const DEFAULT_BADGE_CONFIG: SupernoteBadgeConfig = {
  showBadge: true,
  badgePosition: 'top-right',
  showSupertagIcon: true,
  showSizeIndicator: false,
  showParentLink: true,
}

// ============================================================================
// CANVAS SHAPE PROPS
// ============================================================================

/**
 * Supernote shape props for infinite canvas
 */
export interface SupernoteShapeProps {
  /** Width of shape */
  w: number
  /** Height of shape */
  h: number
  
  /** Supernote ID */
  supernoteId: string
  /** Strand path */
  strandPath: string
  
  /** Display title */
  title: string
  /** Content preview (truncated) */
  contentPreview: string
  
  /** Primary supertag name */
  primarySupertag: string
  /** Supertag schema ID */
  supertagSchemaId: string
  /** Supertag color */
  supertagColor: string
  /** Supertag icon */
  supertagIcon?: string
  
  /** Field values to display */
  fieldValues: Record<string, unknown>
  /** Which fields to show inline (max 3-4) */
  visibleFields: string[]
  
  /** Regular tags */
  tags: string[]
  
  /** Parent supernote info */
  parentSupernote?: {
    id: string
    title: string
    path: string
  }
  
  /** Visual style */
  style: SupernoteStyle
  
  /** Card size preset used */
  cardSize: SupernoteCardSize
  
  /** Is currently being edited inline */
  isEditing: boolean
  
  /** Is expanded (showing more fields) */
  isExpanded: boolean
  
  /** Is highlighted/selected */
  isHighlighted: boolean
  
  /** Stats for collaboration */
  stats?: SupernoteStats
  
  /** Created timestamp */
  createdAt: string
  /** Updated timestamp */
  updatedAt: string
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Minimal supernote reference for linking
 */
export interface SupernoteRef {
  id: string
  title: string
  path: string
  primarySupertag: string
  supertagColor?: string
}

/**
 * Supernote creation input
 */
export interface CreateSupernoteInput {
  /** Title (required) */
  title: string
  
  /** Content (optional, can be empty) */
  content?: string
  
  /** Primary supertag (required) */
  primarySupertag: string
  
  /** Initial field values */
  fieldValues?: Record<string, unknown>
  
  /** Card size */
  cardSize?: SupernoteCardSize
  
  /** Visual style */
  style?: SupernoteStyle
  
  /** Parent supernote (for nesting) */
  parentSupernoteId?: string
  
  /** Additional tags */
  tags?: string[]
  
  /** Target path in repository */
  targetPath?: string
}

