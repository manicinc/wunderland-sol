/**
 * Ink Processor Tests
 * @module __tests__/unit/ocr/inkProcessor
 *
 * Tests for the ink smoothing and stroke processing system
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  processStroke,
  processStrokes,
  type InkStroke,
  type InkProcessorConfig,
} from '@/lib/ocr/inkProcessor'

describe('inkProcessor', () => {
  describe('processStroke', () => {
    it('should return empty stroke unchanged', () => {
      const stroke: InkStroke = {
        points: [],
      }

      const result = processStroke(stroke)

      expect(result.points).toHaveLength(0)
    })

    it('should return single point stroke unchanged', () => {
      const stroke: InkStroke = {
        points: [{ x: 100, y: 100 }],
      }

      const result = processStroke(stroke, { enablePressureNormalization: false })

      expect(result.points).toHaveLength(1)
      expect(result.points[0]).toMatchObject({ x: 100, y: 100 })
    })

    it('should remove jitter from close points', () => {
      const stroke: InkStroke = {
        points: [
          { x: 0, y: 0 },
          { x: 0.5, y: 0.5 }, // Too close, should be removed
          { x: 1, y: 1 }, // Too close, should be removed
          { x: 10, y: 10 }, // Far enough, should be kept
          { x: 20, y: 20 }, // Far enough, should be kept
        ],
      }

      const result = processStroke(stroke, { jitterThreshold: 5, enablePressureNormalization: false })

      // First, last, and points > threshold apart should be kept
      expect(result.points.length).toBeLessThan(stroke.points.length)
      expect(result.points[0]).toMatchObject({ x: 0, y: 0 })
      expect(result.points[result.points.length - 1]).toMatchObject({ x: 20, y: 20 })
    })

    it('should smooth strokes with Catmull-Rom splines when enabled', () => {
      const stroke: InkStroke = {
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 20, y: 10 },
          { x: 30, y: 10 },
          { x: 40, y: 0 },
        ],
      }

      const result = processStroke(stroke, {
        enableSmoothing: true,
        tension: 0.5,
        interpolationSteps: 2,
        jitterThreshold: 0, // Disable jitter removal
      })

      // Should have more points after interpolation
      expect(result.points.length).toBeGreaterThan(stroke.points.length)
    })

    it('should not smooth strokes when disabled', () => {
      const stroke: InkStroke = {
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
          { x: 20, y: 20 },
        ],
      }

      const result = processStroke(stroke, {
        enableSmoothing: false,
        jitterThreshold: 0,
        enablePressureNormalization: false,
      })

      expect(result.points).toHaveLength(3)
    })

    it('should normalize pressure values', () => {
      const stroke: InkStroke = {
        points: [
          { x: 0, y: 0, pressure: 0.1 },
          { x: 10, y: 10, pressure: 0.5 },
          { x: 20, y: 20, pressure: 0.9 },
        ],
      }

      const result = processStroke(stroke, {
        enableSmoothing: false,
        enablePressureNormalization: true,
        pressureRange: [0.3, 1.0],
        jitterThreshold: 0,
      })

      // All pressure values should be within target range
      for (const p of result.points) {
        expect(p.pressure).toBeGreaterThanOrEqual(0.3)
        expect(p.pressure).toBeLessThanOrEqual(1.0)
      }
    })

    it('should add default pressure when missing', () => {
      const stroke: InkStroke = {
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
          { x: 20, y: 20 },
        ],
      }

      const result = processStroke(stroke, {
        enableSmoothing: false,
        enablePressureNormalization: true,
        pressureRange: [0.3, 1.0],
        jitterThreshold: 0,
      })

      // All points should have pressure values
      for (const p of result.points) {
        expect(p.pressure).toBeDefined()
        expect(p.pressure).toBeGreaterThanOrEqual(0.3)
        expect(p.pressure).toBeLessThanOrEqual(1.0)
      }
    })

    it('should preserve stroke metadata', () => {
      const stroke: InkStroke = {
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
        color: '#ff0000',
        size: 3,
      }

      const result = processStroke(stroke)

      expect(result.color).toBe('#ff0000')
      expect(result.size).toBe(3)
    })
  })

  describe('processStrokes', () => {
    it('should process multiple strokes', () => {
      const strokes: InkStroke[] = [
        {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 10 },
          ],
        },
        {
          points: [
            { x: 20, y: 20 },
            { x: 30, y: 30 },
          ],
        },
      ]

      const result = processStrokes(strokes)

      expect(result).toHaveLength(2)
    })

    it('should apply same config to all strokes', () => {
      const strokes: InkStroke[] = [
        {
          points: [
            { x: 0, y: 0, pressure: 0.2 },
            { x: 10, y: 10, pressure: 0.8 },
          ],
        },
        {
          points: [
            { x: 20, y: 20, pressure: 0.1 },
            { x: 30, y: 30, pressure: 0.9 },
          ],
        },
      ]

      const config: InkProcessorConfig = {
        enableSmoothing: false,
        enablePressureNormalization: true,
        pressureRange: [0.4, 0.9],
        jitterThreshold: 0,
      }

      const result = processStrokes(strokes, config)

      for (const stroke of result) {
        for (const p of stroke.points) {
          expect(p.pressure).toBeGreaterThanOrEqual(0.4)
          expect(p.pressure).toBeLessThanOrEqual(0.9)
        }
      }
    })
  })

  describe('Catmull-Rom smoothing', () => {
    it('should create smooth curves through control points', () => {
      // Create a zigzag pattern
      const stroke: InkStroke = {
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 20 },
          { x: 20, y: 0 },
          { x: 30, y: 20 },
          { x: 40, y: 0 },
        ],
      }

      const result = processStroke(stroke, {
        enableSmoothing: true,
        tension: 0.5,
        interpolationSteps: 4,
        jitterThreshold: 0,
        enablePressureNormalization: false,
      })

      // More points than original
      expect(result.points.length).toBeGreaterThan(stroke.points.length)

      // First and last points should be preserved
      expect(result.points[0].x).toBeCloseTo(0, 0)
      expect(result.points[0].y).toBeCloseTo(0, 0)
      expect(result.points[result.points.length - 1].x).toBeCloseTo(40, 0)
      expect(result.points[result.points.length - 1].y).toBeCloseTo(0, 0)
    })

    it('should respect tension parameter', () => {
      const stroke: InkStroke = {
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
          { x: 20, y: 0 },
          { x: 30, y: 10 },
        ],
      }

      const sharpResult = processStroke(stroke, {
        enableSmoothing: true,
        tension: 0.0, // Sharp corners
        interpolationSteps: 4,
        jitterThreshold: 0,
        enablePressureNormalization: false,
      })

      const smoothResult = processStroke(stroke, {
        enableSmoothing: true,
        tension: 1.0, // Smooth curves
        interpolationSteps: 4,
        jitterThreshold: 0,
        enablePressureNormalization: false,
      })

      // Both should have the same number of points
      expect(sharpResult.points.length).toBe(smoothResult.points.length)

      // But the intermediate points should differ
      // Check that at least one point differs significantly
      let hasDifference = false
      for (let i = 1; i < sharpResult.points.length - 1; i++) {
        const dx = Math.abs(sharpResult.points[i].x - smoothResult.points[i].x)
        const dy = Math.abs(sharpResult.points[i].y - smoothResult.points[i].y)
        if (dx > 0.1 || dy > 0.1) {
          hasDifference = true
          break
        }
      }
      expect(hasDifference).toBe(true)
    })
  })

  describe('pressure normalization', () => {
    it('should handle uniform pressure', () => {
      const stroke: InkStroke = {
        points: [
          { x: 0, y: 0, pressure: 0.5 },
          { x: 10, y: 10, pressure: 0.5 },
          { x: 20, y: 20, pressure: 0.5 },
        ],
      }

      const result = processStroke(stroke, {
        enableSmoothing: false,
        enablePressureNormalization: true,
        pressureRange: [0.3, 1.0],
        jitterThreshold: 0,
      })

      // All pressures should be mid-range
      const midRange = (0.3 + 1.0) / 2
      for (const p of result.points) {
        expect(p.pressure).toBeCloseTo(midRange, 1)
      }
    })

    it('should normalize extreme pressure values', () => {
      const stroke: InkStroke = {
        points: [
          { x: 0, y: 0, pressure: 0.0 },
          { x: 10, y: 10, pressure: 1.0 },
        ],
      }

      const result = processStroke(stroke, {
        enableSmoothing: false,
        enablePressureNormalization: true,
        pressureRange: [0.3, 1.0],
        jitterThreshold: 0,
      })

      expect(result.points[0].pressure).toBeCloseTo(0.3, 1)
      expect(result.points[1].pressure).toBeCloseTo(1.0, 1)
    })
  })
})
