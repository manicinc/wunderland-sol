/**
 * Device Auth Service
 *
 * JWT-based authentication for sync accounts and devices.
 * Handles account registration, login, device management, and recovery.
 *
 * @module lib/api/services/deviceAuthService
 */

import { Pool } from 'pg'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import * as crypto from 'crypto'

// ============================================================================
// TYPES
// ============================================================================

export interface SyncAccount {
  id: string
  email: string
  tier: 'free' | 'premium'
  deviceLimit: number | null
  createdAt: string
  lastSyncAt: string | null
}

export interface DeviceToken {
  /** JWT token for API authentication */
  token: string
  /** Token expiration time (ISO string) */
  expiresAt: string
  /** Refresh token for obtaining new access tokens */
  refreshToken: string
}

export interface JWTPayload {
  /** Account ID */
  sub: string
  /** Device ID */
  deviceId: string
  /** Account email */
  email: string
  /** Account tier */
  tier: 'free' | 'premium'
  /** Token type */
  type: 'access' | 'refresh'
  /** Issued at */
  iat: number
  /** Expiration */
  exp: number
}

export interface RegisterRequest {
  email: string
  /** Wrapped master key (encrypted by passphrase-derived key) */
  wrappedMasterKey: Buffer
  /** Recovery key hash for account recovery */
  recoveryKeyHash: string
}

export interface LoginRequest {
  email: string
  deviceId: string
  deviceName: string
  deviceType: string
}

export interface RecoveryRequest {
  email: string
  /** Recovery key (24-word BIP39 mnemonic) */
  recoveryKey: string
  deviceId: string
  deviceName: string
  deviceType: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ACCESS_TOKEN_EXPIRY = '1h'  // 1 hour
const REFRESH_TOKEN_EXPIRY = '30d'  // 30 days
const BCRYPT_ROUNDS = 12

// ============================================================================
// DEVICE AUTH SERVICE
// ============================================================================

export class DeviceAuthService {
  private pool: Pool
  private jwtSecret: string

  constructor(connectionString: string, jwtSecret: string) {
    this.pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
    })

    this.jwtSecret = jwtSecret

    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters')
    }
  }

  // ==========================================================================
  // ACCOUNT REGISTRATION
  // ==========================================================================

  /**
   * Register a new sync account.
   * Returns the account ID and a recovery key to show the user.
   */
  async register(request: RegisterRequest): Promise<{ accountId: string; recoveryKey: string }> {
    const { email, wrappedMasterKey, recoveryKeyHash } = request

    // Check if account already exists
    const existing = await this.pool.query(
      `SELECT id FROM sync_accounts WHERE email = $1`,
      [email.toLowerCase()]
    )

    if (existing.rows.length > 0) {
      throw new Error('Account with this email already exists')
    }

    // Hash the recovery key hash (double-hash for storage)
    const storedHash = await bcrypt.hash(recoveryKeyHash, BCRYPT_ROUNDS)

    // Generate a BIP39-style recovery key (simplified - 24 random words)
    const recoveryKey = this.generateRecoveryKey()

    // Insert account
    const result = await this.pool.query<{ id: string }>(
      `INSERT INTO sync_accounts (email, wrapped_master_key, recovery_key_hash, tier, device_limit)
       VALUES ($1, $2, $3, 'free', 3)
       RETURNING id`,
      [email.toLowerCase(), wrappedMasterKey, storedHash]
    )

    return {
      accountId: result.rows[0].id,
      recoveryKey,
    }
  }

  /**
   * Generate a simplified recovery key (24 random words).
   * In production, use a proper BIP39 implementation.
   */
  private generateRecoveryKey(): string {
    // Simplified word list - in production use full BIP39 wordlist
    const words = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
      'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
      'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
      'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
      'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
      'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album',
      'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone',
      'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among',
    ]

    const selected: string[] = []
    for (let i = 0; i < 24; i++) {
      const randomIndex = crypto.randomInt(0, words.length)
      selected.push(words[randomIndex])
    }

    return selected.join(' ')
  }

  // ==========================================================================
  // AUTHENTICATION
  // ==========================================================================

  /**
   * Authenticate and get tokens for a device.
   * This is called after the client verifies they have the master key.
   */
  async login(request: LoginRequest): Promise<{ account: SyncAccount; tokens: DeviceToken }> {
    const { email, deviceId, deviceName, deviceType } = request

    // Get account
    const accountResult = await this.pool.query<{
      id: string
      email: string
      tier: 'free' | 'premium'
      device_limit: number | null
      created_at: Date
      last_sync_at: Date | null
    }>(
      `SELECT id, email, tier, device_limit, created_at, last_sync_at
       FROM sync_accounts
       WHERE email = $1 AND NOT is_archived`,
      [email.toLowerCase()]
    )

    if (accountResult.rows.length === 0) {
      throw new Error('Account not found')
    }

    const accountRow = accountResult.rows[0]

    // Register/update device (trigger will enforce limit)
    try {
      await this.pool.query(
        `INSERT INTO sync_devices (account_id, device_id, device_name, device_type, last_seen_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (account_id, device_id) DO UPDATE SET
           device_name = EXCLUDED.device_name,
           device_type = EXCLUDED.device_type,
           last_seen_at = NOW()`,
        [accountRow.id, deviceId, deviceName, deviceType]
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message.includes('DEVICE_LIMIT_EXCEEDED')) {
        throw new Error('Device limit exceeded. Upgrade to premium for unlimited devices.')
      }
      throw error
    }

    // Generate tokens
    const tokens = this.generateTokens(accountRow.id, deviceId, accountRow.email, accountRow.tier)

    const account: SyncAccount = {
      id: accountRow.id,
      email: accountRow.email,
      tier: accountRow.tier,
      deviceLimit: accountRow.device_limit,
      createdAt: accountRow.created_at.toISOString(),
      lastSyncAt: accountRow.last_sync_at?.toISOString() ?? null,
    }

    return { account, tokens }
  }

  /**
   * Refresh an access token using a refresh token.
   */
  async refreshToken(refreshToken: string): Promise<DeviceToken> {
    try {
      const payload = jwt.verify(refreshToken, this.jwtSecret) as JWTPayload

      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type')
      }

      // Verify account still exists and is not archived
      const accountResult = await this.pool.query<{
        email: string
        tier: 'free' | 'premium'
      }>(
        `SELECT email, tier FROM sync_accounts WHERE id = $1 AND NOT is_archived`,
        [payload.sub]
      )

      if (accountResult.rows.length === 0) {
        throw new Error('Account not found or archived')
      }

      const { email, tier } = accountResult.rows[0]

      // Generate new tokens
      return this.generateTokens(payload.sub, payload.deviceId, email, tier)
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired. Please log in again.')
      }
      throw error
    }
  }

  /**
   * Verify an access token and return the payload.
   */
  verifyToken(token: string): JWTPayload {
    const payload = jwt.verify(token, this.jwtSecret) as JWTPayload

    if (payload.type !== 'access') {
      throw new Error('Invalid token type')
    }

    return payload
  }

  /**
   * Generate access and refresh tokens.
   */
  private generateTokens(
    accountId: string,
    deviceId: string,
    email: string,
    tier: 'free' | 'premium'
  ): DeviceToken {
    const now = Math.floor(Date.now() / 1000)

    // Access token (1 hour)
    const accessPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: accountId,
      deviceId,
      email,
      tier,
      type: 'access',
    }

    const accessToken = jwt.sign(accessPayload, this.jwtSecret, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    })

    // Refresh token (30 days)
    const refreshPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: accountId,
      deviceId,
      email,
      tier,
      type: 'refresh',
    }

    const refreshToken = jwt.sign(refreshPayload, this.jwtSecret, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    })

    // Calculate expiration
    const expiresAt = new Date((now + 3600) * 1000).toISOString()

    return {
      token: accessToken,
      expiresAt,
      refreshToken,
    }
  }

  // ==========================================================================
  // ACCOUNT RECOVERY
  // ==========================================================================

  /**
   * Recover account access using recovery key.
   */
  async recoverAccount(request: RecoveryRequest): Promise<{ account: SyncAccount; tokens: DeviceToken; wrappedMasterKey: Buffer }> {
    const { email, recoveryKey, deviceId, deviceName, deviceType } = request

    // Get account with recovery info
    const accountResult = await this.pool.query<{
      id: string
      email: string
      tier: 'free' | 'premium'
      device_limit: number | null
      recovery_key_hash: string
      wrapped_master_key: Buffer
      created_at: Date
      last_sync_at: Date | null
    }>(
      `SELECT id, email, tier, device_limit, recovery_key_hash, wrapped_master_key, created_at, last_sync_at
       FROM sync_accounts
       WHERE email = $1`,
      [email.toLowerCase()]
    )

    if (accountResult.rows.length === 0) {
      throw new Error('Account not found')
    }

    const row = accountResult.rows[0]

    // Verify recovery key
    // Client sends hash of recovery key, we verify against stored double-hash
    const recoveryKeyHash = crypto.createHash('sha256').update(recoveryKey).digest('hex')
    const isValid = await bcrypt.compare(recoveryKeyHash, row.recovery_key_hash)

    if (!isValid) {
      throw new Error('Invalid recovery key')
    }

    // Unarchive if archived
    await this.pool.query(
      `UPDATE sync_accounts SET is_archived = FALSE WHERE id = $1`,
      [row.id]
    )

    // Register device
    await this.pool.query(
      `INSERT INTO sync_devices (account_id, device_id, device_name, device_type, last_seen_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (account_id, device_id) DO UPDATE SET
         device_name = EXCLUDED.device_name,
         device_type = EXCLUDED.device_type,
         last_seen_at = NOW()`,
      [row.id, deviceId, deviceName, deviceType]
    )

    // Generate tokens
    const tokens = this.generateTokens(row.id, deviceId, row.email, row.tier)

    const account: SyncAccount = {
      id: row.id,
      email: row.email,
      tier: row.tier,
      deviceLimit: row.device_limit,
      createdAt: row.created_at.toISOString(),
      lastSyncAt: row.last_sync_at?.toISOString() ?? null,
    }

    return {
      account,
      tokens,
      wrappedMasterKey: row.wrapped_master_key,
    }
  }

  // ==========================================================================
  // OAUTH
  // ==========================================================================

  /**
   * Link or create account via OAuth (Google).
   */
  async loginWithGoogle(
    googleId: string,
    email: string,
    deviceId: string,
    deviceName: string,
    deviceType: string
  ): Promise<{ account: SyncAccount; tokens: DeviceToken; isNewAccount: boolean }> {
    // Check if Google account is already linked
    let accountResult = await this.pool.query<{
      id: string
      email: string
      tier: 'free' | 'premium'
      device_limit: number | null
      created_at: Date
      last_sync_at: Date | null
    }>(
      `SELECT id, email, tier, device_limit, created_at, last_sync_at
       FROM sync_accounts
       WHERE google_id = $1`,
      [googleId]
    )

    let isNewAccount = false

    if (accountResult.rows.length === 0) {
      // Check if email exists (link Google to existing account)
      accountResult = await this.pool.query(
        `SELECT id, email, tier, device_limit, created_at, last_sync_at
         FROM sync_accounts
         WHERE email = $1`,
        [email.toLowerCase()]
      )

      if (accountResult.rows.length > 0) {
        // Link Google ID to existing account
        await this.pool.query(
          `UPDATE sync_accounts SET google_id = $1 WHERE id = $2`,
          [googleId, accountResult.rows[0].id]
        )
      } else {
        // Create new account
        isNewAccount = true
        const insertResult = await this.pool.query<{
          id: string
          email: string
          tier: 'free' | 'premium'
          device_limit: number | null
          created_at: Date
          last_sync_at: Date | null
        }>(
          `INSERT INTO sync_accounts (email, google_id, tier, device_limit)
           VALUES ($1, $2, 'free', 3)
           RETURNING id, email, tier, device_limit, created_at, last_sync_at`,
          [email.toLowerCase(), googleId]
        )
        accountResult = { rows: insertResult.rows, rowCount: 1, command: 'INSERT', oid: 0, fields: [] }
      }
    }

    const row = accountResult.rows[0]

    // Register device
    await this.pool.query(
      `INSERT INTO sync_devices (account_id, device_id, device_name, device_type, last_seen_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (account_id, device_id) DO UPDATE SET
         device_name = EXCLUDED.device_name,
         device_type = EXCLUDED.device_type,
         last_seen_at = NOW()`,
      [row.id, deviceId, deviceName, deviceType]
    )

    const tokens = this.generateTokens(row.id, deviceId, row.email, row.tier)

    const account: SyncAccount = {
      id: row.id,
      email: row.email,
      tier: row.tier,
      deviceLimit: row.device_limit,
      createdAt: row.created_at.toISOString(),
      lastSyncAt: row.last_sync_at?.toISOString() ?? null,
    }

    return { account, tokens, isNewAccount }
  }

  /**
   * Link or create account via OAuth (GitHub).
   */
  async loginWithGitHub(
    githubId: string,
    email: string,
    deviceId: string,
    deviceName: string,
    deviceType: string
  ): Promise<{ account: SyncAccount; tokens: DeviceToken; isNewAccount: boolean }> {
    // Similar to Google OAuth - check existing, link, or create
    let accountResult = await this.pool.query<{
      id: string
      email: string
      tier: 'free' | 'premium'
      device_limit: number | null
      created_at: Date
      last_sync_at: Date | null
    }>(
      `SELECT id, email, tier, device_limit, created_at, last_sync_at
       FROM sync_accounts
       WHERE github_id = $1`,
      [githubId]
    )

    let isNewAccount = false

    if (accountResult.rows.length === 0) {
      accountResult = await this.pool.query(
        `SELECT id, email, tier, device_limit, created_at, last_sync_at
         FROM sync_accounts
         WHERE email = $1`,
        [email.toLowerCase()]
      )

      if (accountResult.rows.length > 0) {
        await this.pool.query(
          `UPDATE sync_accounts SET github_id = $1 WHERE id = $2`,
          [githubId, accountResult.rows[0].id]
        )
      } else {
        isNewAccount = true
        const insertResult = await this.pool.query<{
          id: string
          email: string
          tier: 'free' | 'premium'
          device_limit: number | null
          created_at: Date
          last_sync_at: Date | null
        }>(
          `INSERT INTO sync_accounts (email, github_id, tier, device_limit)
           VALUES ($1, $2, 'free', 3)
           RETURNING id, email, tier, device_limit, created_at, last_sync_at`,
          [email.toLowerCase(), githubId]
        )
        accountResult = { rows: insertResult.rows, rowCount: 1, command: 'INSERT', oid: 0, fields: [] }
      }
    }

    const row = accountResult.rows[0]

    await this.pool.query(
      `INSERT INTO sync_devices (account_id, device_id, device_name, device_type, last_seen_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (account_id, device_id) DO UPDATE SET
         device_name = EXCLUDED.device_name,
         device_type = EXCLUDED.device_type,
         last_seen_at = NOW()`,
      [row.id, deviceId, deviceName, deviceType]
    )

    const tokens = this.generateTokens(row.id, deviceId, row.email, row.tier)

    const account: SyncAccount = {
      id: row.id,
      email: row.email,
      tier: row.tier,
      deviceLimit: row.device_limit,
      createdAt: row.created_at.toISOString(),
      lastSyncAt: row.last_sync_at?.toISOString() ?? null,
    }

    return { account, tokens, isNewAccount }
  }

  // ==========================================================================
  // TIER MANAGEMENT
  // ==========================================================================

  /**
   * Upgrade account to premium.
   */
  async upgradeToPremium(accountId: string, stripeCustomerId?: string): Promise<void> {
    await this.pool.query(
      `UPDATE sync_accounts
       SET tier = 'premium', device_limit = NULL, stripe_customer_id = COALESCE($2, stripe_customer_id)
       WHERE id = $1`,
      [accountId, stripeCustomerId]
    )
  }

  /**
   * Downgrade account to free tier.
   */
  async downgradeToFree(accountId: string): Promise<void> {
    await this.pool.query(
      `UPDATE sync_accounts
       SET tier = 'free', device_limit = 3
       WHERE id = $1`,
      [accountId]
    )
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  async close(): Promise<void> {
    await this.pool.end()
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let deviceAuthServiceInstance: DeviceAuthService | null = null

export function getDeviceAuthService(): DeviceAuthService {
  if (!deviceAuthServiceInstance) {
    const connectionString = process.env.DATABASE_URL || process.env.SYNC_DATABASE_URL
    const jwtSecret = process.env.JWT_SECRET || process.env.SYNC_JWT_SECRET

    if (!connectionString) {
      throw new Error('DATABASE_URL or SYNC_DATABASE_URL environment variable required')
    }
    if (!jwtSecret) {
      throw new Error('JWT_SECRET or SYNC_JWT_SECRET environment variable required')
    }

    deviceAuthServiceInstance = new DeviceAuthService(connectionString, jwtSecret)
  }
  return deviceAuthServiceInstance
}

export async function closeDeviceAuthService(): Promise<void> {
  if (deviceAuthServiceInstance) {
    await deviceAuthServiceInstance.close()
    deviceAuthServiceInstance = null
  }
}
