/**
 * Prompt Image Generation API Route
 * @module app/api/prompts/generate-image
 *
 * Server-side endpoint for generating prompt illustrations using DALL-E 3.
 * Uses stored API key or accepts key in request body.
 */

import { NextResponse } from 'next/server'
import type { ImageStyle } from '@/lib/prompts/types'
import { IMAGE_STYLES } from '@/lib/prompts/types'

export const runtime = 'edge'

/**
 * Build the DALL-E prompt based on writing prompt and style
 */
function buildImagePrompt(promptText: string, style: ImageStyle): string {
  const styleConfig = IMAGE_STYLES[style] || IMAGE_STYLES.watercolor

  // Extract key concepts by removing question starters
  const concepts = promptText
    .replace(/^(what|how|when|where|why|if|describe|write about|reflect on|explain|document|create|imagine)\s+/i, '')
    .replace(/\?$/, '')
    .trim()
    .slice(0, 200)

  return `Create a beautiful illustration that visually represents the concept of: "${concepts}".
Style: ${styleConfig.promptSuffix}.
The image should be evocative, inspiring, and suitable as a journal prompt illustration.
Square format, high quality, no text or words in the image.`
}

/**
 * POST /api/prompts/generate-image
 *
 * Generate an image for a writing prompt using DALL-E 3
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { promptText, style = 'watercolor', apiKey } = body

    if (!promptText || typeof promptText !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid promptText' },
        { status: 400 }
      )
    }

    // Get API key from request or environment
    const key = apiKey || process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY

    if (!key) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add your API key in settings.' },
        { status: 401 }
      )
    }

    // Validate style
    const imageStyle: ImageStyle = style in IMAGE_STYLES ? style : 'watercolor'

    // Build the prompt
    const imagePrompt = buildImagePrompt(promptText, imageStyle)

    // Call DALL-E 3 API
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
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
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || `DALL-E API error: ${response.statusText}`

      // Handle rate limiting
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'Rate limited. Please wait a moment before generating more images.' },
          { status: 429 }
        )
      }

      // Handle invalid API key
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key. Please check your OpenAI API key in settings.' },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      )
    }

    const data = await response.json()
    const imageData = data.data[0]

    return NextResponse.json({
      image: `data:image/png;base64,${imageData.b64_json}`,
      revisedPrompt: imageData.revised_prompt || imagePrompt,
      style: imageStyle,
    })
  } catch (error) {
    console.error('[generate-image] Error:', error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/prompts/generate-image
 *
 * Check if image generation is available
 */
export async function GET() {
  const hasKey = !!(process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY)

  return NextResponse.json({
    available: hasKey,
    styles: Object.keys(IMAGE_STYLES),
    model: 'dall-e-3',
  })
}
