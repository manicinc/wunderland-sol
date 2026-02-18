/**
 * AI Selection Actions Service
 * @module lib/ai/selectionActions
 *
 * Provides AI-powered text transformations for selected text in editors.
 * Supports: improve, shorten, lengthen, grammar, tone changes, explain, define, summarize, expand, translate
 */

import { llm, generateStream, isLLMAvailable } from '@/lib/llm'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Available selection actions
 */
export type SelectionAction =
  | 'improve'
  | 'shorten'
  | 'lengthen'
  | 'grammar'
  | 'tone_formal'
  | 'tone_casual'
  | 'tone_professional'
  | 'explain'
  | 'define'
  | 'summarize'
  | 'expand'
  | 'translate'

/**
 * Options for performing a selection action
 */
export interface SelectionActionOptions {
  /** The selected text to transform */
  selectedText: string
  /** The action to perform */
  action: SelectionAction
  /** Surrounding context for better results */
  context?: {
    textBefore?: string
    textAfter?: string
    documentTitle?: string
  }
  /** Target language for translation */
  language?: string
  /** Abort signal for cancellation */
  signal?: AbortSignal
}

/**
 * Result of a selection action
 */
export interface SelectionActionResult {
  /** Original text */
  original: string
  /** Transformed text */
  transformed: string
  /** Action that was performed */
  action: SelectionAction
  /** Whether the operation was successful */
  success: boolean
  /** Error message if failed */
  error?: string
}

/**
 * Metadata for each action type
 */
export interface ActionMetadata {
  label: string
  description: string
  icon: string
  shortcut?: string
  category: 'transform' | 'analyze' | 'tone' | 'translate'
}

// ============================================================================
// ACTION METADATA
// ============================================================================

/**
 * Metadata for all available actions
 */
export const SELECTION_ACTIONS: Record<SelectionAction, ActionMetadata> = {
  improve: {
    label: 'Improve Writing',
    description: 'Enhance clarity, flow, and readability',
    icon: 'Sparkles',
    category: 'transform',
  },
  shorten: {
    label: 'Make Shorter',
    description: 'Condense while preserving meaning',
    icon: 'Minimize2',
    category: 'transform',
  },
  lengthen: {
    label: 'Make Longer',
    description: 'Expand with more detail',
    icon: 'Maximize2',
    category: 'transform',
  },
  grammar: {
    label: 'Fix Grammar',
    description: 'Correct grammar, spelling, and punctuation',
    icon: 'Check',
    category: 'transform',
  },
  tone_formal: {
    label: 'Formal Tone',
    description: 'Rewrite in a formal, professional style',
    icon: 'Briefcase',
    category: 'tone',
  },
  tone_casual: {
    label: 'Casual Tone',
    description: 'Rewrite in a friendly, conversational style',
    icon: 'MessageCircle',
    category: 'tone',
  },
  tone_professional: {
    label: 'Professional Tone',
    description: 'Rewrite for business communication',
    icon: 'Building',
    category: 'tone',
  },
  explain: {
    label: 'Explain',
    description: 'Explain this text in simple terms',
    icon: 'HelpCircle',
    shortcut: 'Cmd+Shift+E',
    category: 'analyze',
  },
  define: {
    label: 'Define',
    description: 'Define terms and concepts',
    icon: 'BookOpen',
    category: 'analyze',
  },
  summarize: {
    label: 'Summarize',
    description: 'Create a concise summary',
    icon: 'FileText',
    category: 'transform',
  },
  expand: {
    label: 'Expand',
    description: 'Elaborate with additional details',
    icon: 'PlusCircle',
    category: 'transform',
  },
  translate: {
    label: 'Translate',
    description: 'Translate to another language',
    icon: 'Globe',
    shortcut: 'Cmd+Shift+T',
    category: 'translate',
  },
}

/**
 * Common languages for translation
 */
export const TRANSLATION_LANGUAGES = [
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'zh', name: 'Chinese', native: '中文' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
] as const

// ============================================================================
// PROMPT GENERATION
// ============================================================================

/**
 * Generate the system prompt for selection actions
 */
function getSystemPrompt(): string {
  return `You are a writing assistant that helps transform and improve text.
Follow these rules:
- Output ONLY the transformed text, no explanations or commentary
- Preserve the original formatting (paragraphs, lists, etc.) unless transformation requires changes
- Maintain the original meaning and intent
- Keep proper nouns and specific terminology intact
- For translations, preserve formatting and any technical terms that shouldn't be translated`
}

/**
 * Generate the action-specific prompt
 */
export function getActionPrompt(
  action: SelectionAction,
  text: string,
  context?: string,
  language?: string
): string {
  const contextNote = context
    ? `\n\nContext (for reference only, do not include in output):\n${context}`
    : ''

  switch (action) {
    case 'improve':
      return `Improve this text for clarity, flow, and readability while preserving its meaning and style:\n\n${text}${contextNote}`

    case 'shorten':
      return `Make this text more concise while preserving the key information and meaning. Remove redundancy and unnecessary words:\n\n${text}${contextNote}`

    case 'lengthen':
      return `Expand this text with additional relevant details, examples, or elaboration while maintaining the same tone:\n\n${text}${contextNote}`

    case 'grammar':
      return `Fix all grammar, spelling, and punctuation errors in this text. Only correct errors, do not change the style or content:\n\n${text}${contextNote}`

    case 'tone_formal':
      return `Rewrite this text in a formal, professional tone suitable for academic or business contexts:\n\n${text}${contextNote}`

    case 'tone_casual':
      return `Rewrite this text in a casual, friendly, conversational tone:\n\n${text}${contextNote}`

    case 'tone_professional':
      return `Rewrite this text in a clear, professional tone suitable for business communication:\n\n${text}${contextNote}`

    case 'explain':
      return `Explain this text in simple, easy-to-understand terms. Break down any complex concepts:\n\n${text}${contextNote}`

    case 'define':
      return `Provide clear definitions for any technical terms, jargon, or complex concepts in this text. Format as a brief glossary:\n\n${text}${contextNote}`

    case 'summarize':
      return `Create a concise summary of this text, capturing the main points:\n\n${text}${contextNote}`

    case 'expand':
      return `Elaborate on this text with additional context, examples, and supporting details:\n\n${text}${contextNote}`

    case 'translate':
      return `Translate this text to ${language || 'Spanish'}. Preserve the formatting and any technical terms that should remain in the original language:\n\n${text}`

    default:
      return text
  }
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Perform a selection action on text
 */
export async function performSelectionAction(
  options: SelectionActionOptions
): Promise<SelectionActionResult> {
  const { selectedText, action, context, language, signal } = options

  // Check if LLM is available
  if (!isLLMAvailable()) {
    return {
      original: selectedText,
      transformed: selectedText,
      action,
      success: false,
      error: 'No AI provider configured. Please add an API key in Settings.',
    }
  }

  // Build context string
  const contextString = context
    ? [context.textBefore, context.textAfter].filter(Boolean).join('\n...\n')
    : undefined

  // Generate prompt
  const prompt = getActionPrompt(action, selectedText, contextString, language)

  try {
    const result = await llm.generate({
      prompt,
      system: getSystemPrompt(),
      maxTokens: 2000,
      temperature: action === 'grammar' ? 0.1 : 0.7,
      signal,
    })

    return {
      original: selectedText,
      transformed: result.data as string,
      action,
      success: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[selectionActions] Error:', error)

    return {
      original: selectedText,
      transformed: selectedText,
      action,
      success: false,
      error: message,
    }
  }
}

/**
 * Stream a selection action (for longer operations)
 */
export async function* streamSelectionAction(
  options: SelectionActionOptions
): AsyncGenerator<string, SelectionActionResult, undefined> {
  const { selectedText, action, context, language, signal } = options

  // Check if LLM is available
  if (!isLLMAvailable()) {
    return {
      original: selectedText,
      transformed: selectedText,
      action,
      success: false,
      error: 'No AI provider configured.',
    }
  }

  const contextString = context
    ? [context.textBefore, context.textAfter].filter(Boolean).join('\n...\n')
    : undefined

  const prompt = getActionPrompt(action, selectedText, contextString, language)
  let fullText = ''

  try {
    for await (const chunk of generateStream(prompt, {
      system: getSystemPrompt(),
      maxTokens: 2000,
      temperature: action === 'grammar' ? 0.1 : 0.7,
      signal,
    })) {
      fullText += chunk
      yield chunk
    }

    return {
      original: selectedText,
      transformed: fullText,
      action,
      success: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      original: selectedText,
      transformed: selectedText,
      action,
      success: false,
      error: message,
    }
  }
}

/**
 * Check if selection actions are available
 */
export function isSelectionActionsAvailable(): boolean {
  return isLLMAvailable()
}

/**
 * Get actions grouped by category
 */
export function getActionsByCategory(): Record<string, SelectionAction[]> {
  const categories: Record<string, SelectionAction[]> = {
    transform: [],
    analyze: [],
    tone: [],
    translate: [],
  }

  for (const [action, metadata] of Object.entries(SELECTION_ACTIONS)) {
    categories[metadata.category].push(action as SelectionAction)
  }

  return categories
}

