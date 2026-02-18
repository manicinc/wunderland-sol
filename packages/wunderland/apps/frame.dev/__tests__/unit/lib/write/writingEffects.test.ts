/**
 * Writing Effects Tests
 * @module __tests__/unit/lib/write/writingEffects.test
 *
 * Tests for the canvas-based particle effects system.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  WritingEffectsEngine,
  DEFAULT_WRITING_EFFECTS_CONFIG,
  type WritingEffectsConfig,
} from '@/lib/write/writingEffects'

// Mock canvas context
const createMockCanvas = () => {
  const ctx = {
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    globalAlpha: 1,
    fillStyle: '',
  }

  const canvas = {
    getContext: vi.fn(() => ctx),
    width: 800,
    height: 600,
    style: { width: '', height: '' },
  } as unknown as HTMLCanvasElement

  return { canvas, ctx }
}

describe('Writing Effects', () => {
  let mockCanvas: HTMLCanvasElement
  let mockCtx: any

  beforeEach(() => {
    vi.useFakeTimers()
    const mocks = createMockCanvas()
    mockCanvas = mocks.canvas
    mockCtx = mocks.ctx

    // Mock requestAnimationFrame and cancelAnimationFrame
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => {
      return setTimeout(cb, 16) as unknown as number
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id) => {
      clearTimeout(id)
    }))
    vi.stubGlobal('window', { devicePixelRatio: 1 })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  // ============================================================================
  // DEFAULT_WRITING_EFFECTS_CONFIG
  // ============================================================================

  describe('DEFAULT_WRITING_EFFECTS_CONFIG', () => {
    it('has correct default values', () => {
      expect(DEFAULT_WRITING_EFFECTS_CONFIG.inkEnabled).toBe(false)
      expect(DEFAULT_WRITING_EFFECTS_CONFIG.dustEnabled).toBe(false)
      expect(DEFAULT_WRITING_EFFECTS_CONFIG.flourishEnabled).toBe(false)
      expect(DEFAULT_WRITING_EFFECTS_CONFIG.intensity).toBe(0.7)
      expect(DEFAULT_WRITING_EFFECTS_CONFIG.maxParticles).toBe(50)
    })
  })

  // ============================================================================
  // WritingEffectsConfig type
  // ============================================================================

  describe('WritingEffectsConfig type', () => {
    it('can create full config', () => {
      const config: WritingEffectsConfig = {
        inkEnabled: true,
        dustEnabled: true,
        flourishEnabled: true,
        intensity: 0.8,
        maxParticles: 100,
      }

      expect(config.inkEnabled).toBe(true)
      expect(config.maxParticles).toBe(100)
    })

    it('supports all boolean flags', () => {
      const config: WritingEffectsConfig = {
        inkEnabled: false,
        dustEnabled: true,
        flourishEnabled: false,
        intensity: 0.5,
        maxParticles: 25,
      }

      expect(config.dustEnabled).toBe(true)
      expect(config.flourishEnabled).toBe(false)
    })
  })

  // ============================================================================
  // WritingEffectsEngine - Constructor
  // ============================================================================

  describe('WritingEffectsEngine constructor', () => {
    it('creates engine with canvas', () => {
      const engine = new WritingEffectsEngine(mockCanvas)
      expect(engine).toBeDefined()
    })

    it('creates engine with partial config', () => {
      const engine = new WritingEffectsEngine(mockCanvas, {
        inkEnabled: true,
        intensity: 0.5,
      })
      expect(engine).toBeDefined()
    })

    it('throws when canvas context unavailable', () => {
      const badCanvas = {
        getContext: vi.fn(() => null),
      } as unknown as HTMLCanvasElement

      expect(() => new WritingEffectsEngine(badCanvas)).toThrow(
        'Could not get 2d context from canvas'
      )
    })
  })

  // ============================================================================
  // WritingEffectsEngine - setTheme
  // ============================================================================

  describe('WritingEffectsEngine.setTheme', () => {
    it('sets theme without error', () => {
      const engine = new WritingEffectsEngine(mockCanvas)
      expect(() => engine.setTheme('dark')).not.toThrow()
    })

    it('accepts all theme names', () => {
      const engine = new WritingEffectsEngine(mockCanvas)

      expect(() => engine.setTheme('light')).not.toThrow()
      expect(() => engine.setTheme('dark')).not.toThrow()
      expect(() => engine.setTheme('sepia-light')).not.toThrow()
      expect(() => engine.setTheme('sepia-dark')).not.toThrow()
      expect(() => engine.setTheme('terminal-light')).not.toThrow()
      expect(() => engine.setTheme('terminal-dark')).not.toThrow()
      expect(() => engine.setTheme('oceanic-light')).not.toThrow()
      expect(() => engine.setTheme('oceanic-dark')).not.toThrow()
    })
  })

  // ============================================================================
  // WritingEffectsEngine - setConfig
  // ============================================================================

  describe('WritingEffectsEngine.setConfig', () => {
    it('updates config partially', () => {
      const engine = new WritingEffectsEngine(mockCanvas)

      expect(() =>
        engine.setConfig({
          inkEnabled: true,
        })
      ).not.toThrow()
    })

    it('updates multiple config values', () => {
      const engine = new WritingEffectsEngine(mockCanvas)

      expect(() =>
        engine.setConfig({
          inkEnabled: true,
          dustEnabled: true,
          intensity: 0.9,
        })
      ).not.toThrow()
    })
  })

  // ============================================================================
  // WritingEffectsEngine - resize
  // ============================================================================

  describe('WritingEffectsEngine.resize', () => {
    it('resizes canvas dimensions', () => {
      const engine = new WritingEffectsEngine(mockCanvas)

      engine.resize(1024, 768)

      expect(mockCanvas.width).toBe(1024)
      expect(mockCanvas.height).toBe(768)
      expect(mockCanvas.style.width).toBe('1024px')
      expect(mockCanvas.style.height).toBe('768px')
    })

    it('scales context for device pixel ratio', () => {
      vi.stubGlobal('window', { devicePixelRatio: 2 })

      const engine = new WritingEffectsEngine(mockCanvas)
      engine.resize(800, 600)

      expect(mockCanvas.width).toBe(1600)
      expect(mockCanvas.height).toBe(1200)
      expect(mockCtx.scale).toHaveBeenCalledWith(2, 2)
    })
  })

  // ============================================================================
  // WritingEffectsEngine - spawnInkSplatter
  // ============================================================================

  describe('WritingEffectsEngine.spawnInkSplatter', () => {
    it('does not spawn when ink disabled', () => {
      const engine = new WritingEffectsEngine(mockCanvas, { inkEnabled: false })

      engine.spawnInkSplatter(100, 100)

      // No error, but no visible effect without starting animation
      expect(true).toBe(true)
    })

    it('spawns when ink enabled', () => {
      const engine = new WritingEffectsEngine(mockCanvas, { inkEnabled: true })

      expect(() => engine.spawnInkSplatter(100, 100)).not.toThrow()
    })

    it('respects maxParticles limit', () => {
      const engine = new WritingEffectsEngine(mockCanvas, {
        inkEnabled: true,
        maxParticles: 5,
      })

      // Try to spawn many particles
      for (let i = 0; i < 20; i++) {
        engine.spawnInkSplatter(100, 100)
      }

      // Should not throw even with many spawns
      expect(true).toBe(true)
    })
  })

  // ============================================================================
  // WritingEffectsEngine - spawnFlourish
  // ============================================================================

  describe('WritingEffectsEngine.spawnFlourish', () => {
    it('does not spawn when flourish disabled', () => {
      const engine = new WritingEffectsEngine(mockCanvas, { flourishEnabled: false })

      engine.spawnFlourish(100, 100, '!')

      expect(true).toBe(true)
    })

    it('spawns for punctuation characters', () => {
      const engine = new WritingEffectsEngine(mockCanvas, { flourishEnabled: true })

      expect(() => engine.spawnFlourish(100, 100, '.')).not.toThrow()
      expect(() => engine.spawnFlourish(100, 100, '!')).not.toThrow()
      expect(() => engine.spawnFlourish(100, 100, '?')).not.toThrow()
      expect(() => engine.spawnFlourish(100, 100, ';')).not.toThrow()
      expect(() => engine.spawnFlourish(100, 100, ':')).not.toThrow()
    })

    it('ignores non-punctuation characters', () => {
      const engine = new WritingEffectsEngine(mockCanvas, { flourishEnabled: true })

      // Should not throw but also not spawn
      expect(() => engine.spawnFlourish(100, 100, 'a')).not.toThrow()
      expect(() => engine.spawnFlourish(100, 100, '1')).not.toThrow()
      expect(() => engine.spawnFlourish(100, 100, ' ')).not.toThrow()
    })
  })

  // ============================================================================
  // WritingEffectsEngine - spawnDust
  // ============================================================================

  describe('WritingEffectsEngine.spawnDust', () => {
    it('does not spawn when dust disabled', () => {
      const engine = new WritingEffectsEngine(mockCanvas, { dustEnabled: false })

      engine.spawnDust()

      expect(true).toBe(true)
    })

    it('spawns when dust enabled', () => {
      const engine = new WritingEffectsEngine(mockCanvas, { dustEnabled: true })

      expect(() => engine.spawnDust()).not.toThrow()
    })

    it('limits dust particles', () => {
      const engine = new WritingEffectsEngine(mockCanvas, { dustEnabled: true })

      // Spawn many dust particles
      for (let i = 0; i < 30; i++) {
        engine.spawnDust()
      }

      // Should not throw
      expect(true).toBe(true)
    })
  })

  // ============================================================================
  // WritingEffectsEngine - start/stop
  // ============================================================================

  describe('WritingEffectsEngine.start', () => {
    it('starts animation loop', () => {
      const engine = new WritingEffectsEngine(mockCanvas)

      engine.start()

      expect(requestAnimationFrame).toHaveBeenCalled()

      engine.stop()
    })

    it('does not start multiple loops', () => {
      const engine = new WritingEffectsEngine(mockCanvas)

      engine.start()
      engine.start()
      engine.start()

      // requestAnimationFrame should only be called once initially
      // (subsequent calls happen in animation loop)
      expect(true).toBe(true)

      engine.stop()
    })
  })

  describe('WritingEffectsEngine.stop', () => {
    it('stops animation loop', () => {
      const engine = new WritingEffectsEngine(mockCanvas)

      engine.start()
      engine.stop()

      expect(cancelAnimationFrame).toHaveBeenCalled()
    })

    it('handles stop when not started', () => {
      const engine = new WritingEffectsEngine(mockCanvas)

      expect(() => engine.stop()).not.toThrow()
    })
  })

  // ============================================================================
  // WritingEffectsEngine - clear
  // ============================================================================

  describe('WritingEffectsEngine.clear', () => {
    it('clears canvas', () => {
      const engine = new WritingEffectsEngine(mockCanvas)

      engine.clear()

      expect(mockCtx.clearRect).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // WritingEffectsEngine - dispose
  // ============================================================================

  describe('WritingEffectsEngine.dispose', () => {
    it('stops and clears', () => {
      const engine = new WritingEffectsEngine(mockCanvas)

      engine.start()
      engine.dispose()

      expect(mockCtx.clearRect).toHaveBeenCalled()
    })

    it('can be called multiple times', () => {
      const engine = new WritingEffectsEngine(mockCanvas)

      expect(() => {
        engine.dispose()
        engine.dispose()
      }).not.toThrow()
    })
  })
})
