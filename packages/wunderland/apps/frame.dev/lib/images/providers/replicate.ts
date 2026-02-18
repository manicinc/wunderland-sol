/**
 * Replicate Flux Image Provider
 * @module lib/images/providers/replicate
 *
 * Generates images using Replicate's Flux models.
 * Supports seed-based consistency for character coherence.
 */

import Replicate from 'replicate'
import {
  type ImageProvider,
  type GenerateOptions,
  type GeneratedImage,
  buildEnhancedPrompt,
  generateImageId,
  registerProvider,
} from '../service'

export interface ReplicateConfig {
  apiToken?: string
  timeout?: number
}

// Replicate pricing is per-second compute
// Flux Schnell: ~$0.003 per image
// Flux Dev: ~$0.025 per image
const PRICING = {
  'flux-schnell': 0.003,
  'flux-dev': 0.025,
  'flux-pro': 0.055,
}

// Model versions
const MODELS = {
  'flux-schnell': 'black-forest-labs/flux-schnell',
  'flux-dev': 'black-forest-labs/flux-dev',
  'flux-pro': 'black-forest-labs/flux-pro',
}

let client: Replicate | null = null
let isConfigured = false

/**
 * Initialize the Replicate provider
 */
export function initReplicate(config: ReplicateConfig = {}) {
  const apiToken = config.apiToken || process.env.REPLICATE_API_TOKEN

  if (!apiToken) {
    console.warn('[Replicate] No API token provided. Provider will be unavailable.')
    return
  }

  client = new Replicate({
    auth: apiToken,
  })

  isConfigured = true
  registerProvider(ReplicateProvider)
}

/**
 * Parse size string to dimensions
 */
function parseSize(size: string): { width: number; height: number } {
  const [width, height] = size.split('x').map(Number)
  return { width, height }
}

/**
 * Map our size format to Replicate aspect ratio
 */
function getAspectRatio(size: string): string {
  switch (size) {
    case '1792x1024':
      return '16:9'
    case '1024x1792':
      return '9:16'
    default:
      return '1:1'
  }
}

export const ReplicateProvider: ImageProvider = {
  id: 'replicate',
  name: 'Replicate Flux',

  isAvailable() {
    return isConfigured && client !== null
  },

  async generate(options: GenerateOptions): Promise<GeneratedImage> {
    if (!client) {
      throw new Error('Replicate client not initialized. Call initReplicate() first.')
    }

    const enhancedPrompt = buildEnhancedPrompt(options)
    const size = options.size || '1024x1024'
    const dimensions = parseSize(size)

    // Allow explicit model override, otherwise default to quality-driven selection
    const requestedModel = typeof options.model === 'string' ? options.model : undefined
    const modelKey = (requestedModel && requestedModel in MODELS)
      ? (requestedModel as keyof typeof MODELS)
      : (options.quality === 'hd' ? 'flux-dev' : 'flux-schnell')
    const model = MODELS[modelKey]

    try {
      const input: Record<string, unknown> = {
        prompt: enhancedPrompt,
        aspect_ratio: (options.metadata && typeof (options.metadata as any).aspectRatio === 'string')
          ? (options.metadata as any).aspectRatio
          : getAspectRatio(size),
        output_format: 'png',
        output_quality: 90,
      }

      // Add seed if provided (for character consistency)
      if (options.seed !== undefined) {
        input.seed = options.seed
      }

      // Run the model
      const output = await client.run(model as `${string}/${string}`, { input })

      // Replicate returns an array of image URLs
      const imageUrl = Array.isArray(output) ? output[0] : output

      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new Error('No image URL in response')
      }

      return {
        id: generateImageId(),
        url: imageUrl,
        prompt: options.prompt,
        enhancedPrompt,
        provider: 'replicate',
        model: modelKey,
        size: dimensions,
        seed: options.seed,
        createdAt: new Date(),
        cost: PRICING[modelKey],
        metadata: {
          styleId: options.style?.id,
          ...options.metadata,
        },
      }
    } catch (error) {
      console.error('[Replicate] Image generation failed:', error)

      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          throw new Error('Rate limit exceeded. Please try again later.')
        }
        if (error.message.includes('authentication') || error.message.includes('401')) {
          throw new Error('Invalid API token. Please check your Replicate configuration.')
        }
      }

      throw error
    }
  },

  estimateCost(count: number, quality: 'standard' | 'hd' = 'standard'): number {
    const model = quality === 'hd' ? 'flux-dev' : 'flux-schnell'
    return count * PRICING[model]
  },
}

// Auto-initialize if API token is in environment
if (typeof process !== 'undefined' && process.env?.REPLICATE_API_TOKEN) {
  initReplicate()
}
