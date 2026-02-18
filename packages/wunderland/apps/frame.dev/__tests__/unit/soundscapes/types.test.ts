/**
 * Tests for Soundscape Types
 * @module __tests__/unit/soundscapes/types.test
 */

import { describe, it, expect } from 'vitest'
import {
  SOUNDSCAPE_PALETTES,
  THEMED_SOUNDSCAPE_PALETTES,
  DEFAULT_AUDIO_DATA,
  EASING,
  DURATIONS,
  DEFAULT_SCENE_DIMENSIONS,
  SCENE_ASPECT_RATIO,
  generateParticleId,
  createParticles,
  audioLerp,
  smoothValue,
  getSoundscapePalette,
  getThemeStyleConfig,
} from '@/components/quarry/ui/soundscapes/types'
import type { SoundscapeType } from '@/lib/audio/ambienceSounds'
import type { ThemeName } from '@/types/theme'
import { ALL_THEMES } from '../../setup/soundscapeMocks'

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('SOUNDSCAPE_PALETTES', () => {
  const soundscapeTypes: SoundscapeType[] = [
    'rain', 'cafe', 'forest', 'ocean', 'fireplace', 'lofi', 'white-noise', 'none'
  ]

  it('has palette for every soundscape type', () => {
    soundscapeTypes.forEach(type => {
      expect(SOUNDSCAPE_PALETTES[type]).toBeDefined()
    })
  })

  it('each palette has all required color properties', () => {
    soundscapeTypes.forEach(type => {
      const palette = SOUNDSCAPE_PALETTES[type]
      expect(palette.primary).toBeDefined()
      expect(palette.secondary).toBeDefined()
      expect(palette.accent).toBeDefined()
      expect(palette.background).toBeDefined()
      expect(palette.glow).toBeDefined()
    })
  })

  it('has valid hex colors for primary/secondary/accent/background', () => {
    const hexRegex = /^#[0-9a-fA-F]{6}$/
    soundscapeTypes.forEach(type => {
      const palette = SOUNDSCAPE_PALETTES[type]
      expect(palette.primary).toMatch(hexRegex)
      expect(palette.secondary).toMatch(hexRegex)
      expect(palette.accent).toMatch(hexRegex)
      expect(palette.background).toMatch(hexRegex)
    })
  })

  it('has valid rgba for glow', () => {
    const rgbaRegex = /^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/
    soundscapeTypes.forEach(type => {
      const palette = SOUNDSCAPE_PALETTES[type]
      expect(palette.glow).toMatch(rgbaRegex)
    })
  })
})

describe('THEMED_SOUNDSCAPE_PALETTES', () => {
  const soundscapeTypes: SoundscapeType[] = [
    'rain', 'cafe', 'forest', 'ocean', 'fireplace', 'lofi', 'white-noise', 'none'
  ]

  it('has palettes for all soundscape types', () => {
    soundscapeTypes.forEach(type => {
      expect(THEMED_SOUNDSCAPE_PALETTES[type]).toBeDefined()
    })
  })

  it('each soundscape has palette for all 8 themes', () => {
    soundscapeTypes.forEach(soundscape => {
      ALL_THEMES.forEach(theme => {
        const palette = THEMED_SOUNDSCAPE_PALETTES[soundscape][theme]
        expect(palette).toBeDefined()
        expect(palette.primary).toBeDefined()
        expect(palette.secondary).toBeDefined()
        expect(palette.accent).toBeDefined()
        expect(palette.background).toBeDefined()
        expect(palette.glow).toBeDefined()
      })
    })
  })

  it('terminal themes have distinct phosphor colors', () => {
    const terminalLight = THEMED_SOUNDSCAPE_PALETTES.rain['terminal-light']
    const terminalDark = THEMED_SOUNDSCAPE_PALETTES.rain['terminal-dark']

    // Amber for light terminal
    expect(terminalLight.accent).toContain('ffb000')
    // Green for dark terminal
    expect(terminalDark.accent).toMatch(/00ff00|0f0/i)
  })
})

describe('DEFAULT_AUDIO_DATA', () => {
  it('has all required fields', () => {
    expect(DEFAULT_AUDIO_DATA.amplitude).toBe(0)
    expect(DEFAULT_AUDIO_DATA.bass).toBe(0)
    expect(DEFAULT_AUDIO_DATA.mid).toBe(0)
    expect(DEFAULT_AUDIO_DATA.high).toBe(0)
    expect(DEFAULT_AUDIO_DATA.frequencyData).toBeNull()
  })
})

describe('EASING', () => {
  it('has all easing presets', () => {
    expect(EASING.ease).toBeDefined()
    expect(EASING.easeIn).toBeDefined()
    expect(EASING.easeOut).toBeDefined()
    expect(EASING.easeInOut).toBeDefined()
    expect(EASING.linear).toBe('linear')
    expect(EASING.bounce).toBeDefined()
    expect(EASING.wave).toBeDefined()
  })

  it('cubic-bezier values are valid format', () => {
    const cubicBezierRegex = /^cubic-bezier\([\d.]+,\s*-?[\d.]+,\s*[\d.]+,\s*[\d.]+\)$/
    expect(EASING.ease).toMatch(cubicBezierRegex)
    expect(EASING.easeIn).toMatch(cubicBezierRegex)
    expect(EASING.bounce).toMatch(cubicBezierRegex)
  })
})

describe('DURATIONS', () => {
  it('has all duration presets', () => {
    expect(DURATIONS.fast).toBe(0.15)
    expect(DURATIONS.normal).toBe(0.3)
    expect(DURATIONS.slow).toBe(0.6)
    expect(DURATIONS.verySlow).toBe(1.2)
    expect(DURATIONS.loop).toBe(2)
  })

  it('durations are in ascending order', () => {
    expect(DURATIONS.fast).toBeLessThan(DURATIONS.normal)
    expect(DURATIONS.normal).toBeLessThan(DURATIONS.slow)
    expect(DURATIONS.slow).toBeLessThan(DURATIONS.verySlow)
  })
})

describe('DEFAULT_SCENE_DIMENSIONS', () => {
  it('has width and height', () => {
    expect(DEFAULT_SCENE_DIMENSIONS.width).toBe(400)
    expect(DEFAULT_SCENE_DIMENSIONS.height).toBe(300)
  })

  it('maintains 4:3 aspect ratio', () => {
    const ratio = DEFAULT_SCENE_DIMENSIONS.width / DEFAULT_SCENE_DIMENSIONS.height
    expect(ratio).toBeCloseTo(4 / 3)
  })
})

describe('SCENE_ASPECT_RATIO', () => {
  it('is 4/3', () => {
    expect(SCENE_ASPECT_RATIO).toBeCloseTo(4 / 3)
  })
})

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('generateParticleId', () => {
  it('generates unique IDs with prefix and index', () => {
    const id1 = generateParticleId('rain', 0)
    const id2 = generateParticleId('rain', 1)

    expect(id1).toContain('rain')
    expect(id1).toContain('0')
    expect(id1).not.toBe(id2)
  })

  it('includes timestamp for uniqueness', () => {
    const id = generateParticleId('ember', 5)
    const parts = id.split('-')
    expect(parts.length).toBe(3)
    expect(parseInt(parts[2])).toBeGreaterThan(0)
  })
})

describe('createParticles', () => {
  it('generates correct number of particles', () => {
    const particles = createParticles(10, 'test')
    expect(particles).toHaveLength(10)
  })

  it('particles have required properties', () => {
    const particles = createParticles(5, 'drop')

    particles.forEach(p => {
      expect(p.id).toBeDefined()
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(1)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(1)
      expect(p.size).toBeDefined()
      expect(p.opacity).toBeDefined()
      expect(p.delay).toBeDefined()
      expect(p.duration).toBeDefined()
    })
  })

  it('respects min/max size constraints', () => {
    const particles = createParticles(50, 'test', {
      minSize: 5,
      maxSize: 10,
    })

    particles.forEach(p => {
      expect(p.size).toBeGreaterThanOrEqual(5)
      expect(p.size).toBeLessThanOrEqual(10)
    })
  })

  it('respects min/max opacity constraints', () => {
    const particles = createParticles(50, 'test', {
      minOpacity: 0.5,
      maxOpacity: 0.8,
    })

    particles.forEach(p => {
      expect(p.opacity).toBeGreaterThanOrEqual(0.5)
      expect(p.opacity).toBeLessThanOrEqual(0.8)
    })
  })

  it('respects min/max duration constraints', () => {
    const particles = createParticles(50, 'test', {
      minDuration: 2,
      maxDuration: 5,
    })

    particles.forEach(p => {
      expect(p.duration).toBeGreaterThanOrEqual(2)
      expect(p.duration).toBeLessThanOrEqual(5)
    })
  })
})

describe('audioLerp', () => {
  it('returns min when audioValue is 0', () => {
    expect(audioLerp(10, 100, 0)).toBe(10)
  })

  it('returns max when audioValue is 1', () => {
    expect(audioLerp(10, 100, 1)).toBe(100)
  })

  it('returns midpoint when audioValue is 0.5', () => {
    expect(audioLerp(0, 100, 0.5)).toBe(50)
  })

  it('clamps audioValue to 0-1 range', () => {
    expect(audioLerp(0, 100, -0.5)).toBe(0)
    expect(audioLerp(0, 100, 1.5)).toBe(100)
  })

  it('applies sensitivity multiplier', () => {
    // With sensitivity 2, 0.5 becomes 1.0
    expect(audioLerp(0, 100, 0.5, 2)).toBe(100)
    // With sensitivity 0.5, 1.0 becomes 0.5
    expect(audioLerp(0, 100, 1, 0.5)).toBe(50)
  })
})

describe('smoothValue', () => {
  it('moves toward target', () => {
    const current = 0
    const target = 100
    const result = smoothValue(current, target, 0.1)

    expect(result).toBeGreaterThan(current)
    expect(result).toBeLessThan(target)
    expect(result).toBe(10) // 0 + (100 - 0) * 0.1
  })

  it('converges with repeated calls', () => {
    let value = 0
    const target = 100

    for (let i = 0; i < 100; i++) {
      value = smoothValue(value, target, 0.1)
    }

    expect(value).toBeCloseTo(target, 1)
  })

  it('uses default smoothing of 0.1', () => {
    const result = smoothValue(0, 100)
    expect(result).toBe(10)
  })

  it('higher smoothing means faster convergence', () => {
    const slow = smoothValue(0, 100, 0.1)
    const fast = smoothValue(0, 100, 0.5)

    expect(fast).toBeGreaterThan(slow)
  })
})

// ============================================================================
// THEME HELPER TESTS
// ============================================================================

describe('getSoundscapePalette', () => {
  it('returns default palette when theme is undefined', () => {
    const palette = getSoundscapePalette('rain')
    expect(palette).toEqual(SOUNDSCAPE_PALETTES.rain)
  })

  it('returns default palette when theme is null', () => {
    const palette = getSoundscapePalette('rain', null)
    expect(palette).toEqual(SOUNDSCAPE_PALETTES.rain)
  })

  it('returns themed palette for each theme', () => {
    ALL_THEMES.forEach(theme => {
      const palette = getSoundscapePalette('cafe', theme)
      expect(palette).toEqual(THEMED_SOUNDSCAPE_PALETTES.cafe[theme])
    })
  })

  it('different themes return different palettes', () => {
    const lightPalette = getSoundscapePalette('forest', 'light')
    const darkPalette = getSoundscapePalette('forest', 'dark')
    const terminalPalette = getSoundscapePalette('forest', 'terminal-dark')

    expect(lightPalette.background).not.toBe(darkPalette.background)
    expect(darkPalette.accent).not.toBe(terminalPalette.accent)
  })
})

describe('getThemeStyleConfig', () => {
  it('returns defaults when theme is undefined', () => {
    const config = getThemeStyleConfig()

    expect(config.isTerminal).toBe(false)
    expect(config.isSepia).toBe(false)
    expect(config.isOceanic).toBe(false)
    expect(config.isDark).toBe(true)
    expect(config.phosphorColor).toBe('transparent')
    expect(config.glowIntensity).toBe(1)
  })

  it('returns defaults when theme is null', () => {
    const config = getThemeStyleConfig(null)
    expect(config.isTerminal).toBe(false)
    expect(config.phosphorColor).toBe('transparent')
  })

  it('detects terminal themes', () => {
    const terminalLight = getThemeStyleConfig('terminal-light')
    const terminalDark = getThemeStyleConfig('terminal-dark')

    expect(terminalLight.isTerminal).toBe(true)
    expect(terminalDark.isTerminal).toBe(true)
    expect(terminalLight.isSepia).toBe(false)
    expect(terminalDark.isOceanic).toBe(false)
  })

  it('detects sepia themes', () => {
    const sepiaLight = getThemeStyleConfig('sepia-light')
    const sepiaDark = getThemeStyleConfig('sepia-dark')

    expect(sepiaLight.isSepia).toBe(true)
    expect(sepiaDark.isSepia).toBe(true)
    expect(sepiaLight.isTerminal).toBe(false)
  })

  it('detects oceanic themes', () => {
    const oceanicLight = getThemeStyleConfig('oceanic-light')
    const oceanicDark = getThemeStyleConfig('oceanic-dark')

    expect(oceanicLight.isOceanic).toBe(true)
    expect(oceanicDark.isOceanic).toBe(true)
    expect(oceanicLight.isSepia).toBe(false)
  })

  it('detects dark vs light themes', () => {
    expect(getThemeStyleConfig('light').isDark).toBe(false)
    expect(getThemeStyleConfig('dark').isDark).toBe(true)
    expect(getThemeStyleConfig('sepia-light').isDark).toBe(false)
    expect(getThemeStyleConfig('sepia-dark').isDark).toBe(true)
    expect(getThemeStyleConfig('terminal-light').isDark).toBe(false)
    expect(getThemeStyleConfig('terminal-dark').isDark).toBe(true)
  })

  it('terminal dark has green phosphor', () => {
    const config = getThemeStyleConfig('terminal-dark')
    expect(config.phosphorColor).toContain('0, 255, 0')
  })

  it('terminal light has amber phosphor', () => {
    const config = getThemeStyleConfig('terminal-light')
    expect(config.phosphorColor).toContain('255, 176, 0')
  })

  it('sepia themes have reduced glow intensity', () => {
    const sepia = getThemeStyleConfig('sepia-dark')
    const standard = getThemeStyleConfig('dark')

    expect(sepia.glowIntensity).toBe(0.7)
    expect(standard.glowIntensity).toBe(1)
  })

  it('terminal themes have increased glow intensity', () => {
    const terminal = getThemeStyleConfig('terminal-dark')

    expect(terminal.glowIntensity).toBe(1.2)
  })
})
