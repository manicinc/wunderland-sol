/**
 * License Service
 *
 * Handles license activation, validation, and feature gating.
 * Uses RSA signature verification via Web Crypto API.
 *
 * @module lib/license/licenseService
 */

import { getDatabase } from '@/lib/codexDatabase'
import {
  verifyGumroadLicense,
  isLicenseValid as isGumroadValid,
  type GumroadLicenseResponse,
} from '@/lib/config/gumroad'
import type {
  License,
  LicenseKey,
  LicensePayload,
  LicenseValidation,
  LicenseStatus,
  LicensedFeature,
  StoredLicense,
  ActivationRequest,
  ActivationResponse,
  MachineFingerprint,
  ILicenseService,
} from './types'
import { LICENSE_CACHE_DURATION } from './types'

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * RSA public key for license verification (PEM format)
 * In production, this would be your actual signing key's public component
 */
const LICENSE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0M7xQ2P4LnJ0V2FP2qTR
GZ2k5LqR5k0D8v6V7q5M3K6P4T1LN3X8Y9B2C4D5E6F7G8H9I0J1K2L3M4N5O6P7
Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3G4H5I6J7K8L9M0N1O2P3Q4R5S6T7U8V9
W0X1Y2Z3A4B5C6D7E8F9G0H1I2J3K4L5M6N7O8P9Q0R1S2T3U4V5W6X7Y8Z9A0B1
C2D3E4F5G6H7I8J9K0L1M2N3O4P5Q6R7S8T9U0V1W2X3Y4Z5A6B7C8D9E0F1G2H3
I4J5K6L7M8N9O0P1Q2R3S4T5U6V7W8X9Y0Z1A2B3C4D5E6F7G8H9I0J1K2L3M4N5
AQIDAQAB
-----END PUBLIC KEY-----`

/**
 * License server URL
 */
const LICENSE_SERVER = process.env.NEXT_PUBLIC_LICENSE_SERVER || 'https://license.frame.dev/api'

// ============================================================================
// LICENSE SERVICE
// ============================================================================

export class LicenseService implements ILicenseService {
  private static instance: LicenseService | null = null
  private cachedValidation: LicenseValidation | null = null
  private cachedAt: number = 0
  private publicKey: CryptoKey | null = null

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): LicenseService {
    if (!LicenseService.instance) {
      LicenseService.instance = new LicenseService()
    }
    return LicenseService.instance
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Check if a valid license is present
   */
  async hasValidLicense(): Promise<boolean> {
    const validation = await this.checkLicense()
    return validation.isValid
  }

  /**
   * Get current license validation
   */
  async checkLicense(): Promise<LicenseValidation> {
    // Return cached result if fresh
    if (this.cachedValidation && Date.now() - this.cachedAt < LICENSE_CACHE_DURATION) {
      return this.cachedValidation
    }

    try {
      // Load stored license
      const stored = await this.loadStoredLicense()

      if (!stored) {
        return this.createValidation('not_activated', false, null)
      }

      // Verify signature
      const isValid = await this.verifySignature(stored.license)
      if (!isValid) {
        return this.createValidation('invalid', false, stored.license)
      }

      // Check expiration
      if (stored.license.expiresAt > 0 && stored.license.expiresAt < Date.now()) {
        const daysRemaining = Math.floor((stored.license.expiresAt - Date.now()) / (24 * 60 * 60 * 1000))
        return this.createValidation('expired', false, stored.license, undefined, daysRemaining)
      }

      // Check machine binding
      const currentMachine = await this.getMachineFingerprint()
      if (stored.machineId && stored.machineId !== currentMachine.hardwareId) {
        return this.createValidation('machine_mismatch', false, stored.license)
      }

      // License is valid
      const daysRemaining = stored.license.expiresAt > 0
        ? Math.floor((stored.license.expiresAt - Date.now()) / (24 * 60 * 60 * 1000))
        : undefined

      const validation = this.createValidation('valid', true, stored.license, undefined, daysRemaining)

      // Cache result
      this.cachedValidation = validation
      this.cachedAt = Date.now()

      return validation
    } catch (error) {
      console.error('[LicenseService] Validation failed:', error)
      return this.createValidation('invalid', false, null, (error as Error).message)
    }
  }

  /**
   * Activate a license key (supports both Gumroad and custom RSA licenses)
   */
  async activate(licenseKey: LicenseKey): Promise<ActivationResponse> {
    // First, try Gumroad activation (format: XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX)
    if (this.isGumroadKey(licenseKey)) {
      return this.activateGumroad(licenseKey)
    }

    // Fall back to custom RSA license activation
    return this.activateCustom(licenseKey)
  }

  /**
   * Activate a Gumroad license key
   */
  async activateGumroad(licenseKey: LicenseKey): Promise<ActivationResponse> {
    try {
      // Verify with Gumroad API
      const gumroadResponse = await verifyGumroadLicense(licenseKey, true)

      if (!isGumroadValid(gumroadResponse)) {
        if (gumroadResponse.purchase?.refunded) {
          return { success: false, error: 'This license has been refunded' }
        }
        if (gumroadResponse.purchase?.chargebacked) {
          return { success: false, error: 'This license has been chargebacked' }
        }
        return { success: false, error: gumroadResponse.message || 'Invalid license key' }
      }

      // Get machine fingerprint
      const machine = await this.getMachineFingerprint()

      // Create license object from Gumroad response
      const license: License = {
        licenseId: gumroadResponse.purchase.id,
        type: 'premium',
        email: gumroadResponse.purchase.email,
        issuedAt: new Date(gumroadResponse.purchase.created_at).getTime(),
        expiresAt: 0, // Perpetual
        maxMachines: 3,
        features: ['quizzes', 'flashcards', 'qna', 'export', 'import', 'offline_storage', 'ai_generation', 'advanced_themes', 'desktop_app', 'mobile_app', 'priority_support'],
        signature: licenseKey, // Store the Gumroad key as signature
        version: 1,
      }

      // Store license
      await this.storeLicense({
        key: licenseKey,
        license,
        machineId: machine.hardwareId,
        activatedAt: Date.now(),
        lastValidated: Date.now(),
        cachedStatus: 'valid',
        isGumroad: true,
        gumroadUses: gumroadResponse.uses,
      })

      // Clear cache
      this.cachedValidation = null

      return {
        success: true,
        machineId: machine.hardwareId,
        remainingActivations: 3 - gumroadResponse.uses,
      }
    } catch (error) {
      console.error('[LicenseService] Gumroad activation failed:', error)
      return {
        success: false,
        error: (error as Error).message || 'Failed to verify license with Gumroad',
      }
    }
  }

  /**
   * Check if a license key is a Gumroad key
   */
  private isGumroadKey(key: string): boolean {
    // Gumroad keys are typically in format: XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX
    return /^[A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{8}$/i.test(key)
  }

  /**
   * Activate a custom RSA license key
   */
  private async activateCustom(licenseKey: LicenseKey): Promise<ActivationResponse> {
    try {
      // Decode license
      const license = this.decodeLicenseKey(licenseKey)
      if (!license) {
        return { success: false, error: 'Invalid license key format' }
      }

      // Verify signature locally first
      const isValid = await this.verifySignature(license)
      if (!isValid) {
        return { success: false, error: 'License signature verification failed' }
      }

      // Check expiration
      if (license.expiresAt > 0 && license.expiresAt < Date.now()) {
        return { success: false, error: 'License has expired' }
      }

      // Get machine fingerprint
      const machine = await this.getMachineFingerprint()

      // Online activation (if server available)
      let machineId = machine.hardwareId
      let remainingActivations: number | undefined

      if (this.isOnline()) {
        try {
          const response = await this.activateOnServer({
            licenseKey,
            machine,
          })

          if (!response.success) {
            return response
          }

          machineId = response.machineId || machineId
          remainingActivations = response.remainingActivations
        } catch {
          // Offline activation - allow but log
          console.warn('[LicenseService] Offline activation - server unavailable')
        }
      }

      // Store license
      await this.storeLicense({
        key: licenseKey,
        license,
        machineId,
        activatedAt: Date.now(),
        lastValidated: Date.now(),
        cachedStatus: 'valid',
      })

      // Clear cache
      this.cachedValidation = null

      return {
        success: true,
        machineId,
        remainingActivations,
      }
    } catch (error) {
      console.error('[LicenseService] Activation failed:', error)
      return {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  /**
   * Deactivate current license
   */
  async deactivate(): Promise<void> {
    const stored = await this.loadStoredLicense()

    if (stored && this.isOnline()) {
      try {
        // Notify server of deactivation
        await fetch(`${LICENSE_SERVER}/deactivate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            licenseId: stored.license.licenseId,
            machineId: stored.machineId,
          }),
        })
      } catch {
        // Continue with local deactivation even if server fails
        console.warn('[LicenseService] Server deactivation failed')
      }
    }

    // Remove stored license
    await this.clearStoredLicense()
    this.cachedValidation = null
  }

  /**
   * Check if a specific feature is licensed
   */
  async isFeatureLicensed(feature: LicensedFeature): Promise<boolean> {
    const validation = await this.checkLicense()
    return validation.enabledFeatures.includes(feature)
  }

  /**
   * Get list of enabled features
   */
  async getEnabledFeatures(): Promise<LicensedFeature[]> {
    const validation = await this.checkLicense()
    return validation.enabledFeatures
  }

  /**
   * Validate license with server (online check)
   */
  async validateOnline(): Promise<LicenseValidation> {
    if (!this.isOnline()) {
      return this.checkLicense()
    }

    const stored = await this.loadStoredLicense()
    if (!stored) {
      return this.createValidation('not_activated', false, null)
    }

    try {
      const response = await fetch(`${LICENSE_SERVER}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseId: stored.license.licenseId,
          machineId: stored.machineId,
        }),
      })

      const data = await response.json()

      if (!data.valid) {
        // Update stored status
        await this.updateStoredStatus(data.status)
        return this.createValidation(data.status, false, stored.license, data.error)
      }

      // Update validation timestamp
      await this.updateValidationTimestamp()

      const validation = this.createValidation('valid', true, stored.license)
      this.cachedValidation = validation
      this.cachedAt = Date.now()

      return validation
    } catch (error) {
      console.error('[LicenseService] Online validation failed:', error)
      // Fall back to local validation
      return this.checkLicense()
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Decode a base64 license key to License object
   */
  private decodeLicenseKey(key: LicenseKey): License | null {
    try {
      const json = atob(key)
      const license = JSON.parse(json) as License

      // Validate required fields
      if (!license.licenseId || !license.type || !license.signature) {
        return null
      }

      return license
    } catch {
      return null
    }
  }

  /**
   * Verify RSA signature of license
   */
  private async verifySignature(license: License): Promise<boolean> {
    try {
      // Get or import public key
      if (!this.publicKey) {
        this.publicKey = await this.importPublicKey()
      }

      // Extract payload (license without signature)
      const payload: LicensePayload = {
        licenseId: license.licenseId,
        type: license.type,
        email: license.email,
        issuedAt: license.issuedAt,
        expiresAt: license.expiresAt,
        maxMachines: license.maxMachines,
        features: license.features,
        version: license.version,
      }

      // Encode payload
      const encoder = new TextEncoder()
      const data = encoder.encode(JSON.stringify(payload))

      // Decode signature
      const signature = Uint8Array.from(atob(license.signature), c => c.charCodeAt(0))

      // Verify
      return await crypto.subtle.verify(
        { name: 'RSASSA-PKCS1-v1_5' },
        this.publicKey,
        signature,
        data
      )
    } catch (error) {
      console.error('[LicenseService] Signature verification failed:', error)
      return false
    }
  }

  /**
   * Import RSA public key for verification
   */
  private async importPublicKey(): Promise<CryptoKey> {
    // Remove PEM headers and decode
    const pemContents = LICENSE_PUBLIC_KEY
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .replace(/\s/g, '')

    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

    return await crypto.subtle.importKey(
      'spki',
      binaryKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    )
  }

  /**
   * Get machine fingerprint for binding
   */
  private async getMachineFingerprint(): Promise<MachineFingerprint> {
    const platform = this.detectPlatform()
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'node'

    // Generate hardware ID from available signals
    const signals = [
      platform,
      userAgent,
      typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '',
      typeof navigator !== 'undefined' ? navigator.language : '',
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ]

    const hardwareId = await this.hashString(signals.join('|'))

    return {
      platform,
      hardwareId,
      userAgent,
      generatedAt: Date.now(),
    }
  }

  /**
   * Detect current platform
   */
  private detectPlatform(): string {
    if (typeof window === 'undefined') return 'node'
    if ('__TAURI__' in window) return 'tauri'
    // @ts-expect-error - Electron detection
    if (window.electron) return 'electron'
    // @ts-expect-error - Capacitor detection
    if (window.Capacitor) return 'capacitor'
    if ('serviceWorker' in navigator) return 'pwa'
    return 'web'
  }

  /**
   * Hash a string using SHA-256
   */
  private async hashString(data: string): Promise<string> {
    const encoder = new TextEncoder()
    const buffer = encoder.encode(data)
    const hash = await crypto.subtle.digest('SHA-256', buffer)
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  /**
   * Check if online
   */
  private isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  }

  /**
   * Activate license on server
   */
  private async activateOnServer(request: ActivationRequest): Promise<ActivationResponse> {
    const response = await fetch(`${LICENSE_SERVER}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || 'Activation failed')
    }

    return await response.json()
  }

  /**
   * Create validation result
   */
  private createValidation(
    status: LicenseStatus,
    isValid: boolean,
    license: License | null,
    error?: string,
    daysRemaining?: number
  ): LicenseValidation {
    const enabledFeatures: LicensedFeature[] = isValid && license
      ? license.features
      : []

    return {
      status,
      isValid,
      license,
      error,
      daysRemaining,
      enabledFeatures,
      validatedAt: Date.now(),
    }
  }

  // ==========================================================================
  // STORAGE OPERATIONS
  // ==========================================================================

  /**
   * Load stored license from database
   */
  private async loadStoredLicense(): Promise<StoredLicense | null> {
    try {
      const db = await getDatabase()
      if (!db) return null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await db.all(
        'SELECT value FROM settings WHERE key = ?',
        ['license']
      ) as any[] | null
      if (!rows || rows.length === 0) return null
      return JSON.parse(rows[0].value as string)
    } catch {
      return null
    }
  }

  /**
   * Store license in database
   */
  private async storeLicense(stored: StoredLicense): Promise<void> {
    const db = await getDatabase()
    if (!db) throw new Error('Database not available')
    await db.run(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
      ['license', JSON.stringify(stored), new Date().toISOString()]
    )
  }

  /**
   * Clear stored license
   */
  private async clearStoredLicense(): Promise<void> {
    const db = await getDatabase()
    if (!db) return
    await db.run('DELETE FROM settings WHERE key = ?', ['license'])
  }

  /**
   * Update stored license status
   */
  private async updateStoredStatus(status: LicenseStatus): Promise<void> {
    const stored = await this.loadStoredLicense()
    if (stored) {
      stored.cachedStatus = status
      await this.storeLicense(stored)
    }
  }

  /**
   * Update validation timestamp
   */
  private async updateValidationTimestamp(): Promise<void> {
    const stored = await this.loadStoredLicense()
    if (stored) {
      stored.lastValidated = Date.now()
      await this.storeLicense(stored)
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Get license service instance
 */
export function getLicenseService(): LicenseService {
  return LicenseService.getInstance()
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useEffect, useCallback } from 'react'

/**
 * Hook for accessing license status
 */
export function useLicense(): {
  isLoading: boolean
  isValid: boolean
  status: LicenseStatus
  license: License | null
  daysRemaining?: number
  enabledFeatures: LicensedFeature[]
  activate: (key: LicenseKey) => Promise<ActivationResponse>
  deactivate: () => Promise<void>
  refresh: () => Promise<void>
} {
  const [isLoading, setIsLoading] = useState(true)
  const [validation, setValidation] = useState<LicenseValidation | null>(null)

  const loadLicense = useCallback(async () => {
    setIsLoading(true)
    try {
      const service = getLicenseService()
      const result = await service.checkLicense()
      setValidation(result)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLicense()
  }, [loadLicense])

  const activate = useCallback(async (key: LicenseKey): Promise<ActivationResponse> => {
    const service = getLicenseService()
    const result = await service.activate(key)
    if (result.success) {
      await loadLicense()
    }
    return result
  }, [loadLicense])

  const deactivate = useCallback(async (): Promise<void> => {
    const service = getLicenseService()
    await service.deactivate()
    await loadLicense()
  }, [loadLicense])

  return {
    isLoading,
    isValid: validation?.isValid ?? false,
    status: validation?.status ?? 'not_activated',
    license: validation?.license ?? null,
    daysRemaining: validation?.daysRemaining,
    enabledFeatures: validation?.enabledFeatures ?? [],
    activate,
    deactivate,
    refresh: loadLicense,
  }
}

/**
 * Hook for checking if a specific feature is licensed
 */
export function useLicensedFeature(feature: LicensedFeature): {
  isLicensed: boolean
  isLoading: boolean
} {
  const [isLicensed, setIsLicensed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function check() {
      setIsLoading(true)
      try {
        const service = getLicenseService()
        const result = await service.isFeatureLicensed(feature)
        setIsLicensed(result)
      } finally {
        setIsLoading(false)
      }
    }
    check()
  }, [feature])

  return { isLicensed, isLoading }
}
