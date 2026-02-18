/**
 * Object Detection Module
 * @module lib/ai/objectDetector
 *
 * Detects objects in images using TensorFlow.js and Coco-SSD model
 * Lazy-loads dependencies (~3MB total) only when enabled
 */

import type { ObjectDetection } from './types'

/* ═══════════════════════════════════════════════════════════════════════════
   LAZY LOADING
═══════════════════════════════════════════════════════════════════════════ */

let cocoSsdModel: any = null
let tfModule: any = null

/**
 * Lazy-load TensorFlow.js and Coco-SSD model
 * Only loads once per session, then cached
 */
async function loadModel() {
  if (cocoSsdModel) return cocoSsdModel

  try {
    // Load TensorFlow.js first (~500KB)
    if (!tfModule) {
      tfModule = await import('@tensorflow/tfjs')
      // Set backend (WebGL preferred, fallback to CPU)
      await tfModule.ready()
    }

    // Load Coco-SSD model (~2.5MB)
    const cocoSsd = await import('@tensorflow-models/coco-ssd')
    cocoSsdModel = await cocoSsd.load()

    console.log('[ObjectDetector] Model loaded successfully')
    return cocoSsdModel
  } catch (error) {
    console.error('[ObjectDetector] Failed to load model:', error)
    throw new Error('Object detection model failed to load')
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   DETECTION FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Detect objects in an image
 *
 * @param blob - Image blob
 * @param maxDetections - Maximum number of objects to detect (default: 10)
 * @param minScore - Minimum confidence score 0-1 (default: 0.5)
 * @returns Array of detected objects
 */
export async function detectObjects(
  blob: Blob,
  maxDetections = 10,
  minScore = 0.5
): Promise<ObjectDetection[]> {
  try {
    // Load model if needed
    const model = await loadModel()

    // Load image into HTML element
    const img = await createImageFromBlob(blob)

    // Run detection
    const predictions = await model.detect(img, maxDetections)

    // Convert to our format and filter by score
    const detections: ObjectDetection[] = predictions
      .filter((p: any) => p.score >= minScore)
      .map((p: any) => ({
        class: p.class,
        score: p.score,
        bbox: {
          x: p.bbox[0],
          y: p.bbox[1],
          width: p.bbox[2],
          height: p.bbox[3],
        },
      }))

    return detections
  } catch (error) {
    console.error('[ObjectDetector] Detection failed:', error)
    throw new Error('Object detection failed')
  }
}

/**
 * Create HTMLImageElement from blob
 */
function createImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(img.src)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load image'))
    }
    img.src = URL.createObjectURL(blob)
  })
}

/**
 * Check if object detection is available
 * Requires WebGL support for optimal performance
 */
export function isObjectDetectionAvailable(): boolean {
  if (typeof window === 'undefined') return false

  // Check WebGL support
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    return !!gl
  } catch {
    return false
  }
}

/**
 * Unload the model to free memory
 * Useful if user disables object detection
 */
export function unloadModel(): void {
  if (cocoSsdModel) {
    try {
      cocoSsdModel.dispose()
    } catch {
      // Ignore errors during disposal
    }
    cocoSsdModel = null
  }

  if (tfModule) {
    try {
      tfModule.disposeVariables()
    } catch {
      // Ignore errors during disposal
    }
  }

  console.log('[ObjectDetector] Model unloaded')
}

/**
 * Get summary of detected objects (counts by class)
 */
export function summarizeDetections(detections: ObjectDetection[]): string {
  if (detections.length === 0) return 'No objects detected'

  // Count objects by class
  const counts = new Map<string, number>()
  for (const det of detections) {
    counts.set(det.class, (counts.get(det.class) || 0) + 1)
  }

  // Format as readable string
  const parts: string[] = []
  for (const [cls, count] of counts) {
    parts.push(count > 1 ? `${count} ${cls}s` : cls)
  }

  return parts.join(', ')
}
