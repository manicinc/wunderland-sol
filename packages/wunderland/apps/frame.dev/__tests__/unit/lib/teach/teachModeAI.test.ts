/**
 * Teach Mode AI Tests
 * @module __tests__/unit/lib/teach/teachModeAI.test
 *
 * Tests for AI-powered student responses and gap analysis.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the dependencies
vi.mock('@/lib/llm/streaming', () => ({
  streamLLM: vi.fn(),
}))

vi.mock('@/lib/config/apiKeyStorage', () => ({
  getAPIKey: vi.fn().mockResolvedValue(null),
}))

import type { TeachMessage, StudentResponseResult } from '@/lib/teach/teachModeAI'

describe('teachModeAI module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================================
  // Type exports
  // ============================================================================

  describe('TeachMessage type', () => {
    it('has correct structure for user message', () => {
      const message: TeachMessage = {
        role: 'user',
        content: 'This is how photosynthesis works...',
      }

      expect(message.role).toBe('user')
      expect(message.content).toBeDefined()
    })

    it('has correct structure for student message', () => {
      const message: TeachMessage = {
        role: 'student',
        content: 'Can you explain that simpler?',
      }

      expect(message.role).toBe('student')
      expect(message.content).toBeDefined()
    })
  })

  describe('StudentResponseResult type', () => {
    it('has correct structure with gaps', () => {
      const result: StudentResponseResult = {
        content: 'Why does that happen?',
        gaps: ['Clarity issue detected', 'More examples needed'],
      }

      expect(result.content).toBeDefined()
      expect(result.gaps).toHaveLength(2)
    })

    it('allows undefined gaps', () => {
      const result: StudentResponseResult = {
        content: 'That makes sense!',
      }

      expect(result.content).toBeDefined()
      expect(result.gaps).toBeUndefined()
    })
  })

  // ============================================================================
  // isTeachModeAIAvailable
  // ============================================================================

  describe('isTeachModeAIAvailable', () => {
    it('returns false when no API keys configured', async () => {
      const { isTeachModeAIAvailable } = await import('@/lib/teach/teachModeAI')

      const available = await isTeachModeAIAvailable()
      expect(available).toBe(false)
    })

    it('returns true when Anthropic key is available', async () => {
      const { getAPIKey } = await import('@/lib/config/apiKeyStorage')
      vi.mocked(getAPIKey).mockResolvedValueOnce({
        key: 'sk-ant-test',
        provider: 'anthropic',
        createdAt: Date.now(),
      })

      vi.resetModules()
      const { isTeachModeAIAvailable } = await import('@/lib/teach/teachModeAI')

      const available = await isTeachModeAIAvailable()
      expect(available).toBe(true)
    })

    it('returns true when OpenAI key is available', async () => {
      const { getAPIKey } = await import('@/lib/config/apiKeyStorage')
      vi.mocked(getAPIKey)
        .mockResolvedValueOnce(null) // No Anthropic key
        .mockResolvedValueOnce({
          key: 'sk-test',
          provider: 'openai',
          createdAt: Date.now(),
        })

      vi.resetModules()
      const { isTeachModeAIAvailable } = await import('@/lib/teach/teachModeAI')

      const available = await isTeachModeAIAvailable()
      expect(available).toBe(true)
    })
  })

  // ============================================================================
  // generateStudentResponse (placeholder fallback)
  // ============================================================================

  describe('generateStudentResponse', () => {
    it('returns placeholder response when no API key', async () => {
      const { generateStudentResponse } = await import('@/lib/teach/teachModeAI')

      const result = await generateStudentResponse(
        'curious-child',
        'Photosynthesis is when plants make food from sunlight.',
        'Photosynthesis is the process by which plants use sunlight...',
        []
      )

      expect(result.content).toBeDefined()
      expect(typeof result.content).toBe('string')
      expect(result.content.length).toBeGreaterThan(0)
    })

    it('detects gaps for short explanations', async () => {
      const { generateStudentResponse } = await import('@/lib/teach/teachModeAI')

      const result = await generateStudentResponse(
        'curious-child',
        'Plants use light.',
        'Photosynthesis is a complex process...',
        []
      )

      // Short explanation should trigger gap detection
      expect(result.gaps).toBeDefined()
      expect(result.gaps).toContain('Explanation may be too brief')
    })

    it('returns persona-appropriate questions for curious-child', async () => {
      const { generateStudentResponse } = await import('@/lib/teach/teachModeAI')

      const result = await generateStudentResponse(
        'curious-child',
        'This is a detailed explanation of the topic.',
        'Source content here...',
        []
      )

      // Should be one of the child persona questions
      const childQuestions = [
        "But why does that happen?",
        "What does that word mean?",
        "Can you explain that more simply?",
      ]
      expect(childQuestions).toContain(result.content)
    })

    it('returns persona-appropriate questions for exam-prep', async () => {
      const { generateStudentResponse } = await import('@/lib/teach/teachModeAI')

      const result = await generateStudentResponse(
        'exam-prep',
        'This is a detailed explanation of the topic.',
        'Source content here...',
        []
      )

      const examQuestions = [
        "Will that be on the test?",
        "What's the definition of that?",
        "What are the key steps?",
      ]
      expect(examQuestions).toContain(result.content)
    })

    it('returns persona-appropriate questions for devils-advocate', async () => {
      const { generateStudentResponse } = await import('@/lib/teach/teachModeAI')

      const result = await generateStudentResponse(
        'devils-advocate',
        'This is a detailed explanation of the topic.',
        'Source content here...',
        []
      )

      const devilsAdvocateQuestions = [
        "But what about the opposite case?",
        "How do you know that's actually true?",
        "What evidence supports that?",
      ]
      expect(devilsAdvocateQuestions).toContain(result.content)
    })

    it('returns persona-appropriate questions for visual-learner', async () => {
      const { generateStudentResponse } = await import('@/lib/teach/teachModeAI')

      const result = await generateStudentResponse(
        'visual-learner',
        'This is a detailed explanation of the topic.',
        'Source content here...',
        []
      )

      const visualQuestions = [
        "Can you give me a concrete example?",
        "What does that look like in practice?",
        "Can you draw that out?",
      ]
      expect(visualQuestions).toContain(result.content)
    })

    it('returns persona-appropriate questions for socratic', async () => {
      const { generateStudentResponse } = await import('@/lib/teach/teachModeAI')

      const result = await generateStudentResponse(
        'socratic',
        'This is a detailed explanation of the topic.',
        'Source content here...',
        []
      )

      const socraticQuestions = [
        "And what follows from that?",
        "What assumptions are you making?",
        "Is that always the case?",
      ]
      expect(socraticQuestions).toContain(result.content)
    })
  })

  // ============================================================================
  // generateGreeting
  // ============================================================================

  describe('generateGreeting', () => {
    it('returns default greeting for curious-child', async () => {
      const { generateGreeting } = await import('@/lib/teach/teachModeAI')

      const greeting = await generateGreeting('curious-child', 'Photosynthesis')

      expect(greeting).toContain('Photosynthesis')
      expect(greeting).toContain('teach me')
    })

    it('returns default greeting for exam-prep', async () => {
      const { generateGreeting } = await import('@/lib/teach/teachModeAI')

      const greeting = await generateGreeting('exam-prep', 'Chemistry')

      expect(greeting).toContain('Chemistry')
      expect(greeting).toContain('test')
    })

    it('returns default greeting for devils-advocate', async () => {
      const { generateGreeting } = await import('@/lib/teach/teachModeAI')

      const greeting = await generateGreeting('devils-advocate', 'Physics')

      expect(greeting).toContain('Physics')
    })

    it('returns default greeting for visual-learner', async () => {
      const { generateGreeting } = await import('@/lib/teach/teachModeAI')

      const greeting = await generateGreeting('visual-learner', 'Math')

      expect(greeting).toContain('Math')
      expect(greeting).toContain('examples')
    })

    it('returns default greeting for socratic', async () => {
      const { generateGreeting } = await import('@/lib/teach/teachModeAI')

      const greeting = await generateGreeting('socratic', 'Philosophy')

      expect(greeting).toContain('Philosophy')
    })
  })

  // ============================================================================
  // generateGapReport (placeholder fallback)
  // ============================================================================

  describe('generateGapReport', () => {
    it('returns placeholder report when no API key', async () => {
      const { generateGapReport } = await import('@/lib/teach/teachModeAI')

      const report = await generateGapReport(
        'This is my explanation of photosynthesis...',
        'Source material about photosynthesis...'
      )

      expect(report.covered).toBeDefined()
      expect(report.gaps).toBeDefined()
      expect(report.suggestions).toBeDefined()
      expect(typeof report.coveragePercent).toBe('number')
    })

    it('calculates coverage based on word count', async () => {
      const { generateGapReport } = await import('@/lib/teach/teachModeAI')

      // Short transcript (3 words = 30% due to minimum)
      const shortReport = await generateGapReport(
        'Plants use light.',
        'Source material...'
      )

      // Very long transcript (200 words = 40% coverage)
      const longText = 'Plants use light from the sun to create energy through a process called photosynthesis. '.repeat(20)
      const longReport = await generateGapReport(
        longText,
        'Source material...'
      )

      // Short should hit minimum (30), long should be higher
      expect(shortReport.coveragePercent).toBe(30)
      expect(longReport.coveragePercent).toBeGreaterThan(30)
    })

    it('caps coverage percent at 95', async () => {
      const { generateGapReport } = await import('@/lib/teach/teachModeAI')

      // Very long transcript (500+ words)
      const longText = 'word '.repeat(600)
      const report = await generateGapReport(longText, 'Source...')

      expect(report.coveragePercent).toBeLessThanOrEqual(95)
    })

    it('sets minimum coverage to 30', async () => {
      const { generateGapReport } = await import('@/lib/teach/teachModeAI')

      // Very short transcript
      const report = await generateGapReport('Hi.', 'Source...')

      expect(report.coveragePercent).toBeGreaterThanOrEqual(30)
    })

    it('includes standard suggestions', async () => {
      const { generateGapReport } = await import('@/lib/teach/teachModeAI')

      const report = await generateGapReport(
        'My explanation...',
        'Source material...'
      )

      expect(report.suggestions).toContain('Review section on advanced applications')
      expect(report.suggestions).toContain('Practice with more examples')
      expect(report.suggestions).toContain('Explore related topics')
    })

    it('includes standard covered items', async () => {
      const { generateGapReport } = await import('@/lib/teach/teachModeAI')

      const report = await generateGapReport(
        'My explanation...',
        'Source material...'
      )

      expect(report.covered).toContain('Basic concept introduction')
      expect(report.covered).toContain('Key terminology')
      expect(report.covered).toContain('Main principles')
    })

    it('includes standard gap items', async () => {
      const { generateGapReport } = await import('@/lib/teach/teachModeAI')

      const report = await generateGapReport(
        'My explanation...',
        'Source material...'
      )

      expect(report.gaps).toContain('Detailed examples not provided')
      expect(report.gaps).toContain('Edge cases not discussed')
      expect(report.gaps).toContain('Historical context missing')
    })
  })

  // ============================================================================
  // AbortSignal handling
  // ============================================================================

  describe('AbortSignal handling', () => {
    it('accepts abort signal in generateStudentResponse', async () => {
      const { generateStudentResponse } = await import('@/lib/teach/teachModeAI')
      const controller = new AbortController()

      // Should not throw even with signal
      const result = await generateStudentResponse(
        'curious-child',
        'Hello',
        'Content',
        [],
        controller.signal
      )

      expect(result.content).toBeDefined()
    })

    it('accepts abort signal in generateGreeting', async () => {
      const { generateGreeting } = await import('@/lib/teach/teachModeAI')
      const controller = new AbortController()

      const greeting = await generateGreeting(
        'curious-child',
        'Topic',
        controller.signal
      )

      expect(greeting).toBeDefined()
    })

    it('accepts abort signal in generateGapReport', async () => {
      const { generateGapReport } = await import('@/lib/teach/teachModeAI')
      const controller = new AbortController()

      const report = await generateGapReport(
        'Transcript',
        'Content',
        controller.signal
      )

      expect(report).toBeDefined()
    })
  })

  // ============================================================================
  // Conversation history handling
  // ============================================================================

  describe('conversation history', () => {
    it('handles empty previous messages', async () => {
      const { generateStudentResponse } = await import('@/lib/teach/teachModeAI')

      const result = await generateStudentResponse(
        'curious-child',
        'New message',
        'Content',
        []
      )

      expect(result.content).toBeDefined()
    })

    it('handles multiple previous messages', async () => {
      const { generateStudentResponse } = await import('@/lib/teach/teachModeAI')

      const previousMessages: TeachMessage[] = [
        { role: 'user', content: 'First explanation' },
        { role: 'student', content: 'What does that mean?' },
        { role: 'user', content: 'Let me explain more...' },
        { role: 'student', content: 'I see, but why?' },
      ]

      const result = await generateStudentResponse(
        'curious-child',
        'Further explanation here...',
        'Source content',
        previousMessages
      )

      expect(result.content).toBeDefined()
    })
  })
})
