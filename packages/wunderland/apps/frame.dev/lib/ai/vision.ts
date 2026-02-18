/**
 * Vision AI Service
 * @module lib/ai/vision
 * 
 * @description
 * Analyzes images using vision-capable AI models (GPT-4o, Claude 3.5).
 * - Supports diagrams, screenshots, charts, and general images
 * - Converts images to base64 for API calls
 * - Caches results by image hash
 * - Graceful degradation on failures
 */

import { isLLMAvailable, getAvailableProviders } from '@/lib/llm'
import { 
  withGracefulFailure, 
  AI_FEATURES,
  getAIPreferences,
  showAIError,
  type VisionAnalysisResult,
  type VisionAnalysisOptions,
} from '@/lib/ai'

// Re-export types for consumers
export type { VisionAnalysisResult, VisionAnalysisOptions }

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

const CACHE_KEY_PREFIX = 'codex-vision-'
const CACHE_EXPIRY_HOURS = 24 * 7 // 1 week

const DEFAULT_PROMPT = `Analyze this image in detail. 

If it's a diagram or flowchart:
- Describe the structure and flow
- List all nodes/elements and their relationships
- Explain what process or concept it illustrates

If it's a chart or graph:
- Identify the chart type
- Describe the data being represented
- Note any trends or key insights

If it's a screenshot:
- Describe the UI/interface shown
- Identify key elements and their purpose
- Note any important text or data

For any image:
- Provide a clear, detailed description
- Identify the image type
- Note any text visible in the image`

/* ═══════════════════════════════════════════════════════════════════════════
   IMAGE UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Convert image URL or blob to base64
 */
async function imageToBase64(image: string | Blob): Promise<string> {
  if (typeof image === 'string') {
    // If already base64
    if (image.startsWith('data:image/')) {
      return image.split(',')[1] || image
    }
    
    // Fetch the image
    const response = await fetch(image)
    const blob = await response.blob()
    return blobToBase64(blob)
  }
  
  return blobToBase64(image)
}

/**
 * Convert blob to base64
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      // Remove data URL prefix if present
      const base64 = result.split(',')[1] || result
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Get MIME type from base64 or blob
 */
function getMimeType(image: string | Blob): string {
  if (typeof image === 'string') {
    if (image.startsWith('data:image/png')) return 'image/png'
    if (image.startsWith('data:image/jpeg') || image.startsWith('data:image/jpg')) return 'image/jpeg'
    if (image.startsWith('data:image/gif')) return 'image/gif'
    if (image.startsWith('data:image/webp')) return 'image/webp'
    // Default for URL
    return 'image/jpeg'
  }
  return image.type || 'image/jpeg'
}

/**
 * Generate cache key from image
 */
async function generateCacheKey(image: string | Blob): Promise<string> {
  const data = typeof image === 'string' ? image : await blobToBase64(image)
  // Simple hash from first and last 100 chars + length
  const sample = data.slice(0, 100) + data.slice(-100) + data.length
  let hash = 0
  for (let i = 0; i < sample.length; i++) {
    const char = sample.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return CACHE_KEY_PREFIX + Math.abs(hash).toString(36)
}

/* ═══════════════════════════════════════════════════════════════════════════
   CACHE
═══════════════════════════════════════════════════════════════════════════ */

interface CachedResult {
  result: VisionAnalysisResult
  timestamp: number
}

/**
 * Get cached result
 */
function getCachedResult(key: string): VisionAnalysisResult | null {
  if (typeof window === 'undefined') return null
  
  try {
    const cached = localStorage.getItem(key)
    if (!cached) return null
    
    const { result, timestamp } = JSON.parse(cached) as CachedResult
    const expiryMs = CACHE_EXPIRY_HOURS * 60 * 60 * 1000
    
    if (Date.now() - timestamp > expiryMs) {
      localStorage.removeItem(key)
      return null
    }
    
    return result
  } catch {
    return null
  }
}

/**
 * Cache result
 */
function cacheResult(key: string, result: VisionAnalysisResult): void {
  if (typeof window === 'undefined') return
  
  try {
    const cached: CachedResult = {
      result,
      timestamp: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(cached))
  } catch {
    // Storage full or unavailable, ignore
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDER IMPLEMENTATIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Analyze image with OpenAI GPT-4o
 */
async function analyzeWithOpenAI(
  base64: string,
  mimeType: string,
  prompt: string,
  signal?: AbortSignal
): Promise<VisionAnalysisResult> {
  const response = await fetch('/api/ai/vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'openai',
      image: base64,
      mimeType,
      prompt,
    }),
    signal,
  })
  
  if (!response.ok) {
    throw new Error(`OpenAI Vision API error: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Analyze image with Anthropic Claude
 */
async function analyzeWithAnthropic(
  base64: string,
  mimeType: string,
  prompt: string,
  signal?: AbortSignal
): Promise<VisionAnalysisResult> {
  const response = await fetch('/api/ai/vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'anthropic',
      image: base64,
      mimeType,
      prompt,
    }),
    signal,
  })
  
  if (!response.ok) {
    throw new Error(`Anthropic Vision API error: ${response.statusText}`)
  }
  
  return response.json()
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN API
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Analyze an image with AI
 * 
 * @param image - URL, data URL, or Blob
 * @param prompt - Custom analysis prompt (optional)
 * @param options - Analysis options
 * @returns Analysis result or null on failure
 */
export async function analyzeImage(
  image: string | Blob,
  prompt?: string,
  options: VisionAnalysisOptions = {}
): Promise<VisionAnalysisResult | null> {
  // Check availability
  if (!isLLMAvailable()) {
    showAIError('Configure API keys to analyze images')
    return null
  }
  
  const prefs = getAIPreferences()
  if (!prefs.vision.enabled) {
    return null
  }
  
  // Check cache first
  const cacheKey = await generateCacheKey(image)
  const cached = getCachedResult(cacheKey)
  if (cached) {
    return cached
  }
  
  // Convert image to base64
  const base64 = await imageToBase64(image)
  const mimeType = getMimeType(image)
  const analysisPrompt = prompt || DEFAULT_PROMPT
  
  // Determine provider
  const preferredProvider = options.provider || prefs.vision.provider || 'openai'
  const availableProviders = getAvailableProviders()
  
  const startTime = Date.now()
  
  const result = await withGracefulFailure(
    async () => {
      // Try preferred provider first
      if (preferredProvider === 'openai' && availableProviders.includes('openai')) {
        return analyzeWithOpenAI(base64, mimeType, analysisPrompt, options.signal)
      }
      
      if (preferredProvider === 'anthropic' && availableProviders.includes('anthropic')) {
        return analyzeWithAnthropic(base64, mimeType, analysisPrompt, options.signal)
      }
      
      // Fallback to any available provider
      if (availableProviders.includes('openai')) {
        return analyzeWithOpenAI(base64, mimeType, analysisPrompt, options.signal)
      }
      
      if (availableProviders.includes('anthropic')) {
        return analyzeWithAnthropic(base64, mimeType, analysisPrompt, options.signal)
      }
      
      throw new Error('No vision-capable providers available')
    },
    {
      featureId: AI_FEATURES.VISION,
      maxRetries: 1,
      signal: options.signal,
    }
  )
  
  if (result) {
    // Add latency to result
    const finalResult: VisionAnalysisResult = {
      ...result,
      latency: Date.now() - startTime,
    }
    
    // Cache the result
    cacheResult(cacheKey, finalResult)
    
    return finalResult
  }
  
  return null
}

/**
 * Check if vision AI is available
 */
export function isVisionAvailable(): boolean {
  const prefs = getAIPreferences()
  if (!prefs.vision.enabled) return false
  
  const providers = getAvailableProviders()
  return providers.includes('openai') || providers.includes('anthropic')
}

/**
 * Clear vision cache
 */
export function clearVisionCache(): void {
  if (typeof window === 'undefined') return
  
  const keys = Object.keys(localStorage)
  for (const key of keys) {
    if (key.startsWith(CACHE_KEY_PREFIX)) {
      localStorage.removeItem(key)
    }
  }
}

/**
 * Get vision cache stats
 */
export function getVisionCacheStats(): { count: number; size: number } {
  if (typeof window === 'undefined') return { count: 0, size: 0 }
  
  let count = 0
  let size = 0
  
  const keys = Object.keys(localStorage)
  for (const key of keys) {
    if (key.startsWith(CACHE_KEY_PREFIX)) {
      count++
      const item = localStorage.getItem(key)
      if (item) {
        size += item.length * 2 // Approximate bytes (UTF-16)
      }
    }
  }
  
  return { count, size }
}

