/**
 * Reflect Types Tests
 * @module __tests__/unit/lib/reflect/types.test
 *
 * Tests for reflect mode type definitions, constants, and utility functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getReflectionTimeOfDay,
  REFLECTIONS_STORAGE_KEY,
  RELATIONSHIPS_STORAGE_KEY,
  REFLECTIONS_WEAVE,
  LEGACY_DAILY_NOTES_WEAVE,
  LEGACY_DAILY_NOTES_LOOM,
  MOOD_VALUES,
  MOOD_EMOJIS,
  MOOD_DISPLAY_CONFIG,
  WEATHER_EMOJIS,
  type ReflectionTimeOfDay,
} from '@/lib/reflect/types'
import type { MoodState } from '@/lib/codex/mood'

// ============================================================================
// getReflectionTimeOfDay
// ============================================================================

describe('getReflectionTimeOfDay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('morning hours (5-11)', () => {
    it('returns morning at 5:00', () => {
      vi.setSystemTime(new Date(2025, 0, 1, 5, 0, 0))
      expect(getReflectionTimeOfDay()).toBe('morning')
    })

    it('returns morning at 8:00', () => {
      vi.setSystemTime(new Date(2025, 0, 1, 8, 0, 0))
      expect(getReflectionTimeOfDay()).toBe('morning')
    })

    it('returns morning at 11:59', () => {
      vi.setSystemTime(new Date(2025, 0, 1, 11, 59, 0))
      expect(getReflectionTimeOfDay()).toBe('morning')
    })
  })

  describe('afternoon hours (12-16)', () => {
    it('returns afternoon at 12:00', () => {
      vi.setSystemTime(new Date(2025, 0, 1, 12, 0, 0))
      expect(getReflectionTimeOfDay()).toBe('afternoon')
    })

    it('returns afternoon at 14:00', () => {
      vi.setSystemTime(new Date(2025, 0, 1, 14, 0, 0))
      expect(getReflectionTimeOfDay()).toBe('afternoon')
    })

    it('returns afternoon at 16:59', () => {
      vi.setSystemTime(new Date(2025, 0, 1, 16, 59, 0))
      expect(getReflectionTimeOfDay()).toBe('afternoon')
    })
  })

  describe('evening hours (17-20)', () => {
    it('returns evening at 17:00', () => {
      vi.setSystemTime(new Date(2025, 0, 1, 17, 0, 0))
      expect(getReflectionTimeOfDay()).toBe('evening')
    })

    it('returns evening at 19:00', () => {
      vi.setSystemTime(new Date(2025, 0, 1, 19, 0, 0))
      expect(getReflectionTimeOfDay()).toBe('evening')
    })

    it('returns evening at 20:59', () => {
      vi.setSystemTime(new Date(2025, 0, 1, 20, 59, 0))
      expect(getReflectionTimeOfDay()).toBe('evening')
    })
  })

  describe('night hours (21-4)', () => {
    it('returns night at 21:00', () => {
      vi.setSystemTime(new Date(2025, 0, 1, 21, 0, 0))
      expect(getReflectionTimeOfDay()).toBe('night')
    })

    it('returns night at 23:59', () => {
      vi.setSystemTime(new Date(2025, 0, 1, 23, 59, 0))
      expect(getReflectionTimeOfDay()).toBe('night')
    })

    it('returns night at 00:00', () => {
      vi.setSystemTime(new Date(2025, 0, 1, 0, 0, 0))
      expect(getReflectionTimeOfDay()).toBe('night')
    })

    it('returns night at 04:59', () => {
      vi.setSystemTime(new Date(2025, 0, 1, 4, 59, 0))
      expect(getReflectionTimeOfDay()).toBe('night')
    })
  })

  it('covers all 24 hours', () => {
    const results: Record<ReflectionTimeOfDay, number[]> = {
      morning: [],
      afternoon: [],
      evening: [],
      night: [],
    }

    for (let hour = 0; hour < 24; hour++) {
      vi.setSystemTime(new Date(2025, 0, 1, hour, 30, 0))
      const timeOfDay = getReflectionTimeOfDay()
      results[timeOfDay].push(hour)
    }

    // All hours should be classified
    const allHours = [
      ...results.morning,
      ...results.afternoon,
      ...results.evening,
      ...results.night,
    ]
    expect(allHours.sort((a, b) => a - b)).toEqual(
      Array.from({ length: 24 }, (_, i) => i)
    )
  })
})

// ============================================================================
// Storage Keys
// ============================================================================

describe('storage keys', () => {
  it('REFLECTIONS_STORAGE_KEY has correct value', () => {
    expect(REFLECTIONS_STORAGE_KEY).toBe('codex-reflections')
  })

  it('RELATIONSHIPS_STORAGE_KEY has correct value', () => {
    expect(RELATIONSHIPS_STORAGE_KEY).toBe('codex-relationships')
  })

  it('storage keys are unique', () => {
    expect(REFLECTIONS_STORAGE_KEY).not.toBe(RELATIONSHIPS_STORAGE_KEY)
  })

  it('storage keys have codex prefix', () => {
    expect(REFLECTIONS_STORAGE_KEY).toMatch(/^codex-/)
    expect(RELATIONSHIPS_STORAGE_KEY).toMatch(/^codex-/)
  })
})

// ============================================================================
// Weave/Loom Paths
// ============================================================================

describe('weave and loom paths', () => {
  it('REFLECTIONS_WEAVE has correct value', () => {
    expect(REFLECTIONS_WEAVE).toBe('reflections')
  })

  it('LEGACY_DAILY_NOTES_WEAVE has correct value', () => {
    expect(LEGACY_DAILY_NOTES_WEAVE).toBe('journal')
  })

  it('LEGACY_DAILY_NOTES_LOOM has correct value', () => {
    expect(LEGACY_DAILY_NOTES_LOOM).toBe('daily')
  })

  it('all paths are lowercase', () => {
    expect(REFLECTIONS_WEAVE).toBe(REFLECTIONS_WEAVE.toLowerCase())
    expect(LEGACY_DAILY_NOTES_WEAVE).toBe(LEGACY_DAILY_NOTES_WEAVE.toLowerCase())
    expect(LEGACY_DAILY_NOTES_LOOM).toBe(LEGACY_DAILY_NOTES_LOOM.toLowerCase())
  })
})

// ============================================================================
// MOOD_VALUES
// ============================================================================

describe('MOOD_VALUES', () => {
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

  it('has values for all 12 moods', () => {
    expect(Object.keys(MOOD_VALUES)).toHaveLength(12)
  })

  it('has value for each mood', () => {
    for (const mood of allMoods) {
      expect(MOOD_VALUES[mood]).toBeDefined()
    }
  })

  it('all values are between 1 and 5', () => {
    for (const value of Object.values(MOOD_VALUES)) {
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(5)
    }
  })

  describe('positive moods have high values', () => {
    it('creative has value 5', () => {
      expect(MOOD_VALUES.creative).toBe(5)
    })

    it('energetic has value 5', () => {
      expect(MOOD_VALUES.energetic).toBe(5)
    })

    it('grateful has value 5', () => {
      expect(MOOD_VALUES.grateful).toBe(5)
    })

    it('excited has value 5', () => {
      expect(MOOD_VALUES.excited).toBe(5)
    })
  })

  describe('neutral moods have middle values', () => {
    it('neutral has value 3', () => {
      expect(MOOD_VALUES.neutral).toBe(3)
    })

    it('relaxed has value 3', () => {
      expect(MOOD_VALUES.relaxed).toBe(3)
    })

    it('reflective has value 3', () => {
      expect(MOOD_VALUES.reflective).toBe(3)
    })
  })

  describe('negative moods have low values', () => {
    it('anxious has value 2', () => {
      expect(MOOD_VALUES.anxious).toBe(2)
    })

    it('tired has value 2', () => {
      expect(MOOD_VALUES.tired).toBe(2)
    })
  })

  it('focused and peaceful have value 4', () => {
    expect(MOOD_VALUES.focused).toBe(4)
    expect(MOOD_VALUES.peaceful).toBe(4)
    expect(MOOD_VALUES.curious).toBe(4)
  })
})

// ============================================================================
// MOOD_EMOJIS
// ============================================================================

describe('MOOD_EMOJIS', () => {
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

  it('has emojis for all 12 moods', () => {
    expect(Object.keys(MOOD_EMOJIS)).toHaveLength(12)
  })

  it('has emoji for each mood', () => {
    for (const mood of allMoods) {
      expect(MOOD_EMOJIS[mood]).toBeDefined()
      expect(typeof MOOD_EMOJIS[mood]).toBe('string')
    }
  })

  it('all emojis are non-empty', () => {
    for (const emoji of Object.values(MOOD_EMOJIS)) {
      expect(emoji.length).toBeGreaterThan(0)
    }
  })

  describe('specific emoji mappings', () => {
    it('focused uses target emoji', () => {
      expect(MOOD_EMOJIS.focused).toBe('🎯')
    })

    it('creative uses palette emoji', () => {
      expect(MOOD_EMOJIS.creative).toBe('🎨')
    })

    it('curious uses magnifying glass emoji', () => {
      expect(MOOD_EMOJIS.curious).toBe('🔍')
    })

    it('relaxed uses relieved face emoji', () => {
      expect(MOOD_EMOJIS.relaxed).toBe('😌')
    })

    it('energetic uses lightning emoji', () => {
      expect(MOOD_EMOJIS.energetic).toBe('⚡')
    })

    it('reflective uses thought bubble emoji', () => {
      expect(MOOD_EMOJIS.reflective).toBe('💭')
    })

    it('anxious uses anxious face emoji', () => {
      expect(MOOD_EMOJIS.anxious).toBe('😰')
    })

    it('grateful uses prayer hands emoji', () => {
      expect(MOOD_EMOJIS.grateful).toBe('🙏')
    })

    it('tired uses sleeping face emoji', () => {
      expect(MOOD_EMOJIS.tired).toBe('😴')
    })

    it('peaceful uses meditation emoji', () => {
      expect(MOOD_EMOJIS.peaceful).toBe('🧘')
    })

    it('excited uses party emoji', () => {
      expect(MOOD_EMOJIS.excited).toBe('🎉')
    })

    it('neutral uses neutral face emoji', () => {
      expect(MOOD_EMOJIS.neutral).toBe('😐')
    })
  })

  it('all emojis are unique', () => {
    const emojis = Object.values(MOOD_EMOJIS)
    const unique = new Set(emojis)
    expect(unique.size).toBe(emojis.length)
  })
})

// ============================================================================
// MOOD_DISPLAY_CONFIG
// ============================================================================

describe('MOOD_DISPLAY_CONFIG', () => {
  it('has config for all 12 moods', () => {
    expect(MOOD_DISPLAY_CONFIG).toHaveLength(12)
  })

  it('each config has required properties', () => {
    for (const config of MOOD_DISPLAY_CONFIG) {
      expect(config.id).toBeDefined()
      expect(config.label).toBeDefined()
      expect(config.color).toBeDefined()
      expect(config.description).toBeDefined()
    }
  })

  it('all ids are unique', () => {
    const ids = MOOD_DISPLAY_CONFIG.map((c) => c.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('all colors are valid hex colors', () => {
    for (const config of MOOD_DISPLAY_CONFIG) {
      expect(config.color).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('all labels are capitalized', () => {
    for (const config of MOOD_DISPLAY_CONFIG) {
      expect(config.label[0]).toBe(config.label[0].toUpperCase())
    }
  })

  it('all descriptions are non-empty', () => {
    for (const config of MOOD_DISPLAY_CONFIG) {
      expect(config.description.length).toBeGreaterThan(0)
    }
  })

  describe('specific configs', () => {
    it('focused has cyan color', () => {
      const focused = MOOD_DISPLAY_CONFIG.find((c) => c.id === 'focused')
      expect(focused?.color).toBe('#06b6d4')
      expect(focused?.label).toBe('Focused')
    })

    it('creative has pink color', () => {
      const creative = MOOD_DISPLAY_CONFIG.find((c) => c.id === 'creative')
      expect(creative?.color).toBe('#ec4899')
    })

    it('anxious has orange color', () => {
      const anxious = MOOD_DISPLAY_CONFIG.find((c) => c.id === 'anxious')
      expect(anxious?.color).toBe('#f97316')
    })

    it('neutral has gray color', () => {
      const neutral = MOOD_DISPLAY_CONFIG.find((c) => c.id === 'neutral')
      expect(neutral?.color).toBe('#71717a')
    })
  })

  it('config ids match MOOD_VALUES keys', () => {
    const configIds = MOOD_DISPLAY_CONFIG.map((c) => c.id).sort()
    const moodValueKeys = Object.keys(MOOD_VALUES).sort()
    expect(configIds).toEqual(moodValueKeys)
  })

  it('config ids match MOOD_EMOJIS keys', () => {
    const configIds = MOOD_DISPLAY_CONFIG.map((c) => c.id).sort()
    const moodEmojiKeys = Object.keys(MOOD_EMOJIS).sort()
    expect(configIds).toEqual(moodEmojiKeys)
  })
})

// ============================================================================
// WEATHER_EMOJIS
// ============================================================================

describe('WEATHER_EMOJIS', () => {
  const weatherTypes = [
    'sunny',
    'cloudy',
    'rainy',
    'snowy',
    'stormy',
    'foggy',
    'windy',
    'clear',
  ] as const

  it('has emojis for all 8 weather types', () => {
    expect(Object.keys(WEATHER_EMOJIS)).toHaveLength(8)
  })

  it('has emoji for each weather type', () => {
    for (const type of weatherTypes) {
      expect(WEATHER_EMOJIS[type]).toBeDefined()
    }
  })

  describe('specific weather emojis', () => {
    it('sunny uses sun emoji', () => {
      expect(WEATHER_EMOJIS.sunny).toBe('☀️')
    })

    it('cloudy uses cloud emoji', () => {
      expect(WEATHER_EMOJIS.cloudy).toBe('☁️')
    })

    it('rainy uses rain emoji', () => {
      expect(WEATHER_EMOJIS.rainy).toBe('🌧️')
    })

    it('snowy uses snowflake emoji', () => {
      expect(WEATHER_EMOJIS.snowy).toBe('❄️')
    })

    it('stormy uses storm emoji', () => {
      expect(WEATHER_EMOJIS.stormy).toBe('⛈️')
    })

    it('foggy uses fog emoji', () => {
      expect(WEATHER_EMOJIS.foggy).toBe('🌫️')
    })

    it('windy uses wind emoji', () => {
      expect(WEATHER_EMOJIS.windy).toBe('💨')
    })

    it('clear uses moon emoji', () => {
      expect(WEATHER_EMOJIS.clear).toBe('🌙')
    })
  })

  it('all weather emojis are unique', () => {
    const emojis = Object.values(WEATHER_EMOJIS)
    const unique = new Set(emojis)
    expect(unique.size).toBe(emojis.length)
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('reflect types integration', () => {
  it('all mood constants have consistent keys', () => {
    const valueKeys = Object.keys(MOOD_VALUES).sort()
    const emojiKeys = Object.keys(MOOD_EMOJIS).sort()
    const configIds = MOOD_DISPLAY_CONFIG.map((c) => c.id).sort()

    expect(valueKeys).toEqual(emojiKeys)
    expect(valueKeys).toEqual(configIds)
  })

  it('positive moods (value >= 4) have distinct colors', () => {
    const positiveMoods = Object.entries(MOOD_VALUES)
      .filter(([_, value]) => value >= 4)
      .map(([mood]) => mood)

    const positiveConfigs = MOOD_DISPLAY_CONFIG.filter((c) =>
      positiveMoods.includes(c.id)
    )

    const colors = positiveConfigs.map((c) => c.color)
    const unique = new Set(colors)
    expect(unique.size).toBe(colors.length)
  })

  it('time of day function returns valid type', () => {
    const times: ReflectionTimeOfDay[] = ['morning', 'afternoon', 'evening', 'night']
    const result = getReflectionTimeOfDay()
    expect(times).toContain(result)
  })
})
