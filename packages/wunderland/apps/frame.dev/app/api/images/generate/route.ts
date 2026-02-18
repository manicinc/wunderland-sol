/**
 * Image Generation API
 * @module api/images/generate
 *
 * POST /api/images/generate
 *
 * Generates images using OpenAI DALL-E 3 or Replicate Flux models.
 * Supports style memory for character consistency across generations.
 */

import { NextRequest, NextResponse } from 'next/server'

// Use Node.js runtime for OpenAI/Replicate SDK compatibility
export const runtime = 'nodejs'
export const maxDuration = 120 // 2 minutes for image generation

interface GenerateRequest {
  /** Text prompt for image generation */
  prompt: string
  /** Provider to use (defaults to openai) */
  provider?: 'openai' | 'replicate'
  /** Style preset ID from visualization presets */
  styleId?: string
  /** Image size */
  size?: '1024x1024' | '1792x1024' | '1024x1792'
  /** Quality setting (OpenAI only) */
  quality?: 'standard' | 'hd'
  /** Model to use (Replicate only) */
  model?: 'flux-schnell' | 'flux-dev' | 'flux-pro'
  /** Seed for reproducibility (Replicate only) */
  seed?: number
  /** Character names for consistency (requires styleMemory) */
  characterNames?: string[]
  /** Setting name for consistency (requires styleMemory) */
  settingName?: string
  /** Additional scene description */
  sceneDescription?: string
  /** Style memory JSON for character consistency */
  styleMemory?: string
  /** Custom style configuration */
  customStyle?: {
    promptPrefix?: string
    promptSuffix?: string
    negativePrompt?: string
  }
  /** Additional metadata to attach */
  metadata?: Record<string, unknown>
}

/**
 * POST /api/images/generate
 *
 * Generate an image using AI models
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/images/generate', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     prompt: 'A dystopian cityscape with surveillance cameras',
 *     provider: 'openai',
 *     styleId: 'dystopian-noir',
 *     quality: 'hd',
 *   }),
 * })
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json()

    // Validate required fields
    if (!body.prompt && !body.sceneDescription) {
      return NextResponse.json(
        { error: 'Missing required field: prompt or sceneDescription' },
        { status: 400 }
      )
    }

    // Import the image service (dynamic import for tree-shaking)
    const { generateImage, getProvider, getAvailableProviders } = await import('@/lib/images/service')
    const { StyleMemory } = await import('@/lib/images/styleMemory')

    // Check provider availability
    const providerId = body.provider || 'openai'
    const provider = getProvider(providerId)

    if (!provider) {
      const available = getAvailableProviders()
      return NextResponse.json(
        {
          error: `Provider '${providerId}' is not available`,
          availableProviders: available.map(p => p.id),
          hint: providerId === 'openai'
            ? 'Set OPENAI_API_KEY environment variable'
            : 'Set REPLICATE_API_TOKEN environment variable',
        },
        { status: 400 }
      )
    }

    // Build the prompt
    let finalPrompt = body.prompt || ''
    let seed: number | undefined = body.seed
    let referenceImage: string | undefined

    // If style memory is provided, use it for character consistency
    if (body.styleMemory) {
      try {
        const memory = StyleMemory.fromJSON(body.styleMemory)
        const sceneResult = memory.buildScenePrompt({
          sceneDescription: body.sceneDescription || body.prompt,
          characterNames: body.characterNames,
          settingName: body.settingName,
        })

        finalPrompt = sceneResult.prompt
        seed = seed ?? sceneResult.seed
        referenceImage = sceneResult.referenceImage
      } catch (err) {
        console.warn('[API] Failed to parse style memory:', err)
        // Continue with basic prompt if style memory fails
      }
    }

    // Apply custom style modifiers if provided
    if (body.customStyle) {
      const parts: string[] = []
      if (body.customStyle.promptPrefix) {
        parts.push(body.customStyle.promptPrefix)
      }
      parts.push(finalPrompt)
      if (body.customStyle.promptSuffix) {
        parts.push(body.customStyle.promptSuffix)
      }
      finalPrompt = parts.join('\n\n')
    }

    // Get visualization style if provided
    let style = undefined
    if (body.styleId) {
      const { getStyle } = await import('@/lib/visualization/presets')
      style = getStyle(body.styleId)
    }

    // Generate the image
    const startTime = Date.now()
    const result = await generateImage({
      prompt: finalPrompt,
      style,
      size: body.size || '1024x1024',
      quality: body.quality || 'standard',
      model: body.model,
      seed,
      referenceImage,
      negativePrompt: body.customStyle?.negativePrompt,
      metadata: {
        ...body.metadata,
        characterNames: body.characterNames,
        settingName: body.settingName,
        requestedProvider: providerId,
      },
    }, providerId)

    const generationTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      image: {
        id: result.id,
        url: result.url,
        prompt: result.prompt,
        enhancedPrompt: result.enhancedPrompt,
        provider: result.provider,
        model: result.model,
        size: result.size,
        cost: result.cost,
        seed: result.seed,
        createdAt: result.createdAt.toISOString(),
        metadata: result.metadata,
      },
      timing: {
        generationMs: generationTime,
      },
    })
  } catch (error) {
    console.error('[API] Image generation error:', error)

    const message = error instanceof Error ? error.message : 'Image generation failed'

    // Determine appropriate status code
    let status = 500
    if (message.includes('content policy')) {
      status = 400
    } else if (message.includes('Rate limit')) {
      status = 429
    } else if (message.includes('Invalid API key') || message.includes('unauthorized')) {
      status = 401
    }

    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}

/**
 * GET /api/images/generate
 *
 * Returns API info and available providers
 */
export async function GET() {
  // Dynamic import to check availability
  const { getAvailableProviders, estimateCost } = await import('@/lib/images/service')

  const providers = getAvailableProviders()

  return NextResponse.json({
    status: 'ok',
    description: 'AI Image Generation API',
    availableProviders: providers.map(p => ({
      id: p.id,
      name: p.name,
      available: p.isAvailable(),
    })),
    methods: {
      POST: {
        contentType: 'application/json',
        fields: {
          prompt: {
            type: 'string',
            required: true,
            description: 'Text prompt for image generation',
          },
          provider: {
            type: 'string',
            enum: ['openai', 'replicate'],
            default: 'openai',
            description: 'AI provider to use',
          },
          styleId: {
            type: 'string',
            description: 'Visualization preset ID for styling',
          },
          size: {
            type: 'string',
            enum: ['1024x1024', '1792x1024', '1024x1792'],
            default: '1024x1024',
            description: 'Output image dimensions',
          },
          quality: {
            type: 'string',
            enum: ['standard', 'hd'],
            default: 'standard',
            description: 'Image quality (OpenAI only)',
          },
          model: {
            type: 'string',
            enum: ['flux-schnell', 'flux-dev', 'flux-pro'],
            description: 'Model variant (Replicate only)',
          },
          seed: {
            type: 'number',
            description: 'Seed for reproducibility (Replicate only)',
          },
          characterNames: {
            type: 'array',
            description: 'Character names for style memory consistency',
          },
          settingName: {
            type: 'string',
            description: 'Setting name for style memory consistency',
          },
          styleMemory: {
            type: 'string',
            description: 'JSON-serialized StyleMemory for character consistency',
          },
        },
      },
    },
    pricing: {
      openai: {
        'dall-e-3': {
          standard: {
            '1024x1024': estimateCost(1, 'openai', 'standard'),
            '1792x1024': 0.08,
            '1024x1792': 0.08,
          },
          hd: {
            '1024x1024': estimateCost(1, 'openai', 'hd'),
            '1792x1024': 0.12,
            '1024x1792': 0.12,
          },
        },
      },
      replicate: {
        'flux-schnell': estimateCost(1, 'replicate'),
        'flux-dev': 0.025,
        'flux-pro': 0.055,
      },
    },
  })
}
