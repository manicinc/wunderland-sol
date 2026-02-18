/**
 * Password Reset API Route
 *
 * POST /api/auth/password/reset
 * Initiates password reset (sends email).
 *
 * Request body:
 * - email: string
 *
 * POST /api/auth/password/reset/confirm
 * Confirms password reset with token.
 *
 * Request body:
 * - token: string
 * - newPassword: string
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthService } from '@/lib/api/services/authService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, token, newPassword } = body

    const authService = getAuthService()

    // If token is provided, this is a password reset confirmation
    if (token) {
      if (!newPassword || typeof newPassword !== 'string') {
        return NextResponse.json(
          { error: 'New password is required' },
          { status: 400 }
        )
      }

      await authService.resetPassword(token, newPassword)

      return NextResponse.json({
        success: true,
        message: 'Password has been reset. Please sign in with your new password.',
      })
    }

    // Otherwise, initiate password reset
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    await authService.initiatePasswordReset(email)

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    })
  } catch (error) {
    console.error('[Auth Password Reset] Error:', error)

    const message = error instanceof Error ? error.message : 'Password reset failed'

    if (message.includes('Invalid or expired')) {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      )
    }

    if (message.includes('Password must be')) {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
