/**
 * Types for code execution in Quarry Codex
 * Supports JS/TS (client-side), Python/Bash (backend), Go/Rust (external APIs)
 * @module execution/types
 */

/**
 * Supported execution languages
 */
export type ExecutionLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'bash'
  | 'go'
  | 'rust'

/**
 * Execution status
 */
export type ExecutionStatus =
  | 'idle'
  | 'running'
  | 'success'
  | 'error'
  | 'timeout'
  | 'offline'

/**
 * Log entry from code execution
 */
export interface LogEntry {
  type: 'log' | 'error' | 'warn' | 'info'
  data: string
  timestamp?: number
}

/**
 * Result of code execution
 */
export interface ExecutionResult {
  /** Whether execution completed successfully */
  success: boolean
  /** Output lines from execution */
  output: string[]
  /** Error message if execution failed */
  error?: string
  /** Execution duration in milliseconds */
  duration?: number
  /** Language that was executed */
  language?: ExecutionLanguage
  /** Whether the service is offline */
  offline?: boolean
  /** Exit code (for Python/Bash) */
  exitCode?: number
}

/**
 * Execution context with metadata
 */
export interface ExecutionContext {
  /** Unique ID for this execution */
  id: string
  /** Code to execute */
  code: string
  /** Language of the code */
  language: ExecutionLanguage
  /** Timestamp when execution started */
  startedAt: Date
  /** Timeout in milliseconds */
  timeout: number
  /** Block index in markdown (for persistence) */
  blockIndex?: number
}

/**
 * Execution metadata stored in markdown comments
 */
export interface ExecutionMeta {
  /** Language used */
  lang: ExecutionLanguage
  /** When execution occurred */
  timestamp: string
  /** Duration in milliseconds */
  duration: number
  /** Whether it succeeded */
  success: boolean
  /** Exit code if applicable */
  exitCode?: number
}

/**
 * Capabilities for each language
 */
export interface LanguageCapability {
  /** Whether execution is available */
  available: boolean
  /** Reason if unavailable */
  reason?: string
  /** Whether currently offline (for external APIs) */
  offline?: boolean
}

/**
 * All execution capabilities
 */
export interface ExecutionCapabilities {
  javascript: LanguageCapability
  typescript: LanguageCapability
  python: LanguageCapability
  bash: LanguageCapability
  go: LanguageCapability
  rust: LanguageCapability
}

/**
 * Executor function signature
 */
export type Executor = (code: string) => Promise<ExecutionResult>

/**
 * Default timeouts per language (ms)
 */
export const EXECUTION_TIMEOUTS: Record<ExecutionLanguage, number> = {
  javascript: 10000,  // 10s
  typescript: 15000,  // 15s (includes transpilation)
  python: 30000,      // 30s
  bash: 30000,        // 30s
  go: 60000,          // 60s (external API)
  rust: 60000,        // 60s (external API)
}

/**
 * Languages that run client-side
 */
export const CLIENT_SIDE_LANGUAGES: ExecutionLanguage[] = ['javascript', 'typescript']

/**
 * Languages that require backend
 */
export const BACKEND_LANGUAGES: ExecutionLanguage[] = ['python', 'bash']

/**
 * Languages that use external playground APIs
 */
export const PLAYGROUND_LANGUAGES: ExecutionLanguage[] = ['go', 'rust']

/**
 * Check if language is client-side executable
 */
export function isClientSideLanguage(lang: ExecutionLanguage): boolean {
  return CLIENT_SIDE_LANGUAGES.includes(lang)
}

/**
 * Check if language requires backend
 */
export function isBackendLanguage(lang: ExecutionLanguage): boolean {
  return BACKEND_LANGUAGES.includes(lang)
}

/**
 * Check if language uses external playground
 */
export function isPlaygroundLanguage(lang: ExecutionLanguage): boolean {
  return PLAYGROUND_LANGUAGES.includes(lang)
}

/**
 * Normalize language aliases to canonical names
 */
export function normalizeLanguage(lang: string): ExecutionLanguage | null {
  const aliases: Record<string, ExecutionLanguage> = {
    js: 'javascript',
    javascript: 'javascript',
    ts: 'typescript',
    typescript: 'typescript',
    py: 'python',
    python: 'python',
    python3: 'python',
    sh: 'bash',
    bash: 'bash',
    shell: 'bash',
    zsh: 'bash',
    go: 'go',
    golang: 'go',
    rs: 'rust',
    rust: 'rust',
  }
  return aliases[lang.toLowerCase()] ?? null
}
