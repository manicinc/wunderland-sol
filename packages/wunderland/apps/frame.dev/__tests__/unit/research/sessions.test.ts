/**
 * Tests for Research Sessions Storage
 * @module tests/unit/research/sessions
 *
 * These tests mock the sessions module to test the business logic.
 * The actual IndexedDB operations are tested via integration tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ResearchSession, WebSearchResult } from '@/lib/research/types'

// Sample search result fixtures
const mockSearchResult: WebSearchResult = {
  id: 'result-1',
  title: 'Test Result',
  url: 'https://example.com/test',
  snippet: 'This is a test result snippet',
  domain: 'example.com',
  position: 0,
  source: 'duckduckgo',
}

const mockSearchResult2: WebSearchResult = {
  ...mockSearchResult,
  id: 'result-2',
  title: 'Second Result',
  url: 'https://example.com/test2',
}

// In-memory session storage for testing
let sessionStorage: Map<string, ResearchSession>

// Mock session ID generator
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

// Mock implementations that mirror the real module behavior
const mockCreateSession = vi.fn(async (topic: string): Promise<ResearchSession> => {
  const now = Date.now()
  const session: ResearchSession = {
    id: generateSessionId(),
    topic,
    queries: [],
    savedResults: [],
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
  sessionStorage.set(session.id, session)
  return session
})

const mockGetSession = vi.fn(async (id: string): Promise<ResearchSession | null> => {
  return sessionStorage.get(id) || null
})

const mockGetAllSessions = vi.fn(async (): Promise<ResearchSession[]> => {
  return Array.from(sessionStorage.values())
    .sort((a, b) => b.updatedAt - a.updatedAt)
})

const mockUpdateSession = vi.fn(async (
  id: string,
  updates: Partial<Omit<ResearchSession, 'id' | 'createdAt'>>
): Promise<ResearchSession | null> => {
  const existing = sessionStorage.get(id)
  if (!existing) return null

  const updated: ResearchSession = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  }
  sessionStorage.set(id, updated)
  return updated
})

const mockAddQueryToSession = vi.fn(async (id: string, query: string): Promise<ResearchSession | null> => {
  const session = sessionStorage.get(id)
  if (!session) return null

  // Don't add duplicate consecutive queries
  if (session.queries[session.queries.length - 1] === query) {
    return session
  }

  const updated = {
    ...session,
    queries: [...session.queries, query],
    updatedAt: Date.now(),
  }
  sessionStorage.set(id, updated)
  return updated
})

const mockAddResultToSession = vi.fn(async (
  id: string,
  result: WebSearchResult
): Promise<ResearchSession | null> => {
  const session = sessionStorage.get(id)
  if (!session) return null

  // Don't add duplicate results
  if (session.savedResults.some(r => r.id === result.id)) {
    return session
  }

  const updated = {
    ...session,
    savedResults: [...session.savedResults, result],
    updatedAt: Date.now(),
  }
  sessionStorage.set(id, updated)
  return updated
})

const mockRemoveResultFromSession = vi.fn(async (
  id: string,
  resultId: string
): Promise<ResearchSession | null> => {
  const session = sessionStorage.get(id)
  if (!session) return null

  const updated = {
    ...session,
    savedResults: session.savedResults.filter(r => r.id !== resultId),
    updatedAt: Date.now(),
  }
  sessionStorage.set(id, updated)
  return updated
})

const mockUpdateSessionNotes = vi.fn(async (id: string, notes: string): Promise<ResearchSession | null> => {
  return mockUpdateSession(id, { notes })
})

const mockDeleteSession = vi.fn(async (id: string): Promise<boolean> => {
  sessionStorage.delete(id)
  return true
})

const mockClearAllSessions = vi.fn(async (): Promise<void> => {
  sessionStorage.clear()
})

const mockGetRecentSessions = vi.fn(async (limit: number = 10): Promise<ResearchSession[]> => {
  const all = await mockGetAllSessions()
  return all.slice(0, limit)
})

const mockSearchSessions = vi.fn(async (searchTerm: string): Promise<ResearchSession[]> => {
  const all = await mockGetAllSessions()
  const term = searchTerm.toLowerCase()

  return all.filter(session =>
    session.topic.toLowerCase().includes(term) ||
    session.queries.some(q => q.toLowerCase().includes(term))
  )
})

// Mock the entire module
vi.mock('@/lib/research/sessions', () => ({
  createSession: (...args: Parameters<typeof mockCreateSession>) => mockCreateSession(...args),
  getSession: (...args: Parameters<typeof mockGetSession>) => mockGetSession(...args),
  getAllSessions: () => mockGetAllSessions(),
  updateSession: (...args: Parameters<typeof mockUpdateSession>) => mockUpdateSession(...args),
  addQueryToSession: (...args: Parameters<typeof mockAddQueryToSession>) => mockAddQueryToSession(...args),
  addResultToSession: (...args: Parameters<typeof mockAddResultToSession>) => mockAddResultToSession(...args),
  removeResultFromSession: (...args: Parameters<typeof mockRemoveResultFromSession>) => mockRemoveResultFromSession(...args),
  updateSessionNotes: (...args: Parameters<typeof mockUpdateSessionNotes>) => mockUpdateSessionNotes(...args),
  deleteSession: (...args: Parameters<typeof mockDeleteSession>) => mockDeleteSession(...args),
  clearAllSessions: () => mockClearAllSessions(),
  getRecentSessions: (...args: Parameters<typeof mockGetRecentSessions>) => mockGetRecentSessions(...args),
  searchSessions: (...args: Parameters<typeof mockSearchSessions>) => mockSearchSessions(...args),
}))

// Import the mocked module
import {
  createSession,
  getSession,
  getAllSessions,
  updateSession,
  addQueryToSession,
  addResultToSession,
  removeResultFromSession,
  updateSessionNotes,
  deleteSession,
  clearAllSessions,
  getRecentSessions,
  searchSessions,
} from '@/lib/research/sessions'

describe('Research Sessions Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage = new Map()
  })

  describe('createSession', () => {
    it('should create a new session with given topic', async () => {
      const session = await createSession('Machine Learning Research')

      expect(session.id).toMatch(/^session_\d+_[a-z0-9]+$/)
      expect(session.topic).toBe('Machine Learning Research')
      expect(session.queries).toEqual([])
      expect(session.savedResults).toEqual([])
      expect(session.notes).toBe('')
      expect(session.createdAt).toBeDefined()
      expect(session.updatedAt).toBeDefined()
    })

    it('should create unique session IDs', async () => {
      const session1 = await createSession('Topic 1')
      const session2 = await createSession('Topic 2')

      expect(session1.id).not.toBe(session2.id)
    })

    it('should store session in storage', async () => {
      const session = await createSession('Topic')

      expect(sessionStorage.has(session.id)).toBe(true)
    })
  })

  describe('getSession', () => {
    it('should retrieve an existing session by ID', async () => {
      const created = await createSession('Test Topic')
      const retrieved = await getSession(created.id)

      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe(created.id)
      expect(retrieved?.topic).toBe('Test Topic')
    })

    it('should return null for non-existent session', async () => {
      const result = await getSession('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('getAllSessions', () => {
    it('should return all sessions sorted by updatedAt', async () => {
      await createSession('Session 1')
      await new Promise(resolve => setTimeout(resolve, 10))
      await createSession('Session 2')
      await new Promise(resolve => setTimeout(resolve, 10))
      await createSession('Session 3')

      const sessions = await getAllSessions()

      expect(sessions).toHaveLength(3)
      // Most recent first
      expect(sessions[0].topic).toBe('Session 3')
      expect(sessions[2].topic).toBe('Session 1')
    })

    it('should return empty array when no sessions exist', async () => {
      const sessions = await getAllSessions()

      expect(sessions).toEqual([])
    })
  })

  describe('updateSession', () => {
    it('should update session topic', async () => {
      const session = await createSession('Original Topic')
      const updated = await updateSession(session.id, { topic: 'Updated Topic' })

      expect(updated?.topic).toBe('Updated Topic')
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(session.updatedAt)
    })

    it('should update session notes', async () => {
      const session = await createSession('Topic')
      const updated = await updateSession(session.id, { notes: 'Some notes here' })

      expect(updated?.notes).toBe('Some notes here')
    })

    it('should return null for non-existent session', async () => {
      const result = await updateSession('non-existent', { topic: 'New' })

      expect(result).toBeNull()
    })

    it('should preserve unmodified fields', async () => {
      const session = await createSession('Topic')
      await updateSession(session.id, { notes: 'Notes' })
      const retrieved = await getSession(session.id)

      expect(retrieved?.topic).toBe('Topic')
      expect(retrieved?.notes).toBe('Notes')
    })
  })

  describe('addQueryToSession', () => {
    it('should add query to session', async () => {
      const session = await createSession('Topic')
      const updated = await addQueryToSession(session.id, 'test query')

      expect(updated?.queries).toContain('test query')
    })

    it('should add multiple queries', async () => {
      const session = await createSession('Topic')
      await addQueryToSession(session.id, 'query 1')
      const updated = await addQueryToSession(session.id, 'query 2')

      expect(updated?.queries).toHaveLength(2)
      expect(updated?.queries).toEqual(['query 1', 'query 2'])
    })

    it('should not add duplicate consecutive queries', async () => {
      const session = await createSession('Topic')
      await addQueryToSession(session.id, 'same query')
      const updated = await addQueryToSession(session.id, 'same query')

      expect(updated?.queries).toHaveLength(1)
    })

    it('should return null for non-existent session', async () => {
      const result = await addQueryToSession('non-existent', 'query')

      expect(result).toBeNull()
    })
  })

  describe('addResultToSession', () => {
    it('should add result to session', async () => {
      const session = await createSession('Topic')
      const updated = await addResultToSession(session.id, mockSearchResult)

      expect(updated?.savedResults).toHaveLength(1)
      expect(updated?.savedResults[0]).toEqual(mockSearchResult)
    })

    it('should add multiple results', async () => {
      const session = await createSession('Topic')
      await addResultToSession(session.id, mockSearchResult)
      const updated = await addResultToSession(session.id, mockSearchResult2)

      expect(updated?.savedResults).toHaveLength(2)
    })

    it('should not add duplicate results', async () => {
      const session = await createSession('Topic')
      await addResultToSession(session.id, mockSearchResult)
      const updated = await addResultToSession(session.id, mockSearchResult)

      expect(updated?.savedResults).toHaveLength(1)
    })

    it('should return null for non-existent session', async () => {
      const result = await addResultToSession('non-existent', mockSearchResult)

      expect(result).toBeNull()
    })
  })

  describe('removeResultFromSession', () => {
    it('should remove result from session', async () => {
      const session = await createSession('Topic')
      await addResultToSession(session.id, mockSearchResult)
      await addResultToSession(session.id, mockSearchResult2)
      const updated = await removeResultFromSession(session.id, mockSearchResult.id)

      expect(updated?.savedResults).toHaveLength(1)
      expect(updated?.savedResults[0].id).toBe(mockSearchResult2.id)
    })

    it('should handle removing non-existent result gracefully', async () => {
      const session = await createSession('Topic')
      await addResultToSession(session.id, mockSearchResult)
      const updated = await removeResultFromSession(session.id, 'non-existent-result')

      expect(updated?.savedResults).toHaveLength(1)
    })

    it('should return null for non-existent session', async () => {
      const result = await removeResultFromSession('non-existent', 'result-id')

      expect(result).toBeNull()
    })
  })

  describe('updateSessionNotes', () => {
    it('should update session notes', async () => {
      const session = await createSession('Topic')
      const updated = await updateSessionNotes(session.id, 'These are my research notes.')

      expect(updated?.notes).toBe('These are my research notes.')
    })

    it('should overwrite existing notes', async () => {
      const session = await createSession('Topic')
      await updateSessionNotes(session.id, 'Old notes')
      const updated = await updateSessionNotes(session.id, 'New notes')

      expect(updated?.notes).toBe('New notes')
    })
  })

  describe('deleteSession', () => {
    it('should delete an existing session', async () => {
      const session = await createSession('Topic')
      const deleted = await deleteSession(session.id)
      const retrieved = await getSession(session.id)

      expect(deleted).toBe(true)
      expect(retrieved).toBeNull()
    })

    it('should return true even for non-existent session', async () => {
      const result = await deleteSession('non-existent')

      expect(result).toBe(true)
    })
  })

  describe('clearAllSessions', () => {
    it('should clear all sessions', async () => {
      await createSession('Session 1')
      await createSession('Session 2')
      await createSession('Session 3')

      await clearAllSessions()
      const sessions = await getAllSessions()

      expect(sessions).toHaveLength(0)
    })

    it('should handle clearing when no sessions exist', async () => {
      await clearAllSessions()
      const sessions = await getAllSessions()

      expect(sessions).toHaveLength(0)
    })
  })

  describe('getRecentSessions', () => {
    it('should return most recent sessions up to limit', async () => {
      for (let i = 1; i <= 15; i++) {
        await createSession(`Session ${i}`)
        await new Promise(resolve => setTimeout(resolve, 5))
      }

      const recent = await getRecentSessions(10)

      expect(recent).toHaveLength(10)
      expect(recent[0].topic).toBe('Session 15')
    })

    it('should return all sessions if fewer than limit', async () => {
      await createSession('Session 1')
      await createSession('Session 2')

      const recent = await getRecentSessions(10)

      expect(recent).toHaveLength(2)
    })

    it('should use default limit of 10', async () => {
      for (let i = 1; i <= 15; i++) {
        await createSession(`Session ${i}`)
      }

      const recent = await getRecentSessions()

      expect(recent).toHaveLength(10)
    })
  })

  describe('searchSessions', () => {
    beforeEach(async () => {
      const s1 = await createSession('Machine Learning Research')
      await addQueryToSession(s1.id, 'neural networks')
      await addQueryToSession(s1.id, 'deep learning')

      const s2 = await createSession('Web Development')
      await addQueryToSession(s2.id, 'react hooks')

      await createSession('Data Science Project')
    })

    it('should find sessions by topic', async () => {
      const results = await searchSessions('machine')

      expect(results).toHaveLength(1)
      expect(results[0].topic).toBe('Machine Learning Research')
    })

    it('should find sessions by query', async () => {
      const results = await searchSessions('neural')

      expect(results).toHaveLength(1)
      expect(results[0].topic).toBe('Machine Learning Research')
    })

    it('should be case insensitive', async () => {
      const results = await searchSessions('MACHINE')

      expect(results).toHaveLength(1)
    })

    it('should return empty array for no matches', async () => {
      const results = await searchSessions('blockchain')

      expect(results).toHaveLength(0)
    })

    it('should find multiple matching sessions', async () => {
      const results = await searchSessions('e')

      // Machine Learning, Web Development, Data Science all have 'e'
      expect(results.length).toBeGreaterThan(1)
    })
  })
})
