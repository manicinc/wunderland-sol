/**
 * OpenAI DALL-E 3 Image Provider
 * @module lib/images/providers/openai
 *
 * Generates images using OpenAI's DALL-E 3 model.
 */

import OpenAI from 'openai'
import {
  type ImageProvider,
  type GenerateOptions,
  type GeneratedImage,
  buildEnhancedPrompt,
  generateImageId,
  registerProvider,
} from '../service'

export interface OpenAIConfig {
  apiKey?: string
  organization?: string
  timeout?: number
}

// Pricing as of 2024
const PRICING = {
  'dall-e-3': {
    '1024x1024': { standard: 0.04, hd: 0.08 },
    '1792x1024': { standard: 0.08, hd: 0.12 },
    '1024x1792': { standard: 0.08, hd: 0.12 },
  },
}

let client: OpenAI | null = null
let isConfigured = false

/**
 * Initialize the OpenAI provider
 */
export function initOpenAI(config: OpenAIConfig = {}) {
  const apiKey = config.apiKey || process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.warn('[OpenAI] No API key provided. Provider will be unavailable.')
    return
  }

  client = new OpenAI({
    apiKey,
    organization: config.organization,
    timeout: config.timeout || 120000, // 2 minute timeout for image generation
  })

  isConfigured = true
  registerProvider(OpenAIProvider)
}

/**
 * Parse size string to dimensions
 */
function parseSize(size: string): { width: number; height: number } {
  const [width, height] = size.split('x').map(Number)
  return { width, height }
}

export const OpenAIProvider: ImageProvider = {
  id: 'openai',
  name: 'OpenAI DALL-E 3',

  isAvailable() {
    return isConfigured && client !== null
  },

  async generate(options: GenerateOptions): Promise<GeneratedImage> {
    if (!client) {
      throw new Error('OpenAI client not initialized. Call initOpenAI() first.')
    }

    const enhancedPrompt = buildEnhancedPrompt(options)
    const size = options.size || '1024x1024'
    const quality = options.quality || 'standard'

    try {
      const response = await client.images.generate({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1, // DALL-E 3 only supports n=1
        size: size as '1024x1024' | '1792x1024' | '1024x1792',
        quality: quality,
        response_format: 'url', // Can also use 'b64_json'
      })

      const imageData = response.data?.[0]

      if (!imageData?.url) {
        throw new Error('No image URL in response')
      }

      const dimensions = parseSize(size)
      const pricing = PRICING['dall-e-3'][size as keyof typeof PRICING['dall-e-3']]
      const cost = pricing[quality as keyof typeof pricing]

      return {
        id: generateImageId(),
        url: imageData.url,
        prompt: options.prompt,
        enhancedPrompt,
        provider: 'openai',
        model: 'dall-e-3',
        size: dimensions,
        createdAt: new Date(),
        cost,
        metadata: {
          styleId: options.style?.id,
          ...options.metadata,
        },
      }
    } catch (error) {
      console.error('[OpenAI] Image generation failed:', error)

      if (error instanceof OpenAI.APIError) {
        if (error.status === 400 && error.message.includes('content_policy')) {
          throw new Error('Image generation blocked by content policy. Please modify your prompt.')
        }
        if (error.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.')
        }
        if (error.status === 401) {
          throw new Error('Invalid API key. Please check your OpenAI configuration.')
        }
      }

      throw error
    }
  },

  estimateCost(count: number, quality: 'standard' | 'hd' = 'standard'): number {
    // Assume 1024x1024 as default
    const pricePerImage = quality === 'hd' ? 0.08 : 0.04
    return count * pricePerImage
  },
}

// Auto-initialize if API key is in environment
if (typeof process !== 'undefined' && process.env?.OPENAI_API_KEY) {
  initOpenAI()
}
