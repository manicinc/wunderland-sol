/**
 * Logout API Route
 *
 * POST /api/auth/logout
 * Logs out the current user by revoking their session.
 *
 * Response:
 * - success: boolean
 * - Clears session cookie
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthService,
  SESSION_COOKIE_NAME,
} from '@/lib/api/services/authService'

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value

    if (sessionToken) {
      // Revoke session in database
      const authService = getAuthService()
      await authService.revokeSession(sessionToken)
    }

    // Build response and clear cookie
    const response = NextResponse.json({ success: true })

    // Clear the session cookie
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0, // Expire immediately
    })

    return response
  } catch (error) {
    console.error('[Auth Logout] Error:', error)

    // Still clear the cookie even if DB operation fails
    const response = NextResponse.json({ success: true })
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })

    return response
  }
}
