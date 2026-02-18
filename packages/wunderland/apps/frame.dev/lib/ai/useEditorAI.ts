/**
 * useEditorAI - Unified hook for AI editor features
 * @module lib/ai/useEditorAI
 *
 * Provides writing suggestions and image generation for the editor.
 * Combines preferences, API key status, and generation functions.
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  useAIPreferences,
  AI_FEATURES,
  useAIFeatureStatus,
} from './index'
import {
  type ImageGenerationStyle,
  IMAGE_GENERATION_STYLES,
} from './types'
import type { SuggestionContext, SuggestionStatus } from '@/components/quarry/ui/tiptap/AISuggestionExtension'
import { getAPIKey } from '@/lib/config/apiKeyStorage'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface ImageGenerationRequest {
  prompt: string
  style: ImageGenerationStyle
  size: 'square' | 'landscape' | 'portrait'
}

export interface GeneratedImage {
  url: string
  prompt: string
  style: ImageGenerationStyle
  size: string
  provider: 'openai' | 'replicate'
}

export interface UseEditorAIReturn {
  // Writing suggestions
  writingEnabled: boolean
  writingStatus: SuggestionStatus
  writingSettings: {
    triggerDelay: number
    autoTrigger: boolean
    suggestionLength: 'short' | 'medium' | 'long'
  }
  getSuggestion: (context: SuggestionContext) => Promise<string | null>

  // Image generation
  imageEnabled: boolean
  imageStatus: 'idle' | 'generating' | 'error'
  imageSettings: {
    defaultStyle: ImageGenerationStyle
    defaultSize: 'square' | 'landscape' | 'portrait'
    showInToolbar: boolean
  }
  generateImage: (request: ImageGenerationRequest) => Promise<GeneratedImage | null>
  imageStyles: typeof IMAGE_GENERATION_STYLES

  // API key status
  hasOpenAIKey: boolean
  hasAnthropicKey: boolean
  hasAnyLLMKey: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUGGESTION GENERATION
═══════════════════════════════════════════════════════════════════════════ */

async function generateSuggestion(
  context: SuggestionContext,
  length: 'short' | 'medium' | 'long'
): Promise<string | null> {
  // Get API key configs
  const openaiConfig = await getAPIKey('openai')
  const anthropicConfig = await getAPIKey('anthropic')

  const openaiKey = openaiConfig?.key
  const anthropicKey = anthropicConfig?.key

  if (!openaiKey && !anthropicKey) {
    console.warn('[EditorAI] No API key available for suggestions')
    return null
  }

  // Build prompt based on length
  const maxTokens = length === 'short' ? 50 : length === 'medium' ? 100 : 200
  const lengthInstruction =
    length === 'short' ? 'Complete the current sentence only.' :
    length === 'medium' ? 'Complete the current thought in 1-2 sentences.' :
    'Continue with a full paragraph.'

  const systemPrompt = `You are a writing assistant. Continue the user's text naturally.
${lengthInstruction}
Only output the continuation - no explanations, no quotes, no prefixes.
Match the user's writing style, tone, and vocabulary.`

  const userPrompt = context.textBefore.slice(-500)

  try {
    if (openaiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      return data.choices?.[0]?.message?.content?.trim() || null
    }

    if (anthropicKey) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userPrompt },
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`)
      }

      const data = await response.json()
      return data.content?.[0]?.text?.trim() || null
    }
  } catch (error) {
    console.error('[EditorAI] Suggestion generation failed:', error)
    return null
  }

  return null
}

/* ═══════════════════════════════════════════════════════════════════════════
   IMAGE GENERATION
═══════════════════════════════════════════════════════════════════════════ */

async function generateImageWithAPI(
  request: ImageGenerationRequest
): Promise<GeneratedImage | null> {
  const styleInfo = IMAGE_GENERATION_STYLES.find(s => s.id === request.style)
  if (!styleInfo) return null

  // Build enhanced prompt
  const enhancedPrompt = `${styleInfo.promptPrefix} ${request.prompt}. High quality, detailed.`

  // Map size to dimensions
  const sizeMap = {
    square: '1024x1024',
    landscape: '1792x1024',
    portrait: '1024x1792',
  }

  try {
    const response = await fetch('/api/images/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        size: sizeMap[request.size],
        quality: 'standard',
        style: request.style,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || `API error: ${response.status}`)
    }

    const data = await response.json()

    return {
      url: data.url || data.imageUrl,
      prompt: request.prompt,
      style: request.style,
      size: sizeMap[request.size],
      provider: data.provider || 'openai',
    }
  } catch (error) {
    console.error('[EditorAI] Image generation failed:', error)
    return null
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════════════════ */

export function useEditorAI(): UseEditorAIReturn {
  const [prefs] = useAIPreferences()
  const [writingStatus, setWritingStatus] = useState<SuggestionStatus>('idle')
  const [imageStatus, setImageStatus] = useState<'idle' | 'generating' | 'error'>('idle')
  const [hasOpenAIKey, setHasOpenAIKey] = useState(false)
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false)

  // Check API keys on mount
  useMemo(() => {
    if (typeof window !== 'undefined') {
      getAPIKey('openai').then(config => setHasOpenAIKey(!!config?.key))
      getAPIKey('anthropic').then(config => setHasAnthropicKey(!!config?.key))
    }
  }, [])

  const writingFeature = useAIFeatureStatus(AI_FEATURES.WRITING_ASSISTANT)
  const imageFeature = useAIFeatureStatus(AI_FEATURES.IMAGE_GENERATION)

  // Get suggestion with status tracking
  const getSuggestion = useCallback(async (context: SuggestionContext): Promise<string | null> => {
    if (!prefs.writingAssistant.enabled) return null

    setWritingStatus('loading')
    try {
      const suggestion = await generateSuggestion(context, prefs.writingAssistant.suggestionLength)
      setWritingStatus(suggestion ? 'showing' : 'idle')
      return suggestion
    } catch {
      setWritingStatus('error')
      return null
    }
  }, [prefs.writingAssistant.enabled, prefs.writingAssistant.suggestionLength])

  // Generate image with status tracking
  const generateImage = useCallback(async (request: ImageGenerationRequest): Promise<GeneratedImage | null> => {
    if (!prefs.imageGeneration.enabled) return null

    setImageStatus('generating')
    try {
      const result = await generateImageWithAPI(request)
      setImageStatus(result ? 'idle' : 'error')
      return result
    } catch {
      setImageStatus('error')
      return null
    }
  }, [prefs.imageGeneration.enabled])

  return {
    // Writing suggestions
    writingEnabled: prefs.writingAssistant.enabled && writingFeature.isAvailable,
    writingStatus,
    writingSettings: {
      triggerDelay: prefs.writingAssistant.triggerDelay,
      autoTrigger: prefs.writingAssistant.autoTrigger,
      suggestionLength: prefs.writingAssistant.suggestionLength,
    },
    getSuggestion,

    // Image generation
    imageEnabled: prefs.imageGeneration.enabled && imageFeature.isAvailable,
    imageStatus,
    imageSettings: {
      defaultStyle: prefs.imageGeneration.defaultStyle,
      defaultSize: prefs.imageGeneration.defaultSize,
      showInToolbar: prefs.imageGeneration.showInToolbar,
    },
    generateImage,
    imageStyles: IMAGE_GENERATION_STYLES,

    // API key status
    hasOpenAIKey,
    hasAnthropicKey,
    hasAnyLLMKey: hasOpenAIKey || hasAnthropicKey,
  }
}

export default useEditorAI
