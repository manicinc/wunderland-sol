/**
 * Advanced Similarity Detection Utilities
 * @module lib/taxonomy/similarityUtils
 *
 * Enhanced NLP-based deduplication techniques for taxonomy terms:
 * - Soundex (phonetic encoding)
 * - Plural normalization (frameworks → framework)
 * - Compound decomposition (MachineLearning → machine-learning)
 * - N-gram Jaccard similarity
 * - Acronym expansion (AI → artificial-intelligence)
 * - WordNet semantic similarity (synonyms, hypernyms)
 * - Combined similarity scoring
 */

import {
  type TaxonomyHierarchyConfig,
  normalizeTerm,
  DEFAULT_TAXONOMY_CONFIG,
} from './hierarchyConfig'
import { levenshteinDistance } from './hierarchyEnforcer'
import { getWordNetSimilarity } from '../nlp/wordnet'

// ============================================================================
// SOUNDEX (PHONETIC ENCODING)
// ============================================================================

/**
 * Generate Soundex code for a term
 * Soundex encodes similar-sounding words to the same code
 *
 * Example: "color" and "colour" both encode to "C460"
 *
 * Algorithm:
 * 1. Keep first letter
 * 2. Replace consonants with digits (similar sounds → same digit)
 * 3. Remove vowels, H, W, Y
 * 4. Remove consecutive duplicates
 * 5. Pad/truncate to 4 characters
 */
export function soundex(term: string): string {
  const normalized = term.toLowerCase().replace(/[^a-z]/g, '')
  if (!normalized) return ''

  // Soundex consonant codes
  const codes: Record<string, string> = {
    'b': '1', 'f': '1', 'p': '1', 'v': '1',
    'c': '2', 'g': '2', 'j': '2', 'k': '2', 'q': '2', 's': '2', 'x': '2', 'z': '2',
    'd': '3', 't': '3',
    'l': '4',
    'm': '5', 'n': '5',
    'r': '6'
  }

  // Start with uppercase first letter
  let result = normalized[0].toUpperCase()
  let prevCode = codes[normalized[0]] || ''

  for (let i = 1; i < normalized.length && result.length < 4; i++) {
    const char = normalized[i]
    const code = codes[char] || ''

    // Add code if it's a consonant with a different code than previous
    if (code && code !== prevCode) {
      result += code
      prevCode = code
    } else if (!code) {
      // Reset previous code for vowels (allows separated consonants)
      prevCode = ''
    }
  }

  // Pad with zeros to ensure 4 characters
  return result.padEnd(4, '0')
}

/**
 * Double Metaphone - more accurate phonetic encoding
 * Handles more edge cases than Soundex
 *
 * This is a simplified implementation focusing on common patterns
 */
export function metaphone(term: string): string {
  let str = term.toLowerCase().replace(/[^a-z]/g, '')
  if (!str) return ''

  // Common phonetic transformations
  const transforms: Array<[RegExp, string]> = [
    [/^kn/, 'n'],      // knife → nife
    [/^gn/, 'n'],      // gnome → nome
    [/^pn/, 'n'],      // pneumonia → numonia
    [/^wr/, 'r'],      // write → rite
    [/^x/, 's'],       // xylophone → sylophone
    [/^wh/, 'w'],      // what → wat
    [/mb$/, 'm'],      // climb → clim
    [/sch/, 'sk'],     // school → skool
    [/tch/, 'ch'],     // match → mach
    [/gh/, 'g'],       // ghost → gost (simplified)
    [/ph/, 'f'],       // phone → fone
    [/ck/, 'k'],       // back → bak
    [/sh/, 'x'],       // ship → xip (encoded)
    [/th/, '0'],       // the → 0e (encoded)
    [/dg/, 'j'],       // edge → eje
    [/qu/, 'kw'],      // queen → kween
  ]

  for (const [pattern, replacement] of transforms) {
    str = str.replace(pattern, replacement)
  }

  // Remove vowels except at start, remove consecutive duplicates
  const firstChar = str[0]
  str = firstChar + str.slice(1).replace(/[aeiou]/g, '')

  // Remove consecutive duplicates
  let result = ''
  for (let i = 0; i < str.length; i++) {
    if (str[i] !== str[i - 1]) {
      result += str[i]
    }
  }

  return result.toUpperCase()
}

// ============================================================================
// PLURAL NORMALIZATION
// ============================================================================

/**
 * Simple plural rules for English
 * More comprehensive than regex but lighter than full NLP library
 */
const IRREGULAR_PLURALS: Record<string, string> = {
  'children': 'child',
  'people': 'person',
  'men': 'man',
  'women': 'woman',
  'teeth': 'tooth',
  'feet': 'foot',
  'mice': 'mouse',
  'geese': 'goose',
  'analyses': 'analysis',
  'bases': 'basis',
  'criteria': 'criterion',
  'phenomena': 'phenomenon',
  'indices': 'index',
  'matrices': 'matrix',
  'vertices': 'vertex',
  'appendices': 'appendix',
  'caches': 'cache',
  'schemas': 'schema',
  'data': 'datum', // Though 'data' is often singular now
  'media': 'medium',
  'algorithms': 'algorithm',
  'frameworks': 'framework',
  'libraries': 'library',
  'utilities': 'utility',
  'technologies': 'technology',
  'categories': 'category',
  'properties': 'property',
  'entities': 'entity',
  'queries': 'query',
  'repositories': 'repository',
  'strategies': 'strategy',
  'dependencies': 'dependency',
  'functionalities': 'functionality',
}

/**
 * Convert plural to singular form
 * Uses combination of irregular lookup and suffix rules
 *
 * @example singularize("frameworks") → "framework"
 * @example singularize("categories") → "category"
 * @example singularize("analyses") → "analysis"
 */
export function singularize(term: string): string {
  const lower = term.toLowerCase()

  // Check irregular plurals first
  if (IRREGULAR_PLURALS[lower]) {
    return IRREGULAR_PLURALS[lower]
  }

  // Apply suffix rules in order of specificity
  const rules: Array<[RegExp, string]> = [
    // -ies → -y (categories → category)
    [/ies$/, 'y'],
    // -es after -ch, -sh, -ss, -x, -z → remove -es
    [/(ch|sh|ss|x|z)es$/, '$1'],
    // -ves → -f (wolves → wolf, but not all)
    [/([^aeiou])ves$/, '$1f'],
    // -oes → -o (heroes → hero, but tomatoes → tomato varies)
    [/oes$/, 'o'],
    // -es → -e (caches → cache)
    [/([^s])es$/, '$1e'],
    // -s → remove (default)
    [/s$/, ''],
  ]

  for (const [pattern, replacement] of rules) {
    if (pattern.test(lower)) {
      return lower.replace(pattern, replacement)
    }
  }

  return lower
}

/**
 * Convert singular to plural form
 * Inverse of singularize for bidirectional matching
 */
export function pluralize(term: string): string {
  const lower = term.toLowerCase()

  // Check reverse of irregular plurals
  const reverseLookup = Object.entries(IRREGULAR_PLURALS).find(
    ([_, singular]) => singular === lower
  )
  if (reverseLookup) {
    return reverseLookup[0]
  }

  // Apply rules
  const rules: Array<[RegExp, string]> = [
    // -y → -ies (category → categories)
    [/([^aeiou])y$/, '$1ies'],
    // -ch, -sh, -ss, -x, -z → add -es
    [/(ch|sh|ss|x|z)$/, '$1es'],
    // -f, -fe → -ves (leaf → leaves)
    [/f$/, 'ves'],
    [/fe$/, 'ves'],
    // -o → -oes (for some words)
    [/([^aeiou])o$/, '$1oes'],
    // default: add -s
    [/$/, 's'],
  ]

  for (const [pattern, replacement] of rules) {
    if (pattern.test(lower)) {
      return lower.replace(pattern, replacement)
    }
  }

  return lower + 's'
}

// ============================================================================
// COMPOUND WORD DECOMPOSITION
// ============================================================================

/**
 * Decompose compound words into kebab-case
 * Handles CamelCase, PascalCase, and concatenated words
 *
 * @example decomposeCompound("MachineLearning") → "machine-learning"
 * @example decomposeCompound("HTMLParser") → "html-parser"
 * @example decomposeCompound("OAuth2") → "oauth-2"
 * @example decomposeCompound("XMLHttpRequest") → "xml-http-request"
 */
export function decomposeCompound(term: string): string {
  // Already normalized (kebab-case)
  if (term.includes('-')) {
    return term.toLowerCase()
  }

  // Handle all-uppercase (acronyms)
  if (/^[A-Z0-9]+$/.test(term)) {
    return term.toLowerCase()
  }

  let result = term
    // Insert hyphen before uppercase letters that follow lowercase
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    // Insert hyphen before uppercase letters that precede lowercase (XMLHttp → XML-Http)
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    // Insert hyphen before numbers
    .replace(/([a-zA-Z])(\d)/g, '$1-$2')
    // Insert hyphen after numbers
    .replace(/(\d)([a-zA-Z])/g, '$1-$2')
    // Handle consecutive uppercase followed by lowercase (OAuth → o-auth after first pass)
    .toLowerCase()
    // Clean up any double hyphens
    .replace(/--+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-|-$/g, '')

  return result
}

/**
 * Check if two terms are the same after compound decomposition
 */
export function areCompoundsEqual(a: string, b: string): boolean {
  return decomposeCompound(a) === decomposeCompound(b)
}

// ============================================================================
// N-GRAM JACCARD SIMILARITY
// ============================================================================

/**
 * Generate n-grams from a string
 *
 * @example ngrams("hello", 2) → ["he", "el", "ll", "lo"]
 * @example ngrams("hello", 3) → ["hel", "ell", "llo"]
 */
export function ngrams(term: string, n: number): string[] {
  const normalized = term.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (normalized.length < n) return [normalized]

  const result: string[] = []
  for (let i = 0; i <= normalized.length - n; i++) {
    result.push(normalized.slice(i, i + n))
  }
  return result
}

/**
 * Character-level bigrams (2-grams)
 */
export function bigrams(term: string): string[] {
  return ngrams(term, 2)
}

/**
 * Character-level trigrams (3-grams)
 */
export function trigrams(term: string): string[] {
  return ngrams(term, 3)
}

/**
 * Calculate Jaccard similarity coefficient between two sets of n-grams
 *
 * Jaccard = |intersection| / |union|
 * Returns value between 0 (no overlap) and 1 (identical)
 *
 * @example ngramJaccard("machine", "learning", 2) → ~0.1 (low similarity)
 * @example ngramJaccard("javascript", "java-script", 2) → ~0.8 (high similarity)
 */
export function ngramJaccard(a: string, b: string, n: number = 2): number {
  const gramsA = new Set(ngrams(a, n))
  const gramsB = new Set(ngrams(b, n))

  if (gramsA.size === 0 && gramsB.size === 0) return 1
  if (gramsA.size === 0 || gramsB.size === 0) return 0

  // Calculate intersection
  let intersection = 0
  for (const gram of gramsA) {
    if (gramsB.has(gram)) {
      intersection++
    }
  }

  // Union = |A| + |B| - |intersection|
  const union = gramsA.size + gramsB.size - intersection

  return union === 0 ? 0 : intersection / union
}

/**
 * Word-level n-gram Jaccard (for multi-word terms)
 *
 * @example wordNgramJaccard("machine learning", "deep learning", 1) → 0.5
 */
export function wordNgramJaccard(a: string, b: string, n: number = 1): number {
  const wordsA = a.toLowerCase().split(/[\s\-_]+/).filter(Boolean)
  const wordsB = b.toLowerCase().split(/[\s\-_]+/).filter(Boolean)

  const getWordNgrams = (words: string[]): string[] => {
    if (words.length < n) return [words.join(' ')]
    const result: string[] = []
    for (let i = 0; i <= words.length - n; i++) {
      result.push(words.slice(i, i + n).join(' '))
    }
    return result
  }

  const gramsA = new Set(getWordNgrams(wordsA))
  const gramsB = new Set(getWordNgrams(wordsB))

  if (gramsA.size === 0 && gramsB.size === 0) return 1
  if (gramsA.size === 0 || gramsB.size === 0) return 0

  let intersection = 0
  for (const gram of gramsA) {
    if (gramsB.has(gram)) {
      intersection++
    }
  }

  const union = gramsA.size + gramsB.size - intersection
  return union === 0 ? 0 : intersection / union
}

// ============================================================================
// ACRONYM EXPANSION
// ============================================================================

// Import acronym dictionary (will be created separately)
// For now, define inline - will be moved to acronymDictionary.ts
const ACRONYM_DICTIONARY: Record<string, string[]> = {
  // AI/ML
  'ai': ['artificial-intelligence'],
  'ml': ['machine-learning'],
  'dl': ['deep-learning'],
  'nlp': ['natural-language-processing'],
  'cv': ['computer-vision'],
  'nn': ['neural-network', 'neural-networks'],
  'cnn': ['convolutional-neural-network'],
  'rnn': ['recurrent-neural-network'],
  'llm': ['large-language-model'],
  'gpt': ['generative-pre-trained-transformer'],
  'rag': ['retrieval-augmented-generation'],

  // Web/API
  'api': ['application-programming-interface'],
  'rest': ['representational-state-transfer'],
  'graphql': ['graph-query-language'],
  'sdk': ['software-development-kit'],
  'cli': ['command-line-interface'],
  'gui': ['graphical-user-interface'],
  'ui': ['user-interface'],
  'ux': ['user-experience'],

  // Database
  'db': ['database'],
  'sql': ['structured-query-language'],
  'nosql': ['not-only-sql'],
  'orm': ['object-relational-mapping'],
  'crud': ['create-read-update-delete'],

  // Languages/Tech
  'js': ['javascript'],
  'ts': ['typescript'],
  'py': ['python'],
  'rb': ['ruby'],
  'cpp': ['c-plus-plus'],
  'html': ['hypertext-markup-language'],
  'css': ['cascading-style-sheets'],
  'xml': ['extensible-markup-language'],
  'json': ['javascript-object-notation'],
  'yaml': ['yet-another-markup-language'],

  // DevOps/Infra
  'ci': ['continuous-integration'],
  'cd': ['continuous-deployment', 'continuous-delivery'],
  'k8s': ['kubernetes'],
  'aws': ['amazon-web-services'],
  'gcp': ['google-cloud-platform'],
  'vm': ['virtual-machine'],
  'vpc': ['virtual-private-cloud'],
  'cdn': ['content-delivery-network'],
  'dns': ['domain-name-system'],
  'ssl': ['secure-sockets-layer'],
  'tls': ['transport-layer-security'],

  // Development concepts
  'oop': ['object-oriented-programming'],
  'fp': ['functional-programming'],
  'tdd': ['test-driven-development'],
  'bdd': ['behavior-driven-development'],
  'dry': ['dont-repeat-yourself'],
  'solid': ['single-responsibility-open-closed-liskov-interface-dependency'],
  'mvc': ['model-view-controller'],
  'mvvm': ['model-view-viewmodel'],

  // Auth/Security
  'oauth': ['open-authorization'],
  'jwt': ['json-web-token'],
  'sso': ['single-sign-on'],
  'mfa': ['multi-factor-authentication'],
  'rbac': ['role-based-access-control'],
  'xss': ['cross-site-scripting'],
  'csrf': ['cross-site-request-forgery'],
  'sqli': ['sql-injection'],

  // React ecosystem
  'jsx': ['javascript-xml'],
  'tsx': ['typescript-xml'],
  'ssr': ['server-side-rendering'],
  'ssg': ['static-site-generation'],
  'csr': ['client-side-rendering'],
  'isr': ['incremental-static-regeneration'],

  // Other
  'regex': ['regular-expression'],
  'http': ['hypertext-transfer-protocol'],
  'https': ['hypertext-transfer-protocol-secure'],
  'tcp': ['transmission-control-protocol'],
  'udp': ['user-datagram-protocol'],
  'ip': ['internet-protocol'],
  'ftp': ['file-transfer-protocol'],
  'ssh': ['secure-shell'],
  'ide': ['integrated-development-environment'],
  'vcs': ['version-control-system'],
  'scm': ['source-control-management'],
}

// Reverse mapping: expansion → acronym
const EXPANSION_TO_ACRONYM: Map<string, string> = new Map()
for (const [acronym, expansions] of Object.entries(ACRONYM_DICTIONARY)) {
  for (const expansion of expansions) {
    EXPANSION_TO_ACRONYM.set(expansion, acronym)
  }
}

/**
 * Expand an acronym to its full form(s)
 * Returns null if not a known acronym
 *
 * @example expandAcronym("ai") → ["artificial-intelligence"]
 * @example expandAcronym("unknown") → null
 */
export function expandAcronym(term: string): string[] | null {
  const normalized = term.toLowerCase().replace(/[^a-z0-9]/g, '')
  return ACRONYM_DICTIONARY[normalized] || null
}

/**
 * Contract a full term to its acronym
 * Returns null if not a known expansion
 *
 * @example contractToAcronym("artificial-intelligence") → "ai"
 */
export function contractToAcronym(term: string): string | null {
  const normalized = normalizeTerm(term)
  return EXPANSION_TO_ACRONYM.get(normalized) || null
}

/**
 * Check if two terms are acronym matches
 *
 * @example areAcronymMatches("AI", "Artificial Intelligence") → true
 */
export function areAcronymMatches(a: string, b: string): boolean {
  const normA = normalizeTerm(a)
  const normB = normalizeTerm(b)

  // Direct match
  if (normA === normB) return true

  // A is acronym, B is expansion
  const expansionsA = expandAcronym(normA)
  if (expansionsA && expansionsA.includes(normB)) {
    return true
  }

  // B is acronym, A is expansion
  const expansionsB = expandAcronym(normB)
  if (expansionsB && expansionsB.includes(normA)) {
    return true
  }

  // Both are expansions of the same acronym
  const acronymA = contractToAcronym(normA)
  const acronymB = contractToAcronym(normB)
  if (acronymA && acronymB && acronymA === acronymB) {
    return true
  }

  return false
}

// ============================================================================
// SUBSTRING MATCHING (Enhanced)
// ============================================================================

/**
 * Check if one term is a meaningful substring of another
 * Avoids false positives with very short substrings
 *
 * @example isSubstringMatch("react", "reactjs", 4) → true
 * @example isSubstringMatch("go", "google", 4) → false (too short)
 */
export function isSubstringMatch(a: string, b: string, minLength: number = 4): boolean {
  const normA = normalizeTerm(a)
  const normB = normalizeTerm(b)

  // Skip if either is too short
  if (normA.length < minLength || normB.length < minLength) {
    return false
  }

  // Skip if lengths are very different (probably not related)
  const lengthRatio = Math.min(normA.length, normB.length) / Math.max(normA.length, normB.length)
  if (lengthRatio < 0.5) {
    return false
  }

  return normA.includes(normB) || normB.includes(normA)
}

// ============================================================================
// COMBINED SIMILARITY SCORING
// ============================================================================

/**
 * Similarity check result with scoring and method identification
 */
export interface SimilarityResult {
  /** Similarity score between 0 and 1 */
  score: number
  /** Which method determined the match */
  method:
    | 'exact'           // Identical after normalization
    | 'acronym'         // Acronym ↔ expansion match
    | 'plural'          // Singular/plural forms
    | 'compound'        // CamelCase decomposition match
    | 'levenshtein'     // Edit distance within threshold
    | 'phonetic'        // Soundex/Metaphone match
    | 'ngram'           // N-gram Jaccard above threshold
    | 'substring'       // Meaningful substring match
    | 'wordnet'         // WordNet synonym/hypernym match
    | 'none'            // No similarity detected
  /** Debug info about the match */
  details?: string
  /** WordNet relationship type (if method is 'wordnet') */
  wordnetRelation?: 'synonym' | 'hypernym' | 'hyponym' | 'related'
}

/**
 * Calculate comprehensive similarity score between two taxonomy terms
 * Uses multiple techniques in order of specificity
 *
 * Returns the highest-scoring match with method identification
 *
 * @example
 * calculateSimilarityScore("AI", "artificial-intelligence", config)
 * → { score: 0.95, method: 'acronym' }
 *
 * @example
 * calculateSimilarityScore("frameworks", "framework", config)
 * → { score: 0.95, method: 'plural' }
 */
export function calculateSimilarityScore(
  a: string,
  b: string,
  config: TaxonomyHierarchyConfig = DEFAULT_TAXONOMY_CONFIG
): SimilarityResult {
  const normA = normalizeTerm(a)
  const normB = normalizeTerm(b)

  // 1. EXACT MATCH (highest confidence)
  if (normA === normB) {
    return { score: 1.0, method: 'exact' }
  }

  // 2. ACRONYM EXPANSION (very high confidence)
  if (config.enableAcronymExpansion !== false) {
    if (areAcronymMatches(a, b)) {
      return {
        score: 0.95,
        method: 'acronym',
        details: `"${a}" ↔ "${b}" via acronym dictionary`
      }
    }
  }

  // 3. PLURAL NORMALIZATION (very high confidence)
  if (config.enablePluralNormalization !== false) {
    const singA = singularize(normA)
    const singB = singularize(normB)
    if (singA === singB && singA !== normA && singB !== normB) {
      return {
        score: 0.95,
        method: 'plural',
        details: `"${a}" and "${b}" share singular form "${singA}"`
      }
    }
    // Also check if one is singular of the other
    if (singA === normB || singB === normA) {
      return { score: 0.95, method: 'plural' }
    }
  }

  // 4. COMPOUND DECOMPOSITION (high confidence)
  if (config.enableCompoundDecomposition !== false) {
    const decompA = decomposeCompound(normA)
    const decompB = decomposeCompound(normB)
    if (decompA === decompB && (decompA !== normA || decompB !== normB)) {
      return {
        score: 0.85,
        method: 'compound',
        details: `"${a}" and "${b}" decompose to "${decompA}"`
      }
    }
  }

  // 5. LEVENSHTEIN DISTANCE (high confidence for small edits)
  const levDist = levenshteinDistance(normA, normB)
  const threshold = config.levenshteinThreshold ?? 2
  if (levDist <= threshold) {
    // Score decreases with distance
    const score = 0.9 - (levDist * 0.1)
    return {
      score,
      method: 'levenshtein',
      details: `Edit distance: ${levDist}`
    }
  }

  // 6. PHONETIC MATCHING (medium confidence)
  if (config.enablePhoneticMatching !== false) {
    const soundexA = soundex(normA)
    const soundexB = soundex(normB)
    if (soundexA && soundexB && soundexA === soundexB) {
      return {
        score: 0.7,
        method: 'phonetic',
        details: `Soundex: ${soundexA}`
      }
    }

    // Try Metaphone as well
    const metaA = metaphone(normA)
    const metaB = metaphone(normB)
    if (metaA && metaB && metaA === metaB) {
      return {
        score: 0.7,
        method: 'phonetic',
        details: `Metaphone: ${metaA}`
      }
    }
  }

  // 7. N-GRAM JACCARD (medium confidence)
  if (config.enableNgramMatching !== false) {
    const ngramThreshold = config.ngramThreshold ?? 0.6

    // Try bigrams first
    const bigramSim = ngramJaccard(normA, normB, 2)
    if (bigramSim >= ngramThreshold) {
      return {
        score: bigramSim * 0.8, // Scale down from Jaccard
        method: 'ngram',
        details: `Bigram Jaccard: ${bigramSim.toFixed(3)}`
      }
    }

    // Try trigrams
    const trigramSim = ngramJaccard(normA, normB, 3)
    if (trigramSim >= ngramThreshold) {
      return {
        score: trigramSim * 0.75,
        method: 'ngram',
        details: `Trigram Jaccard: ${trigramSim.toFixed(3)}`
      }
    }
  }

  // 8. SUBSTRING MATCHING (lower confidence, prone to false positives)
  const minSubstringLen = config.substringMinLength ?? 4
  if (isSubstringMatch(normA, normB, minSubstringLen)) {
    // Lower score if significant length difference
    const lengthRatio = Math.min(normA.length, normB.length) / Math.max(normA.length, normB.length)
    return {
      score: 0.6 + (lengthRatio * 0.2), // 0.6-0.8 based on length similarity
      method: 'substring',
      details: `Length ratio: ${lengthRatio.toFixed(2)}`
    }
  }

  // No similarity detected
  return { score: 0, method: 'none' }
}

/**
 * Check if two terms are similar based on configured threshold
 * Convenience function wrapping calculateSimilarityScore
 */
export function areSimilarEnhanced(
  a: string,
  b: string,
  config: TaxonomyHierarchyConfig = DEFAULT_TAXONOMY_CONFIG
): boolean {
  const threshold = config.similarityScoreThreshold ?? 0.7
  const result = calculateSimilarityScore(a, b, config)
  return result.score >= threshold
}

/**
 * Find all similar terms in a list with their scores
 * Returns terms sorted by similarity score (highest first)
 */
export function findSimilarTermsWithScores(
  term: string,
  existingTerms: string[],
  config: TaxonomyHierarchyConfig = DEFAULT_TAXONOMY_CONFIG
): Array<{ term: string; score: number; method: SimilarityResult['method'] }> {
  const threshold = config.similarityScoreThreshold ?? 0.7
  const results: Array<{ term: string; score: number; method: SimilarityResult['method'] }> = []

  for (const existing of existingTerms) {
    const result = calculateSimilarityScore(term, existing, config)
    if (result.score >= threshold) {
      results.push({
        term: existing,
        score: result.score,
        method: result.method,
      })
    }
  }

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score)
}

// ============================================================================
// ASYNC SIMILARITY WITH WORDNET
// ============================================================================

/**
 * Calculate comprehensive similarity score with WordNet semantic analysis
 * Async version that includes synonym/hypernym/hyponym detection
 *
 * Uses multiple techniques in order of specificity:
 * 1. Exact match
 * 2. Acronym expansion
 * 3. Plural normalization
 * 4. Compound decomposition
 * 5. Levenshtein distance
 * 6. **WordNet semantic similarity** (new)
 * 7. Phonetic matching
 * 8. N-gram Jaccard
 * 9. Substring matching
 */
export async function calculateSimilarityScoreAsync(
  a: string,
  b: string,
  config: TaxonomyHierarchyConfig = DEFAULT_TAXONOMY_CONFIG
): Promise<SimilarityResult> {
  const normA = normalizeTerm(a)
  const normB = normalizeTerm(b)

  // 1. EXACT MATCH (highest confidence)
  if (normA === normB) {
    return { score: 1.0, method: 'exact' }
  }

  // 2. ACRONYM EXPANSION (very high confidence)
  if (config.enableAcronymExpansion !== false) {
    if (areAcronymMatches(a, b)) {
      return {
        score: 0.95,
        method: 'acronym',
        details: `"${a}" ↔ "${b}" via acronym dictionary`
      }
    }
  }

  // 3. PLURAL NORMALIZATION (very high confidence)
  if (config.enablePluralNormalization !== false) {
    const singA = singularize(normA)
    const singB = singularize(normB)
    if (singA === singB && singA !== normA && singB !== normB) {
      return {
        score: 0.95,
        method: 'plural',
        details: `"${a}" and "${b}" share singular form "${singA}"`
      }
    }
    if (singA === normB || singB === normA) {
      return { score: 0.95, method: 'plural' }
    }
  }

  // 4. COMPOUND DECOMPOSITION (high confidence)
  if (config.enableCompoundDecomposition !== false) {
    const decompA = decomposeCompound(normA)
    const decompB = decomposeCompound(normB)
    if (decompA === decompB && (decompA !== normA || decompB !== normB)) {
      return {
        score: 0.85,
        method: 'compound',
        details: `"${a}" and "${b}" decompose to "${decompA}"`
      }
    }
  }

  // 5. LEVENSHTEIN DISTANCE (high confidence for small edits)
  const levDist = levenshteinDistance(normA, normB)
  const threshold = config.levenshteinThreshold ?? 2
  if (levDist <= threshold) {
    const score = 0.9 - (levDist * 0.1)
    return {
      score,
      method: 'levenshtein',
      details: `Edit distance: ${levDist}`
    }
  }

  // 6. WORDNET SEMANTIC SIMILARITY (new - high confidence for synonyms)
  if (config.enableWordNet !== false) {
    try {
      const wordnetResult = await getWordNetSimilarity(normA, normB)
      if (wordnetResult && wordnetResult.score >= 0.6) {
        return {
          score: wordnetResult.score,
          method: 'wordnet',
          details: `WordNet ${wordnetResult.relationship}: "${a}" ↔ "${b}"`,
          wordnetRelation: wordnetResult.relationship,
        }
      }
    } catch {
      // WordNet lookup failed, continue with other methods
    }
  }

  // 7. PHONETIC MATCHING (medium confidence)
  if (config.enablePhoneticMatching !== false) {
    const soundexA = soundex(normA)
    const soundexB = soundex(normB)
    if (soundexA && soundexB && soundexA === soundexB) {
      return {
        score: 0.7,
        method: 'phonetic',
        details: `Soundex: ${soundexA}`
      }
    }

    const metaA = metaphone(normA)
    const metaB = metaphone(normB)
    if (metaA && metaB && metaA === metaB) {
      return {
        score: 0.7,
        method: 'phonetic',
        details: `Metaphone: ${metaA}`
      }
    }
  }

  // 8. N-GRAM JACCARD (medium confidence)
  if (config.enableNgramMatching !== false) {
    const ngramThreshold = config.ngramThreshold ?? 0.6

    const bigramSim = ngramJaccard(normA, normB, 2)
    if (bigramSim >= ngramThreshold) {
      return {
        score: bigramSim * 0.8,
        method: 'ngram',
        details: `Bigram Jaccard: ${bigramSim.toFixed(3)}`
      }
    }

    const trigramSim = ngramJaccard(normA, normB, 3)
    if (trigramSim >= ngramThreshold) {
      return {
        score: trigramSim * 0.75,
        method: 'ngram',
        details: `Trigram Jaccard: ${trigramSim.toFixed(3)}`
      }
    }
  }

  // 9. SUBSTRING MATCHING (lower confidence)
  const minSubstringLen = config.substringMinLength ?? 4
  if (isSubstringMatch(normA, normB, minSubstringLen)) {
    const lengthRatio = Math.min(normA.length, normB.length) / Math.max(normA.length, normB.length)
    return {
      score: 0.6 + (lengthRatio * 0.2),
      method: 'substring',
      details: `Length ratio: ${lengthRatio.toFixed(2)}`
    }
  }

  return { score: 0, method: 'none' }
}

/**
 * Async version of areSimilarEnhanced with WordNet support
 */
export async function areSimilarEnhancedAsync(
  a: string,
  b: string,
  config: TaxonomyHierarchyConfig = DEFAULT_TAXONOMY_CONFIG
): Promise<boolean> {
  const threshold = config.similarityScoreThreshold ?? 0.7
  const result = await calculateSimilarityScoreAsync(a, b, config)
  return result.score >= threshold
}

/**
 * Async version: Find all similar terms with WordNet semantic matching
 */
export async function findSimilarTermsWithScoresAsync(
  term: string,
  existingTerms: string[],
  config: TaxonomyHierarchyConfig = DEFAULT_TAXONOMY_CONFIG
): Promise<Array<{ term: string; score: number; method: SimilarityResult['method']; wordnetRelation?: string }>> {
  const threshold = config.similarityScoreThreshold ?? 0.7
  const results: Array<{ term: string; score: number; method: SimilarityResult['method']; wordnetRelation?: string }> = []

  // Process in parallel for better performance
  const promises = existingTerms.map(async (existing) => {
    const result = await calculateSimilarityScoreAsync(term, existing, config)
    if (result.score >= threshold) {
      return {
        term: existing,
        score: result.score,
        method: result.method,
        wordnetRelation: result.wordnetRelation,
      }
    }
    return null
  })

  const allResults = await Promise.all(promises)
  for (const r of allResults) {
    if (r) results.push(r)
  }

  return results.sort((a, b) => b.score - a.score)
}

export default calculateSimilarityScore
