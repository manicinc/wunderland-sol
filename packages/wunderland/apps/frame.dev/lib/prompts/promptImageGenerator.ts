/**
 * Prompt Image Generator - DALL-E 3 Integration
 * @module lib/prompts/promptImageGenerator
 *
 * Generates unique artwork for writing prompts using OpenAI's DALL-E 3 API.
 * Supports multiple artistic styles and caches images locally.
 */

import { getAPIKey } from '@/lib/config/apiKeyStorage'
import type { ImageStyle, ImageGenerationResult } from './types'
import { IMAGE_STYLES } from './types'

/**
 * Error thrown when OpenAI API key is not configured
 */
export class NoAPIKeyError extends Error {
  constructor() {
    super('OpenAI API key not configured')
    this.name = 'NoAPIKeyError'
  }
}

/**
 * Error thrown when image generation fails
 */
export class ImageGenerationError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message)
    this.name = 'ImageGenerationError'
  }
}

/**
 * Prompt Image Generator class
 */
export class PromptImageGenerator {
  private apiKey: string | null = null
  private initialized = false

  /**
   * Initialize the generator by loading the API key
   */
  async init(): Promise<boolean> {
    try {
      const keyConfig = await getAPIKey('openai')
      this.apiKey = keyConfig?.key || null
      this.initialized = true
      return !!this.apiKey
    } catch (error) {
      console.error('[PromptImageGenerator] Failed to load API key:', error)
      this.initialized = true
      return false
    }
  }

  /**
   * Check if the generator is ready to use
   */
  isReady(): boolean {
    return this.initialized && !!this.apiKey
  }

  /**
   * Set the API key directly (for use with user-provided keys)
   */
  setAPIKey(key: string): void {
    this.apiKey = key
    this.initialized = true
  }

  /**
   * Generate an image for a writing prompt
   */
  async generateImage(
    promptText: string,
    style: ImageStyle = 'watercolor'
  ): Promise<ImageGenerationResult> {
    if (!this.apiKey) {
      throw new NoAPIKeyError()
    }

    const imagePrompt = this.buildImagePrompt(promptText, style)

    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: imagePrompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          response_format: 'b64_json',
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new ImageGenerationError(
          error.error?.message || `API error: ${response.statusText}`,
          response.status
        )
      }

      const data = await response.json()
      const imageData = data.data[0]

      return {
        imageData: `data:image/png;base64,${imageData.b64_json}`,
        revisedPrompt: imageData.revised_prompt || imagePrompt,
        generatedAt: new Date().toISOString(),
      }
    } catch (error) {
      if (error instanceof NoAPIKeyError || error instanceof ImageGenerationError) {
        throw error
      }
      throw new ImageGenerationError(
        error instanceof Error ? error.message : 'Unknown error during image generation'
      )
    }
  }

  /**
   * Generate image via server-side API route (for use in browser without exposing key)
   */
  async generateImageViaAPI(
    promptText: string,
    style: ImageStyle = 'watercolor'
  ): Promise<ImageGenerationResult> {
    try {
      const response = await fetch('/api/prompts/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          promptText,
          style,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new ImageGenerationError(
          error.error || `API error: ${response.statusText}`,
          response.status
        )
      }

      const data = await response.json()
      return {
        imageData: data.image,
        revisedPrompt: data.revisedPrompt,
        generatedAt: new Date().toISOString(),
      }
    } catch (error) {
      if (error instanceof ImageGenerationError) {
        throw error
      }
      throw new ImageGenerationError(
        error instanceof Error ? error.message : 'Unknown error during image generation'
      )
    }
  }

  /**
   * Build the DALL-E prompt based on writing prompt and style
   */
  private buildImagePrompt(promptText: string, style: ImageStyle): string {
    const styleConfig = IMAGE_STYLES[style]
    const concepts = this.extractConcepts(promptText)

    return `Create a beautiful illustration that visually represents the concept of: "${concepts}".
Style: ${styleConfig.promptSuffix}.
The image should be evocative, inspiring, and suitable as a journal prompt illustration.
Square format, high quality, no text or words in the image.`
  }

  /**
   * Extract key visual concepts from the prompt text
   */
  private extractConcepts(promptText: string): string {
    // Remove common question starters
    let concepts = promptText
      .replace(/^(what|how|when|where|why|if|describe|write about|reflect on|explain|document|create|imagine)\s+/i, '')
      .replace(/\?$/, '')
      .trim()

    // Truncate if too long
    if (concepts.length > 200) {
      concepts = concepts.slice(0, 200) + '...'
    }

    return concepts
  }
}

// Singleton instance
let generatorInstance: PromptImageGenerator | null = null

/**
 * Get the singleton PromptImageGenerator instance
 */
export async function getPromptImageGenerator(): Promise<PromptImageGenerator> {
  if (!generatorInstance) {
    generatorInstance = new PromptImageGenerator()
    await generatorInstance.init()
  }
  return generatorInstance
}

/**
 * Check if image generation is available
 */
export async function isImageGenerationAvailable(): Promise<boolean> {
  const generator = await getPromptImageGenerator()
  return generator.isReady()
}
