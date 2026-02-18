/**
 * License Service Tests (Cloud)
 *
 * Unit tests for the cloud-based license service that handles:
 * - License key generation
 * - License validation
 * - License activation
 * - License revocation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock pg Pool
vi.mock('pg', () => {
  const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
  }
  const mockPool = {
    query: vi.fn(),
    connect: vi.fn(() => Promise.resolve(mockClient)),
    end: vi.fn(),
  }
  return {
    Pool: vi.fn(() => mockPool),
  }
})

// Mock bcrypt
vi.mock('bcrypt', () => ({
  hash: vi.fn((data: string) => Promise.resolve(`hashed_${data}`)),
  compare: vi.fn((data: string, hash: string) => Promise.resolve(hash === `hashed_${data}`)),
}))

// Mock crypto
vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => Buffer.from('ABCD1234EFGH5678', 'utf-8')),
}))

import { LicenseService } from '../../../lib/api/services/licenseService'
import { Pool } from 'pg'

describe('LicenseService', () => {
  let service: LicenseService
  let mockPool: any

  beforeEach(() => {
    mockPool = new Pool()
    service = new LicenseService('postgresql://test:test@localhost:5432/test')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createLicense', () => {
    it('should generate a license key in correct format', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'test-license-id' }] })

      const result = await service.createLicense('test@example.com')

      // Should return license ID and key
      expect(result).toHaveProperty('licenseId')
      expect(result).toHaveProperty('licenseKey')
      expect(result).toHaveProperty('email')
      expect(result.email).toBe('test@example.com')

      // Key should start with QUARRY prefix
      expect(result.licenseKey).toMatch(/^QUARRY-/)
    })

    it('should store license with Stripe payment ID when provided', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'test-license-id' }] })

      await service.createLicense('test@example.com', 'pi_stripe_payment_123')

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO license_keys'),
        expect.arrayContaining(['test@example.com', expect.any(String), 'pi_stripe_payment_123'])
      )
    })

    it('should lowercase email before storing', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'test-license-id' }] })

      const result = await service.createLicense('TEST@EXAMPLE.COM')

      expect(result.email).toBe('test@example.com')
    })
  })

  describe('validateKey', () => {
    it('should return invalid for malformed keys', async () => {
      const result = await service.validateKey('invalid-key')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid key format')
    })

    it('should return invalid for empty key', async () => {
      const result = await service.validateKey('')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid key format')
    })

    it('should return valid for matching unactivated key', async () => {
      const testKey = 'QUARRY-ABCD-EFGH-IJKL-MNOP'

      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'license-123',
          key_hash: `hashed_${testKey}`,
          email: 'test@example.com',
          activated_at: null,
          revoked_at: null,
        }]
      })

      const result = await service.validateKey(testKey)

      expect(result.valid).toBe(true)
      expect(result.licenseId).toBe('license-123')
      expect(result.email).toBe('test@example.com')
    })

    it('should return invalid for already activated key', async () => {
      const testKey = 'QUARRY-ABCD-EFGH-IJKL-MNOP'

      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'license-123',
          key_hash: `hashed_${testKey}`,
          email: 'test@example.com',
          activated_at: new Date(),
          revoked_at: null,
        }]
      })

      const result = await service.validateKey(testKey)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('already been activated')
    })

    it('should return invalid for revoked key', async () => {
      const testKey = 'QUARRY-ABCD-EFGH-IJKL-MNOP'

      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'license-123',
          key_hash: `hashed_${testKey}`,
          email: 'test@example.com',
          activated_at: null,
          revoked_at: new Date(),
        }]
      })

      const result = await service.validateKey(testKey)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('revoked')
    })

    it('should return invalid for non-existent key', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] })

      const result = await service.validateKey('QUARRY-XXXX-YYYY-ZZZZ-0000')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid license key')
    })
  })

  describe('activateLicense', () => {
    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    }

    beforeEach(() => {
      mockPool.connect.mockResolvedValue(mockClient)
    })

    it('should activate valid license and upgrade account', async () => {
      const testKey = 'QUARRY-ABCD-EFGH-IJKL-MNOP'

      // Mock validateKey
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'license-123',
          key_hash: `hashed_${testKey}`,
          email: 'test@example.com',
          activated_at: null,
          revoked_at: null,
        }]
      })

      // Mock transaction queries
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // UPDATE license_keys
        .mockResolvedValueOnce({}) // UPDATE sync_accounts
        .mockResolvedValueOnce({}) // COMMIT

      const result = await service.activateLicense(testKey, 'account-123')

      expect(result.success).toBe(true)
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN')
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT')
    })

    it('should fail for invalid license key', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] })

      const result = await service.activateLicense('QUARRY-XXXX-YYYY-ZZZZ-0000', 'account-123')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should rollback on database error', async () => {
      const testKey = 'QUARRY-ABCD-EFGH-IJKL-MNOP'

      // Mock validateKey
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'license-123',
          key_hash: `hashed_${testKey}`,
          email: 'test@example.com',
          activated_at: null,
          revoked_at: null,
        }]
      })

      // Mock transaction with error
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')) // UPDATE fails

      const result = await service.activateLicense(testKey, 'account-123')

      expect(result.success).toBe(false)
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK')
    })
  })

  describe('revokeLicense', () => {
    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    }

    beforeEach(() => {
      mockPool.connect.mockResolvedValue(mockClient)
    })

    it('should revoke license and downgrade account if no other licenses', async () => {
      // Mock transaction queries
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ account_id: 'account-123' }] }) // SELECT license
        .mockResolvedValueOnce({}) // UPDATE license_keys (revoke)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // COUNT other licenses
        .mockResolvedValueOnce({}) // UPDATE sync_accounts (downgrade)
        .mockResolvedValueOnce({}) // COMMIT

      const result = await service.revokeLicense('license-123')

      expect(result.success).toBe(true)
    })

    it('should not downgrade account if other licenses exist', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ account_id: 'account-123' }] }) // SELECT license
        .mockResolvedValueOnce({}) // UPDATE license_keys (revoke)
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // COUNT other licenses (has more)
        .mockResolvedValueOnce({}) // COMMIT

      const result = await service.revokeLicense('license-123')

      expect(result.success).toBe(true)
      // Should not call downgrade since other licenses exist
      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining("tier = 'free'"),
        expect.anything()
      )
    })

    it('should return error for non-existent license', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT license (not found)

      const result = await service.revokeLicense('non-existent')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })

  describe('getLicense', () => {
    it('should return license details', async () => {
      const mockLicense = {
        id: 'license-123',
        account_id: 'account-456',
        key_hash: 'hashed_key',
        stripe_payment_id: 'pi_123',
        email: 'test@example.com',
        created_at: new Date('2024-01-01'),
        activated_at: new Date('2024-01-02'),
        revoked_at: null,
      }

      mockPool.query.mockResolvedValueOnce({ rows: [mockLicense] })

      const result = await service.getLicense('license-123')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('license-123')
      expect(result?.accountId).toBe('account-456')
      expect(result?.email).toBe('test@example.com')
    })

    it('should return null for non-existent license', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] })

      const result = await service.getLicense('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getAccountLicenses', () => {
    it('should return all licenses for account', async () => {
      const mockLicenses = [
        {
          id: 'license-1',
          account_id: 'account-123',
          key_hash: 'hash1',
          stripe_payment_id: 'pi_1',
          email: 'test@example.com',
          created_at: new Date('2024-01-01'),
          activated_at: new Date('2024-01-02'),
          revoked_at: null,
        },
        {
          id: 'license-2',
          account_id: 'account-123',
          key_hash: 'hash2',
          stripe_payment_id: 'pi_2',
          email: 'test@example.com',
          created_at: new Date('2024-02-01'),
          activated_at: null,
          revoked_at: null,
        },
      ]

      mockPool.query.mockResolvedValueOnce({ rows: mockLicenses })

      const result = await service.getAccountLicenses('account-123')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('license-1')
      expect(result[1].id).toBe('license-2')
    })

    it('should return empty array for account with no licenses', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] })

      const result = await service.getAccountLicenses('account-no-licenses')

      expect(result).toEqual([])
    })
  })

  describe('key format validation', () => {
    it('should accept valid QUARRY-XXXX-XXXX-XXXX-XXXX format', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] })

      // Valid format should not fail on format check
      const result = await service.validateKey('QUARRY-ABCD-1234-EFGH-5678')

      // Will fail because key doesn't exist, but format is valid
      expect(result.error).not.toContain('Invalid key format')
    })

    it('should reject keys with wrong prefix', async () => {
      const result = await service.validateKey('WRONG-ABCD-1234-EFGH-5678')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid key format')
    })

    it('should reject keys with wrong segment count', async () => {
      const result = await service.validateKey('QUARRY-ABCD-1234')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid key format')
    })

    it('should reject keys with wrong segment length', async () => {
      const result = await service.validateKey('QUARRY-AB-1234-EFGH-5678')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid key format')
    })

    it('should normalize key to uppercase', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] })

      // Lowercase should be normalized
      const result = await service.validateKey('quarry-abcd-1234-efgh-5678')

      // Will fail because key doesn't exist, but format is valid
      expect(result.error).not.toContain('Invalid key format')
    })
  })
})
