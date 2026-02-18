/**
 * Session API Route
 *
 * GET /api/auth/session
 * Returns the current user's session and account info.
 *
 * Response:
 * - account: Account object or null
 * - authenticated: boolean
 * - googleConnected: boolean
 * - calendarEnabled: boolean
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthService,
  SESSION_COOKIE_NAME,
} from '@/lib/api/services/authService'

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value

    if (!sessionToken) {
      return NextResponse.json({
        account: null,
        authenticated: false,
        googleConnected: false,
        calendarEnabled: false,
      })
    }

    // Validate session
    const authService = getAuthService()
    const account = await authService.validateSession(sessionToken)

    if (!account) {
      // Invalid or expired session - clear cookie
      const response = NextResponse.json({
        account: null,
        authenticated: false,
        googleConnected: false,
        calendarEnabled: false,
      })

      response.cookies.set(SESSION_COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      })

      return response
    }

    // Check if calendar scopes are granted
    const calendarEnabled = account.googleScopes.some(
      (s) => s.includes('calendar.readonly') || s.includes('calendar.events')
    )

    return NextResponse.json({
      account,
      authenticated: true,
      googleConnected: account.googleConnected,
      calendarEnabled,
    })
  } catch (error) {
    console.error('[Auth Session] Error:', error)

    return NextResponse.json({
      account: null,
      authenticated: false,
      googleConnected: false,
      calendarEnabled: false,
      error: 'Failed to validate session',
    })
  }
}
