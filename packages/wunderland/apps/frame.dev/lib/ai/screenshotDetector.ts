/**
 * Screenshot Detection Module
 * @module lib/ai/screenshotDetector
 *
 * Heuristic-based screenshot detection using:
 * - EXIF software field analysis
 * - Common screen resolution patterns
 * - Edge sharpness detection (UI elements)
 * - Color variance analysis (flat UI design)
 */

import type { ScreenshotDetectionResult, ImageMetadata } from './types'

/* ═══════════════════════════════════════════════════════════════════════════
   COMMON SCREEN RESOLUTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Common display resolutions (width x height)
 * Includes popular desktop, laptop, tablet, and phone resolutions
 */
const COMMON_SCREEN_RESOLUTIONS = [
  // Desktop/Laptop (16:9)
  { w: 1920, h: 1080 }, // Full HD
  { w: 2560, h: 1440 }, // QHD
  { w: 3840, h: 2160 }, // 4K
  { w: 1366, h: 768 },  // HD
  { w: 1600, h: 900 },  // HD+
  { w: 1280, h: 720 },  // HD

  // macOS (16:10)
  { w: 2880, h: 1800 }, // MacBook Pro 15/16"
  { w: 2560, h: 1600 }, // MacBook Pro 13"
  { w: 3024, h: 1964 }, // MacBook Air M2
  { w: 1440, h: 900 },  // MacBook Air

  // Ultrawide (21:9)
  { w: 3440, h: 1440 },
  { w: 2560, h: 1080 },

  // iPad
  { w: 2732, h: 2048 }, // iPad Pro 12.9"
  { w: 2388, h: 1668 }, // iPad Pro 11"
  { w: 2360, h: 1640 }, // iPad Air
  { w: 2048, h: 1536 }, // iPad

  // iPhone
  { w: 2796, h: 1290 }, // iPhone 15 Pro Max
  { w: 2556, h: 1179 }, // iPhone 15 Pro
  { w: 2532, h: 1170 }, // iPhone 14 Pro
  { w: 1792, h: 828 },  // iPhone 11/XR

  // Android
  { w: 2400, h: 1080 },
  { w: 1920, h: 1080 },
  { w: 1440, h: 720 },
]

/**
 * Screenshot software keywords (case-insensitive)
 */
const SCREENSHOT_SOFTWARE_KEYWORDS = [
  'screenshot',
  'snagit',
  'greenshot',
  'lightshot',
  'sharex',
  'flameshot',
  'spectacle',
  'screencapture', // macOS
  'snipping tool',
  'windows.graphics.capture',
  'screengrab',
]

/* ═══════════════════════════════════════════════════════════════════════════
   DETECTION FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Check if dimensions match common screen resolutions
 * Allows small variations due to window chrome, etc.
 */
function matchesScreenResolution(
  width: number,
  height: number,
  tolerance = 0.02 // 2% tolerance
): boolean {
  for (const res of COMMON_SCREEN_RESOLUTIONS) {
    // Check both portrait and landscape
    const matchesLandscape =
      Math.abs(width - res.w) / res.w <= tolerance &&
      Math.abs(height - res.h) / res.h <= tolerance

    const matchesPortrait =
      Math.abs(width - res.h) / res.h <= tolerance &&
      Math.abs(height - res.w) / res.w <= tolerance

    if (matchesLandscape || matchesPortrait) {
      return true
    }
  }

  return false
}

/**
 * Detect if EXIF software field indicates screenshot tool
 */
function hasScreenshotSoftware(metadata?: ImageMetadata): boolean {
  if (!metadata?.exif?.software) return false

  const software = metadata.exif.software.toLowerCase()
  return SCREENSHOT_SOFTWARE_KEYWORDS.some((keyword) =>
    software.includes(keyword.toLowerCase())
  )
}

/**
 * Analyze image for screenshot characteristics using Canvas API
 * - Sharp edges (UI elements)
 * - Low color variance (flat design)
 */
async function analyzeImageCharacteristics(
  blob: Blob
): Promise<{
  hasSharpEdges: boolean
  hasLowColorVariance: boolean
  edgeScore: number
  colorVariance: number
}> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    if (!ctx) {
      reject(new Error('Canvas context not available'))
      return
    }

    img.onload = () => {
      // Downscale for performance (max 512px)
      const scale = Math.min(512 / Math.max(img.width, img.height), 1)
      canvas.width = img.width * scale
      canvas.height = img.height * scale

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const pixels = imageData.data

      // Sample pixels (every 4th pixel to improve performance)
      const sampleRate = 4
      const samples: number[] = []
      let edgeCount = 0
      const edgeThreshold = 30 // Luminance difference threshold

      for (let y = 0; y < canvas.height; y += sampleRate) {
        for (let x = 0; x < canvas.width; x += sampleRate) {
          const i = (y * canvas.width + x) * 4
          const r = pixels[i]
          const g = pixels[i + 1]
          const b = pixels[i + 2]

          // Luminance (grayscale value)
          const lum = 0.299 * r + 0.587 * g + 0.114 * b
          samples.push(lum)

          // Edge detection (simple horizontal/vertical gradient)
          if (x > 0 && y > 0) {
            const iPrev = (y * canvas.width + (x - sampleRate)) * 4
            const lumPrev = 0.299 * pixels[iPrev] + 0.587 * pixels[iPrev + 1] + 0.114 * pixels[iPrev + 2]

            if (Math.abs(lum - lumPrev) > edgeThreshold) {
              edgeCount++
            }
          }
        }
      }

      // Calculate color variance
      const mean = samples.reduce((a, b) => a + b, 0) / samples.length
      const variance =
        samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length

      // Edge score: normalized by sample count
      const edgeScore = edgeCount / samples.length

      // Screenshots typically have:
      // - High edge score (UI elements, text) > 0.15
      // - Moderate variance (not too uniform, not too noisy) 1000-5000
      const hasSharpEdges = edgeScore > 0.15
      const hasLowColorVariance = variance > 1000 && variance < 5000

      resolve({
        hasSharpEdges,
        hasLowColorVariance,
        edgeScore,
        colorVariance: variance,
      })
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(blob)
  })
}

/* ═══════════════════════════════════════════════════════════════════════════
   PUBLIC API
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Detect if an image is likely a screenshot
 *
 * Uses multiple heuristics:
 * 1. EXIF software field (e.g., "macOS Screenshot")
 * 2. Common screen resolutions
 * 3. Sharp edges (UI elements)
 * 4. Color variance (flat design)
 *
 * @param blob - Image blob
 * @param metadata - Optional extracted EXIF metadata
 * @returns Detection result with confidence and reasoning
 */
export async function detectScreenshot(
  blob: Blob,
  metadata?: ImageMetadata
): Promise<ScreenshotDetectionResult> {
  const factors = {
    hasScreenshotSoftware: false,
    hasCommonResolution: false,
    hasSharpEdges: false,
    hasLowColorVariance: false,
  }

  const reasons: string[] = []
  let confidence = 0

  try {
    // Factor 1: Check EXIF software (strongest signal)
    factors.hasScreenshotSoftware = hasScreenshotSoftware(metadata)
    if (factors.hasScreenshotSoftware) {
      confidence += 0.5 // 50% confidence from EXIF alone
      reasons.push(`EXIF software: "${metadata?.exif?.software}"`)
    }

    // Factor 2: Check dimensions against common resolutions
    if (metadata?.dimensions) {
      factors.hasCommonResolution = matchesScreenResolution(
        metadata.dimensions.width,
        metadata.dimensions.height
      )
      if (factors.hasCommonResolution) {
        confidence += 0.2 // 20% confidence from resolution
        reasons.push(
          `Matches common screen resolution (${metadata.dimensions.width}x${metadata.dimensions.height})`
        )
      }
    }

    // Factor 3 & 4: Analyze image characteristics (if needed)
    if (confidence < 0.6) {
      const characteristics = await analyzeImageCharacteristics(blob)
      factors.hasSharpEdges = characteristics.hasSharpEdges
      factors.hasLowColorVariance = characteristics.hasLowColorVariance

      if (characteristics.hasSharpEdges) {
        confidence += 0.15 // 15% confidence from edges
        reasons.push(`Sharp edges detected (score: ${characteristics.edgeScore.toFixed(3)})`)
      }

      if (characteristics.hasLowColorVariance) {
        confidence += 0.15 // 15% confidence from color variance
        reasons.push(`Flat color design (variance: ${Math.round(characteristics.colorVariance)})`)
      }
    }

    // Final determination (threshold: 60%)
    const isScreenshot = confidence >= 0.6

    return {
      isScreenshot,
      confidence: Math.min(confidence, 1.0),
      reason: isScreenshot
        ? `Detected as screenshot: ${reasons.join(', ')}`
        : `Likely not a screenshot (confidence: ${Math.round(confidence * 100)}%)`,
      factors,
    }
  } catch (error) {
    console.warn('[ScreenshotDetector] Analysis failed:', error)
    return {
      isScreenshot: false,
      confidence: 0,
      reason: 'Screenshot detection failed',
      factors,
    }
  }
}

/**
 * Quick screenshot check using only EXIF (no image analysis)
 * Useful for fast filtering without heavy computation
 *
 * @param metadata - EXIF metadata
 * @returns True if EXIF indicates screenshot
 */
export function isScreenshotFromExif(metadata?: ImageMetadata): boolean {
  return hasScreenshotSoftware(metadata)
}
