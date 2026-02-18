/**
 * Image Preprocessor for OCR
 * @module lib/ocr/imagePreprocessor
 *
 * Optimizes images for better OCR accuracy:
 * - Resizes to optimal dimensions
 * - Converts to grayscale
 * - Enhances contrast
 */

import type { PreprocessOptions } from './types'

const DEFAULT_OPTIONS: Required<PreprocessOptions> = {
  targetSize: 768,
  quality: 0.95,
  grayscale: true,
  contrastThreshold: 128,
}

/**
 * Preprocess an image for optimal OCR performance
 *
 * @param blob - Input image blob
 * @param options - Preprocessing options
 * @returns Preprocessed image blob
 */
export async function preprocessForOCR(
  blob: Blob,
  options: PreprocessOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Create image bitmap from blob
  const img = await createImageBitmap(blob)

  // Calculate scaling to fit target size
  const scale = Math.min(
    opts.targetSize / img.width,
    opts.targetSize / img.height,
    1 // Don't upscale, only downscale
  )

  const targetWidth = Math.floor(img.width * scale)
  const targetHeight = Math.floor(img.height * scale)

  // Create canvas for processing
  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  if (!ctx) {
    throw new Error('Failed to get 2D context from canvas')
  }

  // Draw image at target size
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

  // Apply grayscale and contrast enhancement
  if (opts.grayscale) {
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale using luminosity method
      const gray =
        0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]

      // Enhance contrast: make light pixels lighter, dark pixels darker
      let enhanced: number
      if (gray > opts.contrastThreshold) {
        // Light pixels → push toward white
        enhanced = 255
      } else if (gray < opts.contrastThreshold - 48) {
        // Dark pixels → push toward black
        enhanced = 0
      } else {
        // Mid-range pixels → keep as-is
        enhanced = gray
      }

      // Apply to RGB channels
      data[i] = enhanced
      data[i + 1] = enhanced
      data[i + 2] = enhanced
      // Alpha channel (data[i + 3]) remains unchanged
    }

    ctx.putImageData(imageData, 0, 0)
  }

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result)
        } else {
          reject(new Error('Failed to convert canvas to blob'))
        }
      },
      'image/jpeg',
      opts.quality
    )
  })
}

/**
 * Generate a simple hash of an image for caching
 *
 * @param blob - Image blob
 * @returns Promise resolving to hash string
 */
export async function hashImage(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
