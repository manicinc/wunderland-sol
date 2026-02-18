/**
 * Google Calendar OAuth Handler
 *
 * Manages OAuth 2.0 flow for Google Calendar integration.
 * Handles token storage, refresh, and revocation.
 *
 * Supports three modes:
 * 1. PKCE (Desktop/Electron) - No client secret needed, uses code challenge
 * 2. Pre-configured OAuth (hosted web) - Uses server-side token exchange
 * 3. BYOK (Bring Your Own Key) - User provides their own OAuth credentials
 *
 * @module lib/planner/google/GoogleCalendarOAuth
 */

import type { GoogleCalendarTokens } from '../types'
import { isStaticExport } from '../../config/deploymentMode'

// ============================================================================
// CONSTANTS
// ============================================================================

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'

// Profile scopes (for login)
const PROFILE_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]

// Calendar scopes (for planner integration)
const CALENDAR_ONLY_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
]

// Combined scopes for login + calendar (default for full integration)
const FULL_SCOPES = [...PROFILE_SCOPES, ...CALENDAR_ONLY_SCOPES]

// Legacy: Required scopes for calendar access (backwards compatible)
const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
]

// Storage key for encrypted tokens (localStorage)
const TOKEN_STORAGE_KEY = 'planner_google_tokens'

// Storage key for BYOK credentials
const BYOK_CREDENTIALS_KEY = 'planner_google_byok_credentials'

// Storage key for PKCE code verifier (temporary during OAuth flow)
const PKCE_VERIFIER_KEY = 'planner_google_pkce_verifier'

// Default Client ID for Quarry desktop app (PKCE mode - no secret needed)
// This is safe to embed as PKCE flow doesn't require a secret
const QUARRY_DESKTOP_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_DESKTOP_CLIENT_ID || ''

// Client ID for web (can be used for PKCE on static hosting)
const QUARRY_WEB_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

// Force PKCE mode via environment variable
const FORCE_PKCE_MODE = process.env.NEXT_PUBLIC_OAUTH_MODE === 'pkce'

// ============================================================================
// TYPES
// ============================================================================

export type OAuthMode = 'pkce' | 'preconfigured' | 'byok' | 'none'

export interface OAuthModeInfo {
  mode: OAuthMode
  clientId: string | null
  message: string
}

interface OAuthConfig {
  clientId: string
  redirectUri: string
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}

export interface BYOKCredentials {
  clientId: string
  clientSecret: string
}

interface UserInfo {
  email: string
  name?: string
  picture?: string
}

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================

/**
 * Check if running in Electron environment
 */
export function isElectron(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as unknown as { electron?: unknown }).electron ||
    navigator.userAgent.toLowerCase().includes('electron')
}

/**
 * Check if running on a hosted domain (frame.dev, quarry.space)
 */
export function isHostedDomain(): boolean {
  if (typeof window === 'undefined') return false
  const hostname = window.location.hostname
  return hostname === 'frame.dev' ||
    hostname === 'quarry.space' ||
    hostname.endsWith('.frame.dev') ||
    hostname.endsWith('.quarry.space')
}

/**
 * Get the appropriate OAuth redirect URI based on deployment mode
 *
 * - Static hosting (GitHub Pages): /auth/google-calendar/callback.html
 * - Server hosting (Vercel, etc): /api/auth/google-calendar/callback
 */
export function getOAuthRedirectUri(): string {
  // Allow override via environment variable
  const customRedirect = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI
  if (customRedirect) return customRedirect

  if (typeof window === 'undefined') {
    // Server-side, assume API route
    return '/api/auth/google-calendar/callback'
  }

  // Static hosting uses the static HTML callback page
  if (isStaticExport() || FORCE_PKCE_MODE) {
    return `${window.location.origin}/auth/google-calendar/callback.html`
  }

  // Server hosting uses the API route
  return `${window.location.origin}/api/auth/google-calendar/callback`
}

/**
 * Check if we should use PKCE mode (static hosting or Electron)
 */
export function shouldUsePKCE(): boolean {
  // Forced via env var
  if (FORCE_PKCE_MODE) return true

  // Electron always uses PKCE
  if (isElectron()) return true

  // Static hosting uses PKCE (no server for token exchange)
  if (isStaticExport()) return true

  return false
}

// ============================================================================
// PKCE (Proof Key for Code Exchange)
// ============================================================================

/**
 * Generate a cryptographically random code verifier
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

/**
 * Generate code challenge from verifier using SHA-256
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(hash))
}

/**
 * Base64 URL encode (RFC 4648)
 */
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer))
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Store PKCE verifier temporarily during OAuth flow
 */
function storePKCEVerifier(verifier: string): void {
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier)
}

/**
 * Retrieve and clear PKCE verifier after OAuth callback
 */
function retrievePKCEVerifier(): string | null {
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY)
  sessionStorage.removeItem(PKCE_VERIFIER_KEY)
  return verifier
}

/**
 * Get authorization URL with PKCE parameters
 */
export async function getAuthorizationUrlWithPKCE(
  clientId: string,
  redirectUri: string
): Promise<{ url: string; codeVerifier: string }> {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: CALENDAR_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return {
    url: `${GOOGLE_AUTH_URL}?${params.toString()}`,
    codeVerifier,
  }
}

/**
 * Exchange authorization code for tokens using PKCE (no client secret)
 */
export async function exchangeCodeWithPKCE(
  code: string,
  codeVerifier: string,
  clientId: string,
  redirectUri: string
): Promise<TokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error_description || 'Failed to exchange code for tokens')
  }

  return response.json()
}

/**
 * Refresh access token using PKCE (no client secret)
 */
export async function refreshTokenWithPKCE(
  refreshToken: string,
  clientId: string
): Promise<TokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error_description || 'Failed to refresh token')
  }

  return response.json()
}

// ============================================================================
// MODE DETECTION
// ============================================================================

// Cache for OAuth mode detection
let cachedOAuthMode: OAuthModeInfo | null = null

/**
 * Detect OAuth mode based on environment
 * Priority: PKCE (Electron/Static) > Pre-configured (hosted server) > BYOK > none
 */
export async function detectOAuthMode(): Promise<OAuthModeInfo> {
  // Return cached result if available
  if (cachedOAuthMode) {
    return cachedOAuthMode
  }

  // 1. Check for PKCE mode (Electron with desktop client ID)
  if (isElectron() && QUARRY_DESKTOP_CLIENT_ID) {
    cachedOAuthMode = {
      mode: 'pkce',
      clientId: QUARRY_DESKTOP_CLIENT_ID,
      message: 'Using PKCE flow for desktop app',
    }
    return cachedOAuthMode
  }

  // 2. Check for PKCE mode (Static hosting like GitHub Pages)
  //    Use PKCE when: forced via env, or static export with a client ID
  if (shouldUsePKCE()) {
    const clientId = QUARRY_WEB_CLIENT_ID || QUARRY_DESKTOP_CLIENT_ID
    if (clientId) {
      cachedOAuthMode = {
        mode: 'pkce',
        clientId,
        message: 'Using PKCE flow for static hosting',
      }
      return cachedOAuthMode
    }
  }

  // 3. Check for pre-configured server-side OAuth (only if not static)
  if (!isStaticExport()) {
    try {
      const response = await fetch('/api/auth/google-calendar/token', {
        method: 'GET',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.mode === 'preconfigured') {
          cachedOAuthMode = {
            mode: 'preconfigured',
            clientId: data.clientId,
            message: data.message,
          }
          return cachedOAuthMode
        }
      }
    } catch {
      // Server not available, continue to BYOK check
    }
  }

  // 4. Check for BYOK credentials
  const byokCredentials = loadBYOKCredentials()
  if (byokCredentials) {
    cachedOAuthMode = {
      mode: 'byok',
      clientId: byokCredentials.clientId,
      message: 'Using BYOK credentials',
    }
    return cachedOAuthMode
  }

  // 5. No OAuth available
  cachedOAuthMode = {
    mode: 'none',
    clientId: null,
    message: 'No OAuth configuration found. Please configure credentials.',
  }
  return cachedOAuthMode
}

/**
 * Force use of BYOK mode (for advanced users)
 */
export function setForceBYOKMode(force: boolean): void {
  if (typeof localStorage !== 'undefined') {
    if (force) {
      localStorage.setItem('planner_force_byok', 'true')
    } else {
      localStorage.removeItem('planner_force_byok')
    }
    clearOAuthModeCache()
  }
}

/**
 * Check if BYOK mode is forced
 */
export function isBYOKModeForced(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem('planner_force_byok') === 'true'
}

/**
 * Clear cached OAuth mode (call after changing BYOK credentials)
 */
export function clearOAuthModeCache(): void {
  cachedOAuthMode = null
}

/**
 * Check if pre-configured OAuth is available (client-side check)
 */
export function hasPreConfiguredClientId(): boolean {
  return !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
}

// ============================================================================
// BYOK CREDENTIALS STORAGE
// ============================================================================

/**
 * Save BYOK credentials to localStorage
 */
export function saveBYOKCredentials(credentials: BYOKCredentials): void {
  localStorage.setItem(BYOK_CREDENTIALS_KEY, JSON.stringify(credentials))
  clearOAuthModeCache()
}

/**
 * Load BYOK credentials from localStorage
 */
export function loadBYOKCredentials(): BYOKCredentials | null {
  const stored = localStorage.getItem(BYOK_CREDENTIALS_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

/**
 * Clear BYOK credentials
 */
export function clearBYOKCredentials(): void {
  localStorage.removeItem(BYOK_CREDENTIALS_KEY)
  clearOAuthModeCache()
}

// ============================================================================
// SERVER-SIDE TOKEN EXCHANGE (for pre-configured OAuth)
// ============================================================================

/**
 * Exchange authorization code for tokens via server-side endpoint
 * Used when pre-configured OAuth is available
 */
export async function exchangeCodeViaServer(
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const response = await fetch('/api/auth/google-calendar/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      redirectUri,
      grantType: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error_description || 'Failed to exchange code for tokens')
  }

  return response.json()
}

/**
 * Refresh access token via server-side endpoint
 * Used when pre-configured OAuth is available
 */
export async function refreshTokenViaServer(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch('/api/auth/google-calendar/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      refreshToken,
      grantType: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error_description || 'Failed to refresh token')
  }

  return response.json()
}

// ============================================================================
// OAUTH FLOW
// ============================================================================

/**
 * Generate OAuth authorization URL
 *
 * @param config - OAuth configuration
 * @returns Authorization URL to redirect user to
 */
export function getAuthorizationUrl(config: OAuthConfig): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: CALENDAR_SCOPES.join(' '),
    access_type: 'offline', // Request refresh token
    prompt: 'consent', // Force consent to get refresh token
    include_granted_scopes: 'true',
  })

  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

/**
 * Open OAuth popup window
 *
 * @param config - OAuth configuration
 * @returns Promise that resolves with the auth code
 */
export function openAuthPopup(config: OAuthConfig): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = getAuthorizationUrl(config)
    const width = 500
    const height = 600
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    const popup = window.open(
      url,
      'google_oauth',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    )

    if (!popup) {
      reject(new Error('Failed to open popup window. Please allow popups for this site.'))
      return
    }

    // Listen for messages from the popup
    const handleMessage = (event: MessageEvent) => {
      // Verify origin
      if (event.origin !== window.location.origin) return

      if (event.data?.type === 'GOOGLE_OAUTH_SUCCESS') {
        window.removeEventListener('message', handleMessage)
        popup.close()
        resolve(event.data.code)
      } else if (event.data?.type === 'GOOGLE_OAUTH_ERROR') {
        window.removeEventListener('message', handleMessage)
        popup.close()
        reject(new Error(event.data.error || 'OAuth failed'))
      }
    }

    window.addEventListener('message', handleMessage)

    // Check if popup was closed without completing auth
    const pollTimer = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollTimer)
        window.removeEventListener('message', handleMessage)
        reject(new Error('Authentication cancelled'))
      }
    }, 500)

    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(pollTimer)
      window.removeEventListener('message', handleMessage)
      if (!popup.closed) popup.close()
      reject(new Error('Authentication timed out'))
    }, 5 * 60 * 1000)
  })
}

/**
 * Exchange authorization code for tokens
 *
 * @param code - Authorization code from OAuth callback
 * @param config - OAuth configuration
 * @returns Token response
 */
export async function exchangeCodeForTokens(
  code: string,
  config: OAuthConfig & { clientSecret: string }
): Promise<TokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error_description || 'Failed to exchange code for tokens')
  }

  return response.json()
}

/**
 * Refresh access token using refresh token
 *
 * @param refreshToken - Refresh token
 * @param config - OAuth configuration
 * @returns New token response
 */
export async function refreshAccessToken(
  refreshToken: string,
  config: { clientId: string; clientSecret: string }
): Promise<TokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error_description || 'Failed to refresh token')
  }

  return response.json()
}

/**
 * Revoke access token
 *
 * @param token - Access or refresh token to revoke
 */
export async function revokeToken(token: string): Promise<void> {
  const response = await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(token)}`, {
    method: 'POST',
  })

  if (!response.ok) {
    console.warn('[GoogleCalendarOAuth] Token revocation failed')
  }
}

/**
 * Get user info from Google
 *
 * @param accessToken - Valid access token
 * @returns User info
 */
export async function getUserInfo(accessToken: string): Promise<UserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get user info')
  }

  return response.json()
}

// ============================================================================
// TOKEN STORAGE (Client-side)
// ============================================================================

/**
 * Simple XOR encryption for client-side token storage
 * Note: This is basic obfuscation, not strong encryption
 */
function simpleEncrypt(text: string, key: string): string {
  const textBytes = new TextEncoder().encode(text)
  const keyBytes = new TextEncoder().encode(key)
  const encrypted = new Uint8Array(textBytes.length)

  for (let i = 0; i < textBytes.length; i++) {
    encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length]
  }

  return btoa(String.fromCharCode(...encrypted))
}

function simpleDecrypt(encrypted: string, key: string): string {
  const encryptedBytes = new Uint8Array(
    atob(encrypted)
      .split('')
      .map((c) => c.charCodeAt(0))
  )
  const keyBytes = new TextEncoder().encode(key)
  const decrypted = new Uint8Array(encryptedBytes.length)

  for (let i = 0; i < encryptedBytes.length; i++) {
    decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length]
  }

  return new TextDecoder().decode(decrypted)
}

// Obfuscation key (derived from domain and timestamp)
function getObfuscationKey(): string {
  // Use domain as part of the key for basic security
  return `planner_${window.location.hostname}_v1`
}

/**
 * Save tokens to localStorage (encrypted)
 */
export function saveTokensToStorage(tokens: GoogleCalendarTokens): void {
  const key = getObfuscationKey()
  const data = JSON.stringify(tokens)
  const encrypted = simpleEncrypt(data, key)
  localStorage.setItem(TOKEN_STORAGE_KEY, encrypted)
}

/**
 * Load tokens from localStorage
 */
export function loadTokensFromStorage(): GoogleCalendarTokens | null {
  const encrypted = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!encrypted) return null

  try {
    const key = getObfuscationKey()
    const data = simpleDecrypt(encrypted, key)
    return JSON.parse(data)
  } catch {
    console.warn('[GoogleCalendarOAuth] Failed to decrypt tokens')
    return null
  }
}

/**
 * Clear tokens from localStorage
 */
export function clearTokensFromStorage(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

/**
 * Check if tokens are expired
 */
export function isTokenExpired(tokens: GoogleCalendarTokens): boolean {
  if (!tokens.expiresAt) return true
  // Add 5 minute buffer
  return Date.now() > tokens.expiresAt - 5 * 60 * 1000
}

// ============================================================================
// FULL OAUTH FLOW
// ============================================================================

/**
 * Complete OAuth flow (BYOK mode)
 *
 * @param config - OAuth configuration with client secret
 * @returns Token info and user email
 */
export async function performOAuthFlowBYOK(
  config: OAuthConfig & { clientSecret: string }
): Promise<{ tokens: GoogleCalendarTokens; userEmail: string }> {
  // Open popup and get auth code
  const code = await openAuthPopup(config)

  // Exchange code for tokens (client-side with secret)
  const tokenResponse = await exchangeCodeForTokens(code, config)

  // Get user info
  const userInfo = await getUserInfo(tokenResponse.access_token)

  // Build tokens object
  const tokens: GoogleCalendarTokens = {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token || '',
    expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    scope: tokenResponse.scope || CALENDAR_SCOPES.join(' '),
    tokenType: tokenResponse.token_type || 'Bearer',
    userEmail: userInfo.email,
  }

  // Save to storage
  saveTokensToStorage(tokens)

  return { tokens, userEmail: userInfo.email }
}

/**
 * Complete OAuth flow (Pre-configured mode)
 * Uses server-side token exchange to keep client secret secure
 *
 * @param config - OAuth configuration (no secret needed)
 * @returns Token info and user email
 */
export async function performOAuthFlowPreConfigured(
  config: OAuthConfig
): Promise<{ tokens: GoogleCalendarTokens; userEmail: string }> {
  // Open popup and get auth code
  const code = await openAuthPopup(config)

  // Exchange code for tokens via server
  const tokenResponse = await exchangeCodeViaServer(code, config.redirectUri)

  // Get user info
  const userInfo = await getUserInfo(tokenResponse.access_token)

  // Build tokens object
  const tokens: GoogleCalendarTokens = {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token || '',
    expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    scope: tokenResponse.scope || CALENDAR_SCOPES.join(' '),
    tokenType: tokenResponse.token_type || 'Bearer',
    userEmail: userInfo.email,
  }

  // Save to storage
  saveTokensToStorage(tokens)

  return { tokens, userEmail: userInfo.email }
}

/**
 * Complete OAuth flow (PKCE mode)
 * Uses PKCE for desktop/static apps - no client secret needed
 *
 * @param clientId - OAuth client ID
 * @returns Token info and user email
 */
export async function performOAuthFlowPKCE(
  clientId: string
): Promise<{ tokens: GoogleCalendarTokens; userEmail: string }> {
  const redirectUri = getOAuthRedirectUri()

  // Generate PKCE parameters
  const { url, codeVerifier } = await getAuthorizationUrlWithPKCE(clientId, redirectUri)

  // Store verifier temporarily
  storePKCEVerifier(codeVerifier)

  // Open popup and get auth code
  const code = await openAuthPopupWithUrl(url)

  // Retrieve verifier
  const storedVerifier = retrievePKCEVerifier()
  if (!storedVerifier) {
    throw new Error('PKCE verifier not found. Please try again.')
  }

  // Exchange code for tokens using PKCE
  const tokenResponse = await exchangeCodeWithPKCE(code, storedVerifier, clientId, redirectUri)

  // Get user info
  const userInfo = await getUserInfo(tokenResponse.access_token)

  // Build tokens object
  const tokens: GoogleCalendarTokens = {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token || '',
    expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    scope: tokenResponse.scope || CALENDAR_SCOPES.join(' '),
    tokenType: tokenResponse.token_type || 'Bearer',
    userEmail: userInfo.email,
  }

  // Save to storage
  saveTokensToStorage(tokens)

  return { tokens, userEmail: userInfo.email }
}

/**
 * Open OAuth popup with a specific URL
 */
function openAuthPopupWithUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const width = 500
    const height = 600
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    const popup = window.open(
      url,
      'google_oauth',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    )

    if (!popup) {
      reject(new Error('Failed to open popup window. Please allow popups for this site.'))
      return
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return

      if (event.data?.type === 'GOOGLE_OAUTH_SUCCESS') {
        window.removeEventListener('message', handleMessage)
        popup.close()
        resolve(event.data.code)
      } else if (event.data?.type === 'GOOGLE_OAUTH_ERROR') {
        window.removeEventListener('message', handleMessage)
        popup.close()
        reject(new Error(event.data.error || 'OAuth failed'))
      }
    }

    window.addEventListener('message', handleMessage)

    const pollTimer = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollTimer)
        window.removeEventListener('message', handleMessage)
        reject(new Error('Authentication cancelled'))
      }
    }, 500)

    setTimeout(() => {
      clearInterval(pollTimer)
      window.removeEventListener('message', handleMessage)
      if (!popup.closed) popup.close()
      reject(new Error('Authentication timed out'))
    }, 5 * 60 * 1000)
  })
}

/**
 * Complete OAuth flow - auto-detects mode
 * Use this for a unified OAuth experience
 */
export async function performOAuthFlow(): Promise<{ tokens: GoogleCalendarTokens; userEmail: string }> {
  const modeInfo = await detectOAuthMode()

  const redirectUri = getOAuthRedirectUri()

  // PKCE mode (Electron/Desktop)
  if (modeInfo.mode === 'pkce' && modeInfo.clientId) {
    return performOAuthFlowPKCE(modeInfo.clientId)
  }

  // Pre-configured mode (hosted web)
  if (modeInfo.mode === 'preconfigured' && modeInfo.clientId) {
    return performOAuthFlowPreConfigured({
      clientId: modeInfo.clientId,
      redirectUri,
    })
  }

  // BYOK mode (self-hosted)
  if (modeInfo.mode === 'byok') {
    const byokCredentials = loadBYOKCredentials()
    if (!byokCredentials) {
      throw new Error('BYOK credentials not configured. Please add your OAuth Client ID and Secret.')
    }
    return performOAuthFlowBYOK({
      clientId: byokCredentials.clientId,
      clientSecret: byokCredentials.clientSecret,
      redirectUri,
    })
  }

  throw new Error('No OAuth configuration available. Please configure BYOK credentials or contact administrator.')
}

/**
 * Get valid access token (refresh if needed)
 * Auto-detects OAuth mode
 *
 * @returns Valid access token or null
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = loadTokensFromStorage()
  if (!tokens) return null

  // Check if token is valid
  if (!isTokenExpired(tokens)) {
    return tokens.accessToken
  }

  // Try to refresh
  if (!tokens.refreshToken) {
    clearTokensFromStorage()
    return null
  }

  try {
    const modeInfo = await detectOAuthMode()
    let newTokenResponse: TokenResponse

    if (modeInfo.mode === 'pkce' && modeInfo.clientId) {
      // PKCE refresh (no secret needed)
      newTokenResponse = await refreshTokenWithPKCE(tokens.refreshToken, modeInfo.clientId)
    } else if (modeInfo.mode === 'preconfigured') {
      // Use server-side refresh
      newTokenResponse = await refreshTokenViaServer(tokens.refreshToken)
    } else if (modeInfo.mode === 'byok') {
      // Use client-side refresh with BYOK credentials
      const byokCredentials = loadBYOKCredentials()
      if (!byokCredentials) {
        clearTokensFromStorage()
        return null
      }
      newTokenResponse = await refreshAccessToken(tokens.refreshToken, byokCredentials)
    } else {
      clearTokensFromStorage()
      return null
    }

    const updatedTokens: GoogleCalendarTokens = {
      ...tokens,
      accessToken: newTokenResponse.access_token,
      expiresAt: Date.now() + newTokenResponse.expires_in * 1000,
    }

    saveTokensToStorage(updatedTokens)
    return updatedTokens.accessToken
  } catch (error) {
    console.error('[GoogleCalendarOAuth] Failed to refresh token:', error)
    clearTokensFromStorage()
    return null
  }
}

/**
 * Sign out and revoke tokens
 */
export async function signOut(): Promise<void> {
  const tokens = loadTokensFromStorage()

  if (tokens?.accessToken) {
    await revokeToken(tokens.accessToken)
  }

  clearTokensFromStorage()
}

// ============================================================================
// LOGIN-SPECIFIC OAUTH FLOW
// ============================================================================

/**
 * Google user profile from OAuth
 */
export interface GoogleUserProfile {
  id: string
  email: string
  name?: string
  picture?: string
  verified_email?: boolean
}

/**
 * Login OAuth result with profile and tokens
 */
export interface LoginOAuthResult {
  profile: GoogleUserProfile
  tokens: GoogleCalendarTokens
  scopes: string[]
}

/**
 * Get full user profile from Google (includes picture and name)
 */
export async function getFullUserProfile(accessToken: string): Promise<GoogleUserProfile> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get user profile')
  }

  return response.json()
}

/**
 * Check if current tokens include calendar scopes
 */
export function hasCalendarScopes(tokens?: GoogleCalendarTokens | null): boolean {
  const stored = tokens || loadTokensFromStorage()
  if (!stored?.scope) return false

  return stored.scope.includes('calendar.readonly') ||
    stored.scope.includes('calendar.events')
}

/**
 * Check if current tokens include profile scopes
 */
export function hasProfileScopes(tokens?: GoogleCalendarTokens | null): boolean {
  const stored = tokens || loadTokensFromStorage()
  if (!stored?.scope) return false

  return stored.scope.includes('userinfo.profile') ||
    stored.scope.includes('openid')
}

/**
 * Perform OAuth flow for login (includes profile + calendar)
 * Returns both profile info and tokens
 */
export async function performLoginOAuthFlow(): Promise<LoginOAuthResult> {
  const modeInfo = await detectOAuthMode()
  const redirectUri = getOAuthRedirectUri()

  // Use FULL_SCOPES for login (profile + calendar)
  const scopes = FULL_SCOPES

  let tokenResponse: {
    access_token: string
    refresh_token?: string
    expires_in: number
    token_type: string
    scope: string
  }

  // PKCE mode (Electron/Desktop/Static)
  if (modeInfo.mode === 'pkce' && modeInfo.clientId) {
    const { url, codeVerifier } = await getAuthorizationUrlWithPKCEAndScopes(
      modeInfo.clientId,
      redirectUri,
      scopes
    )
    storePKCEVerifierInternal(codeVerifier)
    const code = await openAuthPopupWithUrl(url)
    const storedVerifier = retrievePKCEVerifierInternal()
    if (!storedVerifier) {
      throw new Error('PKCE verifier not found. Please try again.')
    }
    tokenResponse = await exchangeCodeWithPKCE(code, storedVerifier, modeInfo.clientId, redirectUri)
  }
  // Pre-configured mode (hosted web)
  else if (modeInfo.mode === 'preconfigured' && modeInfo.clientId) {
    const code = await openAuthPopupWithScopes({
      clientId: modeInfo.clientId,
      redirectUri,
    }, scopes)
    tokenResponse = await exchangeCodeViaServer(code, redirectUri)
  }
  // BYOK mode
  else if (modeInfo.mode === 'byok') {
    const byokCredentials = loadBYOKCredentials()
    if (!byokCredentials) {
      throw new Error('BYOK credentials not configured')
    }
    const code = await openAuthPopupWithScopes({
      clientId: byokCredentials.clientId,
      redirectUri,
    }, scopes)
    tokenResponse = await exchangeCodeForTokens(code, {
      ...byokCredentials,
      redirectUri,
    })
  }
  else {
    throw new Error('No OAuth configuration available')
  }

  // Get full user profile
  const profile = await getFullUserProfile(tokenResponse.access_token)

  // Build tokens object
  const tokens: GoogleCalendarTokens = {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token || '',
    expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    scope: tokenResponse.scope || scopes.join(' '),
    tokenType: tokenResponse.token_type || 'Bearer',
    userEmail: profile.email,
  }

  // Save to storage
  saveTokensToStorage(tokens)

  return {
    profile,
    tokens,
    scopes: tokenResponse.scope?.split(' ') || scopes,
  }
}

/**
 * Get authorization URL with PKCE and custom scopes
 */
async function getAuthorizationUrlWithPKCEAndScopes(
  clientId: string,
  redirectUri: string,
  scopes: string[]
): Promise<{ url: string; codeVerifier: string }> {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return {
    url: `${GOOGLE_AUTH_URL}?${params.toString()}`,
    codeVerifier,
  }
}

/**
 * Open OAuth popup with custom scopes
 */
function openAuthPopupWithScopes(
  config: { clientId: string; redirectUri: string },
  scopes: string[]
): Promise<string> {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  })

  const url = `${GOOGLE_AUTH_URL}?${params.toString()}`
  return openAuthPopupWithUrl(url)
}

// Internal PKCE helpers (avoiding name collision with existing functions)
function storePKCEVerifierInternal(verifier: string): void {
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier)
}

function retrievePKCEVerifierInternal(): string | null {
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY)
  sessionStorage.removeItem(PKCE_VERIFIER_KEY)
  return verifier
}

/**
 * Export scope constants for use in other modules
 */
export const OAUTH_SCOPES = {
  PROFILE: PROFILE_SCOPES,
  CALENDAR: CALENDAR_ONLY_SCOPES,
  FULL: FULL_SCOPES,
  LEGACY_CALENDAR: CALENDAR_SCOPES,
}
