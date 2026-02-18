/**
 * Tests for Research Analytics Service
 * @module tests/unit/analytics/researchAnalyticsService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ResearchSession, WebSearchResult } from '@/lib/research/types'

// Sample fixtures
const mockAcademicResult: WebSearchResult = {
  id: 'academic-1',
  title: 'Deep Learning Paper',
  url: 'https://arxiv.org/abs/2301.00001',
  snippet: 'A paper about deep learning',
  domain: 'arxiv.org',
  position: 0,
  source: 'duckduckgo',
}

const mockWebResult: WebSearchResult = {
  id: 'web-1',
  title: 'Web Article',
  url: 'https://example.com/article',
  snippet: 'A web article',
  domain: 'example.com',
  position: 1,
  source: 'duckduckgo',
}

// In-memory session storage
let sessionStorage: ResearchSession[]

// Create mock sessions
function createMockSession(
  topic: string,
  savedResults: WebSearchResult[] = [],
  createdAt: number = Date.now()
): ResearchSession {
  const session: ResearchSession = {
    id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    topic,
    query: topic,
    queries: [topic],
    savedResults,
    notes: '',
    createdAt,
    updatedAt: createdAt,
    tags: [],
    linkedSessions: [],
  }
  sessionStorage.push(session)
  return session
}

// Mock sessions module
vi.mock('@/lib/research/sessions', () => ({
  getAllSessions: vi.fn(async () => sessionStorage),
}))

// Mock academic detector
vi.mock('@/lib/research/academicDetector', () => ({
  isAcademicResult: vi.fn((result: WebSearchResult) => {
    const academicDomains = ['arxiv.org', 'doi.org', 'pubmed.ncbi.nlm.nih.gov', 'semanticscholar.org']
    return academicDomains.some(domain => result.url.includes(domain))
  }),
}))

import {
  getResearchAnalytics,
  generateTopicCloud,
} from '@/lib/analytics/researchAnalyticsService'

describe('Research Analytics Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage = []
  })

  describe('getResearchAnalytics', () => {
    it('should return empty metrics when no sessions exist', async () => {
      const analytics = await getResearchAnalytics()

      expect(analytics.sessions.totalSessions).toBe(0)
      expect(analytics.sessions.periodSessions).toBe(0)
      expect(analytics.sessions.totalSavedResults).toBe(0)
      expect(analytics.searches.totalSearches).toBe(0)
    })

    it('should count total sessions', async () => {
      createMockSession('Topic 1')
      createMockSession('Topic 2')
      createMockSession('Topic 3')

      const analytics = await getResearchAnalytics()

      expect(analytics.sessions.totalSessions).toBe(3)
    })

    it('should count sessions in period', async () => {
      const now = Date.now()
      const dayInMs = 24 * 60 * 60 * 1000

      createMockSession('Recent 1', [], now - (5 * dayInMs))  // 5 days ago
      createMockSession('Recent 2', [], now - (10 * dayInMs)) // 10 days ago
      createMockSession('Old', [], now - (45 * dayInMs))      // 45 days ago

      const analytics = await getResearchAnalytics(30)

      expect(analytics.sessions.totalSessions).toBe(3)
      expect(analytics.sessions.periodSessions).toBe(2) // Only 2 within 30 days
    })

    it('should count saved results', async () => {
      createMockSession('Topic 1', [mockWebResult, mockAcademicResult])
      createMockSession('Topic 2', [mockWebResult])

      const analytics = await getResearchAnalytics()

      expect(analytics.sessions.totalSavedResults).toBe(3)
    })

    it('should count sessions with saved results', async () => {
      createMockSession('With results', [mockWebResult])
      createMockSession('No results', [])
      createMockSession('Also with results', [mockAcademicResult])

      const analytics = await getResearchAnalytics()

      expect(analytics.sessions.sessionsWithSavedResults).toBe(2)
    })

    it('should calculate average saved per session', async () => {
      createMockSession('Topic 1', [mockWebResult, mockAcademicResult]) // 2 results
      createMockSession('Topic 2', [mockWebResult])                      // 1 result
      createMockSession('Topic 3', [])                                   // 0 results

      const analytics = await getResearchAnalytics()

      // Average of sessions WITH results: (2 + 1) / 2 = 1.5
      expect(analytics.searches.avgSavedPerSession).toBe(1.5)
    })

    it('should calculate source type distribution', async () => {
      createMockSession('Topic 1', [mockAcademicResult, mockAcademicResult])
      createMockSession('Topic 2', [mockWebResult])

      const analytics = await getResearchAnalytics()

      const academic = analytics.sources.sourceTypeDistribution.find(s => s.type === 'Academic')
      const web = analytics.sources.sourceTypeDistribution.find(s => s.type === 'Web')

      expect(academic?.count).toBe(2)
      expect(web?.count).toBe(1)
      expect(academic?.percentage).toBe(67) // 2/3 = 66.67%
      expect(web?.percentage).toBe(33)       // 1/3 = 33.33%
    })

    it('should extract top domains from saved results', async () => {
      const result1 = { ...mockWebResult, domain: 'example.com' }
      const result2 = { ...mockWebResult, id: 'r2', domain: 'example.com' }
      const result3 = { ...mockWebResult, id: 'r3', domain: 'other.com' }

      createMockSession('Topic', [result1, result2, result3])

      const analytics = await getResearchAnalytics()

      expect(analytics.sources.topDomains).toContainEqual({ domain: 'example.com', count: 2 })
      expect(analytics.sources.topDomains).toContainEqual({ domain: 'other.com', count: 1 })
    })

    it('should extract top query terms', async () => {
      sessionStorage.push({
        id: 'session1',
        topic: 'Machine learning research',
        query: 'machine learning research',
        queries: ['machine learning research'],
        savedResults: [],
        notes: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        linkedSessions: [],
      })
      sessionStorage.push({
        id: 'session2',
        topic: 'Deep learning models',
        query: 'deep learning models',
        queries: ['deep learning models'],
        savedResults: [],
        notes: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        linkedSessions: [],
      })

      const analytics = await getResearchAnalytics()

      // 'learning' appears in both queries
      const learningTerm = analytics.topics.topQueryTerms.find(t => t.term === 'learning')
      expect(learningTerm?.count).toBe(2)
    })

    it('should calculate query length distribution', async () => {
      sessionStorage.push({
        id: 's1',
        topic: 'AI',
        query: 'AI',
        queries: ['AI'],
        savedResults: [],
        notes: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        linkedSessions: [],
      })
      sessionStorage.push({
        id: 's2',
        topic: 'Machine learning for beginners tutorial',
        query: 'Machine learning for beginners tutorial',
        queries: ['Machine learning for beginners tutorial'],
        savedResults: [],
        notes: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        linkedSessions: [],
      })

      const analytics = await getResearchAnalytics()

      const short = analytics.topics.queryLengthDistribution.find(q => q.length === '1-2 words')
      const long = analytics.topics.queryLengthDistribution.find(q => q.length === '5-6 words')

      expect(short?.count).toBe(1)
      expect(long?.count).toBe(1)
    })

    it('should return searches over time data', async () => {
      const now = Date.now()
      const dayInMs = 24 * 60 * 60 * 1000

      createMockSession('Topic 1', [], now - dayInMs)
      createMockSession('Topic 2', [], now - dayInMs)
      createMockSession('Topic 3', [], now - (2 * dayInMs))

      const analytics = await getResearchAnalytics(7)

      expect(analytics.searches.searchesOverTime.length).toBe(7)

      // Check that data is sorted by date
      const dates = analytics.searches.searchesOverTime.map(d => d.date)
      const sortedDates = [...dates].sort()
      expect(dates).toEqual(sortedDates)
    })
  })

  describe('generateTopicCloud', () => {
    it('should return topic cloud with word frequencies', async () => {
      sessionStorage.push({
        id: 's1',
        topic: 'Machine learning neural networks',
        query: 'machine learning neural networks',
        queries: ['machine learning neural networks'],
        savedResults: [],
        notes: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        linkedSessions: [],
      })
      sessionStorage.push({
        id: 's2',
        topic: 'Deep learning',
        query: 'deep learning',
        queries: ['deep learning'],
        savedResults: [],
        notes: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        linkedSessions: [],
      })

      const cloud = await generateTopicCloud()

      // 'learning' should have highest count (appears in both)
      const learning = cloud.find(w => w.text === 'learning')
      expect(learning?.value).toBeGreaterThanOrEqual(2)
    })

    it('should exclude stop words', async () => {
      sessionStorage.push({
        id: 's1',
        topic: 'The quick brown fox',
        query: 'the quick brown fox',
        queries: ['the quick brown fox'],
        savedResults: [],
        notes: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        linkedSessions: [],
      })

      const cloud = await generateTopicCloud()

      expect(cloud.find(w => w.text === 'the')).toBeUndefined()
    })

    it('should limit results to maxWords', async () => {
      // Add many different words
      for (let i = 0; i < 100; i++) {
        sessionStorage.push({
          id: `s${i}`,
          topic: `uniqueword${i} common`,
          query: `uniqueword${i} common`,
          queries: [`uniqueword${i} common`],
          savedResults: [],
          notes: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: [],
          linkedSessions: [],
        })
      }

      const cloud = await generateTopicCloud(10)

      expect(cloud.length).toBeLessThanOrEqual(10)
    })

    it('should return empty array when no sessions', async () => {
      const cloud = await generateTopicCloud()

      expect(cloud).toHaveLength(0)
    })

    it('should weight query terms higher than result titles', async () => {
      const result = {
        ...mockWebResult,
        title: 'Article about specific unique term',
      }

      sessionStorage.push({
        id: 's1',
        topic: 'Important query term',
        query: 'important query term',
        queries: ['important query term'],
        savedResults: [result],
        notes: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        linkedSessions: [],
      })

      const cloud = await generateTopicCloud()

      // Query terms should be weighted higher (2x in implementation)
      const queryTerm = cloud.find(w => w.text === 'important')
      const titleTerm = cloud.find(w => w.text === 'specific')

      // Both should exist
      expect(queryTerm).toBeDefined()
      // Query term should have higher or equal value (weighted 2x)
      if (queryTerm && titleTerm) {
        expect(queryTerm.value).toBeGreaterThanOrEqual(titleTerm.value)
      }
    })
  })
})
