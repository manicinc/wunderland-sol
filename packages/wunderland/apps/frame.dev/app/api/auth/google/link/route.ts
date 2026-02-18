/**
 * Google OAuth Link API Route
 *
 * POST /api/auth/google/link
 * Links Google account to existing authenticated user.
 *
 * Requires: Active session
 *
 * Request body:
 * - profile: { id, email, name?, picture? }
 * - scopes: string[]
 * - refreshToken?: string
 *
 * Response:
 * - success: boolean
 * - calendarEnabled: boolean
 * - account: Updated account object
 *
 * DELETE /api/auth/google/link
 * Disconnects Google from account (requires password set).
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthService,
  SESSION_COOKIE_NAME,
  type GoogleProfile,
} from '@/lib/api/services/authService'

export async function POST(request: NextRequest) {
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

    // Build Google profile
    const googleProfile: GoogleProfile = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    }

    // Link Google to account
    const result = await authService.linkGoogleToAccount(
      account.id,
      googleProfile,
      scopes,
      refreshToken
    )

    // Get updated account
    const updatedAccount = await authService.findAccountById(account.id)

    return NextResponse.json({
      success: true,
      calendarEnabled: result.calendarEnabled,
      account: updatedAccount,
    })
  } catch (error) {
    console.error('[Auth Google Link] Error:', error)

    const message = error instanceof Error ? error.message : 'Failed to link Google account'

    if (message.includes('already linked')) {
      return NextResponse.json(
        { error: message },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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

    // Disconnect Google
    await authService.disconnectGoogle(account.id)

    // Get updated account
    const updatedAccount = await authService.findAccountById(account.id)

    return NextResponse.json({
      success: true,
      account: updatedAccount,
    })
  } catch (error) {
    console.error('[Auth Google Unlink] Error:', error)

    const message = error instanceof Error ? error.message : 'Failed to disconnect Google'

    if (message.includes('Cannot disconnect')) {
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
