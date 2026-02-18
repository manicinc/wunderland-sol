/**
 * Flashcard Management Hook
 *
 * Provides comprehensive flashcard functionality including:
 * - CRUD operations for flashcards
 * - FSRS-based spaced repetition
 * - Study session management
 * - Progress persistence via IndexedDB
 * - Content deduplication and validation
 * - Persistent caching of generated flashcards
 *
 * @module hooks/useFlashcards
 */

'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import * as flashcardCache from '@/lib/generation/flashcardCache'
import type { FlashcardCacheStats, CachedFlashcards } from '@/lib/generation/flashcardCache'
import { generateFlashcards as generateFlashcardsWithLLM, getGenerationCapabilities } from '@/lib/generation'
import { isLLMAvailable } from '@/lib/llm'
import type {
  Flashcard,
  FlashcardDeck,
  FlashcardRating,
  FSRSState,
  FlashcardType,
  FlashcardSource,
  StudySession
} from '@/types/openstrand'
import {
  createInitialFSRSState,
  processReview,
  previewNextIntervals,
  getDueCards,
  sortByPriority,
  calculateDeckStats,
  formatInterval,
  createReviewEntry
} from '@/lib/fsrs'
import { XP_REWARDS } from '@/types/openstrand'
import { flashcardStorage } from '@/lib/storage'
import { parseMarkdownBlocks, extractTechEntities } from '@/lib/nlp'

// Storage key prefix (legacy - for migration)
const STORAGE_PREFIX = 'openstrand_flashcards_'

/**
 * Source information for multi-strand flashcard generation
 */
export interface FlashcardSourceInfo {
  strandId: string
  strandPath: string
  strandTitle: string
}

// ==================== Validation & Deduplication ====================

/**
 * Generate a content hash for deduplication
 * Normalizes whitespace and case for comparison
 */
function hashContent(front: string, back: string): string {
  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ')
  return `${normalize(front)}|${normalize(back)}`
}

/**
 * Validate a flashcard before saving
 * Returns true if the card is valid, false otherwise
 */
function validateCard(card: Partial<Flashcard>): { valid: boolean; reason?: string } {
  // Front must exist and be meaningful (at least 5 chars)
  if (!card.front?.trim() || card.front.trim().length < 5) {
    return { valid: false, reason: 'Front side too short (min 5 characters)' }
  }

  // Back must exist
  if (!card.back?.trim() || card.back.trim().length < 1) {
    return { valid: false, reason: 'Back side is empty' }
  }

  // Front and back shouldn't be identical
  if (card.front.trim().toLowerCase() === card.back.trim().toLowerCase()) {
    return { valid: false, reason: 'Front and back are identical' }
  }

  // Front shouldn't be just [...] (incomplete cloze)
  if (card.front.trim() === '[...]' || card.front.trim() === '...') {
    return { valid: false, reason: 'Front side is just a placeholder' }
  }

  // Back shouldn't be unreasonably long (likely captured too much)
  if (card.back.trim().length > 500) {
    return { valid: false, reason: 'Back side too long (max 500 characters)' }
  }

  return { valid: true }
}

/**
 * Extract text content from markdown, filtering out code blocks and frontmatter
 */
function extractTextFromMarkdown(content: string): string {
  const blocks = parseMarkdownBlocks(content)

  // Only include paragraph, heading, and list blocks (skip code, tables, etc.)
  const textBlocks = blocks
    .filter(b => b.type === 'paragraph' || b.type === 'heading' || b.type === 'list')
    .map(b => b.content)

  return textBlocks.join('\n\n')
}

/**
 * Calculate confidence score based on extraction quality
 */
function calculateConfidence(
  term: string,
  sentence: string,
  method: 'keyword' | 'definition'
): number {
  let score = 0.5 // Base score

  // Keyword frequency in sentence (more occurrences = more relevant)
  const termCount = (sentence.match(new RegExp(`\\b${term}\\b`, 'gi')) || []).length
  score += Math.min(termCount * 0.1, 0.15)

  // Sentence quality (prefer 15-60 word sentences)
  const wordCount = sentence.split(/\s+/).length
  if (wordCount >= 15 && wordCount <= 60) {
    score += 0.15
  } else if (wordCount >= 10 && wordCount <= 80) {
    score += 0.08
  }

  // Term complexity (longer terms are often more specific/valuable)
  if (term.length > 8) {
    score += 0.1
  } else if (term.length > 5) {
    score += 0.05
  }

  // Definition pattern match strength
  if (method === 'definition') {
    // Definitions are generally more reliable
    score += 0.1

    // Check for strong definition markers
    if (/\b(is defined as|refers to|means)\b/i.test(sentence)) {
      score += 0.1
    }
  }

  // Cap at 0.95
  return Math.min(score, 0.95)
}

/**
 * Generate a UUID v4
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Flashcard storage interface
 */
interface FlashcardStore {
  getCards(strandSlug: string): Promise<Flashcard[]>
  saveCard(card: Flashcard): Promise<void>
  deleteCard(cardId: string): Promise<void>
  getAllCards(): Promise<Flashcard[]>
  getContentHashes(strandSlug: string): Promise<Set<string>>
}

/**
 * Storage key for all flashcards
 */
const FLASHCARDS_KEY = 'all_cards'

/**
 * Migration singleton - ensures migration only runs once per session
 */
let migrationDone = false
let migrationPromise: Promise<void> | null = null

/**
 * Ensure migration has completed (singleton pattern)
 * Prevents redundant migration checks on every card operation
 */
async function ensureMigrated(): Promise<void> {
  if (migrationDone) return
  if (migrationPromise) {
    await migrationPromise
    return
  }
  migrationPromise = migrateFromLocalStorage()
  await migrationPromise
  migrationDone = true
}

/**
 * Migrate old localStorage flashcards to new storage
 */
async function migrateFromLocalStorage(): Promise<void> {
  if (typeof window === 'undefined') return

  // Check if already migrated
  const migrated = await flashcardStorage.get<boolean>('migrated_v1', false)
  if (migrated) return

  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX))
    if (keys.length === 0) {
      await flashcardStorage.set('migrated_v1', true)
      return
    }

    const allCards: Record<string, Flashcard[]> = {}

    for (const key of keys) {
      const slug = key.replace(STORAGE_PREFIX, '')
      const cards = JSON.parse(localStorage.getItem(key) || '[]') as Flashcard[]
      if (cards.length > 0) {
        allCards[slug] = cards
      }
      // Remove old localStorage key
      localStorage.removeItem(key)
    }

    if (Object.keys(allCards).length > 0) {
      await flashcardStorage.set(FLASHCARDS_KEY, allCards)
      console.log('[Flashcards] Migrated', Object.values(allCards).flat().length, 'cards from localStorage')
    }

    await flashcardStorage.set('migrated_v1', true)
  } catch (err) {
    console.error('[Flashcards] Migration failed:', err)
  }
}

/**
 * IndexedDB-backed flashcard store with migration support
 */
const cardStore: FlashcardStore = {
  async getCards(strandSlug: string): Promise<Flashcard[]> {
    if (typeof window === 'undefined') return []
    await ensureMigrated()

    const allCards = await flashcardStorage.get<Record<string, Flashcard[]>>(FLASHCARDS_KEY, {})
    return allCards[strandSlug] || []
  },

  async saveCard(card: Flashcard): Promise<void> {
    if (typeof window === 'undefined') return
    await ensureMigrated()

    const allCards = await flashcardStorage.get<Record<string, Flashcard[]>>(FLASHCARDS_KEY, {})
    const strandCards = allCards[card.strandSlug] || []

    const existingIndex = strandCards.findIndex(c => c.id === card.id)
    if (existingIndex >= 0) {
      strandCards[existingIndex] = card
    } else {
      strandCards.push(card)
    }

    allCards[card.strandSlug] = strandCards
    await flashcardStorage.set(FLASHCARDS_KEY, allCards)
  },

  async deleteCard(cardId: string): Promise<void> {
    if (typeof window === 'undefined') return
    await ensureMigrated()

    const allCards = await flashcardStorage.get<Record<string, Flashcard[]>>(FLASHCARDS_KEY, {})

    for (const slug of Object.keys(allCards)) {
      const filtered = allCards[slug].filter(c => c.id !== cardId)
      if (filtered.length !== allCards[slug].length) {
        allCards[slug] = filtered
        await flashcardStorage.set(FLASHCARDS_KEY, allCards)
        break
      }
    }
  },

  async getAllCards(): Promise<Flashcard[]> {
    if (typeof window === 'undefined') return []
    await ensureMigrated()

    const allCards = await flashcardStorage.get<Record<string, Flashcard[]>>(FLASHCARDS_KEY, {})
    return Object.values(allCards).flat()
  },

  async getContentHashes(strandSlug: string): Promise<Set<string>> {
    const cards = await this.getCards(strandSlug)
    return new Set(cards.map(c => hashContent(c.front, c.back)))
  }
}

/**
 * Hook options
 */
export interface UseFlashcardsOptions {
  strandSlug?: string
  autoLoad?: boolean
}

/**
 * Study session state
 */
interface StudySessionState {
  active: boolean
  startTime: Date | null
  cards: Flashcard[]
  currentIndex: number
  reviewed: number
  correct: number
  xpEarned: number
  streak: number
}

/**
 * Main flashcard hook
 */
export function useFlashcards(options: UseFlashcardsOptions = {}) {
  const { strandSlug, autoLoad = true } = options
  
  // State
  const [cards, setCards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<StudySessionState>({
    active: false,
    startTime: null,
    cards: [],
    currentIndex: 0,
    reviewed: 0,
    correct: 0,
    xpEarned: 0,
    streak: 0
  })

  // Load cards on mount
  useEffect(() => {
    if (!autoLoad) {
      setLoading(false)
      return
    }

    const loadCards = async () => {
      try {
        setLoading(true)
        const loadedCards = strandSlug
          ? await cardStore.getCards(strandSlug)
          : await cardStore.getAllCards()
        setCards(loadedCards)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load flashcards')
      } finally {
        setLoading(false)
      }
    }

    loadCards()
  }, [strandSlug, autoLoad])

  // Computed statistics
  const stats = useMemo(() => {
    return calculateDeckStats(cards)
  }, [cards])

  // Get due cards
  const dueCards = useMemo(() => {
    return getDueCards(cards.filter(c => !c.suspended))
  }, [cards])

  // Get cards sorted by priority
  const prioritizedCards = useMemo(() => {
    return sortByPriority(cards.filter(c => !c.suspended))
  }, [cards])

  /**
   * Create a new flashcard
   */
  const createCard = useCallback(async (
    data: Omit<Flashcard, 'id' | 'fsrs' | 'createdAt' | 'updatedAt' | 'suspended' | 'starred'>
  ): Promise<Flashcard> => {
    const now = new Date().toISOString()
    const newCard: Flashcard = {
      ...data,
      id: generateId(),
      fsrs: createInitialFSRSState(),
      suspended: false,
      starred: false,
      createdAt: now,
      updatedAt: now
    }

    await cardStore.saveCard(newCard)
    setCards(prev => [...prev, newCard])
    return newCard
  }, [])

  /**
   * Update an existing flashcard
   */
  const updateCard = useCallback(async (
    cardId: string,
    updates: Partial<Omit<Flashcard, 'id' | 'createdAt'>>
  ): Promise<Flashcard | null> => {
    const card = cards.find(c => c.id === cardId)
    if (!card) return null

    const updatedCard: Flashcard = {
      ...card,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    await cardStore.saveCard(updatedCard)
    setCards(prev => prev.map(c => c.id === cardId ? updatedCard : c))
    return updatedCard
  }, [cards])

  /**
   * Delete a flashcard
   */
  const deleteCard = useCallback(async (cardId: string): Promise<void> => {
    await cardStore.deleteCard(cardId)
    setCards(prev => prev.filter(c => c.id !== cardId))
  }, [])

  /**
   * Toggle card suspension
   */
  const toggleSuspended = useCallback(async (cardId: string): Promise<void> => {
    const card = cards.find(c => c.id === cardId)
    if (card) {
      await updateCard(cardId, { suspended: !card.suspended })
    }
  }, [cards, updateCard])

  /**
   * Toggle card starred status
   */
  const toggleStarred = useCallback(async (cardId: string): Promise<void> => {
    const card = cards.find(c => c.id === cardId)
    if (card) {
      await updateCard(cardId, { starred: !card.starred })
    }
  }, [cards, updateCard])

  /**
   * Start a study session
   */
  const startSession = useCallback((cardsToStudy?: Flashcard[]) => {
    const studyCards = cardsToStudy || sortByPriority(getDueCards(cards.filter(c => !c.suspended)))
    
    setSession({
      active: true,
      startTime: new Date(),
      cards: studyCards,
      currentIndex: 0,
      reviewed: 0,
      correct: 0,
      xpEarned: 0,
      streak: 0
    })
  }, [cards])

  /**
   * End the current study session
   */
  const endSession = useCallback((): StudySession | null => {
    if (!session.active || !session.startTime) return null

    const sessionData: StudySession = {
      id: generateId(),
      type: 'flashcard',
      startedAt: session.startTime.toISOString(),
      endedAt: new Date().toISOString(),
      itemsReviewed: session.reviewed,
      correctCount: session.correct,
      duration: Math.round((Date.now() - session.startTime.getTime()) / 1000),
      xpEarned: session.xpEarned,
      deckIds: strandSlug ? [strandSlug] : [],
      streakMaintained: session.streak >= 3
    }

    setSession({
      active: false,
      startTime: null,
      cards: [],
      currentIndex: 0,
      reviewed: 0,
      correct: 0,
      xpEarned: 0,
      streak: 0
    })

    return sessionData
  }, [session, strandSlug])

  /**
   * Get the current card in the study session
   */
  const currentCard = useMemo(() => {
    if (!session.active || session.currentIndex >= session.cards.length) {
      return null
    }
    return session.cards[session.currentIndex]
  }, [session])

  /**
   * Preview what intervals each rating would give
   */
  const intervalPreview = useMemo(() => {
    if (!currentCard) return null
    return previewNextIntervals(currentCard.fsrs)
  }, [currentCard])

  /**
   * Rate the current card and move to the next
   */
  const rateCard = useCallback(async (rating: FlashcardRating): Promise<{
    xpEarned: number
    isCorrect: boolean
    scheduledDays: number
    nextCard: Flashcard | null
  }> => {
    if (!currentCard) {
      throw new Error('No current card to rate')
    }

    // Process the review
    const { newState, scheduledDays } = processReview(currentCard.fsrs, rating)
    const reviewEntry = createReviewEntry(rating, currentCard.fsrs, newState, scheduledDays)
    
    // Update the card
    const updatedCard = await updateCard(currentCard.id, {
      fsrs: newState,
      history: [...(currentCard.history || []), reviewEntry]
    })

    // Calculate XP
    const isCorrect = rating >= 3
    let xpEarned = XP_REWARDS.flashcardReview
    if (isCorrect) {
      xpEarned += XP_REWARDS.flashcardCorrect
    }
    const newStreak = isCorrect ? session.streak + 1 : 0
    if (newStreak > 0) {
      xpEarned += XP_REWARDS.flashcardStreak * newStreak
    }

    // Update session
    const nextIndex = session.currentIndex + 1
    const nextCard = nextIndex < session.cards.length ? session.cards[nextIndex] : null

    setSession(prev => ({
      ...prev,
      currentIndex: nextIndex,
      reviewed: prev.reviewed + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
      xpEarned: prev.xpEarned + xpEarned,
      streak: newStreak
    }))

    return {
      xpEarned,
      isCorrect,
      scheduledDays,
      nextCard
    }
  }, [currentCard, session, updateCard])

  /**
   * Skip the current card (move to end of queue)
   */
  const skipCard = useCallback(() => {
    if (!currentCard || !session.active) return

    setSession(prev => {
      const newCards = [...prev.cards]
      const skipped = newCards.splice(prev.currentIndex, 1)[0]
      newCards.push(skipped)
      return {
        ...prev,
        cards: newCards
      }
    })
  }, [currentCard, session.active])

  /**
   * Format an interval for display
   */
  const formatIntervalDisplay = useCallback((days: number) => {
    return formatInterval(days)
  }, [])

  return {
    // Data
    cards,
    dueCards,
    prioritizedCards,
    stats,
    loading,
    error,

    // CRUD operations
    createCard,
    updateCard,
    deleteCard,
    toggleSuspended,
    toggleStarred,

    // Study session
    session,
    currentCard,
    intervalPreview,
    startSession,
    endSession,
    rateCard,
    skipCard,

    // Utilities
    formatInterval: formatIntervalDisplay,
    getDueCards: () => getDueCards(cards.filter(c => !c.suspended)),
    getStats: () => calculateDeckStats(cards)
  }
}

/**
 * Hook for generating flashcards from content with persistent caching
 */
export function useFlashcardGeneration() {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<{ generated: number; skipped: number; invalid: number }>({
    generated: 0,
    skipped: 0,
    invalid: 0
  })
  const [cacheInfo, setCacheInfo] = useState<{
    fromCache: boolean
    cacheAge?: number
    generationMethod?: string
  } | null>(null)
  const [cacheStats, setCacheStats] = useState<FlashcardCacheStats | null>(null)

  // Load cache stats on mount
  useEffect(() => {
    flashcardCache.getCacheStats().then(setCacheStats).catch(console.error)
  }, [])

  /**
   * Generate flashcards using keyword extraction
   * - Parses markdown to extract only text (no code blocks)
   * - Deduplicates against existing cards
   * - Validates before returning
   */
  const generateFromKeywords = useCallback(async (
    content: string,
    strandSlug: string,
    existingHashes?: Set<string>,
    sourceInfo?: FlashcardSourceInfo
  ): Promise<Omit<Flashcard, 'id' | 'fsrs' | 'createdAt' | 'updatedAt' | 'suspended' | 'starred'>[]> => {
    setGenerating(true)
    setError(null)
    setStats({ generated: 0, skipped: 0, invalid: 0 })

    try {
      // Extract text content from markdown (filters out code blocks, frontmatter)
      const textContent = extractTextFromMarkdown(content)

      // Get existing card hashes for deduplication
      const hashes = existingHashes || await cardStore.getContentHashes(strandSlug)

      // Dynamic import of compromise for NLP
      const nlp = (await import('compromise')).default
      const doc = nlp(textContent)

      // Extract key terms from NLP
      const nouns = doc.nouns().out('array') as string[]
      const topics = doc.topics().out('array') as string[]
      const people = doc.people().out('array') as string[]
      const places = doc.places().out('array') as string[]

      // Also extract tech entities (better for programming content)
      const techEntities = extractTechEntities(textContent)
      const techTerms = [
        ...(techEntities.languages || []),
        ...(techEntities.frameworks || []),
        ...(techEntities.databases || []),
        ...(techEntities.concepts || []),
        ...(techEntities.ai || []),
      ]

      // Prioritize tech entities > topics > people > places > nouns
      const allTerms = [...new Set([...techTerms, ...topics, ...people, ...places, ...nouns.slice(0, 15)])]

      // Find sentences/segments containing each term
      // Split on periods, exclamations, questions, AND list item newlines
      const sentences = textContent
        .split(/[.!?\n]+/)
        .map(s => s.trim().replace(/^[-*+•]\s*/, '').replace(/^\d+\.\s*/, '')) // Remove list markers
        .filter(s => s.length > 15) // Lower threshold for list items
      const cards: Omit<Flashcard, 'id' | 'fsrs' | 'createdAt' | 'updatedAt' | 'suspended' | 'starred'>[] = []
      const newHashes = new Set<string>()
      let skipped = 0
      let invalid = 0

      for (const term of allTerms.slice(0, 20)) {
        // Skip very short or common terms
        if (term.length < 3) continue

        const relevantSentence = sentences.find(s =>
          s.toLowerCase().includes(term.toLowerCase())
        )

        if (relevantSentence) {
          // Create cloze deletion
          const clozeText = relevantSentence.replace(
            new RegExp(`\\b${term}\\b`, 'gi'),
            '[...]'
          )

          // Check for duplicates
          const cardHash = hashContent(clozeText, term)
          if (hashes.has(cardHash) || newHashes.has(cardHash)) {
            skipped++
            continue
          }

          // Create candidate card
          const candidate = {
            strandSlug,
            type: 'cloze' as const,
            front: clozeText,
            back: term,
            tags: ['auto-generated', 'keyword'],
            source: 'static' as const,
            generation: {
              method: 'keyword-extraction' as const,
              confidence: calculateConfidence(term, relevantSentence, 'keyword'),
              sourceText: relevantSentence
            },
            // Multi-strand source tracking
            ...(sourceInfo && { sourceStrand: sourceInfo })
          }

          // Validate card
          const validation = validateCard(candidate)
          if (!validation.valid) {
            invalid++
            continue
          }

          cards.push(candidate)
          newHashes.add(cardHash)
        }
      }

      setStats({ generated: cards.length, skipped, invalid })
      return cards
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate flashcards')
      return []
    } finally {
      setGenerating(false)
    }
  }, [])

  /**
   * Generate definition-style flashcards
   * - Parses markdown to extract only text (no code blocks)
   * - Deduplicates against existing cards
   * - Validates before returning
   */
  const generateFromDefinitions = useCallback(async (
    content: string,
    strandSlug: string,
    existingHashes?: Set<string>,
    sourceInfo?: FlashcardSourceInfo
  ): Promise<Omit<Flashcard, 'id' | 'fsrs' | 'createdAt' | 'updatedAt' | 'suspended' | 'starred'>[]> => {
    setGenerating(true)
    setError(null)
    setStats({ generated: 0, skipped: 0, invalid: 0 })

    try {
      // Extract text content from markdown (filters out code blocks, frontmatter)
      const textContent = extractTextFromMarkdown(content)

      // Get existing card hashes for deduplication
      const hashes = existingHashes || await cardStore.getContentHashes(strandSlug)

      // Pattern matching for definitions - expanded for various formats
      const definitionPatterns = [
        /([A-Z][a-zA-Z\s]+)\s+(?:is|are|refers to|means|describes)\s+(.+?)[.!?\n]/g,
        /(?:The term\s+)?["']?([^"']+)["']?\s+(?:is defined as|can be defined as)\s+(.+?)[.!?\n]/g,
        /\*\*([^*]+)\*\*[:\s]+(.+?)[.!?\n]/g, // **Term**: definition pattern
        /`([^`]+)`\s+(?:is|are|refers to)\s+(.+?)[.!?\n]/g, // `term` is definition pattern
        // List item with parenthetical definition: "- Hash table (like dict, but only keys)"
        /[-*+•]\s*([A-Za-z][A-Za-z\s_]+)\s+\(([^)]+)\)/gm,
        // Colon definitions: "Set Implementation: description" or "# Topic: explanation"
        /(?:^|\n)#*\s*([A-Za-z][A-Za-z\s_]+)[:\s]+([A-Za-z][^.!?\n]{15,})/gm,
        // Markdown heading followed by content: "## Term\n definition content"
        /##?\s+([A-Za-z][A-Za-z\s_]+)\n+([A-Za-z][^#]{20,}?)(?=\n#|\n\n|$)/g,
      ]

      const cards: Omit<Flashcard, 'id' | 'fsrs' | 'createdAt' | 'updatedAt' | 'suspended' | 'starred'>[] = []
      const newHashes = new Set<string>()
      let skipped = 0
      let invalid = 0

      for (const pattern of definitionPatterns) {
        let match
        // Reset lastIndex for each pattern
        pattern.lastIndex = 0

        while ((match = pattern.exec(textContent)) !== null) {
          const term = match[1].trim()
          const definition = match[2].trim()

          // Basic length checks
          if (term.length < 3 || term.length > 50 || definition.length < 10) {
            invalid++
            continue
          }

          const front = `What is ${term}?`
          const back = definition

          // Check for duplicates
          const cardHash = hashContent(front, back)
          if (hashes.has(cardHash) || newHashes.has(cardHash)) {
            skipped++
            continue
          }

          // Create candidate card
          const candidate = {
            strandSlug,
            type: 'basic' as const,
            front,
            back,
            tags: ['auto-generated', 'definition'],
            source: 'static' as const,
            generation: {
              method: 'definition-extraction' as const,
              confidence: calculateConfidence(term, match[0], 'definition'),
              sourceText: match[0]
            },
            // Multi-strand source tracking
            ...(sourceInfo && { sourceStrand: sourceInfo })
          }

          // Validate card
          const validation = validateCard(candidate)
          if (!validation.valid) {
            invalid++
            continue
          }

          cards.push(candidate)
          newHashes.add(cardHash)
        }
      }

      setStats({ generated: cards.length, skipped, invalid })
      return cards
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate flashcards')
      return []
    } finally {
      setGenerating(false)
    }
  }, [])

  /**
   * Generate both keyword and definition flashcards
   * Combines results and deduplicates across both methods
   * Uses persistent cache to avoid regenerating for same content
   */
  const generateAll = useCallback(async (
    content: string,
    strandSlug: string,
    options: { forceRegenerate?: boolean; useLLM?: boolean; title?: string } = {}
  ): Promise<{
    cards: Omit<Flashcard, 'id' | 'fsrs' | 'createdAt' | 'updatedAt' | 'suspended' | 'starred'>[]
    stats: { keywords: number; definitions: number; skipped: number; invalid: number; llmFallback?: number }
    fromCache: boolean
    generationMethod?: 'static' | 'llm' | 'hybrid'
  }> => {
    const { forceRegenerate = false, useLLM = false } = options

    // Generate cache key
    const cacheKey = flashcardCache.generateCacheKey(content, strandSlug, useLLM)

    // Check cache first (unless force regenerate)
    if (!forceRegenerate) {
      const cached = await flashcardCache.getFromCache(cacheKey)
      if (cached) {
        console.log(`[FlashcardGeneration] Cache hit for ${strandSlug}`)
        setCacheInfo({
          fromCache: true,
          cacheAge: flashcardCache.getCacheAge(cached.createdAt),
          generationMethod: cached.generationMethod
        })

        // Convert cached cards to the expected format
        const cachedCards = cached.cards.map(card => ({
          strandSlug,
          type: card.type as 'basic' | 'cloze',
          front: card.front,
          back: card.back,
          hints: card.hints,
          tags: card.tags,
          source: card.source as 'static' | 'llm',
          generation: {
            method: 'cached' as const,
            confidence: card.confidence,
            sourceText: card.sourceText
          }
        }))

        // Update cache stats
        flashcardCache.getCacheStats().then(setCacheStats).catch(console.error)

        return {
          cards: cachedCards,
          stats: {
            keywords: 0,
            definitions: 0,
            skipped: 0,
            invalid: 0
          },
          fromCache: true
        }
      }
    }

    // Cache miss - generate fresh
    console.log(`[FlashcardGeneration] Generating fresh for ${strandSlug}`)
    setCacheInfo({ fromCache: false })

    // Get existing hashes once for both methods
    const existingHashes = await cardStore.getContentHashes(strandSlug)

    // Generate from both static NLP methods
    let keywordCards: Awaited<ReturnType<typeof generateFromKeywords>> = []
    let definitionCards: Awaited<ReturnType<typeof generateFromDefinitions>> = []
    let staticError = false

    try {
      keywordCards = await generateFromKeywords(content, strandSlug, existingHashes)
      definitionCards = await generateFromDefinitions(content, strandSlug, existingHashes)
    } catch (err) {
      console.warn('[FlashcardGeneration] Static NLP generation failed:', err)
      staticError = true
    }

    // Combine and deduplicate between static methods
    let allCards: typeof keywordCards = []
    const seenHashes = new Set(existingHashes)

    for (const card of [...definitionCards, ...keywordCards]) { // Prioritize definitions
      const cardHash = hashContent(card.front, card.back)
      if (!seenHashes.has(cardHash)) {
        allCards.push(card)
        seenHashes.add(cardHash)
      }
    }

    // LLM FALLBACK: If static methods returned 0 cards or errored, try LLM
    let generationMethod: 'static' | 'llm' | 'hybrid' = 'static'
    let llmCardsCount = 0

    if ((allCards.length === 0 || staticError) && isLLMAvailable()) {
      console.log(`[FlashcardGeneration] Static NLP returned ${allCards.length} cards, falling back to LLM...`)

      try {
        const llmResult = await generateFlashcardsWithLLM({
          content,
          strandSlug,
          useLLM: true,
          maxItems: 15,
          difficulty: 'intermediate',
        })

        if (llmResult.items.length > 0) {
          console.log(`[FlashcardGeneration] LLM generated ${llmResult.items.length} cards`)

          // Convert LLM cards to our format and deduplicate
          for (const llmCard of llmResult.items) {
            const cardHash = hashContent(llmCard.front, llmCard.back)
            if (!seenHashes.has(cardHash)) {
              allCards.push({
                strandSlug,
                type: llmCard.type as 'basic' | 'cloze',
                front: llmCard.front,
                back: llmCard.back,
                hints: llmCard.hint ? [llmCard.hint] : undefined,
                tags: [...llmCard.tags, 'llm-fallback'],
                source: 'llm' as const,
                generation: {
                  method: 'llm-fallback' as const,
                  confidence: llmCard.confidence,
                  sourceText: llmCard.sourceText
                }
              })
              seenHashes.add(cardHash)
              llmCardsCount++
            }
          }

          // Track generation method
          generationMethod = allCards.some(c => c.source === 'static') ? 'hybrid' : 'llm'
        }
      } catch (llmErr) {
        console.error('[FlashcardGeneration] LLM fallback also failed:', llmErr)
        // Continue with whatever static cards we have (might be 0)
      }
    }

    // Save to cache (even if 0 cards to avoid repeated LLM calls)
    const cacheData: CachedFlashcards = {
      cards: allCards.map(card => ({
        id: generateId(),
        type: card.type as 'basic' | 'cloze' | 'reversed',
        front: card.front,
        back: card.back,
        hints: card.hints,
        tags: card.tags,
        source: card.source as 'static' | 'llm',
        confidence: card.generation?.confidence || 0.7,
        sourceText: card.generation?.sourceText
      })),
      generationMethod,
      strandSlug,
      createdAt: new Date().toISOString(),
      version: 1
    }

    await flashcardCache.saveToCache(cacheKey, strandSlug, cacheData)
    console.log(`[FlashcardGeneration] Cached ${allCards.length} cards (method: ${generationMethod}) for ${strandSlug}`)

    // Update cache stats
    flashcardCache.getCacheStats().then(setCacheStats).catch(console.error)

    return {
      cards: allCards,
      stats: {
        keywords: keywordCards.length,
        definitions: definitionCards.length,
        skipped: seenHashes.size - existingHashes.size - allCards.length,
        invalid: 0,
        llmFallback: llmCardsCount
      },
      fromCache: false,
      generationMethod
    }
  }, [generateFromKeywords, generateFromDefinitions])

  /**
   * Clear the flashcard cache
   */
  const clearCache = useCallback(async (strandSlug?: string) => {
    const result = await flashcardCache.invalidateCache(undefined, strandSlug)
    console.log(`[FlashcardGeneration] Cleared ${result.deleted} cache entries`)
    setCacheStats(await flashcardCache.getCacheStats())
    return result
  }, [])

  /**
   * Generate flashcards from multiple strands with source tracking
   * Aggregates content from all strands and generates with citations
   */
  const generateMultiStrand = useCallback(async (
    strands: Array<{
      id: string
      path: string
      title: string
      content: string
    }>,
    options: { forceRegenerate?: boolean } = {}
  ): Promise<{
    cards: Omit<Flashcard, 'id' | 'fsrs' | 'createdAt' | 'updatedAt' | 'suspended' | 'starred'>[]
    bySource: Record<string, Omit<Flashcard, 'id' | 'fsrs' | 'createdAt' | 'updatedAt' | 'suspended' | 'starred'>[]>
    stats: { total: number; byStrand: Record<string, number> }
  }> => {
    if (strands.length === 0) {
      return { cards: [], bySource: {}, stats: { total: 0, byStrand: {} } }
    }

    setGenerating(true)
    setError(null)

    const allCards: Omit<Flashcard, 'id' | 'fsrs' | 'createdAt' | 'updatedAt' | 'suspended' | 'starred'>[] = []
    const bySource: Record<string, typeof allCards> = {}
    const statsByStrand: Record<string, number> = {}
    const globalHashes = new Set<string>()

    try {
      // Process each strand
      for (const strand of strands) {
        const sourceInfo: FlashcardSourceInfo = {
          strandId: strand.id,
          strandPath: strand.path,
          strandTitle: strand.title
        }

        // Use a combined slug for multi-strand generation
        const multiSlug = `multi_${strands.map(s => s.id).sort().join('_')}`

        // Generate from this strand
        const keywordCards = await generateFromKeywords(
          strand.content,
          multiSlug,
          globalHashes,
          sourceInfo
        )
        const definitionCards = await generateFromDefinitions(
          strand.content,
          multiSlug,
          globalHashes,
          sourceInfo
        )

        // Add to results
        const strandCards = [...definitionCards, ...keywordCards]
        for (const card of strandCards) {
          const cardHash = hashContent(card.front, card.back)
          if (!globalHashes.has(cardHash)) {
            allCards.push(card)
            globalHashes.add(cardHash)

            // Track by source
            if (!bySource[strand.id]) {
              bySource[strand.id] = []
            }
            bySource[strand.id].push(card)
          }
        }

        statsByStrand[strand.id] = bySource[strand.id]?.length || 0
      }

      setStats({
        generated: allCards.length,
        skipped: 0,
        invalid: 0
      })

      return {
        cards: allCards,
        bySource,
        stats: {
          total: allCards.length,
          byStrand: statsByStrand
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate flashcards')
      return { cards: [], bySource: {}, stats: { total: 0, byStrand: {} } }
    } finally {
      setGenerating(false)
    }
  }, [generateFromKeywords, generateFromDefinitions])

  /**
   * Get flashcards filtered by source strand
   */
  const getBySource = useCallback((
    cards: Omit<Flashcard, 'id' | 'fsrs' | 'createdAt' | 'updatedAt' | 'suspended' | 'starred'>[],
    strandId: string
  ) => {
    return cards.filter(c => (c as { sourceStrand?: FlashcardSourceInfo }).sourceStrand?.strandId === strandId)
  }, [])

  return {
    generating,
    error,
    stats,
    cacheInfo,
    cacheStats,
    generateFromKeywords,
    generateFromDefinitions,
    generateAll,
    generateMultiStrand,
    getBySource,
    clearCache
  }
}

/**
 * Profile integration interface
 * Pass these functions from useProfile to enable XP and stats tracking
 */
export interface ProfileIntegration {
  addXp: (amount: number) => Promise<{
    newTotal: number
    leveledUp: boolean
    newLevel?: number
    newTitle?: string
  }>
  recordStudySession: (session: StudySession) => Promise<void>
  updateStats: (updates: {
    flashcardsReviewed?: number
    flashcardsCreated?: number
  }) => Promise<void>
}

/**
 * Enhanced flashcard hook with profile integration
 * Wraps useFlashcards with automatic XP and stats tracking
 */
export function useFlashcardsWithProfile(
  options: UseFlashcardsOptions & { profile?: ProfileIntegration } = {}
) {
  const { profile, ...flashcardOptions } = options
  const flashcards = useFlashcards(flashcardOptions)

  // Track XP earned in current interaction for batching
  const pendingXpRef = useRef(0)

  /**
   * Rate card with automatic XP tracking
   */
  const rateCardWithXp = useCallback(async (rating: FlashcardRating) => {
    const result = await flashcards.rateCard(rating)

    // Award XP via profile if available
    if (profile?.addXp) {
      try {
        const xpResult = await profile.addXp(result.xpEarned)
        pendingXpRef.current += result.xpEarned

        return {
          ...result,
          leveledUp: xpResult.leveledUp,
          newLevel: xpResult.newLevel,
          newTitle: xpResult.newTitle
        }
      } catch (err) {
        console.warn('[Flashcards] Failed to award XP:', err)
      }
    }

    return result
  }, [flashcards, profile])

  /**
   * End session with automatic recording to profile
   */
  const endSessionWithRecording = useCallback(async () => {
    const sessionData = flashcards.endSession()

    if (sessionData && profile?.recordStudySession) {
      try {
        await profile.recordStudySession(sessionData)
      } catch (err) {
        console.warn('[Flashcards] Failed to record study session:', err)
      }
    }

    pendingXpRef.current = 0
    return sessionData
  }, [flashcards, profile])

  /**
   * Create card with stats tracking
   */
  const createCardWithStats = useCallback(async (
    data: Parameters<typeof flashcards.createCard>[0]
  ) => {
    const card = await flashcards.createCard(data)

    // Update stats if profile available
    if (profile?.updateStats) {
      try {
        await profile.updateStats({ flashcardsCreated: 1 })
      } catch (err) {
        console.warn('[Flashcards] Failed to update stats:', err)
      }
    }

    return card
  }, [flashcards, profile])

  return {
    ...flashcards,
    // Override with profile-integrated versions
    rateCard: rateCardWithXp,
    endSession: endSessionWithRecording,
    createCard: createCardWithStats,
    // Keep original methods available if needed
    rateCardRaw: flashcards.rateCard,
    endSessionRaw: flashcards.endSession,
    createCardRaw: flashcards.createCard
  }
}

export type { Flashcard, FlashcardDeck, FlashcardRating, FSRSState }

