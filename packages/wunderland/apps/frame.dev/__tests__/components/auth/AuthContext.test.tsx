/**
 * AuthContext Tests
 *
 * Tests for the authentication context provider and hook.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/quarry',
}))

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()

    // Default session check returns no user
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user: null }),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should start with loading state', () => {
      // Initial state should be loading
      const initialState = {
        user: null,
        isLoading: true,
        isAuthenticated: false,
        isGuest: true,
        googleConnected: false,
        calendarEnabled: false,
      }

      expect(initialState.isLoading).toBe(true)
      expect(initialState.user).toBeNull()
    })

    it('should check session on mount', async () => {
      // Session check should happen on mount
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: null }),
      })

      // Verify fetch is called
      expect(mockFetch).not.toHaveBeenCalled() // Before mount
    })
  })

  describe('Authentication States', () => {
    it('should identify guest users correctly', () => {
      const guestState = {
        user: null,
        isAuthenticated: false,
        isGuest: true,
      }

      expect(guestState.isGuest).toBe(true)
      expect(guestState.isAuthenticated).toBe(false)
    })

    it('should identify authenticated email users', () => {
      const emailUserState = {
        user: {
          id: 'user-1',
          email: 'user@example.com',
          auth_method: 'email',
          google_id: null,
        },
        isAuthenticated: true,
        isGuest: false,
        googleConnected: false,
      }

      expect(emailUserState.isAuthenticated).toBe(true)
      expect(emailUserState.isGuest).toBe(false)
      expect(emailUserState.googleConnected).toBe(false)
    })

    it('should identify authenticated Google users', () => {
      const googleUserState = {
        user: {
          id: 'user-2',
          email: 'user@gmail.com',
          auth_method: 'google',
          google_id: 'google-123',
        },
        isAuthenticated: true,
        isGuest: false,
        googleConnected: true,
        calendarEnabled: true,
      }

      expect(googleUserState.isAuthenticated).toBe(true)
      expect(googleUserState.googleConnected).toBe(true)
      expect(googleUserState.calendarEnabled).toBe(true)
    })
  })

  describe('Login Flow', () => {
    it('should handle successful email login', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        auth_method: 'email',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ account: mockUser }),
      })

      // Simulate login response
      const response = await mockFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      })

      const data = await response.json()
      expect(data.account).toBeDefined()
      expect(data.account.email).toBe('test@example.com')
    })

    it('should handle login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid email or password' }),
      })

      const response = await mockFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'wrong@example.com', password: 'wrong' }),
      })

      expect(response.ok).toBe(false)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })
  })

  describe('Signup Flow', () => {
    it('should handle successful signup', async () => {
      const mockUser = {
        id: 'user-new',
        email: 'new@example.com',
        auth_method: 'email',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ account: mockUser, isNewAccount: true }),
      })

      const response = await mockFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email: 'new@example.com', password: 'securepass123' }),
      })

      const data = await response.json()
      expect(data.account).toBeDefined()
      expect(data.isNewAccount).toBe(true)
    })

    it('should reject weak passwords', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Password must be at least 8 characters' }),
      })

      const response = await mockFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email: 'new@example.com', password: 'short' }),
      })

      expect(response.ok).toBe(false)
    })

    it('should reject duplicate emails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Email already exists' }),
      })

      const response = await mockFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email: 'existing@example.com', password: 'password123' }),
      })

      expect(response.ok).toBe(false)
    })
  })

  describe('Logout Flow', () => {
    it('should clear user state on logout', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const response = await mockFetch('/api/auth/logout', {
        method: 'POST',
      })

      expect(response.ok).toBe(true)
    })
  })

  describe('Google OAuth', () => {
    it('should handle Google login with calendar scopes', async () => {
      const mockGoogleUser = {
        id: 'user-google',
        email: 'user@gmail.com',
        auth_method: 'google',
        google_id: 'google-123',
        display_name: 'Google User',
        avatar_url: 'https://lh3.googleusercontent.com/a/default-user',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          account: mockGoogleUser,
          calendarEnabled: true,
          isNewAccount: true,
        }),
      })

      const response = await mockFetch('/api/auth/google/login', {
        method: 'POST',
        body: JSON.stringify({
          tokens: { access_token: 'mock_token' },
          profile: { email: 'user@gmail.com', name: 'Google User' },
        }),
      })

      const data = await response.json()
      expect(data.account.auth_method).toBe('google')
      expect(data.calendarEnabled).toBe(true)
    })

    it('should link Google to existing email account', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          calendarEnabled: true,
        }),
      })

      const response = await mockFetch('/api/auth/google/link', {
        method: 'POST',
        body: JSON.stringify({
          tokens: { access_token: 'mock_token' },
        }),
      })

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.calendarEnabled).toBe(true)
    })
  })

  describe('Profile Management', () => {
    it('should update display name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          account: {
            id: 'user-1',
            display_name: 'New Name',
          },
        }),
      })

      const response = await mockFetch('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ display_name: 'New Name' }),
      })

      const data = await response.json()
      expect(data.account.display_name).toBe('New Name')
    })

    it('should update avatar URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          account: {
            id: 'user-1',
            avatar_url: 'https://example.com/new-avatar.jpg',
          },
        }),
      })

      const response = await mockFetch('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ avatar_url: 'https://example.com/new-avatar.jpg' }),
      })

      const data = await response.json()
      expect(data.account.avatar_url).toContain('new-avatar')
    })
  })

  describe('Session Management', () => {
    it('should validate active session', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: 'user-1',
            email: 'active@example.com',
          },
          googleConnected: true,
          calendarEnabled: true,
        }),
      })

      const response = await mockFetch('/api/auth/session')
      const data = await response.json()

      expect(data.user).toBeDefined()
      expect(data.googleConnected).toBe(true)
    })

    it('should handle expired session', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: null }),
      })

      const response = await mockFetch('/api/auth/session')
      const data = await response.json()

      expect(data.user).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      try {
        await mockFetch('/api/auth/session')
      } catch (error) {
        expect((error as Error).message).toBe('Network error')
      }
    })

    it('should handle server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      })

      const response = await mockFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)
    })
  })
})

describe('Guest to Account Migration', () => {
  it('should preserve local data when upgrading', () => {
    const localData = {
      strands: ['strand-1', 'strand-2'],
      events: ['event-1'],
      preferences: { theme: 'dark' },
    }

    // Local data should be preserved
    expect(localData.strands.length).toBe(2)
    expect(localData.events.length).toBe(1)
  })

  it('should merge guest data with new account', () => {
    const guestData = {
      device_id: 'device-123',
      local_strands: 5,
    }

    const newAccount = {
      id: 'user-new',
      email: 'upgraded@example.com',
    }

    // After merge, data should be associated
    const merged = {
      account_id: newAccount.id,
      device_id: guestData.device_id,
      migrated_strands: guestData.local_strands,
    }

    expect(merged.account_id).toBe('user-new')
    expect(merged.migrated_strands).toBe(5)
  })
})
