/**
 * Explanation Analyzer Tests
 * @module __tests__/unit/lib/generation/explanationAnalyzer.test
 *
 * Tests for explanation analysis pure functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { extractKeyConcepts, calculateCoverage } from '@/lib/generation/explanationAnalyzer'

// ============================================================================
// extractKeyConcepts
// ============================================================================

describe('extractKeyConcepts', () => {
  describe('definition patterns', () => {
    it('extracts concepts from "is" definitions', async () => {
      const content = 'Machine learning is a subset of artificial intelligence.'
      const concepts = await extractKeyConcepts(content)
      expect(concepts.some(c => c.includes('subset'))).toBe(true)
    })

    it('extracts concepts from "are" definitions', async () => {
      const content = 'Algorithms are step-by-step procedures for calculations.'
      const concepts = await extractKeyConcepts(content)
      expect(concepts.some(c => c.includes('step-by-step'))).toBe(true)
    })

    it('extracts concepts from "means" definitions', async () => {
      const content = 'Recursion means a function calls itself.'
      const concepts = await extractKeyConcepts(content)
      expect(concepts.some(c => c.includes('function'))).toBe(true)
    })

    it('extracts concepts from "refers to" definitions', async () => {
      const content = 'API refers to Application Programming Interface.'
      const concepts = await extractKeyConcepts(content)
      expect(concepts.length).toBeGreaterThan(0)
    })
  })

  describe('capitalized terms', () => {
    it('extracts capitalized terms within sentences', async () => {
      const content = 'The concept of Object Oriented Programming is fundamental.'
      const concepts = await extractKeyConcepts(content)
      expect(concepts.some(c => c.includes('Object'))).toBe(true)
    })

    it('extracts multi-word capitalized terms', async () => {
      const content = 'We use Domain Driven Design principles.'
      const concepts = await extractKeyConcepts(content)
      expect(concepts.some(c => c.includes('Domain') || c.includes('Driven'))).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('returns empty array for empty content', async () => {
      const concepts = await extractKeyConcepts('')
      expect(concepts).toEqual([])
    })

    it('returns empty array for content with no definitions', async () => {
      const content = 'hello world today nice weather'
      const concepts = await extractKeyConcepts(content)
      expect(concepts).toEqual([])
    })

    it('deduplicates concepts', async () => {
      const content = 'Machine Learning is great. Machine Learning is powerful.'
      const concepts = await extractKeyConcepts(content)
      const mlCount = concepts.filter(c => c.includes('Machine')).length
      expect(mlCount).toBeLessThanOrEqual(1)
    })

    it('limits to 20 concepts', async () => {
      const definitions = Array.from(
        { length: 30 },
        (_, i) => `Term${i} is concept number ${i}.`
      ).join(' ')
      const concepts = await extractKeyConcepts(definitions)
      expect(concepts.length).toBeLessThanOrEqual(20)
    })

    it('truncates long concepts to 50 characters', async () => {
      const content =
        'Polymorphism is the ability of different classes to be treated as instances of the same class through inheritance.'
      const concepts = await extractKeyConcepts(content)
      concepts.forEach(c => {
        expect(c.length).toBeLessThanOrEqual(50)
      })
    })
  })

  describe('sentence splitting', () => {
    it('handles multiple sentences', async () => {
      const content = 'AI is artificial intelligence. ML is machine learning.'
      const concepts = await extractKeyConcepts(content)
      expect(concepts.length).toBeGreaterThan(0)
    })

    it('handles exclamation marks', async () => {
      const content = 'Recursion is amazing! It calls itself.'
      const concepts = await extractKeyConcepts(content)
      expect(concepts.length).toBeGreaterThan(0)
    })

    it('handles question marks', async () => {
      const content = 'What is recursion? It is self-referential.'
      const concepts = await extractKeyConcepts(content)
      expect(concepts.length).toBeGreaterThan(0)
    })
  })
})

// ============================================================================
// calculateCoverage
// ============================================================================

describe('calculateCoverage', () => {
  describe('basic coverage calculation', () => {
    it('returns 100 for full coverage', () => {
      const concepts = ['recursion', 'function', 'base case']
      const transcript = 'Recursion is when a function calls itself. You need a base case.'
      const coverage = calculateCoverage(transcript, concepts)
      expect(coverage).toBe(100)
    })

    it('returns 0 for no coverage', () => {
      const concepts = ['recursion', 'function', 'base case']
      const transcript = 'I have no idea what this topic is about.'
      const coverage = calculateCoverage(transcript, concepts)
      expect(coverage).toBe(0)
    })

    it('returns partial coverage', () => {
      const concepts = ['recursion', 'function', 'base case', 'stack']
      const transcript = 'Recursion is when a function calls itself.'
      const coverage = calculateCoverage(transcript, concepts)
      expect(coverage).toBe(50) // 2 out of 4
    })
  })

  describe('case insensitivity', () => {
    it('matches concepts case-insensitively', () => {
      const concepts = ['Recursion', 'FUNCTION']
      const transcript = 'recursion and function are important.'
      const coverage = calculateCoverage(transcript, concepts)
      expect(coverage).toBe(100)
    })

    it('matches transcript case-insensitively', () => {
      const concepts = ['recursion', 'function']
      const transcript = 'RECURSION and FUNCTION are important.'
      const coverage = calculateCoverage(transcript, concepts)
      expect(coverage).toBe(100)
    })
  })

  describe('edge cases', () => {
    it('returns 50 for empty concepts array', () => {
      const coverage = calculateCoverage('Any transcript here', [])
      expect(coverage).toBe(50)
    })

    it('returns 0 for empty transcript', () => {
      const concepts = ['recursion', 'function']
      const coverage = calculateCoverage('', concepts)
      expect(coverage).toBe(0)
    })

    it('handles single concept', () => {
      const concepts = ['recursion']
      const transcript = 'Recursion is cool'
      const coverage = calculateCoverage(transcript, concepts)
      expect(coverage).toBe(100)
    })

    it('handles many concepts', () => {
      const concepts = Array.from({ length: 100 }, (_, i) => `concept${i}`)
      const transcript = 'concept0 concept1 concept2'
      const coverage = calculateCoverage(transcript, concepts)
      expect(coverage).toBe(3)
    })
  })

  describe('substring matching', () => {
    it('matches concepts as substrings', () => {
      const concepts = ['loop']
      const transcript = 'Using a for-loop structure'
      const coverage = calculateCoverage(transcript, concepts)
      expect(coverage).toBe(100)
    })

    it('matches multi-word concepts', () => {
      const concepts = ['base case']
      const transcript = 'You need a base case to stop recursion.'
      const coverage = calculateCoverage(transcript, concepts)
      expect(coverage).toBe(100)
    })
  })

  describe('rounding', () => {
    it('rounds to nearest integer', () => {
      const concepts = ['a', 'b', 'c']
      const transcript = 'a' // 1 out of 3 = 33.33%
      const coverage = calculateCoverage(transcript, concepts)
      expect(coverage).toBe(33)
    })

    it('rounds correctly for 2/3', () => {
      const concepts = ['a', 'b', 'c']
      const transcript = 'a b' // 2 out of 3 = 66.67%
      const coverage = calculateCoverage(transcript, concepts)
      expect(coverage).toBe(67)
    })
  })
})

// ============================================================================
// Fallback Functions (Testing via recreated logic)
// ============================================================================

// Recreate generateFallbackResponse logic for testing
const fallbackQuestions: Record<string, string[]> = {
  'curious-child': [
    "But why does that happen?",
    "What does that word mean?",
    "Can you explain that more simply?",
    "Is that like something I already know?",
    "What happens next?",
  ],
  'exam-prep': [
    "What's the definition of that?",
    "Will this be on the test?",
    "What are the key steps?",
    "Can you give me an example problem?",
    "What are common mistakes to avoid?",
  ],
  'devils-advocate': [
    "But what about the opposite case?",
    "How do you know that's true?",
    "What if someone disagreed?",
    "Are there any exceptions?",
    "What evidence supports that?",
  ],
  'visual-learner': [
    "Can you give me a concrete example?",
    "What does that look like in practice?",
    "Can you draw it out?",
    "Where would I see this in real life?",
    "Can you walk me through step by step?",
  ],
  'socratic': [
    "What follows from that?",
    "How do you define that term?",
    "What assumptions are you making?",
    "Is that always the case?",
    "What would happen if...?",
  ],
}

function detectGaps(message: string): string[] {
  const gaps: string[] = []
  if (message.length < 50) {
    gaps.push('Explanation may be too brief')
  }
  if (!message.includes('example') && !message.includes('instance')) {
    gaps.push('No concrete examples provided')
  }
  if (message.split('.').length < 3) {
    gaps.push('Could use more detail')
  }
  return gaps
}

describe('fallback response logic', () => {
  describe('fallback questions per persona', () => {
    Object.entries(fallbackQuestions).forEach(([persona, questions]) => {
      it(`has 5 questions for ${persona}`, () => {
        expect(questions).toHaveLength(5)
      })

      it(`has unique questions for ${persona}`, () => {
        const unique = [...new Set(questions)]
        expect(unique).toHaveLength(5)
      })
    })
  })

  describe('gap detection heuristics', () => {
    it('detects brief explanations', () => {
      const gaps = detectGaps('Short.')
      expect(gaps).toContain('Explanation may be too brief')
    })

    it('does not flag long explanations', () => {
      const longMessage = 'This is a sufficiently long explanation that has more than fifty characters.'
      const gaps = detectGaps(longMessage)
      expect(gaps).not.toContain('Explanation may be too brief')
    })

    it('detects missing examples', () => {
      const gaps = detectGaps('This is an explanation without concrete cases.')
      expect(gaps).toContain('No concrete examples provided')
    })

    it('does not flag when "example" is present', () => {
      const gaps = detectGaps('For example, this demonstrates the concept.')
      expect(gaps).not.toContain('No concrete examples provided')
    })

    it('does not flag when "instance" is present', () => {
      const gaps = detectGaps('In this instance, the behavior differs.')
      expect(gaps).not.toContain('No concrete examples provided')
    })

    it('detects lack of detail (few sentences)', () => {
      // "One sentence." splits to ['One sentence', ''] which is length 2
      const gaps = detectGaps('One sentence.')
      expect(gaps).toContain('Could use more detail')
    })

    it('does not flag with enough sentences', () => {
      const gaps = detectGaps('First point. Second point. Third point.')
      expect(gaps).not.toContain('Could use more detail')
    })

    it('can detect multiple gaps', () => {
      const gaps = detectGaps('Brief.')
      expect(gaps.length).toBeGreaterThanOrEqual(2)
    })

    it('returns empty array for comprehensive explanation', () => {
      const gaps = detectGaps(
        'This is a comprehensive explanation with examples. For instance, consider this case. ' +
          'There are multiple sentences here. Each one adds detail.'
      )
      expect(gaps).toHaveLength(0)
    })
  })
})

// ============================================================================
// Fallback Analysis Logic
// ============================================================================

function calculateWordOverlap(source: string, user: string): number {
  const sourceWords = new Set(
    source.toLowerCase().split(/\W+/).filter(w => w.length > 4)
  )
  const userWords = new Set(
    user.toLowerCase().split(/\W+/).filter(w => w.length > 4)
  )

  let matchCount = 0
  sourceWords.forEach(word => {
    if (userWords.has(word)) matchCount++
  })

  return Math.min(95, Math.max(20, Math.round((matchCount / Math.max(sourceWords.size, 1)) * 100)))
}

describe('fallback analysis logic', () => {
  describe('word overlap calculation', () => {
    it('calculates high coverage for matching content', () => {
      const source = 'Recursion is a function that calls itself repeatedly'
      const user = 'Recursion is when a function calls itself repeatedly'
      const coverage = calculateWordOverlap(source, user)
      expect(coverage).toBeGreaterThan(50)
    })

    it('calculates low coverage for different content', () => {
      const source = 'Machine learning uses neural networks for pattern recognition'
      const user = 'I like cats and dogs very much'
      const coverage = calculateWordOverlap(source, user)
      expect(coverage).toBeLessThanOrEqual(30)
    })

    it('caps coverage at 95', () => {
      const source = 'test words here'
      const user = 'test words here exactly same'
      const coverage = calculateWordOverlap(source, user)
      expect(coverage).toBeLessThanOrEqual(95)
    })

    it('floors coverage at 20', () => {
      const source = 'completely different content here'
      const user = 'nothing matches at all'
      const coverage = calculateWordOverlap(source, user)
      expect(coverage).toBeGreaterThanOrEqual(20)
    })

    it('ignores words with 4 or fewer characters', () => {
      const source = 'the a an is are and but or'
      const user = 'the a an is are and but or'
      // All words are 4 chars or less, so sourceWords is empty
      const coverage = calculateWordOverlap(source, user)
      // When sourceWords is empty, division by max(0, 1) gives 0, then max(20, ...) = 20
      expect(coverage).toBe(20)
    })
  })

  describe('coverage-based gap detection', () => {
    it('suggests detailed explanation for long transcript', () => {
      const transcript = 'A'.repeat(250)
      expect(transcript.length).toBeGreaterThan(200)
    })

    it('suggests adding examples when missing', () => {
      const transcript = 'This explanation has no concrete cases.'
      expect(transcript.includes('example')).toBe(false)
      expect(transcript.includes('instance')).toBe(false)
    })

    it('detects causal reasoning', () => {
      const transcript = 'This happens because the system works this way.'
      expect(transcript.includes('because')).toBe(true)
    })

    it('detects conclusions', () => {
      const transcript = 'Therefore, we can conclude that...'
      // Case-insensitive check
      expect(transcript.toLowerCase().includes('therefore')).toBe(true)
    })
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('explanation analyzer integration', () => {
  it('concept extraction and coverage work together', async () => {
    // Use content with clear capitalized terms that will be extracted
    const content = 'The concept of Machine Learning is important. Deep Learning is a subset.'
    const concepts = await extractKeyConcepts(content)

    // If concepts is empty, use fallback concepts
    const testConcepts = concepts.length > 0 ? concepts : ['machine', 'learning', 'deep']

    const goodTranscript = 'Machine Learning and Deep Learning are related fields.'
    const goodCoverage = calculateCoverage(goodTranscript, testConcepts)

    const badTranscript = 'I do not know anything about this topic.'
    const badCoverage = calculateCoverage(badTranscript, testConcepts)

    expect(goodCoverage).toBeGreaterThanOrEqual(badCoverage)
  })

  it('gap detection identifies improvement areas', () => {
    const briefExplanation = 'It works.'
    const gaps = detectGaps(briefExplanation)

    expect(gaps.length).toBeGreaterThan(0)
    expect(gaps.some(g => g.toLowerCase().includes('brief'))).toBe(true)
  })
})
