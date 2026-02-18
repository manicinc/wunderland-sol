/**
 * License Key Service
 *
 * Handles generation and validation of license keys for lifetime purchases.
 * Keys are self-issued and stored as hashes in our database.
 *
 * Flow:
 * 1. Stripe Checkout completes for lifetime purchase
 * 2. Webhook triggers license key generation
 * 3. Key is hashed and stored, original is emailed to user
 * 4. User enters key in app → we hash and verify → activate premium
 *
 * @module lib/api/services/licenseService
 */

import { Pool } from 'pg'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'

// ============================================================================
// TYPES
// ============================================================================

export interface LicenseKey {
  id: string
  accountId: string | null
  keyHash: string
  stripePaymentId: string | null
  email: string
  createdAt: string
  activatedAt: string | null
  revokedAt: string | null
}

export interface LicenseValidationResult {
  valid: boolean
  licenseId?: string
  email?: string
  error?: string
}

export interface CreateLicenseResult {
  licenseId: string
  licenseKey: string  // Plain text key - show to user ONCE
  email: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BCRYPT_ROUNDS = 12
const KEY_PREFIX = 'QUARRY'
const KEY_SEGMENT_LENGTH = 4
const KEY_SEGMENTS = 4  // QUARRY-XXXX-XXXX-XXXX-XXXX

// ============================================================================
// LICENSE SERVICE
// ============================================================================

export class LicenseService {
  private pool: Pool

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
    })
  }

  // ==========================================================================
  // KEY GENERATION
  // ==========================================================================

  /**
   * Generate a new license key for a purchase.
   * Returns the plain text key (to be emailed to user) and stores the hash.
   */
  async createLicense(
    email: string,
    stripePaymentId?: string
  ): Promise<CreateLicenseResult> {
    // Generate cryptographically random key
    const licenseKey = this.generateLicenseKey()

    // Hash the key for storage
    const keyHash = await bcrypt.hash(licenseKey, BCRYPT_ROUNDS)

    // Store in database
    const result = await this.pool.query<{ id: string }>(
      `INSERT INTO license_keys (email, key_hash, stripe_payment_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [email.toLowerCase(), keyHash, stripePaymentId]
    )

    return {
      licenseId: result.rows[0].id,
      licenseKey,  // Plain text - send to user
      email: email.toLowerCase(),
    }
  }

  /**
   * Generate a license key in format: QUARRY-XXXX-XXXX-XXXX-XXXX
   */
  private generateLicenseKey(): string {
    const segments: string[] = [KEY_PREFIX]

    for (let i = 0; i < KEY_SEGMENTS; i++) {
      // Generate random alphanumeric segment (uppercase)
      const segment = crypto.randomBytes(KEY_SEGMENT_LENGTH)
        .toString('base64')
        .replace(/[^A-Z0-9]/gi, '')
        .substring(0, KEY_SEGMENT_LENGTH)
        .toUpperCase()
      segments.push(segment)
    }

    return segments.join('-')
  }

  // ==========================================================================
  // KEY VALIDATION
  // ==========================================================================

  /**
   * Validate a license key entered by user.
   * If valid, can optionally activate it for an account.
   */
  async validateKey(licenseKey: string): Promise<LicenseValidationResult> {
    // Normalize input
    const normalizedKey = licenseKey.trim().toUpperCase()

    // Basic format check
    if (!this.isValidKeyFormat(normalizedKey)) {
      return {
        valid: false,
        error: 'Invalid key format. Expected: QUARRY-XXXX-XXXX-XXXX-XXXX',
      }
    }

    // Get all unrevoked, unactivated license keys
    const result = await this.pool.query<{
      id: string
      key_hash: string
      email: string
      activated_at: Date | null
      revoked_at: Date | null
    }>(
      `SELECT id, key_hash, email, activated_at, revoked_at
       FROM license_keys
       WHERE revoked_at IS NULL`
    )

    // Check each key (bcrypt compare is slow, but we have few keys)
    for (const row of result.rows) {
      const isMatch = await bcrypt.compare(normalizedKey, row.key_hash)
      if (isMatch) {
        if (row.revoked_at) {
          return {
            valid: false,
            error: 'This license key has been revoked',
          }
        }

        if (row.activated_at) {
          return {
            valid: false,
            licenseId: row.id,
            email: row.email,
            error: 'This license key has already been activated',
          }
        }

        return {
          valid: true,
          licenseId: row.id,
          email: row.email,
        }
      }
    }

    return {
      valid: false,
      error: 'Invalid license key',
    }
  }

  /**
   * Check if key has valid format.
   */
  private isValidKeyFormat(key: string): boolean {
    const pattern = new RegExp(
      `^${KEY_PREFIX}(-[A-Z0-9]{${KEY_SEGMENT_LENGTH}}){${KEY_SEGMENTS}}$`
    )
    return pattern.test(key)
  }

  // ==========================================================================
  // KEY ACTIVATION
  // ==========================================================================

  /**
   * Activate a license key for an account.
   * This upgrades the account to premium with unlimited devices.
   */
  async activateLicense(
    licenseKey: string,
    accountId: string
  ): Promise<{ success: boolean; error?: string }> {
    const validation = await this.validateKey(licenseKey)

    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      // Mark license as activated
      await client.query(
        `UPDATE license_keys
         SET account_id = $1, activated_at = NOW()
         WHERE id = $2`,
        [accountId, validation.licenseId]
      )

      // Upgrade account to premium (lifetime = no expiry)
      await client.query(
        `UPDATE sync_accounts
         SET tier = 'premium', device_limit = NULL, premium_expires_at = NULL
         WHERE id = $1`,
        [accountId]
      )

      await client.query('COMMIT')

      return { success: true }
    } catch (error) {
      await client.query('ROLLBACK')
      const message = error instanceof Error ? error.message : 'Activation failed'
      return { success: false, error: message }
    } finally {
      client.release()
    }
  }

  // ==========================================================================
  // KEY MANAGEMENT
  // ==========================================================================

  /**
   * Revoke a license key (e.g., for refund or abuse).
   * Also downgrades the associated account if activated.
   */
  async revokeLicense(licenseId: string): Promise<{ success: boolean; error?: string }> {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      // Get license info
      const licenseResult = await client.query<{
        account_id: string | null
      }>(
        `SELECT account_id FROM license_keys WHERE id = $1`,
        [licenseId]
      )

      if (licenseResult.rows.length === 0) {
        return { success: false, error: 'License not found' }
      }

      const accountId = licenseResult.rows[0].account_id

      // Revoke the license
      await client.query(
        `UPDATE license_keys SET revoked_at = NOW() WHERE id = $1`,
        [licenseId]
      )

      // Downgrade account if it was activated
      if (accountId) {
        // Check if account has any other active licenses
        const otherLicenses = await client.query<{ count: string }>(
          `SELECT COUNT(*) as count
           FROM license_keys
           WHERE account_id = $1 AND id != $2 AND revoked_at IS NULL`,
          [accountId, licenseId]
        )

        if (parseInt(otherLicenses.rows[0].count) === 0) {
          // No other licenses - downgrade to free
          await client.query(
            `UPDATE sync_accounts
             SET tier = 'free', device_limit = 3
             WHERE id = $1`,
            [accountId]
          )
        }
      }

      await client.query('COMMIT')

      return { success: true }
    } catch (error) {
      await client.query('ROLLBACK')
      const message = error instanceof Error ? error.message : 'Revocation failed'
      return { success: false, error: message }
    } finally {
      client.release()
    }
  }

  /**
   * Get license info by ID.
   */
  async getLicense(licenseId: string): Promise<LicenseKey | null> {
    const result = await this.pool.query<{
      id: string
      account_id: string | null
      key_hash: string
      stripe_payment_id: string | null
      email: string
      created_at: Date
      activated_at: Date | null
      revoked_at: Date | null
    }>(
      `SELECT id, account_id, key_hash, stripe_payment_id, email, created_at, activated_at, revoked_at
       FROM license_keys
       WHERE id = $1`,
      [licenseId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      accountId: row.account_id,
      keyHash: row.key_hash,
      stripePaymentId: row.stripe_payment_id,
      email: row.email,
      createdAt: row.created_at.toISOString(),
      activatedAt: row.activated_at?.toISOString() ?? null,
      revokedAt: row.revoked_at?.toISOString() ?? null,
    }
  }

  /**
   * Get all licenses for an account.
   */
  async getAccountLicenses(accountId: string): Promise<LicenseKey[]> {
    const result = await this.pool.query<{
      id: string
      account_id: string | null
      key_hash: string
      stripe_payment_id: string | null
      email: string
      created_at: Date
      activated_at: Date | null
      revoked_at: Date | null
    }>(
      `SELECT id, account_id, key_hash, stripe_payment_id, email, created_at, activated_at, revoked_at
       FROM license_keys
       WHERE account_id = $1
       ORDER BY created_at DESC`,
      [accountId]
    )

    return result.rows.map(row => ({
      id: row.id,
      accountId: row.account_id,
      keyHash: row.key_hash,
      stripePaymentId: row.stripe_payment_id,
      email: row.email,
      createdAt: row.created_at.toISOString(),
      activatedAt: row.activated_at?.toISOString() ?? null,
      revokedAt: row.revoked_at?.toISOString() ?? null,
    }))
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

let licenseServiceInstance: LicenseService | null = null

export function getLicenseService(): LicenseService {
  if (!licenseServiceInstance) {
    const connectionString = process.env.DATABASE_URL || process.env.SYNC_DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL or SYNC_DATABASE_URL environment variable required')
    }
    licenseServiceInstance = new LicenseService(connectionString)
  }
  return licenseServiceInstance
}

export async function closeLicenseService(): Promise<void> {
  if (licenseServiceInstance) {
    await licenseServiceInstance.close()
    licenseServiceInstance = null
  }
}
