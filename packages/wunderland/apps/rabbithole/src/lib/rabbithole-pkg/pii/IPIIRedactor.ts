/**
 * @fileoverview PII Redaction Interface
 * @module @framers/rabbithole/pii
 *
 * Defines the interface for PII detection and redaction services.
 */

/**
 * Types of PII that can be detected and redacted.
 */
export type PIIType =
  | 'email'
  | 'phone'
  | 'ssn'
  | 'credit_card'
  | 'address'
  | 'name'
  | 'date_of_birth'
  | 'ip_address'
  | 'passport'
  | 'driver_license'
  | 'bank_account'
  | 'custom';

/**
 * A detected PII entity within text.
 */
export interface PIIEntity {
  /** Type of PII detected */
  type: PIIType;
  /** Original value (before redaction) */
  originalValue: string;
  /** Redacted/masked value */
  redactedValue: string;
  /** Start position in original text */
  startIndex: number;
  /** End position in original text */
  endIndex: number;
  /** Confidence score (0.0-1.0) */
  confidence: number;
  /** Vault token for retrieving original value */
  vaultToken?: string;
}

/**
 * Result of PII redaction operation.
 */
export interface RedactionResult {
  /** The text with PII redacted */
  redactedText: string;
  /** List of detected and redacted PII entities */
  entities: PIIEntity[];
  /** Whether any PII was found */
  hasPII: boolean;
  /** Processing timestamp */
  processedAt: Date;
}

/**
 * Configuration for PII redaction behavior.
 */
export interface PIIRedactionConfig {
  /** Which PII types to detect and redact */
  enabledTypes: PIIType[];
  /** Whether to store originals in vault */
  storeInVault: boolean;
  /** Custom patterns for detection */
  customPatterns?: CustomPIIPattern[];
  /** Masking style for each type */
  maskingStyles?: Partial<Record<PIIType, MaskingStyle>>;
  /** Minimum confidence threshold for redaction */
  confidenceThreshold?: number;
}

/**
 * Custom pattern for PII detection.
 */
export interface CustomPIIPattern {
  /** Unique identifier for this pattern */
  id: string;
  /** Human-readable name */
  name: string;
  /** Regular expression pattern */
  pattern: RegExp;
  /** PII type (use 'custom' for custom patterns) */
  type: PIIType;
  /** Masking style to use */
  maskingStyle: MaskingStyle;
}

/**
 * Style for masking PII values.
 */
export type MaskingStyle =
  | 'full'           // Replace entirely: ********
  | 'partial'        // Show first/last chars: j***@example.com
  | 'type_label'     // Replace with type: [EMAIL]
  | 'hash'           // Replace with hash: #a1b2c3
  | 'custom';        // Custom replacement

/**
 * Interface for PII redaction services.
 */
export interface IPIIRedactor {
  /**
   * Detects and redacts PII from text.
   *
   * @param text - The text to scan and redact
   * @param config - Optional configuration overrides
   * @returns Redaction result with masked text and entity details
   */
  redact(text: string, config?: Partial<PIIRedactionConfig>): Promise<RedactionResult>;

  /**
   * Detects PII without redacting.
   *
   * @param text - The text to scan
   * @param config - Optional configuration overrides
   * @returns List of detected PII entities
   */
  detect(text: string, config?: Partial<PIIRedactionConfig>): Promise<PIIEntity[]>;

  /**
   * Retrieves original value from vault (requires break-glass access).
   *
   * @param vaultToken - Token for the stored value
   * @param requesterId - ID of user/agent requesting access
   * @param reason - Justification for break-glass access
   * @returns Original value if access granted
   */
  retrieveOriginal(
    vaultToken: string,
    requesterId: string,
    reason: string
  ): Promise<string | null>;

  /**
   * Updates redaction configuration.
   *
   * @param config - New configuration settings
   */
  configure(config: Partial<PIIRedactionConfig>): void;

  /**
   * Gets current configuration.
   */
  getConfig(): PIIRedactionConfig;
}
