/**
 * Analytics Types Tests
 * @module __tests__/unit/lib/analytics/types.test
 *
 * Tests for analytics type constants and configurations.
 */

import { describe, it, expect } from 'vitest'
import {
  TIME_RANGE_CONFIG,
  CHART_COLORS,
  STACKED_COLORS,
  type TimeRange,
} from '@/lib/analytics/types'

// ============================================================================
// TIME_RANGE_CONFIG
// ============================================================================

describe('TIME_RANGE_CONFIG', () => {
  it('has config for week', () => {
    expect(TIME_RANGE_CONFIG.week).toBeDefined()
    expect(TIME_RANGE_CONFIG.week.label).toBe('This Week')
    expect(TIME_RANGE_CONFIG.week.days).toBe(7)
    expect(TIME_RANGE_CONFIG.week.format).toBe('EEE')
  })

  it('has config for month', () => {
    expect(TIME_RANGE_CONFIG.month).toBeDefined()
    expect(TIME_RANGE_CONFIG.month.label).toBe('This Month')
    expect(TIME_RANGE_CONFIG.month.days).toBe(30)
    expect(TIME_RANGE_CONFIG.month.format).toBe('MMM d')
  })

  it('has config for quarter', () => {
    expect(TIME_RANGE_CONFIG.quarter).toBeDefined()
    expect(TIME_RANGE_CONFIG.quarter.label).toBe('This Quarter')
    expect(TIME_RANGE_CONFIG.quarter.days).toBe(90)
  })

  it('has config for year', () => {
    expect(TIME_RANGE_CONFIG.year).toBeDefined()
    expect(TIME_RANGE_CONFIG.year.label).toBe('This Year')
    expect(TIME_RANGE_CONFIG.year.days).toBe(365)
    expect(TIME_RANGE_CONFIG.year.format).toBe('MMM')
  })

  it('has config for all time', () => {
    expect(TIME_RANGE_CONFIG.all).toBeDefined()
    expect(TIME_RANGE_CONFIG.all.label).toBe('All Time')
    expect(TIME_RANGE_CONFIG.all.days).toBe(-1)
    expect(TIME_RANGE_CONFIG.all.format).toBe('MMM yyyy')
  })

  it('all time ranges have required fields', () => {
    const ranges: TimeRange[] = ['week', 'month', 'quarter', 'year', 'all']

    for (const range of ranges) {
      const config = TIME_RANGE_CONFIG[range]
      expect(config.label).toBeDefined()
      expect(typeof config.label).toBe('string')
      expect(config.days).toBeDefined()
      expect(typeof config.days).toBe('number')
      expect(config.format).toBeDefined()
      expect(typeof config.format).toBe('string')
    }
  })

  it('days are ordered correctly (except all)', () => {
    expect(TIME_RANGE_CONFIG.week.days).toBeLessThan(TIME_RANGE_CONFIG.month.days)
    expect(TIME_RANGE_CONFIG.month.days).toBeLessThan(TIME_RANGE_CONFIG.quarter.days)
    expect(TIME_RANGE_CONFIG.quarter.days).toBeLessThan(TIME_RANGE_CONFIG.year.days)
    expect(TIME_RANGE_CONFIG.all.days).toBe(-1) // Special case for "no limit"
  })

  it('labels are unique', () => {
    const labels = Object.values(TIME_RANGE_CONFIG).map((c) => c.label)
    const uniqueLabels = new Set(labels)
    expect(uniqueLabels.size).toBe(labels.length)
  })
})

// ============================================================================
// CHART_COLORS
// ============================================================================

describe('CHART_COLORS', () => {
  describe('light theme', () => {
    it('has primary color', () => {
      expect(CHART_COLORS.light.primary).toBe('#10B981')
    })

    it('has secondary color', () => {
      expect(CHART_COLORS.light.secondary).toBe('#06B6D4')
    })

    it('has tertiary color', () => {
      expect(CHART_COLORS.light.tertiary).toBe('#8B5CF6')
    })

    it('has quaternary color', () => {
      expect(CHART_COLORS.light.quaternary).toBe('#F59E0B')
    })

    it('has quinary color', () => {
      expect(CHART_COLORS.light.quinary).toBe('#EC4899')
    })

    it('has senary color', () => {
      expect(CHART_COLORS.light.senary).toBe('#3B82F6')
    })

    it('has grid color', () => {
      expect(CHART_COLORS.light.grid).toBe('#E5E7EB')
    })

    it('has text color', () => {
      expect(CHART_COLORS.light.text).toBe('#374151')
    })

    it('has textMuted color', () => {
      expect(CHART_COLORS.light.textMuted).toBe('#9CA3AF')
    })

    it('has background color', () => {
      expect(CHART_COLORS.light.background).toBe('#FFFFFF')
    })

    it('all colors are valid hex codes', () => {
      const hexRegex = /^#[0-9A-F]{6}$/i
      for (const color of Object.values(CHART_COLORS.light)) {
        expect(color).toMatch(hexRegex)
      }
    })
  })

  describe('dark theme', () => {
    it('has primary color', () => {
      expect(CHART_COLORS.dark.primary).toBe('#34D399')
    })

    it('has secondary color', () => {
      expect(CHART_COLORS.dark.secondary).toBe('#22D3EE')
    })

    it('has grid color', () => {
      expect(CHART_COLORS.dark.grid).toBe('#3F3F46')
    })

    it('has text color', () => {
      expect(CHART_COLORS.dark.text).toBe('#E4E4E7')
    })

    it('has background color', () => {
      expect(CHART_COLORS.dark.background).toBe('#18181B')
    })

    it('all colors are valid hex codes', () => {
      const hexRegex = /^#[0-9A-F]{6}$/i
      for (const color of Object.values(CHART_COLORS.dark)) {
        expect(color).toMatch(hexRegex)
      }
    })
  })

  describe('light and dark consistency', () => {
    it('have the same keys', () => {
      const lightKeys = Object.keys(CHART_COLORS.light).sort()
      const darkKeys = Object.keys(CHART_COLORS.dark).sort()
      expect(lightKeys).toEqual(darkKeys)
    })

    it('dark colors are different from light', () => {
      for (const key of Object.keys(CHART_COLORS.light) as (keyof typeof CHART_COLORS.light)[]) {
        expect(CHART_COLORS.dark[key]).not.toBe(CHART_COLORS.light[key])
      }
    })
  })
})

// ============================================================================
// STACKED_COLORS
// ============================================================================

describe('STACKED_COLORS', () => {
  it('has 8 colors', () => {
    expect(STACKED_COLORS).toHaveLength(8)
  })

  it('all colors are valid hex codes', () => {
    const hexRegex = /^#[0-9A-F]{6}$/i
    for (const color of STACKED_COLORS) {
      expect(color).toMatch(hexRegex)
    }
  })

  it('includes emerald color', () => {
    expect(STACKED_COLORS).toContain('#10B981')
  })

  it('includes cyan color', () => {
    expect(STACKED_COLORS).toContain('#06B6D4')
  })

  it('includes violet color', () => {
    expect(STACKED_COLORS).toContain('#8B5CF6')
  })

  it('includes amber color', () => {
    expect(STACKED_COLORS).toContain('#F59E0B')
  })

  it('includes pink color', () => {
    expect(STACKED_COLORS).toContain('#EC4899')
  })

  it('includes blue color', () => {
    expect(STACKED_COLORS).toContain('#3B82F6')
  })

  it('includes red color', () => {
    expect(STACKED_COLORS).toContain('#EF4444')
  })

  it('includes lime color', () => {
    expect(STACKED_COLORS).toContain('#84CC16')
  })

  it('all colors are unique', () => {
    const uniqueColors = new Set(STACKED_COLORS)
    expect(uniqueColors.size).toBe(STACKED_COLORS.length)
  })

  it('first color matches chart primary color', () => {
    expect(STACKED_COLORS[0]).toBe(CHART_COLORS.light.primary)
  })
})
