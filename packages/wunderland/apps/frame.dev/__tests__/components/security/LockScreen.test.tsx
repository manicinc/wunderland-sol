/**
 * LockScreen Component Tests
 * Tests for the password protection lock screen UI
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LockScreen, LockScreenGate } from '@/components/quarry/ui/security/LockScreen'

// Mock useSecurity hook
const mockUnlock = vi.fn()
const mockVerifySecurityAnswer = vi.fn()
const mockUseSecurity = vi.fn()

vi.mock('@/lib/config/securityConfig', () => ({
  useSecurity: () => mockUseSecurity(),
}))

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
    p: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
      <p {...props}>{children}</p>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('LockScreen Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSecurity.mockReturnValue({
      unlock: mockUnlock,
      session: { failedAttempts: 0, lockedOutUntil: null },
      config: { passwordHint: null, securityQuestion: null },
      verifySecurityAnswer: mockVerifySecurityAnswer,
      requiresUnlock: true,
    })
  })

  describe('Rendering', () => {
    it('should render lock screen with title', () => {
      render(<LockScreen />)

      expect(screen.getByText('Quarry Locked')).toBeInTheDocument()
      expect(screen.getByText('Enter your password to continue')).toBeInTheDocument()
    })

    it('should render password input', () => {
      render(<LockScreen />)

      const input = screen.getByPlaceholderText('Enter password')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'password')
    })

    it('should render unlock button', () => {
      render(<LockScreen />)

      const button = screen.getByRole('button', { name: /unlock/i })
      expect(button).toBeInTheDocument()
    })

    it('should render security footer', () => {
      render(<LockScreen />)

      expect(screen.getByText('Protected by local password encryption')).toBeInTheDocument()
    })
  })

  describe('Password Input', () => {
    it('should allow typing password', async () => {
      const user = userEvent.setup()
      render(<LockScreen />)

      const input = screen.getByPlaceholderText('Enter password')
      await user.type(input, 'testpassword')

      expect(input).toHaveValue('testpassword')
    })

    it('should toggle password visibility', async () => {
      const user = userEvent.setup()
      render(<LockScreen />)

      const input = screen.getByPlaceholderText('Enter password')
      const toggleButton = screen.getAllByRole('button')[0] // First button is toggle

      // Initially password is hidden
      expect(input).toHaveAttribute('type', 'password')

      // Click to show password
      await user.click(toggleButton)
      expect(input).toHaveAttribute('type', 'text')

      // Click to hide password
      await user.click(toggleButton)
      expect(input).toHaveAttribute('type', 'password')
    })
  })

  describe('Unlock Flow', () => {
    it('should disable unlock button when password is empty', () => {
      render(<LockScreen />)

      const button = screen.getByRole('button', { name: /unlock/i })
      expect(button).toBeDisabled()
    })

    it('should enable unlock button when password is entered', async () => {
      const user = userEvent.setup()
      render(<LockScreen />)

      const input = screen.getByPlaceholderText('Enter password')
      await user.type(input, 'password')

      const button = screen.getByRole('button', { name: /unlock/i })
      expect(button).not.toBeDisabled()
    })

    it('should call unlock with password on form submit', async () => {
      const user = userEvent.setup()
      mockUnlock.mockResolvedValue(true)
      render(<LockScreen />)

      const input = screen.getByPlaceholderText('Enter password')
      await user.type(input, 'correctpassword')

      const button = screen.getByRole('button', { name: /unlock/i })
      await user.click(button)

      expect(mockUnlock).toHaveBeenCalledWith('correctpassword')
    })

    it('should show error on failed unlock', async () => {
      const user = userEvent.setup()
      mockUnlock.mockResolvedValue(false)
      render(<LockScreen />)

      const input = screen.getByPlaceholderText('Enter password')
      await user.type(input, 'wrongpassword')

      const button = screen.getByRole('button', { name: /unlock/i })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Incorrect password')).toBeInTheDocument()
      })
    })

    it('should clear password on failed unlock', async () => {
      const user = userEvent.setup()
      mockUnlock.mockResolvedValue(false)
      render(<LockScreen />)

      const input = screen.getByPlaceholderText('Enter password')
      await user.type(input, 'wrongpassword')

      const button = screen.getByRole('button', { name: /unlock/i })
      await user.click(button)

      await waitFor(() => {
        expect(input).toHaveValue('')
      })
    })
  })

  describe('Failed Attempts', () => {
    it('should show remaining attempts warning', () => {
      mockUseSecurity.mockReturnValue({
        unlock: mockUnlock,
        session: { failedAttempts: 3, lockedOutUntil: null },
        config: { passwordHint: null, securityQuestion: null },
        verifySecurityAnswer: mockVerifySecurityAnswer,
        requiresUnlock: true,
      })

      render(<LockScreen />)

      expect(screen.getByText('2 attempts remaining')).toBeInTheDocument()
    })

    it('should show lockout message after 5 failed attempts', () => {
      const futureTime = new Date(Date.now() + 5 * 60 * 1000).toISOString()
      mockUseSecurity.mockReturnValue({
        unlock: mockUnlock,
        session: { failedAttempts: 5, lockedOutUntil: futureTime },
        config: { passwordHint: null, securityQuestion: null },
        verifySecurityAnswer: mockVerifySecurityAnswer,
        requiresUnlock: true,
      })

      render(<LockScreen />)

      expect(screen.getByText('Too many failed attempts')).toBeInTheDocument()
    })

    it('should disable input during lockout', () => {
      const futureTime = new Date(Date.now() + 5 * 60 * 1000).toISOString()
      mockUseSecurity.mockReturnValue({
        unlock: mockUnlock,
        session: { failedAttempts: 5, lockedOutUntil: futureTime },
        config: { passwordHint: null, securityQuestion: null },
        verifySecurityAnswer: mockVerifySecurityAnswer,
        requiresUnlock: true,
      })

      render(<LockScreen />)

      const input = screen.getByPlaceholderText('Enter password')
      expect(input).toBeDisabled()
    })
  })

  describe('Password Hint', () => {
    it('should show forgot password link when hint is available', () => {
      mockUseSecurity.mockReturnValue({
        unlock: mockUnlock,
        session: { failedAttempts: 0, lockedOutUntil: null },
        config: { passwordHint: 'my pet name', securityQuestion: null },
        verifySecurityAnswer: mockVerifySecurityAnswer,
        requiresUnlock: true,
      })

      render(<LockScreen />)

      expect(screen.getByText('Forgot password?')).toBeInTheDocument()
    })

    it('should not show forgot password link when no hint or question', () => {
      mockUseSecurity.mockReturnValue({
        unlock: mockUnlock,
        session: { failedAttempts: 0, lockedOutUntil: null },
        config: { passwordHint: null, securityQuestion: null },
        verifySecurityAnswer: mockVerifySecurityAnswer,
        requiresUnlock: true,
      })

      render(<LockScreen />)

      expect(screen.queryByText('Forgot password?')).not.toBeInTheDocument()
    })

    it('should show hint modal when forgot password is clicked', async () => {
      const user = userEvent.setup()
      mockUseSecurity.mockReturnValue({
        unlock: mockUnlock,
        session: { failedAttempts: 0, lockedOutUntil: null },
        config: { passwordHint: 'my pet name', securityQuestion: null },
        verifySecurityAnswer: mockVerifySecurityAnswer,
        requiresUnlock: true,
      })

      render(<LockScreen />)

      const forgotButton = screen.getByText('Forgot password?')
      await user.click(forgotButton)

      expect(screen.getByText('Password Recovery')).toBeInTheDocument()
    })

    it('should display hint directly when no security question', async () => {
      const user = userEvent.setup()
      mockUseSecurity.mockReturnValue({
        unlock: mockUnlock,
        session: { failedAttempts: 0, lockedOutUntil: null },
        config: { passwordHint: 'my pet name', securityQuestion: null },
        verifySecurityAnswer: mockVerifySecurityAnswer,
        requiresUnlock: true,
      })

      render(<LockScreen />)

      const forgotButton = screen.getByText('Forgot password?')
      await user.click(forgotButton)

      expect(screen.getByText('my pet name')).toBeInTheDocument()
    })

    it('should require security answer when question is set', async () => {
      const user = userEvent.setup()
      mockUseSecurity.mockReturnValue({
        unlock: mockUnlock,
        session: { failedAttempts: 0, lockedOutUntil: null },
        config: { passwordHint: 'my pet name', securityQuestion: 'What is your pet name?' },
        verifySecurityAnswer: mockVerifySecurityAnswer,
        requiresUnlock: true,
      })

      render(<LockScreen />)

      const forgotButton = screen.getByText('Forgot password?')
      await user.click(forgotButton)

      expect(screen.getByText('What is your pet name?')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your answer')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Reveal Hint' })).toBeInTheDocument()
    })
  })
})

describe('LockScreenGate Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render children when unlock is not required', () => {
    mockUseSecurity.mockReturnValue({
      requiresUnlock: false,
    })

    render(
      <LockScreenGate>
        <div data-testid="protected-content">Protected Content</div>
      </LockScreenGate>
    )

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    expect(screen.queryByText('Quarry Locked')).not.toBeInTheDocument()
  })

  it('should render lock screen when unlock is required', () => {
    mockUseSecurity.mockReturnValue({
      requiresUnlock: true,
      unlock: mockUnlock,
      session: { failedAttempts: 0, lockedOutUntil: null },
      config: { passwordHint: null, securityQuestion: null },
      verifySecurityAnswer: mockVerifySecurityAnswer,
    })

    render(
      <LockScreenGate>
        <div data-testid="protected-content">Protected Content</div>
      </LockScreenGate>
    )

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    expect(screen.getByText('Quarry Locked')).toBeInTheDocument()
  })
})
