/**
 * Pagination Tests
 * @module __tests__/unit/lib/viewer/pagination.test
 *
 * Tests for pagination utility functions.
 */

import { describe, it, expect } from 'vitest'
import {
  PAGE_CONFIGS,
  inchesToPixels,
  pixelsToInches,
  getPageAtOffset,
  type PageConfig,
  type PageBreak,
  type PaginationResult,
} from '@/lib/viewer/pagination'

describe('pagination module', () => {
  // ============================================================================
  // PAGE_CONFIGS
  // ============================================================================

  describe('PAGE_CONFIGS', () => {
    it('has letter config', () => {
      expect(PAGE_CONFIGS.letter).toBeDefined()
      expect(PAGE_CONFIGS.letter.width).toBe(8.5)
      expect(PAGE_CONFIGS.letter.height).toBe(11)
    })

    it('has a4 config', () => {
      expect(PAGE_CONFIGS.a4).toBeDefined()
      expect(PAGE_CONFIGS.a4.width).toBe(8.27)
      expect(PAGE_CONFIGS.a4.height).toBe(11.69)
    })

    it('letter has standard margins', () => {
      const { letter } = PAGE_CONFIGS
      expect(letter.marginTop).toBe(1)
      expect(letter.marginRight).toBe(1)
      expect(letter.marginBottom).toBe(1)
      expect(letter.marginLeft).toBe(1)
    })

    it('a4 has different margins', () => {
      const { a4 } = PAGE_CONFIGS
      expect(a4.marginTop).toBe(1)
      expect(a4.marginRight).toBe(0.79)
      expect(a4.marginBottom).toBe(1)
      expect(a4.marginLeft).toBe(0.79)
    })

    it('both have 96 dpi', () => {
      expect(PAGE_CONFIGS.letter.dpi).toBe(96)
      expect(PAGE_CONFIGS.a4.dpi).toBe(96)
    })
  })

  // ============================================================================
  // inchesToPixels
  // ============================================================================

  describe('inchesToPixels', () => {
    it('converts inches to pixels with default dpi', () => {
      expect(inchesToPixels(1)).toBe(96)
      expect(inchesToPixels(2)).toBe(192)
      expect(inchesToPixels(0.5)).toBe(48)
    })

    it('converts inches with custom dpi', () => {
      expect(inchesToPixels(1, 72)).toBe(72)
      expect(inchesToPixels(2, 144)).toBe(288)
      expect(inchesToPixels(1, 300)).toBe(300)
    })

    it('handles zero inches', () => {
      expect(inchesToPixels(0)).toBe(0)
    })

    it('handles fractional inches', () => {
      expect(inchesToPixels(0.25, 96)).toBe(24)
      expect(inchesToPixels(0.75, 96)).toBe(72)
    })

    it('handles large values', () => {
      expect(inchesToPixels(100, 96)).toBe(9600)
    })
  })

  // ============================================================================
  // pixelsToInches
  // ============================================================================

  describe('pixelsToInches', () => {
    it('converts pixels to inches with default dpi', () => {
      expect(pixelsToInches(96)).toBe(1)
      expect(pixelsToInches(192)).toBe(2)
      expect(pixelsToInches(48)).toBe(0.5)
    })

    it('converts pixels with custom dpi', () => {
      expect(pixelsToInches(72, 72)).toBe(1)
      expect(pixelsToInches(288, 144)).toBe(2)
      expect(pixelsToInches(300, 300)).toBe(1)
    })

    it('handles zero pixels', () => {
      expect(pixelsToInches(0)).toBe(0)
    })

    it('handles fractional results', () => {
      expect(pixelsToInches(24, 96)).toBe(0.25)
      expect(pixelsToInches(72, 96)).toBe(0.75)
    })

    it('is inverse of inchesToPixels', () => {
      const inches = 5.5
      const dpi = 96
      expect(pixelsToInches(inchesToPixels(inches, dpi), dpi)).toBe(inches)
    })
  })

  // ============================================================================
  // getPageAtOffset
  // ============================================================================

  describe('getPageAtOffset', () => {
    const pageHeight = 1000

    it('returns 1 for offset 0', () => {
      expect(getPageAtOffset(0, pageHeight)).toBe(1)
    })

    it('returns 1 for first page', () => {
      expect(getPageAtOffset(500, pageHeight)).toBe(1)
      expect(getPageAtOffset(999, pageHeight)).toBe(1)
    })

    it('returns 2 for second page', () => {
      expect(getPageAtOffset(1000, pageHeight)).toBe(2)
      expect(getPageAtOffset(1500, pageHeight)).toBe(2)
      expect(getPageAtOffset(1999, pageHeight)).toBe(2)
    })

    it('returns correct page for large offset', () => {
      expect(getPageAtOffset(5000, pageHeight)).toBe(6)
      expect(getPageAtOffset(10000, pageHeight)).toBe(11)
    })

    it('handles different page heights', () => {
      expect(getPageAtOffset(500, 500)).toBe(2)
      expect(getPageAtOffset(500, 250)).toBe(3)
    })

    it('handles edge case at page boundary', () => {
      expect(getPageAtOffset(1000, 1000)).toBe(2)
      expect(getPageAtOffset(2000, 1000)).toBe(3)
    })
  })

  // ============================================================================
  // Type exports
  // ============================================================================

  describe('type exports', () => {
    it('PageConfig type is valid', () => {
      const config: PageConfig = {
        width: 8.5,
        height: 11,
        marginTop: 1,
        marginRight: 1,
        marginBottom: 1,
        marginLeft: 1,
        dpi: 96,
      }

      expect(config.width).toBe(8.5)
      expect(config.height).toBe(11)
    })

    it('PageBreak type is valid', () => {
      const pageBreak: PageBreak = {
        pageNumber: 1,
        offset: 0,
      }

      expect(pageBreak.pageNumber).toBe(1)
      expect(pageBreak.offset).toBe(0)
      expect(pageBreak.startElement).toBeUndefined()
    })

    it('PaginationResult type is valid', () => {
      const result: PaginationResult = {
        totalPages: 5,
        pageBreaks: [{ pageNumber: 1, offset: 0 }],
        contentHeight: 5000,
        pageHeight: 1000,
      }

      expect(result.totalPages).toBe(5)
      expect(result.pageBreaks).toHaveLength(1)
    })
  })

  // ============================================================================
  // Letter page calculations
  // ============================================================================

  describe('letter page calculations', () => {
    const { letter } = PAGE_CONFIGS

    it('calculates usable width', () => {
      const usableWidth = letter.width - letter.marginLeft - letter.marginRight
      expect(usableWidth).toBe(6.5)
    })

    it('calculates usable height', () => {
      const usableHeight = letter.height - letter.marginTop - letter.marginBottom
      expect(usableHeight).toBe(9)
    })

    it('calculates content area in pixels', () => {
      const usableHeight = letter.height - letter.marginTop - letter.marginBottom
      const contentHeightPx = inchesToPixels(usableHeight, letter.dpi)
      expect(contentHeightPx).toBe(864)
    })
  })

  // ============================================================================
  // A4 page calculations
  // ============================================================================

  describe('a4 page calculations', () => {
    const { a4 } = PAGE_CONFIGS

    it('calculates usable width', () => {
      const usableWidth = a4.width - a4.marginLeft - a4.marginRight
      expect(usableWidth).toBeCloseTo(6.69, 2)
    })

    it('calculates usable height', () => {
      const usableHeight = a4.height - a4.marginTop - a4.marginBottom
      expect(usableHeight).toBeCloseTo(9.69, 2)
    })

    it('calculates content area in pixels', () => {
      const usableHeight = a4.height - a4.marginTop - a4.marginBottom
      const contentHeightPx = inchesToPixels(usableHeight, a4.dpi)
      expect(contentHeightPx).toBeCloseTo(930.24, 2)
    })
  })

  // ============================================================================
  // Edge cases
  // ============================================================================

  describe('edge cases', () => {
    it('handles negative offset in getPageAtOffset', () => {
      // Negative offset should still work (returns 0 due to floor)
      const result = getPageAtOffset(-500, 1000)
      expect(result).toBe(0)
    })

    it('handles very small page height', () => {
      expect(getPageAtOffset(100, 1)).toBe(101)
    })

    it('handles decimal page height', () => {
      expect(getPageAtOffset(100, 33.3)).toBe(4)
    })
  })
})
