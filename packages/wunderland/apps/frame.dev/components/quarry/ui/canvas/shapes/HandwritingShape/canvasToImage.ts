/**
 * Canvas to Image Utility
 * @module codex/ui/canvas/shapes/HandwritingShape/canvasToImage
 *
 * Exports tldraw canvas strokes as PNG images for OCR processing
 * Includes optional ink smoothing for better OCR accuracy
 */

import type { Editor } from '@tldraw/tldraw'
import {
  extractStrokesFromEditor,
  processStrokes,
  renderStrokesToCanvas,
  type InkProcessorConfig,
} from '@/lib/ocr'

/**
 * Export canvas strokes for a shape as a PNG blob
 *
 * @param editor - tldraw editor instance
 * @param shapeId - ID of the HandwritingShape
 * @returns Promise resolving to PNG blob
 */
export async function exportCanvasStrokes(
  editor: Editor,
  shapeId: string
): Promise<Blob> {
  // Get SVG from tldraw
  const svg = await editor.getSvg([shapeId as any], {
    background: true,
    bounds: editor.getShapePageBounds(shapeId as any),
    padding: 0,
    darkMode: false, // Always export light mode for better OCR
  })

  if (!svg) {
    throw new Error('Failed to get SVG from editor')
  }

  // Get dimensions
  const bounds = editor.getShapePageBounds(shapeId as any)
  if (!bounds) {
    throw new Error('Failed to get shape bounds')
  }

  const width = Math.ceil(bounds.width)
  const height = Math.ceil(bounds.height)

  // Create canvas for rasterization
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get 2D context from canvas')
  }

  // Draw white background (helps OCR)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // Convert SVG to image
  const svgBlob = new Blob([new XMLSerializer().serializeToString(svg)], {
    type: 'image/svg+xml',
  })
  const url = URL.createObjectURL(svgBlob)

  try {
    // Load SVG as image
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = url
    })

    // Draw SVG onto canvas
    ctx.drawImage(img, 0, 0, width, height)

    // Convert canvas to PNG blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to convert canvas to blob'))
          }
        },
        'image/png',
        1.0 // Maximum quality
      )
    })
  } finally {
    // Clean up object URL
    URL.revokeObjectURL(url)
  }
}

/**
 * Export multiple shapes as a combined image
 *
 * @param editor - tldraw editor instance
 * @param shapeIds - Array of shape IDs to export
 * @returns Promise resolving to PNG blob
 */
export async function exportMultipleShapesAsImage(
  editor: Editor,
  shapeIds: string[]
): Promise<Blob> {
  // Get combined SVG
  const svg = await editor.getSvg(shapeIds as any, {
    background: true,
    darkMode: false,
    padding: 16,
  })

  if (!svg) {
    throw new Error('Failed to get SVG from editor')
  }

  // Get dimensions from SVG viewBox
  const viewBox = svg.getAttribute('viewBox')
  if (!viewBox) {
    throw new Error('SVG missing viewBox attribute')
  }

  const [, , width, height] = viewBox.split(' ').map(Number)

  // Create canvas
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get 2D context from canvas')
  }

  // White background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // Convert SVG to blob
  const svgBlob = new Blob([new XMLSerializer().serializeToString(svg)], {
    type: 'image/svg+xml',
  })
  const url = URL.createObjectURL(svgBlob)

  try {
    // Load and draw SVG
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = url
    })

    ctx.drawImage(img, 0, 0, width, height)

    // Convert to PNG
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to convert canvas to blob'))
          }
        },
        'image/png',
        1.0
      )
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Create a data URL from a blob for preview purposes
 *
 * @param blob - Image blob
 * @returns Promise resolving to data URL
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Download an image blob as a file
 *
 * @param blob - Image blob
 * @param filename - Download filename
 */
export function downloadImageBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Export options for smoothed canvas strokes
 */
export interface SmoothedExportOptions {
  /**
   * Ink processing configuration
   */
  inkConfig?: InkProcessorConfig

  /**
   * Background color for the export
   * @default '#ffffff'
   */
  backgroundColor?: string

  /**
   * Stroke color for the export
   * @default '#000000'
   */
  strokeColor?: string

  /**
   * Base line width for strokes
   * @default 2
   */
  baseLineWidth?: number

  /**
   * Padding around the content
   * @default 20
   */
  padding?: number
}

/**
 * Export canvas strokes with ink smoothing applied
 *
 * This function extracts strokes from tldraw, applies Catmull-Rom
 * spline smoothing, and renders to a clean canvas for better OCR accuracy.
 *
 * @param editor - tldraw editor instance
 * @param shapeId - ID of the shape containing strokes
 * @param options - Export and smoothing options
 * @returns Promise resolving to PNG blob with smoothed strokes
 *
 * @example
 * ```ts
 * const blob = await exportSmoothedCanvasStrokes(editor, shapeId, {
 *   inkConfig: {
 *     enableSmoothing: true,
 *     tension: 0.5,
 *     interpolationSteps: 4,
 *   }
 * })
 * ```
 */
export async function exportSmoothedCanvasStrokes(
  editor: Editor,
  shapeId: string,
  options: SmoothedExportOptions = {}
): Promise<Blob> {
  const {
    inkConfig = {},
    backgroundColor = '#ffffff',
    strokeColor = '#000000',
    baseLineWidth = 2,
    padding = 20,
  } = options

  // Extract raw strokes from the editor
  const rawStrokes = extractStrokesFromEditor(editor, [shapeId])

  if (rawStrokes.length === 0) {
    throw new Error('No strokes found in shape')
  }

  // Apply ink processing (smoothing, pressure normalization, etc.)
  const processedStrokes = processStrokes(rawStrokes, {
    enableSmoothing: true,
    tension: 0.5,
    interpolationSteps: 4,
    enablePressureNormalization: true,
    jitterThreshold: 2,
    ...inkConfig,
  })

  // Calculate bounds from processed strokes
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity

  for (const stroke of processedStrokes) {
    for (const p of stroke.points) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
  }

  // Calculate canvas size with padding
  const width = Math.ceil(maxX - minX) + padding * 2
  const height = Math.ceil(maxY - minY) + padding * 2

  // Create canvas
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(width, 100) // Minimum 100px
  canvas.height = Math.max(height, 100)
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get 2D context from canvas')
  }

  // Render processed strokes to canvas
  renderStrokesToCanvas(processedStrokes, ctx, {
    backgroundColor,
    strokeColor,
    baseLineWidth,
    offsetX: -minX + padding,
    offsetY: -minY + padding,
  })

  // Convert canvas to PNG blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to convert canvas to blob'))
        }
      },
      'image/png',
      1.0 // Maximum quality
    )
  })
}

/**
 * Check if smoothed export is available for a shape
 *
 * @param editor - tldraw editor instance
 * @param shapeId - ID of the shape to check
 * @returns True if the shape contains drawable strokes
 */
export function canExportSmoothed(editor: Editor, shapeId: string): boolean {
  try {
    const strokes = extractStrokesFromEditor(editor, [shapeId])
    return strokes.length > 0 && strokes.some((s) => s.points.length >= 2)
  } catch {
    return false
  }
}
