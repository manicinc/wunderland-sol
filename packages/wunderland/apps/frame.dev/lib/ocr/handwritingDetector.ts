/**
 * Handwriting Detection Utility
 * @module lib/ocr/handwritingDetector
 *
 * Heuristic-based detection of handwritten content in images
 */

/**
 * Detect if an image likely contains handwriting
 *
 * Uses simple heuristics:
 * - Mostly white/light background (typical of paper/whiteboard)
 * - Presence of dark strokes (typical of handwriting/ink)
 * - Not a photo (photos have more color variance)
 *
 * @param imageBlob - Image blob to analyze
 * @returns Promise resolving to detection result
 */
export async function detectHandwriting(
  imageBlob: Blob
): Promise<{
  isHandwriting: boolean
  confidence: number
  reason: string
}> {
  try {
    // Create image bitmap for analysis
    const img = await createImageBitmap(imageBlob)

    // Create small canvas for sampling (100x100 is sufficient)
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    if (!ctx) {
      return {
        isHandwriting: false,
        confidence: 0,
        reason: 'Failed to create canvas context',
      }
    }

    // Draw scaled image
    ctx.drawImage(img, 0, 0, 100, 100)

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, 100, 100)
    const data = imageData.data
    const totalPixels = 100 * 100

    // Analyze pixels
    let whitePixels = 0
    let darkPixels = 0
    let colorVariance = 0
    let grayPixels = 0

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      // Calculate brightness (0-255)
      const brightness = (r + g + b) / 3

      // Calculate color variance (how different R, G, B are)
      const variance = Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b)
      colorVariance += variance

      // Classify pixels
      if (brightness > 200) {
        whitePixels++
      } else if (brightness < 100) {
        darkPixels++
      } else {
        grayPixels++
      }
    }

    // Calculate percentages
    const whitePercent = (whitePixels / totalPixels) * 100
    const darkPercent = (darkPixels / totalPixels) * 100
    const avgColorVariance = colorVariance / totalPixels

    // Heuristics for handwriting detection:
    // 1. Mostly white background (60%+ white pixels)
    // 2. Some dark strokes (1%+ dark pixels)
    // 3. Low color variance (grayscale-ish, <30)
    // 4. Not too much dark (< 40%, otherwise might be a dark image)

    const hasWhiteBackground = whitePercent > 60
    const hasDarkStrokes = darkPercent > 1 && darkPercent < 40
    const isGrayscale = avgColorVariance < 30

    const isHandwriting = hasWhiteBackground && hasDarkStrokes && isGrayscale

    // Calculate confidence (0-1)
    let confidence = 0
    if (hasWhiteBackground) confidence += 0.4
    if (hasDarkStrokes) confidence += 0.4
    if (isGrayscale) confidence += 0.2

    // Build reason string
    const reasons: string[] = []
    if (hasWhiteBackground) reasons.push('white background')
    if (hasDarkStrokes) reasons.push('dark strokes')
    if (isGrayscale) reasons.push('grayscale')

    const reason = isHandwriting
      ? `Detected: ${reasons.join(', ')}`
      : `Not detected: ${!hasWhiteBackground ? 'no white background' : !hasDarkStrokes ? 'no dark strokes' : 'too colorful'}`

    return {
      isHandwriting,
      confidence,
      reason,
    }
  } catch (error) {
    console.error('[detectHandwriting] Error:', error)
    return {
      isHandwriting: false,
      confidence: 0,
      reason: error instanceof Error ? error.message : 'Detection failed',
    }
  }
}

/**
 * Quick check if image is likely handwriting (without detailed analysis)
 *
 * @param imageBlob - Image blob to check
 * @returns Promise resolving to boolean
 */
export async function isLikelyHandwriting(imageBlob: Blob): Promise<boolean> {
  const result = await detectHandwriting(imageBlob)
  return result.isHandwriting && result.confidence > 0.6
}
