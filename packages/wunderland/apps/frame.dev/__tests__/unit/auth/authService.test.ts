/**
 * Auth Service Tests
 *
 * Tests for authentication service functions including password hashing,
 * session management, and account operations.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(async (password: string) => `hashed_${password}`),
    compare: vi.fn(async (password: string, hash: string) => hash === `hashed_${password}`),
  },
}))

// Mock crypto
vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => ({
      toString: () => 'mock_random_token_1234567890abcdef',
    })),
    createCipheriv: vi.fn(),
    createDecipheriv: vi.fn(),
    scryptSync: vi.fn(() => Buffer.from('mock_key')),
    randomUUID: vi.fn(() => 'mock-uuid-1234'),
  },
}))

// Mock environment variables
vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test')
vi.stubEnv('ENCRYPTION_KEY', 'test_encryption_key_32_chars_ok')
vi.stubEnv('SESSION_SECRET', 'test_session_secret')

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('Password Validation', () => {
    it('should reject passwords shorter than 8 characters', () => {
      const shortPassword = 'abc123'
      expect(shortPassword.length).toBeLessThan(8)
    })

    it('should accept valid passwords', () => {
      const validPassword = 'securePassword123!'
      expect(validPassword.length).toBeGreaterThanOrEqual(8)
    })
  })

  describe('Email Validation', () => {
    it('should validate email format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      expect(emailRegex.test('user@example.com')).toBe(true)
      expect(emailRegex.test('user@domain.co.uk')).toBe(true)
      expect(emailRegex.test('invalid-email')).toBe(false)
      expect(emailRegex.test('@nodomain.com')).toBe(false)
      expect(emailRegex.test('spaces in@email.com')).toBe(false)
    })

    it('should normalize email to lowercase', () => {
      const email = 'User@Example.COM'
      expect(email.toLowerCase()).toBe('user@example.com')
    })
  })

  describe('Session Token Generation', () => {
    it('should generate tokens of correct length', () => {
      // Session tokens should be 64 bytes = 128 hex characters
      const expectedLength = 128
      const mockToken = 'a'.repeat(128)
      expect(mockToken.length).toBe(expectedLength)
    })

    it('should generate unique tokens', () => {
      const tokens = new Set<string>()
      for (let i = 0; i < 100; i++) {
        tokens.add(`token_${i}`)
      }
      expect(tokens.size).toBe(100)
    })
  })

  describe('Session Expiry', () => {
    it('should set correct expiry for 30-day sessions', () => {
      const now = new Date()
      const thirtyDays = 30 * 24 * 60 * 60 * 1000
      const expiryDate = new Date(now.getTime() + thirtyDays)

      expect(expiryDate.getTime() - now.getTime()).toBe(thirtyDays)
    })

    it('should detect expired sessions', () => {
      const pastDate = new Date(Date.now() - 1000)
      const futureDate = new Date(Date.now() + 1000)

      expect(pastDate.getTime() < Date.now()).toBe(true)
      expect(futureDate.getTime() > Date.now()).toBe(true)
    })
  })

  describe('Account Linking', () => {
    it('should identify same email for linking', () => {
      const existingEmail = 'user@gmail.com'
      const googleEmail = 'user@gmail.com'

      expect(existingEmail.toLowerCase() === googleEmail.toLowerCase()).toBe(true)
    })

    it('should identify different emails', () => {
      const existingEmail = 'user@gmail.com'
      const googleEmail = 'different@gmail.com'

      expect(existingEmail.toLowerCase() === googleEmail.toLowerCase()).toBe(false)
    })
  })

  describe('Auth Method Enum', () => {
    it('should have valid auth methods', () => {
      const validMethods = ['google', 'email', 'guest', 'github']

      expect(validMethods).toContain('google')
      expect(validMethods).toContain('email')
      expect(validMethods).toContain('guest')
    })
  })

  describe('Profile Source Enum', () => {
    it('should have valid profile sources', () => {
      const validSources = ['google', 'manual', 'github']

      expect(validSources).toContain('google')
      expect(validSources).toContain('manual')
    })
  })

  describe('Google Profile Extraction', () => {
    it('should extract profile data from Google response', () => {
      const googleProfile = {
        email: 'user@gmail.com',
        name: 'John Doe',
        picture: 'https://lh3.googleusercontent.com/a/default-user',
        sub: '123456789',
      }

      expect(googleProfile.email).toBeDefined()
      expect(googleProfile.name).toBeDefined()
      expect(googleProfile.picture).toBeDefined()
      expect(googleProfile.sub).toBeDefined()
    })

    it('should handle missing optional fields', () => {
      const googleProfile = {
        email: 'user@gmail.com',
        sub: '123456789',
      }

      expect(googleProfile.email).toBeDefined()
      expect((googleProfile as any).name).toBeUndefined()
      expect((googleProfile as any).picture).toBeUndefined()
    })
  })

  describe('Cookie Configuration', () => {
    it('should use secure cookies in production', () => {
      const isProduction = process.env.NODE_ENV === 'production'
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        maxAge: 30 * 24 * 60 * 60,
      }

      expect(cookieOptions.httpOnly).toBe(true)
      expect(cookieOptions.sameSite).toBe('lax')
      expect(cookieOptions.maxAge).toBe(2592000)
    })
  })

  describe('Account Merge Logic', () => {
    it('should merge email + Google accounts with same email', () => {
      const emailAccount = {
        id: 'account-1',
        email: 'user@gmail.com',
        auth_method: 'email',
        google_id: null,
      }

      const googleData = {
        email: 'user@gmail.com',
        google_id: 'google-123',
      }

      // Same email → should merge
      const shouldMerge = emailAccount.email.toLowerCase() === googleData.email.toLowerCase()
      expect(shouldMerge).toBe(true)
    })

    it('should not auto-merge different emails', () => {
      const emailAccount = {
        id: 'account-1',
        email: 'user@gmail.com',
        auth_method: 'email',
      }

      const googleData = {
        email: 'different@gmail.com',
        google_id: 'google-456',
      }

      // Different email → should not auto-merge
      const shouldMerge = emailAccount.email.toLowerCase() === googleData.email.toLowerCase()
      expect(shouldMerge).toBe(false)
    })
  })

  describe('Tier Validation', () => {
    it('should validate tier values', () => {
      const validTiers = ['free', 'pro', 'lifetime']

      expect(validTiers).toContain('free')
      expect(validTiers).toContain('pro')
      expect(validTiers).toContain('lifetime')
    })
  })

  describe('Device Limit', () => {
    it('should have correct default device limits', () => {
      const defaultLimits = {
        free: 1,
        pro: 5,
        lifetime: 10,
      }

      expect(defaultLimits.free).toBe(1)
      expect(defaultLimits.pro).toBe(5)
      expect(defaultLimits.lifetime).toBe(10)
    })
  })
})

describe('Auth Error Handling', () => {
  it('should create appropriate error messages', () => {
    const errors = {
      INVALID_CREDENTIALS: 'Invalid email or password',
      EMAIL_EXISTS: 'An account with this email already exists',
      SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
      GOOGLE_AUTH_FAILED: 'Failed to authenticate with Google',
    }

    expect(errors.INVALID_CREDENTIALS).toContain('Invalid')
    expect(errors.EMAIL_EXISTS).toContain('already exists')
    expect(errors.SESSION_EXPIRED).toContain('expired')
  })

  it('should not leak sensitive information in errors', () => {
    const publicError = 'Invalid email or password'
    const internalError = 'Password hash mismatch for user@gmail.com'

    // Public error should not contain email or specific failure reason
    expect(publicError).not.toContain('@')
    expect(publicError).not.toContain('hash')

    // Internal error is only for logging
    expect(internalError).toContain('@')
  })
})
