/**
 * Tests for AI Selection Actions Service
 * @module tests/unit/ai/selectionActions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the llm module
vi.mock('@/lib/llm', () => ({
  llm: {
    generate: vi.fn(),
  },
  generateStream: vi.fn(),
  isLLMAvailable: vi.fn(() => true),
}))

// Mock the graceful failure module
vi.mock('@/lib/ai', () => ({
  withGracefulFailure: vi.fn((fn) => fn),
  showAIStatus: vi.fn(),
  showAIError: vi.fn(),
}))

import {
  getActionPrompt,
  SELECTION_ACTIONS,
  TRANSLATION_LANGUAGES,
  getActionsByCategory,
  performSelectionAction,
  type SelectionAction,
} from '@/lib/ai/selectionActions'
import { llm, isLLMAvailable } from '@/lib/llm'

describe('Selection Actions Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isLLMAvailable).mockReturnValue(true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('SELECTION_ACTIONS metadata', () => {
    it('should have all required action types', () => {
      const expectedActions: SelectionAction[] = [
        'improve',
        'shorten',
        'lengthen',
        'grammar',
        'tone_formal',
        'tone_casual',
        'tone_professional',
        'explain',
        'define',
        'summarize',
        'expand',
        'translate',
      ]

      expectedActions.forEach((action) => {
        expect(SELECTION_ACTIONS[action]).toBeDefined()
        expect(SELECTION_ACTIONS[action].label).toBeTruthy()
        expect(SELECTION_ACTIONS[action].description).toBeTruthy()
        expect(SELECTION_ACTIONS[action].icon).toBeTruthy()
        expect(SELECTION_ACTIONS[action].category).toBeTruthy()
      })
    })

    it('should have valid categories', () => {
      const validCategories = ['transform', 'analyze', 'tone', 'translate']

      Object.values(SELECTION_ACTIONS).forEach((metadata) => {
        expect(validCategories).toContain(metadata.category)
      })
    })
  })

  describe('TRANSLATION_LANGUAGES', () => {
    it('should have common languages', () => {
      const expectedLanguages = ['Spanish', 'French', 'German', 'Chinese', 'Japanese']

      expectedLanguages.forEach((lang) => {
        const found = TRANSLATION_LANGUAGES.find((l) => l.name === lang)
        expect(found).toBeDefined()
      })
    })

    it('should have valid structure for each language', () => {
      TRANSLATION_LANGUAGES.forEach((lang) => {
        expect(lang.code).toBeTruthy()
        expect(lang.name).toBeTruthy()
        expect(lang.native).toBeTruthy()
      })
    })
  })

  describe('getActionPrompt', () => {
    const testText = 'This is a test sentence with some errors.'

    it('should generate improve prompt', () => {
      const prompt = getActionPrompt('improve', testText)
      expect(prompt).toContain('Improve this text')
      expect(prompt).toContain(testText)
    })

    it('should generate shorten prompt', () => {
      const prompt = getActionPrompt('shorten', testText)
      expect(prompt).toContain('concise')
      expect(prompt).toContain(testText)
    })

    it('should generate lengthen prompt', () => {
      const prompt = getActionPrompt('lengthen', testText)
      expect(prompt).toContain('Expand this text')
      expect(prompt).toContain(testText)
    })

    it('should generate grammar prompt', () => {
      const prompt = getActionPrompt('grammar', testText)
      expect(prompt).toContain('grammar')
      expect(prompt).toContain('spelling')
      expect(prompt).toContain(testText)
    })

    it('should generate tone prompts', () => {
      const formalPrompt = getActionPrompt('tone_formal', testText)
      expect(formalPrompt).toContain('formal')

      const casualPrompt = getActionPrompt('tone_casual', testText)
      expect(casualPrompt).toContain('casual')

      const professionalPrompt = getActionPrompt('tone_professional', testText)
      expect(professionalPrompt).toContain('professional')
    })

    it('should generate translate prompt with language', () => {
      const prompt = getActionPrompt('translate', testText, undefined, 'French')
      expect(prompt).toContain('Translate')
      expect(prompt).toContain('French')
      expect(prompt).toContain(testText)
    })

    it('should include context when provided', () => {
      const context = 'This is the surrounding context.'
      const prompt = getActionPrompt('improve', testText, context)
      expect(prompt).toContain('Context')
      expect(prompt).toContain(context)
    })
  })

  describe('getActionsByCategory', () => {
    it('should return all categories', () => {
      const categories = getActionsByCategory()

      expect(categories.transform).toBeDefined()
      expect(categories.analyze).toBeDefined()
      expect(categories.tone).toBeDefined()
      expect(categories.translate).toBeDefined()
    })

    it('should categorize actions correctly', () => {
      const categories = getActionsByCategory()

      // Transform actions
      expect(categories.transform).toContain('improve')
      expect(categories.transform).toContain('shorten')
      expect(categories.transform).toContain('grammar')

      // Tone actions
      expect(categories.tone).toContain('tone_formal')
      expect(categories.tone).toContain('tone_casual')

      // Analyze actions
      expect(categories.analyze).toContain('explain')
      expect(categories.analyze).toContain('define')

      // Translate actions
      expect(categories.translate).toContain('translate')
    })

    it('should include all actions', () => {
      const categories = getActionsByCategory()
      const allActions = [
        ...categories.transform,
        ...categories.analyze,
        ...categories.tone,
        ...categories.translate,
      ]

      expect(allActions.length).toBe(Object.keys(SELECTION_ACTIONS).length)
    })
  })

  describe('performSelectionAction', () => {
    it('should return error when LLM is not available', async () => {
      vi.mocked(isLLMAvailable).mockReturnValue(false)

      const result = await performSelectionAction({
        selectedText: 'Test text',
        action: 'improve',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('No AI provider')
      expect(result.transformed).toBe('Test text')
    })

    it('should call LLM with correct parameters for improve action', async () => {
      vi.mocked(llm.generate).mockResolvedValue({
        data: 'Improved text result',
        usage: { inputTokens: 10, outputTokens: 5 },
      })

      const result = await performSelectionAction({
        selectedText: 'Test text',
        action: 'improve',
      })

      expect(result.success).toBe(true)
      expect(result.transformed).toBe('Improved text result')
      expect(result.action).toBe('improve')
      expect(llm.generate).toHaveBeenCalled()
    })

    it('should use low temperature for grammar action', async () => {
      vi.mocked(llm.generate).mockResolvedValue({
        data: 'Fixed text',
        usage: { inputTokens: 10, outputTokens: 5 },
      })

      await performSelectionAction({
        selectedText: 'Test text',
        action: 'grammar',
      })

      expect(llm.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.1,
        })
      )
    })

    it('should handle LLM errors gracefully', async () => {
      vi.mocked(llm.generate).mockRejectedValue(new Error('API error'))

      const result = await performSelectionAction({
        selectedText: 'Test text',
        action: 'improve',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('API error')
      expect(result.transformed).toBe('Test text')
    })

    it('should pass context to the prompt', async () => {
      vi.mocked(llm.generate).mockResolvedValue({
        data: 'Result',
        usage: { inputTokens: 10, outputTokens: 5 },
      })

      await performSelectionAction({
        selectedText: 'Test text',
        action: 'improve',
        context: {
          textBefore: 'Before text',
          textAfter: 'After text',
        },
      })

      expect(llm.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Before text'),
        })
      )
    })

    it('should pass language for translation', async () => {
      vi.mocked(llm.generate).mockResolvedValue({
        data: 'Texto traducido',
        usage: { inputTokens: 10, outputTokens: 5 },
      })

      await performSelectionAction({
        selectedText: 'Test text',
        action: 'translate',
        language: 'Spanish',
      })

      expect(llm.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Spanish'),
        })
      )
    })
  })
})
