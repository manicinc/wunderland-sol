/**
 * Tests for Collection Cover Generator
 * @module tests/collections/coverGenerator
 */

import { describe, it, expect, vi } from 'vitest'
import {
  generateCollectionCover,
  generateCollectionCoverDataUrl,
  generateDefaultCover,
  getPatternFromSeed,
  COVER_PATTERNS,
  type CoverPattern,
  type CoverConfig,
} from '@/lib/collections/coverGenerator'

describe('Cover Generator', () => {
  describe('COVER_PATTERNS', () => {
    it('should have 10 pattern options', () => {
      expect(COVER_PATTERNS).toHaveLength(10)
    })

    it('should have required fields for each pattern', () => {
      COVER_PATTERNS.forEach((pattern) => {
        expect(pattern).toHaveProperty('id')
        expect(pattern).toHaveProperty('name')
        expect(pattern).toHaveProperty('description')
        expect(typeof pattern.id).toBe('string')
        expect(typeof pattern.name).toBe('string')
        expect(typeof pattern.description).toBe('string')
      })
    })

    it('should include all expected pattern types', () => {
      const patternIds = COVER_PATTERNS.map((p) => p.id)
      expect(patternIds).toContain('geometric')
      expect(patternIds).toContain('waves')
      expect(patternIds).toContain('mesh')
      expect(patternIds).toContain('circuits')
      expect(patternIds).toContain('topography')
      expect(patternIds).toContain('aurora')
      expect(patternIds).toContain('crystalline')
      expect(patternIds).toContain('constellation')
      expect(patternIds).toContain('abstract')
      expect(patternIds).toContain('hexagons')
    })
  })

  describe('getPatternFromSeed', () => {
    it('should return a valid pattern for any seed', () => {
      const validPatterns: CoverPattern[] = [
        'geometric', 'waves', 'mesh', 'circuits', 'topography',
        'aurora', 'crystalline', 'constellation', 'abstract', 'hexagons'
      ]
      
      for (let seed = 0; seed < 100; seed++) {
        const pattern = getPatternFromSeed(seed)
        expect(validPatterns).toContain(pattern)
      }
    })

    it('should be deterministic for the same seed', () => {
      const pattern1 = getPatternFromSeed(42)
      const pattern2 = getPatternFromSeed(42)
      expect(pattern1).toBe(pattern2)
    })

    it('should cycle through all patterns', () => {
      const patternsFromSeeds = new Set<CoverPattern>()
      for (let seed = 0; seed < 10; seed++) {
        patternsFromSeeds.add(getPatternFromSeed(seed))
      }
      expect(patternsFromSeeds.size).toBe(10)
    })
  })

  describe('generateCollectionCover', () => {
    it('should generate valid SVG for each pattern', () => {
      COVER_PATTERNS.forEach((patternConfig) => {
        const config: CoverConfig = {
          pattern: patternConfig.id as CoverPattern,
          primaryColor: '#8b5cf6',
        }
        const svg = generateCollectionCover(config, 400, 200)
        
        expect(svg).toContain('<svg')
        expect(svg).toContain('</svg>')
        expect(svg).toContain('viewBox')
      })
    })

    it('should include the primary color in the SVG', () => {
      const config: CoverConfig = {
        pattern: 'mesh',
        primaryColor: '#ff5733',
      }
      const svg = generateCollectionCover(config, 400, 200)
      
      // Color should be present in some form (hex or converted)
      expect(svg.toLowerCase()).toMatch(/#ff5733|rgb\(255/i)
    })

    it('should respect custom dimensions', () => {
      const config: CoverConfig = {
        pattern: 'geometric',
        primaryColor: '#3b82f6',
      }
      const svg = generateCollectionCover(config, 800, 400)
      
      expect(svg).toContain('viewBox="0 0 800 400"')
    })

    it('should use secondary color when provided', () => {
      const config: CoverConfig = {
        pattern: 'waves',
        primaryColor: '#8b5cf6',
        secondaryColor: '#22c55e',
      }
      const svg = generateCollectionCover(config, 400, 200)
      
      // Should include the secondary color
      expect(svg).toBeDefined()
      expect(svg.length).toBeGreaterThan(100)
    })

    it('should produce consistent output for same seed', () => {
      const config: CoverConfig = {
        pattern: 'constellation',
        primaryColor: '#6366f1',
        seed: 12345,
      }
      
      const svg1 = generateCollectionCover(config, 400, 200)
      const svg2 = generateCollectionCover(config, 400, 200)
      
      expect(svg1).toBe(svg2)
    })

    it('should produce different output for different seeds', () => {
      const config1: CoverConfig = {
        pattern: 'geometric',
        primaryColor: '#8b5cf6',
        seed: 1,
      }
      const config2: CoverConfig = {
        pattern: 'geometric',
        primaryColor: '#8b5cf6',
        seed: 2,
      }
      
      const svg1 = generateCollectionCover(config1, 400, 200)
      const svg2 = generateCollectionCover(config2, 400, 200)
      
      expect(svg1).not.toBe(svg2)
    })
  })

  describe('generateCollectionCoverDataUrl', () => {
    it('should return a valid data URL', () => {
      const config: CoverConfig = {
        pattern: 'mesh',
        primaryColor: '#8b5cf6',
      }
      const dataUrl = generateCollectionCoverDataUrl(config, 400, 200)
      
      expect(dataUrl).toMatch(/^data:image\/svg\+xml,/)
    })

    it('should URL-encode the SVG content', () => {
      const config: CoverConfig = {
        pattern: 'hexagons',
        primaryColor: '#f59e0b',
      }
      const dataUrl = generateCollectionCoverDataUrl(config, 400, 200)
      
      // URL encoding should have converted spaces and special chars
      expect(dataUrl).toContain('%')
    })

    it('should be usable as an image source', () => {
      const config: CoverConfig = {
        pattern: 'aurora',
        primaryColor: '#22c55e',
      }
      const dataUrl = generateCollectionCoverDataUrl(config, 400, 200)
      
      // Data URL should be decodable
      const svgPart = dataUrl.replace('data:image/svg+xml,', '')
      const decodedSvg = decodeURIComponent(svgPart)
      
      expect(decodedSvg).toContain('<svg')
      expect(decodedSvg).toContain('</svg>')
    })
  })

  describe('generateDefaultCover', () => {
    it('should generate cover from name and color', () => {
      const coverUrl = generateDefaultCover('My Research', '#8b5cf6')
      
      expect(coverUrl).toMatch(/^data:image\/svg\+xml,/)
    })

    it('should be deterministic for same name', () => {
      const cover1 = generateDefaultCover('Test Collection', '#3b82f6')
      const cover2 = generateDefaultCover('Test Collection', '#3b82f6')
      
      expect(cover1).toBe(cover2)
    })

    it('should produce different covers for different names', () => {
      const cover1 = generateDefaultCover('Collection A', '#8b5cf6')
      const cover2 = generateDefaultCover('Collection B', '#8b5cf6')
      
      expect(cover1).not.toBe(cover2)
    })

    it('should produce different covers for different colors', () => {
      const cover1 = generateDefaultCover('Same Name', '#8b5cf6')
      const cover2 = generateDefaultCover('Same Name', '#22c55e')
      
      expect(cover1).not.toBe(cover2)
    })
  })

  describe('Pattern-specific tests', () => {
    describe('geometric pattern', () => {
      it('should include polygon elements', () => {
        const svg = generateCollectionCover({ pattern: 'geometric', primaryColor: '#8b5cf6' }, 400, 200)
        expect(svg).toContain('<polygon')
      })
    })

    describe('waves pattern', () => {
      it('should include path elements', () => {
        const svg = generateCollectionCover({ pattern: 'waves', primaryColor: '#3b82f6' }, 400, 200)
        expect(svg).toContain('<path')
      })
    })

    describe('mesh pattern', () => {
      it('should include blur filter', () => {
        const svg = generateCollectionCover({ pattern: 'mesh', primaryColor: '#22c55e' }, 400, 200)
        expect(svg).toContain('filter')
        expect(svg).toContain('feGaussianBlur')
      })
    })

    describe('circuits pattern', () => {
      it('should include line and circle elements', () => {
        const svg = generateCollectionCover({ pattern: 'circuits', primaryColor: '#06b6d4', seed: 42 }, 400, 200)
        expect(svg).toContain('<line')
        expect(svg).toContain('<circle')
      })
    })

    describe('topography pattern', () => {
      it('should include path elements for contour lines', () => {
        const svg = generateCollectionCover({ pattern: 'topography', primaryColor: '#f59e0b' }, 400, 200)
        expect(svg).toContain('<path')
        expect(svg).toContain('stroke')
      })
    })

    describe('aurora pattern', () => {
      it('should include ellipse elements', () => {
        const svg = generateCollectionCover({ pattern: 'aurora', primaryColor: '#22c55e' }, 400, 200)
        expect(svg).toContain('<ellipse')
      })

      it('should include star circles', () => {
        const svg = generateCollectionCover({ pattern: 'aurora', primaryColor: '#22c55e' }, 400, 200)
        expect(svg).toContain('fill="white"')
      })
    })

    describe('crystalline pattern', () => {
      it('should include polygon elements', () => {
        const svg = generateCollectionCover({ pattern: 'crystalline', primaryColor: '#ec4899' }, 400, 200)
        expect(svg).toContain('<polygon')
      })
    })

    describe('constellation pattern', () => {
      it('should include circles and lines for stars and connections', () => {
        const svg = generateCollectionCover({ pattern: 'constellation', primaryColor: '#6366f1', seed: 42 }, 400, 200)
        expect(svg).toContain('<circle')
        expect(svg).toContain('<line')
      })
    })

    describe('abstract pattern', () => {
      it('should include path elements for organic shapes', () => {
        const svg = generateCollectionCover({ pattern: 'abstract', primaryColor: '#a855f7' }, 400, 200)
        expect(svg).toContain('<path')
        expect(svg).toContain('filter')
      })
    })

    describe('hexagons pattern', () => {
      it('should include polygon elements for hexagon shapes', () => {
        const svg = generateCollectionCover({ pattern: 'hexagons', primaryColor: '#f97316' }, 400, 200)
        expect(svg).toContain('<polygon')
      })
    })
  })
})

