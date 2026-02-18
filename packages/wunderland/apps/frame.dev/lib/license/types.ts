/**
 * License Types
 *
 * Type definitions for the license validation system.
 * Supports perpetual and trial licenses with optional machine binding.
 *
 * @module lib/license/types
 */

// ============================================================================
// LICENSE TYPES
// ============================================================================

/**
 * License type enumeration
 */
export type LicenseType = 'premium' | 'trial' | 'educational'

/**
 * License status
 */
export type LicenseStatus =
  | 'valid'
  | 'expired'
  | 'invalid'
  | 'revoked'
  | 'machine_mismatch'
  | 'not_activated'

/**
 * Features that can be unlocked by license
 */
export type LicensedFeature =
  | 'quizzes'
  | 'flashcards'
  | 'qna'
  | 'export'
  | 'import'
  | 'advanced_themes'
  | 'desktop_app'
  | 'mobile_app'
  | 'priority_support'
  | 'offline_storage'
  | 'ai_generation'

// ============================================================================
// LICENSE DATA
// ============================================================================

/**
 * Core license data (unsigned payload)
 */
export interface LicensePayload {
  /** Unique license identifier */
  licenseId: string

  /** License type */
  type: LicenseType

  /** Email associated with license */
  email: string

  /** Timestamp when license was issued (ms) */
  issuedAt: number

  /** Expiration timestamp (ms), 0 = perpetual */
  expiresAt: number

  /** Maximum number of machines (0 = unlimited) */
  maxMachines: number

  /** Features enabled by this license */
  features: LicensedFeature[]

  /** License version for format compatibility */
  version: number
}

/**
 * Complete license with signature
 */
export interface License extends LicensePayload {
  /** RSA signature of payload */
  signature: string
}

/**
 * Encoded license key (base64 encoded License)
 */
export type LicenseKey = string

// ============================================================================
// ACTIVATION & VALIDATION
// ============================================================================

/**
 * Machine fingerprint for binding
 */
export interface MachineFingerprint {
  /** Platform identifier */
  platform: string

  /** Hardware/browser fingerprint */
  hardwareId: string

  /** User agent or app version */
  userAgent: string

  /** Timestamp when fingerprint was generated */
  generatedAt: number
}

/**
 * Activation request sent to license server
 */
export interface ActivationRequest {
  /** License key to activate */
  licenseKey: LicenseKey

  /** Machine to bind to */
  machine: MachineFingerprint
}

/**
 * Activation response from license server
 */
export interface ActivationResponse {
  /** Whether activation succeeded */
  success: boolean

  /** Activated machine ID (if success) */
  machineId?: string

  /** Error message (if failure) */
  error?: string

  /** Remaining activations */
  remainingActivations?: number
}

/**
 * License validation result
 */
export interface LicenseValidation {
  /** Current status */
  status: LicenseStatus

  /** Whether license is currently valid */
  isValid: boolean

  /** License data (if valid/expired) */
  license: License | null

  /** Error message (if invalid) */
  error?: string

  /** Days until expiration (negative = expired) */
  daysRemaining?: number

  /** Features enabled by license */
  enabledFeatures: LicensedFeature[]

  /** Timestamp of last validation */
  validatedAt: number
}

// ============================================================================
// STORAGE
// ============================================================================

/**
 * Stored license data (in settings database)
 */
export interface StoredLicense {
  /** The license key */
  key: LicenseKey

  /** Decoded license data */
  license: License

  /** Machine ID from activation */
  machineId: string

  /** When license was activated */
  activatedAt: number

  /** Last successful validation */
  lastValidated: number

  /** Cached validation result */
  cachedStatus: LicenseStatus

  /** Whether this is a Gumroad license */
  isGumroad?: boolean

  /** Gumroad activation count */
  gumroadUses?: number
}

// ============================================================================
// SERVICE INTERFACE
// ============================================================================

/**
 * License service interface
 */
export interface ILicenseService {
  /** Check if a valid license is present */
  hasValidLicense(): Promise<boolean>

  /** Get current license validation */
  checkLicense(): Promise<LicenseValidation>

  /** Activate a license key */
  activate(licenseKey: LicenseKey): Promise<ActivationResponse>

  /** Deactivate current license */
  deactivate(): Promise<void>

  /** Check if a specific feature is licensed */
  isFeatureLicensed(feature: LicensedFeature): Promise<boolean>

  /** Get list of enabled features */
  getEnabledFeatures(): Promise<LicensedFeature[]>

  /** Validate license with server (online check) */
  validateOnline(): Promise<LicenseValidation>
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default features for each license type
 */
export const LICENSE_TYPE_FEATURES: Record<LicenseType, LicensedFeature[]> = {
  premium: [
    'quizzes',
    'flashcards',
    'qna',
    'export',
    'import',
    'advanced_themes',
    'desktop_app',
    'mobile_app',
    'priority_support',
    'offline_storage',
    'ai_generation',
  ],
  trial: [
    'quizzes',
    'flashcards',
    'qna',
    'export',
    'import',
  ],
  educational: [
    'quizzes',
    'flashcards',
    'qna',
    'export',
    'import',
    'advanced_themes',
  ],
}

/**
 * Trial period in days
 */
export const TRIAL_PERIOD_DAYS = 14

/**
 * How long to cache license validation (ms)
 */
export const LICENSE_CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

/**
 * How often to revalidate online (ms)
 */
export const LICENSE_REVALIDATION_INTERVAL = 7 * 24 * 60 * 60 * 1000 // 7 days
