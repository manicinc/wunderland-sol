/**
 * Transclusion Type Definitions
 * @module lib/transclusion/types
 *
 * Types for the block transclusion system that enables:
 * - Block references: [[strand#block-id]] syntax
 * - Block embeds: ![[strand#block-id]] syntax
 * - Automatic backlink tracking
 * - Live content updates
 *
 * Inspired by Roam Research and Tana's transclusion capabilities.
 */

// ============================================================================
// REFERENCE TYPES
// ============================================================================

/**
 * Types of block references
 */
export type ReferenceType =
  | 'link'      // [[strand#block-id]] - clickable link to block
  | 'embed'     // ![[strand#block-id]] - inline embed of block content
  | 'citation'  // ^[[strand#block-id]] - citation/footnote style
  | 'mirror'    // =[[strand#block-id]] - live mirror (edits sync)

/**
 * Semantic relationship types for link context
 * 
 * Used with extended wikilink syntax: [[target::relation|why]]
 * Example: [[react-hooks::extends|Builds on the useState concept]]
 */
export type LinkRelationType =
  | 'extends'      // Builds upon or expands the target
  | 'contrasts'    // Presents an opposing or alternative view
  | 'supports'     // Provides evidence or backing for the target
  | 'example-of'   // Concrete example or instance of the target
  | 'implements'   // Practical implementation of the target concept
  | 'questions'    // Raises questions or challenges the target
  | 'refines'      // Narrows or clarifies the target
  | 'applies'      // Applies the target in a new context
  | 'summarizes'   // Provides a summary of the target
  | 'custom'       // User-defined relationship

/**
 * Parsed block reference from markdown content
 * 
 * Supports extended syntax with semantic relations:
 * - [[strand::relation]] - Link with relation type
 * - [[strand::relation|context]] - Link with relation and explanation
 * - [[strand#block::relation|context]] - Block reference with relation
 */
export interface ParsedBlockReference {
  /** Full match string (e.g., "![[path/to/strand#block-5]]") */
  rawMatch: string
  /** Reference type based on prefix */
  type: ReferenceType
  /** Target strand path (e.g., "path/to/strand") */
  strandPath: string
  /** Target block ID within the strand (e.g., "block-5") */
  blockId: string
  /** Optional display alias (e.g., "[[path#block|Custom Text]]") */
  alias?: string
  /** Semantic relation type (e.g., "extends", "contrasts") */
  relationType?: LinkRelationType
  /** Context explaining why this connection exists */
  relationContext?: string
  /** Start position in source text */
  startIndex: number
  /** End position in source text */
  endIndex: number
  /** Line number in source */
  lineNumber: number
}

/**
 * Block reference stored in database
 */
export interface BlockReference {
  /** Unique reference ID */
  id: string
  /** Source block that contains the reference */
  sourceBlockId: string
  /** Source strand path */
  sourceStrandPath: string
  /** Target strand path being referenced */
  targetStrandPath: string
  /** Position in source content (character offset) */
  targetPosition: number
  /** Type of reference */
  referenceType: ReferenceType
  /** When the reference was created */
  createdAt: string
}

/**
 * Block backlink (computed from references)
 */
export interface BlockBacklink {
  /** Unique backlink ID */
  id: string
  /** Block ID that is being referenced */
  blockId: string
  /** Strand path that contains the reference */
  referencingStrandPath: string
  /** Block ID that contains the reference (optional) */
  referencingBlockId?: string
  /** Context snippet around the reference */
  contextSnippet?: string
  /** When the backlink was created */
  createdAt: string
}

// ============================================================================
// RESOLVED CONTENT TYPES
// ============================================================================

/**
 * Resolved block content for rendering
 */
export interface ResolvedBlockContent {
  /** Block ID */
  blockId: string
  /** Block type (paragraph, heading, code, etc.) */
  blockType: string
  /** Raw content of the block */
  content: string
  /** Extractive summary */
  summary?: string
  /** Heading level if heading block */
  headingLevel?: number
  /** Tags on the block */
  tags: string[]
  /** Source strand path */
  strandPath: string
  /** Source strand title */
  strandTitle: string
  /** Whether the source strand still exists */
  exists: boolean
  /** Last updated timestamp */
  updatedAt: string
}

/**
 * Transclusion render context
 */
export interface TransclusionContext {
  /** Current strand path (to prevent self-references) */
  currentStrandPath: string
  /** Depth of transclusion (to prevent infinite loops) */
  depth: number
  /** Maximum allowed depth */
  maxDepth: number
  /** Block IDs already rendered (cycle detection) */
  renderedBlockIds: Set<string>
  /** Whether to show backlinks count */
  showBacklinkCount: boolean
  /** Whether to allow editing of transcluded content */
  allowEdit: boolean
  /** Theme for styling */
  theme: 'light' | 'dark'
}

// ============================================================================
// BACKLINK TYPES
// ============================================================================

/**
 * Backlink with full context
 */
export interface BacklinkWithContext {
  /** The backlink record */
  backlink: BlockBacklink
  /** Source strand metadata */
  sourceStrand: {
    path: string
    title: string
    weave?: string
    loom?: string
  }
  /** The block containing the reference */
  sourceBlock?: {
    blockId: string
    blockType: string
    content: string
  }
  /** When the reference was made */
  referencedAt: string
}

/**
 * Backlink stats for a block or strand
 */
export interface BacklinkStats {
  /** Total number of backlinks */
  total: number
  /** Number of unique strands referencing */
  uniqueStrands: number
  /** Breakdown by reference type */
  byType: Record<ReferenceType, number>
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Transclusion event types
 */
export type TransclusionEventType =
  | 'reference:created'
  | 'reference:deleted'
  | 'reference:updated'
  | 'backlink:created'
  | 'backlink:deleted'
  | 'content:changed'

/**
 * Transclusion event
 */
export interface TransclusionEvent {
  type: TransclusionEventType
  strandPath: string
  blockId?: string
  referenceId?: string
  timestamp: string
}

/**
 * Event callback type
 */
export type TransclusionEventCallback = (event: TransclusionEvent) => void

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Transclusion system configuration
 */
export interface TransclusionConfig {
  /** Maximum transclusion depth (default: 3) */
  maxDepth: number
  /** Whether to show inline previews on hover */
  showHoverPreview: boolean
  /** Preview delay in milliseconds */
  hoverPreviewDelay: number
  /** Whether to enable live mirroring (experimental) */
  enableMirror: boolean
  /** Whether to track citation counts */
  trackCitations: boolean
  /** Whether to show backlink indicators in editor */
  showBacklinkIndicators: boolean
  /** Auto-update backlinks when content changes */
  autoUpdateBacklinks: boolean
}

/**
 * Default configuration
 */
export const DEFAULT_TRANSCLUSION_CONFIG: TransclusionConfig = {
  maxDepth: 3,
  showHoverPreview: true,
  hoverPreviewDelay: 300,
  enableMirror: false,
  trackCitations: true,
  showBacklinkIndicators: true,
  autoUpdateBacklinks: true,
}

// ============================================================================
// REGEX PATTERNS
// ============================================================================

/**
 * Regex patterns for parsing block references
 *
 * Supported syntaxes:
 * - [[strand-path]] - Simple strand link
 * - [[strand-path#block-id]] - Block link
 * - [[strand-path#block-id|alias]] - Link with alias
 * - [[strand-path::relation]] - Link with semantic relation
 * - [[strand-path::relation|context]] - Link with relation and context
 * - [[strand-path#block-id::relation|context]] - Full syntax
 * - ![[strand-path#block-id]] - Embed
 * - ^[[strand-path#block-id]] - Citation
 * - =[[strand-path#block-id]] - Mirror (experimental)
 */
export const BLOCK_REFERENCE_PATTERNS = {
  /** Full block reference pattern (with optional relation syntax) */
  full: /([!=^]?)\[\[([^\]#|:]+)(?:#([^\]|:]+))?(?:::([a-z-]+))?(?:\|([^\]]+))?\]\]/g,

  /** Embed only pattern */
  embed: /!\[\[([^\]#|:]+)(?:#([^\]|:]+))?(?:::([a-z-]+))?(?:\|([^\]]+))?\]\]/g,

  /** Link only pattern (with relation support) */
  link: /(?<![!=^])\[\[([^\]#|:]+)(?:#([^\]|:]+))?(?:::([a-z-]+))?(?:\|([^\]]+))?\]\]/g,

  /** Citation pattern */
  citation: /\^\[\[([^\]#|:]+)(?:#([^\]|:]+))?(?:::([a-z-]+))?(?:\|([^\]]+))?\]\]/g,

  /** Mirror pattern */
  mirror: /=\[\[([^\]#|:]+)(?:#([^\]|:]+))?(?:::([a-z-]+))?(?:\|([^\]]+))?\]\]/g,

  /** Simple strand link (no block, with optional relation) */
  strandLink: /(?<![!=^])\[\[([^\]#|:]+)(?:::([a-z-]+))?(?:\|([^\]]+))?\]\]/g,
}

/**
 * Valid relation types for link context
 */
export const VALID_RELATION_TYPES: LinkRelationType[] = [
  'extends',
  'contrasts',
  'supports',
  'example-of',
  'implements',
  'questions',
  'refines',
  'applies',
  'summarizes',
  'custom',
]

/**
 * Check if a string is a valid relation type
 */
export function isValidRelationType(value: string): value is LinkRelationType {
  return VALID_RELATION_TYPES.includes(value as LinkRelationType)
}

/**
 * Parse relation type from string, returns undefined if invalid
 */
export function parseRelationType(value: string | undefined): LinkRelationType | undefined {
  if (!value) return undefined
  const normalized = value.toLowerCase().trim()
  return isValidRelationType(normalized) ? normalized : 'custom'
}
