/**
 * Email/Password Signup API Route
 *
 * POST /api/auth/signup
 * Creates a new account with email and password.
 *
 * Request body:
 * - email: string
 * - password: string
 *
 * Response:
 * - account: Account object
 * - warning?: string (if email login doesn't support certain features)
 * - Sets session cookie
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthService,
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from '@/lib/api/services/authService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate input
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
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

    // Create account
    const authService = getAuthService()
    const result = await authService.createEmailAccount(email, password)

    // Get device info from request
    const deviceInfo = {
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') || undefined,
      platform: 'web',
    }

    // Create session
    const session = await authService.createSession(result.account.id, deviceInfo)

    // Build response
    const response = NextResponse.json({
      account: result.account,
      warning: result.warning,
      isNewAccount: true,
    })

    // Set session cookie
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieOptions = getSessionCookieOptions(isProduction)
    response.cookies.set(SESSION_COOKIE_NAME, session.sessionToken, cookieOptions)

    return response
  } catch (error) {
    console.error('[Auth Signup] Error:', error)

    const message = error instanceof Error ? error.message : 'Failed to create account'

    // Check for specific errors
    if (message.includes('already exists')) {
      return NextResponse.json(
        { error: message },
        { status: 409 }
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
