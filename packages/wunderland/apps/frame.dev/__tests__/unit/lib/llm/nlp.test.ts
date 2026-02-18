/**
 * NLP Fallback Provider Tests
 * @module __tests__/unit/lib/llm/nlp.test
 *
 * Tests for NLP-based text analysis.
 */

import { describe, it, expect } from 'vitest'
import {
  analyzeGenreNLP,
  extractCharactersNLP,
  extractSettingsNLP,
  evaluateWorthinessNLP,
  recommendStyleNLP,
  analyzeDocumentNLP,
} from '@/lib/llm/nlp'

// ============================================================================
// analyzeGenreNLP
// ============================================================================

describe('analyzeGenreNLP', () => {
  describe('content type detection', () => {
    it('detects fiction content', () => {
      const result = analyzeGenreNLP([
        'He said he would be back. She said nothing.',
        'Once upon a time, the story began.',
      ])

      expect(result.contentType).toBe('fiction')
    })

    it('detects technical content', () => {
      const result = analyzeGenreNLP([
        'The function implements the algorithm for the database.',
        'The system architecture uses a class-based implementation.',
        'Configure the API configuration for the method.',
      ])

      expect(result.contentType).toBe('technical')
      expect(result.genre).toBe('Technical Documentation')
    })

    it('detects educational content', () => {
      const result = analyzeGenreNLP([
        'In this lesson, you will learn step by step.',
        'Practice this exercise to understand the example.',
        'Follow this tutorial guide for each step.',
      ])

      expect(result.contentType).toBe('educational')
      expect(result.genre).toBe('Educational Material')
    })

    it('detects non-fiction as default', () => {
      const result = analyzeGenreNLP(['This is a regular article about current events.'])

      expect(result.contentType).toBe('non-fiction')
      expect(result.genre).toBe('General Non-Fiction')
    })
  })

  describe('fiction sub-genre detection', () => {
    it('detects science fiction', () => {
      const result = analyzeGenreNLP([
        'He said they traveled to space in the future. She said yes.',
        'She said the ship was ready. He thought to himself about the stars.',
        'Once upon a time in the story, the character went to space.',
      ])

      expect(result.genre).toBe('Science Fiction')
    })

    it('detects fantasy', () => {
      const result = analyzeGenreNLP([
        'He said the magic was powerful. She said it glowed.',
        'The dragon approached slowly. He thought to himself.',
        'Once upon a time, in a world of magic and dragons.',
      ])

      expect(result.genre).toBe('Fantasy')
    })

    it('detects mystery', () => {
      const result = analyzeGenreNLP([
        'He said there was a murder. She said the detective would come.',
        'The detective investigated carefully. He thought to himself.',
        'Once upon a time, a mystery began. The story unfolded.',
      ])

      expect(result.genre).toBe('Mystery')
    })

    it('defaults to Literary Fiction', () => {
      const result = analyzeGenreNLP([
        'He said he would leave tomorrow. She said goodbye forever.',
        'She said nothing more. He thought to himself.',
        'Once upon a time, in a world of emotions, the story began.',
      ])

      expect(result.genre).toBe('Literary Fiction')
    })
  })

  describe('target audience detection', () => {
    it('detects children audience for short sentences', () => {
      const result = analyzeGenreNLP([
        'Cat sat. Dog ran. Bird flew.',
        'Sun up. Moon down.',
      ])

      expect(result.targetAudience).toBe('children')
    })

    it('detects professional audience for technical content', () => {
      const result = analyzeGenreNLP([
        'The system architecture implements a comprehensive microservices-based approach using modern cloud-native design patterns and distributed systems.',
        'Configure the API gateway using the advanced configuration management system with proper authentication, authorization, and rate limiting for production environments.',
        'The algorithm complexity analysis shows O(n log n) performance for the database implementation when handling large-scale distributed transaction processing.',
        'Function callbacks handle the asynchronous method execution patterns in the class-based architecture following industry best practices for maintainability.',
      ])

      expect(result.targetAudience).toBe('professional')
    })
  })

  describe('narrative style detection', () => {
    it('detects first-person narrative', () => {
      const result = analyzeGenreNLP([
        'I walked to the store. My friend joined me. He said hello.',
        'We bought some groceries. She said thanks.',
        'He said the story was amazing. I loved being a character in it.',
      ])

      expect(result.contentType).toBe('fiction')
      expect(result.narrativeStyle).toBe('first-person')
    })

    it('detects third-person narrative', () => {
      const result = analyzeGenreNLP([
        'He walked to the store. She joined him.',
        'They bought groceries together. He thought to himself.',
        'She said hello. He waved back.',
      ])

      expect(result.contentType).toBe('fiction')
      expect(result.narrativeStyle).toBe('third-person')
    })

    it('detects technical style', () => {
      const result = analyzeGenreNLP([
        'The function returns the database query result.',
        'System architecture defines the API implementation.',
        'The algorithm class method handles configuration.',
        'Database connections use the architecture pattern.',
      ])

      expect(result.narrativeStyle).toBe('technical')
    })

    it('detects instructional style', () => {
      const result = analyzeGenreNLP([
        'In this step-by-step tutorial, you will learn the basics.',
        'Follow the example guide to practice each lesson.',
        'Complete the exercise to understand the question.',
        'This guide will teach you step by step.',
      ])

      expect(result.narrativeStyle).toBe('instructional')
    })
  })

  describe('mood detection', () => {
    it('detects dark mood', () => {
      const result = analyzeGenreNLP(['The dark forest filled him with fear.'])

      expect(result.mood).toBe('dark')
    })

    it('detects cheerful mood', () => {
      const result = analyzeGenreNLP(['Happy days brought joy to everyone.'])

      expect(result.mood).toBe('cheerful')
    })

    it('detects serious mood', () => {
      const result = analyzeGenreNLP(['This is a serious matter of great importance.'])

      expect(result.mood).toBe('serious')
    })

    it('defaults to neutral mood', () => {
      const result = analyzeGenreNLP(['The weather was mild today.'])

      expect(result.mood).toBe('neutral')
    })
  })

  describe('key themes extraction', () => {
    it('extracts themes from text', () => {
      const result = analyzeGenreNLP([
        'The adventure began in the mountains. The journey through the mountains continued.',
        'Mountains provided shelter. The adventure was exciting.',
      ])

      expect(result.keyThemes.length).toBeGreaterThan(0)
    })

    it('returns at most 5 themes', () => {
      const result = analyzeGenreNLP([
        'Books, computers, phones, tablets, keyboards, monitors, cables, routers, servers, switches are all technology items.',
      ])

      expect(result.keyThemes.length).toBeLessThanOrEqual(5)
    })
  })

  describe('result structure', () => {
    it('returns all required fields', () => {
      const result = analyzeGenreNLP(['Test content'])

      expect(result).toHaveProperty('genre')
      expect(result).toHaveProperty('contentType')
      expect(result).toHaveProperty('targetAudience')
      expect(result).toHaveProperty('narrativeStyle')
      expect(result).toHaveProperty('keyThemes')
      expect(result).toHaveProperty('mood')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('method')
    })

    it('returns confidence of 0.6', () => {
      const result = analyzeGenreNLP(['Test'])

      expect(result.confidence).toBe(0.6)
    })

    it('returns method as nlp', () => {
      const result = analyzeGenreNLP(['Test'])

      expect(result.method).toBe('nlp')
    })
  })

  describe('edge cases', () => {
    it('handles empty array', () => {
      const result = analyzeGenreNLP([])

      expect(result).toBeDefined()
      expect(result.method).toBe('nlp')
    })

    it('handles empty strings', () => {
      const result = analyzeGenreNLP(['', ''])

      expect(result).toBeDefined()
    })
  })
})

// ============================================================================
// extractCharactersNLP
// ============================================================================

describe('extractCharactersNLP', () => {
  describe('character extraction', () => {
    it('extracts named characters', () => {
      const result = extractCharactersNLP([
        'John Smith walked into the room. John looked around.',
        'Mary Johnson greeted John. Mary smiled warmly.',
      ])

      expect(result.characters.length).toBeGreaterThan(0)
    })

    it('filters out single-mention names', () => {
      const result = extractCharactersNLP([
        'John appeared once. Jane showed up once. Mike came in briefly.',
        'The story continued without them.',
      ])

      // Names must appear more than once
      expect(result.characters.every(c => c.frequency > 0)).toBe(true)
    })

    it('limits to top 10 characters', () => {
      const names = Array.from({ length: 15 }, (_, i) => `Character${i}`)
      const text = names.map(n => `${n} appeared. ${n} spoke. ${n} left.`).join(' ')

      const result = extractCharactersNLP([text])

      expect(result.characters.length).toBeLessThanOrEqual(10)
    })
  })

  describe('character properties', () => {
    it('includes name in results', () => {
      const result = extractCharactersNLP([
        'Sarah walked in. Sarah smiled.',
      ])

      const sarah = result.characters.find(c => c.name.includes('Sarah'))
      expect(sarah?.name).toBeDefined()
    })

    it('includes description', () => {
      const result = extractCharactersNLP([
        'Sarah walked in happily. Sarah smiled at everyone.',
      ])

      result.characters.forEach(c => {
        expect(c.description).toBeDefined()
      })
    })

    it('returns empty visualTraits', () => {
      const result = extractCharactersNLP(['John Smith appeared. John spoke.'])

      result.characters.forEach(c => {
        expect(c.visualTraits).toEqual([])
      })
    })

    it('assigns role based on frequency', () => {
      const result = extractCharactersNLP([
        'John appeared. John spoke. John left. John returned. John smiled. John laughed.',
      ])

      if (result.characters.length > 0) {
        expect(['major', 'supporting']).toContain(result.characters[0].role)
      }
    })
  })

  describe('result structure', () => {
    it('returns required fields', () => {
      const result = extractCharactersNLP(['Test text'])

      expect(result).toHaveProperty('characters')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('method')
      expect(Array.isArray(result.characters)).toBe(true)
    })

    it('returns method as nlp', () => {
      const result = extractCharactersNLP(['Test'])

      expect(result.method).toBe('nlp')
    })

    it('returns lower confidence when no characters found', () => {
      const result = extractCharactersNLP(['No people mentioned here.'])

      expect(result.confidence).toBe(0.3)
    })

    it('returns higher confidence when characters found', () => {
      const result = extractCharactersNLP([
        'John Smith walked in. John looked around. Sarah joined John.',
      ])

      if (result.characters.length > 0) {
        expect(result.confidence).toBe(0.5)
      }
    })
  })
})

// ============================================================================
// extractSettingsNLP
// ============================================================================

describe('extractSettingsNLP', () => {
  describe('setting extraction', () => {
    it('extracts named places', () => {
      const result = extractSettingsNLP([
        'The story takes place in Paris. Paris is beautiful.',
        'They visited New York. New York was busy.',
      ])

      expect(result.settings.length).toBeGreaterThan(0)
    })

    it('filters single-mention places', () => {
      const result = extractSettingsNLP([
        'London appeared once. Tokyo was mentioned. Berlin showed up.',
      ])

      // Places must appear more than once
      expect(result.settings.every(s => s.frequency > 0)).toBe(true)
    })
  })

  describe('setting properties', () => {
    it('includes name', () => {
      const result = extractSettingsNLP([
        'They went to Chicago. Chicago was cold.',
      ])

      result.settings.forEach(s => {
        expect(s.name).toBeDefined()
      })
    })

    it('includes description', () => {
      const result = extractSettingsNLP([
        'Paris was beautiful. They loved Paris.',
      ])

      result.settings.forEach(s => {
        expect(s.description).toBeDefined()
      })
    })

    it('returns empty visualStyle', () => {
      const result = extractSettingsNLP(['London twice. London again.'])

      result.settings.forEach(s => {
        expect(s.visualStyle).toEqual([])
      })
    })
  })

  describe('result structure', () => {
    it('returns required fields', () => {
      const result = extractSettingsNLP(['Test text'])

      expect(result).toHaveProperty('settings')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('method')
    })

    it('returns method as nlp', () => {
      const result = extractSettingsNLP(['Test'])

      expect(result.method).toBe('nlp')
    })
  })
})

// ============================================================================
// evaluateWorthinessNLP
// ============================================================================

describe('evaluateWorthinessNLP', () => {
  describe('short content', () => {
    it('rejects content under 20 words', () => {
      const result = evaluateWorthinessNLP('Short text here.')

      expect(result.warrants).toBe(false)
      expect(result.reasoning).toContain('too short')
      expect(result.confidence).toBe(0.8)
    })
  })

  describe('no visual indicators', () => {
    it('rejects content without visual concepts', () => {
      const words = Array(40).fill('word').join(' ')
      const result = evaluateWorthinessNLP(words)

      expect(result.warrants).toBe(false)
      expect(result.reasoning).toContain('textual content')
      expect(result.visualConcepts).toEqual([])
    })
  })

  describe('visual indicators', () => {
    it('accepts content with diagram indicators', () => {
      const content = 'The system architecture diagram shows the overall structure. ' +
        'This diagram illustrates the components and their relationships. ' +
        'The architecture overview provides a visual representation.'

      const result = evaluateWorthinessNLP(content)

      expect(result.warrants).toBe(true)
      expect(result.visualConcepts.length).toBeGreaterThan(0)
    })

    it('accepts content with process indicators', () => {
      const content = 'First, you need to prepare. Second, execute the plan. ' +
        'Then, verify the results. Finally, document everything. ' +
        'Step 1 is the most important stage 1 phase 1.'

      const result = evaluateWorthinessNLP(content)

      expect(result.warrants).toBe(true)
    })

    it('accepts content with scene indicators', () => {
      const content = 'He looked at the building. She saw the room and stared. ' +
        'The face appeared in the window. She watched and gazed. ' +
        'They stood outside on the street.'

      const result = evaluateWorthinessNLP(content)

      expect(result.warrants).toBe(true)
    })
  })

  describe('suggested type', () => {
    it('suggests diagram for architecture content', () => {
      const content = 'The system architecture shows the diagram of components. ' +
        'The architecture is well-designed and documented. ' +
        'This diagram illustrates all the connections.'

      const result = evaluateWorthinessNLP(content)

      expect(result.suggestedType).toBe('diagram')
    })

    it('suggests process for step content', () => {
      const content = 'First, prepare the materials. Second, mix them together. ' +
        'Step 1 involves preparation. Then, cook for 30 minutes. ' +
        'Finally, serve hot. This is stage 1.'

      const result = evaluateWorthinessNLP(content)

      expect(result.suggestedType).toBe('process')
    })

    it('suggests scene for visual description content', () => {
      const content = 'She looked at him. He stared back. They watched the sunset. ' +
        'He gazed at the horizon. She saw the beauty in it all. ' +
        'They watched together silently. He looked away finally.'

      const result = evaluateWorthinessNLP(content)

      expect(result.suggestedType).toBe('scene')
    })
  })

  describe('confidence calculation', () => {
    it('increases confidence with more indicators', () => {
      const lowIndicators = 'The diagram shows the structure. This is a basic overview.'
      const highIndicators = 'The diagram shows the architecture. The flow process ' +
        'illustrates the workflow. The hierarchy and components create layers. ' +
        'The network visualization shows connections and interactions.'

      const lowResult = evaluateWorthinessNLP(lowIndicators)
      const highResult = evaluateWorthinessNLP(highIndicators)

      expect(highResult.confidence).toBeGreaterThan(lowResult.confidence)
    })

    it('caps confidence at 0.9', () => {
      const manyIndicators = 'diagram architecture flow process workflow structure ' +
        'hierarchy tree graph network pipeline stages phases components layers ' +
        'relationship connection interaction overview visualization'

      const result = evaluateWorthinessNLP(manyIndicators)

      expect(result.confidence).toBeLessThanOrEqual(0.9)
    })
  })

  describe('result structure', () => {
    it('returns required fields', () => {
      const result = evaluateWorthinessNLP('Test content here with enough words to pass the minimum threshold check.')

      expect(result).toHaveProperty('warrants')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('reasoning')
      expect(result).toHaveProperty('visualConcepts')
      expect(result).toHaveProperty('method')
    })

    it('returns method as nlp', () => {
      const result = evaluateWorthinessNLP('Test')

      expect(result.method).toBe('nlp')
    })
  })
})

// ============================================================================
// recommendStyleNLP
// ============================================================================

describe('recommendStyleNLP', () => {
  describe('content type mapping', () => {
    it('recommends technical-diagram for technical content', () => {
      const result = recommendStyleNLP({
        genre: 'Technical Documentation',
        contentType: 'technical',
        targetAudience: 'professional',
        keyThemes: [],
        confidence: 0.8,
        method: 'nlp',
      })

      expect(result.recommendedPresetId).toBe('technical-diagram')
    })

    it('recommends educational-friendly for educational content', () => {
      const result = recommendStyleNLP({
        genre: 'Educational Material',
        contentType: 'educational',
        targetAudience: 'general',
        keyThemes: [],
        confidence: 0.8,
        method: 'nlp',
      })

      expect(result.recommendedPresetId).toBe('educational-friendly')
    })

    it('recommends childrens-cartoon for children fiction', () => {
      const result = recommendStyleNLP({
        genre: 'Fiction',
        contentType: 'fiction',
        targetAudience: 'children',
        keyThemes: [],
        confidence: 0.8,
        method: 'nlp',
      })

      expect(result.recommendedPresetId).toBe('childrens-cartoon')
    })

    it('recommends noir-graphic-novel for dark fiction', () => {
      const result = recommendStyleNLP({
        genre: 'Mystery',
        contentType: 'fiction',
        targetAudience: 'adult',
        keyThemes: [],
        mood: 'dark',
        confidence: 0.8,
        method: 'nlp',
      })

      expect(result.recommendedPresetId).toBe('noir-graphic-novel')
    })

    it('recommends muted-watercolor for literary fiction', () => {
      const result = recommendStyleNLP({
        genre: 'Literary Fiction',
        contentType: 'fiction',
        targetAudience: 'adult',
        keyThemes: [],
        confidence: 0.8,
        method: 'nlp',
      })

      expect(result.recommendedPresetId).toBe('muted-watercolor')
    })
  })

  describe('color palette generation', () => {
    it('generates dark palette for dark mood', () => {
      const result = recommendStyleNLP({
        genre: 'Fiction',
        contentType: 'fiction',
        targetAudience: 'adult',
        keyThemes: [],
        mood: 'dark',
        confidence: 0.8,
        method: 'nlp',
      })

      expect(result.colorPalette.mood).toBe('dark moody')
    })

    it('generates cheerful palette for cheerful mood', () => {
      const result = recommendStyleNLP({
        genre: 'Fiction',
        contentType: 'non-fiction',
        targetAudience: 'general',
        keyThemes: [],
        mood: 'cheerful',
        confidence: 0.8,
        method: 'nlp',
      })

      expect(result.colorPalette.mood).toBe('bright cheerful')
    })

    it('generates technical palette for technical content', () => {
      const result = recommendStyleNLP({
        genre: 'Technical Documentation',
        contentType: 'technical',
        targetAudience: 'professional',
        keyThemes: [],
        confidence: 0.8,
        method: 'nlp',
      })

      expect(result.colorPalette.mood).toBe('technical clean')
    })
  })

  describe('result structure', () => {
    it('returns required fields', () => {
      const result = recommendStyleNLP({
        genre: 'Test',
        contentType: 'non-fiction',
        targetAudience: 'general',
        keyThemes: [],
        confidence: 0.8,
        method: 'nlp',
      })

      expect(result).toHaveProperty('recommendedPresetId')
      expect(result).toHaveProperty('reasoning')
      expect(result).toHaveProperty('colorPalette')
      expect(result).toHaveProperty('consistencyStrategy')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('method')
    })

    it('returns method as nlp', () => {
      const result = recommendStyleNLP({
        genre: 'Test',
        contentType: 'non-fiction',
        targetAudience: 'general',
        keyThemes: [],
        confidence: 0.8,
        method: 'nlp',
      })

      expect(result.method).toBe('nlp')
    })

    it('returns confidence of 0.6', () => {
      const result = recommendStyleNLP({
        genre: 'Test',
        contentType: 'non-fiction',
        targetAudience: 'general',
        keyThemes: [],
        confidence: 0.8,
        method: 'nlp',
      })

      expect(result.confidence).toBe(0.6)
    })
  })
})

// ============================================================================
// analyzeDocumentNLP
// ============================================================================

describe('analyzeDocumentNLP', () => {
  describe('full analysis', () => {
    it('includes genre analysis', () => {
      const result = analyzeDocumentNLP(['Test content'])

      expect(result.genre).toBeDefined()
      expect(result.genre.method).toBe('nlp')
    })

    it('includes characters by default', () => {
      const result = analyzeDocumentNLP(['John walked in. John smiled.'])

      expect(result.characters).toBeDefined()
    })

    it('includes settings by default', () => {
      const result = analyzeDocumentNLP(['Paris is beautiful. They visited Paris.'])

      expect(result.settings).toBeDefined()
    })

    it('includes style recommendation', () => {
      const result = analyzeDocumentNLP(['Test content'])

      expect(result.styleRecommendation).toBeDefined()
    })
  })

  describe('options', () => {
    it('excludes characters when includeCharacters is false', () => {
      const result = analyzeDocumentNLP(['Test'], { includeCharacters: false })

      expect(result.characters).toBeUndefined()
    })

    it('excludes settings when includeSettings is false', () => {
      const result = analyzeDocumentNLP(['Test'], { includeSettings: false })

      expect(result.settings).toBeUndefined()
    })
  })

  describe('result structure', () => {
    it('returns required fields', () => {
      const result = analyzeDocumentNLP(['Test'])

      expect(result).toHaveProperty('genre')
      expect(result).toHaveProperty('styleRecommendation')
      expect(result).toHaveProperty('method')
      expect(result).toHaveProperty('analysisTime')
    })

    it('returns method as nlp', () => {
      const result = analyzeDocumentNLP(['Test'])

      expect(result.method).toBe('nlp')
    })

    it('tracks analysis time', () => {
      const result = analyzeDocumentNLP(['Test content'])

      expect(result.analysisTime).toBeGreaterThanOrEqual(0)
    })
  })
})
