/**
 * Dictionary API Route
 * @module app/api/dictionary/route
 *
 * Provides offline dictionary lookups via WordNet with
 * optional Free Dictionary API fallback for richer data.
 *
 * GET /api/dictionary?word=example
 * Returns: definitions, synonyms, hypernyms, hyponyms, etc.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getSynsets,
  getSynonyms,
  getHypernyms,
  getHyponyms,
} from '@/lib/nlp/wordnet'

// Lazy import glossary to avoid import-time failures
let glossaryModule: {
  getTermDefinition: (term: string) => string | null
  isKnownAcronym: (term: string) => boolean
} | null = null

async function getGlossary() {
  if (!glossaryModule) {
    try {
      glossaryModule = await import('@/lib/glossary/glossaryGenerator')
    } catch (error) {
      console.warn('[Dictionary API] Glossary module not available:', error)
      glossaryModule = {
        getTermDefinition: () => null,
        isKnownAcronym: () => false,
      }
    }
  }
  return glossaryModule
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Definition {
  text: string
  partOfSpeech: string
  example?: string
}

interface DictionaryResponse {
  word: string
  phonetic?: string
  definitions: Definition[]
  synonyms: string[]
  antonyms: string[]
  hypernyms: string[]
  hyponyms: string[]
  examples: string[]
  source: 'wordnet' | 'api' | 'acronym' | 'combined'
  isAcronym: boolean
  acronymExpansion?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// LRU CACHE
// ═══════════════════════════════════════════════════════════════════════════

const cache = new Map<string, { data: DictionaryResponse; timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 60 // 1 hour
const MAX_CACHE_SIZE = 1000

function getCached(word: string): DictionaryResponse | null {
  const entry = cache.get(word.toLowerCase())
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(word.toLowerCase())
    return null
  }
  return entry.data
}

function setCache(word: string, data: DictionaryResponse): void {
  // Evict oldest entries if cache is full
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value
    if (oldestKey) cache.delete(oldestKey)
  }
  cache.set(word.toLowerCase(), { data, timestamp: Date.now() })
}

// ═══════════════════════════════════════════════════════════════════════════
// FREE DICTIONARY API (Fallback for richer data)
// ═══════════════════════════════════════════════════════════════════════════

interface FreeDictEntry {
  word: string
  phonetic?: string
  phonetics?: Array<{ text?: string; audio?: string }>
  meanings: Array<{
    partOfSpeech: string
    definitions: Array<{
      definition: string
      example?: string
      synonyms?: string[]
      antonyms?: string[]
    }>
    synonyms?: string[]
    antonyms?: string[]
  }>
}

async function fetchFromFreeDictionaryAPI(word: string): Promise<{
  phonetic?: string
  definitions: Definition[]
  synonyms: string[]
  antonyms: string[]
  examples: string[]
} | null> {
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    )

    if (!response.ok) return null

    const data: FreeDictEntry[] = await response.json()
    if (!data || data.length === 0) return null

    const entry = data[0]
    const definitions: Definition[] = []
    const synonyms = new Set<string>()
    const antonyms = new Set<string>()
    const examples: string[] = []

    // Get phonetic
    const phonetic = entry.phonetic || entry.phonetics?.find(p => p.text)?.text

    // Extract definitions and synonyms
    for (const meaning of entry.meanings || []) {
      // Collect synonyms/antonyms at meaning level
      meaning.synonyms?.forEach(s => synonyms.add(s))
      meaning.antonyms?.forEach(a => antonyms.add(a))

      for (const def of meaning.definitions?.slice(0, 3) || []) {
        definitions.push({
          text: def.definition,
          partOfSpeech: meaning.partOfSpeech,
          example: def.example,
        })

        if (def.example) {
          examples.push(def.example)
        }

        // Collect synonyms/antonyms at definition level
        def.synonyms?.forEach(s => synonyms.add(s))
        def.antonyms?.forEach(a => antonyms.add(a))
      }
    }

    return {
      phonetic,
      definitions,
      synonyms: Array.from(synonyms).slice(0, 20),
      antonyms: Array.from(antonyms).slice(0, 10),
      examples: examples.slice(0, 5),
    }
  } catch (error) {
    console.error('[Dictionary API] Free Dictionary fetch failed:', error)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WORDNET LOOKUP (Offline)
// ═══════════════════════════════════════════════════════════════════════════

const POS_MAP: Record<string, string> = {
  n: 'noun',
  v: 'verb',
  a: 'adjective',
  s: 'adjective', // satellite adjective
  r: 'adverb',
}

async function lookupWordNet(word: string): Promise<{
  definitions: Definition[]
  synonyms: string[]
  hypernyms: string[]
  hyponyms: string[]
}> {
  try {
    // Get synsets (definitions)
    const synsets = await getSynsets(word)
    const definitions: Definition[] = []

    for (const synset of synsets.slice(0, 5)) {
      definitions.push({
        text: synset.def || '',
        partOfSpeech: POS_MAP[synset.pos] || synset.pos,
      })
    }

    // Get related terms
    const [synonyms, hypernyms, hyponyms] = await Promise.all([
      getSynonyms(word),
      getHypernyms(word, 3),
      getHyponyms(word, 2),
    ])

    return {
      definitions,
      synonyms: synonyms.slice(0, 20),
      hypernyms: hypernyms.slice(0, 10),
      hyponyms: hyponyms.slice(0, 10),
    }
  } catch (error) {
    console.error('[Dictionary API] WordNet lookup failed:', error)
    return {
      definitions: [],
      synonyms: [],
      hypernyms: [],
      hyponyms: [],
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const word = searchParams.get('word')?.trim()

  if (!word) {
    return NextResponse.json(
      { error: 'Missing "word" parameter' },
      { status: 400 }
    )
  }

  // Check cache first
  const cached = getCached(word)
  if (cached) {
    return NextResponse.json(cached)
  }

  // Check if it's a known acronym
  let acronymExpansion: string | undefined
  let isAcronym = false
  try {
    const glossary = await getGlossary()
    const termDef = glossary.getTermDefinition(word)
    acronymExpansion = termDef || undefined
    isAcronym = glossary.isKnownAcronym(word)
  } catch {
    // Glossary not available
  }

  // Fetch from WordNet (offline, always available)
  const wordnetData = await lookupWordNet(word)

  // If WordNet has limited data, try Free Dictionary API for richer content
  let apiData: Awaited<ReturnType<typeof fetchFromFreeDictionaryAPI>> = null
  if (wordnetData.definitions.length < 2 || wordnetData.synonyms.length < 3) {
    apiData = await fetchFromFreeDictionaryAPI(word)
  }

  // Check if we have any data
  if (wordnetData.definitions.length === 0 && !apiData && !acronymExpansion) {
    return NextResponse.json(
      { error: `No definition found for "${word}"` },
      { status: 404 }
    )
  }

  // Merge results
  const result: DictionaryResponse = {
    word: word.toLowerCase(),
    phonetic: apiData?.phonetic,
    definitions: [
      // If acronym, add expansion as first definition
      ...(acronymExpansion
        ? [{ text: acronymExpansion, partOfSpeech: 'acronym' }]
        : []),
      // Prefer API definitions if available (richer), otherwise WordNet
      ...(apiData?.definitions.length
        ? apiData.definitions
        : wordnetData.definitions),
    ],
    synonyms: [
      ...new Set([
        ...(apiData?.synonyms || []),
        ...wordnetData.synonyms,
      ]),
    ].slice(0, 20),
    antonyms: apiData?.antonyms || [],
    hypernyms: wordnetData.hypernyms,
    hyponyms: wordnetData.hyponyms,
    examples: apiData?.examples || [],
    source: apiData ? 'combined' : wordnetData.definitions.length > 0 ? 'wordnet' : 'acronym',
    isAcronym,
    acronymExpansion: acronymExpansion || undefined,
  }

  // Cache the result
  setCache(word, result)

  return NextResponse.json(result)
}
