/**
 * Google Calendar Token Exchange API Route
 *
 * Server-side endpoint for exchanging OAuth authorization codes for tokens.
 * This keeps the client secret secure on the server side.
 *
 * Used by hosted deployments (frame.dev, quarry.space) where users don't
 * need to configure their own OAuth credentials.
 *
 * @module app/api/auth/google-calendar/token/route
 */

import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

interface TokenRequest {
  code: string
  redirectUri: string
  grantType: 'authorization_code' | 'refresh_token'
  refreshToken?: string
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}

interface ErrorResponse {
  error: string
  error_description?: string
}

/**
 * Check if pre-configured OAuth is available
 */
function hasPreConfiguredOAuth(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  )
}

/**
 * Exchange authorization code for tokens (POST)
 */
export async function POST(request: NextRequest) {
  // Check if pre-configured OAuth is available
  if (!hasPreConfiguredOAuth()) {
    return NextResponse.json(
      {
        error: 'oauth_not_configured',
        error_description:
          'Pre-configured OAuth is not available. Please use BYOK mode with your own credentials.',
        mode: 'byok',
      },
      { status: 400 }
    )
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!

  try {
    const body: TokenRequest = await request.json()
    const { code, redirectUri, grantType, refreshToken } = body

    // Build token request
    const params = new URLSearchParams()
    params.append('client_id', clientId)
    params.append('client_secret', clientSecret)

    if (grantType === 'authorization_code') {
      if (!code) {
        return NextResponse.json(
          { error: 'missing_code', error_description: 'Authorization code is required' },
          { status: 400 }
        )
      }
      params.append('code', code)
      params.append('redirect_uri', redirectUri || `${getBaseUrl(request)}/api/auth/google-calendar/callback`)
      params.append('grant_type', 'authorization_code')
    } else if (grantType === 'refresh_token') {
      if (!refreshToken) {
        return NextResponse.json(
          { error: 'missing_refresh_token', error_description: 'Refresh token is required' },
          { status: 400 }
        )
      }
      params.append('refresh_token', refreshToken)
      params.append('grant_type', 'refresh_token')
    } else {
      return NextResponse.json(
        { error: 'invalid_grant_type', error_description: 'Grant type must be authorization_code or refresh_token' },
        { status: 400 }
      )
    }

    // Exchange with Google
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      const errorData = tokenData as ErrorResponse
      return NextResponse.json(
        {
          error: errorData.error || 'token_exchange_failed',
          error_description: errorData.error_description || 'Failed to exchange tokens with Google',
        },
        { status: tokenResponse.status }
      )
    }

    const tokens = tokenData as TokenResponse

    return NextResponse.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      token_type: tokens.token_type,
      scope: tokens.scope,
    })
  } catch (error) {
    console.error('[GoogleCalendarToken] Token exchange error:', error)
    return NextResponse.json(
      {
        error: 'internal_error',
        error_description: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

/**
 * Check OAuth mode (GET)
 * Returns whether pre-configured OAuth is available
 */
export async function GET() {
  const hasPreConfigured = hasPreConfiguredOAuth()

  return NextResponse.json({
    mode: hasPreConfigured ? 'preconfigured' : 'byok',
    clientId: hasPreConfigured ? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID : null,
    message: hasPreConfigured
      ? 'Pre-configured OAuth available. Use POST to exchange tokens.'
      : 'BYOK mode. Users must provide their own OAuth credentials.',
  })
}

/**
 * Get base URL from request
 */
function getBaseUrl(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('host') || 'frame.dev'
  return `${proto}://${host}`
}



