/**
 * Ambience Sounds Tests
 * @module __tests__/unit/lib/audio/ambienceSounds.test
 *
 * Tests for ambient soundscape system, metadata, and emoji mapping.
 */

import { describe, it, expect } from 'vitest'
import {
  SOUNDSCAPE_METADATA,
  SOUNDSCAPE_INFO,
  type SoundscapeType,
  type SoundscapeMetadata,
} from '@/lib/audio/ambienceSounds'

// ============================================================================
// SOUNDSCAPE METADATA TESTS
// ============================================================================

describe('SOUNDSCAPE_METADATA', () => {
  it('is defined and is an array', () => {
    expect(SOUNDSCAPE_METADATA).toBeDefined()
    expect(Array.isArray(SOUNDSCAPE_METADATA)).toBe(true)
  })

  it('has exactly 8 soundscape types', () => {
    expect(SOUNDSCAPE_METADATA).toHaveLength(8)
  })

  it('includes all expected soundscape types', () => {
    const ids = SOUNDSCAPE_METADATA.map((s) => s.id)
    expect(ids).toContain('rain')
    expect(ids).toContain('cafe')
    expect(ids).toContain('forest')
    expect(ids).toContain('ocean')
    expect(ids).toContain('fireplace')
    expect(ids).toContain('lofi')
    expect(ids).toContain('white-noise')
    expect(ids).toContain('none')
  })

  it('all items have required properties', () => {
    for (const metadata of SOUNDSCAPE_METADATA) {
      expect(metadata).toHaveProperty('id')
      expect(metadata).toHaveProperty('name')
      expect(metadata).toHaveProperty('description')
      expect(metadata).toHaveProperty('icon')
      expect(metadata).toHaveProperty('emoji')
      expect(metadata).toHaveProperty('color')
    }
  })

  it('all names are non-empty strings', () => {
    for (const metadata of SOUNDSCAPE_METADATA) {
      expect(typeof metadata.name).toBe('string')
      expect(metadata.name.length).toBeGreaterThan(0)
    }
  })

  it('all descriptions are non-empty strings', () => {
    for (const metadata of SOUNDSCAPE_METADATA) {
      expect(typeof metadata.description).toBe('string')
      expect(metadata.description.length).toBeGreaterThan(0)
    }
  })

  it('all colors are valid hex colors', () => {
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/
    for (const metadata of SOUNDSCAPE_METADATA) {
      expect(metadata.color).toMatch(hexColorRegex)
    }
  })
})

// ============================================================================
// EMOJI MAPPING TESTS
// ============================================================================

describe('Soundscape Emoji Mapping', () => {
  it('rain has correct emoji', () => {
    const rain = SOUNDSCAPE_METADATA.find((s) => s.id === 'rain')
    expect(rain?.emoji).toBe('🌧️')
  })

  it('cafe has correct emoji', () => {
    const cafe = SOUNDSCAPE_METADATA.find((s) => s.id === 'cafe')
    expect(cafe?.emoji).toBe('☕')
  })

  it('forest has correct emoji', () => {
    const forest = SOUNDSCAPE_METADATA.find((s) => s.id === 'forest')
    expect(forest?.emoji).toBe('🌲')
  })

  it('ocean has correct emoji', () => {
    const ocean = SOUNDSCAPE_METADATA.find((s) => s.id === 'ocean')
    expect(ocean?.emoji).toBe('🌊')
  })

  it('fireplace has correct emoji', () => {
    const fireplace = SOUNDSCAPE_METADATA.find((s) => s.id === 'fireplace')
    expect(fireplace?.emoji).toBe('🔥')
  })

  it('lofi has correct emoji', () => {
    const lofi = SOUNDSCAPE_METADATA.find((s) => s.id === 'lofi')
    expect(lofi?.emoji).toBe('🎵')
  })

  it('white-noise has correct emoji', () => {
    const whiteNoise = SOUNDSCAPE_METADATA.find((s) => s.id === 'white-noise')
    expect(whiteNoise?.emoji).toBe('📻')
  })

  it('none has correct emoji', () => {
    const none = SOUNDSCAPE_METADATA.find((s) => s.id === 'none')
    expect(none?.emoji).toBe('🔇')
  })

  it('all emojis are non-empty', () => {
    for (const metadata of SOUNDSCAPE_METADATA) {
      expect(metadata.emoji).toBeTruthy()
      expect(metadata.emoji.length).toBeGreaterThan(0)
    }
  })
})

// ============================================================================
// SOUNDSCAPE_INFO LOOKUP TESTS
// ============================================================================

describe('SOUNDSCAPE_INFO', () => {
  it('is defined and is an object', () => {
    expect(SOUNDSCAPE_INFO).toBeDefined()
    expect(typeof SOUNDSCAPE_INFO).toBe('object')
  })

  it('has entries for all soundscape types', () => {
    const types: SoundscapeType[] = [
      'rain',
      'cafe',
      'forest',
      'ocean',
      'fireplace',
      'lofi',
      'white-noise',
      'none',
    ]

    for (const type of types) {
      expect(SOUNDSCAPE_INFO[type]).toBeDefined()
    }
  })

  it('lookup returns correct metadata', () => {
    expect(SOUNDSCAPE_INFO.rain.name).toBe('Rain')
    expect(SOUNDSCAPE_INFO.cafe.name).toBe('Café')
    expect(SOUNDSCAPE_INFO.forest.name).toBe('Forest')
    expect(SOUNDSCAPE_INFO.ocean.name).toBe('Ocean')
    expect(SOUNDSCAPE_INFO.fireplace.name).toBe('Fireplace')
    expect(SOUNDSCAPE_INFO.lofi.name).toBe('Lo-fi')
    expect(SOUNDSCAPE_INFO['white-noise'].name).toBe('White Noise')
    expect(SOUNDSCAPE_INFO.none.name).toBe('Off')
  })

  it('lookup returns full metadata object', () => {
    const rain = SOUNDSCAPE_INFO.rain
    expect(rain).toHaveProperty('id')
    expect(rain).toHaveProperty('name')
    expect(rain).toHaveProperty('description')
    expect(rain).toHaveProperty('icon')
    expect(rain).toHaveProperty('emoji')
    expect(rain).toHaveProperty('color')
  })

  it('id matches the key', () => {
    for (const [key, value] of Object.entries(SOUNDSCAPE_INFO)) {
      expect(value.id).toBe(key)
    }
  })
})

// ============================================================================
// ICON MAPPING TESTS
// ============================================================================

describe('Soundscape Icon Mapping', () => {
  it('rain uses CloudRain icon', () => {
    expect(SOUNDSCAPE_INFO.rain.icon).toBe('CloudRain')
  })

  it('cafe uses Coffee icon', () => {
    expect(SOUNDSCAPE_INFO.cafe.icon).toBe('Coffee')
  })

  it('forest uses TreePine icon', () => {
    expect(SOUNDSCAPE_INFO.forest.icon).toBe('TreePine')
  })

  it('ocean uses Waves icon', () => {
    expect(SOUNDSCAPE_INFO.ocean.icon).toBe('Waves')
  })

  it('fireplace uses Flame icon', () => {
    expect(SOUNDSCAPE_INFO.fireplace.icon).toBe('Flame')
  })

  it('lofi uses Music icon', () => {
    expect(SOUNDSCAPE_INFO.lofi.icon).toBe('Music')
  })

  it('white-noise uses Radio icon', () => {
    expect(SOUNDSCAPE_INFO['white-noise'].icon).toBe('Radio')
  })

  it('none uses VolumeX icon', () => {
    expect(SOUNDSCAPE_INFO.none.icon).toBe('VolumeX')
  })
})

// ============================================================================
// COLOR THEME TESTS
// ============================================================================

describe('Soundscape Colors', () => {
  it('rain has blue color', () => {
    expect(SOUNDSCAPE_INFO.rain.color).toBe('#60A5FA')
  })

  it('cafe has amber color', () => {
    expect(SOUNDSCAPE_INFO.cafe.color).toBe('#F59E0B')
  })

  it('forest has green color', () => {
    expect(SOUNDSCAPE_INFO.forest.color).toBe('#22C55E')
  })

  it('ocean has cyan color', () => {
    expect(SOUNDSCAPE_INFO.ocean.color).toBe('#06B6D4')
  })

  it('fireplace has red color', () => {
    expect(SOUNDSCAPE_INFO.fireplace.color).toBe('#EF4444')
  })

  it('lofi has purple color', () => {
    expect(SOUNDSCAPE_INFO.lofi.color).toBe('#A855F7')
  })

  it('colors are distinct', () => {
    const colors = SOUNDSCAPE_METADATA.map((s) => s.color)
    const uniqueColors = new Set(colors)
    expect(uniqueColors.size).toBe(colors.length)
  })
})

// ============================================================================
// SOUNDSCAPE TYPE VALIDATION
// ============================================================================

describe('SoundscapeType', () => {
  it('includes all playable soundscapes', () => {
    const playableSoundscapes = SOUNDSCAPE_METADATA.filter((s) => s.id !== 'none')
    expect(playableSoundscapes).toHaveLength(7)
  })

  it('none is the only non-playable soundscape', () => {
    const none = SOUNDSCAPE_INFO.none
    expect(none.description).toContain('No')
  })
})





