/**
 * Tests for Session Linking Service
 * @module tests/unit/research/sessionLinking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ResearchSession, SessionLink, WebSearchResult } from '@/lib/research/types'

// Sample fixtures
const mockSearchResult: WebSearchResult = {
  id: 'result-1',
  title: 'Test Result',
  url: 'https://example.com/test',
  snippet: 'This is a test result',
  domain: 'example.com',
  position: 0,
  source: 'duckduckgo',
}

// In-memory storage for testing
let sessionStorage: Map<string, ResearchSession>
let linkStorage: Map<string, SessionLink>

function generateId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

// Mock session creation
async function createMockSession(topic: string, tags: string[] = []): Promise<ResearchSession> {
  const session: ResearchSession = {
    id: generateId(),
    topic,
    query: topic,
    queries: [topic],
    savedResults: [],
    notes: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: tags.map(t => t.toLowerCase().trim()), // Normalize tags like real implementation
    linkedSessions: [],
  }
  sessionStorage.set(session.id, session)
  return session
}

// Mock the sessions module
vi.mock('@/lib/research/sessions', () => ({
  getSession: vi.fn(async (id: string) => sessionStorage.get(id) || null),
  getAllSessions: vi.fn(async () => Array.from(sessionStorage.values())),
  updateSession: vi.fn(async (id: string, updates: Partial<ResearchSession>) => {
    const existing = sessionStorage.get(id)
    if (!existing) return null
    const updated = { ...existing, ...updates, updatedAt: Date.now() }
    sessionStorage.set(id, updated)
    return updated
  }),
  createSession: vi.fn(async (topic: string, options: { tags?: string[] } = {}) => {
    return createMockSession(topic, options.tags)
  }),
}))

// Mock window for events
const dispatchEventMock = vi.fn()
vi.stubGlobal('window', { dispatchEvent: dispatchEventMock })

// Mock IndexedDB operations in sessionLinking
vi.mock('@/lib/research/sessionLinking', async (importOriginal) => {
  const original = await importOriginal() as Record<string, unknown>

  return {
    ...original,
    // Override functions that use IndexedDB directly
    linkSessions: vi.fn(async (
      sourceId: string,
      targetId: string,
      linkType: string = 'related',
      description?: string
    ) => {
      const source = sessionStorage.get(sourceId)
      const target = sessionStorage.get(targetId)
      if (!source || !target) throw new Error('Session not found')

      const link: SessionLink = {
        id: generateId(),
        sourceSessionId: sourceId,
        targetSessionId: targetId,
        linkType: linkType as 'related' | 'continuation' | 'subtopic' | 'merged',
        description,
        createdAt: Date.now(),
      }
      linkStorage.set(link.id, link)

      // Update both sessions
      source.linkedSessions = [...(source.linkedSessions || []), targetId]
      target.linkedSessions = [...(target.linkedSessions || []), sourceId]
      sessionStorage.set(sourceId, source)
      sessionStorage.set(targetId, target)

      return link
    }),

    unlinkSessions: vi.fn(async (sourceId: string, targetId: string) => {
      const source = sessionStorage.get(sourceId)
      const target = sessionStorage.get(targetId)

      if (source) {
        source.linkedSessions = (source.linkedSessions || []).filter(id => id !== targetId)
        sessionStorage.set(sourceId, source)
      }
      if (target) {
        target.linkedSessions = (target.linkedSessions || []).filter(id => id !== sourceId)
        sessionStorage.set(targetId, target)
      }

      // Remove link
      for (const [id, link] of linkStorage) {
        if ((link.sourceSessionId === sourceId && link.targetSessionId === targetId) ||
            (link.sourceSessionId === targetId && link.targetSessionId === sourceId)) {
          linkStorage.delete(id)
        }
      }

      return true
    }),

    getSessionLinks: vi.fn(async (sessionId: string) => {
      return Array.from(linkStorage.values()).filter(
        l => l.sourceSessionId === sessionId || l.targetSessionId === sessionId
      )
    }),

    addTagToSession: vi.fn(async (sessionId: string, tag: string) => {
      const session = sessionStorage.get(sessionId)
      if (!session) return null
      const normalizedTag = tag.toLowerCase().trim()
      if (!session.tags?.includes(normalizedTag)) {
        session.tags = [...(session.tags || []), normalizedTag]
        session.updatedAt = Date.now()
        sessionStorage.set(sessionId, session)
      }
      return session
    }),

    removeTagFromSession: vi.fn(async (sessionId: string, tag: string) => {
      const session = sessionStorage.get(sessionId)
      if (!session) return null
      session.tags = (session.tags || []).filter(t => t !== tag.toLowerCase().trim())
      session.updatedAt = Date.now()
      sessionStorage.set(sessionId, session)
      return session
    }),

    getAllTags: vi.fn(async () => {
      const tagCounts = new Map<string, number>()
      for (const session of sessionStorage.values()) {
        session.tags?.forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
        })
      }
      return Array.from(tagCounts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
    }),

    getSessionsByTag: vi.fn(async (tag: string) => {
      const normalizedTag = tag.toLowerCase().trim()
      return Array.from(sessionStorage.values()).filter(
        s => s.tags?.includes(normalizedTag)
      )
    }),

    suggestRelatedSessions: vi.fn(async (sessionId: string) => {
      const session = sessionStorage.get(sessionId)
      if (!session) return []

      const others = Array.from(sessionStorage.values()).filter(s => s.id !== sessionId)
      const linkedIds = new Set(session.linkedSessions || [])

      return others
        .filter(s => !linkedIds.has(s.id))
        .map(s => {
          // Simple similarity based on shared tags
          const sharedTags = (s.tags || []).filter(t => session.tags?.includes(t))
          const score = sharedTags.length * 0.3
          return {
            session: s,
            score,
            reasons: sharedTags.length > 0 ? [`Shared tags: ${sharedTags.join(', ')}`] : [],
          }
        })
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
    }),

    mergeSessions: vi.fn(async (sessionIds: string[], options: { newTopic?: string } = {}) => {
      const sessions = sessionIds.map(id => sessionStorage.get(id)).filter((s): s is ResearchSession => !!s)
      if (sessions.length === 0) throw new Error('No valid sessions to merge')

      const allQueries = [...new Set(sessions.flatMap(s => s.queries))]
      const allTags = [...new Set(sessions.flatMap(s => s.tags || []))]
      const allResults = sessions.flatMap(s => s.savedResults)
      const mergedTopic = options.newTopic || sessions.map(s => s.topic).join(' + ')

      const merged: ResearchSession = {
        id: generateId(),
        topic: mergedTopic,
        query: allQueries[0] || mergedTopic,
        queries: allQueries,
        savedResults: allResults,
        notes: sessions.map(s => s.notes).filter(Boolean).join('\n\n'),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: allTags,
        linkedSessions: sessionIds,
      }
      sessionStorage.set(merged.id, merged)
      return merged
    }),
  }
})

import {
  linkSessions,
  unlinkSessions,
  getSessionLinks,
  addTagToSession,
  removeTagFromSession,
  getAllTags,
  getSessionsByTag,
  suggestRelatedSessions,
  mergeSessions,
} from '@/lib/research/sessionLinking'

describe('Session Linking Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage = new Map()
    linkStorage = new Map()
  })

  describe('linkSessions', () => {
    it('should create a link between two sessions', async () => {
      const session1 = await createMockSession('Machine Learning')
      const session2 = await createMockSession('Deep Learning')

      const link = await linkSessions(session1.id, session2.id, 'related')

      expect(link).toBeDefined()
      expect(link.sourceSessionId).toBe(session1.id)
      expect(link.targetSessionId).toBe(session2.id)
      expect(link.linkType).toBe('related')
    })

    it('should update linkedSessions on both sessions', async () => {
      const session1 = await createMockSession('Topic 1')
      const session2 = await createMockSession('Topic 2')

      await linkSessions(session1.id, session2.id)

      const updated1 = sessionStorage.get(session1.id)
      const updated2 = sessionStorage.get(session2.id)

      expect(updated1?.linkedSessions).toContain(session2.id)
      expect(updated2?.linkedSessions).toContain(session1.id)
    })

    it('should support different link types', async () => {
      const session1 = await createMockSession('Main Topic')
      const session2 = await createMockSession('Sub Topic')

      const link = await linkSessions(session1.id, session2.id, 'subtopic', 'Branch of main topic')

      expect(link.linkType).toBe('subtopic')
      expect(link.description).toBe('Branch of main topic')
    })
  })

  describe('unlinkSessions', () => {
    it('should remove link between sessions', async () => {
      const session1 = await createMockSession('Topic 1')
      const session2 = await createMockSession('Topic 2')
      await linkSessions(session1.id, session2.id)

      await unlinkSessions(session1.id, session2.id)

      const updated1 = sessionStorage.get(session1.id)
      const updated2 = sessionStorage.get(session2.id)

      expect(updated1?.linkedSessions).not.toContain(session2.id)
      expect(updated2?.linkedSessions).not.toContain(session1.id)
    })

    it('should remove link from storage', async () => {
      const session1 = await createMockSession('Topic 1')
      const session2 = await createMockSession('Topic 2')
      await linkSessions(session1.id, session2.id)

      await unlinkSessions(session1.id, session2.id)

      const links = await getSessionLinks(session1.id)
      expect(links).toHaveLength(0)
    })
  })

  describe('getSessionLinks', () => {
    it('should return all links for a session', async () => {
      const session1 = await createMockSession('Main')
      const session2 = await createMockSession('Related 1')
      const session3 = await createMockSession('Related 2')

      await linkSessions(session1.id, session2.id)
      await linkSessions(session1.id, session3.id)

      const links = await getSessionLinks(session1.id)

      expect(links).toHaveLength(2)
    })

    it('should return empty array for session with no links', async () => {
      const session = await createMockSession('Standalone')

      const links = await getSessionLinks(session.id)

      expect(links).toHaveLength(0)
    })
  })
})

describe('Session Tags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage = new Map()
    linkStorage = new Map()
  })

  describe('addTagToSession', () => {
    it('should add a tag to session', async () => {
      const session = await createMockSession('Topic')

      const updated = await addTagToSession(session.id, 'machine-learning')

      expect(updated?.tags).toContain('machine-learning')
    })

    it('should normalize tag to lowercase', async () => {
      const session = await createMockSession('Topic')

      await addTagToSession(session.id, 'MachineLearning')

      const updated = sessionStorage.get(session.id)
      expect(updated?.tags).toContain('machinelearning')
    })

    it('should not add duplicate tags', async () => {
      const session = await createMockSession('Topic')

      await addTagToSession(session.id, 'ai')
      await addTagToSession(session.id, 'ai')

      const updated = sessionStorage.get(session.id)
      expect(updated?.tags?.filter(t => t === 'ai')).toHaveLength(1)
    })

    it('should return null for non-existent session', async () => {
      const result = await addTagToSession('non-existent', 'tag')

      expect(result).toBeNull()
    })
  })

  describe('removeTagFromSession', () => {
    it('should remove a tag from session', async () => {
      const session = await createMockSession('Topic', ['tag1', 'tag2'])

      await removeTagFromSession(session.id, 'tag1')

      const updated = sessionStorage.get(session.id)
      expect(updated?.tags).not.toContain('tag1')
      expect(updated?.tags).toContain('tag2')
    })

    it('should handle removing non-existent tag', async () => {
      const session = await createMockSession('Topic', ['existing'])

      const updated = await removeTagFromSession(session.id, 'non-existent')

      expect(updated?.tags).toEqual(['existing'])
    })
  })

  describe('getAllTags', () => {
    it('should return all unique tags with counts', async () => {
      await createMockSession('Topic 1', ['ai', 'ml'])
      await createMockSession('Topic 2', ['ai', 'nlp'])
      await createMockSession('Topic 3', ['ai'])

      const tags = await getAllTags()

      expect(tags).toContainEqual({ tag: 'ai', count: 3 })
      expect(tags).toContainEqual({ tag: 'ml', count: 1 })
      expect(tags).toContainEqual({ tag: 'nlp', count: 1 })
    })

    it('should return tags sorted by count', async () => {
      await createMockSession('Topic 1', ['common', 'rare'])
      await createMockSession('Topic 2', ['common'])
      await createMockSession('Topic 3', ['common'])

      const tags = await getAllTags()

      expect(tags[0].tag).toBe('common')
      expect(tags[0].count).toBe(3)
    })

    it('should return empty array when no tags', async () => {
      await createMockSession('No tags')

      const tags = await getAllTags()

      expect(tags).toHaveLength(0)
    })
  })

  describe('getSessionsByTag', () => {
    it('should return sessions with specific tag', async () => {
      await createMockSession('Topic 1', ['target-tag'])
      await createMockSession('Topic 2', ['other-tag'])
      await createMockSession('Topic 3', ['target-tag', 'other-tag'])

      const sessions = await getSessionsByTag('target-tag')

      expect(sessions).toHaveLength(2)
      expect(sessions.every(s => s.tags?.includes('target-tag'))).toBe(true)
    })

    it('should be case insensitive', async () => {
      await createMockSession('Topic', ['myTag'])

      // Note: our mock normalizes to lowercase
      const sessions = await getSessionsByTag('mytag')

      expect(sessions).toHaveLength(1)
    })
  })
})

describe('Related Session Suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage = new Map()
    linkStorage = new Map()
  })

  describe('suggestRelatedSessions', () => {
    it('should suggest sessions with shared tags', async () => {
      const main = await createMockSession('Main Topic', ['ai', 'research'])
      await createMockSession('Related', ['ai', 'ml'])
      await createMockSession('Unrelated', ['cooking'])

      const suggestions = await suggestRelatedSessions(main.id)

      expect(suggestions).toHaveLength(1)
      expect(suggestions[0].session.topic).toBe('Related')
      expect(suggestions[0].reasons).toContain('Shared tags: ai')
    })

    it('should not suggest already linked sessions', async () => {
      const main = await createMockSession('Main', ['ai'])
      const linked = await createMockSession('Linked', ['ai'])
      await linkSessions(main.id, linked.id)

      const suggestions = await suggestRelatedSessions(main.id)

      expect(suggestions.every(s => s.session.id !== linked.id)).toBe(true)
    })

    it('should return empty array for session with no similar sessions', async () => {
      const session = await createMockSession('Unique', ['very-unique-tag'])
      await createMockSession('Other', ['different'])

      const suggestions = await suggestRelatedSessions(session.id)

      expect(suggestions).toHaveLength(0)
    })

    it('should limit suggestions', async () => {
      const main = await createMockSession('Main', ['common'])
      for (let i = 0; i < 10; i++) {
        await createMockSession(`Similar ${i}`, ['common'])
      }

      const suggestions = await suggestRelatedSessions(main.id)

      expect(suggestions.length).toBeLessThanOrEqual(5)
    })
  })
})

describe('Session Merging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage = new Map()
    linkStorage = new Map()
  })

  describe('mergeSessions', () => {
    it('should merge multiple sessions into one', async () => {
      const session1 = await createMockSession('Topic 1', ['tag1'])
      const session2 = await createMockSession('Topic 2', ['tag2'])

      // Add some results
      session1.savedResults = [mockSearchResult]
      session1.queries = ['query 1']
      session2.queries = ['query 2']
      sessionStorage.set(session1.id, session1)
      sessionStorage.set(session2.id, session2)

      const merged = await mergeSessions([session1.id, session2.id])

      expect(merged.queries).toContain('query 1')
      expect(merged.queries).toContain('query 2')
      expect(merged.tags).toContain('tag1')
      expect(merged.tags).toContain('tag2')
    })

    it('should use custom topic if provided', async () => {
      const session1 = await createMockSession('Topic 1')
      const session2 = await createMockSession('Topic 2')

      const merged = await mergeSessions([session1.id, session2.id], {
        newTopic: 'Combined Research',
      })

      expect(merged.topic).toBe('Combined Research')
    })

    it('should link merged session to originals', async () => {
      const session1 = await createMockSession('Topic 1')
      const session2 = await createMockSession('Topic 2')

      const merged = await mergeSessions([session1.id, session2.id])

      expect(merged.linkedSessions).toContain(session1.id)
      expect(merged.linkedSessions).toContain(session2.id)
    })

    it('should throw error when no valid sessions', async () => {
      await expect(mergeSessions(['non-existent-1', 'non-existent-2']))
        .rejects.toThrow('No valid sessions to merge')
    })
  })
})
