/**
 * API Token Storage
 * 
 * Manages API tokens with encrypted storage in SQLite.
 * Supports multiple active tokens per profile with labels and revocation.
 * 
 * @module lib/api/auth/tokenStorage
 */

import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '@/lib/codexDatabase'
import { logTokenCreated, logTokenRevoked, logTokenDeleted } from './auditLogger'

// ============================================================================
// TYPES
// ============================================================================

export interface APIToken {
  id: string
  profileId: string
  token: string
  tokenHash: string
  label: string
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string | null
  isActive: boolean
  usageCount: number
}

export interface TokenCreateInput {
  profileId: string
  label?: string
  expiresInDays?: number
}

export interface TokenValidationResult {
  valid: boolean
  token?: APIToken
  error?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TOKEN_PREFIX = 'fdev_'
const TOKEN_LENGTH = 40

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const randomBytes = new Uint8Array(TOKEN_LENGTH)
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes)
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < TOKEN_LENGTH; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256)
    }
  }
  
  let token = TOKEN_PREFIX
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    token += chars[randomBytes[i] % chars.length]
  }
  
  return token
}

/**
 * Hash a token for secure storage (we store hash, compare on validation)
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
  
  // Simple fallback hash for SSR
  let hash = 0
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

/**
 * Mask a token for display (show first 8, last 4 chars)
 */
export function maskToken(token: string): string {
  if (token.length <= 12) return '****'
  return `${token.slice(0, 8)}...${token.slice(-4)}`
}

// ============================================================================
// SCHEMA INITIALIZATION
// ============================================================================

let schemaInitialized = false

/**
 * Initialize the API tokens table
 */
export async function initTokenSchema(): Promise<void> {
  if (schemaInitialized) return
  
  const db = await getDatabase()
  if (!db) return
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS api_tokens (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_used_at TEXT,
      expires_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      usage_count INTEGER NOT NULL DEFAULT 0
    )
  `)
  
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_api_tokens_profile ON api_tokens(profile_id)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens(token_hash)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_api_tokens_active ON api_tokens(is_active)`)
  
  schemaInitialized = true
  console.log('[TokenStorage] Schema initialized')
}

// ============================================================================
// TOKEN OPERATIONS
// ============================================================================

/**
 * Create a new API token
 * Returns the raw token (only shown once)
 */
export async function createToken(input: TokenCreateInput): Promise<{ token: APIToken; rawToken: string }> {
  await initTokenSchema()
  
  const db = await getDatabase()
  if (!db) {
    throw new Error('Database not available')
  }
  
  const rawToken = generateSecureToken()
  const tokenHash = await hashToken(rawToken)
  const id = uuidv4()
  const now = new Date().toISOString()
  
  const expiresAt = input.expiresInDays 
    ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null
  
  const label = input.label || `API Token ${new Date().toLocaleDateString()}`
  
  await db.run(
    `INSERT INTO api_tokens (id, profile_id, token_hash, label, created_at, expires_at, is_active, usage_count)
     VALUES (?, ?, ?, ?, ?, ?, 1, 0)`,
    [id, input.profileId, tokenHash, label, now, expiresAt]
  )
  
  const token: APIToken = {
    id,
    profileId: input.profileId,
    token: maskToken(rawToken),
    tokenHash,
    label,
    createdAt: now,
    lastUsedAt: null,
    expiresAt,
    isActive: true,
    usageCount: 0
  }

  // Log token creation to audit trail
  await logTokenCreated(id, input.profileId, label, expiresAt || undefined)

  return { token, rawToken }
}

/**
 * Validate an API token and return the token record if valid
 */
export async function validateToken(rawToken: string): Promise<TokenValidationResult> {
  await initTokenSchema()
  
  const db = await getDatabase()
  if (!db) {
    return { valid: false, error: 'Database not available' }
  }
  
  // Check token format
  if (!rawToken.startsWith(TOKEN_PREFIX)) {
    return { valid: false, error: 'Invalid token format' }
  }
  
  const tokenHash = await hashToken(rawToken)
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await db.all(
    `SELECT * FROM api_tokens WHERE token_hash = ? AND is_active = 1`,
    [tokenHash]
  ) as any[]
  
  if (!rows || rows.length === 0) {
    return { valid: false, error: 'Token not found or revoked' }
  }
  
  const row = rows[0]
  
  // Check expiration
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return { valid: false, error: 'Token expired' }
  }
  
  // Update last used
  const now = new Date().toISOString()
  await db.run(
    `UPDATE api_tokens SET last_used_at = ?, usage_count = usage_count + 1 WHERE id = ?`,
    [now, row.id]
  )
  
  const token: APIToken = {
    id: row.id,
    profileId: row.profile_id,
    token: maskToken(rawToken),
    tokenHash: row.token_hash,
    label: row.label,
    createdAt: row.created_at,
    lastUsedAt: now,
    expiresAt: row.expires_at,
    isActive: row.is_active === 1,
    usageCount: row.usage_count + 1
  }
  
  return { valid: true, token }
}

/**
 * List all tokens for a profile (tokens are masked)
 */
export async function listTokens(profileId: string): Promise<APIToken[]> {
  await initTokenSchema()
  
  const db = await getDatabase()
  if (!db) return []
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await db.all(
    `SELECT * FROM api_tokens WHERE profile_id = ? ORDER BY created_at DESC`,
    [profileId]
  ) as any[]
  
  return (rows || []).map(row => ({
    id: row.id,
    profileId: row.profile_id,
    token: '****', // Always masked in list
    tokenHash: row.token_hash,
    label: row.label,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    isActive: row.is_active === 1,
    usageCount: row.usage_count
  }))
}

/**
 * Revoke a token
 */
export async function revokeToken(tokenId: string, profileId: string): Promise<boolean> {
  await initTokenSchema()

  const db = await getDatabase()
  if (!db) return false

  try {
    await db.run(
      `UPDATE api_tokens SET is_active = 0 WHERE id = ? AND profile_id = ?`,
      [tokenId, profileId]
    )

    // Log token revocation to audit trail
    await logTokenRevoked(tokenId, profileId)

    return true
  } catch {
    return false
  }
}

/**
 * Delete a token permanently
 */
export async function deleteToken(tokenId: string, profileId: string): Promise<boolean> {
  await initTokenSchema()

  const db = await getDatabase()
  if (!db) return false

  try {
    await db.run(
      `DELETE FROM api_tokens WHERE id = ? AND profile_id = ?`,
      [tokenId, profileId]
    )

    // Log token deletion to audit trail
    await logTokenDeleted(tokenId, profileId)

    return true
  } catch {
    return false
  }
}

/**
 * Check if a profile has any active tokens
 */
export async function hasActiveTokens(profileId: string): Promise<boolean> {
  await initTokenSchema()
  
  const db = await getDatabase()
  if (!db) return false
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await db.all(
    `SELECT COUNT(*) as count FROM api_tokens WHERE profile_id = ? AND is_active = 1`,
    [profileId]
  ) as any[]
  
  return (rows?.[0]?.count || 0) > 0
}

/**
 * Generate a default token for first-time users
 */
export async function ensureDefaultToken(profileId: string): Promise<{ token: APIToken; rawToken: string } | null> {
  const hasTokens = await hasActiveTokens(profileId)
  
  if (hasTokens) {
    return null
  }
  
  return createToken({
    profileId,
    label: 'Default API Token'
  })
}














