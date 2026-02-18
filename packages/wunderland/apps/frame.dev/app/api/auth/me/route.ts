/**
 * Current User Profile API Route
 *
 * GET /api/auth/me
 * Returns the current authenticated user's profile.
 *
 * PATCH /api/auth/me
 * Updates the current user's profile.
 *
 * Request body (PATCH):
 * - displayName?: string
 * - avatarUrl?: string
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
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate session
    const authService = getAuthService()
    const account = await authService.validateSession(sessionToken)

    if (!account) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      )
    }

    // Check if calendar scopes are granted
    const calendarEnabled = account.googleScopes.some(
      (s) => s.includes('calendar.readonly') || s.includes('calendar.events')
    )

    return NextResponse.json({
      account,
      googleConnected: account.googleConnected,
      calendarEnabled,
    })
  } catch (error) {
    console.error('[Auth Me GET] Error:', error)

    return NextResponse.json(
      { error: 'Failed to get profile' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate session
    const authService = getAuthService()
    const account = await authService.validateSession(sessionToken)

    if (!account) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { displayName, avatarUrl } = body

    // Build updates object
    const updates: { displayName?: string; avatarUrl?: string } = {}

    if (displayName !== undefined) {
      if (typeof displayName !== 'string') {
        return NextResponse.json(
          { error: 'displayName must be a string' },
          { status: 400 }
        )
      }
      if (displayName.length > 100) {
        return NextResponse.json(
          { error: 'displayName must be 100 characters or less' },
          { status: 400 }
        )
      }
      updates.displayName = displayName.trim() || null
    }

    if (avatarUrl !== undefined) {
      if (avatarUrl !== null && typeof avatarUrl !== 'string') {
        return NextResponse.json(
          { error: 'avatarUrl must be a string or null' },
          { status: 400 }
        )
      }
      if (avatarUrl && avatarUrl.length > 2048) {
        return NextResponse.json(
          { error: 'avatarUrl must be 2048 characters or less' },
          { status: 400 }
        )
      }
      updates.avatarUrl = avatarUrl
    }

    // Update profile
    const updatedAccount = await authService.updateProfile(account.id, updates)

    return NextResponse.json({
      account: updatedAccount,
    })
  } catch (error) {
    console.error('[Auth Me PATCH] Error:', error)

    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
