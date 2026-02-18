/**
 * Image Generation Service
 * @module lib/images/service
 *
 * Core service for generating images with provider abstraction.
 */

import type { VisualizationStyle } from '../visualization/presets'

export interface GeneratedImage {
  /** Unique ID for this image */
  id: string
  /** Image URL (temporary or permanent) */
  url: string
  /** Base64 encoded image data */
  base64?: string
  /** Original prompt used */
  prompt: string
  /** Enhanced prompt (after style injection) */
  enhancedPrompt: string
  /** Provider used */
  provider: 'openai' | 'replicate'
  /** Model used */
  model: string
  /** Image dimensions */
  size: {
    width: number
    height: number
  }
  /** Seed used (for reproducibility) */
  seed?: number
  /** Generation timestamp */
  createdAt: Date
  /** Cost in USD */
  cost: number
  /** Metadata */
  metadata: {
    styleId?: string
    chunkId?: string
    pageNumber?: number
    illustrationIndex?: number
  }
}

export interface GenerateOptions {
  /** Base prompt describing what to generate */
  prompt: string
  /** Visualization style to apply */
  style?: VisualizationStyle
  /** Image size */
  size?: '1024x1024' | '1792x1024' | '1024x1792'
  /** Quality level (OpenAI only) */
  quality?: 'standard' | 'hd'
  /** Number of images to generate */
  count?: number
  /** Seed for reproducibility (Replicate only for now) */
  seed?: number
  /** Reference image URL for style transfer */
  referenceImage?: string
  /** Custom prompt prefix */
  promptPrefix?: string
  /** Custom prompt suffix */
  promptSuffix?: string
  /** Model variant (for Replicate: flux-schnell, flux-dev, flux-pro) */
  model?: string
  /** Negative prompt (things to avoid) */
  negativePrompt?: string
  /** Metadata to attach */
  metadata?: Record<string, unknown>
}

export interface ProviderConfig {
  apiKey?: string
  baseUrl?: string
  timeout?: number
}

export interface ImageProvider {
  id: 'openai' | 'replicate'
  name: string
  isAvailable(): boolean
  generate(options: GenerateOptions): Promise<GeneratedImage>
  estimateCost(count: number, quality?: 'standard' | 'hd'): number
}

// Provider registry
const providers: Map<string, ImageProvider> = new Map()

/**
 * Register a provider
 */
export function registerProvider(provider: ImageProvider) {
  providers.set(provider.id, provider)
}

/**
 * Get a specific provider
 */
export function getProvider(id: 'openai' | 'replicate'): ImageProvider | undefined {
  return providers.get(id)
}

/**
 * Get all available providers
 */
export function getAvailableProviders(): ImageProvider[] {
  return Array.from(providers.values()).filter(p => p.isAvailable())
}

/**
 * Build enhanced prompt with style injection
 */
export function buildEnhancedPrompt(options: GenerateOptions): string {
  const parts: string[] = []

  // Add style prefix
  if (options.style?.promptPrefix) {
    parts.push(options.style.promptPrefix)
  } else if (options.promptPrefix) {
    parts.push(options.promptPrefix)
  }

  // Add main prompt
  parts.push(options.prompt)

  // Add style suffix
  if (options.style?.promptSuffix) {
    parts.push(options.style.promptSuffix)
  } else if (options.promptSuffix) {
    parts.push(options.promptSuffix)
  }

  return parts.filter(Boolean).join('\n\n')
}

/**
 * Generate an image using the specified or default provider
 */
export async function generateImage(
  options: GenerateOptions,
  providerId: 'openai' | 'replicate' = 'openai'
): Promise<GeneratedImage> {
  const provider = getProvider(providerId)

  if (!provider) {
    throw new Error(`Provider ${providerId} not found. Did you initialize it?`)
  }

  if (!provider.isAvailable()) {
    // Try fallback provider
    const availableProviders = getAvailableProviders()
    if (availableProviders.length === 0) {
      throw new Error('No image generation providers available. Please configure API keys.')
    }
    return availableProviders[0].generate(options)
  }

  return provider.generate(options)
}

/**
 * Estimate cost for generating images
 */
export function estimateCost(
  count: number,
  providerId: 'openai' | 'replicate' = 'openai',
  quality: 'standard' | 'hd' = 'standard'
): number {
  const provider = getProvider(providerId)
  if (!provider) {
    // Default estimates
    if (providerId === 'openai') {
      return count * (quality === 'hd' ? 0.08 : 0.04)
    }
    return count * 0.003 // Replicate Flux estimate
  }
  return provider.estimateCost(count, quality)
}

/**
 * Generate a unique image ID
 */
export function generateImageId(): string {
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
