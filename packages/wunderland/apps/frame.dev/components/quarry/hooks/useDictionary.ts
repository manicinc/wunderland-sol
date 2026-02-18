/**
 * useDictionary Hook
 * @module codex/hooks/useDictionary
 *
 * Provides dictionary lookups with caching and loading states.
 * Uses the /api/dictionary endpoint (WordNet + glossary) with fallback
 * to Free Dictionary API for static deployments (GitHub Pages).
 */

'use client'

import { useState, useCallback, useRef } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface Definition {
  text: string
  partOfSpeech: string
  example?: string
}

export interface DictionaryData {
  word: string
  phonetic?: string
  definitions: Definition[]
  synonyms: string[]
  antonyms: string[]
  hypernyms: string[]
  hyponyms: string[]
  examples: string[]
  source: 'wordnet' | 'api' | 'acronym' | 'combined' | 'free-dictionary'
  isAcronym: boolean
  acronymExpansion?: string
}

// Free Dictionary API response types
interface FreeDictMeaning {
  partOfSpeech: string
  definitions: Array<{
    definition: string
    example?: string
    synonyms?: string[]
    antonyms?: string[]
  }>
  synonyms?: string[]
  antonyms?: string[]
}

interface FreeDictEntry {
  word: string
  phonetic?: string
  phonetics?: Array<{ text?: string }>
  meanings: FreeDictMeaning[]
}

export interface UseDictionaryReturn {
  /** Current dictionary data */
  data: DictionaryData | null
  /** Loading state */
  isLoading: boolean
  /** Error message if lookup failed */
  error: string | null
  /** Look up a word */
  lookup: (word: string) => Promise<DictionaryData | null>
  /** Clear current data */
  clearData: () => void
  /** Last looked up word */
  currentWord: string | null
}

// ═══════════════════════════════════════════════════════════════════════════
// CLIENT-SIDE CACHE
// ═══════════════════════════════════════════════════════════════════════════

const clientCache = new Map<string, DictionaryData>()
const MAX_CLIENT_CACHE = 100

function getClientCache(word: string): DictionaryData | null {
  return clientCache.get(word.toLowerCase()) || null
}

function setClientCache(word: string, data: DictionaryData): void {
  if (clientCache.size >= MAX_CLIENT_CACHE) {
    const oldestKey = clientCache.keys().next().value
    if (oldestKey) clientCache.delete(oldestKey)
  }
  clientCache.set(word.toLowerCase(), data)
}

// ═══════════════════════════════════════════════════════════════════════════
// FREE DICTIONARY API FALLBACK
// ═══════════════════════════════════════════════════════════════════════════

const FREE_DICT_API = 'https://api.dictionaryapi.dev/api/v2/entries/en'
const DATAMUSE_API = 'https://api.datamuse.com/words'

/**
 * Fetch synonyms, antonyms, and related words from Datamuse API (free, no auth required)
 * Returns words sorted by relevance score
 */
async function fetchDatamuseData(
  word: string,
  signal?: AbortSignal
): Promise<{ synonyms: string[]; antonyms: string[]; hypernyms: string[]; hyponyms: string[] }> {
  try {
    // Fetch synonyms, antonyms, and related words in parallel
    // rel_syn = synonyms, rel_ant = antonyms
    // rel_spc = "more specific than" (hyponyms), rel_gen = "more general than" (hypernyms)
    const [synResponse, antResponse, genResponse, spcResponse] = await Promise.all([
      fetch(`${DATAMUSE_API}?rel_syn=${encodeURIComponent(word)}&max=15`, { signal }),
      fetch(`${DATAMUSE_API}?rel_ant=${encodeURIComponent(word)}&max=10`, { signal }),
      fetch(`${DATAMUSE_API}?rel_gen=${encodeURIComponent(word)}&max=10`, { signal }),
      fetch(`${DATAMUSE_API}?rel_spc=${encodeURIComponent(word)}&max=10`, { signal }),
    ])

    const synonyms: string[] = []
    const antonyms: string[] = []
    const hypernyms: string[] = []
    const hyponyms: string[] = []

    if (synResponse.ok) {
      const synData = await synResponse.json() as Array<{ word: string; score: number }>
      synonyms.push(...synData.map(item => item.word))
    }

    if (antResponse.ok) {
      const antData = await antResponse.json() as Array<{ word: string; score: number }>
      antonyms.push(...antData.map(item => item.word))
    }

    if (genResponse.ok) {
      const genData = await genResponse.json() as Array<{ word: string; score: number }>
      hypernyms.push(...genData.map(item => item.word))
    }

    if (spcResponse.ok) {
      const spcData = await spcResponse.json() as Array<{ word: string; score: number }>
      hyponyms.push(...spcData.map(item => item.word))
    }

    return { synonyms, antonyms, hypernyms, hyponyms }
  } catch {
    return { synonyms: [], antonyms: [], hypernyms: [], hyponyms: [] }
  }
}

/**
 * Fallback to Free Dictionary API (for static deployments like GitHub Pages)
 */
async function lookupFreeDictionary(
  word: string,
  signal?: AbortSignal
): Promise<DictionaryData | null> {
  try {
    const response = await fetch(`${FREE_DICT_API}/${encodeURIComponent(word)}`, { signal })

    if (!response.ok) {
      return null
    }

    const entries: FreeDictEntry[] = await response.json()
    if (!entries || entries.length === 0) {
      return null
    }

    const entry = entries[0]
    const definitions: Definition[] = []
    const synonyms = new Set<string>()
    const antonyms = new Set<string>()
    const examples: string[] = []

    for (const meaning of entry.meanings) {
      // Collect synonyms/antonyms from meaning level
      meaning.synonyms?.forEach(s => synonyms.add(s))
      meaning.antonyms?.forEach(a => antonyms.add(a))

      for (const def of meaning.definitions) {
        definitions.push({
          text: def.definition,
          partOfSpeech: meaning.partOfSpeech,
          example: def.example,
        })

        if (def.example) {
          examples.push(def.example)
        }

        // Collect synonyms/antonyms from definition level
        def.synonyms?.forEach(s => synonyms.add(s))
        def.antonyms?.forEach(a => antonyms.add(a))
      }
    }

    // Get phonetic
    const phonetic = entry.phonetic ||
      entry.phonetics?.find(p => p.text)?.text ||
      undefined

    // Fetch additional data from Datamuse (synonyms, antonyms, related words)
    let finalSynonyms = Array.from(synonyms)
    let finalAntonyms = Array.from(antonyms)
    let finalHypernyms: string[] = []
    let finalHyponyms: string[] = []

    // Always fetch from Datamuse to supplement Free Dictionary data
    const datamuseData = await fetchDatamuseData(word, signal)

    // Merge synonyms if needed
    if (datamuseData.synonyms.length > 0) {
      const synSet = new Set([...finalSynonyms, ...datamuseData.synonyms])
      finalSynonyms = Array.from(synSet)
    }

    // Merge antonyms if needed
    if (datamuseData.antonyms.length > 0) {
      const antSet = new Set([...finalAntonyms, ...datamuseData.antonyms])
      finalAntonyms = Array.from(antSet)
    }

    // Use Datamuse for hypernyms/hyponyms (not available from Free Dictionary)
    finalHypernyms = datamuseData.hypernyms
    finalHyponyms = datamuseData.hyponyms

    return {
      word: entry.word,
      phonetic,
      definitions,
      synonyms: finalSynonyms.slice(0, 15),
      antonyms: finalAntonyms.slice(0, 10),
      hypernyms: finalHypernyms.slice(0, 10),
      hyponyms: finalHyponyms.slice(0, 10),
      examples: examples.slice(0, 5),
      source: 'free-dictionary',
      isAcronym: false,
    }
  } catch {
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useDictionary(): UseDictionaryReturn {
  const [data, setData] = useState<DictionaryData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentWord, setCurrentWord] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const lookup = useCallback(async (word: string): Promise<DictionaryData | null> => {
    const normalizedWord = word.trim().toLowerCase()

    if (!normalizedWord) {
      setError('Please enter a word to look up')
      return null
    }

    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Check client cache first
    const cached = getClientCache(normalizedWord)
    if (cached) {
      setData(cached)
      setCurrentWord(normalizedWord)
      setError(null)
      return cached
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)
    setCurrentWord(normalizedWord)

    try {
      // Try local API first (works with server deployments)
      let result: DictionaryData | null = null
      let useLocalApi = true

      try {
        const response = await fetch(
          `/api/dictionary?word=${encodeURIComponent(normalizedWord)}`,
          { signal: abortControllerRef.current.signal }
        )

        if (response.ok) {
          result = await response.json()
          // Check if we got meaningful data
          if (result && (result.definitions.length > 0 || result.synonyms.length > 0)) {
            // Valid result from local API
          } else {
            result = null
          }
        } else if (response.status === 404) {
          // API route exists but word not found - still try fallback
          useLocalApi = false
        } else {
          // Other error - try fallback
          useLocalApi = false
        }
      } catch (fetchError: unknown) {
        // Network error or API not available (static deployment)
        // Fall through to Free Dictionary API
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw fetchError
        }
        useLocalApi = false
      }

      // Fallback to Free Dictionary API if local API failed or had no results
      if (!result) {
        result = await lookupFreeDictionary(normalizedWord, abortControllerRef.current.signal)
      }

      if (!result) {
        throw new Error(`No definition found for "${word}"`)
      }

      // Cache and set result
      setClientCache(normalizedWord, result)
      setData(result)
      setError(null)
      return result
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, don't update state
        return null
      }
      const message = err instanceof Error ? err.message : 'Failed to look up definition'
      setError(message)
      setData(null)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearData = useCallback(() => {
    setData(null)
    setError(null)
    setCurrentWord(null)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  return {
    data,
    isLoading,
    error,
    lookup,
    clearData,
    currentWord,
  }
}

export default useDictionary
