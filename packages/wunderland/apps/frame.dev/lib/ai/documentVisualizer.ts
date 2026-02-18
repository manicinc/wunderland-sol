/**
 * Document Visualizer Service
 * @module lib/ai/documentVisualizer
 *
 * Generates visual content from document text:
 * - Extract key concepts for illustration
 * - Generate images, diagrams, charts
 * - Support for picture book / graphic novel mode
 */

import { llm } from '@/lib/llm'
import { getPromptImageGenerator, isImageGenerationAvailable } from '@/lib/prompts/promptImageGenerator'
import type { ImageStyle } from '@/lib/prompts/types'

// ============================================================================
// TYPES
// ============================================================================

export type VisualizationMode = 'gallery' | 'timeline' | 'picturebook' | 'diagrams'

export type VisualizationType = 'image' | 'diagram' | 'chart' | 'timeline_node' | 'sketch'

export interface VisualizationRequest {
  content: string
  mode: VisualizationMode
  options?: {
    style?: ImageStyle
    maxImages?: number
    paragraphIndexes?: number[]
    documentTitle?: string
  }
}

export interface VisualizationItem {
  id: string
  type: VisualizationType
  url?: string
  prompt?: string
  sourceText?: string
  position: number // Paragraph index
  status: 'pending' | 'generating' | 'ready' | 'error'
  error?: string
}

export interface KeyConcept {
  text: string
  importance: 'high' | 'medium' | 'low'
  visualPrompt: string
  paragraphIndex: number
}

export interface VisualizationResult {
  items: VisualizationItem[]
  concepts: KeyConcept[]
}

// ============================================================================
// STYLE MAPPING
// ============================================================================

export const VISUALIZATION_STYLES: Record<string, { label: string; prompt: string }> = {
  illustration: {
    label: 'Illustration',
    prompt: 'detailed digital illustration, vibrant colors, clean lines',
  },
  watercolor: {
    label: 'Watercolor',
    prompt: 'soft watercolor painting, gentle gradients, artistic brushstrokes',
  },
  sketch: {
    label: 'Sketch',
    prompt: 'pencil sketch, hand-drawn, artistic linework, shading',
  },
  photo: {
    label: 'Photorealistic',
    prompt: 'photorealistic, high quality photograph, detailed',
  },
  diagram: {
    label: 'Diagram',
    prompt: 'clean technical diagram, minimal style, clear labels',
  },
  storybook: {
    label: 'Storybook',
    prompt: "children's book illustration, whimsical, colorful, charming",
  },
  graphic_novel: {
    label: 'Graphic Novel',
    prompt: 'graphic novel style, bold lines, dramatic shadows, comic book aesthetic',
  },
  minimal: {
    label: 'Minimal',
    prompt: 'minimalist illustration, simple shapes, limited color palette',
  },
}

// ============================================================================
// CONCEPT EXTRACTION
// ============================================================================

/**
 * Extract key concepts from document text that could be visualized
 */
export async function extractKeyConceptsForVisualization(
  content: string,
  options?: {
    maxConcepts?: number
    mode?: VisualizationMode
  }
): Promise<KeyConcept[]> {
  const maxConcepts = options?.maxConcepts || 5
  const mode = options?.mode || 'gallery'

  // Split content into paragraphs
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 20)

  if (paragraphs.length === 0) {
    return []
  }

  const systemPrompt = `You are a visual concept extractor. Analyze text and identify key concepts that would make compelling illustrations or visualizations.

For each concept, provide:
1. A brief text description (the concept)
2. Its importance (high/medium/low)
3. A detailed visual prompt suitable for image generation
4. The paragraph index (0-based) where it appears

Mode: ${mode}
- gallery: Focus on standalone memorable images
- timeline: Focus on sequential events or milestones
- picturebook: Focus on scene-setting and character moments
- diagrams: Focus on relationships, processes, and structures

Respond in JSON format:
{
  "concepts": [
    {
      "text": "concept description",
      "importance": "high",
      "visualPrompt": "detailed prompt for image generation...",
      "paragraphIndex": 0
    }
  ]
}`

  const userPrompt = `Extract up to ${maxConcepts} key visual concepts from this text:

${paragraphs.map((p, i) => `[Paragraph ${i}]\n${p}`).join('\n\n')}`

  try {
    const result = await llm.generate({
      prompt: userPrompt,
      system: systemPrompt,
      temperature: 0.7,
      maxTokens: 1000,
    })
    const response = result.data as string

    if (!response) return []

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0])
    return (parsed.concepts || []).map((c: any) => ({
      text: c.text || '',
      importance: c.importance || 'medium',
      visualPrompt: c.visualPrompt || c.text,
      paragraphIndex: c.paragraphIndex || 0,
    }))
  } catch (error) {
    console.error('[DocumentVisualizer] Failed to extract concepts:', error)
    return []
  }
}

// ============================================================================
// VISUALIZATION GENERATION
// ============================================================================

/**
 * Generate a single visualization for a paragraph or concept
 */
export async function generateParagraphIllustration(
  text: string,
  options?: {
    style?: string
    existingPrompt?: string
  }
): Promise<{ url?: string; prompt: string; error?: string }> {
  const styleConfig = VISUALIZATION_STYLES[options?.style || 'illustration']

  // Build the prompt
  let prompt = options?.existingPrompt

  if (!prompt) {
    // Generate a prompt from the text
    try {
      const result = await llm.generate({
        prompt: `Create an image prompt for:\n\n${text.slice(0, 500)}`,
        system: `You are a visual prompt generator. Create a concise, vivid image generation prompt from the given text. Focus on the visual elements, mood, and composition. Keep it under 100 words.

Style direction: ${styleConfig.prompt}`,
        temperature: 0.8,
        maxTokens: 150,
      })
      prompt = (result.data as string) || text.slice(0, 200)
    } catch {
      prompt = text.slice(0, 200)
    }
  }

  // Add style to prompt
  const fullPrompt = `${prompt}. ${styleConfig.prompt}`

  // Generate the image
  try {
    const available = await isImageGenerationAvailable()
    if (!available) {
      return { prompt: fullPrompt, error: 'Image generation not available (API key not configured)' }
    }

    const generator = await getPromptImageGenerator()
    const imageResult = await generator.generateImage(
      fullPrompt,
      (options?.style as ImageStyle) || 'watercolor'
    )

    if (imageResult.imageData) {
      return { url: imageResult.imageData, prompt: fullPrompt }
    } else {
      return { prompt: fullPrompt, error: 'Failed to generate image' }
    }
  } catch (error) {
    return {
      prompt: fullPrompt,
      error: error instanceof Error ? error.message : 'Image generation failed',
    }
  }
}

/**
 * Generate visualizations for an entire document
 */
export async function generateVisualizationsForDocument(
  request: VisualizationRequest
): Promise<VisualizationResult> {
  const { content, mode, options } = request
  const maxImages = options?.maxImages || 4
  const style = options?.style || 'illustration'

  // Extract key concepts
  const concepts = await extractKeyConceptsForVisualization(content, {
    maxConcepts: maxImages,
    mode,
  })

  if (concepts.length === 0) {
    return { items: [], concepts: [] }
  }

  // Create visualization items
  const items: VisualizationItem[] = concepts.map((concept, index) => ({
    id: `viz-${Date.now()}-${index}`,
    type: mode === 'diagrams' ? 'diagram' : 'image',
    prompt: concept.visualPrompt,
    sourceText: concept.text,
    position: concept.paragraphIndex,
    status: 'pending',
  }))

  return { items, concepts }
}

/**
 * Generate a single visualization item (call after getting items from generateVisualizationsForDocument)
 */
export async function generateVisualizationItem(
  item: VisualizationItem,
  style?: string
): Promise<VisualizationItem> {
  if (!item.prompt && !item.sourceText) {
    return { ...item, status: 'error', error: 'No content to visualize' }
  }

  const result = await generateParagraphIllustration(item.sourceText || '', {
    style,
    existingPrompt: item.prompt,
  })

  if (result.url) {
    return {
      ...item,
      url: result.url,
      prompt: result.prompt,
      status: 'ready',
    }
  } else {
    return {
      ...item,
      prompt: result.prompt,
      status: 'error',
      error: result.error,
    }
  }
}

// ============================================================================
// PICTURE BOOK MODE
// ============================================================================

export interface PictureBookPage {
  id: string
  text: string
  visualizationId?: string
  imageUrl?: string
  imagePrompt?: string
  pageNumber: number
}

/**
 * Split document into picture book pages with text and image slots
 */
export function splitIntoPictureBookPages(content: string): PictureBookPage[] {
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim())

  return paragraphs.map((text, index) => ({
    id: `page-${Date.now()}-${index}`,
    text: text.trim(),
    pageNumber: index + 1,
  }))
}

/**
 * Generate images for picture book pages
 */
export async function* generatePictureBookImages(
  pages: PictureBookPage[],
  style: string = 'storybook'
): AsyncGenerator<PictureBookPage> {
  for (const page of pages) {
    if (page.text.length < 30) {
      // Skip very short paragraphs
      yield page
      continue
    }

    const result = await generateParagraphIllustration(page.text, { style })

    yield {
      ...page,
      imageUrl: result.url,
      imagePrompt: result.prompt,
    }
  }
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

/**
 * Get suggested style based on content type
 */
export function suggestVisualizationStyle(content: string): string {
  const lowerContent = content.toLowerCase()

  // Technical/diagram content
  if (
    lowerContent.includes('architecture') ||
    lowerContent.includes('system') ||
    lowerContent.includes('process') ||
    lowerContent.includes('workflow')
  ) {
    return 'diagram'
  }

  // Story/narrative content
  if (
    lowerContent.includes('once upon') ||
    lowerContent.includes('story') ||
    lowerContent.includes('tale') ||
    lowerContent.includes('adventure')
  ) {
    return 'storybook'
  }

  // Action/dramatic content
  if (
    lowerContent.includes('battle') ||
    lowerContent.includes('fight') ||
    lowerContent.includes('hero') ||
    lowerContent.includes('quest')
  ) {
    return 'graphic_novel'
  }

  // Default to illustration
  return 'illustration'
}

export default {
  extractKeyConceptsForVisualization,
  generateParagraphIllustration,
  generateVisualizationsForDocument,
  generateVisualizationItem,
  splitIntoPictureBookPages,
  generatePictureBookImages,
  suggestVisualizationStyle,
  VISUALIZATION_STYLES,
}
