/**
 * TrOCR Model Loader
 * @module lib/ocr/trocr
 *
 * Loads and manages the TrOCR model for local handwriting recognition
 * Uses Transformers.js for browser-based inference
 */

import type { TrOCRModelInfo } from './types'

// Model configuration
const MODEL_ID = 'Xenova/trocr-small-handwritten'
const MODEL_PATH = '/models/trocr-handwritten'

// Singleton promise for model loading
let modelPromise: Promise<any> | null = null
let modelInfo: TrOCRModelInfo = {
  modelId: MODEL_ID,
  modelPath: MODEL_PATH,
  loaded: false,
}

/**
 * Load the TrOCR model using Transformers.js
 *
 * @returns Promise resolving to the image-to-text pipeline
 */
export async function loadTrOCRModel(): Promise<any> {
  // Return existing promise if already loading/loaded
  if (modelPromise) {
    return modelPromise
  }

  modelPromise = (async () => {
    try {
      console.log('[TrOCR] Loading model:', MODEL_ID)
      const startTime = performance.now()

      // Dynamic import to avoid bundling Transformers.js in main bundle
      const { pipeline, env } = await import('@huggingface/transformers')

      // Configure transformers.js environment
      env.allowLocalModels = false // Use Hugging Face CDN
      env.useBrowserCache = true // Cache models in browser
      env.allowRemoteModels = true

      // Load the image-to-text pipeline with TrOCR model
      const pipe = await pipeline('image-to-text', MODEL_ID, {
        progress_callback: (progress: any) => {
          if (progress.status === 'downloading') {
            const percent = Math.round((progress.loaded / progress.total) * 100)
            console.log(
              `[TrOCR] Downloading ${progress.file}: ${percent}%`
            )
          }
        },
      })

      const loadTime = Math.round(performance.now() - startTime)
      console.log(`[TrOCR] Model loaded successfully in ${loadTime}ms`)

      // Update model info
      modelInfo = {
        modelId: MODEL_ID,
        modelPath: MODEL_PATH,
        loaded: true,
        loadedAt: new Date(),
      }

      return pipe
    } catch (error) {
      console.error('[TrOCR] Failed to load model:', error)

      // Update model info with error
      modelInfo = {
        ...modelInfo,
        loaded: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }

      // Reset promise so next attempt will retry
      modelPromise = null

      throw error
    }
  })()

  return modelPromise
}

/**
 * Get current model information
 *
 * @returns Current model info
 */
export function getModelInfo(): TrOCRModelInfo {
  return { ...modelInfo }
}

/**
 * Unload the model to free memory
 *
 * Note: Transformers.js doesn't provide explicit cleanup,
 * so this mainly resets our internal state
 */
export function unloadModel(): void {
  modelPromise = null
  modelInfo = {
    modelId: MODEL_ID,
    modelPath: MODEL_PATH,
    loaded: false,
  }
  console.log('[TrOCR] Model unloaded')
}

/**
 * Transcribe text from an image using TrOCR
 *
 * @param imageBlob - Image containing handwritten text
 * @returns Promise resolving to extracted text and confidence
 */
export async function transcribeWithTrOCR(
  imageBlob: Blob
): Promise<{ text: string; confidence: number }> {
  const startTime = performance.now()

  try {
    // Load model if not already loaded
    const pipe = await loadTrOCRModel()

    // Convert blob to data URL for transformers.js
    const dataUrl = await blobToDataURL(imageBlob)

    // Run inference
    const result = await pipe(dataUrl, {
      max_new_tokens: 256,
    })

    const processingTime = Math.round(performance.now() - startTime)

    // Extract text and calculate confidence
    let text = ''
    let confidence = 0

    if (Array.isArray(result)) {
      // Multiple results - take the first one
      text = result[0]?.generated_text || ''
      confidence = result[0]?.score || 0.5
    } else if (typeof result === 'object') {
      text = result.generated_text || result.text || ''
      confidence = result.score || 0.5
    } else if (typeof result === 'string') {
      text = result
      confidence = 0.5 // Default confidence for string-only results
    }

    console.log(
      `[TrOCR] Transcribed in ${processingTime}ms, confidence: ${Math.round(confidence * 100)}%`
    )

    return {
      text: text.trim(),
      confidence,
    }
  } catch (error) {
    console.error('[TrOCR] Transcription failed:', error)
    throw new Error(
      `TrOCR transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Convert a Blob to a data URL
 *
 * @param blob - Blob to convert
 * @returns Promise resolving to data URL string
 */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to convert blob to data URL'))
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
