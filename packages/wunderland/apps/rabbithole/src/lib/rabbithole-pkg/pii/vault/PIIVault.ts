/**
 * @fileoverview Secure PII Vault for storing original values
 * @module @framers/rabbithole/pii/vault
 *
 * Provides secure storage for original PII values with access controls.
 */

import { createHmac, randomBytes } from 'crypto';
import type { PIIType } from '../IPIIRedactor.js';

/**
 * Entry stored in the PII vault.
 */
export interface VaultEntry {
  /** Unique token for retrieval */
  token: string;
  /** Encrypted original value */
  encryptedValue: string;
  /** Type of PII */
  piiType: PIIType;
  /** When the entry was created */
  createdAt: Date;
  /** When the entry expires */
  expiresAt: Date;
  /** Tenant that owns this data */
  tenantId: string;
  /** Channel where the data originated */
  channelId: string;
  /** User ID who sent the original data */
  userId: string;
  /** Hash of original for verification */
  valueHash: string;
}

/**
 * Access log entry for audit trail.
 */
export interface VaultAccessLog {
  /** Vault token accessed */
  token: string;
  /** Who accessed it */
  requesterId: string;
  /** Reason provided */
  reason: string;
  /** Access type */
  accessType: 'retrieve' | 'break_glass';
  /** Whether access was granted */
  granted: boolean;
  /** Timestamp */
  timestamp: Date;
  /** IP address if available */
  ipAddress?: string;
}

/**
 * Configuration for the PII vault.
 */
export interface PIIVaultConfig {
  /** Secret key for encryption */
  encryptionKey: string;
  /** Default TTL for entries in milliseconds */
  defaultTTL: number;
  /** Maximum entries to store (LRU eviction) */
  maxEntries: number;
  /** Whether to log all access attempts */
  enableAccessLogging: boolean;
}

/**
 * Secure vault for storing original PII values.
 *
 * In production, this would use a proper encryption service
 * and persistent storage (e.g., HashiCorp Vault, AWS KMS).
 *
 * @example
 * ```typescript
 * const vault = new PIIVault({
 *   encryptionKey: process.env.PII_VAULT_KEY!,
 *   defaultTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
 *   maxEntries: 100000,
 *   enableAccessLogging: true,
 * });
 *
 * const token = await vault.store({
 *   value: 'john@example.com',
 *   piiType: 'email',
 *   tenantId: 'acme-corp',
 *   channelId: 'slack-123',
 *   userId: 'U123',
 * });
 * ```
 */
export class PIIVault {
  private entries: Map<string, VaultEntry> = new Map();
  private accessLogs: VaultAccessLog[] = [];
  private config: PIIVaultConfig;

  constructor(config: PIIVaultConfig) {
    this.config = config;

    // Start cleanup timer for expired entries
    setInterval(() => this.cleanupExpired(), 60000); // Every minute
  }

  /**
   * Stores a PII value in the vault.
   */
  async store(params: {
    value: string;
    piiType: PIIType;
    tenantId: string;
    channelId: string;
    userId: string;
    ttl?: number;
  }): Promise<string> {
    // Enforce max entries (LRU eviction)
    if (this.entries.size >= this.config.maxEntries) {
      this.evictOldest();
    }

    const token = this.generateToken();
    const encryptedValue = this.encrypt(params.value);
    const valueHash = this.hash(params.value);

    const entry: VaultEntry = {
      token,
      encryptedValue,
      piiType: params.piiType,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (params.ttl ?? this.config.defaultTTL)),
      tenantId: params.tenantId,
      channelId: params.channelId,
      userId: params.userId,
      valueHash,
    };

    this.entries.set(token, entry);

    return token;
  }

  /**
   * Retrieves a value from the vault (standard access).
   *
   * Standard access is for automated systems that need the original
   * value for processing (e.g., sending an email to the actual address).
   */
  async retrieve(
    token: string,
    requesterId: string,
    reason: string
  ): Promise<string | null> {
    const entry = this.entries.get(token);

    if (!entry) {
      this.logAccess(token, requesterId, reason, 'retrieve', false);
      return null;
    }

    // Check expiration
    if (new Date() > entry.expiresAt) {
      this.entries.delete(token);
      this.logAccess(token, requesterId, reason, 'retrieve', false);
      return null;
    }

    this.logAccess(token, requesterId, reason, 'retrieve', true);

    return this.decrypt(entry.encryptedValue);
  }

  /**
   * Gets entry metadata without decrypting the value.
   */
  getMetadata(token: string): Omit<VaultEntry, 'encryptedValue'> | null {
    const entry = this.entries.get(token);
    if (!entry) return null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { encryptedValue, ...metadata } = entry;
    return metadata;
  }

  /**
   * Checks if a token exists and is valid.
   */
  isValid(token: string): boolean {
    const entry = this.entries.get(token);
    if (!entry) return false;
    return new Date() <= entry.expiresAt;
  }

  /**
   * Deletes an entry from the vault.
   */
  async delete(token: string): Promise<boolean> {
    return this.entries.delete(token);
  }

  /**
   * Gets access logs for audit purposes.
   */
  getAccessLogs(filter?: {
    token?: string;
    requesterId?: string;
    startDate?: Date;
    endDate?: Date;
  }): VaultAccessLog[] {
    let logs = [...this.accessLogs];

    if (filter?.token) {
      logs = logs.filter((l) => l.token === filter.token);
    }
    if (filter?.requesterId) {
      logs = logs.filter((l) => l.requesterId === filter.requesterId);
    }
    if (filter?.startDate) {
      logs = logs.filter((l) => l.timestamp >= filter.startDate!);
    }
    if (filter?.endDate) {
      logs = logs.filter((l) => l.timestamp <= filter.endDate!);
    }

    return logs;
  }

  /**
   * Gets vault statistics.
   */
  getStats(): {
    totalEntries: number;
    entriesByType: Record<PIIType, number>;
    totalAccessLogs: number;
    oldestEntry: Date | null;
  } {
    const entriesByType: Record<string, number> = {};

    let oldestEntry: Date | null = null;

    for (const entry of this.entries.values()) {
      entriesByType[entry.piiType] = (entriesByType[entry.piiType] ?? 0) + 1;

      if (!oldestEntry || entry.createdAt < oldestEntry) {
        oldestEntry = entry.createdAt;
      }
    }

    return {
      totalEntries: this.entries.size,
      entriesByType: entriesByType as Record<PIIType, number>,
      totalAccessLogs: this.accessLogs.length,
      oldestEntry,
    };
  }

  private generateToken(): string {
    return `pii_${randomBytes(24).toString('hex')}`;
  }

  private encrypt(value: string): string {
    // Simple XOR encryption for demo purposes
    // In production, use AES-256-GCM or similar
    const key = this.config.encryptionKey;
    let result = '';

    for (let i = 0; i < value.length; i++) {
      const charCode = value.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }

    return Buffer.from(result).toString('base64');
  }

  private decrypt(encryptedValue: string): string {
    const value = Buffer.from(encryptedValue, 'base64').toString();
    const key = this.config.encryptionKey;
    let result = '';

    for (let i = 0; i < value.length; i++) {
      const charCode = value.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }

    return result;
  }

  private hash(value: string): string {
    return createHmac('sha256', this.config.encryptionKey)
      .update(value)
      .digest('hex');
  }

  private logAccess(
    token: string,
    requesterId: string,
    reason: string,
    accessType: 'retrieve' | 'break_glass',
    granted: boolean
  ): void {
    if (!this.config.enableAccessLogging) return;

    this.accessLogs.push({
      token,
      requesterId,
      reason,
      accessType,
      granted,
      timestamp: new Date(),
    });

    // Keep only last 10000 logs
    if (this.accessLogs.length > 10000) {
      this.accessLogs = this.accessLogs.slice(-10000);
    }
  }

  private cleanupExpired(): void {
    const now = new Date();

    for (const [token, entry] of this.entries) {
      if (now > entry.expiresAt) {
        this.entries.delete(token);
      }
    }
  }

  private evictOldest(): void {
    let oldestToken: string | null = null;
    let oldestTime: Date | null = null;

    for (const [token, entry] of this.entries) {
      if (!oldestTime || entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestToken = token;
      }
    }

    if (oldestToken) {
      this.entries.delete(oldestToken);
    }
  }
}
