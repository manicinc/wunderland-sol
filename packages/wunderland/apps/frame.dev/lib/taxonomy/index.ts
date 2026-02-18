/**
 * Taxonomy Module
 * @module lib/taxonomy
 *
 * Provides taxonomy hierarchy enforcement for the Codex:
 * - Subjects (broad categories) - minimal per document
 * - Topics (mid-level) - more per document
 * - Tags (specific) - most varied
 *
 * Features:
 * - Cross-level deduplication (term can't exist in multiple levels)
 * - Enhanced NLP similarity detection:
 *   - Levenshtein distance (typo detection)
 *   - Soundex/Metaphone (phonetic matching)
 *   - N-gram Jaccard (fuzzy matching)
 *   - Acronym expansion (AI ↔ artificial-intelligence)
 *   - Plural normalization (frameworks ↔ framework)
 *   - Compound decomposition (MachineLearning ↔ machine-learning)
 * - Per-document and global limits
 * - Batch reclassification job support
 */

// Configuration types and defaults
export {
  type TaxonomyLevel,
  type TaxonomyHierarchyConfig,
  type TaxonomyCheckResult,
  type TaxonomyStats,
  type TaxonomyChange,
  DEFAULT_TAXONOMY_CONFIG,
  STRICT_TAXONOMY_CONFIG,
  RELAXED_TAXONOMY_CONFIG,
  mergeTaxonomyConfig,
  getLevelOrder,
  isBroaderLevel,
  demoteLevel,
  promoteLevel,
  getLimitForLevel,
  normalizeTerm,
} from './hierarchyConfig'

// Hierarchy enforcement logic
export {
  levenshteinDistance,
  areSimilar,
  areSimilarBasic,
  areSimilarByDistance,
  areSimilarBySubstring,
  findSimilarTerms,
  findSimilarTermsDetailed,
  determineTaxonomyLevel,
  validateDocumentTaxonomy,
  suggestBestLevel,
  classifyTerms,
} from './hierarchyEnforcer'

// Enhanced NLP similarity utilities
export {
  soundex,
  metaphone,
  singularize,
  pluralize,
  decomposeCompound,
  areCompoundsEqual,
  ngrams,
  bigrams,
  trigrams,
  ngramJaccard,
  wordNgramJaccard,
  expandAcronym,
  contractToAcronym,
  areAcronymMatches,
  isSubstringMatch,
  calculateSimilarityScore,
  areSimilarEnhanced,
  findSimilarTermsWithScores,
  type SimilarityResult,
} from './similarityUtils'

// Acronym dictionary
export {
  ACRONYM_DICTIONARY,
  EXPANSION_TO_ACRONYM,
  getAllAcronyms,
  getAllExpansions,
  isKnownAcronym,
  isKnownExpansion,
  getExpansions,
  getAcronym,
  getAcronymStats,
} from './acronymDictionary'

// Initialization
export { initializeTaxonomySystem, isTaxonomySystemReady } from './init'

// Taxonomy index (builds and queries index of all terms)
export {
  type TaxonomyIndex,
  type TaxonomyIndexEntry,
  buildTaxonomyIndex,
  getTaxonomyIndex,
  invalidateTaxonomyIndex,
  updateIndexWithTerms,
  getAllSubjects,
  getAllTopics,
  getAllTags,
  findTermLevel,
  getTermsByFrequency,
  findOverlappingTerms,
  calculateTaxonomyStats,
} from './taxonomyIndex'
