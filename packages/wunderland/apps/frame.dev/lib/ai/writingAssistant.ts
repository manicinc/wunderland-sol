/**
 * AI Writing Assistant Service
 * @module lib/ai/writingAssistant
 * 
 * @description
 * Provides inline autocomplete suggestions while editing strands.
 * - Debounced triggering after user stops typing
 * - Context-aware suggestions based on surrounding text
 * - Streaming for perceived speed
 * - Graceful degradation on API failures
 */

import { generateStream, isLLMAvailable } from '@/lib/llm'
import { 
  withGracefulFailure, 
  AI_FEATURES,
  getAIPreferences,
  showAIError,
  type WritingContext,
  type WritingSuggestion,
  type WritingSuggestionOptions,
  type AIFeatureStatus,
} from '@/lib/ai'

// Re-export types for consumers
export type { WritingSuggestion, WritingContext, WritingSuggestionOptions }

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

const CONTEXT_BEFORE_CHARS = 500
const CONTEXT_AFTER_CHARS = 100
const MIN_CONTEXT_FOR_SUGGESTION = 20

/** Suggestion length limits by preference */
const SUGGESTION_LENGTHS = {
  short: { min: 5, max: 30, description: '5-30 characters' },
  medium: { min: 20, max: 80, description: '20-80 characters' },
  long: { min: 50, max: 150, description: '50-150 characters' },
} as const

/* ═══════════════════════════════════════════════════════════════════════════
   WRITING ASSISTANT CLASS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Writing Assistant for inline suggestions
 */
export class WritingAssistant {
  private abortController: AbortController | null = null
  private lastSuggestion: WritingSuggestion | null = null
  private statusListeners: Set<(status: AIFeatureStatus) => void> = new Set()
  private _status: AIFeatureStatus = 'disabled'
  
  constructor() {
    this.updateStatus()
  }
  
  /**
   * Get current status
   */
  get status(): AIFeatureStatus {
    return this._status
  }
  
  /**
   * Update and broadcast status
   */
  private setStatus(status: AIFeatureStatus): void {
    this._status = status
    this.statusListeners.forEach(cb => cb(status))
  }
  
  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: (status: AIFeatureStatus) => void): () => void {
    this.statusListeners.add(callback)
    callback(this._status) // Immediate call with current status
    return () => this.statusListeners.delete(callback)
  }
  
  /**
   * Update status based on preferences and API availability
   */
  updateStatus(): void {
    const prefs = getAIPreferences()
    
    if (!prefs.writingAssistant.enabled) {
      this.setStatus('disabled')
      return
    }
    
    if (!isLLMAvailable()) {
      this.setStatus('no-api-key')
      return
    }
    
    this.setStatus('ready')
  }
  
  /**
   * Check if the assistant is available and ready
   */
  isAvailable(): boolean {
    this.updateStatus()
    return this._status === 'ready'
  }
  
  /**
   * Cancel any in-progress suggestion
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    if (this._status === 'working') {
      this.setStatus('ready')
    }
  }
  
  /**
   * Get suggestion for current context
   */
  async getSuggestion(
    context: WritingContext,
    options: WritingSuggestionOptions = {}
  ): Promise<WritingSuggestion | null> {
    // Cancel any existing request
    this.cancel()
    
    // Check availability
    if (!this.isAvailable()) {
      return null
    }
    
    // Validate context
    const { textBefore } = context
    if (!textBefore || textBefore.trim().length < MIN_CONTEXT_FOR_SUGGESTION) {
      return null
    }
    
    // Get preferences for length
    const prefs = getAIPreferences()
    const lengthPref = options.style || prefs.writingAssistant.suggestionLength
    const lengthConfig = SUGGESTION_LENGTHS[lengthPref]
    
    // Create abort controller
    this.abortController = new AbortController()
    const signal = options.signal || this.abortController.signal
    
    try {
      this.setStatus('working')
      
      const suggestion = await withGracefulFailure(
        () => this.generateSuggestion(context, lengthConfig, signal),
        {
          featureId: AI_FEATURES.WRITING_ASSISTANT,
          maxRetries: 0, // No retries for typing suggestions (too slow)
          onStatusChange: (status) => {
            if (status === 'error') {
              showAIError('Writing suggestions paused')
            }
          },
          signal,
        }
      )
      
      if (suggestion) {
        this.lastSuggestion = suggestion
        this.setStatus('ready')
        return suggestion
      }
      
      this.setStatus('ready')
      return null
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.warn('[WritingAssistant] Error:', error)
      }
      this.setStatus('ready')
      return null
    }
  }
  
  /**
   * Generate suggestion using LLM
   */
  private async generateSuggestion(
    context: WritingContext,
    lengthConfig: typeof SUGGESTION_LENGTHS[keyof typeof SUGGESTION_LENGTHS],
    signal: AbortSignal
  ): Promise<WritingSuggestion | null> {
    const { textBefore, textAfter, currentParagraph, metadata } = context
    
    // Trim context
    const trimmedBefore = textBefore.slice(-CONTEXT_BEFORE_CHARS)
    const trimmedAfter = textAfter?.slice(0, CONTEXT_AFTER_CHARS) || ''
    
    // Build prompt
    const prompt = buildSuggestionPrompt(
      trimmedBefore,
      trimmedAfter,
      currentParagraph,
      metadata,
      lengthConfig
    )
    
    // Stream the response for faster perceived response
    let suggestion = ''
    
    const stream = generateStream(prompt, {
      system: `You are an AI writing assistant. Complete the user's text naturally and concisely.
Rules:
- Continue from exactly where the text ends
- Match the writing style and tone
- Keep suggestions ${lengthConfig.description}
- Do NOT repeat existing text
- Output ONLY the continuation, nothing else`,
      maxTokens: 100,
      temperature: 0.7,
      signal,
    })
    
    for await (const chunk of stream) {
      if (signal.aborted) break
      suggestion += chunk
      
      // Stop if we hit the max length
      if (suggestion.length >= lengthConfig.max) {
        // Trim to last complete word
        const lastSpace = suggestion.lastIndexOf(' ')
        if (lastSpace > lengthConfig.min) {
          suggestion = suggestion.slice(0, lastSpace)
        }
        break
      }
    }
    
    // Clean and validate suggestion
    suggestion = cleanSuggestion(suggestion, textBefore)
    
    if (!suggestion || suggestion.length < 2) {
      return null
    }
    
    return {
      text: suggestion,
      confidence: 0.8, // Could be calculated from response quality
      type: 'completion',
    }
  }
  
  /**
   * Get the last generated suggestion
   */
  getLastSuggestion(): WritingSuggestion | null {
    return this.lastSuggestion
  }
  
  /**
   * Clear the last suggestion
   */
  clearLastSuggestion(): void {
    this.lastSuggestion = null
  }
  
  /**
   * Cleanup
   */
  dispose(): void {
    this.cancel()
    this.statusListeners.clear()
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Build the suggestion prompt
 */
function buildSuggestionPrompt(
  textBefore: string,
  textAfter: string,
  currentParagraph?: string,
  metadata?: WritingContext['metadata'],
  lengthConfig?: typeof SUGGESTION_LENGTHS[keyof typeof SUGGESTION_LENGTHS]
): string {
  let prompt = 'Continue this text:\n\n'
  
  // Add metadata context if available
  if (metadata?.title || metadata?.tags?.length) {
    prompt += `[Context: ${metadata.title || 'Document'}${
      metadata.tags?.length ? ` | Tags: ${metadata.tags.join(', ')}` : ''
    }]\n\n`
  }
  
  // Add the text
  prompt += `"""${textBefore}`
  
  // Add marker for where to continue
  prompt += '【CONTINUE HERE】'
  
  // Add following text for context if available
  if (textAfter) {
    prompt += textAfter + '"""'
  } else {
    prompt += '"""'
  }
  
  // Add length guidance
  if (lengthConfig) {
    prompt += `\n\n(Provide ${lengthConfig.description} of continuation)`
  }
  
  return prompt
}

/**
 * Clean and validate the suggestion
 */
function cleanSuggestion(suggestion: string, textBefore: string): string {
  if (!suggestion) return ''
  
  // Remove any leading/trailing whitespace and quotes
  suggestion = suggestion.trim().replace(/^["'`]+|["'`]+$/g, '')
  
  // Remove any text that matches the end of textBefore (LLM sometimes repeats)
  const lastWords = textBefore.split(/\s+/).slice(-5).join(' ')
  if (lastWords.length > 10) {
    const repeatIndex = suggestion.toLowerCase().indexOf(lastWords.toLowerCase())
    if (repeatIndex !== -1) {
      suggestion = suggestion.slice(repeatIndex + lastWords.length)
    }
  }
  
  // Remove markdown formatting artifacts
  suggestion = suggestion.replace(/^\*+|\*+$/g, '')
  
  // Remove instruction echoes
  const instructionPhrases = [
    'continue here',
    'continuation:',
    'here is',
    'the next',
  ]
  for (const phrase of instructionPhrases) {
    const index = suggestion.toLowerCase().indexOf(phrase)
    if (index === 0) {
      suggestion = suggestion.slice(phrase.length)
    }
  }
  
  return suggestion.trim()
}

/* ═══════════════════════════════════════════════════════════════════════════
   SINGLETON INSTANCE
═══════════════════════════════════════════════════════════════════════════ */

let instance: WritingAssistant | null = null

/**
 * Get the singleton WritingAssistant instance
 */
export function getWritingAssistant(): WritingAssistant {
  if (!instance) {
    instance = new WritingAssistant()
  }
  return instance
}

/**
 * Create a new context object from editor state
 */
export function createWritingContext(
  textBefore: string,
  textAfter?: string,
  metadata?: WritingContext['metadata']
): WritingContext {
  // Extract current paragraph
  const paragraphs = textBefore.split(/\n\n/)
  const currentParagraph = paragraphs[paragraphs.length - 1]
  
  return {
    textBefore,
    textAfter,
    currentParagraph,
    metadata,
  }
}

