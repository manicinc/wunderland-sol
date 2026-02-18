/**
 * Publish Types Tests
 * @module __tests__/unit/lib/publish/types.test
 *
 * Tests for publish type definitions and error class.
 */

import { describe, it, expect } from 'vitest'
import { PublishError, type PublishErrorCode } from '@/lib/publish/types'

// ============================================================================
// PublishError
// ============================================================================

describe('PublishError', () => {
  it('extends Error', () => {
    const error = new PublishError('Test error', 'NETWORK_ERROR')
    expect(error).toBeInstanceOf(Error)
  })

  it('has correct name', () => {
    const error = new PublishError('Test error', 'NETWORK_ERROR')
    expect(error.name).toBe('PublishError')
  })

  it('stores message', () => {
    const error = new PublishError('Connection failed', 'NETWORK_ERROR')
    expect(error.message).toBe('Connection failed')
  })

  it('stores error code', () => {
    const error = new PublishError('Token expired', 'PAT_EXPIRED')
    expect(error.code).toBe('PAT_EXPIRED')
  })

  describe('retryable property', () => {
    it('defaults to false', () => {
      const error = new PublishError('Test', 'UNKNOWN')
      expect(error.retryable).toBe(false)
    })

    it('can be set to true', () => {
      const error = new PublishError('Rate limited', 'RATE_LIMITED', { retryable: true })
      expect(error.retryable).toBe(true)
    })

    it('can be explicitly set to false', () => {
      const error = new PublishError('Invalid token', 'PAT_INVALID', { retryable: false })
      expect(error.retryable).toBe(false)
    })
  })

  describe('optional contentId', () => {
    it('is undefined by default', () => {
      const error = new PublishError('Test', 'UNKNOWN')
      expect(error.contentId).toBeUndefined()
    })

    it('can be set', () => {
      const error = new PublishError('Content too large', 'CONTENT_TOO_LARGE', {
        contentId: 'strand-123',
      })
      expect(error.contentId).toBe('strand-123')
    })
  })

  describe('optional statusCode', () => {
    it('is undefined by default', () => {
      const error = new PublishError('Test', 'UNKNOWN')
      expect(error.statusCode).toBeUndefined()
    })

    it('can be set', () => {
      const error = new PublishError('Not found', 'REPO_NOT_FOUND', { statusCode: 404 })
      expect(error.statusCode).toBe(404)
    })
  })

  describe('all options together', () => {
    it('accepts all options', () => {
      const error = new PublishError('Rate limit exceeded', 'RATE_LIMITED', {
        retryable: true,
        contentId: 'reflection-456',
        statusCode: 429,
      })

      expect(error.message).toBe('Rate limit exceeded')
      expect(error.code).toBe('RATE_LIMITED')
      expect(error.retryable).toBe(true)
      expect(error.contentId).toBe('reflection-456')
      expect(error.statusCode).toBe(429)
    })
  })

  describe('error codes', () => {
    const errorCodes: PublishErrorCode[] = [
      'NO_PAT',
      'PAT_EXPIRED',
      'PAT_INVALID',
      'NO_REPO_ACCESS',
      'REPO_NOT_FOUND',
      'BRANCH_NOT_FOUND',
      'RATE_LIMITED',
      'CONFLICT',
      'CONTENT_TOO_LARGE',
      'INVALID_CONTENT',
      'NETWORK_ERROR',
      'PR_FAILED',
      'MERGE_FAILED',
      'COMMIT_FAILED',
      'UNKNOWN',
    ]

    it('supports all error codes', () => {
      for (const code of errorCodes) {
        const error = new PublishError(`Test for ${code}`, code)
        expect(error.code).toBe(code)
      }
    })

    it('there are 15 error codes', () => {
      expect(errorCodes).toHaveLength(15)
    })
  })

  describe('throwing and catching', () => {
    it('can be thrown and caught', () => {
      expect(() => {
        throw new PublishError('Test throw', 'UNKNOWN')
      }).toThrow(PublishError)
    })

    it('can be caught with type check', () => {
      try {
        throw new PublishError('No token', 'NO_PAT')
      } catch (e) {
        if (e instanceof PublishError) {
          expect(e.code).toBe('NO_PAT')
        } else {
          throw new Error('Expected PublishError')
        }
      }
    })

    it('message is accessible in catch block', () => {
      try {
        throw new PublishError('Token expired', 'PAT_EXPIRED')
      } catch (e) {
        expect((e as Error).message).toBe('Token expired')
      }
    })
  })

  describe('common error scenarios', () => {
    it('creates authentication error', () => {
      const error = new PublishError(
        'GitHub Personal Access Token not configured',
        'NO_PAT',
        { retryable: false }
      )
      expect(error.code).toBe('NO_PAT')
      expect(error.retryable).toBe(false)
    })

    it('creates rate limit error with retry', () => {
      const error = new PublishError(
        'GitHub API rate limit exceeded. Try again in 60 seconds.',
        'RATE_LIMITED',
        { retryable: true, statusCode: 429 }
      )
      expect(error.code).toBe('RATE_LIMITED')
      expect(error.retryable).toBe(true)
      expect(error.statusCode).toBe(429)
    })

    it('creates conflict error with content ID', () => {
      const error = new PublishError(
        'Remote file was modified since last sync',
        'CONFLICT',
        { retryable: false, contentId: 'strand-abc123' }
      )
      expect(error.code).toBe('CONFLICT')
      expect(error.contentId).toBe('strand-abc123')
    })

    it('creates network error', () => {
      const error = new PublishError(
        'Unable to reach GitHub API',
        'NETWORK_ERROR',
        { retryable: true }
      )
      expect(error.code).toBe('NETWORK_ERROR')
      expect(error.retryable).toBe(true)
    })

    it('creates content too large error', () => {
      const error = new PublishError(
        'File exceeds GitHub size limit',
        'CONTENT_TOO_LARGE',
        { contentId: 'large-file', statusCode: 413 }
      )
      expect(error.code).toBe('CONTENT_TOO_LARGE')
      expect(error.statusCode).toBe(413)
    })
  })
})

// ============================================================================
// Type literal tests (compile-time checks via runtime assertions)
// ============================================================================

describe('type literal values', () => {
  describe('PublishMode', () => {
    it('valid values compile', () => {
      const modes = ['manual', 'auto-batch', 'direct-commit'] as const
      expect(modes).toHaveLength(3)
    })
  })

  describe('BatchStrategy', () => {
    it('valid values compile', () => {
      const strategies = ['daily', 'weekly', 'monthly', 'all-pending', 'manual'] as const
      expect(strategies).toHaveLength(5)
    })
  })

  describe('SyncStatus', () => {
    it('valid values compile', () => {
      const statuses = [
        'local',
        'pending',
        'syncing',
        'synced',
        'modified',
        'conflict',
        'failed',
      ] as const
      expect(statuses).toHaveLength(7)
    })
  })

  describe('PublishableContentType', () => {
    it('valid values compile', () => {
      const types = ['reflection', 'strand', 'project'] as const
      expect(types).toHaveLength(3)
    })
  })

  describe('ConflictResolution', () => {
    it('valid values compile', () => {
      const resolutions = ['keep-local', 'keep-remote', 'merge', 'skip'] as const
      expect(resolutions).toHaveLength(4)
    })
  })

  describe('BatchStatus', () => {
    it('valid values compile', () => {
      const statuses = [
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled',
        'conflict',
      ] as const
      expect(statuses).toHaveLength(6)
    })
  })

  describe('PRState', () => {
    it('valid values compile', () => {
      const states = ['open', 'merged', 'closed'] as const
      expect(states).toHaveLength(3)
    })
  })

  describe('PublishAction', () => {
    it('valid values compile', () => {
      const actions = ['created', 'updated', 'deleted', 'conflict-resolved'] as const
      expect(actions).toHaveLength(4)
    })
  })

  describe('ExportFormat', () => {
    it('valid values compile', () => {
      const formats = ['markdown', 'json', 'zip', 'combined'] as const
      expect(formats).toHaveLength(4)
    })
  })

  describe('ExportGrouping', () => {
    it('valid values compile', () => {
      const groupings = ['type', 'date', 'flat'] as const
      expect(groupings).toHaveLength(3)
    })
  })

  describe('PublishPriority', () => {
    it('valid values compile', () => {
      const priorities = ['critical', 'high', 'normal', 'low'] as const
      expect(priorities).toHaveLength(4)
    })
  })
})
