/**
 * WordNet Integration for Semantic Similarity
 * @module lib/nlp/wordnet
 *
 * Provides offline synonym, hypernym, and hyponym detection
 * using the natural package with wordnet-db
 *
 * NOTE: This module only works server-side. In browser environments,
 * all functions return empty results or null to prevent crashes.
 */

// WordNet lookup result type (natural package doesn't export this)
interface WordNetResult {
  synsetOffset: number
  pos: string
  synonyms: string[]
  def: string
  ptrs: Array<{
    pointerSymbol: string
    synsetOffset: number
    pos: string
  }>
}

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

// Lazy-loaded wordnet instance (only initialized server-side)
let wordnet: any = null
let wordnetInitialized = false

function getWordNet(): any {
  if (isBrowser) {
    return null // WordNet not available in browser
  }
  if (!wordnetInitialized) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const natural = require('natural')
      wordnet = new natural.WordNet()
    } catch (error) {
      console.warn('[WordNet] Failed to initialize (may not be available in this environment):', error)
      wordnet = null
    }
    wordnetInitialized = true
  }
  return wordnet
}

// Cache for WordNet lookups (significant performance boost)
const synsetCache = new Map<string, WordNetResult[]>()
const synonymCache = new Map<string, string[]>()
const hypernymCache = new Map<string, string[]>()

/* ═══════════════════════════════════════════════════════════════════════════
   CORE LOOKUP FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get all synsets (sense definitions) for a word
 * Cached for performance
 */
export async function getSynsets(word: string): Promise<WordNetResult[]> {
  const wn = getWordNet()
  if (!wn) {
    return [] // Return empty array in browser
  }

  const normalizedWord = word.toLowerCase().trim()

  if (synsetCache.has(normalizedWord)) {
    return synsetCache.get(normalizedWord)!
  }

  return new Promise((resolve) => {
    wn.lookup(normalizedWord, (results: WordNetResult[]) => {
      synsetCache.set(normalizedWord, results || [])
      resolve(results || [])
    })
  })
}

/**
 * Get synonyms for a word (all words in same synsets)
 */
export async function getSynonyms(word: string): Promise<string[]> {
  const normalizedWord = word.toLowerCase().trim()

  if (synonymCache.has(normalizedWord)) {
    return synonymCache.get(normalizedWord)!
  }

  const synsets = await getSynsets(normalizedWord)
  const synonyms = new Set<string>()

  for (const synset of synsets) {
    // Add all words in this synset (excluding the original word)
    if (synset.synonyms) {
      for (const syn of synset.synonyms) {
        const normalized = syn.toLowerCase().replace(/_/g, ' ')
        if (normalized !== normalizedWord) {
          synonyms.add(normalized)
        }
      }
    }
  }

  const result = Array.from(synonyms)
  synonymCache.set(normalizedWord, result)
  return result
}

/**
 * Get hypernyms (broader/parent terms) for a word
 * e.g., "dog" → ["canine", "domestic animal", "mammal", "animal"]
 */
export async function getHypernyms(word: string, maxDepth = 3): Promise<string[]> {
  const wn = getWordNet()
  if (!wn) {
    return [] // Return empty array in browser
  }

  const normalizedWord = word.toLowerCase().trim()
  const cacheKey = `${normalizedWord}:${maxDepth}`

  if (hypernymCache.has(cacheKey)) {
    return hypernymCache.get(cacheKey)!
  }

  const synsets = await getSynsets(normalizedWord)
  const hypernyms = new Set<string>()

  // Helper to recursively get hypernyms
  const getHypernymChainInner = (synset: WordNetResult, depth: number): Promise<void> => {
    return new Promise((resolve) => {
      if (depth <= 0 || !synset.ptrs) {
        resolve()
        return
      }

      // Filter for hypernym pointers (@ symbol in WordNet)
      const hypernymPtrs = synset.ptrs.filter((ptr: { pointerSymbol: string }) => ptr.pointerSymbol === '@')

      let pending = hypernymPtrs.length
      if (pending === 0) {
        resolve()
        return
      }

      for (const ptr of hypernymPtrs) {
        wn.get(ptr.synsetOffset, ptr.pos, (result: WordNetResult) => {
          if (result && result.synonyms) {
            for (const syn of result.synonyms) {
              const normalized = syn.toLowerCase().replace(/_/g, ' ')
              if (normalized !== normalizedWord) {
                hypernyms.add(normalized)
              }
            }
            // Recurse for deeper hypernyms
            getHypernymChainInner(result, depth - 1).then(() => {
              pending--
              if (pending === 0) resolve()
            })
          } else {
            pending--
            if (pending === 0) resolve()
          }
        })
      }
    })
  }

  // Get hypernyms from all synsets
  await Promise.all(synsets.map(synset => getHypernymChainInner(synset, maxDepth)))

  const result = Array.from(hypernyms)
  hypernymCache.set(cacheKey, result)
  return result
}

/**
 * Get hyponyms (narrower/child terms) for a word
 * e.g., "animal" → ["dog", "cat", "bird", ...]
 */
export async function getHyponyms(word: string, maxDepth = 2): Promise<string[]> {
  const wn = getWordNet()
  if (!wn) {
    return [] // Return empty array in browser
  }

  const normalizedWord = word.toLowerCase().trim()
  const synsets = await getSynsets(normalizedWord)
  const hyponyms = new Set<string>()

  const getHyponymChainInner = (synset: WordNetResult, depth: number): Promise<void> => {
    return new Promise((resolve) => {
      if (depth <= 0 || !synset.ptrs) {
        resolve()
        return
      }

      // Filter for hyponym pointers (~ symbol in WordNet)
      const hyponymPtrs = synset.ptrs.filter((ptr: { pointerSymbol: string }) => ptr.pointerSymbol === '~')

      let pending = hyponymPtrs.length
      if (pending === 0) {
        resolve()
        return
      }

      for (const ptr of hyponymPtrs) {
        wn.get(ptr.synsetOffset, ptr.pos, (result: WordNetResult) => {
          if (result && result.synonyms) {
            for (const syn of result.synonyms) {
              const normalized = syn.toLowerCase().replace(/_/g, ' ')
              if (normalized !== normalizedWord) {
                hyponyms.add(normalized)
              }
            }
            getHyponymChainInner(result, depth - 1).then(() => {
              pending--
              if (pending === 0) resolve()
            })
          } else {
            pending--
            if (pending === 0) resolve()
          }
        })
      }
    })
  }

  await Promise.all(synsets.map(synset => getHyponymChainInner(synset, maxDepth)))
  return Array.from(hyponyms)
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIMILARITY FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Check if two words are synonyms
 */
export async function areSynonyms(word1: string, word2: string): Promise<boolean> {
  const synonyms = await getSynonyms(word1)
  return synonyms.includes(word2.toLowerCase().trim())
}

/**
 * Check if word1 is a hypernym of word2 (word1 is broader)
 * e.g., isHypernym("animal", "dog") → true
 */
export async function isHypernym(word1: string, word2: string): Promise<boolean> {
  const hypernyms = await getHypernyms(word2, 5)
  return hypernyms.includes(word1.toLowerCase().trim())
}

/**
 * Check if word1 is a hyponym of word2 (word1 is more specific)
 * e.g., isHyponym("dog", "animal") → true
 */
export async function isHyponym(word1: string, word2: string): Promise<boolean> {
  return isHypernym(word2, word1)
}

/**
 * Calculate WordNet-based similarity score between two terms
 * Returns score from 0 to 1, or null if no relationship found
 *
 * Scoring:
 * - Same synset (synonyms): 0.95
 * - Direct hypernym/hyponym: 0.85
 * - 2-level hypernym/hyponym: 0.75
 * - 3-level hypernym/hyponym: 0.65
 * - No relationship: null
 */
export async function getWordNetSimilarity(
  term1: string,
  term2: string
): Promise<{ score: number; relationship: 'synonym' | 'hypernym' | 'hyponym' | 'related' } | null> {
  const normalized1 = term1.toLowerCase().trim()
  const normalized2 = term2.toLowerCase().trim()

  // Same word
  if (normalized1 === normalized2) {
    return { score: 1.0, relationship: 'synonym' }
  }

  // Check synonyms first (fastest)
  const synonyms1 = await getSynonyms(normalized1)
  if (synonyms1.includes(normalized2)) {
    return { score: 0.95, relationship: 'synonym' }
  }

  // Check if term2 is a hypernym of term1 (term2 is broader)
  const hypernyms1 = await getHypernyms(normalized1, 3)
  const hypernymIndex = hypernyms1.indexOf(normalized2)
  if (hypernymIndex !== -1) {
    // Score decreases with distance
    const depth = Math.min(hypernymIndex, 2) // 0, 1, or 2
    const score = 0.85 - (depth * 0.1) // 0.85, 0.75, 0.65
    return { score, relationship: 'hypernym' }
  }

  // Check if term1 is a hypernym of term2 (term1 is broader)
  const hypernyms2 = await getHypernyms(normalized2, 3)
  const hyponymIndex = hypernyms2.indexOf(normalized1)
  if (hyponymIndex !== -1) {
    const depth = Math.min(hyponymIndex, 2)
    const score = 0.85 - (depth * 0.1)
    return { score, relationship: 'hyponym' }
  }

  // Check for shared hypernyms (siblings)
  const sharedHypernyms = hypernyms1.filter(h => hypernyms2.includes(h))
  if (sharedHypernyms.length > 0) {
    return { score: 0.6, relationship: 'related' }
  }

  return null
}

/**
 * Get the hypernym chain (breadcrumb) for a term
 * e.g., "React" → ["library", "software", "product"]
 * Useful for displaying term context in UI
 */
export async function getHypernymChain(word: string): Promise<string[]> {
  const hypernyms = await getHypernyms(word, 5)
  // Return first 3 most immediate hypernyms
  return hypernyms.slice(0, 3)
}

/**
 * Find the most specific common hypernym between two terms
 * e.g., commonHypernym("dog", "cat") → "mammal" or "animal"
 */
export async function findCommonHypernym(word1: string, word2: string): Promise<string | null> {
  const hypernyms1 = await getHypernyms(word1, 5)
  const hypernyms2 = await getHypernyms(word2, 5)

  // Find first shared hypernym (most specific)
  for (const h of hypernyms1) {
    if (hypernyms2.includes(h)) {
      return h
    }
  }

  return null
}

/* ═══════════════════════════════════════════════════════════════════════════
   CACHE MANAGEMENT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Clear all caches (useful for testing or memory management)
 */
export function clearWordNetCache(): void {
  synsetCache.clear()
  synonymCache.clear()
  hypernymCache.clear()
}

/**
 * Get cache statistics
 */
export function getWordNetCacheStats(): {
  synsets: number
  synonyms: number
  hypernyms: number
} {
  return {
    synsets: synsetCache.size,
    synonyms: synonymCache.size,
    hypernyms: hypernymCache.size,
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════════════════════════ */

export default {
  getSynsets,
  getSynonyms,
  getHypernyms,
  getHyponyms,
  areSynonyms,
  isHypernym,
  isHyponym,
  getWordNetSimilarity,
  getHypernymChain,
  findCommonHypernym,
  clearWordNetCache,
  getWordNetCacheStats,
}
