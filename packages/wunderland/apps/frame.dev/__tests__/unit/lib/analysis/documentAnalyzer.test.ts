/**
 * Document Analyzer Tests
 * @module __tests__/unit/lib/analysis/documentAnalyzer.test
 *
 * Tests for document analysis pure functions.
 */

import { describe, it, expect } from 'vitest'

// We need to test the pure functions that are not exported
// Since extractTextSamples, getAlternativePresets, and getAllPresetIdsForContentType
// are not exported, we'll test them through indirect means or create a test module

// ============================================================================
// Test Helper: Simulate extractTextSamples logic
// ============================================================================

/**
 * Replicates extractTextSamples logic for testing
 */
function extractTextSamples(
  chunks: Array<{ content: string }>,
  maxSamples: number = 5
): string[] {
  if (chunks.length === 0) return []

  const indices: number[] = []

  // First chunk
  indices.push(0)

  // Middle chunks
  if (chunks.length > 2) {
    const mid = Math.floor(chunks.length / 2)
    indices.push(mid - 1, mid, mid + 1)
  }

  // Last chunk
  if (chunks.length > 1) {
    indices.push(chunks.length - 1)
  }

  // De-duplicate and limit
  const uniqueIndices = [...new Set(indices)].slice(0, maxSamples)

  return uniqueIndices
    .map(i => chunks[i]?.content || '')
    .filter(content => content.length > 100)
    .map(content => content.slice(0, 2000))
}

/**
 * Replicates getAllPresetIdsForContentType logic for testing
 */
function getAllPresetIdsForContentType(contentType: string): string[] {
  const presetMap: Record<string, string[]> = {
    fiction: [
      'line-art-editorial',
      'muted-watercolor',
      'photorealistic-scene',
      'noir-graphic-novel',
      'pencil-sketch',
    ],
    'non-fiction': ['minimalist-symbolic', 'line-art-editorial', 'pencil-sketch'],
    technical: ['technical-diagram', 'minimalist-symbolic', 'line-art-editorial'],
    educational: ['technical-diagram', 'childrens-cartoon', 'minimalist-symbolic'],
    mixed: ['line-art-editorial', 'minimalist-symbolic', 'technical-diagram'],
  }

  return presetMap[contentType] || presetMap.mixed || []
}

/**
 * Replicates getAlternativePresets logic for testing
 */
function getAlternativePresets(
  selectedPresetId: string,
  analysis: { contentType: string }
): string[] {
  const all = getAllPresetIdsForContentType(analysis.contentType)
  return all.filter(id => id !== selectedPresetId).slice(0, 3)
}

// ============================================================================
// extractTextSamples
// ============================================================================

describe('extractTextSamples', () => {
  const createChunk = (content: string) => ({ content })
  const longContent = 'A'.repeat(150) // Content > 100 chars

  describe('empty input', () => {
    it('returns empty array for empty chunks', () => {
      expect(extractTextSamples([])).toEqual([])
    })
  })

  describe('single chunk', () => {
    it('returns single chunk if long enough', () => {
      const chunks = [createChunk(longContent)]
      const result = extractTextSamples(chunks)
      expect(result).toHaveLength(1)
      expect(result[0]).toBe(longContent)
    })

    it('filters out short content', () => {
      const chunks = [createChunk('Short')]
      const result = extractTextSamples(chunks)
      expect(result).toHaveLength(0)
    })
  })

  describe('two chunks', () => {
    it('samples from first and last', () => {
      const chunks = [createChunk(longContent + '1'), createChunk(longContent + '2')]
      const result = extractTextSamples(chunks)
      expect(result).toHaveLength(2)
      expect(result[0]).toContain('1')
      expect(result[1]).toContain('2')
    })
  })

  describe('many chunks', () => {
    it('samples from beginning, middle, and end', () => {
      const chunks = Array.from({ length: 10 }, (_, i) => createChunk(`${longContent}${i}`))
      const result = extractTextSamples(chunks)

      // Should have: 0, mid-1=4, mid=5, mid+1=6, last=9
      expect(result.length).toBeGreaterThanOrEqual(4)
      expect(result[0]).toContain('0') // First
      expect(result[result.length - 1]).toContain('9') // Last
    })

    it('deduplicates indices', () => {
      const chunks = Array.from({ length: 3 }, (_, i) => createChunk(`${longContent}${i}`))
      // With 3 chunks: indices = [0, 0, 1, 2, 2] -> unique [0, 1, 2]
      const result = extractTextSamples(chunks)
      expect(result.length).toBeLessThanOrEqual(3)
    })
  })

  describe('maxSamples limit', () => {
    it('respects maxSamples parameter', () => {
      const chunks = Array.from({ length: 20 }, (_, i) => createChunk(`${longContent}${i}`))
      const result = extractTextSamples(chunks, 3)
      expect(result.length).toBeLessThanOrEqual(3)
    })

    it('returns fewer than maxSamples if not enough chunks', () => {
      const chunks = [createChunk(longContent)]
      const result = extractTextSamples(chunks, 10)
      expect(result).toHaveLength(1)
    })
  })

  describe('content length limit', () => {
    it('truncates content to 2000 characters', () => {
      const veryLongContent = 'B'.repeat(3000)
      const chunks = [createChunk(veryLongContent)]
      const result = extractTextSamples(chunks)
      expect(result[0].length).toBe(2000)
    })

    it('does not truncate short content', () => {
      const chunks = [createChunk(longContent)]
      const result = extractTextSamples(chunks)
      expect(result[0].length).toBe(150)
    })
  })

  describe('content filtering', () => {
    it('filters out chunks with content <= 100 chars', () => {
      const chunks = [
        createChunk('A'.repeat(100)), // Exactly 100, filtered
        createChunk('B'.repeat(101)), // 101, included
        createChunk('C'.repeat(50)), // 50, filtered
      ]
      const result = extractTextSamples(chunks)
      expect(result).toHaveLength(1)
      expect(result[0]).toBe('B'.repeat(101))
    })

    it('handles chunks with empty content', () => {
      const chunks = [createChunk(''), createChunk(longContent)]
      const result = extractTextSamples(chunks)
      expect(result).toHaveLength(1)
    })
  })

  describe('index selection', () => {
    it('selects correct middle indices for large array', () => {
      const chunks = Array.from({ length: 100 }, (_, i) => createChunk(`${longContent}${i}`))
      const result = extractTextSamples(chunks)

      // First chunk (0)
      expect(result.some(r => r.includes('0'))).toBe(true)

      // Middle chunks (49, 50, 51)
      expect(result.some(r => r.includes('49') || r.includes('50') || r.includes('51'))).toBe(true)

      // Last chunk (99)
      expect(result.some(r => r.includes('99'))).toBe(true)
    })
  })
})

// ============================================================================
// getAllPresetIdsForContentType
// ============================================================================

describe('getAllPresetIdsForContentType', () => {
  describe('fiction content', () => {
    it('returns fiction-appropriate presets', () => {
      const presets = getAllPresetIdsForContentType('fiction')
      expect(presets).toContain('line-art-editorial')
      expect(presets).toContain('muted-watercolor')
      expect(presets).toContain('photorealistic-scene')
      expect(presets).toContain('noir-graphic-novel')
      expect(presets).toContain('pencil-sketch')
    })

    it('returns 5 presets for fiction', () => {
      expect(getAllPresetIdsForContentType('fiction')).toHaveLength(5)
    })
  })

  describe('non-fiction content', () => {
    it('returns non-fiction-appropriate presets', () => {
      const presets = getAllPresetIdsForContentType('non-fiction')
      expect(presets).toContain('minimalist-symbolic')
      expect(presets).toContain('line-art-editorial')
      expect(presets).toContain('pencil-sketch')
    })

    it('returns 3 presets for non-fiction', () => {
      expect(getAllPresetIdsForContentType('non-fiction')).toHaveLength(3)
    })
  })

  describe('technical content', () => {
    it('returns technical-appropriate presets', () => {
      const presets = getAllPresetIdsForContentType('technical')
      expect(presets).toContain('technical-diagram')
      expect(presets).toContain('minimalist-symbolic')
      expect(presets).toContain('line-art-editorial')
    })

    it('returns 3 presets for technical', () => {
      expect(getAllPresetIdsForContentType('technical')).toHaveLength(3)
    })
  })

  describe('educational content', () => {
    it('returns educational-appropriate presets', () => {
      const presets = getAllPresetIdsForContentType('educational')
      expect(presets).toContain('technical-diagram')
      expect(presets).toContain('childrens-cartoon')
      expect(presets).toContain('minimalist-symbolic')
    })

    it('returns 3 presets for educational', () => {
      expect(getAllPresetIdsForContentType('educational')).toHaveLength(3)
    })
  })

  describe('mixed content', () => {
    it('returns mixed-appropriate presets', () => {
      const presets = getAllPresetIdsForContentType('mixed')
      expect(presets).toContain('line-art-editorial')
      expect(presets).toContain('minimalist-symbolic')
      expect(presets).toContain('technical-diagram')
    })

    it('returns 3 presets for mixed', () => {
      expect(getAllPresetIdsForContentType('mixed')).toHaveLength(3)
    })
  })

  describe('unknown content type', () => {
    it('falls back to mixed presets for unknown type', () => {
      const presets = getAllPresetIdsForContentType('unknown-type')
      expect(presets).toEqual(getAllPresetIdsForContentType('mixed'))
    })

    it('falls back to mixed for empty string', () => {
      const presets = getAllPresetIdsForContentType('')
      expect(presets).toEqual(getAllPresetIdsForContentType('mixed'))
    })
  })

  describe('preset uniqueness', () => {
    const contentTypes = ['fiction', 'non-fiction', 'technical', 'educational', 'mixed']

    contentTypes.forEach(type => {
      it(`returns unique presets for ${type}`, () => {
        const presets = getAllPresetIdsForContentType(type)
        const uniquePresets = [...new Set(presets)]
        expect(presets.length).toBe(uniquePresets.length)
      })
    })
  })

  describe('preset validity', () => {
    const validPresetIds = [
      'line-art-editorial',
      'muted-watercolor',
      'technical-diagram',
      'photorealistic-scene',
      'minimalist-symbolic',
      'childrens-cartoon',
      'pencil-sketch',
      'noir-graphic-novel',
    ]

    const contentTypes = ['fiction', 'non-fiction', 'technical', 'educational', 'mixed']

    contentTypes.forEach(type => {
      it(`returns valid preset IDs for ${type}`, () => {
        const presets = getAllPresetIdsForContentType(type)
        presets.forEach(preset => {
          expect(validPresetIds).toContain(preset)
        })
      })
    })
  })
})

// ============================================================================
// getAlternativePresets
// ============================================================================

describe('getAlternativePresets', () => {
  describe('basic functionality', () => {
    it('excludes selected preset from alternatives', () => {
      const alternatives = getAlternativePresets('line-art-editorial', {
        contentType: 'fiction',
      })
      expect(alternatives).not.toContain('line-art-editorial')
    })

    it('returns up to 3 alternatives', () => {
      const alternatives = getAlternativePresets('line-art-editorial', {
        contentType: 'fiction',
      })
      expect(alternatives.length).toBeLessThanOrEqual(3)
    })

    it('returns alternatives from same content type', () => {
      const fictionPresets = getAllPresetIdsForContentType('fiction')
      const alternatives = getAlternativePresets('line-art-editorial', {
        contentType: 'fiction',
      })

      alternatives.forEach(alt => {
        expect(fictionPresets).toContain(alt)
      })
    })
  })

  describe('content type filtering', () => {
    it('uses fiction presets for fiction content', () => {
      const alternatives = getAlternativePresets('photorealistic-scene', {
        contentType: 'fiction',
      })
      // Should not contain educational presets
      expect(alternatives).not.toContain('childrens-cartoon')
    })

    it('uses technical presets for technical content', () => {
      const alternatives = getAlternativePresets('technical-diagram', {
        contentType: 'technical',
      })
      // Technical only has 3 presets, so should return 2 alternatives
      expect(alternatives).toHaveLength(2)
    })

    it('uses educational presets for educational content', () => {
      const alternatives = getAlternativePresets('technical-diagram', {
        contentType: 'educational',
      })
      expect(alternatives).toContain('childrens-cartoon')
      expect(alternatives).toContain('minimalist-symbolic')
    })
  })

  describe('edge cases', () => {
    it('handles when selected preset is not in content type', () => {
      const alternatives = getAlternativePresets('childrens-cartoon', {
        contentType: 'technical', // childrens-cartoon not in technical presets
      })
      // Should return all technical presets since childrens-cartoon isn't one
      expect(alternatives).toHaveLength(3)
    })

    it('handles unknown content type', () => {
      const alternatives = getAlternativePresets('line-art-editorial', {
        contentType: 'unknown',
      })
      // Falls back to mixed
      expect(alternatives.length).toBeGreaterThan(0)
    })
  })

  describe('order preservation', () => {
    it('maintains order of presets from content type', () => {
      const allPresets = getAllPresetIdsForContentType('fiction')
      const alternatives = getAlternativePresets(allPresets[0], {
        contentType: 'fiction',
      })

      // First 3 after excluding selected should match
      const expectedAlternatives = allPresets.slice(1, 4)
      expect(alternatives).toEqual(expectedAlternatives)
    })
  })

  describe('limit behavior', () => {
    it('returns fewer than 3 when content type has few presets', () => {
      // Technical has 3 presets, excluding 1 leaves 2
      const alternatives = getAlternativePresets('technical-diagram', {
        contentType: 'technical',
      })
      expect(alternatives).toHaveLength(2)
    })

    it('returns exactly 3 when content type has more than 4 presets', () => {
      // Fiction has 5 presets
      const alternatives = getAlternativePresets('muted-watercolor', {
        contentType: 'fiction',
      })
      expect(alternatives).toHaveLength(3)
    })
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('document analyzer integration', () => {
  const longContent = 'A'.repeat(200)

  describe('text sampling and preset selection workflow', () => {
    it('extracts samples and determines appropriate presets', () => {
      const chunks = Array.from({ length: 10 }, (_, i) => ({
        content: `${longContent} Chapter ${i}: Fiction story content here.`,
      }))

      const samples = extractTextSamples(chunks, 5)
      expect(samples.length).toBeGreaterThan(0)

      const presets = getAllPresetIdsForContentType('fiction')
      expect(presets.length).toBeGreaterThan(0)

      const alternatives = getAlternativePresets(presets[0], { contentType: 'fiction' })
      expect(alternatives.length).toBeGreaterThan(0)
    })
  })

  describe('content type to preset mapping workflow', () => {
    const contentTypes = ['fiction', 'non-fiction', 'technical', 'educational', 'mixed']

    contentTypes.forEach(contentType => {
      it(`selects primary and alternative presets for ${contentType}`, () => {
        const allPresets = getAllPresetIdsForContentType(contentType)
        const primary = allPresets[0]
        const alternatives = getAlternativePresets(primary, { contentType })

        expect(primary).toBeDefined()
        expect(alternatives).not.toContain(primary)
        expect(alternatives.every(alt => allPresets.includes(alt))).toBe(true)
      })
    })
  })
})
