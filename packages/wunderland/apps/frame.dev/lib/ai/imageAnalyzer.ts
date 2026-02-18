/**
 * Image Analysis Orchestrator
 * @module lib/ai/imageAnalyzer
 *
 * Coordinates all image analysis features:
 * - Quick source detection (EXIF + heuristics)
 * - AI caption generation (GPT-4V/Claude Vision)
 * - Screenshot detection
 * - EXIF metadata extraction
 * - Object detection (TensorFlow.js)
 *
 * Runs analyses in parallel for optimal performance
 */

import type {
  ImageAnalysisResult,
  ImageAnalysisOptions,
  ImageSourceType,
  ImageMetadata,
} from './types'
import { extractExifMetadata, quickSourceDetection } from './exifExtractor'
import { detectScreenshot } from './screenshotDetector'
import { detectObjects, isObjectDetectionAvailable, summarizeDetections } from './objectDetector'
import { analyzeImage } from './vision'

/* ═══════════════════════════════════════════════════════════════════════════
   QUICK SOURCE DETECTION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Fast source type detection for upload flow
 * Uses EXIF and filename heuristics, no heavy analysis
 *
 * @param blob - Image blob
 * @param filename - Optional filename
 * @returns Detected source type
 */
export async function detectImageSource(
  blob: Blob,
  filename?: string
): Promise<ImageSourceType> {
  try {
    return await quickSourceDetection(blob, filename)
  } catch (error) {
    console.warn('[ImageAnalyzer] Source detection failed:', error)
    return 'unknown'
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPREHENSIVE ANALYSIS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Analyze an image comprehensively
 *
 * Runs enabled analyses in parallel:
 * 1. EXIF extraction (always, fast)
 * 2. Screenshot detection (if enabled)
 * 3. AI caption (if enabled) + Object detection (if enabled) - parallel
 *
 * @param blob - Image blob
 * @param filename - Optional filename for context
 * @param options - Analysis options
 * @returns Complete analysis result
 */
export async function analyzeImageComprehensive(
  blob: Blob,
  filename?: string,
  options: ImageAnalysisOptions = {}
): Promise<ImageAnalysisResult> {
  const startTime = Date.now()

  // Initialize result
  const result: ImageAnalysisResult = {
    sourceType: 'unknown',
    analyzedAt: new Date().toISOString(),
    status: 'analyzing',
  }

  try {
    // Step 1: EXIF extraction (always run, provides dimensions + source hints)
    let metadata: ImageMetadata | undefined
    if (options.extractExif !== false) {
      try {
        metadata = await extractExifMetadata(blob, filename)
        result.metadata = metadata
        console.log('[ImageAnalyzer] EXIF extracted:', metadata)
      } catch (error) {
        console.warn('[ImageAnalyzer] EXIF extraction failed:', error)
      }
    }

    // Step 2: Quick source detection
    result.sourceType = await detectImageSource(blob, filename)

    // Step 3: Screenshot detection (if enabled)
    if (options.detectScreenshot !== false) {
      try {
        result.screenshotDetection = await detectScreenshot(blob, metadata)
        console.log('[ImageAnalyzer] Screenshot detection:', result.screenshotDetection)

        // Override source type if high confidence screenshot
        if (
          result.screenshotDetection.isScreenshot &&
          result.screenshotDetection.confidence >= 0.6
        ) {
          result.sourceType = 'screenshot'
        }
      } catch (error) {
        console.warn('[ImageAnalyzer] Screenshot detection failed:', error)
      }
    }

    // Step 4 & 5: AI Caption + Object Detection (parallel)
    const parallelTasks: Promise<void>[] = []

    // AI Caption
    if (options.generateCaption !== false) {
      parallelTasks.push(
        (async () => {
          try {
            // Generate custom prompt based on source type
            let prompt = options.customPrompt
            if (!prompt) {
              if (result.sourceType === 'screenshot') {
                prompt =
                  'Describe this screenshot. What UI elements, applications, or content do you see? Be specific and concise.'
              } else {
                prompt =
                  'Describe this image in one clear, concise sentence. Focus on the main subject and key details.'
              }
            }

            // Call vision AI
            const visionResult = await analyzeImage(
              URL.createObjectURL(blob),
              prompt,
              {
                provider: options.provider,
                signal: options.signal,
              }
            )

            if (visionResult) {
              result.caption = visionResult.description
              result.captionConfidence = visionResult.confidence
              console.log('[ImageAnalyzer] AI caption generated:', result.caption)
            }
          } catch (error) {
            console.warn('[ImageAnalyzer] AI caption failed:', error)
          }
        })()
      )
    }

    // Object Detection
    if (options.detectObjects && isObjectDetectionAvailable()) {
      parallelTasks.push(
        (async () => {
          try {
            const objects = await detectObjects(blob, 10, 0.5)
            result.objects = objects
            console.log('[ImageAnalyzer] Objects detected:', summarizeDetections(objects))
          } catch (error) {
            console.warn('[ImageAnalyzer] Object detection failed:', error)
          }
        })()
      )
    }

    // Wait for all parallel tasks
    await Promise.all(parallelTasks)

    // Success
    result.status = 'done'
    const elapsed = Date.now() - startTime
    console.log(`[ImageAnalyzer] Analysis complete in ${elapsed}ms`)

    return result
  } catch (error) {
    console.error('[ImageAnalyzer] Comprehensive analysis failed:', error)
    result.status = 'error'
    result.error =
      error instanceof Error ? error.message : 'Image analysis failed'
    return result
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SMART AUTO-ANALYZE LOGIC
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Determine if an image should be auto-analyzed based on preferences
 *
 * Logic:
 * - If auto-analyze disabled → false
 * - If screenshot → always true
 * - If camera photo + AI caption enabled → true
 * - If upload + AI caption enabled → true
 * - Otherwise → false
 *
 * @param sourceType - Detected image source type
 * @param preferences - User AI preferences
 * @returns True if should auto-analyze
 */
export function shouldAutoAnalyze(
  sourceType: ImageSourceType,
  preferences: {
    autoAnalyze: boolean
    analysisFeatures: {
      aiCaption: boolean
      screenshotDetection: boolean
      exifExtraction: boolean
      objectDetection: boolean
    }
  }
): boolean {
  // Check if auto-analyze is enabled
  if (!preferences.autoAnalyze) return false

  // Always analyze screenshots
  if (sourceType === 'screenshot') return true

  // Analyze camera photos if AI caption enabled
  if (sourceType === 'camera' && preferences.analysisFeatures.aiCaption) {
    return true
  }

  // Analyze uploads if AI caption enabled
  if (sourceType === 'upload' && preferences.analysisFeatures.aiCaption) {
    return true
  }

  // Skip everything else
  return false
}

/**
 * Build analysis options from user preferences
 *
 * @param preferences - User AI preferences
 * @returns Analysis options configured per preferences
 */
export function buildAnalysisOptions(preferences: {
  provider?: 'openai' | 'anthropic'
  analysisFeatures: {
    aiCaption: boolean
    screenshotDetection: boolean
    exifExtraction: boolean
    objectDetection: boolean
  }
}): ImageAnalysisOptions {
  return {
    generateCaption: preferences.analysisFeatures.aiCaption,
    detectScreenshot: preferences.analysisFeatures.screenshotDetection,
    extractExif: preferences.analysisFeatures.exifExtraction,
    detectObjects: preferences.analysisFeatures.objectDetection,
    provider: preferences.provider,
  }
}
