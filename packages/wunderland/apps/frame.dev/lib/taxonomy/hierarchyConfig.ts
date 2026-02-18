/**
 * Taxonomy Hierarchy Configuration
 * @module lib/taxonomy/hierarchyConfig
 *
 * Defines the configuration for taxonomy hierarchy enforcement:
 * - Subjects (broad) < Topics (mid-level) < Tags (specific)
 * - Per-document limits and global limits
 * - Similarity thresholds for deduplication
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Taxonomy level hierarchy (from most general to most specific)
 */
export type TaxonomyLevel = 'subject' | 'topic' | 'tag'

/**
 * Configuration for taxonomy hierarchy enforcement
 */
export interface TaxonomyHierarchyConfig {
  // ========== Per-Document Limits ==========
  /** Maximum subjects per document (default: 2) */
  maxSubjectsPerDoc: number
  /** Maximum topics per document (default: 5) */
  maxTopicsPerDoc: number
  /** Maximum tags per document - soft limit (default: 15) */
  maxTagsPerDoc: number

  // ========== Global Limits (across entire codex) ==========
  /** Maximum total unique subjects in codex (default: 20) */
  maxTotalSubjects: number
  /** Maximum total unique topics in codex (default: 100) */
  maxTotalTopics: number
  // No limit on total tags - they can be as varied as needed

  // ========== Similarity Thresholds ==========
  /** Levenshtein distance threshold for considering terms similar (default: 2) */
  levenshteinThreshold: number
  /** Minimum length for substring matching (default: 4) */
  substringMinLength: number

  // ========== Enhanced NLP Similarity Options ==========
  /**
   * Enable phonetic matching using Soundex/Metaphone
   * Catches terms that sound similar (e.g., "colour" ↔ "color")
   * @default true
   */
  enablePhoneticMatching: boolean
  /**
   * Enable n-gram Jaccard similarity matching
   * Catches fuzzy matches based on character sequences
   * @default true
   */
  enableNgramMatching: boolean
  /**
   * Minimum n-gram Jaccard score to consider terms similar
   * Higher = stricter matching (0.0 to 1.0)
   * @default 0.6
   */
  ngramThreshold: number
  /**
   * Enable acronym ↔ expansion matching
   * Catches "AI" ↔ "artificial-intelligence" using dictionary
   * @default true
   */
  enableAcronymExpansion: boolean
  /**
   * Enable plural ↔ singular normalization
   * Catches "frameworks" ↔ "framework"
   * @default true
   */
  enablePluralNormalization: boolean
  /**
   * Enable compound word decomposition
   * Catches "MachineLearning" ↔ "machine-learning"
   * @default true
   */
  enableCompoundDecomposition: boolean
  /**
   * Enable WordNet semantic similarity
   * Catches synonyms ("create" ↔ "make") and hypernyms ("React" → "framework")
   * Requires async similarity functions
   * @default true
   */
  enableWordNet?: boolean
  /**
   * Minimum combined similarity score to consider terms a match
   * Uses the highest-scoring method from the pipeline
   * Higher = stricter matching (0.0 to 1.0)
   * @default 0.7
   */
  similarityScoreThreshold: number

  // ========== Behavior Flags ==========
  /** Check hierarchy when saving strand (default: true) */
  enforceOnSave: boolean
  /** Check hierarchy when importing documents (default: true) */
  enforceOnImport: boolean
  /** Automatically promote frequent topics to subjects (default: false) */
  autoPromoteToSubject: boolean
  /** Automatically demote rare subjects to topics (default: false) */
  autoDemoteToTopic: boolean
  /** Minimum document count for a topic to be promoted to subject */
  promotionThreshold: number
  /** Minimum document count for a subject to avoid demotion */
  demotionThreshold: number
}

/**
 * Result of checking a term against the taxonomy hierarchy
 */
export interface TaxonomyCheckResult {
  /** The recommended level (null if term should be ignored as duplicate) */
  level: TaxonomyLevel | null
  /** If duplicate, the term it matched */
  matchedTerm?: string
  /** Which level the match was found in */
  matchedLevel?: TaxonomyLevel
  /** Human-readable explanation */
  reasoning: string
  /** Whether this is a warning (soft limit exceeded) vs error (hard constraint) */
  severity: 'info' | 'warning' | 'error'
}

/**
 * Statistics about taxonomy distribution
 */
export interface TaxonomyStats {
  /** Total unique subjects across all documents */
  totalSubjects: number
  /** Total unique topics across all documents */
  totalTopics: number
  /** Total unique tags across all documents */
  totalTags: number
  /** Average subjects per document */
  avgSubjectsPerDoc: number
  /** Average topics per document */
  avgTopicsPerDoc: number
  /** Average tags per document */
  avgTagsPerDoc: number
  /** Documents with more subjects than limit */
  docsOverSubjectLimit: number
  /** Documents with more topics than limit */
  docsOverTopicLimit: number
  /** Terms that appear in multiple levels (subjects ∩ topics ∩ tags) */
  overlappingTerms: string[]
}

/**
 * Change to be applied during reclassification
 */
export interface TaxonomyChange {
  /** Path to the strand being modified */
  strandPath: string
  /** Which taxonomy field is being changed */
  field: 'subjects' | 'topics' | 'tags'
  /** Action to take */
  action: 'remove' | 'demote' | 'promote' | 'keep'
  /** The term being changed */
  term: string
  /** Why this change is recommended */
  reason: string
  /** New level if demoted/promoted */
  newLevel?: TaxonomyLevel
  /** Confidence score for this recommendation (0-1) */
  confidence: number
}

// ============================================================================
// DEFAULTS
// ============================================================================

/**
 * Default taxonomy hierarchy configuration
 *
 * Design rationale:
 * - Subjects should be VERY broad (like "programming", "design", "math")
 * - Topics should be mid-level (like "react", "typography", "linear-algebra")
 * - Tags should be specific (like "hooks", "serif-fonts", "matrix-multiplication")
 */
export const DEFAULT_TAXONOMY_CONFIG: TaxonomyHierarchyConfig = {
  // Per-document limits - enforce hierarchy
  maxSubjectsPerDoc: 2,    // Keep subjects minimal
  maxTopicsPerDoc: 5,      // Allow more topics
  maxTagsPerDoc: 15,       // Tags can be plentiful

  // Global limits - prevent explosion
  maxTotalSubjects: 20,    // Codex-wide subject list should be curated
  maxTotalTopics: 100,     // Topics can grow more freely

  // Basic similarity thresholds
  levenshteinThreshold: 2,   // "react" and "reactjs" are similar
  substringMinLength: 4,     // Ignore matches shorter than this

  // Enhanced NLP similarity options
  enablePhoneticMatching: true,       // "colour" ↔ "color"
  enableNgramMatching: true,          // Fuzzy character sequence matching
  ngramThreshold: 0.6,                // Minimum Jaccard score for n-gram match
  enableAcronymExpansion: true,       // "AI" ↔ "artificial-intelligence"
  enablePluralNormalization: true,    // "frameworks" ↔ "framework"
  enableCompoundDecomposition: true,  // "MachineLearning" ↔ "machine-learning"
  enableWordNet: true,                // Synonyms/hypernyms via WordNet (async only)
  similarityScoreThreshold: 0.7,      // Minimum combined score to consider match

  // Behavior flags
  enforceOnSave: true,
  enforceOnImport: true,
  autoPromoteToSubject: false,  // Manual curation preferred
  autoDemoteToTopic: false,     // Manual curation preferred
  promotionThreshold: 15,       // Topic must appear in 15+ docs to be promoted
  demotionThreshold: 3,         // Subject must appear in 3+ docs to stay
}

/**
 * Strict configuration for codexes that need tight control
 * - Tighter limits on terms per document
 * - Higher similarity threshold (fewer false positives)
 * - All NLP features enabled for maximum deduplication
 */
export const STRICT_TAXONOMY_CONFIG: TaxonomyHierarchyConfig = {
  ...DEFAULT_TAXONOMY_CONFIG,
  maxSubjectsPerDoc: 1,
  maxTopicsPerDoc: 3,
  maxTagsPerDoc: 10,
  maxTotalSubjects: 10,
  maxTotalTopics: 50,
  // Stricter similarity - catch more duplicates
  similarityScoreThreshold: 0.6, // Lower threshold = more aggressive dedup
  ngramThreshold: 0.5,           // Catch more fuzzy matches
}

/**
 * Relaxed configuration for flexible codexes
 * - Higher limits on terms per document
 * - Lower similarity sensitivity (fewer false positives)
 * - Only essential NLP features enabled
 */
export const RELAXED_TAXONOMY_CONFIG: TaxonomyHierarchyConfig = {
  ...DEFAULT_TAXONOMY_CONFIG,
  maxSubjectsPerDoc: 3,
  maxTopicsPerDoc: 8,
  maxTagsPerDoc: 25,
  maxTotalSubjects: 30,
  maxTotalTopics: 200,
  // Less aggressive deduplication
  levenshteinThreshold: 1,        // Only catch obvious typos
  similarityScoreThreshold: 0.85, // Higher threshold = fewer matches
  enablePhoneticMatching: false,  // Disable phonetic (can be noisy)
  enableNgramMatching: false,     // Disable n-gram (can be noisy)
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Merge user config with defaults
 */
export function mergeTaxonomyConfig(
  userConfig: Partial<TaxonomyHierarchyConfig>
): TaxonomyHierarchyConfig {
  return {
    ...DEFAULT_TAXONOMY_CONFIG,
    ...userConfig,
  }
}

/**
 * Get the level hierarchy order (for comparison)
 * Lower number = more general, higher number = more specific
 */
export function getLevelOrder(level: TaxonomyLevel): number {
  switch (level) {
    case 'subject': return 0
    case 'topic': return 1
    case 'tag': return 2
  }
}

/**
 * Check if level A is broader than level B
 */
export function isBroaderLevel(a: TaxonomyLevel, b: TaxonomyLevel): boolean {
  return getLevelOrder(a) < getLevelOrder(b)
}

/**
 * Get the next more specific level
 */
export function demoteLevel(level: TaxonomyLevel): TaxonomyLevel | null {
  switch (level) {
    case 'subject': return 'topic'
    case 'topic': return 'tag'
    case 'tag': return null // Can't demote further
  }
}

/**
 * Get the next more general level
 */
export function promoteLevel(level: TaxonomyLevel): TaxonomyLevel | null {
  switch (level) {
    case 'tag': return 'topic'
    case 'topic': return 'subject'
    case 'subject': return null // Can't promote further
  }
}

/**
 * Get the limit for a given level from config
 */
export function getLimitForLevel(
  level: TaxonomyLevel,
  config: TaxonomyHierarchyConfig,
  scope: 'perDoc' | 'global' = 'perDoc'
): number {
  if (scope === 'perDoc') {
    switch (level) {
      case 'subject': return config.maxSubjectsPerDoc
      case 'topic': return config.maxTopicsPerDoc
      case 'tag': return config.maxTagsPerDoc
    }
  } else {
    switch (level) {
      case 'subject': return config.maxTotalSubjects
      case 'topic': return config.maxTotalTopics
      case 'tag': return Infinity // No global limit on tags
    }
  }
}

/**
 * Normalize a term for comparison (lowercase, trim, kebab-case)
 */
export function normalizeTerm(term: string): string {
  return term
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export default DEFAULT_TAXONOMY_CONFIG
