/**
 * TypeScript Types for Categorization System
 * @module lib/categorization/types
 */

import type { StrandMetadata } from '@/lib/content/types'

/**
 * Categorization result status
 */
export type CategorizationResultStatus =
  | 'pending'     // Awaiting review
  | 'approved'    // Approved for action
  | 'rejected'    // Rejected, file stays in inbox
  | 'modified'    // User modified the suggestion

/**
 * Categorization action status
 */
export type CategorizationActionStatus =
  | 'pending'     // Waiting to sync
  | 'syncing'     // Currently syncing to GitHub
  | 'completed'   // Successfully synced
  | 'failed'      // Sync failed

/**
 * Action type for GitHub sync
 */
export type CategorizationActionType =
  | 'move'        // High confidence auto-move
  | 'create_pr'   // Medium confidence PR
  | 'create_issue' // Low confidence issue

/**
 * Category suggestion from algorithm
 */
export interface CategorySuggestion {
  /** Suggested category path (e.g., 'weaves/wiki/tutorials/') */
  category: string
  /** Confidence score (0.0 to 1.0) */
  confidence: number
  /** Explanation of why this category was chosen */
  reasoning: string
  /** Alternative category suggestions */
  alternatives: Array<{
    category: string
    confidence: number
    reasoning: string
  }>
}

/**
 * Result of categorizing a single file
 */
export interface CategoryResult {
  /** File path being categorized */
  filePath: string
  /** Current category path */
  currentPath: string
  /** Categorization suggestion */
  suggestion: CategorySuggestion
  /** Recommended action based on confidence */
  action: 'auto-apply' | 'suggest' | 'needs-triage'
}

/**
 * Categorization result record (database)
 */
export interface CategorizationResult {
  id: string
  job_id: string
  strand_path: string
  current_category: string
  suggested_category: string
  confidence: number
  reasoning: string
  alternatives: string // JSON array
  status: CategorizationResultStatus
  review_notes?: string
  final_category?: string
  created_at: string
  reviewed_at?: string
  applied_at?: string
}

/**
 * Categorization action record (database)
 */
export interface CategorizationAction {
  id: string
  result_id: string
  action_type: CategorizationActionType
  from_path: string
  to_path: string
  strand_content: string
  metadata: string // JSON
  status: CategorizationActionStatus
  sync_error?: string
  github_pr_number?: number
  github_pr_url?: string
  created_at: string
  synced_at?: string
}

/**
 * Categorization configuration
 */
export interface CategorizationConfig {
  /** Enable/disable categorization */
  enabled: boolean
  /** Confidence threshold for auto-apply (default: 0.95) */
  auto_apply_threshold: number
  /** Confidence threshold for PR creation (default: 0.80) */
  pr_threshold: number
  /** Category definitions with keywords */
  categories: CategoryDefinition[]
  /** Paths to exclude from categorization */
  excluded_paths: string[]
  /** Custom keyword hints */
  keyword_hints?: Record<string, string[]>
}

/**
 * Category definition with matching keywords
 */
export interface CategoryDefinition {
  /** Category path (e.g., 'weaves/wiki/tutorials/') */
  path: string
  /** Human-readable label */
  label: string
  /** Description of what belongs in this category */
  description: string
  /** Keywords that indicate this category */
  keywords: string[]
  /** Weight multiplier for keyword matches (default: 1.0) */
  weight?: number
}

/**
 * Input for categorization algorithm
 */
export interface CategorizationInput {
  /** File path */
  path: string
  /** Document title */
  title: string
  /** Document content (markdown) */
  content: string
  /** Frontmatter metadata */
  frontmatter?: StrandMetadata
  /** Categorization config */
  config: CategorizationConfig
}

/**
 * Categorization job payload
 */
export interface CategorizationJobPayload {
  /** Paths to inbox files to categorize */
  inboxPaths: string[]
  /** Auto-apply high-confidence results */
  autoApply?: boolean
  /** Confidence threshold for auto-apply */
  autoApplyThreshold?: number
}

/**
 * Categorization job result
 */
export interface CategorizationJobResult {
  /** Total files processed */
  filesProcessed: number
  /** Auto-applied categorizations */
  autoApplied: number
  /** Pending manual review */
  pendingReview: number
  /** Failed categorizations */
  failed: number
  /** Result IDs */
  resultIds: string[]
}

/**
 * GitHub sync result
 */
export interface SyncResult {
  /** Successfully synced actions */
  synced: number
  /** Failed actions */
  failed: number
  /** Error details */
  errors: Array<{
    actionId: string
    error: string
  }>
}

/**
 * Create categorization result DTO
 */
export interface CreateCategorizationResultDTO {
  job_id: string
  strand_path: string
  current_category: string
  suggested_category: string
  confidence: number
  reasoning: string
  alternatives: CategorySuggestion['alternatives']
  status?: CategorizationResultStatus
}

/**
 * Update categorization result DTO
 */
export interface UpdateCategorizationResultDTO {
  status?: CategorizationResultStatus
  review_notes?: string
  final_category?: string
  reviewed_at?: string
  applied_at?: string
}

/**
 * Create categorization action DTO
 */
export interface CreateCategorizationActionDTO {
  result_id: string
  action_type: CategorizationActionType
  from_path: string
  to_path: string
  strand_content: string
  metadata?: Record<string, any>
}

/**
 * Update categorization action DTO
 */
export interface UpdateCategorizationActionDTO {
  status?: CategorizationActionStatus
  sync_error?: string
  github_pr_number?: number
  github_pr_url?: string
  synced_at?: string
}

/**
 * Web Worker message types
 */
export interface CategorizationTask {
  id: string
  inputs: CategorizationInput[]
  config: CategorizationConfig
}

export interface CategorizationTaskProgress {
  taskId: string
  progress: number // 0-100
  message: string
  currentFile?: string
  processed: number
  total: number
}

export interface CategorizationTaskResult {
  taskId: string
  success: boolean
  results: CategoryResult[]
  errors?: Array<{ file: string; error: string }>
  statistics: {
    filesProcessed: number
    autoApplied: number
    needsReview: number
    needsTriage: number
  }
}

export type CategorizationWorkerMessage =
  | { type: 'categorize'; task: CategorizationTask }
  | { type: 'cancel'; taskId: string }

export type CategorizationWorkerResponse =
  | { type: 'progress'; data: CategorizationTaskProgress }
  | { type: 'complete'; data: CategorizationTaskResult }
  | { type: 'error'; taskId: string; error: string }

// ═══════════════════════════════════════════════════════════════════════════
// EMBARK-STYLE CONTEXT-AWARE CATEGORIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hierarchy context for a document (OpenStrand structure)
 * Enables hierarchy-aware categorization like Embark's context sharing
 */
export interface DocumentHierarchyContext {
  /** Hierarchy level */
  level: 'fabric' | 'weave' | 'loom' | 'strand'
  /** Fabric name (if applicable) */
  fabric?: string
  /** Weave name (e.g., 'wiki', 'notes', 'projects') */
  weave?: string
  /** Loom name (topic group) */
  loom?: string
  /** Strand name (document) */
  strand?: string
  /** Full path */
  path: string
  /** Parent path for sibling detection */
  parentPath?: string
}

/**
 * Relationship data for context-aware categorization
 * Similar to Embark's "shared context across tools"
 */
export interface DocumentRelationships {
  /** Linked internal documents */
  internalLinks: string[]
  /** External references */
  externalDomains: string[]
  /** Mentioned entities */
  mentionedEntities: string[]
  /** Suggested prerequisites */
  suggestedPrerequisites: Array<{
    path: string
    confidence: number
    reason: string
  }>
  /** Related/sibling documents in same context */
  siblings: string[]
}

/**
 * Semantic analysis for enhanced categorization
 * Leverages NLP for deeper understanding
 */
export interface SemanticAnalysis {
  /** Extracted technologies */
  technologies: string[]
  /** Extracted concepts */
  concepts: string[]
  /** Content type classification */
  contentType: 'tutorial' | 'reference' | 'conceptual' | 'troubleshooting' | 'architecture' | 'general'
  /** Difficulty level */
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  /** Key phrases */
  keyPhrases: string[]
  /** Named entities (people, orgs, locations) */
  namedEntities: {
    people: string[]
    organizations: string[]
    locations: string[]
  }
}

/**
 * Extended categorization input with full context
 * Embark-style "shared context" for better categorization
 */
export interface ContextAwareCategorizationInput extends CategorizationInput {
  /** Hierarchy context */
  hierarchy?: DocumentHierarchyContext
  /** Document relationships */
  relationships?: DocumentRelationships
  /** Semantic analysis (pre-computed or will be computed) */
  semantics?: SemanticAnalysis
  /** Existing strands index for relationship analysis */
  existingIndex?: Array<{
    path: string
    metadata?: {
      title?: string
      tags?: string[]
      category?: string
      difficulty?: string
    }
  }>
}

/**
 * Enhanced category suggestion with richer reasoning
 */
export interface EnhancedCategorySuggestion extends CategorySuggestion {
  /** Hierarchy-based confidence boost */
  hierarchyBoost: number
  /** Relationship-based confidence boost */
  relationshipBoost: number
  /** Semantic match factors */
  semanticFactors: string[]
  /** Related documents in suggested category */
  relatedInCategory: string[]
  /** Auto-suggested tags based on category */
  suggestedTags: string[]
}

/**
 * Full context-aware categorization result
 */
export interface ContextAwareCategoryResult extends CategoryResult {
  /** Enhanced suggestion with full context */
  enhancedSuggestion?: EnhancedCategorySuggestion
  /** Inferred hierarchy context */
  hierarchyContext?: DocumentHierarchyContext
  /** Discovered relationships */
  discoveredRelationships?: DocumentRelationships
  /** Semantic analysis performed */
  semanticAnalysis?: SemanticAnalysis
}
