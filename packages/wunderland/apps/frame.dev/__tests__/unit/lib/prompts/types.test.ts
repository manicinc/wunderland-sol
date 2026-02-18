/**
 * Prompts Types Tests
 * @module __tests__/unit/lib/prompts/types.test
 *
 * Tests for prompt gallery type constants and configurations.
 */

import { describe, it, expect } from 'vitest'
import {
  IMAGE_STYLES,
  DEFAULT_PROMPT_PREFERENCES,
  CATEGORY_DISPLAY,
  MOOD_GRADIENTS,
  type ImageStyle,
} from '@/lib/prompts/types'

// ============================================================================
// IMAGE_STYLES
// ============================================================================

describe('IMAGE_STYLES', () => {
  const allStyles: ImageStyle[] = [
    'watercolor',
    'minimalist',
    'abstract',
    'nature',
    'cosmic',
    'vintage',
  ]

  it('is defined', () => {
    expect(IMAGE_STYLES).toBeDefined()
  })

  it('has exactly 6 styles', () => {
    expect(Object.keys(IMAGE_STYLES)).toHaveLength(6)
  })

  it('includes all style types', () => {
    allStyles.forEach((style) => {
      expect(IMAGE_STYLES[style]).toBeDefined()
    })
  })

  describe('style configurations', () => {
    allStyles.forEach((style) => {
      describe(style, () => {
        it('has matching id', () => {
          expect(IMAGE_STYLES[style].id).toBe(style)
        })

        it('has label', () => {
          expect(IMAGE_STYLES[style].label).toBeDefined()
          expect(typeof IMAGE_STYLES[style].label).toBe('string')
          expect(IMAGE_STYLES[style].label.length).toBeGreaterThan(0)
        })

        it('has description', () => {
          expect(IMAGE_STYLES[style].description).toBeDefined()
          expect(typeof IMAGE_STYLES[style].description).toBe('string')
          expect(IMAGE_STYLES[style].description.length).toBeGreaterThan(0)
        })

        it('has promptSuffix for DALL-E', () => {
          expect(IMAGE_STYLES[style].promptSuffix).toBeDefined()
          expect(typeof IMAGE_STYLES[style].promptSuffix).toBe('string')
          expect(IMAGE_STYLES[style].promptSuffix.length).toBeGreaterThan(10)
        })
      })
    })
  })

  describe('specific style values', () => {
    it('watercolor has artistic description', () => {
      expect(IMAGE_STYLES.watercolor.label).toBe('Watercolor')
      expect(IMAGE_STYLES.watercolor.description).toContain('flowing colors')
      expect(IMAGE_STYLES.watercolor.promptSuffix).toContain('watercolor')
    })

    it('minimalist has clean description', () => {
      expect(IMAGE_STYLES.minimalist.label).toBe('Minimalist')
      expect(IMAGE_STYLES.minimalist.description).toContain('Clean lines')
      expect(IMAGE_STYLES.minimalist.promptSuffix).toContain('minimalist')
    })

    it('abstract has bold description', () => {
      expect(IMAGE_STYLES.abstract.label).toBe('Abstract')
      expect(IMAGE_STYLES.abstract.description).toContain('Bold colors')
      expect(IMAGE_STYLES.abstract.promptSuffix).toContain('abstract')
    })

    it('nature has botanical description', () => {
      expect(IMAGE_STYLES.nature.label).toBe('Nature')
      expect(IMAGE_STYLES.nature.description).toContain('Botanical')
      expect(IMAGE_STYLES.nature.promptSuffix).toContain('botanical')
    })

    it('cosmic has space description', () => {
      expect(IMAGE_STYLES.cosmic.label).toBe('Cosmic')
      expect(IMAGE_STYLES.cosmic.description).toContain('Space')
      expect(IMAGE_STYLES.cosmic.promptSuffix).toContain('cosmic')
    })

    it('vintage has retro description', () => {
      expect(IMAGE_STYLES.vintage.label).toBe('Vintage')
      expect(IMAGE_STYLES.vintage.description).toContain('Retro')
      expect(IMAGE_STYLES.vintage.promptSuffix).toContain('vintage')
    })
  })

  it('all promptSuffixes are suitable for image generation', () => {
    allStyles.forEach((style) => {
      const suffix = IMAGE_STYLES[style].promptSuffix
      // Should contain style-related keywords
      expect(suffix.split(' ').length).toBeGreaterThan(3)
      // Should not contain problematic content
      expect(suffix).not.toContain('violence')
      expect(suffix).not.toContain('explicit')
    })
  })
})

// ============================================================================
// DEFAULT_PROMPT_PREFERENCES
// ============================================================================

describe('DEFAULT_PROMPT_PREFERENCES', () => {
  it('is defined', () => {
    expect(DEFAULT_PROMPT_PREFERENCES).toBeDefined()
  })

  it('has defaultImageStyle set to watercolor', () => {
    expect(DEFAULT_PROMPT_PREFERENCES.defaultImageStyle).toBe('watercolor')
  })

  it('has autoGenerateImages disabled', () => {
    expect(DEFAULT_PROMPT_PREFERENCES.autoGenerateImages).toBe(false)
  })

  it('has showDailyPromptWidget enabled', () => {
    expect(DEFAULT_PROMPT_PREFERENCES.showDailyPromptWidget).toBe(true)
  })

  it('has empty favoriteCategories', () => {
    expect(DEFAULT_PROMPT_PREFERENCES.favoriteCategories).toEqual([])
    expect(Array.isArray(DEFAULT_PROMPT_PREFERENCES.favoriteCategories)).toBe(true)
  })

  it('has galleryViewMode set to grid', () => {
    expect(DEFAULT_PROMPT_PREFERENCES.galleryViewMode).toBe('grid')
  })

  it('has gridColumns set to 3', () => {
    expect(DEFAULT_PROMPT_PREFERENCES.gridColumns).toBe(3)
  })

  it('has all required properties', () => {
    expect(DEFAULT_PROMPT_PREFERENCES).toHaveProperty('defaultImageStyle')
    expect(DEFAULT_PROMPT_PREFERENCES).toHaveProperty('autoGenerateImages')
    expect(DEFAULT_PROMPT_PREFERENCES).toHaveProperty('showDailyPromptWidget')
    expect(DEFAULT_PROMPT_PREFERENCES).toHaveProperty('favoriteCategories')
    expect(DEFAULT_PROMPT_PREFERENCES).toHaveProperty('galleryViewMode')
    expect(DEFAULT_PROMPT_PREFERENCES).toHaveProperty('gridColumns')
  })

  it('defaultImageStyle is a valid style', () => {
    const validStyles: ImageStyle[] = [
      'watercolor',
      'minimalist',
      'abstract',
      'nature',
      'cosmic',
      'vintage',
    ]
    expect(validStyles).toContain(DEFAULT_PROMPT_PREFERENCES.defaultImageStyle)
  })

  it('gridColumns is a valid option', () => {
    const validColumns = [2, 3, 4]
    expect(validColumns).toContain(DEFAULT_PROMPT_PREFERENCES.gridColumns)
  })
})

// ============================================================================
// CATEGORY_DISPLAY
// ============================================================================

describe('CATEGORY_DISPLAY', () => {
  const allCategories = [
    'reflection',
    'creative',
    'technical',
    'philosophical',
    'practical',
    'exploration',
    'personal',
    'learning',
  ] as const

  it('is defined', () => {
    expect(CATEGORY_DISPLAY).toBeDefined()
  })

  it('has exactly 8 categories', () => {
    expect(Object.keys(CATEGORY_DISPLAY)).toHaveLength(8)
  })

  it('includes all categories', () => {
    allCategories.forEach((category) => {
      expect(CATEGORY_DISPLAY[category]).toBeDefined()
    })
  })

  describe('category configurations', () => {
    allCategories.forEach((category) => {
      describe(category, () => {
        it('has matching id', () => {
          expect(CATEGORY_DISPLAY[category].id).toBe(category)
        })

        it('has label', () => {
          expect(CATEGORY_DISPLAY[category].label).toBeDefined()
          expect(typeof CATEGORY_DISPLAY[category].label).toBe('string')
          expect(CATEGORY_DISPLAY[category].label.length).toBeGreaterThan(0)
        })

        it('has emoji', () => {
          expect(CATEGORY_DISPLAY[category].emoji).toBeDefined()
          expect(typeof CATEGORY_DISPLAY[category].emoji).toBe('string')
          expect(CATEGORY_DISPLAY[category].emoji.length).toBeGreaterThan(0)
        })

        it('has gradient', () => {
          expect(CATEGORY_DISPLAY[category].gradient).toBeDefined()
          expect(typeof CATEGORY_DISPLAY[category].gradient).toBe('string')
          expect(CATEGORY_DISPLAY[category].gradient).toContain('from-')
          expect(CATEGORY_DISPLAY[category].gradient).toContain('to-')
        })

        it('has description', () => {
          expect(CATEGORY_DISPLAY[category].description).toBeDefined()
          expect(typeof CATEGORY_DISPLAY[category].description).toBe('string')
          expect(CATEGORY_DISPLAY[category].description.length).toBeGreaterThan(0)
        })
      })
    })
  })

  describe('specific category values', () => {
    it('reflection has correct emoji and label', () => {
      expect(CATEGORY_DISPLAY.reflection.emoji).toBe('🪞')
      expect(CATEGORY_DISPLAY.reflection.label).toBe('Self')
    })

    it('creative has correct emoji and label', () => {
      expect(CATEGORY_DISPLAY.creative.emoji).toBe('🎨')
      expect(CATEGORY_DISPLAY.creative.label).toBe('Creative')
    })

    it('technical has correct emoji and label', () => {
      expect(CATEGORY_DISPLAY.technical.emoji).toBe('⚙️')
      expect(CATEGORY_DISPLAY.technical.label).toBe('Technical')
    })

    it('philosophical has correct emoji and label', () => {
      expect(CATEGORY_DISPLAY.philosophical.emoji).toBe('🤔')
      expect(CATEGORY_DISPLAY.philosophical.label).toBe('Deep')
    })

    it('practical has correct emoji and label', () => {
      expect(CATEGORY_DISPLAY.practical.emoji).toBe('🛠️')
      expect(CATEGORY_DISPLAY.practical.label).toBe('Practical')
    })

    it('exploration has correct emoji and label', () => {
      expect(CATEGORY_DISPLAY.exploration.emoji).toBe('🔭')
      expect(CATEGORY_DISPLAY.exploration.label).toBe('Explore')
    })

    it('personal has correct emoji and label', () => {
      expect(CATEGORY_DISPLAY.personal.emoji).toBe('📝')
      expect(CATEGORY_DISPLAY.personal.label).toBe('Personal')
    })

    it('learning has correct emoji and label', () => {
      expect(CATEGORY_DISPLAY.learning.emoji).toBe('📚')
      expect(CATEGORY_DISPLAY.learning.label).toBe('Learning')
    })
  })

  it('all gradients use Tailwind opacity format', () => {
    allCategories.forEach((category) => {
      const gradient = CATEGORY_DISPLAY[category].gradient
      expect(gradient).toMatch(/\/20/)
    })
  })

  it('all emojis are single characters or emoji sequences', () => {
    allCategories.forEach((category) => {
      const emoji = CATEGORY_DISPLAY[category].emoji
      // Emojis are typically 1-4 characters including modifiers
      expect(emoji.length).toBeGreaterThanOrEqual(1)
      expect(emoji.length).toBeLessThanOrEqual(4)
    })
  })
})

// ============================================================================
// MOOD_GRADIENTS
// ============================================================================

describe('MOOD_GRADIENTS', () => {
  const allMoods = [
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
  ] as const

  it('is defined', () => {
    expect(MOOD_GRADIENTS).toBeDefined()
  })

  it('has exactly 12 moods', () => {
    expect(Object.keys(MOOD_GRADIENTS)).toHaveLength(12)
  })

  it('includes all moods', () => {
    allMoods.forEach((mood) => {
      expect(MOOD_GRADIENTS[mood]).toBeDefined()
    })
  })

  describe('gradient format', () => {
    allMoods.forEach((mood) => {
      it(`${mood} has valid gradient format`, () => {
        const gradient = MOOD_GRADIENTS[mood]
        expect(typeof gradient).toBe('string')
        expect(gradient).toContain('from-')
        expect(gradient).toContain('to-')
        expect(gradient).toMatch(/\/20/) // opacity
      })
    })
  })

  describe('specific mood gradients', () => {
    it('focused uses blue/indigo', () => {
      expect(MOOD_GRADIENTS.focused).toContain('blue')
      expect(MOOD_GRADIENTS.focused).toContain('indigo')
    })

    it('creative uses purple/pink', () => {
      expect(MOOD_GRADIENTS.creative).toContain('purple')
      expect(MOOD_GRADIENTS.creative).toContain('pink')
    })

    it('curious uses amber/orange', () => {
      expect(MOOD_GRADIENTS.curious).toContain('amber')
      expect(MOOD_GRADIENTS.curious).toContain('orange')
    })

    it('relaxed uses emerald/teal', () => {
      expect(MOOD_GRADIENTS.relaxed).toContain('emerald')
      expect(MOOD_GRADIENTS.relaxed).toContain('teal')
    })

    it('energetic uses orange/red', () => {
      expect(MOOD_GRADIENTS.energetic).toContain('orange')
      expect(MOOD_GRADIENTS.energetic).toContain('red')
    })

    it('reflective uses indigo/violet', () => {
      expect(MOOD_GRADIENTS.reflective).toContain('indigo')
      expect(MOOD_GRADIENTS.reflective).toContain('violet')
    })

    it('anxious uses orange/amber', () => {
      expect(MOOD_GRADIENTS.anxious).toContain('orange')
      expect(MOOD_GRADIENTS.anxious).toContain('amber')
    })

    it('grateful uses rose/pink', () => {
      expect(MOOD_GRADIENTS.grateful).toContain('rose')
      expect(MOOD_GRADIENTS.grateful).toContain('pink')
    })

    it('tired uses slate/gray', () => {
      expect(MOOD_GRADIENTS.tired).toContain('slate')
      expect(MOOD_GRADIENTS.tired).toContain('gray')
    })

    it('peaceful uses teal/cyan', () => {
      expect(MOOD_GRADIENTS.peaceful).toContain('teal')
      expect(MOOD_GRADIENTS.peaceful).toContain('cyan')
    })

    it('excited uses violet/purple', () => {
      expect(MOOD_GRADIENTS.excited).toContain('violet')
      expect(MOOD_GRADIENTS.excited).toContain('purple')
    })

    it('neutral uses zinc/slate', () => {
      expect(MOOD_GRADIENTS.neutral).toContain('zinc')
      expect(MOOD_GRADIENTS.neutral).toContain('slate')
    })
  })

  it('all gradients are unique', () => {
    const gradients = Object.values(MOOD_GRADIENTS)
    const uniqueGradients = new Set(gradients)
    expect(uniqueGradients.size).toBe(gradients.length)
  })

  it('positive moods use warm or vibrant colors', () => {
    const positiveMoods = ['creative', 'energetic', 'excited', 'grateful']
    positiveMoods.forEach((mood) => {
      const gradient = MOOD_GRADIENTS[mood as keyof typeof MOOD_GRADIENTS]
      // Should contain vibrant colors
      expect(
        gradient.includes('pink') ||
          gradient.includes('purple') ||
          gradient.includes('orange') ||
          gradient.includes('violet') ||
          gradient.includes('rose') ||
          gradient.includes('red')
      ).toBe(true)
    })
  })

  it('calm moods use cool colors', () => {
    const calmMoods = ['relaxed', 'peaceful', 'focused']
    calmMoods.forEach((mood) => {
      const gradient = MOOD_GRADIENTS[mood as keyof typeof MOOD_GRADIENTS]
      // Should contain cool colors
      expect(
        gradient.includes('blue') ||
          gradient.includes('teal') ||
          gradient.includes('cyan') ||
          gradient.includes('indigo') ||
          gradient.includes('emerald')
      ).toBe(true)
    })
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('prompts types integration', () => {
  it('DEFAULT_PROMPT_PREFERENCES.defaultImageStyle exists in IMAGE_STYLES', () => {
    const defaultStyle = DEFAULT_PROMPT_PREFERENCES.defaultImageStyle
    expect(IMAGE_STYLES[defaultStyle]).toBeDefined()
  })

  it('mood gradients cover all mood states', () => {
    // All 12 moods should have gradients
    const moodCount = Object.keys(MOOD_GRADIENTS).length
    expect(moodCount).toBe(12)
  })

  it('category display covers all prompt categories', () => {
    // All 8 categories should have display config
    const categoryCount = Object.keys(CATEGORY_DISPLAY).length
    expect(categoryCount).toBe(8)
  })

  it('image styles cover diverse artistic approaches', () => {
    const styles = Object.keys(IMAGE_STYLES)

    // Should have variety
    expect(styles).toContain('watercolor') // Traditional
    expect(styles).toContain('minimalist') // Modern
    expect(styles).toContain('cosmic') // Fantastical
    expect(styles).toContain('nature') // Organic
  })
})
