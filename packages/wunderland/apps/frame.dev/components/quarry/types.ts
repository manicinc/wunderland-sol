/**
 * Type definitions for Quarry Codex viewer components
 * @module codex/types
 */

import type { LucideIcon } from 'lucide-react'
import type { SourceMetadata } from '@/types/sourceMetadata'
import type { StrandLicense, LicenseDetectionSource } from '@/lib/strand/licenseTypes'

/**
 * GitHub API file/directory item
 */
export interface GitHubFile {
  /** File or directory name */
  name: string
  /** Full path from repo root */
  path: string
  /** Item type */
  type: 'file' | 'dir'
  /** Git SHA hash */
  sha: string
  /** File size in bytes (files only) */
  size?: number
  /** GitHub API URL */
  url: string
  /** GitHub web URL */
  html_url: string
  /** Raw content download URL (files only) */
  download_url?: string
}

/**
 * GitHub Git Tree API item
 */
export interface GitTreeItem {
  /** Full path from repo root */
  path: string
  /** Item type */
  type: 'blob' | 'tree'
  /** Git SHA hash */
  sha: string
  /** File size in bytes (blobs only) */
  size?: number
}

/**
 * Knowledge hierarchy level in Quarry Codex schema
 * - **Fabric**: Collection of weaves (the entire Quarry Codex repository is a fabric containing multiple weaves)
 * - **Weave**: Top-level knowledge universe (e.g., `weaves/technology/`) - complete, self-contained, no cross-weave dependencies
 * - **Loom**: Any subdirectory inside a weave - curated topic collection or module
 * - **Strand**: Atomic knowledge unit - can be EITHER:
 *   - A single markdown file with frontmatter (file-strand)
 *   - A folder with strand.yml schema (folder-strand) containing multiple files
 * - **Folder**: Generic directory outside the weaves hierarchy (not part of OpenStrand schema)
 * 
 * @remarks
 * A folder becomes a Strand (instead of a Loom) when it contains a strand.yml or strand.yaml file.
 * This allows grouping related content: images, notes, illustrations, media all belonging to one strand.
 */
export type NodeLevel = 'fabric' | 'weave' | 'loom' | 'collection' | 'strand' | 'folder'

/**
 * Strand type - distinguishes between file, folder, supernote, and moc strands
 * 
 * - **file**: Traditional single markdown file with frontmatter
 * - **folder**: Directory with strand.yml containing multiple files
 * - **supernote**: Compact notecard variant that REQUIRES at least one supertag
 *   Supernotes are size-constrained and optimized for canvas-based organization
 * - **moc**: Map of Content - structure note that organizes other strands
 *   MOCs serve as entry points and navigation hubs for topics
 */
export type StrandType = 'file' | 'folder' | 'supernote' | 'moc'

/**
 * MOC (Map of Content) scope levels
 */
export type MOCScope = 'subject' | 'topic' | 'project' | 'custom'

/**
 * MOC-specific configuration for structure notes
 */
export interface MOCConfig {
  /** Primary topic this MOC covers */
  topic: string
  /** Scope level of the MOC */
  scope: MOCScope
  /** Whether to auto-update linked strands */
  autoUpdate?: boolean
  /** Auto-generated sections in the MOC */
  sections?: string[]
  /** Manual ordering of linked strands */
  strandOrder?: string[]
}

/**
 * Card size presets for supernotes
 */
export type SupernoteCardSize = 
  | '3x5'      // Standard index card (320x200)
  | '4x6'      // Photo/recipe card (384x256)
  | '5x7'      // Note card (448x320)
  | 'a7'       // A7 paper (298x210)
  | 'square'   // Square card (280x280)
  | 'compact'  // Minimal card (260x180)
  | 'custom'   // User-defined dimensions

/**
 * Visual style for supernotes
 */
export type SupernoteStyle = 
  | 'paper'      // Classic paper/notecard look (default)
  | 'minimal'    // Clean minimal design
  | 'colored'    // Uses supertag color as background
  | 'glass'      // Glassmorphism effect
  | 'terminal'   // Terminal/code aesthetic

/**
 * Quality checklist for Zettelkasten-style note assessment
 * 
 * Helps ensure notes are well-formed and useful for future self.
 * Based on the principle: "A bad note is a future task"
 */
export interface NoteQualityChecks {
  /** Does the note explain why the content matters? */
  hasContext?: boolean
  /** Does the note link to related notes? */
  hasConnections?: boolean
  /** Is the note focused on a single idea? (atomicity) */
  isAtomic?: boolean
  /** Can future-self understand without external context? */
  isSelfContained?: boolean
  /** Has the note been reviewed for accuracy? */
  isVerified?: boolean
  /** Does the note cite sources where applicable? */
  hasSources?: boolean
}

/**
 * Supernote-specific schema fields (for strandType: 'supernote')
 */
export interface SupernoteSchema {
  /** Strand is a supernote - always true */
  isSupernote: true
  
  /** Primary supertag (REQUIRED) - provides structure */
  primarySupertag: string
  
  /** Additional supertags (optional) */
  additionalSupertags?: string[]
  
  /** Card size preset */
  cardSize: SupernoteCardSize
  
  /** Custom dimensions when cardSize is 'custom' */
  customDimensions?: {
    width: number
    height: number
  }
  
  /** Visual style */
  style?: SupernoteStyle
  
  /** Parent supernote ID for hierarchical linking */
  parentSupernoteId?: string
  
  /** Color override (uses supertag color if not set) */
  colorOverride?: string
  
  /** Quality assessment checklist */
  qualityChecks?: NoteQualityChecks
}

/**
 * File inclusion configuration for folder-strands
 */
export interface StrandIncludes {
  /** Markdown/MDX content files */
  content?: string[]
  /** Image files (illustrations, diagrams) */
  images?: string[]
  /** Video, audio, other media */
  media?: string[]
  /** JSON, YAML, CSV data files */
  data?: string[]
  /** Supplementary note files */
  notes?: string[]
}

/** Media asset types */
export type MediaAssetType = 'image' | 'audio' | 'video' | 'drawing' | 'document'

/** Asset source types */
export type MediaAssetSource = 'camera' | 'upload' | 'voice' | 'whiteboard' | 'external'

/**
 * Detailed media asset metadata for strand schema
 * Used to track captured/uploaded media with sync status
 */
export interface StrandMediaAsset {
  /** Relative path within strand folder */
  path: string
  /** Asset type */
  type: MediaAssetType
  /** How the asset was created/captured */
  source: MediaAssetSource
  /** When the asset was captured/uploaded (ISO timestamp) */
  capturedAt?: string
  /** Sync status with remote storage */
  syncStatus?: 'local' | 'synced' | 'pending' | 'error'
  /** Original filename before rename */
  originalName?: string
  /** File size in bytes */
  size?: number
  /** MIME type */
  mimeType?: string
  /** SHA checksum for deduplication */
  checksum?: string
}

/**
 * Custom styling for tree nodes
 * Also exported as NodeVisualStyle for backwards compatibility
 */
export interface NodeStyle {
  /** Background color */
  backgroundColor?: string
  /** Text color */
  textColor?: string
  /** Accent color for badges/icons */
  accentColor?: string
  /** Custom emoji icon */
  emoji?: string
  /** Lucide icon name */
  icon?: string
  /** Use dark text (for light backgrounds) */
  darkText?: boolean
  /** Thumbnail image URL */
  thumbnail?: string
  /** Cover image URL or data URL */
  coverImage?: string
  /** Generated pattern type (geometric, waves, mesh, constellation, etc.) */
  coverPattern?: string
  /** Primary color for generated covers */
  coverColor?: string
  /** Background image URL */
  backgroundImage?: string
  /** Border color */
  borderColor?: string
  /** Background gradient CSS value */
  backgroundGradient?: string
  /** Background overlay opacity (0-1) */
  backgroundOpacity?: number
}

/** Alias for backwards compatibility */
export type NodeVisualStyle = NodeStyle

/**
 * Hierarchical knowledge tree node
 */
export interface KnowledgeTreeNode {
  /** Display name */
  name: string
  /** Full path from repo root */
  path: string
  /** Node type */
  type: 'file' | 'dir'
  /** Child nodes (directories only) */
  children?: KnowledgeTreeNode[]
  /** Total markdown files in subtree */
  strandCount: number
  /** Codex hierarchy level */
  level: NodeLevel
  /** Custom styling from loom.yaml */
  style?: NodeStyle
  /** Description from loom.yaml or weave.yaml */
  description?: string
}

/**
 * Note maturity status for Zettelkasten-style progression
 * 
 * Tracks the refinement level of a note:
 * - fleeting: Quick capture, unrefined idea
 * - literature: Notes from external sources
 * - permanent: Refined, standalone ideas in your own words
 * - evergreen: Continuously maintained, core concepts
 */
export type NoteMaturityStatus = 'fleeting' | 'literature' | 'permanent' | 'evergreen'

/**
 * Note maturity tracking for Zettelkasten workflow
 */
export interface NoteMaturity {
  /** Current maturity status */
  status: NoteMaturityStatus
  /** When the note was last refined/upgraded */
  lastRefinedAt?: string
  /** Number of refinement passes */
  refinementCount?: number
  /** Self-assessed future value */
  futureValue?: 'low' | 'medium' | 'high' | 'core'
}

/**
 * Maturity stage metadata for display
 */
export const NOTE_MATURITY_META: Record<NoteMaturityStatus, {
  label: string
  description: string
  color: string
  bgColor: string
  icon: string
}> = {
  fleeting: {
    label: 'Fleeting',
    description: 'Quick capture, needs processing',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    icon: 'Zap',
  },
  literature: {
    label: 'Literature',
    description: 'Notes from external sources',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    icon: 'BookOpen',
  },
  permanent: {
    label: 'Permanent',
    description: 'Refined idea in your own words',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    icon: 'FileCheck',
  },
  evergreen: {
    label: 'Evergreen',
    description: 'Core concept, continuously maintained',
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    icon: 'TreeDeciduous',
  },
}

/**
 * Parsed YAML frontmatter metadata
 */
type DifficultyScale = 'beginner' | 'intermediate' | 'advanced'

type DifficultyBreakdown = {
  overall?: string | number
  cognitive?: number
  prerequisites?: number
  conceptual?: number
  [key: string]: string | number | undefined
}

export interface StrandMetadata {
  /** Unique identifier (UUID) */
  id?: string
  /** URL-safe slug */
  slug?: string
  /** Display title */
  title?: string
  /** Semantic version */
  version?: string
  
  /** 
   * Strand type - file, folder, or supernote
   * - file: Traditional single markdown file with frontmatter
   * - folder: Directory with strand.yml containing multiple files
   * - supernote: Compact notecard that REQUIRES at least one supertag
   */
  strandType?: StrandType
  
  /**
   * Entry file for folder-strands (e.g., 'index.md', 'README.md')
   * Only used when strandType is 'folder'
   */
  entryFile?: string
  
  // === Supernote-specific fields (when strandType is 'supernote') ===
  
  /**
   * Whether this strand is a supernote
   * Supernotes are compact notecards that REQUIRE at least one supertag
   */
  isSupernote?: boolean
  
  /**
   * Primary supertag for supernotes (REQUIRED when isSupernote is true)
   * This provides the structured fields for the notecard
   */
  primarySupertag?: string
  
  /**
   * Additional supertags beyond the primary (optional)
   */
  additionalSupertags?: string[]
  
  /**
   * Card size preset for supernotes
   * @default '3x5'
   */
  supernoteCardSize?: SupernoteCardSize
  
  /**
   * Custom dimensions when supernoteCardSize is 'custom'
   */
  supernoteCustomDimensions?: {
    width: number
    height: number
  }
  
  /**
   * Visual style for supernotes
   * @default 'paper'
   */
  supernoteStyle?: SupernoteStyle
  
  /**
   * Parent supernote ID for hierarchical organization
   */
  parentSupernoteId?: string
  
  /**
   * Color override for supernote (uses supertag color if not set)
   */
  supernoteColorOverride?: string

  // === Note Maturity (Zettelkasten workflow) ===

  /**
   * Note maturity tracking for Zettelkasten-style progression
   * 
   * Tracks the refinement level of a note from fleeting capture
   * through to evergreen reference material.
   * 
   * @example
   * ```yaml
   * maturity:
   *   status: permanent
   *   lastRefinedAt: 2024-01-15
   *   refinementCount: 3
   *   futureValue: high
   * ```
   */
  maturity?: NoteMaturity

  // === MOC (Map of Content) fields (when strandType is 'moc') ===

  /**
   * Whether this strand is a Map of Content (structure note)
   * MOCs organize and provide entry points to related strands
   */
  isMOC?: boolean

  /**
   * MOC configuration for structure notes
   * 
   * @example
   * ```yaml
   * mocConfig:
   *   topic: "React Hooks"
   *   scope: topic
   *   autoUpdate: true
   * ```
   */
  mocConfig?: MOCConfig

  // === Quality Assessment ===

  /**
   * Quality checklist for Zettelkasten-style note assessment
   * 
   * Helps ensure notes are well-formed and useful for future self.
   * 
   * @example
   * ```yaml
   * qualityChecks:
   *   hasContext: true
   *   hasConnections: true
   *   isAtomic: true
   *   isSelfContained: false
   * ```
   */
  qualityChecks?: NoteQualityChecks
  
  /**
   * File inclusions for folder-strands
   * Specifies which files belong to this strand
   */
  includes?: StrandIncludes
  
  /**
   * Glob patterns to exclude from folder-strands
   * Default: ['*.draft.md', '*.wip.*', '_*']
   */
  excludes?: string[]
  
  /**
   * All files belonging to this strand (computed at index time)
   * For file-strands: just the file itself
   * For folder-strands: all included files
   */
  strandFiles?: Array<{
    path: string
    type: 'content' | 'image' | 'media' | 'data' | 'note'
    role?: 'entry' | 'supplementary' | 'illustration' | 'reference'
  }>
  
  /** Content difficulty level */
  difficulty?: DifficultyScale | DifficultyBreakdown
  /** Taxonomy classification */
  taxonomy?: {
    /** High-level subjects */
    subjects?: string[]
    /** Specific topics */
    topics?: string[]
  }
  /** Auto-generated metadata from NLP analysis */
  autoGenerated?: {
    /** Extracted keywords */
    keywords?: string[]
    /** Extracted key phrases */
    phrases?: string[]
    /** Auto-detected subjects */
    subjects?: string[]
    /** Auto-detected topics */
    topics?: string[]
    /** Auto-detected skills (learning prerequisites) */
    skills?: string[]
    /** Auto-detected difficulty */
    difficulty?: string
    /** Confidence scores for classifications */
    confidence?: Record<string, number>
    /** Reading level metrics */
    readingLevel?: number
    /** Extracted entities */
    entities?: {
      people?: string[]
      places?: string[]
      organizations?: string[]
      topics?: string[]
    }
    /** Auto-generated summary */
    summary?: string
    /** AI-generated summary */
    aiSummary?: string
    /** Timestamp of last indexing */
    lastIndexed?: string
  }
  /** Freeform tags */
  tags?: string | string[]
  /**
   * Skills required to understand this strand
   * 
   * @remarks
   * Skills are like tags but specifically for spiral learning prerequisites.
   * They represent generalized, transferable competencies (e.g., "typescript", 
   * "javascript", "react", "git") that a reader should have before tackling this strand.
   * 
   * Skills differ from tags:
   * - **Skills**: Prerequisites for learning (what you need to know)
   * - **Tags**: Categorization (what the content is about)
   * 
   * Skills should be as generalized as possible to enable path planning across
   * multiple strands. The spiral learning algorithm uses skills to calculate
   * prerequisite paths.
   * 
   * @example
   * ```yaml
   * skills:
   *   - typescript
   *   - react-hooks
   *   - state-management
   * ```
   */
  skills?: string[]
  /** Content type - 'collection' recommended for folder-strands */
  contentType?: string
  /** Related strands */
  relationships?: {
    /** Referenced strands */
    references?: string[]
    /** Required prerequisite strands */
    prerequisites?: string[]
    /** See also / related content */
    seeAlso?: string[]
  }
  /** Publishing metadata */
  publishing?: {
    /** Publication status */
    status?: 'draft' | 'published' | 'archived'
    /** Last updated timestamp */
    lastUpdated?: string
  }
  /** Auto-generated extractive summary */
  summary?: string
  /** AI-authored abstractive summary */
  aiSummary?: string
  /** Curated notes */
  notes?: string[] | string
  /** Auto-tagging configuration for this document */
  autoTagConfig?: AutoTagConfig
  /** Block-level summaries with tags, illustrations, media */
  blockSummaries?: BlockSummary[]
  /** Document-level illustrations */
  illustrations?: StrandIllustration[]
  /** Document-level galleries */
  galleries?: StrandGallery[]
  /** SEO configuration */
  seo?: StrandSEO
  /** Reader mode display settings */
  readerSettings?: {
    /** Show placeholder when no illustration for block */
    showIllustrationPlaceholder?: boolean
    /** Default placeholder image URL */
    placeholderImage?: string
    /** Illustration display mode */
    illustrationMode?: 'per-block' | 'persistent' | 'none'
  }

  /** Source metadata - tracks strand provenance and creation */
  source?: SourceMetadata

  // === Licensing ===

  /**
   * Content license for this strand
   * @default 'none' (unspecified)
   */
  license?: StrandLicense

  /**
   * Custom license text (used when license is 'custom')
   */
  licenseText?: string

  /**
   * URL to the full license document
   */
  licenseUrl?: string

  /**
   * How the license was detected/set
   */
  licenseDetectedFrom?: LicenseDetectionSource

  /**
   * Confidence score for auto-detected licenses (0-1)
   */
  licenseConfidence?: number

  /** Catch-all for other fields */
  [key: string]: any
}

/* ═══════════════════════════════════════════════════════════════════════════
   COLLECTION TYPES - Visual organization of strands
═══════════════════════════════════════════════════════════════════════════ */

/**
 * View modes for displaying collection contents
 */
export type CollectionViewMode = 'cards' | 'grid' | 'timeline' | 'graph' | 'freeform'

/**
 * Connection relationship types for collection connections
 * Maps to ConnectionRelationshipType in canvas/shapes/types.ts
 */
export type CollectionConnectionType =
  | 'references'      // Cites or mentions
  | 'prerequisites'   // Required before
  | 'seeAlso'         // Related content
  | 'extends'         // Builds upon
  | 'contradicts'     // Opposing view
  | 'implements'      // Concrete implementation
  | 'exemplifies'     // Example of
  | 'sharedTags'      // Auto-discovered: shared tags
  | 'sharedTopics'    // Auto-discovered: shared topics
  | 'sameLoom'        // Auto-discovered: same loom
  | 'sameWeave'       // Auto-discovered: same weave
  | 'backlink'        // Auto-discovered: content backlink
  | 'custom'          // User-defined

/**
 * Connection between strands in a collection
 */
export interface CollectionConnection {
  /** Source strand path */
  source: string
  /** Target strand path */
  target: string
  /** Relationship type */
  type: CollectionConnectionType
  /** Whether this was auto-discovered vs user-created */
  discovered?: boolean
  /** Connection strength/weight (0-1) */
  strength?: number
  /** User-provided label for custom connections */
  label?: string
}

/**
 * Position data for a strand within a collection canvas
 */
export interface CollectionStrandPosition {
  /** X coordinate on canvas */
  x: number
  /** Y coordinate on canvas */
  y: number
  /** Optional Z-index for layering */
  z?: number
}

/**
 * Collection metadata - visual grouping of related strands
 *
 * Collections are curated groups that can span across weaves and looms,
 * allowing users to organize knowledge visually on an infinite canvas.
 *
 * @example
 * ```yaml
 * # collection.yml
 * title: "AI Course Plan"
 * description: "CS-401 AI Principles & Techniques"
 * icon: "brain"
 * color: "#8b5cf6"
 * viewMode: cards
 * strands:
 *   - path: weaves/technology/machine-learning/intro.md
 *     position: { x: 100, y: 200 }
 *   - path: weaves/technology/neural-networks/basics.md
 *     position: { x: 400, y: 200 }
 * ```
 */
export interface CollectionMetadata {
  /** Unique identifier (UUID) */
  id: string
  /** Display title */
  title: string
  /** Description of the collection */
  description?: string
  /** Icon name (Lucide icon) or emoji */
  icon?: string
  /** Collection accent color (hex) */
  color?: string

  // === Members (can span weaves/looms) ===

  /** Strand paths included in this collection */
  strandPaths: string[]
  /** Loom slugs for filtering (optional) */
  loomSlugs?: string[]
  /** Weave slugs for filtering (optional) */
  weaveSlugs?: string[]

  // === Cover ===

  /** Custom cover image URL */
  coverImage?: string
  /** Generated cover pattern type */
  coverPattern?: 'geometric' | 'waves' | 'mesh' | 'circuits' | 'topography' | 'aurora' | 'crystalline' | 'constellation' | 'abstract' | 'hexagons'
  /** Secondary color for cover gradient */
  coverSecondaryColor?: string

  // === Visual layout ===

  /** View mode for displaying the collection */
  viewMode: CollectionViewMode
  /** Saved positions for freeform/canvas view */
  positions?: Record<string, CollectionStrandPosition>
  /** Zoom level for canvas view */
  zoom?: number
  /** Viewport center for canvas view */
  viewportCenter?: { x: number; y: number }

  // === Connections ===

  /** User-created and auto-discovered connections */
  connections?: CollectionConnection[]
  /** Show discovered connections (tags, topics, etc.) */
  showDiscoveredConnections?: boolean

  // === Smart collection (dynamic filtering) ===

  /** If set, collection updates dynamically based on filter */
  smartFilter?: {
    /** Filter by tags */
    tags?: string[]
    /** Filter by subjects */
    subjects?: string[]
    /** Filter by topics */
    topics?: string[]
    /** Filter by weave */
    weaveSlug?: string
    /** Filter by loom */
    loomSlug?: string
    /** Filter by date range */
    dateRange?: { start?: string; end?: string }
    /** Max strands to include */
    limit?: number
  }

  // === Metadata ===

  /** ISO timestamp when created */
  createdAt: string
  /** ISO timestamp when last updated */
  updatedAt: string
  /** User who created (for multi-user scenarios) */
  createdBy?: string
  /** Whether collection is pinned/starred */
  pinned?: boolean
  /** Sort order when listing collections */
  sortOrder?: number

  // === System collections ===

  /** Whether this is a system collection (cannot be deleted/renamed) */
  isSystem?: boolean
  /** System collection type identifier */
  systemType?: 'favorites' | 'recent' | 'inbox'
}

/**
 * Worthiness signal weights for block tagging
 */
export interface WorthinessWeights {
  /** Weight for topic shift signal (default 0.4) */
  topicShift?: number
  /** Weight for entity density signal (default 0.3) */
  entityDensity?: number
  /** Weight for semantic novelty signal (default 0.3) */
  semanticNovelty?: number
}

/**
 * Worthiness signals for a block
 */
export interface WorthinessSignals {
  /** 0-1: How different is this block from document theme */
  topicShift: number
  /** 0-1: Tech entities / concepts per word */
  entityDensity: number
  /** 0-1: Embedding distance from surrounding blocks */
  semanticNovelty: number
}

/**
 * Result of block worthiness calculation
 */
export interface WorthinessResult {
  /** Combined 0-1 score */
  score: number
  /** Individual signals */
  signals: WorthinessSignals
  /** Above threshold? */
  worthy: boolean
  /** Explanation of worthiness decision */
  reasoning: string
}

/**
 * LLM provider options
 */
export type LLMProvider = 'claude' | 'openai' | 'openrouter'

/**
 * Configuration for which block types to show in summaries
 */
export interface BlockVisibilityConfig {
  showParagraphs: boolean
  showLists: boolean
  showHeadings: boolean
  showCode: boolean
  showBlockquotes: boolean
  showTables: boolean
}

/**
 * Extractive summarization configuration
 */
export interface SummarizationConfig {
  algorithm: 'textrank' | 'lead' | 'lead-first' | 'tfidf'
  maxLength: number
  maxLengthPerBlock: number
  textRankIterations: number
  dampingFactor: number
  positionBiasWeight: number
  entityDensityWeight: number
  useBertEmbeddings: boolean
  minSimilarity: number
}

/**
 * Abstractive summary configuration (LLM-based)
 */
export interface AbstractiveSummaryConfig {
  enabled: boolean
  provider: LLMProvider
  model: string
  maxTokens: number
  temperature: number
  systemPrompt: string
}

/**
 * Complete summary settings combining extractive and abstractive
 */
export interface SummarySettings {
  extractive: SummarizationConfig
  abstractive: AbstractiveSummaryConfig
  blockVisibility: BlockVisibilityConfig
  preferAbstractive: boolean
  cacheResults: boolean
}

/**
 * Auto-tagging configuration for documents and blocks
 * Cascading: if document auto-tag is off, block auto-tag is also off
 */
export interface AutoTagConfig {
  /** Enable auto-tagging at document level */
  documentAutoTag?: boolean
  /** Enable auto-tagging at block level (requires documentAutoTag=true) */
  blockAutoTag?: boolean
  /** Use LLM for intelligent tagging (vs statistical NLP only) */
  useLLM?: boolean
  /** Prefer existing tags over creating new ones */
  preferExistingTags?: boolean
  /** Maximum new tags to create per block */
  maxNewTagsPerBlock?: number
  /** Maximum new tags to create per document */
  maxNewTagsPerDocument?: number
  /** Tag confidence threshold (0-1) for auto-suggestion */
  confidenceThreshold?: number

  // === Block-level tagging options ===

  /** LLM provider preference order (first available wins) */
  llmProviderOrder?: LLMProvider[]
  /** Block worthiness threshold (0-1), blocks below this don't get tags */
  blockWorthinessThreshold?: number
  /** Enable tag bubbling from blocks to document */
  enableTagBubbling?: boolean
  /** Minimum block occurrences for tag to bubble up to document */
  tagBubblingThreshold?: number
  /** Worthiness signals weights for block tagging */
  worthinessWeights?: WorthinessWeights
}

/**
 * External media reference (YouTube, audio, video, links)
 */
export interface MediaReference {
  /** Unique identifier */
  id: string
  /** Media type */
  type: 'youtube' | 'video' | 'audio' | 'link' | 'embed'
  /** Source URL */
  url: string
  /** Display title */
  title?: string
  /** Description/caption */
  description?: string
  /** Thumbnail URL */
  thumbnail?: string
  /** Duration in seconds (for audio/video) */
  duration?: number
  /** Start time in seconds (for clips) */
  startTime?: number
  /** End time in seconds (for clips) */
  endTime?: number
  /** Reference type */
  refType?: 'source' | 'related' | 'supplementary' | 'example'
}

/**
 * Block-level illustration with intelligent display logic
 */
export interface BlockIllustration {
  /** Unique identifier */
  id: string
  /** Image source URL */
  src: string
  /** Alt text for accessibility */
  alt?: string
  /** Image caption */
  caption?: string
  /** AI generation style used */
  style?: string
  /** Prompt used to generate this image */
  generationPrompt?: string
  /** Whether this was AI-generated */
  aiGenerated?: boolean
  /** Whether this illustration should be shown for this block
   * If false, reader mode will show previous block's illustration */
  showForBlock?: boolean
  /** Priority weight for display (higher = more likely to show) */
  priority?: number
}

/**
 * Block-level summary for reader mode
 * Enhanced with block-level tags, media references, and illustrations
 */
export interface BlockSummary {
  /** Unique block identifier */
  blockId: string
  /** Type of markdown block */
  blockType: 'heading' | 'paragraph' | 'code' | 'list' | 'blockquote' | 'table' | 'html'
  /** Heading level (1-6) if blockType is 'heading' */
  headingLevel?: number
  /** Heading slug for anchor links */
  headingSlug?: string
  /** Starting line number in source */
  startLine: number
  /** Ending line number in source */
  endLine: number
  /** Raw content of this block */
  rawContent?: string
  /** Extractive summary (direct excerpt) */
  extractive: string
  /** AI-generated abstractive summary */
  abstractive?: string
  /** Curated notes for this block */
  notes?: string[]
  /** Block-level tags (in addition to document tags) */
  tags?: string[]
  /** Auto-generated tag suggestions (pre-acceptance) */
  suggestedTags?: Array<{
    tag: string
    confidence: number
    /** Tag source: inline (explicit #hashtag), nlp (vocabulary), llm (AI), existing (propagated) */
    source: 'inline' | 'llm' | 'nlp' | 'existing'
    reasoning?: string
  }>
  /** Block-specific illustrations */
  illustrations?: BlockIllustration[]
  /** Whether this block warrants a new illustration
   * If false, reader mode continues showing previous illustration */
  warrantsNewIllustration?: boolean
  /** External media references */
  mediaRefs?: MediaReference[]
  /** Whether auto-tagging is enabled for this specific block */
  autoTagEnabled?: boolean
  /** Combined worthiness score for tagging (0-1) */
  worthinessScore?: number
  /** Individual signals used to calculate worthiness */
  worthinessSignals?: WorthinessSignals
}

/**
 * Illustration attached to a strand or block
 */
export interface StrandIllustration {
  /** Unique identifier */
  id: string
  /** Associated block ID (optional) */
  blockId?: string
  /** Image source URL */
  src: string
  /** Alt text for accessibility */
  alt?: string
  /** Image caption */
  caption?: string
  /** AI generation style used */
  style?: string
  /** Prompt used to generate this image */
  generationPrompt?: string
  /** Whether this was AI-generated */
  aiGenerated?: boolean
  /** Width (CSS value) */
  width?: string
  /** Position relative to content */
  position?: 'left' | 'right' | 'center' | 'full'
}

/**
 * Gallery of related illustrations
 */
export interface StrandGallery {
  /** Unique identifier */
  id: string
  /** Gallery title */
  title?: string
  /** Gallery description */
  description?: string
  /** Images in this gallery */
  images: StrandIllustration[]
  /** Layout mode */
  layout?: 'grid' | 'carousel' | 'masonry'
}

/**
 * SEO configuration for a strand
 */
export interface StrandSEO {
  /** Allow search engine indexing */
  index?: boolean
  /** Allow link following */
  follow?: boolean
  /** Canonical URL override */
  canonicalUrl?: string
  /** Meta description override */
  metaDescription?: string
  /** OpenGraph image URL */
  ogImage?: string
  /** Sitemap priority (0.0 - 1.0) */
  sitemapPriority?: number
  /** Change frequency hint */
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
}

/**
 * File filter scope - controls what types of files are shown
 * - **strands**: Only markdown files with metadata (cataloged knowledge)
 * - **media**: Markdown files + media assets (images, audio, video, PDFs)
 * - **configs**: JSON/YAML/TOML config files
 * - **all**: All repository files (except .gitignore entries)
 */
export type FileFilterScope = 'strands' | 'media' | 'configs' | 'text' | 'images' | 'all'

/**
 * Navigation root scope
 * - fabric: Start at weaves/ folder (default, shows Fabric content only)
 * - root: Show entire repository structure (includes READMEs, configs, etc.)
 */
export type NavigationRootScope = 'fabric' | 'weaves'

/**
 * Supertag field filter for searching by field values
 * @example { tagName: 'task', fieldName: 'status', operator: '=', value: 'done' }
 */
export interface SupertagFieldFilter {
  /** Supertag name (e.g., "task", "person") */
  tagName: string
  /** Field name within the supertag schema */
  fieldName: string
  /** Comparison operator */
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains'
  /** Value to compare against */
  value: unknown
}

/**
 * Search filter options
 */
export interface SearchOptions {
  /** Search query string */
  query: string
  /** Search in file names */
  searchNames: boolean
  /** Search in file content (full-text) */
  searchContent: boolean
  /** Case-sensitive search */
  caseSensitive: boolean
  /** Use regex for search pattern matching */
  useRegex?: boolean
  /** Filter scope (what types of files to show) */
  filterScope: FileFilterScope
  /** Hide folders that don't contain matching files */
  hideEmptyFolders: boolean
  /** Navigation root scope (fabric-only or full repo) */
  rootScope: NavigationRootScope
  /** Filter by difficulty */
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  /** Filter by tags */
  tags?: string[]
  /** Filter by subjects */
  subjects?: string[]
  /** Filter by supertag field values */
  supertagFilters?: SupertagFieldFilter[]
}

/**
 * Date filter configuration for calendar-based filtering
 */
export interface DateFilter {
  /** Filter mode */
  mode: 'single' | 'range' | 'none'
  /** Start date (ISO 8601 format) */
  startDate?: string
  /** End date for range selection (ISO 8601 format) */
  endDate?: string
}

/**
 * Advanced filter options for calendar, tags, and exclusions
 */
export interface AdvancedFilterOptions {
  /** Date-based filtering using frontmatter date field */
  dateFilter: DateFilter
  /** Selected tags for filtering (multi-select) */
  selectedTags: string[]
  /** Tag match mode - 'any' for OR, 'all' for AND */
  tagMatchMode: 'any' | 'all'
  /** Selected subjects from taxonomy */
  selectedSubjects: string[]
  /** Selected topics from taxonomy */
  selectedTopics: string[]
  /** Paths to exclude from view */
  excludedPaths: string[]
}

/**
 * Position data for tracking tree node positions during filtering
 * Used to preserve hidden items' positions during drag-drop
 */
export interface PositionData {
  /** Parent directory path */
  parentPath: string
  /** Index among siblings */
  index: number
  /** When position was recorded */
  timestamp: number
  /** Whether item is currently hidden by filters */
  isHidden: boolean
}

/**
 * Position tracking state for the entire tree
 */
export interface PositionTrackingState {
  /** Map of path to position data */
  positions: Record<string, PositionData>
  /** Timestamp of last snapshot */
  lastSnapshot: number
  /** True if positions changed since last save */
  isDirty: boolean
}

/**
 * Date index entry for efficient date-based filtering
 */
export interface DateIndexEntry {
  /** File path */
  path: string
  /** Date value (ISO 8601 format) */
  date: string
  /** Source of the date (frontmatter, git, etc.) */
  dateSource: 'frontmatter' | 'git' | 'filesystem'
}

/**
 * Aggregated date index for the codex
 */
export interface DateIndex {
  /** All date entries */
  entries: DateIndexEntry[]
  /** Earliest date in the index */
  minDate?: string
  /** Latest date in the index */
  maxDate?: string
  /** Available years for quick filtering */
  availableYears: number[]
  /** Available year-month pairs */
  availableMonths: { year: number; month: number }[]
}

/**
 * Sidebar display mode
 * FABRIC Plugin System: Allows plugin-defined sidebar modes
 */
export type BuiltInSidebarMode = 'tree' | 'toc' | 'supertags' | 'graph' | 'query' | 'plugins' | 'planner' | 'preview' | 'collections' | 'insights'
export type SidebarMode = BuiltInSidebarMode | string // Allow plugin mode IDs

/**
 * Viewer display mode
 */
export type ViewerMode = 'modal' | 'page'

/**
 * Level-specific styling configuration
 */
export interface LevelStyle {
  /** Display label */
  label: string
  /** Tailwind CSS classes */
  className: string
  /** Icon component */
  icon?: LucideIcon
}

/**
 * Tag index entry for tag-based navigation
 */
export interface TagIndexEntry {
  /** Tag name */
  name: string
  /** Number of strands with this tag */
  count: number
  /** File paths tagged with this */
  paths: string[]
}

/**
 * Tags index structure for the entire codex
 */
export interface TagsIndex {
  /** All tags */
  tags: TagIndexEntry[]
  /** All subjects from taxonomy */
  subjects: TagIndexEntry[]
  /** All topics from taxonomy */
  topics: TagIndexEntry[]
  /** All skills from vocabulary classification */
  skills: TagIndexEntry[]
}

/**
 * Props for QuarryQuarryViewer component
 */
export interface QuarryQuarryViewerProps {
  /** Whether the viewer is open (modal mode) */
  isOpen: boolean
  /** Close callback (modal mode) */
  onClose?: () => void
  /** Display mode */
  mode?: ViewerMode
  /** Initial path to load */
  initialPath?: string
  /** Initial file to load (for clean URL routing) */
  initialFile?: string | null
  /** Initial view to display */
  initialView?: 'document' | 'planner' | 'search' | 'research' | 'new' | 'analytics' | 'browse' | 'tags'
}

/** @deprecated Use QuarryQuarryViewerProps instead */
export type FrameQuarryViewerProps = QuarryQuarryViewerProps