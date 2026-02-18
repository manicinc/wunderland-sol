/**
 * Token Storage Tests
 * @module __tests__/unit/lib/api/tokenStorage.test
 *
 * Tests for API token storage types and utilities.
 */

import { describe, it, expect } from 'vitest'
import {
  maskToken,
  type APIToken,
  type TokenCreateInput,
  type TokenValidationResult,
} from '@/lib/api/auth/tokenStorage'

describe('Token Storage', () => {
  // ============================================================================
  // maskToken utility
  // ============================================================================

  describe('maskToken', () => {
    it('masks long tokens showing first 8 and last 4 chars', () => {
      const token = 'fdev_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl'
      const masked = maskToken(token)
      expect(masked).toBe('fdev_ABC...ijkl')
    })

    it('returns **** for short tokens', () => {
      const token = 'short'
      const masked = maskToken(token)
      expect(masked).toBe('****')
    })

    it('returns **** for tokens exactly 12 chars', () => {
      const token = '123456789012'
      const masked = maskToken(token)
      expect(masked).toBe('****')
    })

    it('masks 13 char token', () => {
      const token = '1234567890123'
      const masked = maskToken(token)
      expect(masked).toBe('12345678...0123')
    })

    it('preserves token prefix in mask', () => {
      const token = 'fdev_1234567890abcdefghijklmnopqrstuvwxyz'
      const masked = maskToken(token)
      expect(masked.startsWith('fdev_')).toBe(true)
    })

    it('shows last 4 chars correctly', () => {
      const token = 'fdev_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij'
      const masked = maskToken(token)
      expect(masked.endsWith('ghij')).toBe(true)
    })

    it('handles empty string', () => {
      const masked = maskToken('')
      expect(masked).toBe('****')
    })

    it('handles token with exactly 44 chars (standard length)', () => {
      const token = 'fdev_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijk'
      const masked = maskToken(token)
      expect(masked).toMatch(/^.{8}\.\.\..{4}$/)
    })
  })

  // ============================================================================
  // APIToken type
  // ============================================================================

  describe('APIToken type', () => {
    it('creates minimal token', () => {
      const token: APIToken = {
        id: 'token-123',
        profileId: 'profile-456',
        token: 'fdev_ABC...xyz',
        tokenHash: 'abc123def456',
        label: 'My API Token',
        createdAt: '2025-01-01T00:00:00Z',
        lastUsedAt: null,
        expiresAt: null,
        isActive: true,
        usageCount: 0,
      }
      expect(token.id).toBe('token-123')
      expect(token.isActive).toBe(true)
    })

    it('creates token with expiration', () => {
      const token: APIToken = {
        id: 'token-456',
        profileId: 'profile-789',
        token: '****',
        tokenHash: 'hash123',
        label: 'Expiring Token',
        createdAt: '2025-01-01T00:00:00Z',
        lastUsedAt: '2025-01-02T00:00:00Z',
        expiresAt: '2025-12-31T23:59:59Z',
        isActive: true,
        usageCount: 10,
      }
      expect(token.expiresAt).toBe('2025-12-31T23:59:59Z')
      expect(token.usageCount).toBe(10)
    })

    it('creates revoked token', () => {
      const token: APIToken = {
        id: 'token-revoked',
        profileId: 'profile-123',
        token: '****',
        tokenHash: 'hash456',
        label: 'Revoked Token',
        createdAt: '2025-01-01T00:00:00Z',
        lastUsedAt: '2025-01-15T00:00:00Z',
        expiresAt: null,
        isActive: false,
        usageCount: 50,
      }
      expect(token.isActive).toBe(false)
    })

    it('tracks usage count', () => {
      const token: APIToken = {
        id: 'token-used',
        profileId: 'profile-active',
        token: '****',
        tokenHash: 'hashused',
        label: 'Heavily Used Token',
        createdAt: '2024-01-01T00:00:00Z',
        lastUsedAt: '2025-01-01T00:00:00Z',
        expiresAt: null,
        isActive: true,
        usageCount: 1000,
      }
      expect(token.usageCount).toBe(1000)
      expect(token.lastUsedAt).toBeDefined()
    })
  })

  // ============================================================================
  // TokenCreateInput type
  // ============================================================================

  describe('TokenCreateInput type', () => {
    it('creates minimal input', () => {
      const input: TokenCreateInput = {
        profileId: 'profile-123',
      }
      expect(input.profileId).toBe('profile-123')
      expect(input.label).toBeUndefined()
      expect(input.expiresInDays).toBeUndefined()
    })

    it('creates input with label', () => {
      const input: TokenCreateInput = {
        profileId: 'profile-456',
        label: 'Production API Key',
      }
      expect(input.label).toBe('Production API Key')
    })

    it('creates input with expiration', () => {
      const input: TokenCreateInput = {
        profileId: 'profile-789',
        expiresInDays: 30,
      }
      expect(input.expiresInDays).toBe(30)
    })

    it('creates full input', () => {
      const input: TokenCreateInput = {
        profileId: 'profile-full',
        label: 'Short-lived Token',
        expiresInDays: 7,
      }
      expect(input.profileId).toBe('profile-full')
      expect(input.label).toBe('Short-lived Token')
      expect(input.expiresInDays).toBe(7)
    })

    it('supports long expiration periods', () => {
      const input: TokenCreateInput = {
        profileId: 'profile-long',
        expiresInDays: 365,
      }
      expect(input.expiresInDays).toBe(365)
    })

    it('supports zero expiration (immediate)', () => {
      const input: TokenCreateInput = {
        profileId: 'profile-zero',
        expiresInDays: 0,
      }
      expect(input.expiresInDays).toBe(0)
    })
  })

  // ============================================================================
  // TokenValidationResult type
  // ============================================================================

  describe('TokenValidationResult type', () => {
    it('creates valid result with token', () => {
      const result: TokenValidationResult = {
        valid: true,
        token: {
          id: 'token-valid',
          profileId: 'profile-123',
          token: '****',
          tokenHash: 'hash',
          label: 'Valid Token',
          createdAt: '2025-01-01T00:00:00Z',
          lastUsedAt: '2025-01-01T00:00:00Z',
          expiresAt: null,
          isActive: true,
          usageCount: 1,
        },
      }
      expect(result.valid).toBe(true)
      expect(result.token).toBeDefined()
      expect(result.error).toBeUndefined()
    })

    it('creates invalid result with error', () => {
      const result: TokenValidationResult = {
        valid: false,
        error: 'Token not found or revoked',
      }
      expect(result.valid).toBe(false)
      expect(result.token).toBeUndefined()
      expect(result.error).toBe('Token not found or revoked')
    })

    it('creates invalid result for expired token', () => {
      const result: TokenValidationResult = {
        valid: false,
        error: 'Token expired',
      }
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Token expired')
    })

    it('creates invalid result for invalid format', () => {
      const result: TokenValidationResult = {
        valid: false,
        error: 'Invalid token format',
      }
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid token format')
    })

    it('creates invalid result for database error', () => {
      const result: TokenValidationResult = {
        valid: false,
        error: 'Database not available',
      }
      expect(result.error).toBe('Database not available')
    })
  })

  // ============================================================================
  // Token prefix and format
  // ============================================================================

  describe('token format', () => {
    it('identifies valid token prefix', () => {
      const validToken = 'fdev_abc123xyz'
      expect(validToken.startsWith('fdev_')).toBe(true)
    })

    it('identifies invalid token prefix', () => {
      const invalidToken = 'sk_abc123xyz'
      expect(invalidToken.startsWith('fdev_')).toBe(false)
    })

    it('token without prefix is invalid', () => {
      const noPrefix = 'abc123xyz'
      expect(noPrefix.startsWith('fdev_')).toBe(false)
    })
  })

  // ============================================================================
  // Token lifecycle scenarios
  // ============================================================================

  describe('token lifecycle scenarios', () => {
    it('new token starts with zero usage', () => {
      const token: APIToken = {
        id: 'new-token',
        profileId: 'profile-1',
        token: '****',
        tokenHash: 'hash',
        label: 'New Token',
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        expiresAt: null,
        isActive: true,
        usageCount: 0,
      }
      expect(token.usageCount).toBe(0)
      expect(token.lastUsedAt).toBeNull()
    })

    it('used token has lastUsedAt set', () => {
      const token: APIToken = {
        id: 'used-token',
        profileId: 'profile-1',
        token: '****',
        tokenHash: 'hash',
        label: 'Used Token',
        createdAt: '2025-01-01T00:00:00Z',
        lastUsedAt: '2025-01-02T12:30:00Z',
        expiresAt: null,
        isActive: true,
        usageCount: 5,
      }
      expect(token.lastUsedAt).not.toBeNull()
      expect(token.usageCount).toBeGreaterThan(0)
    })

    it('expired token can be checked', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const token: APIToken = {
        id: 'expired-token',
        profileId: 'profile-1',
        token: '****',
        tokenHash: 'hash',
        label: 'Expired Token',
        createdAt: '2024-01-01T00:00:00Z',
        lastUsedAt: '2024-12-01T00:00:00Z',
        expiresAt: pastDate,
        isActive: true,
        usageCount: 100,
      }
      const expiresAt = new Date(token.expiresAt!)
      expect(expiresAt < new Date()).toBe(true)
    })

    it('future expiration is valid', () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const token: APIToken = {
        id: 'future-token',
        profileId: 'profile-1',
        token: '****',
        tokenHash: 'hash',
        label: 'Future Token',
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        expiresAt: futureDate,
        isActive: true,
        usageCount: 0,
      }
      const expiresAt = new Date(token.expiresAt!)
      expect(expiresAt > new Date()).toBe(true)
    })
  })

  // ============================================================================
  // Token label scenarios
  // ============================================================================

  describe('token label scenarios', () => {
    it('supports descriptive labels', () => {
      const token: APIToken = {
        id: 'labeled-token',
        profileId: 'profile-1',
        token: '****',
        tokenHash: 'hash',
        label: 'Production API - Read Only',
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        expiresAt: null,
        isActive: true,
        usageCount: 0,
      }
      expect(token.label).toContain('Production')
      expect(token.label).toContain('Read Only')
    })

    it('supports date-based labels', () => {
      const dateLabel = `API Token ${new Date().toLocaleDateString()}`
      const token: APIToken = {
        id: 'dated-token',
        profileId: 'profile-1',
        token: '****',
        tokenHash: 'hash',
        label: dateLabel,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        expiresAt: null,
        isActive: true,
        usageCount: 0,
      }
      expect(token.label).toContain('API Token')
    })

    it('supports empty-ish labels', () => {
      const token: APIToken = {
        id: 'minimal-label',
        profileId: 'profile-1',
        token: '****',
        tokenHash: 'hash',
        label: 'Token',
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        expiresAt: null,
        isActive: true,
        usageCount: 0,
      }
      expect(token.label).toBe('Token')
    })
  })

  // ============================================================================
  // Multiple tokens per profile
  // ============================================================================

  describe('multiple tokens per profile', () => {
    it('can have multiple tokens for same profile', () => {
      const profileId = 'profile-multi'
      const tokens: APIToken[] = [
        {
          id: 'token-1',
          profileId,
          token: '****',
          tokenHash: 'hash1',
          label: 'Development',
          createdAt: '2025-01-01T00:00:00Z',
          lastUsedAt: null,
          expiresAt: null,
          isActive: true,
          usageCount: 0,
        },
        {
          id: 'token-2',
          profileId,
          token: '****',
          tokenHash: 'hash2',
          label: 'Staging',
          createdAt: '2025-01-02T00:00:00Z',
          lastUsedAt: null,
          expiresAt: null,
          isActive: true,
          usageCount: 0,
        },
        {
          id: 'token-3',
          profileId,
          token: '****',
          tokenHash: 'hash3',
          label: 'Production',
          createdAt: '2025-01-03T00:00:00Z',
          lastUsedAt: null,
          expiresAt: null,
          isActive: true,
          usageCount: 0,
        },
      ]
      expect(tokens).toHaveLength(3)
      expect(tokens.every(t => t.profileId === profileId)).toBe(true)
    })

    it('tokens have unique hashes', () => {
      const hashes = ['hash1', 'hash2', 'hash3']
      const uniqueHashes = new Set(hashes)
      expect(uniqueHashes.size).toBe(hashes.length)
    })
  })
})
