/**
 * AI Graceful Failure Tests
 * @module __tests__/unit/lib/ai/gracefulFailure.test
 *
 * Tests for AI feature graceful degradation and recovery system.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the llm module
vi.mock('@/lib/llm', () => ({
  isLLMAvailable: vi.fn(() => true),
  getFailedProviders: vi.fn(() => []),
  clearFailedProviders: vi.fn(),
}))

import {
  recordFailure,
  recordSuccess,
  shouldDisableFeature,
  getFeatureStatusInfo,
  withGracefulFailure,
  clearRecoveryTimers,
  resetAllFailures,
  hasRequiredAPIKeys,
  getMissingKeyMessage,
  type GracefulOptions,
} from '@/lib/ai/gracefulFailure'
import { isLLMAvailable, getFailedProviders } from '@/lib/llm'

// Constants (match the source file)
const MAX_CONSECUTIVE_FAILURES = 3

describe('AI Graceful Failure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllFailures()
    clearRecoveryTimers()
    vi.mocked(isLLMAvailable).mockReturnValue(true)
    vi.mocked(getFailedProviders).mockReturnValue([])
  })

  afterEach(() => {
    clearRecoveryTimers()
  })

  // ============================================================================
  // recordFailure
  // ============================================================================

  describe('recordFailure', () => {
    it('records a failure for a feature', () => {
      const error = new Error('API timeout')
      recordFailure('vision', error)

      // After one failure, feature should not be disabled
      expect(shouldDisableFeature('vision')).toBe(false)
    })

    it('tracks consecutive failures', () => {
      const error = new Error('API error')

      recordFailure('rag', error)
      expect(shouldDisableFeature('rag')).toBe(false)

      recordFailure('rag', error)
      expect(shouldDisableFeature('rag')).toBe(false)

      recordFailure('rag', error)
      expect(shouldDisableFeature('rag')).toBe(true)
    })

    it('handles Error objects', () => {
      recordFailure('vision', new Error('Network error'))
      recordFailure('vision', new TypeError('Type error'))
      recordFailure('vision', new Error('Another error'))

      expect(shouldDisableFeature('vision')).toBe(true)
    })

    it('handles string errors', () => {
      recordFailure('writing', 'String error 1')
      recordFailure('writing', 'String error 2')
      recordFailure('writing', 'String error 3')

      expect(shouldDisableFeature('writing')).toBe(true)
    })

    it('tracks failures independently per feature', () => {
      const error = new Error('Error')

      // Max out failures for one feature
      recordFailure('vision', error)
      recordFailure('vision', error)
      recordFailure('vision', error)

      // Other feature should not be affected
      expect(shouldDisableFeature('vision')).toBe(true)
      expect(shouldDisableFeature('rag')).toBe(false)
    })

    it('stores error message in status', () => {
      const error = new Error('Specific error message')
      recordFailure('rag', error)

      const status = getFeatureStatusInfo('rag', true)
      // Error is stored but feature not disabled yet
      expect(status.status).toBe('ready')
    })
  })

  // ============================================================================
  // recordSuccess
  // ============================================================================

  describe('recordSuccess', () => {
    it('resets failure count for a feature', () => {
      const error = new Error('Error')

      // Record two failures
      recordFailure('vision', error)
      recordFailure('vision', error)

      // Record a success
      recordSuccess('vision')

      // One more failure should not disable (count reset)
      recordFailure('vision', error)
      expect(shouldDisableFeature('vision')).toBe(false)
    })

    it('handles success without prior failures', () => {
      // Should not throw
      expect(() => recordSuccess('rag')).not.toThrow()
    })

    it('re-enables disabled feature on success', () => {
      const error = new Error('Error')

      // Disable the feature
      recordFailure('writing', error)
      recordFailure('writing', error)
      recordFailure('writing', error)
      expect(shouldDisableFeature('writing')).toBe(true)

      // Record success
      recordSuccess('writing')

      // Feature should be re-enabled
      expect(shouldDisableFeature('writing')).toBe(false)
    })
  })

  // ============================================================================
  // shouldDisableFeature
  // ============================================================================

  describe('shouldDisableFeature', () => {
    it('returns false for new feature', () => {
      expect(shouldDisableFeature('vision')).toBe(false)
    })

    it('returns false below threshold', () => {
      recordFailure('rag', new Error('Error'))
      recordFailure('rag', new Error('Error'))
      expect(shouldDisableFeature('rag')).toBe(false)
    })

    it('returns true at threshold', () => {
      recordFailure('vision', new Error('Error'))
      recordFailure('vision', new Error('Error'))
      recordFailure('vision', new Error('Error'))
      expect(shouldDisableFeature('vision')).toBe(true)
    })

    it('returns true above threshold', () => {
      for (let i = 0; i < 5; i++) {
        recordFailure('writing', new Error('Error'))
      }
      expect(shouldDisableFeature('writing')).toBe(true)
    })

    it('returns false for unknown feature', () => {
      expect(shouldDisableFeature('unknown_feature')).toBe(false)
    })
  })

  // ============================================================================
  // getFeatureStatusInfo
  // ============================================================================

  describe('getFeatureStatusInfo', () => {
    it('returns status info object', () => {
      const status = getFeatureStatusInfo('vision', true)

      expect(status).toHaveProperty('status')
    })

    it('returns disabled status when enabled is false', () => {
      const status = getFeatureStatusInfo('vision', false)
      expect(status.status).toBe('disabled')
    })

    it('returns no-api-key when LLM not available', () => {
      vi.mocked(isLLMAvailable).mockReturnValue(false)

      const status = getFeatureStatusInfo('vision', true)
      expect(status.status).toBe('no-api-key')
      expect(status.message).toContain('API')
    })

    it('returns error status when feature is disabled due to failures', () => {
      recordFailure('rag', new Error('Error'))
      recordFailure('rag', new Error('Error'))
      recordFailure('rag', new Error('Error'))

      const status = getFeatureStatusInfo('rag', true)
      expect(status.status).toBe('error')
      expect(status.message).toContain('paused')
    })

    it('returns ready status for healthy feature', () => {
      const status = getFeatureStatusInfo('writing', true)
      expect(status.status).toBe('ready')
    })

    it('includes last error when present', () => {
      recordFailure('vision', new Error('Specific API error'))
      recordFailure('vision', new Error('Specific API error'))
      recordFailure('vision', new Error('Specific API error'))

      const status = getFeatureStatusInfo('vision', true)
      expect(status.lastError).toContain('Specific API error')
    })
  })

  // ============================================================================
  // withGracefulFailure
  // ============================================================================

  describe('withGracefulFailure', () => {
    it('executes operation successfully', async () => {
      const operation = vi.fn().mockResolvedValue('success')

      const result = await withGracefulFailure(operation, {
        featureId: 'vision',
      })

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('records success after successful operation', async () => {
      // First, record some failures
      recordFailure('rag', new Error('Error'))
      recordFailure('rag', new Error('Error'))

      const operation = vi.fn().mockResolvedValue('success')

      await withGracefulFailure(operation, {
        featureId: 'rag',
      })

      // Failures should be reset
      expect(shouldDisableFeature('rag')).toBe(false)
    })

    it('records failure after failed operation', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('API error'))

      const result = await withGracefulFailure(operation, {
        featureId: 'vision',
      })

      expect(result).toBeNull() // Returns null on failure
    })

    it('retries operation on failure', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success')

      const result = await withGracefulFailure(operation, {
        featureId: 'writing',
        maxRetries: 3,
      })

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('respects maxRetries option', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'))

      await withGracefulFailure(operation, {
        featureId: 'vision',
        maxRetries: 2,
      })

      // Default maxRetries is 2 (0, 1, 2 = 3 attempts)
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('calls onStatusChange callback', async () => {
      const onStatusChange = vi.fn()
      const operation = vi.fn().mockResolvedValue('success')

      await withGracefulFailure(operation, {
        featureId: 'rag',
        onStatusChange,
      })

      expect(onStatusChange).toHaveBeenCalledWith('working')
      expect(onStatusChange).toHaveBeenCalledWith('ready')
    })

    it('returns fallback value when feature is disabled', async () => {
      // Disable the feature
      for (let i = 0; i < MAX_CONSECUTIVE_FAILURES; i++) {
        recordFailure('vision', new Error('Error'))
      }

      const operation = vi.fn().mockResolvedValue('success')

      const result = await withGracefulFailure(operation, {
        featureId: 'vision',
        fallback: 'fallback',
      })

      expect(result).toBe('fallback')
      expect(operation).not.toHaveBeenCalled()
    })

    it('returns null when feature is disabled and no fallback', async () => {
      // Disable the feature
      for (let i = 0; i < MAX_CONSECUTIVE_FAILURES; i++) {
        recordFailure('writing', new Error('Error'))
      }

      const operation = vi.fn().mockResolvedValue('success')

      const result = await withGracefulFailure(operation, {
        featureId: 'writing',
      })

      expect(result).toBeNull()
      expect(operation).not.toHaveBeenCalled()
    })

    it('returns null on abort', async () => {
      const controller = new AbortController()
      controller.abort()

      const operation = vi.fn().mockResolvedValue('success')

      const result = await withGracefulFailure(operation, {
        featureId: 'vision',
        signal: controller.signal,
      })

      expect(result).toBeNull()
      expect(operation).not.toHaveBeenCalled()
    })

    it('does not retry on non-retryable errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Invalid API key'))

      await withGracefulFailure(operation, {
        featureId: 'rag',
        maxRetries: 3,
      })

      // Should only try once for non-retryable errors
      expect(operation).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================================================
  // clearRecoveryTimers
  // ============================================================================

  describe('clearRecoveryTimers', () => {
    it('does not throw when no timers exist', () => {
      expect(() => clearRecoveryTimers()).not.toThrow()
    })

    it('can be called multiple times', () => {
      expect(() => {
        clearRecoveryTimers()
        clearRecoveryTimers()
        clearRecoveryTimers()
      }).not.toThrow()
    })
  })

  // ============================================================================
  // resetAllFailures
  // ============================================================================

  describe('resetAllFailures', () => {
    it('resets all failure counts', () => {
      // Record failures for multiple features
      recordFailure('vision', new Error('Error'))
      recordFailure('rag', new Error('Error'))
      recordFailure('writing', new Error('Error'))

      resetAllFailures()

      expect(shouldDisableFeature('vision')).toBe(false)
      expect(shouldDisableFeature('rag')).toBe(false)
      expect(shouldDisableFeature('writing')).toBe(false)
    })

    it('re-enables disabled features', () => {
      // Disable a feature
      for (let i = 0; i < MAX_CONSECUTIVE_FAILURES; i++) {
        recordFailure('vision', new Error('Error'))
      }
      expect(shouldDisableFeature('vision')).toBe(true)

      resetAllFailures()

      expect(shouldDisableFeature('vision')).toBe(false)
    })
  })

  // ============================================================================
  // hasRequiredAPIKeys
  // ============================================================================

  describe('hasRequiredAPIKeys', () => {
    it('returns true when LLM is available', () => {
      vi.mocked(isLLMAvailable).mockReturnValue(true)

      expect(hasRequiredAPIKeys('vision')).toBe(true)
      expect(hasRequiredAPIKeys('rag')).toBe(true)
      expect(hasRequiredAPIKeys('writing')).toBe(true)
    })

    it('returns false when LLM is not available', () => {
      vi.mocked(isLLMAvailable).mockReturnValue(false)

      expect(hasRequiredAPIKeys('vision')).toBe(false)
      expect(hasRequiredAPIKeys('rag')).toBe(false)
      expect(hasRequiredAPIKeys('writing')).toBe(false)
    })
  })

  // ============================================================================
  // getMissingKeyMessage
  // ============================================================================

  describe('getMissingKeyMessage', () => {
    it('returns a string message', () => {
      const message = getMissingKeyMessage('vision')
      expect(typeof message).toBe('string')
      expect(message.length).toBeGreaterThan(0)
    })

    it('includes failed providers when present', () => {
      vi.mocked(getFailedProviders).mockReturnValue(['openai', 'anthropic'])

      const message = getMissingKeyMessage('vision')
      expect(message).toContain('openai')
      expect(message).toContain('anthropic')
    })

    it('provides guidance when no failed providers', () => {
      vi.mocked(getFailedProviders).mockReturnValue([])

      const message = getMissingKeyMessage('rag')
      expect(message).toContain('Settings')
      expect(message).toContain('API')
    })

    it('handles all feature types', () => {
      const features: Array<'vision' | 'rag' | 'writing'> = ['vision', 'rag', 'writing']

      features.forEach((feature) => {
        const message = getMissingKeyMessage(feature)
        expect(typeof message).toBe('string')
        expect(message.length).toBeGreaterThan(0)
      })
    })
  })

  // ============================================================================
  // Integration scenarios
  // ============================================================================

  describe('integration scenarios', () => {
    it('handles full failure-success cycle', async () => {
      const operation = vi.fn().mockResolvedValue('result')

      // First call should work
      const result1 = await withGracefulFailure(operation, {
        featureId: 'vision',
      })
      expect(result1).toBe('result')

      // Record failures to disable
      for (let i = 0; i < MAX_CONSECUTIVE_FAILURES; i++) {
        recordFailure('vision', new Error('Error'))
      }

      // Second call should return null (disabled)
      const result2 = await withGracefulFailure(operation, {
        featureId: 'vision',
      })
      expect(result2).toBeNull()

      // Reset failures
      resetAllFailures()

      // Third call should work again
      const result3 = await withGracefulFailure(operation, {
        featureId: 'vision',
      })
      expect(result3).toBe('result')
    })

    it('handles multiple features independently', () => {
      // Disable vision
      for (let i = 0; i < MAX_CONSECUTIVE_FAILURES; i++) {
        recordFailure('vision', new Error('Error'))
      }

      // Record one failure for rag
      recordFailure('rag', new Error('Error'))

      // Success on writing
      recordSuccess('writing')

      // Check states
      expect(shouldDisableFeature('vision')).toBe(true)
      expect(shouldDisableFeature('rag')).toBe(false)
      expect(shouldDisableFeature('writing')).toBe(false)

      expect(getFeatureStatusInfo('vision', true).status).toBe('error')
      expect(getFeatureStatusInfo('rag', true).status).toBe('ready')
      expect(getFeatureStatusInfo('writing', true).status).toBe('ready')
    })

    it('status reflects LLM availability', () => {
      // LLM available
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      expect(getFeatureStatusInfo('vision', true).status).toBe('ready')

      // LLM not available
      vi.mocked(isLLMAvailable).mockReturnValue(false)
      expect(getFeatureStatusInfo('vision', true).status).toBe('no-api-key')

      // Disabled overrides LLM check
      expect(getFeatureStatusInfo('vision', false).status).toBe('disabled')
    })
  })
})
