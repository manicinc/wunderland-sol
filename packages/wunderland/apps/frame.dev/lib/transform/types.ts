/**
 * Transformation System Types
 * @module lib/transform/types
 *
 * Types for transforming strands into structured supertag data.
 * Enables multi-select workflows like Tana's bulk operations.
 */

import type { SupertagSchema, SupertagFieldDefinition } from '@/lib/supertags/types'
import type { SelectedStrand } from '@/components/quarry/contexts/SelectedStrandsContext'

// ============================================================================
// EXTRACTION TYPES
// ============================================================================

/**
 * Source of extracted field value
 */
export type ExtractionSource =
  | 'title'        // From strand title or first heading
  | 'content'      // From markdown content body
  | 'frontmatter'  // From YAML frontmatter
  | 'tags'         // From strand tags
  | 'filename'     // From filename parsing
  | 'manual'       // User-provided value
  | 'ai'           // AI-extracted value

/**
 * Field extraction result from content analysis
 */
export interface ExtractedFieldValue {
  /** Field name from schema */
  fieldName: string
  /** Extracted value */
  value: unknown
  /** Extraction confidence (0-1) */
  confidence: number
  /** Source of extraction */
  source: ExtractionSource
  /** Human-readable preview */
  preview?: string
  /** Raw matched text */
  matchedText?: string
  /** Position in content (for highlighting) */
  position?: {
    start: number
    end: number
  }
}

/**
 * Options for content extraction
 */
export interface ExtractionOptions {
  /** Use AI for extraction (requires API key) */
  useAI?: boolean
  /** AI provider to use */
  aiProvider?: 'openai' | 'anthropic'
  /** Custom extraction patterns */
  patterns?: Record<string, string>
  /** Language for date parsing */
  locale?: string
}

// ============================================================================
// FIELD MAPPING TYPES
// ============================================================================

/**
 * Mapping configuration for a single field
 */
export interface FieldMappingConfig {
  /** Field name from schema */
  fieldName: string
  /** Field type from schema */
  fieldType: string
  /** Extraction source mode */
  extractionSource: 'auto' | ExtractionSource
  /** Manual value override */
  manualValue?: unknown
  /** Custom regex pattern for extraction */
  pattern?: string
  /** Default value if extraction fails */
  defaultValue?: unknown
  /** Whether to skip this field */
  skip?: boolean
}

/**
 * Complete field mappings for a transformation
 */
export interface FieldMappings {
  /** Target supertag schema */
  schema: SupertagSchema
  /** Per-field configurations */
  fields: FieldMappingConfig[]
}

// ============================================================================
// FILTER TYPES
// ============================================================================

/**
 * Tag match mode for filtering
 */
export type TagMatchMode = 'any' | 'all' | 'none'

/**
 * Date field for filtering
 */
export type DateField = 'created' | 'updated' | 'frontmatter'

/**
 * Filter options for strand selection
 */
export interface TransformFilters {
  /** Tags to filter by */
  tags?: string[]
  /** How to match tags */
  tagMatchMode?: TagMatchMode
  /** Date range filter */
  dateRange?: {
    start?: string  // ISO date
    end?: string    // ISO date
  }
  /** Which date field to filter */
  dateField?: DateField
  /** Text search query */
  searchQuery?: string
  /** Paths to exclude */
  excludePaths?: string[]
  /** Only include strands with status */
  status?: ('draft' | 'published' | 'archived')[]
  /** Only include strands with difficulty */
  difficulty?: ('beginner' | 'intermediate' | 'advanced')[]
}

// ============================================================================
// POST-ACTION TYPES
// ============================================================================

/**
 * Actions to perform after transformation
 */
export type TransformPostAction =
  | { type: 'addTag'; tag: string }
  | { type: 'removeTag'; tag: string }
  | { type: 'moveTo'; path: string }
  | { type: 'archive' }
  | { type: 'setStatus'; status: 'draft' | 'published' | 'archived' }
  | { type: 'link'; targetStrand: string; relationshipType?: string }

// ============================================================================
// TRANSFORM CONFIG TYPES
// ============================================================================

/**
 * Complete transformation configuration
 */
export interface TransformConfig {
  /** Target supertag to apply */
  targetSupertag: SupertagSchema
  /** Field mapping configuration */
  fieldMappings: FieldMappingConfig[]
  /** Filter options for strand selection */
  filters: TransformFilters
  /** Post-transform actions */
  postActions: TransformPostAction[]
  /** Extraction options */
  extractionOptions?: ExtractionOptions
  /** Whether to preview without applying */
  previewOnly?: boolean
}

// ============================================================================
// RESULT TYPES
// ============================================================================

/**
 * Transformation result for a single strand
 */
export interface TransformResult {
  /** Strand ID */
  strandId: string
  /** Strand path */
  strandPath: string
  /** Strand title */
  strandTitle: string
  /** Whether transformation succeeded */
  success: boolean
  /** Error message if failed */
  error?: string
  /** Extracted field values */
  extractedValues: Record<string, ExtractedFieldValue>
  /** Applied supertag name */
  appliedSupertag?: string
  /** Field values that were applied */
  appliedValues?: Record<string, unknown>
  /** Post-actions that were executed */
  executedActions?: TransformPostAction[]
  /** Warnings (non-fatal issues) */
  warnings?: string[]
}

/**
 * Batch transformation result
 */
export interface BatchTransformResult {
  /** Total strands processed */
  total: number
  /** Successfully transformed */
  successful: number
  /** Failed transformations */
  failed: number
  /** Skipped (filtered out) */
  skipped: number
  /** Individual results */
  results: TransformResult[]
  /** Overall duration in ms */
  duration: number
  /** Aggregate warnings */
  warnings?: string[]
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

/**
 * Transform modal step
 */
export type TransformStep =
  | 'select-supertag'
  | 'configure-filters'
  | 'map-fields'
  | 'preview'
  | 'processing'
  | 'complete'

/**
 * Transform modal state
 */
export interface TransformModalState {
  /** Current step */
  step: TransformStep
  /** Partial configuration */
  config: Partial<TransformConfig>
  /** Preview results */
  preview: TransformResult[]
  /** Whether processing */
  isProcessing: boolean
  /** Processing progress (0-100) */
  progress: number
  /** Current error */
  error?: string
  /** Selected strands for transformation */
  selectedStrands: SelectedStrand[]
  /** Filtered strands after applying filters */
  filteredStrands: SelectedStrand[]
}

// ============================================================================
// SELECTION TYPES
// ============================================================================

/**
 * Selection mode for strand lists
 */
export type SelectionMode = 'single' | 'multi' | 'range'

/**
 * Extended selection state
 */
export interface ExtendedSelectionState {
  /** Selection mode */
  mode: SelectionMode
  /** Last selected ID (for range selection) */
  lastSelectedId?: string
  /** Anchor ID for shift-click range */
  anchorId?: string
  /** Whether selection toolbar is visible */
  showToolbar: boolean
}

// ============================================================================
// WORKFLOW PRESET TYPES
// ============================================================================

/**
 * Pre-configured transformation workflows
 */
export interface TransformWorkflowPreset {
  /** Unique preset ID */
  id: string
  /** Display name */
  name: string
  /** Description */
  description: string
  /** Icon name */
  icon?: string
  /** Target supertag */
  targetSupertag: string
  /** Default field mappings */
  defaultMappings: Partial<FieldMappingConfig>[]
  /** Suggested filters */
  suggestedFilters?: Partial<TransformFilters>
}

/**
 * Built-in workflow presets
 */
export const WORKFLOW_PRESETS: TransformWorkflowPreset[] = [
  {
    id: 'strands-to-tasks',
    name: 'Strands to Tasks',
    description: 'Convert selected strands into actionable tasks',
    icon: 'CheckSquare',
    targetSupertag: 'task',
    defaultMappings: [
      { fieldName: 'title', fieldType: 'text', extractionSource: 'title' },
      { fieldName: 'status', fieldType: 'select', extractionSource: 'content', defaultValue: 'todo' },
      { fieldName: 'priority', fieldType: 'select', extractionSource: 'content', defaultValue: 'medium' },
      { fieldName: 'due_date', fieldType: 'date', extractionSource: 'auto' },
      { fieldName: 'notes', fieldType: 'textarea', extractionSource: 'content' },
    ],
  },
  {
    id: 'strands-to-meeting',
    name: 'Strands to Meeting',
    description: 'Create meeting agenda from strands',
    icon: 'Calendar',
    targetSupertag: 'meeting',
    defaultMappings: [
      { fieldName: 'title', fieldType: 'text', extractionSource: 'title' },
      { fieldName: 'date', fieldType: 'datetime', extractionSource: 'frontmatter' },
      { fieldName: 'attendees', fieldType: 'tags', extractionSource: 'content' },
      { fieldName: 'agenda', fieldType: 'textarea', extractionSource: 'content' },
      { fieldName: 'notes', fieldType: 'textarea', extractionSource: 'content' },
      { fieldName: 'action_items', fieldType: 'textarea', extractionSource: 'content' },
    ],
  },
  {
    id: 'strands-to-project',
    name: 'Strands to Project',
    description: 'Transform strands into project entries',
    icon: 'Folder',
    targetSupertag: 'project',
    defaultMappings: [
      { fieldName: 'name', fieldType: 'text', extractionSource: 'title' },
      { fieldName: 'description', fieldType: 'textarea', extractionSource: 'content' },
      { fieldName: 'status', fieldType: 'select', extractionSource: 'frontmatter', defaultValue: 'planning' },
      { fieldName: 'start_date', fieldType: 'date', extractionSource: 'frontmatter' },
      { fieldName: 'progress', fieldType: 'progress', extractionSource: 'auto', defaultValue: 0 },
    ],
  },
  {
    id: 'strands-to-idea',
    name: 'Strands to Ideas',
    description: 'Capture strands as idea entries',
    icon: 'Lightbulb',
    targetSupertag: 'idea',
    defaultMappings: [
      { fieldName: 'title', fieldType: 'text', extractionSource: 'title' },
      { fieldName: 'description', fieldType: 'textarea', extractionSource: 'content' },
      { fieldName: 'status', fieldType: 'select', extractionSource: 'auto', defaultValue: 'raw' },
      { fieldName: 'potential', fieldType: 'rating', extractionSource: 'manual' },
      { fieldName: 'related', fieldType: 'tags', extractionSource: 'tags' },
    ],
  },
  {
    id: 'strands-to-decision',
    name: 'Strands to Decisions',
    description: 'Document strands as decisions',
    icon: 'GitBranch',
    targetSupertag: 'decision',
    defaultMappings: [
      { fieldName: 'decision', fieldType: 'text', extractionSource: 'title' },
      { fieldName: 'context', fieldType: 'textarea', extractionSource: 'content' },
      { fieldName: 'rationale', fieldType: 'textarea', extractionSource: 'content' },
      { fieldName: 'date', fieldType: 'date', extractionSource: 'frontmatter' },
      { fieldName: 'stakeholders', fieldType: 'tags', extractionSource: 'content' },
      { fieldName: 'status', fieldType: 'select', extractionSource: 'auto', defaultValue: 'proposed' },
    ],
  },
]
