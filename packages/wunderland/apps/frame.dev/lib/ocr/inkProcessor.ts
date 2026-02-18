/**
 * Ink Processor
 * @module lib/ocr/inkProcessor
 *
 * Smooths and normalizes handwriting strokes for better OCR accuracy:
 * - Catmull-Rom spline interpolation for smooth curves
 * - Pressure normalization for consistent line weights
 * - Jitter removal for cleaner strokes
 */

import type { Editor, TLDrawShape, TLGeoShape } from '@tldraw/tldraw'

/**
 * Point with optional pressure value
 */
export interface InkPoint {
  x: number
  y: number
  pressure?: number
}

/**
 * A stroke is a sequence of points
 */
export interface InkStroke {
  points: InkPoint[]
  color?: string
  size?: number
}

/**
 * Configuration for ink processing
 */
export interface InkProcessorConfig {
  /**
   * Enable Catmull-Rom spline smoothing
   * @default true
   */
  enableSmoothing?: boolean

  /**
   * Tension parameter for Catmull-Rom (0 = sharp, 1 = smooth)
   * @default 0.5
   */
  tension?: number

  /**
   * Number of interpolation points between original points
   * @default 4
   */
  interpolationSteps?: number

  /**
   * Enable pressure normalization
   * @default true
   */
  enablePressureNormalization?: boolean

  /**
   * Target pressure range [min, max]
   * @default [0.3, 1.0]
   */
  pressureRange?: [number, number]

  /**
   * Minimum distance between points to keep (jitter removal)
   * @default 2
   */
  jitterThreshold?: number

  /**
   * Enable Douglas-Peucker simplification
   * @default false
   */
  enableSimplification?: boolean

  /**
   * Douglas-Peucker tolerance (pixels)
   * @default 1
   */
  simplificationTolerance?: number
}

const DEFAULT_CONFIG: Required<InkProcessorConfig> = {
  enableSmoothing: true,
  tension: 0.5,
  interpolationSteps: 4,
  enablePressureNormalization: true,
  pressureRange: [0.3, 1.0],
  jitterThreshold: 2,
  enableSimplification: false,
  simplificationTolerance: 1,
}

/**
 * Calculate distance between two points
 */
function distance(p1: InkPoint, p2: InkPoint): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Remove jitter by filtering points that are too close together
 */
function removeJitter(points: InkPoint[], threshold: number): InkPoint[] {
  if (points.length < 2) return points

  const result: InkPoint[] = [points[0]]

  for (let i = 1; i < points.length - 1; i++) {
    const lastKept = result[result.length - 1]
    if (distance(lastKept, points[i]) >= threshold) {
      result.push(points[i])
    }
  }

  // Always keep last point
  if (points.length > 1) {
    result.push(points[points.length - 1])
  }

  return result
}

/**
 * Catmull-Rom spline interpolation
 *
 * Creates smooth curves through control points
 */
function catmullRomPoint(
  p0: InkPoint,
  p1: InkPoint,
  p2: InkPoint,
  p3: InkPoint,
  t: number,
  tension: number
): InkPoint {
  const t2 = t * t
  const t3 = t2 * t

  // Catmull-Rom basis functions with tension parameter
  const alpha = (1 - tension) / 2

  const h1 = -alpha * t3 + 2 * alpha * t2 - alpha * t
  const h2 = (2 - alpha) * t3 + (alpha - 3) * t2 + 1
  const h3 = (alpha - 2) * t3 + (3 - 2 * alpha) * t2 + alpha * t
  const h4 = alpha * t3 - alpha * t2

  const x = h1 * p0.x + h2 * p1.x + h3 * p2.x + h4 * p3.x
  const y = h1 * p0.y + h2 * p1.y + h3 * p2.y + h4 * p3.y

  // Interpolate pressure if available
  let pressure: number | undefined
  if (
    p0.pressure !== undefined &&
    p1.pressure !== undefined &&
    p2.pressure !== undefined &&
    p3.pressure !== undefined
  ) {
    pressure = h1 * p0.pressure + h2 * p1.pressure + h3 * p2.pressure + h4 * p3.pressure
    pressure = Math.max(0, Math.min(1, pressure))
  }

  return { x, y, pressure }
}

/**
 * Apply Catmull-Rom spline smoothing to a stroke
 */
function smoothStroke(
  points: InkPoint[],
  tension: number,
  steps: number
): InkPoint[] {
  if (points.length < 4) return points

  const result: InkPoint[] = []

  // Add first point
  result.push(points[0])

  // Interpolate between points
  for (let i = 0; i < points.length - 1; i++) {
    // Get 4 control points (with clamping at boundaries)
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[Math.min(points.length - 1, i + 1)]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    // Generate interpolated points
    for (let j = 1; j <= steps; j++) {
      const t = j / (steps + 1)
      const interpolated = catmullRomPoint(p0, p1, p2, p3, t, tension)
      result.push(interpolated)
    }

    // Add the next control point
    if (i < points.length - 2) {
      result.push(p2)
    }
  }

  // Add last point
  result.push(points[points.length - 1])

  return result
}

/**
 * Normalize pressure values to a consistent range
 */
function normalizePressure(
  points: InkPoint[],
  targetRange: [number, number]
): InkPoint[] {
  // Find actual pressure range
  let minPressure = Infinity
  let maxPressure = -Infinity
  let hasPressure = false

  for (const p of points) {
    if (p.pressure !== undefined) {
      hasPressure = true
      minPressure = Math.min(minPressure, p.pressure)
      maxPressure = Math.max(maxPressure, p.pressure)
    }
  }

  // No pressure data, add default
  if (!hasPressure) {
    return points.map((p) => ({
      ...p,
      pressure: (targetRange[0] + targetRange[1]) / 2,
    }))
  }

  // All same pressure, normalize to mid-range
  if (maxPressure === minPressure) {
    return points.map((p) => ({
      ...p,
      pressure: (targetRange[0] + targetRange[1]) / 2,
    }))
  }

  // Normalize to target range
  const sourceRange = maxPressure - minPressure
  const targetSize = targetRange[1] - targetRange[0]

  return points.map((p) => {
    if (p.pressure === undefined) {
      return { ...p, pressure: (targetRange[0] + targetRange[1]) / 2 }
    }

    const normalized =
      ((p.pressure - minPressure) / sourceRange) * targetSize + targetRange[0]
    return { ...p, pressure: normalized }
  })
}

/**
 * Douglas-Peucker line simplification algorithm
 *
 * Reduces number of points while preserving shape
 */
function simplifyPoints(points: InkPoint[], tolerance: number): InkPoint[] {
  if (points.length < 3) return points

  // Find the point with max perpendicular distance
  let maxDist = 0
  let maxIndex = 0

  const start = points[0]
  const end = points[points.length - 1]

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end)
    if (dist > maxDist) {
      maxDist = dist
      maxIndex = i
    }
  }

  // If max distance exceeds tolerance, recursively simplify
  if (maxDist > tolerance) {
    const left = simplifyPoints(points.slice(0, maxIndex + 1), tolerance)
    const right = simplifyPoints(points.slice(maxIndex), tolerance)

    // Combine, removing duplicate point at junction
    return [...left.slice(0, -1), ...right]
  }

  // Otherwise, just keep start and end
  return [start, end]
}

/**
 * Calculate perpendicular distance from point to line
 */
function perpendicularDistance(
  point: InkPoint,
  lineStart: InkPoint,
  lineEnd: InkPoint
): number {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y

  const mag = Math.sqrt(dx * dx + dy * dy)
  if (mag === 0) return distance(point, lineStart)

  const u = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (mag * mag)

  const closestX = lineStart.x + u * dx
  const closestY = lineStart.y + u * dy

  return Math.sqrt((point.x - closestX) ** 2 + (point.y - closestY) ** 2)
}

/**
 * Process a single stroke with all configured transformations
 */
export function processStroke(
  stroke: InkStroke,
  config: InkProcessorConfig = {}
): InkStroke {
  const opts = { ...DEFAULT_CONFIG, ...config }
  let points = [...stroke.points]

  // 1. Remove jitter
  if (opts.jitterThreshold > 0) {
    points = removeJitter(points, opts.jitterThreshold)
  }

  // 2. Simplify if enabled
  if (opts.enableSimplification && points.length > 3) {
    points = simplifyPoints(points, opts.simplificationTolerance)
  }

  // 3. Smooth with Catmull-Rom splines
  if (opts.enableSmoothing && points.length >= 4) {
    points = smoothStroke(points, opts.tension, opts.interpolationSteps)
  }

  // 4. Normalize pressure
  if (opts.enablePressureNormalization) {
    points = normalizePressure(points, opts.pressureRange)
  }

  return {
    ...stroke,
    points,
  }
}

/**
 * Process multiple strokes
 */
export function processStrokes(
  strokes: InkStroke[],
  config: InkProcessorConfig = {}
): InkStroke[] {
  return strokes.map((stroke) => processStroke(stroke, config))
}

/**
 * Extract strokes from tldraw draw shapes
 */
export function extractStrokesFromEditor(
  editor: Editor,
  shapeIds?: string[]
): InkStroke[] {
  const strokes: InkStroke[] = []

  const shapes = shapeIds
    ? shapeIds.map((id) => editor.getShape(id as any)).filter(Boolean)
    : editor.getCurrentPageShapes()

  for (const shape of shapes) {
    if (!shape) continue

    // Handle draw shapes
    if (shape.type === 'draw') {
      const drawShape = shape as TLDrawShape
      const segments = drawShape.props.segments || []

      for (const segment of segments) {
        if (segment.type === 'free' && segment.points) {
          const points: InkPoint[] = segment.points.map((pt: { x: number; y: number; z?: number }) => ({
            x: pt.x + shape.x,
            y: pt.y + shape.y,
            pressure: pt.z,
          }))

          strokes.push({
            points,
            color: drawShape.props.color,
            size: drawShape.props.size === 's' ? 1 : drawShape.props.size === 'm' ? 2 : 4,
          })
        }
      }
    }
  }

  return strokes
}

/**
 * Process all strokes in an editor for a specific shape
 */
export function processEditorStrokes(
  editor: Editor,
  shapeIds?: string[],
  config: InkProcessorConfig = {}
): InkStroke[] {
  const strokes = extractStrokesFromEditor(editor, shapeIds)
  return processStrokes(strokes, config)
}

/**
 * Render processed strokes to a canvas context
 *
 * Used to create smoothed images for OCR
 */
export function renderStrokesToCanvas(
  strokes: InkStroke[],
  ctx: CanvasRenderingContext2D,
  options: {
    backgroundColor?: string
    strokeColor?: string
    baseLineWidth?: number
    offsetX?: number
    offsetY?: number
  } = {}
): void {
  const {
    backgroundColor = '#ffffff',
    strokeColor = '#000000',
    baseLineWidth = 2,
    offsetX = 0,
    offsetY = 0,
  } = options

  // Clear with background
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  // Draw each stroke
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue

    ctx.beginPath()
    ctx.strokeStyle = stroke.color || strokeColor
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const points = stroke.points

    // Move to first point
    ctx.moveTo(points[0].x + offsetX, points[0].y + offsetY)

    // Draw through remaining points
    for (let i = 1; i < points.length; i++) {
      const p = points[i]
      const lineWidth = baseLineWidth * (p.pressure ?? 0.5) * 2
      ctx.lineWidth = Math.max(1, lineWidth)
      ctx.lineTo(p.x + offsetX, p.y + offsetY)
    }

    ctx.stroke()
  }
}

/**
 * Create a smoothed image from strokes for OCR processing
 */
export async function createSmoothedImage(
  strokes: InkStroke[],
  width: number,
  height: number,
  config: InkProcessorConfig = {}
): Promise<Blob> {
  // Process strokes
  const processed = processStrokes(strokes, config)

  // Create canvas
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get 2D context')
  }

  // Calculate bounds and offset
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity

  for (const stroke of processed) {
    for (const p of stroke.points) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
  }

  const padding = 20
  const offsetX = -minX + padding
  const offsetY = -minY + padding

  // Render strokes
  renderStrokesToCanvas(processed, ctx, {
    backgroundColor: '#ffffff',
    strokeColor: '#000000',
    baseLineWidth: 2,
    offsetX,
    offsetY,
  })

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create blob'))
        }
      },
      'image/png',
      1.0
    )
  })
}
