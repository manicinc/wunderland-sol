/**
 * Facts Generator Tests
 * @module __tests__/unit/lib/codex/facts.test
 *
 * Tests for random fact generation with templates and study encouragements.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateRandomFacts,
  getDailyFacts,
  getPersonalizedFacts,
  getFactCountByActivity,
  type RandomFact,
  type FactGeneratorOptions,
  type StudyStats,
} from '@/lib/codex/facts'
import type { HistoryEntry } from '@/lib/localStorage'

describe('Facts Generator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ============================================================================
  // Type Validation
  // ============================================================================

  describe('RandomFact type', () => {
    it('can create insight fact', () => {
      const fact: RandomFact = {
        text: 'Your most active topic this week is TypeScript.',
        category: 'insight',
        relevance: 0.9,
      }

      expect(fact.category).toBe('insight')
      expect(fact.relevance).toBe(0.9)
    })

    it('can create summary fact', () => {
      const fact: RandomFact = {
        text: 'From your recent writing: "Key insight here"',
        sourcePath: 'weaves/wiki/strands/test.md',
        category: 'summary',
      }

      expect(fact.category).toBe('summary')
      expect(fact.sourcePath).toBeDefined()
    })

    it('can create question fact', () => {
      const fact: RandomFact = {
        text: 'Have you explored how React relates to Vue?',
        category: 'question',
      }

      expect(fact.category).toBe('question')
    })

    it('can create connection fact', () => {
      const fact: RandomFact = {
        text: 'TypeScript and React share similar themes.',
        category: 'connection',
      }

      expect(fact.category).toBe('connection')
    })

    it('can create milestone fact', () => {
      const fact: RandomFact = {
        text: 'You have reached 100 total strands!',
        category: 'milestone',
        relevance: 1,
      }

      expect(fact.category).toBe('milestone')
    })

    it('can create encouragement fact', () => {
      const fact: RandomFact = {
        text: 'Try flashcards to lock in your memory!',
        category: 'encouragement',
        actionType: 'flashcards',
      }

      expect(fact.category).toBe('encouragement')
      expect(fact.actionType).toBe('flashcards')
    })

    it('supports all action types', () => {
      const actionTypes: RandomFact['actionType'][] = ['flashcards', 'quiz', 'glossary']

      actionTypes.forEach((actionType) => {
        const fact: RandomFact = {
          text: 'Test',
          category: 'encouragement',
          actionType,
        }
        expect(fact.actionType).toBe(actionType)
      })
    })
  })

  describe('StudyStats type', () => {
    it('can create valid study stats', () => {
      const stats: StudyStats = {
        flashcardSessions: 5,
        quizzesTaken: 3,
        glossaryTermsReviewed: 20,
        lastStudyDate: '2025-01-14',
      }

      expect(stats.flashcardSessions).toBe(5)
      expect(stats.lastStudyDate).toBe('2025-01-14')
    })

    it('all fields are optional', () => {
      const stats: StudyStats = {}
      expect(stats.flashcardSessions).toBeUndefined()
    })
  })

  describe('FactGeneratorOptions type', () => {
    it('can create options with all fields', () => {
      const options: FactGeneratorOptions = {
        maxFacts: 5,
        history: [],
        totalStrands: 50,
        categories: ['insight', 'milestone'],
        studyStats: { flashcardSessions: 3 },
        featureFlags: {
          enableFlashcards: true,
          enableQuizzes: false,
        },
      }

      expect(options.maxFacts).toBe(5)
      expect(options.categories).toContain('insight')
    })
  })

  // ============================================================================
  // generateRandomFacts
  // ============================================================================

  describe('generateRandomFacts', () => {
    it('returns array of facts', () => {
      const facts = generateRandomFacts()

      expect(Array.isArray(facts)).toBe(true)
      expect(facts.length).toBeGreaterThan(0)
    })

    it('respects maxFacts option', () => {
      const facts = generateRandomFacts({ maxFacts: 2 })

      expect(facts.length).toBeLessThanOrEqual(2)
    })

    it('returns default max of 3 facts', () => {
      const facts = generateRandomFacts()

      expect(facts.length).toBeLessThanOrEqual(3)
    })

    it('includes milestone for 100+ strands', () => {
      const facts = generateRandomFacts({ totalStrands: 100, maxFacts: 5 })

      const milestone = facts.find((f) => f.category === 'milestone')
      expect(milestone).toBeDefined()
      expect(milestone?.text).toContain('100')
    })

    it('includes milestone for 50+ strands', () => {
      const facts = generateRandomFacts({ totalStrands: 55, maxFacts: 5 })

      const milestone = facts.find((f) => f.category === 'milestone')
      expect(milestone).toBeDefined()
      expect(milestone?.text).toContain('55')
    })

    it('includes milestone for 10+ strands', () => {
      const facts = generateRandomFacts({ totalStrands: 15, maxFacts: 5 })

      const milestone = facts.find((f) => f.category === 'milestone')
      expect(milestone).toBeDefined()
    })

    it('includes activity-based fact with history', () => {
      const history: HistoryEntry[] = [
        { path: 'weaves/wiki/strands/typescript.md', viewedAt: '2025-01-15T10:00:00Z' },
      ]

      const facts = generateRandomFacts({ history, maxFacts: 5 })

      const insightFact = facts.find(
        (f) => f.category === 'insight' && f.text.includes('typescript')
      )
      expect(insightFact).toBeDefined()
    })

    it('includes engagement fact with 10+ history entries', () => {
      const history: HistoryEntry[] = Array.from({ length: 12 }, (_, i) => ({
        path: `weaves/wiki/strands/doc-${i}.md`,
        viewedAt: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
      }))

      const facts = generateRandomFacts({ history, maxFacts: 5 })

      const engagementFact = facts.find((f) => f.text.includes('12 different strands'))
      expect(engagementFact).toBeDefined()
    })

    it('fills remaining slots with fallback facts', () => {
      const facts = generateRandomFacts({ maxFacts: 3 })

      expect(facts.length).toBe(3)
      facts.forEach((fact) => {
        expect(fact.text).toBeDefined()
        expect(fact.category).toBeDefined()
      })
    })

    it('shows study encouragement when conditions met', () => {
      // Set history within the last 3 days (recent browsing) but no recent study
      const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000
      const history: HistoryEntry[] = Array.from({ length: 6 }, (_, i) => ({
        path: `weaves/wiki/strands/doc-${i}.md`,
        viewedAt: new Date(twoDaysAgo + i * 60 * 60 * 1000).toISOString(),
      }))

      const facts = generateRandomFacts({
        history,
        maxFacts: 5,
        // No study stats = never studied, so encouragement should show
        featureFlags: { enableFlashcards: true },
      })

      const encouragement = facts.find((f) => f.category === 'encouragement')
      expect(encouragement).toBeDefined()
    })

    it('does not show study encouragement when recently studied', () => {
      const history: HistoryEntry[] = Array.from({ length: 6 }, (_, i) => ({
        path: `weaves/wiki/strands/doc-${i}.md`,
        viewedAt: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
      }))

      const facts = generateRandomFacts({
        history,
        maxFacts: 5,
        studyStats: { lastStudyDate: '2025-01-14' }, // Yesterday
        featureFlags: { enableFlashcards: true },
      })

      const encouragement = facts.find((f) => f.category === 'encouragement')
      expect(encouragement).toBeUndefined()
    })
  })

  // ============================================================================
  // getFactCountByActivity
  // ============================================================================

  describe('getFactCountByActivity', () => {
    it('returns 1 for empty history', () => {
      const count = getFactCountByActivity([])
      expect(count).toBe(1)
    })

    it('returns 3 for 5+ recent day activity', () => {
      const history: HistoryEntry[] = Array.from({ length: 6 }, (_, i) => ({
        path: `doc-${i}.md`,
        viewedAt: new Date(Date.now() - i * 60 * 1000).toISOString(), // Minutes ago
      }))

      const count = getFactCountByActivity(history)
      expect(count).toBe(3)
    })

    it('returns 2 for 10+ recent week activity', () => {
      const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000
      const history: HistoryEntry[] = Array.from({ length: 12 }, (_, i) => ({
        path: `doc-${i}.md`,
        viewedAt: new Date(twoDaysAgo + i * 60 * 1000).toISOString(),
      }))

      const count = getFactCountByActivity(history)
      expect(count).toBe(2)
    })

    it('returns 1 for old activity', () => {
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000
      const history: HistoryEntry[] = Array.from({ length: 20 }, (_, i) => ({
        path: `doc-${i}.md`,
        viewedAt: new Date(twoWeeksAgo - i * 60 * 1000).toISOString(),
      }))

      const count = getFactCountByActivity(history)
      expect(count).toBe(1)
    })
  })

  // ============================================================================
  // getDailyFacts
  // ============================================================================

  describe('getDailyFacts', () => {
    it('returns array of strings', () => {
      const facts = getDailyFacts()

      expect(Array.isArray(facts)).toBe(true)
      facts.forEach((fact) => {
        expect(typeof fact).toBe('string')
      })
    })

    it('respects maxFacts option', () => {
      const facts = getDailyFacts({ maxFacts: 2 })

      expect(facts.length).toBeLessThanOrEqual(2)
    })

    it('adjusts count based on activity', () => {
      const history: HistoryEntry[] = Array.from({ length: 6 }, (_, i) => ({
        path: `doc-${i}.md`,
        viewedAt: new Date(Date.now() - i * 60 * 1000).toISOString(),
      }))

      const facts = getDailyFacts({ history })
      expect(facts.length).toBe(3) // High activity = 3 facts
    })
  })

  // ============================================================================
  // getPersonalizedFacts
  // ============================================================================

  describe('getPersonalizedFacts', () => {
    it('returns promise with facts', async () => {
      const facts = await getPersonalizedFacts()

      expect(Array.isArray(facts)).toBe(true)
      expect(facts.length).toBeGreaterThan(0)
    })

    it('accepts options', async () => {
      const facts = await getPersonalizedFacts({ maxFacts: 2 })

      expect(facts.length).toBeLessThanOrEqual(2)
    })

    it('returns RandomFact objects', async () => {
      const facts = await getPersonalizedFacts()

      facts.forEach((fact) => {
        expect(fact.text).toBeDefined()
        expect(fact.category).toBeDefined()
      })
    })
  })

  // ============================================================================
  // Fallback Facts
  // ============================================================================

  describe('fallback facts', () => {
    it('returns valid fallback facts when no user data', () => {
      const facts = generateRandomFacts({ maxFacts: 5 })

      expect(facts.length).toBeGreaterThan(0)
      facts.forEach((fact) => {
        expect(fact.text.length).toBeGreaterThan(10)
      })
    })

    it('fallback facts have valid categories', () => {
      const facts = generateRandomFacts({ maxFacts: 5 })
      const validCategories = ['insight', 'summary', 'question', 'connection', 'milestone', 'encouragement']

      facts.forEach((fact) => {
        expect(validCategories).toContain(fact.category)
      })
    })
  })

  // ============================================================================
  // Study Encouragement Logic
  // ============================================================================

  describe('study encouragement', () => {
    it('shows flashcard encouragement when enabled', () => {
      const history: HistoryEntry[] = Array.from({ length: 6 }, (_, i) => ({
        path: `doc-${i}.md`,
        viewedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + i * 1000).toISOString(),
      }))

      const facts = generateRandomFacts({
        history,
        featureFlags: { enableFlashcards: true, enableQuizzes: false },
        maxFacts: 5,
      })

      const encouragement = facts.find((f) => f.category === 'encouragement')
      if (encouragement) {
        expect(encouragement.actionType).toBe('flashcards')
      }
    })

    it('shows quiz encouragement when enabled', () => {
      const history: HistoryEntry[] = Array.from({ length: 6 }, (_, i) => ({
        path: `doc-${i}.md`,
        viewedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + i * 1000).toISOString(),
      }))

      const facts = generateRandomFacts({
        history,
        featureFlags: { enableFlashcards: false, enableQuizzes: true },
        maxFacts: 5,
      })

      const encouragement = facts.find((f) => f.category === 'encouragement')
      if (encouragement) {
        expect(encouragement.actionType).toBe('quiz')
      }
    })

    it('does not show encouragement when features disabled', () => {
      const history: HistoryEntry[] = Array.from({ length: 6 }, (_, i) => ({
        path: `doc-${i}.md`,
        viewedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + i * 1000).toISOString(),
      }))

      const facts = generateRandomFacts({
        history,
        featureFlags: { enableFlashcards: false, enableQuizzes: false },
        maxFacts: 5,
      })

      const encouragement = facts.find((f) => f.category === 'encouragement')
      expect(encouragement).toBeUndefined()
    })
  })
})
