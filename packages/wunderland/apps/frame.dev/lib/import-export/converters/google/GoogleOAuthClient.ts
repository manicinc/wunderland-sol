/**
 * Google OAuth 2.0 Client
 * @module lib/import-export/converters/google/GoogleOAuthClient
 *
 * Handles Google OAuth 2.0 authentication flow.
 * Supports hybrid approach:
 * - Shared client ID (default, provided by app)
 * - Custom client ID (user-provided)
 *
 * Tokens are encrypted and stored in localStorage.
 */

import { encryptData, decryptData } from '@/lib/config/apiKeyStorage'

// ============================================================================
// TYPES
// ============================================================================

export interface GoogleOAuthConfig {
  /** Client ID (shared or custom) */
  clientId?: string
  /** Client secret (for server-side flows) */
  clientSecret?: string
  /** Redirect URI */
  redirectUri?: string
  /** Scopes to request */
  scopes?: string[]
}

export interface GoogleTokens {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  scope: string
}

// ============================================================================
// GOOGLE OAUTH CLIENT
// ============================================================================

export class GoogleOAuthClient {
  private clientId: string
  private clientSecret?: string
  private redirectUri: string
  private scopes: string[]

  private static readonly STORAGE_KEY = 'codex-google-tokens'
  private static readonly DEFAULT_SCOPES = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/documents.readonly',
  ]

  constructor(config: GoogleOAuthConfig = {}) {
    // Use environment variable or user-provided client ID
    this.clientId =
      config.clientId ||
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      '' // Will prompt user to provide

    this.clientSecret = config.clientSecret || process.env.GOOGLE_CLIENT_SECRET

    this.redirectUri =
      config.redirectUri ||
      process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ||
      `${window.location.origin}/api/auth/google/callback`

    this.scopes = config.scopes || GoogleOAuthClient.DEFAULT_SCOPES
  }

  // ==========================================================================
  // OAUTH FLOW
  // ==========================================================================

  /**
   * Start OAuth authorization flow
   * Opens popup window for user consent
   */
  async authorize(): Promise<GoogleTokens> {
    if (!this.clientId) {
      throw new Error('Google OAuth client ID not configured')
    }

    // Build authorization URL
    const authUrl = this.buildAuthUrl()

    // Open popup
    const popup = window.open(
      authUrl,
      'google-oauth',
      'width=600,height=700,menubar=no,toolbar=no,location=no'
    )

    if (!popup) {
      throw new Error('Popup blocked. Please allow popups for Google authentication.')
    }

    // Wait for callback
    return new Promise((resolve, reject) => {
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', messageHandler)
          reject(new Error('Authentication cancelled'))
        }
      }, 500)

      const messageHandler = async (event: MessageEvent) => {
        // Verify origin
        if (event.origin !== window.location.origin) return

        if (event.data.type === 'google-oauth-success') {
          clearInterval(checkClosed)
          window.removeEventListener('message', messageHandler)
          popup.close()

          try {
            const tokens = await this.exchangeCodeForTokens(event.data.code)
            await this.saveTokens(tokens)
            resolve(tokens)
          } catch (error) {
            reject(error)
          }
        } else if (event.data.type === 'google-oauth-error') {
          clearInterval(checkClosed)
          window.removeEventListener('message', messageHandler)
          popup.close()
          reject(new Error(event.data.error || 'Authentication failed'))
        }
      }

      window.addEventListener('message', messageHandler)
    })
  }

  /**
   * Build Google OAuth authorization URL
   */
  private buildAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scopes.join(' '),
      access_type: 'offline', // Request refresh token
      prompt: 'consent', // Always show consent screen to get refresh token
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret || '',
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error_description || 'Failed to exchange code for tokens')
    }

    const data = await response.json()

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      scope: data.scope,
    }
  }

  // ==========================================================================
  // TOKEN MANAGEMENT
  // ==========================================================================

  /**
   * Get current access token (refreshes if needed)
   */
  async getAccessToken(): Promise<string> {
    const tokens = await this.getTokens()

    if (!tokens) {
      throw new Error('Not authenticated. Please sign in with Google.')
    }

    // Check if token is expired
    if (tokens.expiresAt <= Date.now() + 60000) {
      // Refresh if expires in < 1 minute
      if (tokens.refreshToken) {
        const newTokens = await this.refreshAccessToken(tokens.refreshToken)
        return newTokens.accessToken
      } else {
        throw new Error('Access token expired and no refresh token available')
      }
    }

    return tokens.accessToken
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret || '',
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to refresh access token')
    }

    const data = await response.json()

    const newTokens: GoogleTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Keep old refresh token if not returned
      expiresAt: Date.now() + data.expires_in * 1000,
      scope: data.scope,
    }

    await this.saveTokens(newTokens)
    return newTokens
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const tokens = await this.getTokens()
    return !!tokens
  }

  /**
   * Revoke access and clear tokens
   */
  async revokeAccess(): Promise<void> {
    const tokens = await this.getTokens()

    if (tokens?.accessToken) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${tokens.accessToken}`, {
          method: 'POST',
        })
      } catch (error) {
        console.warn('Failed to revoke token:', error)
      }
    }

    this.clearTokens()
  }

  // ==========================================================================
  // TOKEN STORAGE
  // ==========================================================================

  /**
   * Save tokens to encrypted localStorage
   */
  private async saveTokens(tokens: GoogleTokens): Promise<void> {
    const encrypted = await encryptData(JSON.stringify(tokens))
    localStorage.setItem(GoogleOAuthClient.STORAGE_KEY, encrypted)
  }

  /**
   * Get tokens from localStorage
   */
  private async getTokens(): Promise<GoogleTokens | null> {
    const encrypted = localStorage.getItem(GoogleOAuthClient.STORAGE_KEY)

    if (!encrypted) return null

    try {
      const decrypted = await decryptData(encrypted)
      if (!decrypted) return null
      return JSON.parse(decrypted) as GoogleTokens
    } catch (error) {
      console.error('Failed to decrypt Google tokens:', error)
      return null
    }
  }

  /**
   * Clear tokens from storage
   */
  private clearTokens(): void {
    localStorage.removeItem(GoogleOAuthClient.STORAGE_KEY)
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  /**
   * Update client configuration (for custom OAuth credentials)
   */
  updateConfig(config: Partial<GoogleOAuthConfig>): void {
    if (config.clientId) this.clientId = config.clientId
    if (config.clientSecret) this.clientSecret = config.clientSecret
    if (config.redirectUri) this.redirectUri = config.redirectUri
    if (config.scopes) this.scopes = config.scopes
  }

  /**
   * Get current configuration
   */
  getConfig(): GoogleOAuthConfig {
    return {
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      scopes: this.scopes,
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let googleOAuthInstance: GoogleOAuthClient | null = null

/**
 * Get singleton GoogleOAuthClient instance
 */
export function getGoogleOAuthClient(config?: GoogleOAuthConfig): GoogleOAuthClient {
  if (!googleOAuthInstance) {
    googleOAuthInstance = new GoogleOAuthClient(config)
  } else if (config) {
    googleOAuthInstance.updateConfig(config)
  }
  return googleOAuthInstance
}

/**
 * Reset GoogleOAuthClient instance (for testing)
 */
export function resetGoogleOAuthClient(): void {
  googleOAuthInstance = null
}
