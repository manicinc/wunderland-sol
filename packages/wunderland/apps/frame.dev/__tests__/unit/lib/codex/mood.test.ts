/**
 * Mood Module Tests
 * @module __tests__/unit/lib/codex/mood.test
 *
 * Tests for mood tracking system constants and configurations.
 */

import { describe, it, expect } from 'vitest'
import {
  MOOD_CONFIG,
  SLEEP_CONFIG,
  type MoodState,
  type SleepHours,
} from '@/lib/codex/mood'

// ============================================================================
// MOOD_CONFIG
// ============================================================================

describe('MOOD_CONFIG', () => {
  const allMoods: MoodState[] = [
    'focused',
    'creative',
    'curious',
    'relaxed',
    'energetic',
    'reflective',
    'anxious',
    'grateful',
    'tired',
    'peaceful',
    'excited',
    'neutral',
  ]

  it('is defined', () => {
    expect(MOOD_CONFIG).toBeDefined()
  })

  it('has exactly 12 moods', () => {
    expect(Object.keys(MOOD_CONFIG)).toHaveLength(12)
  })

  it('includes all mood states', () => {
    allMoods.forEach((mood) => {
      expect(MOOD_CONFIG[mood]).toBeDefined()
    })
  })

  describe('mood configuration structure', () => {
    allMoods.forEach((mood) => {
      describe(mood, () => {
        it('has label', () => {
          expect(MOOD_CONFIG[mood].label).toBeDefined()
          expect(typeof MOOD_CONFIG[mood].label).toBe('string')
          expect(MOOD_CONFIG[mood].label.length).toBeGreaterThan(0)
        })

        it('has emoji', () => {
          expect(MOOD_CONFIG[mood].emoji).toBeDefined()
          expect(typeof MOOD_CONFIG[mood].emoji).toBe('string')
          expect(MOOD_CONFIG[mood].emoji.length).toBeGreaterThanOrEqual(1)
        })

        it('has color class', () => {
          expect(MOOD_CONFIG[mood].color).toBeDefined()
          expect(typeof MOOD_CONFIG[mood].color).toBe('string')
          expect(MOOD_CONFIG[mood].color).toContain('text-')
          expect(MOOD_CONFIG[mood].color).toContain('bg-')
        })

        it('has darkColor class', () => {
          expect(MOOD_CONFIG[mood].darkColor).toBeDefined()
          expect(typeof MOOD_CONFIG[mood].darkColor).toBe('string')
          expect(MOOD_CONFIG[mood].darkColor).toContain('dark:')
        })

        it('has description', () => {
          expect(MOOD_CONFIG[mood].description).toBeDefined()
          expect(typeof MOOD_CONFIG[mood].description).toBe('string')
          expect(MOOD_CONFIG[mood].description.length).toBeGreaterThan(5)
        })

        it('has suggestedActivities array', () => {
          expect(MOOD_CONFIG[mood].suggestedActivities).toBeDefined()
          expect(Array.isArray(MOOD_CONFIG[mood].suggestedActivities)).toBe(true)
          expect(MOOD_CONFIG[mood].suggestedActivities.length).toBeGreaterThan(0)
        })
      })
    })
  })

  describe('specific mood values', () => {
    it('focused has correct emoji', () => {
      expect(MOOD_CONFIG.focused.emoji).toBe('🎯')
    })

    it('creative has correct emoji', () => {
      expect(MOOD_CONFIG.creative.emoji).toBe('🎨')
    })

    it('curious has correct emoji', () => {
      expect(MOOD_CONFIG.curious.emoji).toBe('🔍')
    })

    it('relaxed has correct emoji', () => {
      expect(MOOD_CONFIG.relaxed.emoji).toBe('🌿')
    })

    it('energetic has correct emoji', () => {
      expect(MOOD_CONFIG.energetic.emoji).toBe('⚡')
    })

    it('reflective has correct emoji', () => {
      expect(MOOD_CONFIG.reflective.emoji).toBe('🌙')
    })

    it('anxious has correct emoji', () => {
      expect(MOOD_CONFIG.anxious.emoji).toBe('😰')
    })

    it('grateful has correct emoji', () => {
      expect(MOOD_CONFIG.grateful.emoji).toBe('🙏')
    })

    it('tired has correct emoji', () => {
      expect(MOOD_CONFIG.tired.emoji).toBe('😴')
    })

    it('peaceful has correct emoji', () => {
      expect(MOOD_CONFIG.peaceful.emoji).toBe('🧘')
    })

    it('excited has correct emoji', () => {
      expect(MOOD_CONFIG.excited.emoji).toBe('🎉')
    })

    it('neutral has correct emoji', () => {
      expect(MOOD_CONFIG.neutral.emoji).toBe('😐')
    })
  })

  describe('suggested activities', () => {
    it('focused suggests deep work activities', () => {
      const activities = MOOD_CONFIG.focused.suggestedActivities
      expect(activities.some((a) => a.toLowerCase().includes('research'))).toBe(true)
    })

    it('creative suggests imaginative activities', () => {
      const activities = MOOD_CONFIG.creative.suggestedActivities
      expect(activities.some((a) => a.toLowerCase().includes('brain') || a.toLowerCase().includes('writ'))).toBe(true)
    })

    it('tired suggests light activities', () => {
      const activities = MOOD_CONFIG.tired.suggestedActivities
      expect(activities.some((a) => a.toLowerCase().includes('quick') || a.toLowerCase().includes('light') || a.toLowerCase().includes('simple'))).toBe(true)
    })

    it('all activities are strings', () => {
      allMoods.forEach((mood) => {
        MOOD_CONFIG[mood].suggestedActivities.forEach((activity) => {
          expect(typeof activity).toBe('string')
          expect(activity.length).toBeGreaterThan(0)
        })
      })
    })
  })

  describe('color consistency', () => {
    it('all colors use Tailwind format', () => {
      allMoods.forEach((mood) => {
        const { color, darkColor } = MOOD_CONFIG[mood]
        expect(color).toMatch(/text-\w+-\d+/)
        expect(color).toMatch(/bg-\w+-\d+/)
        expect(color).toMatch(/border-\w+-\d+/)
        expect(darkColor).toMatch(/dark:/)
      })
    })

    it('all emojis are unique except anxious/tired share context', () => {
      const emojis = allMoods.map((mood) => MOOD_CONFIG[mood].emoji)
      // Most should be unique, allow some overlap
      const uniqueEmojis = new Set(emojis)
      expect(uniqueEmojis.size).toBeGreaterThanOrEqual(10)
    })
  })
})

// ============================================================================
// SLEEP_CONFIG
// ============================================================================

describe('SLEEP_CONFIG', () => {
  const allSleepRanges: SleepHours[] = ['<4', '4-5', '5-6', '6-7', '7-8', '>8']

  it('is defined', () => {
    expect(SLEEP_CONFIG).toBeDefined()
  })

  it('has exactly 6 sleep ranges', () => {
    expect(Object.keys(SLEEP_CONFIG)).toHaveLength(6)
  })

  it('includes all sleep ranges', () => {
    allSleepRanges.forEach((range) => {
      expect(SLEEP_CONFIG[range]).toBeDefined()
    })
  })

  describe('sleep configuration structure', () => {
    allSleepRanges.forEach((range) => {
      describe(range, () => {
        it('has label', () => {
          expect(SLEEP_CONFIG[range].label).toBeDefined()
          expect(typeof SLEEP_CONFIG[range].label).toBe('string')
        })

        it('has emoji', () => {
          expect(SLEEP_CONFIG[range].emoji).toBeDefined()
          expect(typeof SLEEP_CONFIG[range].emoji).toBe('string')
        })

        it('has color class', () => {
          expect(SLEEP_CONFIG[range].color).toBeDefined()
          expect(typeof SLEEP_CONFIG[range].color).toBe('string')
        })

        it('has darkColor class', () => {
          expect(SLEEP_CONFIG[range].darkColor).toBeDefined()
          expect(typeof SLEEP_CONFIG[range].darkColor).toBe('string')
        })

        it('has quality rating', () => {
          expect(SLEEP_CONFIG[range].quality).toBeDefined()
          expect(['poor', 'low', 'moderate', 'good', 'excellent']).toContain(
            SLEEP_CONFIG[range].quality
          )
        })
      })
    })
  })

  describe('quality progression', () => {
    it('<4 hours is poor quality', () => {
      expect(SLEEP_CONFIG['<4'].quality).toBe('poor')
    })

    it('4-5 hours is low quality', () => {
      expect(SLEEP_CONFIG['4-5'].quality).toBe('low')
    })

    it('5-6 hours is moderate quality', () => {
      expect(SLEEP_CONFIG['5-6'].quality).toBe('moderate')
    })

    it('6-7 hours is good quality', () => {
      expect(SLEEP_CONFIG['6-7'].quality).toBe('good')
    })

    it('7-8 hours is excellent quality', () => {
      expect(SLEEP_CONFIG['7-8'].quality).toBe('excellent')
    })

    it('>8 hours is excellent quality', () => {
      expect(SLEEP_CONFIG['>8'].quality).toBe('excellent')
    })
  })

  describe('label descriptions', () => {
    it('<4 has descriptive label', () => {
      expect(SLEEP_CONFIG['<4'].label).toContain('4')
    })

    it('>8 has descriptive label', () => {
      expect(SLEEP_CONFIG['>8'].label).toContain('8')
    })

    it('all labels mention hours', () => {
      allSleepRanges.forEach((range) => {
        expect(SLEEP_CONFIG[range].label.toLowerCase()).toMatch(/hour/)
      })
    })
  })

  describe('color progression', () => {
    it('poor sleep uses red colors', () => {
      expect(SLEEP_CONFIG['<4'].color).toContain('red')
    })

    it('low sleep uses orange colors', () => {
      expect(SLEEP_CONFIG['4-5'].color).toContain('orange')
    })

    it('excellent sleep uses green colors', () => {
      expect(SLEEP_CONFIG['7-8'].color).toMatch(/emerald|teal|green/)
    })
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('mood types integration', () => {
  it('mood configs cover full emotional spectrum', () => {
    const positiveMoods = ['focused', 'creative', 'energetic', 'grateful', 'excited', 'peaceful']
    const neutralMoods = ['curious', 'relaxed', 'reflective', 'neutral']
    const challengingMoods = ['anxious', 'tired']

    positiveMoods.forEach((mood) => {
      expect(MOOD_CONFIG[mood as MoodState]).toBeDefined()
    })

    neutralMoods.forEach((mood) => {
      expect(MOOD_CONFIG[mood as MoodState]).toBeDefined()
    })

    challengingMoods.forEach((mood) => {
      expect(MOOD_CONFIG[mood as MoodState]).toBeDefined()
    })
  })

  it('sleep quality maps to appropriate colors', () => {
    const poorSleep = SLEEP_CONFIG['<4']
    const goodSleep = SLEEP_CONFIG['7-8']

    // Poor sleep should have "warning" colors (red/orange)
    expect(poorSleep.color).toMatch(/red|orange/)

    // Good sleep should have "positive" colors (green/emerald/teal)
    expect(goodSleep.color).toMatch(/emerald|green|teal/)
  })

  it('all configs have consistent dark mode support', () => {
    Object.values(MOOD_CONFIG).forEach((config) => {
      expect(config.darkColor).toContain('dark:')
    })

    Object.values(SLEEP_CONFIG).forEach((config) => {
      expect(config.darkColor).toContain('dark:')
    })
  })
})
