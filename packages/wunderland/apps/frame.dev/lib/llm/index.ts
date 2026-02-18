/**
 * LLM Inference Library - Multi-Provider Structured Output Engine
 * @module lib/llm
 * 
 * @description
 * High-level LLM API with structured data validation, automatic retries,
 * and multi-provider fallback support.
 * 
 * @features
 * - Multi-provider: OpenAI, Anthropic Claude, OpenRouter
 * - Zod schema validation with automatic retry on parse errors
 * - Exponential backoff with jitter
 * - Streaming support
 * - Token counting and cost estimation
 * - Graceful degradation
 * 
 * @example
 * ```typescript
 * import { llm, z } from '@/lib/llm'
 * 
 * const result = await llm.generate({
 *   prompt: 'Suggest tags for this content',
 *   schema: z.object({
 *     tags: z.array(z.string()),
 *     confidence: z.number().min(0).max(1),
 *   }),
 * })
 * 
 * console.log(result.data.tags) // ['react', 'typescript']
 * ```
 */

import { z, ZodType, ZodError } from 'zod'

// Re-export Zod for convenience
export { z } from 'zod'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Supported LLM providers
 */
export type LLMProvider = 'openai' | 'anthropic' | 'openrouter' | 'mistral' | 'ollama'

/**
 * Model specification
 */
export interface ModelSpec {
  provider: LLMProvider
  model: string
  maxTokens?: number
  temperature?: number
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  apiKey: string
  baseUrl?: string
  organization?: string
}

/**
 * Request options
 */
export interface LLMRequestOptions<T extends ZodType = ZodType> {
  /** The prompt to send */
  prompt: string
  /** Optional system message */
  system?: string
  /** Zod schema for structured output validation */
  schema?: T
  /** Model to use (default: auto-select based on available providers) */
  model?: ModelSpec
  /** Maximum tokens for response */
  maxTokens?: number
  /** Temperature (0-1) */
  temperature?: number
  /** Maximum retry attempts */
  maxRetries?: number
  /** Timeout in milliseconds */
  timeout?: number
  /** Stream the response */
  stream?: boolean
  /** Abort signal */
  signal?: AbortSignal
}

/**
 * Response from LLM
 */
export interface LLMResponse<T = string> {
  /** Parsed data (if schema provided) or raw text */
  data: T
  /** Raw text response */
  raw: string
  /** Model used */
  model: string
  /** Provider used */
  provider: LLMProvider
  /** Token usage */
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  /** Latency in milliseconds */
  latency: number
  /** Number of retries used */
  retries: number
}

/**
 * Error from LLM
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code: 'PROVIDER_ERROR' | 'VALIDATION_ERROR' | 'TIMEOUT' | 'RATE_LIMIT' | 'NO_PROVIDER' | 'PARSE_ERROR',
    public readonly provider?: LLMProvider,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'LLMError'
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

/** Default models per provider */
const DEFAULT_MODELS: Record<LLMProvider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
  openrouter: 'anthropic/claude-3-haiku',
  mistral: 'mistral-small-latest',
  ollama: 'llama3.2',
}

/** API endpoints */
const API_ENDPOINTS: Record<LLMProvider, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
  ollama: 'http://localhost:11434/api/chat',
}

/** Default configuration */
const DEFAULTS = {
  maxTokens: 1024,
  temperature: 0.7,
  maxRetries: 3,
  timeout: 30000,
  initialBackoff: 1000,
  maxBackoff: 16000,
}

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Sleep with exponential backoff and jitter
 */
async function backoff(attempt: number, initialMs = DEFAULTS.initialBackoff): Promise<void> {
  const maxMs = DEFAULTS.maxBackoff
  const baseDelay = Math.min(initialMs * Math.pow(2, attempt), maxMs)
  const jitter = baseDelay * (0.5 + Math.random() * 0.5)
  await new Promise(resolve => setTimeout(resolve, jitter))
}

/**
 * Create abort controller with timeout
 */
function createTimeoutController(
  timeout: number,
  existingSignal?: AbortSignal
): { controller: AbortController; cleanup: () => void } {
  const controller = new AbortController()
  
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException('Request timeout', 'TimeoutError'))
  }, timeout)
  
  // If there's an existing signal, abort when it aborts
  if (existingSignal) {
    existingSignal.addEventListener('abort', () => {
      controller.abort(existingSignal.reason)
    })
  }
  
  return {
    controller,
    cleanup: () => clearTimeout(timeoutId),
  }
}

/**
 * Extract JSON from text that may contain markdown code blocks
 */
function extractJSON(text: string): string {
  // Try to extract from markdown code block
  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim()
  }
  
  // Try to find raw JSON object/array
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (jsonMatch) {
    return jsonMatch[1]
  }
  
  return text.trim()
}

/**
 * Estimate token count (rough approximation)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDER IMPLEMENTATIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Call OpenAI API
 */
async function callOpenAI(
  config: ProviderConfig,
  messages: Array<{ role: string; content: string }>,
  options: {
    model: string
    maxTokens: number
    temperature: number
    signal: AbortSignal
  }
): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const response = await fetch(API_ENDPOINTS.openai, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      ...(config.organization && { 'OpenAI-Organization': config.organization }),
    },
    body: JSON.stringify({
      model: options.model,
      messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    }),
    signal: options.signal,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new LLMError(
      error.error?.message || 'OpenAI API error',
      response.status === 429 ? 'RATE_LIMIT' : 'PROVIDER_ERROR',
      'openai'
    )
  }
  
  const data = await response.json()
  return {
    content: data.choices[0]?.message?.content || '',
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  }
}

/**
 * Call Anthropic Claude API
 */
async function callAnthropic(
  config: ProviderConfig,
  messages: Array<{ role: string; content: string }>,
  options: {
    model: string
    maxTokens: number
    temperature: number
    signal: AbortSignal
    system?: string
  }
): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  // Convert messages to Anthropic format
  const anthropicMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))
  
  const response = await fetch(config.baseUrl || API_ENDPOINTS.anthropic, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: options.model,
      messages: anthropicMessages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      ...(options.system && { system: options.system }),
    }),
    signal: options.signal,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new LLMError(
      error.error?.message || 'Anthropic API error',
      response.status === 429 ? 'RATE_LIMIT' : 'PROVIDER_ERROR',
      'anthropic'
    )
  }
  
  const data = await response.json()
  return {
    content: data.content?.[0]?.text || '',
    usage: {
      promptTokens: data.usage?.input_tokens || 0,
      completionTokens: data.usage?.output_tokens || 0,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    },
  }
}

/**
 * Call OpenRouter API (OpenAI-compatible)
 */
async function callOpenRouter(
  config: ProviderConfig,
  messages: Array<{ role: string; content: string }>,
  options: {
    model: string
    maxTokens: number
    temperature: number
    signal: AbortSignal
  }
): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const response = await fetch(API_ENDPOINTS.openrouter, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://frame.dev',
      'X-Title': 'Quarry',
    },
    body: JSON.stringify({
      model: options.model,
      messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    }),
    signal: options.signal,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new LLMError(
      error.error?.message || 'OpenRouter API error',
      response.status === 429 ? 'RATE_LIMIT' : 'PROVIDER_ERROR',
      'openrouter'
    )
  }
  
  const data = await response.json()
  return {
    content: data.choices[0]?.message?.content || '',
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  }
}

/**
 * Call Mistral API (OpenAI-compatible)
 */
async function callMistral(
  config: ProviderConfig,
  messages: Array<{ role: string; content: string }>,
  options: {
    model: string
    maxTokens: number
    temperature: number
    signal: AbortSignal
  }
): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const response = await fetch(config.baseUrl || API_ENDPOINTS.mistral, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: options.model,
      messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    }),
    signal: options.signal,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new LLMError(
      error.message || 'Mistral API error',
      response.status === 429 ? 'RATE_LIMIT' : 'PROVIDER_ERROR',
      'mistral'
    )
  }
  
  const data = await response.json()
  return {
    content: data.choices[0]?.message?.content || '',
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  }
}

/**
 * Call Ollama API (local server)
 */
async function callOllama(
  config: ProviderConfig,
  messages: Array<{ role: string; content: string }>,
  options: {
    model: string
    maxTokens: number
    temperature: number
    signal: AbortSignal
    system?: string
  }
): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const baseUrl = config.baseUrl || 'http://localhost:11434'
  const endpoint = `${baseUrl}/api/chat`
  
  // Build Ollama-format messages
  const ollamaMessages = [...messages]
  if (options.system) {
    ollamaMessages.unshift({ role: 'system', content: options.system })
  }
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      messages: ollamaMessages,
      stream: false,
      options: {
        num_predict: options.maxTokens,
        temperature: options.temperature,
      },
    }),
    signal: options.signal,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new LLMError(
      error.error || 'Ollama API error',
      'PROVIDER_ERROR',
      'ollama'
    )
  }
  
  const data = await response.json()
  return {
    content: data.message?.content || '',
    usage: {
      promptTokens: data.prompt_eval_count || 0,
      completionTokens: data.eval_count || 0,
      totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
    },
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   LLM CLIENT CLASS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * LLM Client with multi-provider support and structured output validation
 */
export class LLMClient {
  private providers: Map<LLMProvider, ProviderConfig> = new Map()
  private defaultProvider: LLMProvider | null = null
  
  /**
   * Configure a provider
   */
  configure(provider: LLMProvider, config: ProviderConfig): this {
    this.providers.set(provider, config)
    if (!this.defaultProvider) {
      this.defaultProvider = provider
    }
    return this
  }
  
  /**
   * Set the default provider
   */
  setDefault(provider: LLMProvider): this {
    if (!this.providers.has(provider)) {
      throw new LLMError(`Provider ${provider} not configured`, 'NO_PROVIDER')
    }
    this.defaultProvider = provider
    return this
  }
  
  /**
   * Check if any provider is configured
   */
  isConfigured(): boolean {
    return this.providers.size > 0
  }
  
  /**
   * Get available providers
   */
  getProviders(): LLMProvider[] {
    return Array.from(this.providers.keys())
  }
  
  /**
   * Generate a response with optional schema validation
   */
  async generate<T extends ZodType>(
    options: LLMRequestOptions<T>
  ): Promise<LLMResponse<T extends ZodType<infer U> ? U : string>> {
    const {
      prompt,
      system,
      schema,
      model,
      maxTokens = DEFAULTS.maxTokens,
      temperature = DEFAULTS.temperature,
      maxRetries = DEFAULTS.maxRetries,
      timeout = DEFAULTS.timeout,
      signal,
    } = options
    
    // Determine provider and model
    const provider = model?.provider || this.defaultProvider
    if (!provider) {
      throw new LLMError('No LLM provider configured', 'NO_PROVIDER')
    }
    
    const config = this.providers.get(provider)
    if (!config) {
      throw new LLMError(`Provider ${provider} not configured`, 'NO_PROVIDER')
    }
    
    const modelName = model?.model || DEFAULT_MODELS[provider]
    
    // Build messages
    const messages: Array<{ role: string; content: string }> = []
    
    // Add system message with schema instructions if provided
    let systemMessage = system || ''
    if (schema) {
      const schemaDescription = this.getSchemaDescription(schema)
      systemMessage += `\n\nRespond with valid JSON matching this schema:\n${schemaDescription}\n\nOnly output the JSON, no markdown code blocks or explanations.`
    }
    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage })
    }
    
    messages.push({ role: 'user', content: prompt })
    
    // Execute with retries
    let lastError: Error | null = null
    let attempts = 0
    const startTime = Date.now()
    
    for (let retry = 0; retry <= maxRetries; retry++) {
      attempts = retry + 1
      
      try {
        // Create timeout controller
        const { controller, cleanup } = createTimeoutController(timeout, signal)
        
        try {
          let result: { content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }
          
          // Call the appropriate provider
          switch (provider) {
            case 'openai':
              result = await callOpenAI(config, messages, {
                model: modelName,
                maxTokens,
                temperature,
                signal: controller.signal,
              })
              break
            case 'anthropic':
              result = await callAnthropic(config, messages, {
                model: modelName,
                maxTokens,
                temperature,
                signal: controller.signal,
                system: systemMessage,
              })
              break
            case 'openrouter':
              result = await callOpenRouter(config, messages, {
                model: modelName,
                maxTokens,
                temperature,
                signal: controller.signal,
              })
              break
            case 'mistral':
              result = await callMistral(config, messages, {
                model: modelName,
                maxTokens,
                temperature,
                signal: controller.signal,
              })
              break
            case 'ollama':
              result = await callOllama(config, messages, {
                model: modelName,
                maxTokens,
                temperature,
                signal: controller.signal,
                system: systemMessage,
              })
              break
            default:
              throw new LLMError(`Unknown provider: ${provider}`, 'NO_PROVIDER')
          }
          
          cleanup()
          
          // Parse and validate response if schema provided
          let parsedData: any = result.content
          
          if (schema) {
            try {
              const jsonStr = extractJSON(result.content)
              const jsonData = JSON.parse(jsonStr)
              parsedData = schema.parse(jsonData)
            } catch (parseError) {
              if (parseError instanceof ZodError) {
                throw new LLMError(
                  `Schema validation failed: ${parseError.errors.map(e => e.message).join(', ')}`,
                  'VALIDATION_ERROR',
                  provider,
                  parseError
                )
              }
              throw new LLMError(
                `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
                'PARSE_ERROR',
                provider,
                parseError instanceof Error ? parseError : undefined
              )
            }
          }

          const latencyMs = Date.now() - startTime

          // Record cost tracking (async, non-blocking)
          // All data is stored locally - nothing is sent to external servers.
          this.recordCost(provider, modelName, result.usage, {
            operationType: 'chat',
            durationMs: latencyMs,
            success: true,
          }).catch((err) => {
            console.warn('[LLM] Failed to record cost:', err)
          })

          return {
            data: parsedData,
            raw: result.content,
            model: modelName,
            provider,
            usage: result.usage,
            latency: latencyMs,
            retries: retry,
          }
        } finally {
          cleanup()
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        // Don't retry on certain errors
        if (error instanceof LLMError) {
          if (error.code === 'VALIDATION_ERROR' || error.code === 'PARSE_ERROR') {
            // For validation errors, retry with a modified prompt
            if (retry < maxRetries) {
              messages.push({ role: 'assistant', content: (error.cause as any)?.message || 'Invalid response' })
              messages.push({ 
                role: 'user', 
                content: 'Your previous response was not valid JSON. Please try again with valid JSON only.' 
              })
              await backoff(retry)
              continue
            }
          }
          if (error.code === 'NO_PROVIDER') {
            throw error
          }
        }
        
        // Backoff before retry
        if (retry < maxRetries) {
          await backoff(retry)
        }
      }
    }
    
    throw lastError || new LLMError('Max retries exceeded', 'PROVIDER_ERROR', provider)
  }
  
  /**
   * Generate a description of a Zod schema for the LLM
   */
  private getSchemaDescription(schema: ZodType): string {
    try {
      // Get the shape of the schema
      const shape = (schema as any)._def
      return JSON.stringify(this.zodToJsonSchema(shape), null, 2)
    } catch {
      return 'A valid JSON object'
    }
  }
  
  /**
   * Convert Zod schema to JSON Schema-like description
   */
  private zodToJsonSchema(def: any): any {
    if (!def) return { type: 'unknown' }
    
    switch (def.typeName) {
      case 'ZodString':
        return { type: 'string' }
      case 'ZodNumber':
        return { type: 'number' }
      case 'ZodBoolean':
        return { type: 'boolean' }
      case 'ZodArray':
        return { type: 'array', items: this.zodToJsonSchema(def.type?._def) }
      case 'ZodObject':
        const properties: Record<string, any> = {}
        const shape = def.shape?.()
        if (shape) {
          for (const [key, value] of Object.entries(shape)) {
            properties[key] = this.zodToJsonSchema((value as any)._def)
          }
        }
        return { type: 'object', properties }
      case 'ZodEnum':
        return { type: 'string', enum: def.values }
      case 'ZodOptional':
        return { ...this.zodToJsonSchema(def.innerType?._def), optional: true }
      case 'ZodNullable':
        return { ...this.zodToJsonSchema(def.innerType?._def), nullable: true }
      default:
        return { type: def.typeName?.replace('Zod', '').toLowerCase() || 'unknown' }
    }
  }

  /**
   * Record cost for an LLM API call (async, non-blocking)
   * All data is stored locally - nothing is sent to external servers.
   */
  private async recordCost(
    provider: LLMProvider,
    model: string,
    usage: { promptTokens: number; completionTokens: number; totalTokens: number },
    options?: {
      operationType?: 'chat' | 'completion' | 'embedding' | 'image' | 'vision'
      context?: { feature?: string; strandPath?: string; sessionId?: string }
      durationMs?: number
      success?: boolean
      errorMessage?: string
    }
  ): Promise<void> {
    try {
      // Dynamic import to avoid circular deps and SSR issues
      const { recordTokenUsage } = await import('@/lib/costs/costTrackingService')
      await recordTokenUsage(provider as any, model, usage, options)
    } catch (err) {
      // Cost tracking failure shouldn't break LLM functionality
      console.warn('[LLM] Cost recording failed:', err)
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SINGLETON INSTANCE
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Global LLM client instance
 *
 * Configure with:
 * 1. Settings UI (priority) - stored encrypted in localStorage
 * 2. Environment variables (fallback):
 *    - NEXT_PUBLIC_OPENAI_API_KEY or OPENAI_API_KEY
 *    - NEXT_PUBLIC_ANTHROPIC_API_KEY or ANTHROPIC_API_KEY
 *    - NEXT_PUBLIC_OPENROUTER_API_KEY or OPENROUTER_API_KEY
 */
export const llm = new LLMClient()

// Auto-configure from environment if available (settings override happens at runtime)
if (typeof process !== 'undefined') {
  const openaiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY
  const anthropicKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
  const openrouterKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY
  const mistralKey = process.env.NEXT_PUBLIC_MISTRAL_API_KEY || process.env.MISTRAL_API_KEY

  if (openaiKey) llm.configure('openai', { apiKey: openaiKey })
  if (anthropicKey) llm.configure('anthropic', { apiKey: anthropicKey })
  if (openrouterKey) llm.configure('openrouter', { apiKey: openrouterKey })
  if (mistralKey) llm.configure('mistral', { apiKey: mistralKey })
  // Ollama doesn't require an API key - it's configured when base URL is set
}

/**
 * Initialize LLM with settings-based API keys (call on client-side)
 * Settings take priority over environment variables.
 */
export async function initLLMFromSettings(): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    // Dynamic import to avoid SSR issues
    const { getAPIKey } = await import('@/lib/config/apiKeyStorage')

    const providers: LLMProvider[] = ['openai', 'anthropic', 'openrouter', 'mistral', 'ollama']

    for (const provider of providers) {
      const config = await getAPIKey(provider)
      if (config?.key || provider === 'ollama') {
        // Ollama doesn't require an API key, just needs to be reachable
        llm.configure(provider, {
          apiKey: config?.key || '',
          baseUrl: config?.baseUrl,
        })
      }
    }
  } catch (error) {
    console.warn('[LLM] Failed to load API keys from settings:', error)
  }
}

/**
 * Re-initialize LLM when settings change
 */
export function setupLLMSettingsListener(): () => void {
  if (typeof window === 'undefined') return () => {}

  const handler = () => {
    initLLMFromSettings()
  }

  window.addEventListener('api-keys-changed', handler)
  return () => window.removeEventListener('api-keys-changed', handler)
}

// Auto-init on client side
if (typeof window !== 'undefined') {
  // Init after a short delay to ensure storage is ready
  setTimeout(() => {
    initLLMFromSettings()
    setupLLMSettingsListener()
  }, 100)
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONVENIENCE FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Quick text generation (no schema)
 */
export async function generateText(
  prompt: string,
  options?: Omit<LLMRequestOptions, 'prompt' | 'schema'>
): Promise<string> {
  const result = await llm.generate({ prompt, ...options })
  return result.data as string
}

/**
 * Quick structured generation with schema
 */
export async function generateStructured<T extends ZodType>(
  prompt: string,
  schema: T,
  options?: Omit<LLMRequestOptions<T>, 'prompt' | 'schema'>
): Promise<z.infer<T>> {
  const result = await llm.generate({ prompt, schema, ...options })
  return result.data
}

/**
 * Check if LLM is available
 */
export function isLLMAvailable(): boolean {
  return llm.isConfigured()
}

/**
 * Check if any LLM API key is configured
 */
export function hasAnyLLMKey(): boolean {
  return llm.isConfigured()
}

/**
 * Check if image generation API key is configured
 * Currently checks for OpenAI (DALL-E) or any LLM key that could use image gen
 */
export function hasImageGenerationKey(): boolean {
  const providers = llm.getProviders()
  // OpenAI supports DALL-E for image generation
  return providers.includes('openai') || providers.includes('openrouter')
}

/**
 * Get list of available providers
 */
export function getAvailableProviders(): LLMProvider[] {
  return llm.getProviders()
}

/**
 * Generate text with streaming (async generator)
 * NOTE: Currently returns text as a single chunk (fallback implementation)
 */
export async function* generateStream(
  prompt: string,
  options?: Omit<LLMRequestOptions, 'prompt' | 'schema'>
): AsyncGenerator<string, void, undefined> {
  // For now, generate the full response and yield it
  // TODO: Implement true streaming when provider APIs support it
  const result = await llm.generate({ prompt, ...options })
  yield result.data as string
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDER FALLBACK / WATERFALL
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Provider alias mapping for user-friendly names
 */
export type ProviderAlias = 'claude' | 'openai' | 'openrouter' | 'mistral' | 'ollama'

const PROVIDER_ALIAS_MAP: Record<ProviderAlias, LLMProvider> = {
  claude: 'anthropic',
  openai: 'openai',
  openrouter: 'openrouter',
  mistral: 'mistral',
  ollama: 'ollama',
}

/**
 * Default model per provider alias
 */
const ALIAS_DEFAULT_MODELS: Record<ProviderAlias, ModelSpec> = {
  claude: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
  openai: { provider: 'openai', model: 'gpt-4o-mini' },
  openrouter: { provider: 'openrouter', model: 'anthropic/claude-3-haiku' },
  mistral: { provider: 'mistral', model: 'mistral-small-latest' },
  ollama: { provider: 'ollama', model: 'llama3.2' },
}

/**
 * Result from generateWithFallback
 */
export interface FallbackResult<T> {
  data: T
  raw: string
  provider: LLMProvider
  providerAlias: ProviderAlias
  model: string
  fallbackUsed: boolean
  attemptedProviders: ProviderAlias[]
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  latency: number
}

/**
 * Options for generateWithFallback
 */
export interface FallbackOptions<T extends ZodType = ZodType> extends Omit<LLMRequestOptions<T>, 'model'> {
  /** Provider preference order (first available wins) */
  providerOrder?: ProviderAlias[]
  /** Skip providers that have previously failed */
  skipFailedProviders?: boolean
}

// Track failed providers for this session
const failedProviders = new Set<LLMProvider>()

/**
 * Generate with provider fallback chain.
 * Tries providers in order until one succeeds.
 *
 * @example
 * ```typescript
 * const result = await generateWithFallback(
 *   'Suggest tags for: React hooks tutorial',
 *   z.object({ tags: z.array(z.string()) }),
 *   { providerOrder: ['claude', 'openai', 'openrouter'] }
 * )
 * console.log(result.data.tags) // ['react', 'hooks', 'tutorial']
 * console.log(result.provider)  // 'anthropic' (or fallback)
 * ```
 */
export async function generateWithFallback<T extends ZodType>(
  prompt: string,
  schema: T,
  options: Omit<FallbackOptions<T>, 'prompt' | 'schema'> = {}
): Promise<FallbackResult<z.infer<T>>> {
  const {
    providerOrder = ['claude', 'openai', 'openrouter', 'mistral', 'ollama'],
    skipFailedProviders = true,
    ...requestOptions
  } = options

  const attemptedProviders: ProviderAlias[] = []
  const errors: Array<{ provider: ProviderAlias; error: Error }> = []

  // Get available providers
  const configuredProviders = llm.getProviders()

  for (const alias of providerOrder) {
    const provider = PROVIDER_ALIAS_MAP[alias]

    // Skip if not configured
    if (!configuredProviders.includes(provider)) {
      continue
    }

    // Skip if previously failed and skipFailedProviders is enabled
    if (skipFailedProviders && failedProviders.has(provider)) {
      continue
    }

    attemptedProviders.push(alias)

    try {
      const modelSpec = ALIAS_DEFAULT_MODELS[alias]

      const result = await llm.generate({
        prompt,
        schema,
        model: modelSpec,
        ...requestOptions,
      })

      // Clear from failed set on success
      failedProviders.delete(provider)

      return {
        data: result.data,
        raw: result.raw,
        provider: result.provider,
        providerAlias: alias,
        model: result.model,
        fallbackUsed: attemptedProviders.length > 1,
        attemptedProviders,
        usage: result.usage,
        latency: result.latency,
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      errors.push({ provider: alias, error: err })

      // Mark as failed for future requests (except validation errors)
      if (error instanceof LLMError && error.code !== 'VALIDATION_ERROR' && error.code !== 'PARSE_ERROR') {
        failedProviders.add(provider)
      }

      // Continue to next provider
      console.warn(`[LLM] Provider ${alias} failed, trying next:`, err.message)
    }
  }

  // All providers failed
  const errorMessages = errors.map(e => `${e.provider}: ${e.error.message}`).join('; ')
  throw new LLMError(
    `All providers failed: ${errorMessages}`,
    'PROVIDER_ERROR',
    undefined,
    errors[errors.length - 1]?.error
  )
}

/**
 * Clear the failed providers cache (useful after settings change)
 */
export function clearFailedProviders(): void {
  failedProviders.clear()
}

/**
 * Get currently failed providers
 */
export function getFailedProviders(): LLMProvider[] {
  return Array.from(failedProviders)
}

/**
 * Check if a specific provider is available and not failed
 */
export function isProviderAvailable(alias: ProviderAlias): boolean {
  const provider = PROVIDER_ALIAS_MAP[alias]
  return llm.getProviders().includes(provider) && !failedProviders.has(provider)
}

/**
 * Get the first available provider from an order list
 */
export function getFirstAvailableProvider(
  providerOrder: ProviderAlias[] = ['claude', 'openai', 'openrouter', 'mistral', 'ollama']
): ProviderAlias | null {
  for (const alias of providerOrder) {
    if (isProviderAvailable(alias)) {
      return alias
    }
  }
  return null
}

export default llm









