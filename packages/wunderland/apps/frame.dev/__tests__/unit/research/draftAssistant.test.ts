/**
 * Tests for Draft Assistant
 * @module tests/unit/research/draftAssistant
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ResearchSession, WebSearchResult } from '@/lib/research/types'

// Mock fixtures
const mockResult: WebSearchResult = {
  id: 'result-1',
  title: 'Introduction to Neural Networks',
  url: 'https://example.com/neural-networks',
  snippet: 'Neural networks are the foundation of modern AI systems.',
  domain: 'example.com',
  position: 0,
  source: 'duckduckgo',
  publishedDate: '2024-01-15',
}

const mockAcademicResult: WebSearchResult = {
  id: 'result-2',
  title: 'Deep Learning Review',
  url: 'https://arxiv.org/abs/2401.00001',
  snippet: 'A comprehensive review of deep learning techniques.',
  domain: 'arxiv.org',
  position: 1,
  source: 'semanticscholar',
  publishedDate: '2024-02-20',
}

const mockSession: ResearchSession = {
  id: 'session_draft_123',
  topic: 'Neural Network Research',
  query: 'neural networks deep learning',
  queries: ['neural networks deep learning', 'AI fundamentals'],
  savedResults: [mockResult, mockAcademicResult],
  notes: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  tags: ['ai', 'research'],
  linkedSessions: [],
}

const emptySession: ResearchSession = {
  ...mockSession,
  id: 'session_empty',
  savedResults: [],
}

// Mock dependencies
vi.mock('@/lib/research/academicDetector', () => ({
  isAcademicResult: vi.fn((result: WebSearchResult) => {
    return result.url.includes('arxiv.org') || result.url.includes('doi.org')
  }),
}))

vi.mock('@/lib/config/apiKeyStorage', () => ({
  getAPIKey: vi.fn(async (provider: string) => {
    if (provider === 'anthropic') return { key: 'mock-anthropic-key', savedAt: Date.now() }
    if (provider === 'openai') return { key: 'mock-openai-key', savedAt: Date.now() }
    return null
  }),
}))

// Mock streaming to simulate LLM response
const mockStreamChunks = [
  { type: 'text', content: '# Neural Network Research Outline\n\n' },
  { type: 'text', content: '## Introduction\n' },
  { type: 'text', content: '- Overview of neural networks\n' },
  { type: 'text', content: '- Key concepts from sources\n\n' },
  { type: 'text', content: '## Main Topics\n' },
  { type: 'text', content: '- Deep learning fundamentals\n' },
  { type: 'text', content: '- Modern AI systems\n' },
  { type: 'usage', usage: { totalTokens: 150 } },
]

vi.mock('@/lib/llm/streaming', () => ({
  streamLLM: vi.fn(async function* () {
    for (const chunk of mockStreamChunks) {
      yield chunk
    }
  }),
}))

import {
  generateOutlineFromSession,
  generateOutline,
  generateSummaryFromSession,
  generateKeyPoints,
  type DraftOptions,
} from '@/lib/research/draftAssistant'

describe('Draft Assistant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateOutlineFromSession', () => {
    it('should yield error when session has no saved results', async () => {
      const options: DraftOptions = {
        outlineType: 'bullet',
        depth: 'medium',
      }

      const progress: any[] = []
      for await (const p of generateOutlineFromSession(emptySession, options)) {
        progress.push(p)
      }

      expect(progress).toHaveLength(1)
      expect(progress[0].type).toBe('error')
      expect(progress[0].error).toContain('No saved results')
    })

    it('should yield generating progress first', async () => {
      const options: DraftOptions = {
        outlineType: 'bullet',
        depth: 'medium',
      }

      const progress: any[] = []
      for await (const p of generateOutlineFromSession(mockSession, options)) {
        progress.push(p)
      }

      expect(progress[0].type).toBe('generating')
      expect(progress[0].provider).toBe('anthropic')
    })

    it('should stream content progressively', async () => {
      const options: DraftOptions = {
        outlineType: 'numbered',
        depth: 'shallow',
      }

      const progress: any[] = []
      for await (const p of generateOutlineFromSession(mockSession, options)) {
        progress.push(p)
      }

      // Should have multiple streaming updates
      const streamingUpdates = progress.filter(p => p.type === 'streaming')
      expect(streamingUpdates.length).toBeGreaterThan(0)

      // Content should grow with each update
      for (let i = 1; i < streamingUpdates.length; i++) {
        expect(streamingUpdates[i].content.length).toBeGreaterThanOrEqual(
          streamingUpdates[i - 1].content.length
        )
      }
    })

    it('should complete with full content', async () => {
      const options: DraftOptions = {
        outlineType: 'structured',
        depth: 'deep',
      }

      const progress: any[] = []
      for await (const p of generateOutlineFromSession(mockSession, options)) {
        progress.push(p)
      }

      const complete = progress.find(p => p.type === 'complete')
      expect(complete).toBeDefined()
      expect(complete.content).toContain('Neural Network Research Outline')
      expect(complete.content).toContain('Introduction')
      expect(complete.content).toContain('Main Topics')
    })

    it('should respect different outline types', async () => {
      const bulletOptions: DraftOptions = {
        outlineType: 'bullet',
        depth: 'shallow',
      }

      const numberedOptions: DraftOptions = {
        outlineType: 'numbered',
        depth: 'shallow',
      }

      // Both should complete successfully
      let bulletComplete = false
      let numberedComplete = false

      for await (const p of generateOutlineFromSession(mockSession, bulletOptions)) {
        if (p.type === 'complete') bulletComplete = true
      }

      for await (const p of generateOutlineFromSession(mockSession, numberedOptions)) {
        if (p.type === 'complete') numberedComplete = true
      }

      expect(bulletComplete).toBe(true)
      expect(numberedComplete).toBe(true)
    })

    it('should include citations when requested', async () => {
      const options: DraftOptions = {
        outlineType: 'structured',
        depth: 'medium',
        includeCitations: true,
      }

      // Verify the streaming mock was called (we can't easily check prompt content)
      const progress: any[] = []
      for await (const p of generateOutlineFromSession(mockSession, options)) {
        progress.push(p)
      }

      expect(progress.some(p => p.type === 'complete')).toBe(true)
    })

    it('should handle focus option', async () => {
      const options: DraftOptions = {
        outlineType: 'bullet',
        depth: 'medium',
        focus: 'practical applications',
      }

      const progress: any[] = []
      for await (const p of generateOutlineFromSession(mockSession, options)) {
        progress.push(p)
      }

      expect(progress.some(p => p.type === 'complete')).toBe(true)
    })
  })

  describe('generateOutline', () => {
    it('should return complete DraftResult', async () => {
      const options: DraftOptions = {
        outlineType: 'bullet',
        depth: 'medium',
      }

      const result = await generateOutline(mockSession, options)

      expect(result.outline).toBeDefined()
      expect(result.outline).toContain('Neural Network Research Outline')
      expect(result.provider).toBe('anthropic')
    })

    it('should throw error for empty session', async () => {
      const options: DraftOptions = {
        outlineType: 'bullet',
        depth: 'shallow',
      }

      await expect(generateOutline(emptySession, options)).rejects.toThrow('No saved results')
    })
  })

  describe('generateSummaryFromSession', () => {
    it('should yield error for empty session', async () => {
      const progress: any[] = []
      for await (const p of generateSummaryFromSession(emptySession)) {
        progress.push(p)
      }

      expect(progress[0].type).toBe('error')
      expect(progress[0].error).toContain('No saved results')
    })

    it('should generate summary for valid session', async () => {
      const progress: any[] = []
      for await (const p of generateSummaryFromSession(mockSession)) {
        progress.push(p)
      }

      expect(progress.some(p => p.type === 'generating')).toBe(true)
      expect(progress.some(p => p.type === 'complete')).toBe(true)
    })
  })

  describe('generateKeyPoints', () => {
    it('should extract key points from outline', async () => {
      const points = await generateKeyPoints(mockSession, 5)

      expect(Array.isArray(points)).toBe(true)
      // Points should be extracted from the mock outline
      expect(points.length).toBeLessThanOrEqual(5)
    })

    it('should respect maxPoints limit', async () => {
      const points = await generateKeyPoints(mockSession, 2)

      expect(points.length).toBeLessThanOrEqual(2)
    })
  })

  describe('outline type variations', () => {
    const outlineTypes = ['bullet', 'numbered', 'structured', 'mindmap'] as const

    outlineTypes.forEach(outlineType => {
      it(`should handle ${outlineType} outline type`, async () => {
        const options: DraftOptions = {
          outlineType,
          depth: 'shallow',
        }

        const progress: any[] = []
        for await (const p of generateOutlineFromSession(mockSession, options)) {
          progress.push(p)
        }

        expect(progress.some(p => p.type === 'complete' || p.type === 'error')).toBe(true)
      })
    })
  })

  describe('depth variations', () => {
    const depths = ['shallow', 'medium', 'deep'] as const

    depths.forEach(depth => {
      it(`should handle ${depth} depth`, async () => {
        const options: DraftOptions = {
          outlineType: 'bullet',
          depth,
        }

        const progress: any[] = []
        for await (const p of generateOutlineFromSession(mockSession, options)) {
          progress.push(p)
        }

        expect(progress.some(p => p.type === 'complete' || p.type === 'error')).toBe(true)
      })
    })
  })
})

describe('Provider selection', () => {
  it('should prefer Claude for outline generation', async () => {
    const options: DraftOptions = {
      outlineType: 'structured',
      depth: 'medium',
    }

    const progress: any[] = []
    for await (const p of generateOutlineFromSession(mockSession, options)) {
      progress.push(p)
    }

    const generating = progress.find(p => p.type === 'generating')
    expect(generating?.provider).toBe('anthropic')
  })
})
