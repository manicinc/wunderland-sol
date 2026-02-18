/**
 * Google OAuth Login API Route
 *
 * POST /api/auth/google/login
 * Authenticates or creates account using Google OAuth tokens and profile.
 *
 * Request body:
 * - profile: { id, email, name?, picture? }
 * - scopes: string[]
 * - refreshToken?: string
 *
 * Response:
 * - account: Account object
 * - isNewAccount: boolean
 * - calendarEnabled: boolean
 * - Sets session cookie
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthService,
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
  type GoogleProfile,
} from '@/lib/api/services/authService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { profile, scopes, refreshToken } = body

    // Validate input
    if (!profile || !profile.id || !profile.email) {
      return NextResponse.json(
        { error: 'Google profile with id and email is required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(scopes)) {
      return NextResponse.json(
        { error: 'Scopes array is required' },
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

    // Build Google profile
    const googleProfile: GoogleProfile = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    }

    // Login with Google
    const authService = getAuthService()
    const result = await authService.loginWithGoogle(
      googleProfile,
      scopes,
      refreshToken,
      deviceInfo
    )

    // Check if calendar is enabled
    const calendarEnabled = scopes.some(
      (s: string) => s.includes('calendar.readonly') || s.includes('calendar.events')
    )

    // Build response
    const response = NextResponse.json({
      account: result.account,
      isNewAccount: result.isNewAccount,
      calendarEnabled,
    })

    // Set session cookie
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieOptions = getSessionCookieOptions(isProduction)
    response.cookies.set(SESSION_COOKIE_NAME, result.session.sessionToken, cookieOptions)

    return response
  } catch (error) {
    console.error('[Auth Google Login] Error:', error)

    const message = error instanceof Error ? error.message : 'Google login failed'

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
