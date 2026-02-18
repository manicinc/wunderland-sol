/**
 * Graceful Failure Utilities for AI Features
 * @module lib/ai/gracefulFailure
 * 
 * @description
 * Provides utilities for handling AI API failures gracefully:
 * - Automatic retry with exponential backoff
 * - Provider fallback chain
 * - Silent failure with status updates
 * - Auto-recovery when APIs become available
 */

import type { AIFeatureStatus, AIStatusInfo } from './types'
import { isLLMAvailable, getFailedProviders, clearFailedProviders } from '@/lib/llm'

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

const RECOVERY_CHECK_INTERVAL = 30000 // 30 seconds
const MAX_CONSECUTIVE_FAILURES = 3
const BACKOFF_BASE_MS = 1000
const BACKOFF_MAX_MS = 16000

/* ═══════════════════════════════════════════════════════════════════════════
   FAILURE TRACKING
═══════════════════════════════════════════════════════════════════════════ */

interface FailureState {
  consecutiveFailures: number
  lastFailure: Date | null
  lastError: string | null
  isRecovering: boolean
}

const featureFailures = new Map<string, FailureState>()

/**
 * Get or create failure state for a feature
 */
function getFailureState(featureId: string): FailureState {
  if (!featureFailures.has(featureId)) {
    featureFailures.set(featureId, {
      consecutiveFailures: 0,
      lastFailure: null,
      lastError: null,
      isRecovering: false,
    })
  }
  return featureFailures.get(featureId)!
}

/**
 * Record a failure for a feature
 */
export function recordFailure(featureId: string, error: Error | string): void {
  const state = getFailureState(featureId)
  state.consecutiveFailures++
  state.lastFailure = new Date()
  state.lastError = error instanceof Error ? error.message : error
}

/**
 * Record a success for a feature (resets failure count)
 */
export function recordSuccess(featureId: string): void {
  const state = getFailureState(featureId)
  state.consecutiveFailures = 0
  state.lastError = null
  state.isRecovering = false
}

/**
 * Check if a feature should be temporarily disabled
 */
export function shouldDisableFeature(featureId: string): boolean {
  const state = getFailureState(featureId)
  return state.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES
}

/**
 * Get status info for a feature
 */
export function getFeatureStatusInfo(featureId: string, enabled: boolean): AIStatusInfo {
  if (!enabled) {
    return { status: 'disabled' }
  }
  
  if (!isLLMAvailable()) {
    return { status: 'no-api-key', message: 'Configure API keys in Settings' }
  }
  
  const state = getFailureState(featureId)
  
  if (shouldDisableFeature(featureId)) {
    return {
      status: 'error',
      message: 'Temporarily paused due to errors',
      lastError: state.lastError || undefined,
      lastErrorTime: state.lastFailure || undefined,
    }
  }
  
  return { status: 'ready' }
}

/* ═══════════════════════════════════════════════════════════════════════════
   RETRY UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Calculate backoff delay with jitter
 */
function calculateBackoff(attempt: number): number {
  const baseDelay = Math.min(BACKOFF_BASE_MS * Math.pow(2, attempt), BACKOFF_MAX_MS)
  const jitter = baseDelay * (0.5 + Math.random() * 0.5)
  return Math.round(jitter)
}

/**
 * Sleep for a duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Options for withGracefulFailure
 */
export interface GracefulOptions<T> {
  /** Unique identifier for the feature */
  featureId: string
  /** Maximum retry attempts */
  maxRetries?: number
  /** Callback when feature status changes */
  onStatusChange?: (status: AIFeatureStatus) => void
  /** Fallback value if all retries fail */
  fallback?: T
  /** Abort signal */
  signal?: AbortSignal
}

/**
 * Wrap an async operation with graceful failure handling
 */
export async function withGracefulFailure<T>(
  operation: () => Promise<T>,
  options: GracefulOptions<T>
): Promise<T | null> {
  const {
    featureId,
    maxRetries = 2,
    onStatusChange,
    fallback,
    signal,
  } = options
  
  // Check if feature is disabled due to too many failures
  if (shouldDisableFeature(featureId)) {
    onStatusChange?.('error')
    return fallback ?? null
  }
  
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check for abort
    if (signal?.aborted) {
      return fallback ?? null
    }
    
    try {
      onStatusChange?.('working')
      const result = await operation()
      recordSuccess(featureId)
      onStatusChange?.('ready')
      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Don't retry on certain errors
      if (isNonRetryableError(lastError)) {
        recordFailure(featureId, lastError)
        break
      }
      
      // Backoff before retry
      if (attempt < maxRetries) {
        const delay = calculateBackoff(attempt)
        await sleep(delay)
      }
    }
  }
  
  // All retries failed
  if (lastError) {
    recordFailure(featureId, lastError)
  }
  
  // Check if we should disable the feature now
  if (shouldDisableFeature(featureId)) {
    onStatusChange?.('error')
    scheduleRecoveryCheck(featureId, onStatusChange)
  }
  
  return fallback ?? null
}

/**
 * Check if an error should not trigger retries
 */
function isNonRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase()
  return (
    message.includes('invalid api key') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('not found') ||
    message.includes('invalid request')
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUTO-RECOVERY
═══════════════════════════════════════════════════════════════════════════ */

const recoveryTimers = new Map<string, NodeJS.Timeout>()

/**
 * Schedule a recovery check for a feature
 */
function scheduleRecoveryCheck(
  featureId: string,
  onStatusChange?: (status: AIFeatureStatus) => void
): void {
  // Clear existing timer
  const existingTimer = recoveryTimers.get(featureId)
  if (existingTimer) {
    clearTimeout(existingTimer)
  }
  
  const state = getFailureState(featureId)
  state.isRecovering = true
  
  const timer = setTimeout(async () => {
    // Try a simple availability check
    if (isLLMAvailable()) {
      // Reset failures and try again
      state.consecutiveFailures = 0
      state.isRecovering = false
      clearFailedProviders()
      onStatusChange?.('ready')
    } else {
      // Schedule another check
      scheduleRecoveryCheck(featureId, onStatusChange)
    }
  }, RECOVERY_CHECK_INTERVAL)
  
  recoveryTimers.set(featureId, timer)
}

/**
 * Clear all recovery timers (for cleanup)
 */
export function clearRecoveryTimers(): void {
  for (const timer of recoveryTimers.values()) {
    clearTimeout(timer)
  }
  recoveryTimers.clear()
}

/**
 * Reset all failure states (e.g., when settings change)
 */
export function resetAllFailures(): void {
  featureFailures.clear()
  clearRecoveryTimers()
  clearFailedProviders()
}

/* ═══════════════════════════════════════════════════════════════════════════
   API KEY VALIDATION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Check if required API keys are configured for a feature
 */
export function hasRequiredAPIKeys(feature: 'vision' | 'rag' | 'writing'): boolean {
  // All features require at least one LLM provider
  return isLLMAvailable()
}

/**
 * Get missing API key message for a feature
 */
export function getMissingKeyMessage(feature: 'vision' | 'rag' | 'writing'): string {
  const failed = getFailedProviders()
  
  if (failed.length > 0) {
    return `API providers unavailable: ${failed.join(', ')}. Check Settings → API Keys.`
  }
  
  return 'Configure API keys in Settings → API Keys to enable AI features.'
}



