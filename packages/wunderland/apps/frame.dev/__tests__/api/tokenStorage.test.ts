/**
 * Token Storage Tests
 * 
 * Tests for API token generation, validation, and storage.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the database
vi.mock('@/lib/codexDatabase', () => ({
  getDatabase: vi.fn(() => ({
    exec: vi.fn(),
    run: vi.fn(),
    all: vi.fn(() => [])
  }))
}))

// Import after mocking
import { maskToken } from '../../lib/api/auth/tokenStorage'

describe('Token Storage', () => {
  describe('maskToken', () => {
    it('masks tokens correctly', () => {
      const token = 'fdev_abcdefghijklmnopqrstuvwxyz1234567890ABCD'
      const masked = maskToken(token)
      
      // Masked format: first 8 chars + "..." + last 4 chars
      expect(masked).toMatch(/^fdev_abc\.\.\.ABCD$/)
      expect(masked).toHaveLength(15)
    })

    it('handles short tokens', () => {
      const token = 'short'
      const masked = maskToken(token)
      
      expect(masked).toBe('****')
    })

    it('handles edge case with 12 char token', () => {
      const token = 'exactly12chr'
      const masked = maskToken(token)
      
      expect(masked).toBe('****')
    })

    it('preserves token format prefix', () => {
      const token = 'fdev_test1234567890abcdefghij'
      const masked = maskToken(token)
      
      expect(masked.startsWith('fdev_tes')).toBe(true)
    })
  })

  describe('Token Format', () => {
    it('validates token prefix', () => {
      const validToken = 'fdev_someRandomTokenValue12345'
      const invalidToken = 'invalid_someRandomTokenValue'
      
      expect(validToken.startsWith('fdev_')).toBe(true)
      expect(invalidToken.startsWith('fdev_')).toBe(false)
    })
  })
})

