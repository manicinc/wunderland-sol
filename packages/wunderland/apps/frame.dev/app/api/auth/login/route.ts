/**
 * Email/Password Login API Route
 *
 * POST /api/auth/login
 * Authenticates user with email and password.
 *
 * Request body:
 * - email: string
 * - password: string
 *
 * Response:
 * - account: Account object
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

    // Get device info from request
    const deviceInfo = {
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') || undefined,
      platform: 'web',
    }

    // Login
    const authService = getAuthService()
    const result = await authService.loginWithEmail(email, password, deviceInfo)

    // Build response
    const response = NextResponse.json({
      account: result.account,
      isNewAccount: false,
    })

    // Set session cookie
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieOptions = getSessionCookieOptions(isProduction)
    response.cookies.set(SESSION_COOKIE_NAME, result.session.sessionToken, cookieOptions)

    return response
  } catch (error) {
    console.error('[Auth Login] Error:', error)

    const message = error instanceof Error ? error.message : 'Login failed'

    // Check for specific errors
    if (message.includes('Invalid email or password')) {
      return NextResponse.json(
        { error: message },
        { status: 401 }
      )
    }

    if (message.includes('uses Google sign-in')) {
      return NextResponse.json(
        { error: message, useGoogle: true },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
