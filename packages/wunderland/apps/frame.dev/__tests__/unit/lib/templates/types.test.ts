/**
 * Template Types Tests
 * @module __tests__/unit/lib/templates/types.test
 *
 * Tests for template type definitions, constants, and error class.
 */

import { describe, it, expect } from 'vitest'
import {
  TemplateError,
  TemplateErrorType,
  OFFICIAL_TEMPLATE_REPO,
  CACHE_TTL,
  CACHE_LIMITS,
  STORAGE_KEYS,
} from '@/lib/templates/types'

// ============================================================================
// TemplateError
// ============================================================================

describe('TemplateError', () => {
  it('creates error with type and message', () => {
    const error = new TemplateError(
      TemplateErrorType.NETWORK_ERROR,
      'Failed to fetch template'
    )

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(TemplateError)
    expect(error.type).toBe(TemplateErrorType.NETWORK_ERROR)
    expect(error.message).toBe('Failed to fetch template')
    expect(error.name).toBe('TemplateError')
  })

  it('includes retryAfter for rate limiting', () => {
    const error = new TemplateError(
      TemplateErrorType.RATE_LIMITED,
      'Rate limit exceeded',
      60 // retry after 60 seconds
    )

    expect(error.type).toBe(TemplateErrorType.RATE_LIMITED)
    expect(error.retryAfter).toBe(60)
  })

  it('includes repoId for repository-specific errors', () => {
    const error = new TemplateError(
      TemplateErrorType.NOT_FOUND,
      'Template not found',
      undefined,
      'org/repo'
    )

    expect(error.repoId).toBe('org/repo')
  })

  it('supports all error types', () => {
    const types = [
      TemplateErrorType.NETWORK_ERROR,
      TemplateErrorType.RATE_LIMITED,
      TemplateErrorType.NOT_FOUND,
      TemplateErrorType.INVALID_REGISTRY,
      TemplateErrorType.INVALID_TEMPLATE,
      TemplateErrorType.CACHE_ERROR,
      TemplateErrorType.PERMISSION_DENIED,
    ]

    for (const type of types) {
      const error = new TemplateError(type, 'Test error')
      expect(error.type).toBe(type)
    }
  })
})

// ============================================================================
// TemplateErrorType
// ============================================================================

describe('TemplateErrorType', () => {
  it('has NETWORK_ERROR', () => {
    expect(TemplateErrorType.NETWORK_ERROR).toBe('NETWORK_ERROR')
  })

  it('has RATE_LIMITED', () => {
    expect(TemplateErrorType.RATE_LIMITED).toBe('RATE_LIMITED')
  })

  it('has NOT_FOUND', () => {
    expect(TemplateErrorType.NOT_FOUND).toBe('NOT_FOUND')
  })

  it('has INVALID_REGISTRY', () => {
    expect(TemplateErrorType.INVALID_REGISTRY).toBe('INVALID_REGISTRY')
  })

  it('has INVALID_TEMPLATE', () => {
    expect(TemplateErrorType.INVALID_TEMPLATE).toBe('INVALID_TEMPLATE')
  })

  it('has CACHE_ERROR', () => {
    expect(TemplateErrorType.CACHE_ERROR).toBe('CACHE_ERROR')
  })

  it('has PERMISSION_DENIED', () => {
    expect(TemplateErrorType.PERMISSION_DENIED).toBe('PERMISSION_DENIED')
  })
})

// ============================================================================
// OFFICIAL_TEMPLATE_REPO
// ============================================================================

describe('OFFICIAL_TEMPLATE_REPO', () => {
  it('has correct id format', () => {
    expect(OFFICIAL_TEMPLATE_REPO.id).toBe('framersai/quarry-templates')
  })

  it('has owner and repo', () => {
    expect(OFFICIAL_TEMPLATE_REPO.owner).toBe('framersai')
    expect(OFFICIAL_TEMPLATE_REPO.repo).toBe('quarry-templates')
  })

  it('uses main branch', () => {
    expect(OFFICIAL_TEMPLATE_REPO.branch).toBe('main')
  })

  it('is enabled by default', () => {
    expect(OFFICIAL_TEMPLATE_REPO.enabled).toBe(true)
  })

  it('is marked as official', () => {
    expect(OFFICIAL_TEMPLATE_REPO.isOfficial).toBe(true)
  })

  it('has display name and description', () => {
    expect(OFFICIAL_TEMPLATE_REPO.name).toBeDefined()
    expect(OFFICIAL_TEMPLATE_REPO.name.length).toBeGreaterThan(0)
    expect(OFFICIAL_TEMPLATE_REPO.description).toBeDefined()
    expect(OFFICIAL_TEMPLATE_REPO.description.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// CACHE_TTL
// ============================================================================

describe('CACHE_TTL', () => {
  it('has REGISTRY TTL of 4 hours', () => {
    expect(CACHE_TTL.REGISTRY).toBe(4 * 60 * 60 * 1000)
  })

  it('has TEMPLATE TTL of 24 hours', () => {
    expect(CACHE_TTL.TEMPLATE).toBe(24 * 60 * 60 * 1000)
  })

  it('has STALE_WHILE_REVALIDATE of 7 days', () => {
    expect(CACHE_TTL.STALE_WHILE_REVALIDATE).toBe(7 * 24 * 60 * 60 * 1000)
  })

  it('STALE_WHILE_REVALIDATE is longer than TEMPLATE TTL', () => {
    expect(CACHE_TTL.STALE_WHILE_REVALIDATE).toBeGreaterThan(CACHE_TTL.TEMPLATE)
  })

  it('TEMPLATE TTL is longer than REGISTRY TTL', () => {
    expect(CACHE_TTL.TEMPLATE).toBeGreaterThan(CACHE_TTL.REGISTRY)
  })
})

// ============================================================================
// CACHE_LIMITS
// ============================================================================

describe('CACHE_LIMITS', () => {
  it('has MAX_TEMPLATES', () => {
    expect(CACHE_LIMITS.MAX_TEMPLATES).toBe(500)
  })

  it('has MAX_REGISTRIES', () => {
    expect(CACHE_LIMITS.MAX_REGISTRIES).toBe(20)
  })

  it('MAX_TEMPLATES is larger than MAX_REGISTRIES', () => {
    expect(CACHE_LIMITS.MAX_TEMPLATES).toBeGreaterThan(CACHE_LIMITS.MAX_REGISTRIES)
  })
})

// ============================================================================
// STORAGE_KEYS
// ============================================================================

describe('STORAGE_KEYS', () => {
  it('has PREFERENCES key', () => {
    expect(STORAGE_KEYS.PREFERENCES).toBe('quarry-template-sources')
  })

  it('has SYNC_STATUS key', () => {
    expect(STORAGE_KEYS.SYNC_STATUS).toBe('quarry-template-sync-status')
  })

  it('has DRAFTS key', () => {
    expect(STORAGE_KEYS.DRAFTS).toBe('quarry-template-drafts')
  })

  it('all keys are unique', () => {
    const keys = Object.values(STORAGE_KEYS)
    const uniqueKeys = new Set(keys)
    expect(uniqueKeys.size).toBe(keys.length)
  })

  it('all keys have quarry prefix', () => {
    const keys = Object.values(STORAGE_KEYS)
    for (const key of keys) {
      expect(key).toMatch(/^quarry-/)
    }
  })
})
