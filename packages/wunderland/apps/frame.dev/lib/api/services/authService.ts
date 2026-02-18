/**
 * Authentication Service
 *
 * Handles user authentication including:
 * - Email/password registration and login
 * - Google OAuth integration
 * - Session management
 * - Account linking (email + Google)
 *
 * Uses email as the canonical identifier for Spotify-style account merging.
 *
 * @module lib/api/services/authService
 */

import { Pool } from 'pg'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'

// ============================================================================
// TYPES
// ============================================================================

export interface Account {
  id: string
  email: string
  authMethod: 'google' | 'email' | 'guest'
  displayName: string | null
  avatarUrl: string | null
  profileSource: 'google' | 'manual'
  googleId: string | null
  googleConnected: boolean
  googleScopes: string[]
  tier: 'free' | 'premium'
  emailVerified: boolean
  createdAt: string
  lastLoginAt: string | null
}

export interface Session {
  id: string
  accountId: string
  sessionToken: string
  expiresAt: string
  createdAt: string
}

export interface GoogleProfile {
  id: string
  email: string
  name?: string
  picture?: string
}

export interface DeviceInfo {
  userAgent?: string
  ip?: string
  platform?: string
  deviceName?: string
}

export interface SessionResult {
  account: Account
  session: Session
  isNewAccount: boolean
}

export interface CreateAccountResult {
  account: Account
  warning?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BCRYPT_ROUNDS = 12
const SESSION_TOKEN_BYTES = 64
const SESSION_DURATION_DAYS = 30
const EMAIL_VERIFICATION_HOURS = 24
const PASSWORD_RESET_HOURS = 1

// ============================================================================
// AUTH SERVICE
// ============================================================================

export class AuthService {
  private pool: Pool

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
    })
  }

  // ==========================================================================
  // EMAIL/PASSWORD AUTHENTICATION
  // ==========================================================================

  /**
   * Create a new account with email and password.
   */
  async createEmailAccount(
    email: string,
    password: string
  ): Promise<CreateAccountResult> {
    const normalizedEmail = email.toLowerCase().trim()

    // Validate password strength
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }

    // Check if email already exists
    const existingAccount = await this.findAccountByEmail(normalizedEmail)
    if (existingAccount) {
      if (existingAccount.authMethod === 'google') {
        // Merge: Add password to existing Google account
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
        await this.pool.query(
          `UPDATE sync_accounts
           SET password_hash = $1, auth_method = 'email'
           WHERE id = $2`,
          [passwordHash, existingAccount.id]
        )
        return {
          account: { ...existingAccount, authMethod: 'email' },
          warning: 'Password added to your existing Google account',
        }
      }
      throw new Error('An account with this email already exists')
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    // Create account
    const result = await this.pool.query<{ id: string; created_at: Date }>(
      `INSERT INTO sync_accounts (email, password_hash, auth_method, email_verified)
       VALUES ($1, $2, 'email', false)
       RETURNING id, created_at`,
      [normalizedEmail, passwordHash]
    )

    const account: Account = {
      id: result.rows[0].id,
      email: normalizedEmail,
      authMethod: 'email',
      displayName: null,
      avatarUrl: null,
      profileSource: 'manual',
      googleId: null,
      googleConnected: false,
      googleScopes: [],
      tier: 'free',
      emailVerified: false,
      createdAt: result.rows[0].created_at.toISOString(),
      lastLoginAt: null,
    }

    return {
      account,
      warning: 'Email login does not support Google Calendar integration. You can connect Google later in settings.',
    }
  }

  /**
   * Login with email and password.
   */
  async loginWithEmail(
    email: string,
    password: string,
    deviceInfo?: DeviceInfo
  ): Promise<SessionResult> {
    const normalizedEmail = email.toLowerCase().trim()

    // Find account
    const account = await this.findAccountByEmail(normalizedEmail)
    if (!account) {
      throw new Error('Invalid email or password')
    }

    // Check if account has password
    const passwordResult = await this.pool.query<{ password_hash: string | null }>(
      `SELECT password_hash FROM sync_accounts WHERE id = $1`,
      [account.id]
    )

    const passwordHash = passwordResult.rows[0]?.password_hash
    if (!passwordHash) {
      throw new Error('This account uses Google sign-in. Please sign in with Google.')
    }

    // Verify password
    const isValid = await bcrypt.compare(password, passwordHash)
    if (!isValid) {
      throw new Error('Invalid email or password')
    }

    // Update login stats
    await this.pool.query(
      `UPDATE sync_accounts
       SET last_login_at = NOW(), login_count = COALESCE(login_count, 0) + 1
       WHERE id = $1`,
      [account.id]
    )

    // Create session
    const session = await this.createSession(account.id, deviceInfo)

    return {
      account: { ...account, lastLoginAt: new Date().toISOString() },
      session,
      isNewAccount: false,
    }
  }

  // ==========================================================================
  // GOOGLE OAUTH AUTHENTICATION
  // ==========================================================================

  /**
   * Login or register with Google OAuth.
   * Handles account merging if email already exists.
   */
  async loginWithGoogle(
    profile: GoogleProfile,
    scopes: string[],
    refreshToken?: string,
    deviceInfo?: DeviceInfo
  ): Promise<SessionResult> {
    const normalizedEmail = profile.email.toLowerCase().trim()

    // Check if account exists by Google ID
    let account = await this.findAccountByGoogleId(profile.id)
    let isNewAccount = false

    if (!account) {
      // Check if account exists by email
      const existingByEmail = await this.findAccountByEmail(normalizedEmail)

      if (existingByEmail) {
        // Merge: Add Google to existing email account
        await this.linkGoogleToAccountInternal(
          existingByEmail.id,
          profile,
          scopes,
          refreshToken
        )
        account = await this.findAccountById(existingByEmail.id)
      } else {
        // Create new account
        account = await this.createGoogleAccount(profile, scopes, refreshToken)
        isNewAccount = true
      }
    } else {
      // Update Google profile info and scopes
      await this.updateGoogleProfile(account.id, profile, scopes, refreshToken)
      account = await this.findAccountById(account.id)
    }

    if (!account) {
      throw new Error('Failed to create or find account')
    }

    // Update login stats
    await this.pool.query(
      `UPDATE sync_accounts
       SET last_login_at = NOW(), login_count = COALESCE(login_count, 0) + 1
       WHERE id = $1`,
      [account.id]
    )

    // Create session
    const session = await this.createSession(account.id, deviceInfo)

    return {
      account: { ...account, lastLoginAt: new Date().toISOString() },
      session,
      isNewAccount,
    }
  }

  /**
   * Create a new account from Google profile.
   */
  private async createGoogleAccount(
    profile: GoogleProfile,
    scopes: string[],
    refreshToken?: string
  ): Promise<Account> {
    const normalizedEmail = profile.email.toLowerCase().trim()

    // Encrypt refresh token if provided
    const encryptedRefreshToken = refreshToken
      ? this.encryptRefreshToken(refreshToken)
      : null

    const result = await this.pool.query<{ id: string; created_at: Date }>(
      `INSERT INTO sync_accounts (
        email, auth_method, google_id, display_name, avatar_url, profile_source,
        google_connected_at, google_scopes, google_refresh_token_encrypted,
        email_verified
      )
      VALUES ($1, 'google', $2, $3, $4, 'google', NOW(), $5, $6, true)
      RETURNING id, created_at`,
      [
        normalizedEmail,
        profile.id,
        profile.name || null,
        profile.picture || null,
        scopes,
        encryptedRefreshToken,
      ]
    )

    return {
      id: result.rows[0].id,
      email: normalizedEmail,
      authMethod: 'google',
      displayName: profile.name || null,
      avatarUrl: profile.picture || null,
      profileSource: 'google',
      googleId: profile.id,
      googleConnected: true,
      googleScopes: scopes,
      tier: 'free',
      emailVerified: true,
      createdAt: result.rows[0].created_at.toISOString(),
      lastLoginAt: null,
    }
  }

  // ==========================================================================
  // ACCOUNT LINKING
  // ==========================================================================

  /**
   * Link Google account to an existing account.
   * Called when user wants to add Google to their email account.
   */
  async linkGoogleToAccount(
    accountId: string,
    profile: GoogleProfile,
    scopes: string[],
    refreshToken?: string
  ): Promise<{ success: boolean; calendarEnabled: boolean }> {
    // Check if Google ID is already linked to another account
    const existingGoogle = await this.findAccountByGoogleId(profile.id)
    if (existingGoogle && existingGoogle.id !== accountId) {
      throw new Error('This Google account is already linked to another account')
    }

    await this.linkGoogleToAccountInternal(accountId, profile, scopes, refreshToken)

    // Check if calendar scopes are included
    const calendarEnabled = scopes.some(s => s.includes('calendar'))

    return { success: true, calendarEnabled }
  }

  /**
   * Internal method to link Google to account.
   */
  private async linkGoogleToAccountInternal(
    accountId: string,
    profile: GoogleProfile,
    scopes: string[],
    refreshToken?: string
  ): Promise<void> {
    const encryptedRefreshToken = refreshToken
      ? this.encryptRefreshToken(refreshToken)
      : null

    await this.pool.query(
      `UPDATE sync_accounts SET
        google_id = $2,
        display_name = COALESCE(display_name, $3),
        avatar_url = COALESCE(avatar_url, $4),
        profile_source = CASE WHEN display_name IS NULL THEN 'google' ELSE profile_source END,
        google_connected_at = NOW(),
        google_scopes = $5,
        google_refresh_token_encrypted = COALESCE($6, google_refresh_token_encrypted),
        email_verified = true
      WHERE id = $1`,
      [
        accountId,
        profile.id,
        profile.name || null,
        profile.picture || null,
        scopes,
        encryptedRefreshToken,
      ]
    )
  }

  /**
   * Update Google profile and scopes for existing account.
   */
  private async updateGoogleProfile(
    accountId: string,
    profile: GoogleProfile,
    scopes: string[],
    refreshToken?: string
  ): Promise<void> {
    const encryptedRefreshToken = refreshToken
      ? this.encryptRefreshToken(refreshToken)
      : null

    await this.pool.query(
      `UPDATE sync_accounts SET
        display_name = CASE WHEN profile_source = 'google' THEN $2 ELSE display_name END,
        avatar_url = CASE WHEN profile_source = 'google' THEN $3 ELSE avatar_url END,
        google_scopes = $4,
        google_refresh_token_encrypted = COALESCE($5, google_refresh_token_encrypted)
      WHERE id = $1`,
      [
        accountId,
        profile.name || null,
        profile.picture || null,
        scopes,
        encryptedRefreshToken,
      ]
    )
  }

  /**
   * Disconnect Google from account.
   * Only allowed if account has password (email auth method).
   */
  async disconnectGoogle(accountId: string): Promise<void> {
    // Check if account has password
    const result = await this.pool.query<{ password_hash: string | null; auth_method: string }>(
      `SELECT password_hash, auth_method FROM sync_accounts WHERE id = $1`,
      [accountId]
    )

    if (result.rows.length === 0) {
      throw new Error('Account not found')
    }

    if (!result.rows[0].password_hash) {
      throw new Error('Cannot disconnect Google without setting a password first')
    }

    await this.pool.query(
      `UPDATE sync_accounts SET
        google_id = NULL,
        google_connected_at = NULL,
        google_scopes = NULL,
        google_refresh_token_encrypted = NULL
      WHERE id = $1`,
      [accountId]
    )
  }

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  /**
   * Create a new session for an account.
   */
  async createSession(accountId: string, deviceInfo?: DeviceInfo): Promise<Session> {
    const sessionToken = this.generateSessionToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS)

    const result = await this.pool.query<{ id: string; created_at: Date }>(
      `INSERT INTO auth_sessions (account_id, session_token, device_info, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [accountId, sessionToken, deviceInfo ? JSON.stringify(deviceInfo) : null, expiresAt]
    )

    return {
      id: result.rows[0].id,
      accountId,
      sessionToken,
      expiresAt: expiresAt.toISOString(),
      createdAt: result.rows[0].created_at.toISOString(),
    }
  }

  /**
   * Validate a session token and return the account.
   */
  async validateSession(sessionToken: string): Promise<Account | null> {
    const result = await this.pool.query<{ account_id: string; expires_at: Date }>(
      `SELECT account_id, expires_at FROM auth_sessions
       WHERE session_token = $1 AND expires_at > NOW()`,
      [sessionToken]
    )

    if (result.rows.length === 0) {
      return null
    }

    // Update last_active_at
    await this.pool.query(
      `UPDATE auth_sessions SET last_active_at = NOW() WHERE session_token = $1`,
      [sessionToken]
    )

    return this.findAccountById(result.rows[0].account_id)
  }

  /**
   * Revoke a specific session.
   */
  async revokeSession(sessionToken: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM auth_sessions WHERE session_token = $1`,
      [sessionToken]
    )
  }

  /**
   * Revoke all sessions for an account.
   */
  async revokeAllSessions(accountId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM auth_sessions WHERE account_id = $1`,
      [accountId]
    )
  }

  /**
   * Get all active sessions for an account.
   */
  async getAccountSessions(accountId: string): Promise<Array<{
    id: string
    deviceInfo: DeviceInfo | null
    createdAt: string
    lastActiveAt: string
    current?: boolean
  }>> {
    const result = await this.pool.query<{
      id: string
      session_token: string
      device_info: string | null
      created_at: Date
      last_active_at: Date
    }>(
      `SELECT id, session_token, device_info, created_at, last_active_at
       FROM auth_sessions
       WHERE account_id = $1 AND expires_at > NOW()
       ORDER BY last_active_at DESC`,
      [accountId]
    )

    return result.rows.map(row => ({
      id: row.id,
      deviceInfo: row.device_info ? JSON.parse(row.device_info) : null,
      createdAt: row.created_at.toISOString(),
      lastActiveAt: row.last_active_at.toISOString(),
    }))
  }

  // ==========================================================================
  // PASSWORD MANAGEMENT
  // ==========================================================================

  /**
   * Change password for an account.
   */
  async changePassword(
    accountId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Validate new password
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }

    // Get current password hash
    const result = await this.pool.query<{ password_hash: string | null }>(
      `SELECT password_hash FROM sync_accounts WHERE id = $1`,
      [accountId]
    )

    if (result.rows.length === 0) {
      throw new Error('Account not found')
    }

    const currentHash = result.rows[0].password_hash
    if (!currentHash) {
      throw new Error('This account does not have a password set')
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, currentHash)
    if (!isValid) {
      throw new Error('Current password is incorrect')
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)

    // Update password
    await this.pool.query(
      `UPDATE sync_accounts SET password_hash = $1 WHERE id = $2`,
      [newHash, accountId]
    )

    // Optionally: Revoke all sessions except current
  }

  /**
   * Set password for an account (for Google-only accounts).
   */
  async setPassword(accountId: string, password: string): Promise<void> {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    await this.pool.query(
      `UPDATE sync_accounts SET password_hash = $1 WHERE id = $2`,
      [passwordHash, accountId]
    )
  }

  /**
   * Initiate password reset.
   */
  async initiatePasswordReset(email: string): Promise<{ sent: boolean }> {
    const normalizedEmail = email.toLowerCase().trim()
    const account = await this.findAccountByEmail(normalizedEmail)

    if (!account) {
      // Don't reveal if account exists
      return { sent: true }
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + PASSWORD_RESET_HOURS)

    await this.pool.query(
      `UPDATE sync_accounts SET
        password_reset_token = $1,
        password_reset_expires_at = $2
      WHERE id = $3`,
      [resetToken, expiresAt, account.id]
    )

    // TODO: Send email with reset link
    // For now, return the token (in production, send via email)
    console.log(`[AuthService] Password reset token for ${email}: ${resetToken}`)

    return { sent: true }
  }

  /**
   * Reset password with token.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }

    const result = await this.pool.query<{ id: string }>(
      `SELECT id FROM sync_accounts
       WHERE password_reset_token = $1 AND password_reset_expires_at > NOW()`,
      [token]
    )

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired reset token')
    }

    const accountId = result.rows[0].id
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)

    await this.pool.query(
      `UPDATE sync_accounts SET
        password_hash = $1,
        password_reset_token = NULL,
        password_reset_expires_at = NULL,
        auth_method = CASE WHEN auth_method = 'guest' THEN 'email' ELSE auth_method END
      WHERE id = $2`,
      [passwordHash, accountId]
    )

    // Revoke all existing sessions
    await this.revokeAllSessions(accountId)
  }

  // ==========================================================================
  // PROFILE MANAGEMENT
  // ==========================================================================

  /**
   * Update account profile.
   */
  async updateProfile(
    accountId: string,
    updates: {
      displayName?: string
      avatarUrl?: string
    }
  ): Promise<Account> {
    const sets: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (updates.displayName !== undefined) {
      sets.push(`display_name = $${paramIndex++}`)
      values.push(updates.displayName)
      sets.push(`profile_source = 'manual'`)
    }

    if (updates.avatarUrl !== undefined) {
      sets.push(`avatar_url = $${paramIndex++}`)
      values.push(updates.avatarUrl)
    }

    if (sets.length === 0) {
      const account = await this.findAccountById(accountId)
      if (!account) throw new Error('Account not found')
      return account
    }

    values.push(accountId)

    await this.pool.query(
      `UPDATE sync_accounts SET ${sets.join(', ')} WHERE id = $${paramIndex}`,
      values
    )

    const account = await this.findAccountById(accountId)
    if (!account) throw new Error('Account not found')
    return account
  }

  // ==========================================================================
  // ACCOUNT LOOKUP
  // ==========================================================================

  /**
   * Find account by ID.
   */
  async findAccountById(id: string): Promise<Account | null> {
    const result = await this.pool.query<AccountRow>(
      `SELECT * FROM sync_accounts WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) return null
    return this.mapRowToAccount(result.rows[0])
  }

  /**
   * Find account by email.
   */
  async findAccountByEmail(email: string): Promise<Account | null> {
    const result = await this.pool.query<AccountRow>(
      `SELECT * FROM sync_accounts WHERE email = $1`,
      [email.toLowerCase().trim()]
    )

    if (result.rows.length === 0) return null
    return this.mapRowToAccount(result.rows[0])
  }

  /**
   * Find account by Google ID.
   */
  async findAccountByGoogleId(googleId: string): Promise<Account | null> {
    const result = await this.pool.query<AccountRow>(
      `SELECT * FROM sync_accounts WHERE google_id = $1`,
      [googleId]
    )

    if (result.rows.length === 0) return null
    return this.mapRowToAccount(result.rows[0])
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Generate a cryptographically secure session token.
   */
  private generateSessionToken(): string {
    return crypto.randomBytes(SESSION_TOKEN_BYTES).toString('base64url')
  }

  /**
   * Simple encryption for refresh token storage.
   * Uses AES-256-GCM with a key derived from environment variable.
   */
  private encryptRefreshToken(token: string): Buffer {
    const key = this.getEncryptionKey()
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

    const encrypted = Buffer.concat([
      cipher.update(token, 'utf8'),
      cipher.final(),
    ])

    const authTag = cipher.getAuthTag()

    // Return: iv (12) + authTag (16) + encrypted
    return Buffer.concat([iv, authTag, encrypted])
  }

  /**
   * Decrypt refresh token.
   */
  decryptRefreshToken(encrypted: Buffer): string {
    const key = this.getEncryptionKey()
    const iv = encrypted.subarray(0, 12)
    const authTag = encrypted.subarray(12, 28)
    const data = encrypted.subarray(28)

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    return decipher.update(data) + decipher.final('utf8')
  }

  /**
   * Get encryption key from environment.
   */
  private getEncryptionKey(): Buffer {
    const keyHex = process.env.AUTH_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY
    if (!keyHex) {
      // Fallback to a deterministic key (not secure, but allows development)
      console.warn('[AuthService] No AUTH_ENCRYPTION_KEY set, using fallback')
      return crypto.createHash('sha256').update('quarry-dev-key').digest()
    }
    return Buffer.from(keyHex, 'hex')
  }

  /**
   * Map database row to Account type.
   */
  private mapRowToAccount(row: AccountRow): Account {
    return {
      id: row.id,
      email: row.email,
      authMethod: row.auth_method as 'google' | 'email' | 'guest',
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      profileSource: (row.profile_source || 'manual') as 'google' | 'manual',
      googleId: row.google_id,
      googleConnected: !!row.google_connected_at,
      googleScopes: row.google_scopes || [],
      tier: row.tier as 'free' | 'premium',
      emailVerified: row.email_verified || false,
      createdAt: row.created_at.toISOString(),
      lastLoginAt: row.last_login_at?.toISOString() ?? null,
    }
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  async close(): Promise<void> {
    await this.pool.end()
  }
}

// ============================================================================
// TYPES (INTERNAL)
// ============================================================================

interface AccountRow {
  id: string
  email: string
  password_hash: string | null
  auth_method: string
  display_name: string | null
  avatar_url: string | null
  profile_source: string | null
  google_id: string | null
  google_connected_at: Date | null
  google_scopes: string[] | null
  tier: string
  email_verified: boolean | null
  created_at: Date
  last_login_at: Date | null
}

// ============================================================================
// SINGLETON
// ============================================================================

let authServiceInstance: AuthService | null = null

export function getAuthService(): AuthService {
  if (!authServiceInstance) {
    const connectionString = process.env.DATABASE_URL || process.env.SYNC_DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL or SYNC_DATABASE_URL environment variable required')
    }
    authServiceInstance = new AuthService(connectionString)
  }
  return authServiceInstance
}

export async function closeAuthService(): Promise<void> {
  if (authServiceInstance) {
    await authServiceInstance.close()
    authServiceInstance = null
  }
}

// ============================================================================
// SESSION COOKIE HELPERS
// ============================================================================

export const SESSION_COOKIE_NAME = 'quarry_session'

export function getSessionCookieOptions(isProduction: boolean): {
  httpOnly: boolean
  secure: boolean
  sameSite: 'lax' | 'strict' | 'none'
  path: string
  maxAge: number
  domain?: string
} {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60, // in seconds
    ...(isProduction && { domain: '.quarry.space' }),
  }
}
