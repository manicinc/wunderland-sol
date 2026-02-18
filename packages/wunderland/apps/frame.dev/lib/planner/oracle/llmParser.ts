/**
 * LLM-Powered Task Parser for Oracle
 * @module lib/planner/oracle/llmParser
 *
 * Uses Claude or OpenAI for advanced natural language understanding.
 * Falls back to NLP parser when LLM is unavailable.
 */

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { ParsedTaskIntent } from './nlpParser'
import { parseNaturalLanguage as parseWithNLP } from './nlpParser'

// Provider instances
let claudeClient: Anthropic | null = null
let openaiClient: OpenAI | null = null

/**
 * Oracle LLM configuration stored in localStorage
 */
export interface OracleLLMConfig {
  enabled: boolean
  provider: 'claude' | 'openai' | 'auto'
  claudeApiKey?: string
  openaiApiKey?: string
  claudeModel: string
  openaiModel: string
  openaiVisionModel: string
  temperature: number
}

export const DEFAULT_ORACLE_CONFIG: OracleLLMConfig = {
  enabled: false,
  provider: 'auto',
  claudeModel: 'claude-sonnet-4-20250514',
  openaiModel: 'gpt-4.1-2025-04-14',
  openaiVisionModel: 'gpt-4.1-2025-04-14', // For future vision features
  temperature: 0.3,
}

/**
 * Get Oracle LLM config from localStorage
 */
export function getOracleConfig(): OracleLLMConfig {
  if (typeof window === 'undefined') return DEFAULT_ORACLE_CONFIG

  try {
    const stored = localStorage.getItem('oracleLLMConfig')
    if (stored) {
      return { ...DEFAULT_ORACLE_CONFIG, ...JSON.parse(stored) }
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_ORACLE_CONFIG
}

/**
 * Save Oracle LLM config to localStorage
 */
export function saveOracleConfig(config: Partial<OracleLLMConfig>): void {
  if (typeof window === 'undefined') return

  const current = getOracleConfig()
  const updated = { ...current, ...config }
  localStorage.setItem('oracleLLMConfig', JSON.stringify(updated))

  // Re-initialize clients if API keys changed
  if (config.claudeApiKey !== undefined || config.openaiApiKey !== undefined) {
    initializeLLMClients(updated)
  }
}

/**
 * Initialize LLM clients based on config
 */
export function initializeLLMClients(config?: OracleLLMConfig): void {
  const cfg = config || getOracleConfig()

  // Initialize Claude
  if (cfg.claudeApiKey) {
    try {
      claudeClient = new Anthropic({
        apiKey: cfg.claudeApiKey,
        dangerouslyAllowBrowser: true,
      })
      console.log('[Oracle LLM] Claude client initialized')
    } catch (error) {
      console.warn('[Oracle LLM] Failed to initialize Claude:', error)
      claudeClient = null
    }
  } else {
    claudeClient = null
  }

  // Initialize OpenAI
  if (cfg.openaiApiKey) {
    try {
      openaiClient = new OpenAI({
        apiKey: cfg.openaiApiKey,
        dangerouslyAllowBrowser: true,
      })
      console.log('[Oracle LLM] OpenAI client initialized')
    } catch (error) {
      console.warn('[Oracle LLM] Failed to initialize OpenAI:', error)
      openaiClient = null
    }
  } else {
    openaiClient = null
  }
}

/**
 * Check if LLM is available
 */
export function isLLMAvailable(): boolean {
  const config = getOracleConfig()
  if (!config.enabled) return false

  if (config.provider === 'claude') return claudeClient !== null
  if (config.provider === 'openai') return openaiClient !== null
  if (config.provider === 'auto') return claudeClient !== null || openaiClient !== null

  return false
}

/**
 * Get the active LLM provider name
 */
export function getActiveLLMProvider(): 'claude' | 'openai' | 'nlp' {
  const config = getOracleConfig()

  if (!config.enabled) return 'nlp'

  if (config.provider === 'claude' && claudeClient) return 'claude'
  if (config.provider === 'openai' && openaiClient) return 'openai'
  if (config.provider === 'auto') {
    if (claudeClient) return 'claude'
    if (openaiClient) return 'openai'
  }

  return 'nlp'
}

/**
 * System prompt for task parsing
 */
const TASK_PARSING_PROMPT = `You are a task management assistant that parses natural language into structured task data.

Given a user's message, extract the following information:
- action: The primary action (create, update, delete, complete, schedule, query, suggest)
- title: The task title/description (clean, concise)
- dueDate: ISO date string (YYYY-MM-DD) if mentioned
- dueTime: Time in HH:mm format if mentioned
- duration: Duration in minutes if mentioned
- priority: low, medium, high, or urgent if indicated
- project: Project name if mentioned
- tags: Array of tags if mentioned (from #hashtags or explicit mentions)
- subtasks: Array of subtask titles if mentioned
- recurring: Object with frequency (daily/weekly/monthly) and optional interval

Today's date is: ${new Date().toISOString().split('T')[0]}

Respond ONLY with valid JSON. If a field is not mentioned or unclear, omit it.
Parse relative dates like "tomorrow", "next monday", "in 3 days" into actual dates.
Parse times like "3pm", "morning", "noon" into 24-hour format.

Example input: "Add a task to review the quarterly report by Friday at 2pm, high priority, for project Alpha"
Example output:
{
  "action": "create",
  "title": "Review the quarterly report",
  "dueDate": "2024-01-19",
  "dueTime": "14:00",
  "priority": "high",
  "project": "Alpha"
}`

/**
 * Parse natural language with LLM
 */
export async function parseWithLLM(input: string): Promise<ParsedTaskIntent> {
  const config = getOracleConfig()
  const provider = getActiveLLMProvider()

  // If LLM not available, fall back to NLP
  if (provider === 'nlp') {
    return parseWithNLP(input)
  }

  try {
    let response: string

    if (provider === 'claude' && claudeClient) {
      response = await parseWithClaude(input, config)
    } else if (provider === 'openai' && openaiClient) {
      response = await parseWithOpenAI(input, config)
    } else {
      // Fallback
      return parseWithNLP(input)
    }

    // Parse JSON response
    const parsed = JSON.parse(response)

    // Convert to ParsedTaskIntent format
    return {
      action: parsed.action || 'create',
      confidence: 0.9, // High confidence for LLM parsing
      title: parsed.title,
      description: parsed.description,
      dueDate: parsed.dueDate,
      dueTime: parsed.dueTime,
      duration: parsed.duration,
      priority: parsed.priority,
      project: parsed.project,
      tags: parsed.tags,
      subtasks: parsed.subtasks,
      recurring: parsed.recurring,
      rawEntities: {
        dates: parsed.dueDate ? [parsed.dueDate] : [],
        times: parsed.dueTime ? [parsed.dueTime] : [],
        people: [],
        organizations: [],
        numbers: [],
        nouns: [],
      },
    }
  } catch (error) {
    console.warn('[Oracle LLM] Parsing failed, falling back to NLP:', error)
    return parseWithNLP(input)
  }
}

/**
 * Parse with Claude
 */
async function parseWithClaude(input: string, config: OracleLLMConfig): Promise<string> {
  if (!claudeClient) throw new Error('Claude client not initialized')

  const response = await claudeClient.messages.create({
    model: config.claudeModel,
    max_tokens: 1024,
    temperature: config.temperature,
    system: TASK_PARSING_PROMPT,
    messages: [{ role: 'user', content: input }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  return content.text
}

/**
 * Parse with OpenAI
 */
async function parseWithOpenAI(input: string, config: OracleLLMConfig): Promise<string> {
  if (!openaiClient) throw new Error('OpenAI client not initialized')

  const response = await openaiClient.chat.completions.create({
    model: config.openaiModel,
    max_tokens: 1024,
    temperature: config.temperature,
    messages: [
      { role: 'system', content: TASK_PARSING_PROMPT },
      { role: 'user', content: input },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No response from OpenAI')
  }

  return content
}

/**
 * Generate a natural language response for the user
 */
export async function generateResponse(
  intent: ParsedTaskIntent,
  result: { success: boolean; message: string }
): Promise<string> {
  const provider = getActiveLLMProvider()

  // For simple responses, use template
  if (provider === 'nlp' || !result.success) {
    return result.message
  }

  // For LLM, generate a more natural response
  const config = getOracleConfig()

  try {
    const prompt = `Given this task management result, generate a brief, friendly response (1-2 sentences):

Action: ${intent.action}
${intent.title ? `Task: ${intent.title}` : ''}
${intent.dueDate ? `Due: ${intent.dueDate}` : ''}
${intent.dueTime ? `Time: ${intent.dueTime}` : ''}
${intent.priority ? `Priority: ${intent.priority}` : ''}
Result: ${result.message}

Be concise and helpful. Don't repeat all the details, just confirm the action.`

    if (provider === 'claude' && claudeClient) {
      const response = await claudeClient.messages.create({
        model: config.claudeModel,
        max_tokens: 150,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      })
      const content = response.content[0]
      if (content.type === 'text') {
        return content.text
      }
    } else if (provider === 'openai' && openaiClient) {
      const response = await openaiClient.chat.completions.create({
        model: config.openaiModel,
        max_tokens: 150,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      })
      if (response.choices[0]?.message?.content) {
        return response.choices[0].message.content
      }
    }
  } catch (error) {
    console.warn('[Oracle LLM] Response generation failed:', error)
  }

  return result.message
}

/**
 * Get suggestions for what the user might want to do
 */
export async function getSuggestions(context: {
  recentTasks?: string[]
  currentTime?: string
  dayOfWeek?: string
}): Promise<string[]> {
  const provider = getActiveLLMProvider()

  // Default suggestions
  const defaultSuggestions = [
    'What should I work on today?',
    'Show my tasks for this week',
    'Add a new task',
    'Timebox my day',
  ]

  if (provider === 'nlp') {
    return defaultSuggestions
  }

  const config = getOracleConfig()

  try {
    const prompt = `Given this context, suggest 4 helpful task management actions the user might want to take. Be specific and actionable.

Time: ${context.currentTime || new Date().toLocaleTimeString()}
Day: ${context.dayOfWeek || new Date().toLocaleDateString('en-US', { weekday: 'long' })}
${context.recentTasks?.length ? `Recent tasks: ${context.recentTasks.slice(0, 5).join(', ')}` : ''}

Return ONLY a JSON array of 4 short suggestions (each under 50 characters).`

    let response: string | undefined

    if (provider === 'claude' && claudeClient) {
      const result = await claudeClient.messages.create({
        model: config.claudeModel,
        max_tokens: 200,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      })
      response = result.content[0].type === 'text' ? result.content[0].text : undefined
    } else if (provider === 'openai' && openaiClient) {
      const result = await openaiClient.chat.completions.create({
        model: config.openaiModel,
        max_tokens: 200,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      })
      response = result.choices[0]?.message?.content ?? undefined
    }

    if (response) {
      const parsed = JSON.parse(response)
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 4)
      }
    }
  } catch (error) {
    console.warn('[Oracle LLM] Suggestions generation failed:', error)
  }

  return defaultSuggestions
}

// Initialize on module load (client-side only)
if (typeof window !== 'undefined') {
  initializeLLMClients()
}
