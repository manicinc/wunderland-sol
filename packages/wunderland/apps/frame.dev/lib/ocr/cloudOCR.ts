/**
 * Cloud OCR Service
 * @module lib/ocr/cloudOCR
 *
 * Cloud-based OCR fallback using GPT-4 Vision or Claude
 * for higher accuracy on difficult handwriting
 */

import { analyzeImage } from '@/lib/ai/vision'
import type { CloudOCROptions } from './types'

// Default OCR prompt optimized for handwriting transcription
const DEFAULT_OCR_PROMPT = `Transcribe all handwritten text from this image.

Rules:
- Output only the text, no descriptions or commentary
- Preserve line breaks and spacing as they appear
- Use [?] for words you cannot read with confidence
- Maintain original capitalization and punctuation
- If the image contains no readable text, respond with: [No text detected]

Transcription:`

/**
 * Transcribe handwritten text using cloud AI vision models
 *
 * @param imageBlob - Image containing handwritten text
 * @param options - Cloud OCR options
 * @returns Promise resolving to transcribed text and confidence
 */
export async function transcribeWithCloud(
  imageBlob: Blob,
  options: CloudOCROptions = {}
): Promise<{ text: string; confidence: number }> {
  const { provider = 'openai', customPrompt, signal } = options

  // Check for abort before starting
  if (signal?.aborted) {
    throw new Error('OCR cancelled')
  }

  const prompt = customPrompt || DEFAULT_OCR_PROMPT

  const startTime = performance.now()

  try {
    console.log(`[CloudOCR] Starting transcription with ${provider}`)

    // Use existing vision API framework
    const result = await analyzeImage(imageBlob, prompt, { provider, signal })

    const processingTime = Math.round(performance.now() - startTime)

    // Extract text from result
    let text = ''
    if (typeof result === 'string') {
      text = result
    } else if (result && typeof result === 'object' && 'text' in result) {
      text = result.text as string
    }

    // Clean up the text
    text = text.trim()

    // If response indicates no text, return empty
    if (text.includes('[No text detected]')) {
      text = ''
    }

    // Cloud models are generally high confidence (we don't get actual scores)
    // Estimate confidence based on response quality
    const confidence = estimateConfidence(text)

    console.log(
      `[CloudOCR] Transcribed in ${processingTime}ms, confidence: ${Math.round(confidence * 100)}%`
    )

    return {
      text,
      confidence,
    }
  } catch (error) {
    console.error('[CloudOCR] Transcription failed:', error)
    throw new Error(
      `Cloud OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Estimate confidence based on response characteristics
 *
 * Heuristics:
 * - Presence of [?] markers → lower confidence
 * - Very short responses → lower confidence
 * - Well-formed sentences → higher confidence
 *
 * @param text - Transcribed text
 * @returns Estimated confidence (0-1)
 */
function estimateConfidence(text: string): number {
  if (!text || text.length === 0) {
    return 0
  }

  let confidence = 0.95 // Start high for cloud models

  // Penalize for uncertainty markers
  const uncertaintyCount = (text.match(/\[?\?+\]?/g) || []).length
  confidence -= uncertaintyCount * 0.1

  // Penalize very short responses (likely incomplete)
  if (text.length < 10) {
    confidence -= 0.2
  }

  // Bonus for well-formed sentences (has periods, capitals)
  const hasPunctuation = /[.!?]/.test(text)
  const hasCapitals = /[A-Z]/.test(text)
  if (hasPunctuation && hasCapitals) {
    confidence += 0.05
  }

  // Clamp to valid range
  return Math.max(0.5, Math.min(1, confidence))
}

/**
 * Test if cloud OCR is available (has API keys configured)
 *
 * @returns Whether cloud OCR can be used
 */
export function isCloudOCRAvailable(): boolean {
  // Check if vision API is configured
  // This is a simple check - actual availability is tested when calling the API
  return typeof window !== 'undefined' && 'fetch' in window
}
