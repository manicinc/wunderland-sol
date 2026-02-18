/**
 * @fileoverview PII Redaction Middleware for RabbitHole
 * @module @framers/rabbithole/pii
 *
 * Implements pattern-based PII detection and redaction with vault storage.
 */

import type {
  IPIIRedactor,
  PIIRedactionConfig,
  PIIEntity,
  PIIType,
  RedactionResult,
  MaskingStyle,
  CustomPIIPattern,
} from './IPIIRedactor.js';
import { PIIVault } from './vault/PIIVault.js';
import { BreakGlassAccess } from './vault/BreakGlassAccess.js';

/**
 * Pattern definition for PII detection.
 */
interface PIIPattern {
  type: PIIType;
  pattern: RegExp;
  maskingStyle: MaskingStyle;
  validator?: (match: string) => boolean;
}

/**
 * Context for redaction operations.
 */
export interface RedactionContext {
  tenantId: string;
  channelId: string;
  userId: string;
}

/**
 * Default PII patterns for common types.
 */
const DEFAULT_PATTERNS: PIIPattern[] = [
  {
    type: 'email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    maskingStyle: 'partial',
  },
  {
    type: 'phone',
    pattern: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,
    maskingStyle: 'partial',
  },
  {
    type: 'ssn',
    pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
    maskingStyle: 'full',
    validator: (match) => {
      // Basic SSN validation
      const digits = match.replace(/\D/g, '');
      if (digits.length !== 9) return false;
      if (digits.startsWith('000') || digits.startsWith('666')) return false;
      if (digits.slice(0, 3) === '900') return false;
      return true;
    },
  },
  {
    type: 'credit_card',
    pattern: /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g,
    maskingStyle: 'partial',
    validator: (match) => {
      // Luhn algorithm validation
      const digits = match.replace(/\D/g, '');
      if (digits.length < 13 || digits.length > 19) return false;

      let sum = 0;
      let isEven = false;

      for (let i = digits.length - 1; i >= 0; i--) {
        let digit = parseInt(digits[i], 10);

        if (isEven) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }

        sum += digit;
        isEven = !isEven;
      }

      return sum % 10 === 0;
    },
  },
  {
    type: 'ip_address',
    pattern: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
    maskingStyle: 'partial',
  },
  {
    type: 'address',
    // Matches common US address patterns
    pattern: /\b\d{1,5}\s+\w+(?:\s+\w+)*\s+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|circle|cir)\b/gi,
    maskingStyle: 'type_label',
  },
  {
    type: 'date_of_birth',
    // Common date formats that might be DOB
    pattern: /\b(?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])[-/](?:19|20)\d{2}\b/g,
    maskingStyle: 'full',
  },
];

/**
 * PII Redaction Middleware implementation.
 *
 * Provides pattern-based PII detection and redaction with optional
 * vault storage for original values.
 *
 * @example
 * ```typescript
 * const vault = new PIIVault({ ... });
 * const breakGlass = new BreakGlassAccess(vault, { ... });
 *
 * const middleware = new PIIRedactionMiddleware({
 *   enabledTypes: ['email', 'phone', 'ssn', 'credit_card'],
 *   storeInVault: true,
 *   confidenceThreshold: 0.8,
 * }, vault, breakGlass);
 *
 * const result = await middleware.redact(
 *   'Contact me at john@example.com or 555-123-4567',
 *   { tenantId: 'acme', channelId: 'slack-123', userId: 'U123' }
 * );
 *
 * // result.redactedText = 'Contact me at j***@example.com or ***-***-4567'
 * ```
 */
export class PIIRedactionMiddleware implements IPIIRedactor {
  private config: PIIRedactionConfig;
  private vault?: PIIVault;
  private breakGlass?: BreakGlassAccess;
  private patterns: PIIPattern[];
  private customPatterns: CustomPIIPattern[] = [];

  constructor(
    config: PIIRedactionConfig,
    vault?: PIIVault,
    breakGlass?: BreakGlassAccess
  ) {
    this.config = {
      confidenceThreshold: 0.7,
      ...config,
    };
    this.vault = vault;
    this.breakGlass = breakGlass;
    this.patterns = this.buildPatterns();
  }

  /**
   * Detects and redacts PII from text.
   */
  async redact(
    text: string,
    configOrContext?: Partial<PIIRedactionConfig> | RedactionContext,
    context?: RedactionContext
  ): Promise<RedactionResult> {
    // Handle overloaded parameters
    let effectiveConfig = this.config;
    let effectiveContext = context;

    if (configOrContext && 'tenantId' in configOrContext) {
      effectiveContext = configOrContext;
    } else if (configOrContext) {
      effectiveConfig = { ...this.config, ...configOrContext };
    }

    const entities = await this.detect(text, effectiveConfig);

    if (entities.length === 0) {
      return {
        redactedText: text,
        entities: [],
        hasPII: false,
        processedAt: new Date(),
      };
    }

    // Sort entities by position (reverse order for replacement)
    const sortedEntities = [...entities].sort((a, b) => b.startIndex - a.startIndex);

    let redactedText = text;

    for (const entity of sortedEntities) {
      // Store in vault if configured
      if (this.config.storeInVault && this.vault && effectiveContext) {
        entity.vaultToken = await this.vault.store({
          value: entity.originalValue,
          piiType: entity.type,
          tenantId: effectiveContext.tenantId,
          channelId: effectiveContext.channelId,
          userId: effectiveContext.userId,
        });
      }

      // Replace in text
      redactedText =
        redactedText.slice(0, entity.startIndex) +
        entity.redactedValue +
        redactedText.slice(entity.endIndex);
    }

    return {
      redactedText,
      entities: entities.sort((a, b) => a.startIndex - b.startIndex),
      hasPII: true,
      processedAt: new Date(),
    };
  }

  /**
   * Detects PII without redacting.
   */
  async detect(
    text: string,
    config?: Partial<PIIRedactionConfig>
  ): Promise<PIIEntity[]> {
    const effectiveConfig = config ? { ...this.config, ...config } : this.config;
    const entities: PIIEntity[] = [];

    // Check each pattern
    for (const patternDef of this.patterns) {
      if (!effectiveConfig.enabledTypes.includes(patternDef.type)) {
        continue;
      }

      // Reset regex state
      patternDef.pattern.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = patternDef.pattern.exec(text)) !== null) {
        const value = match[0];

        // Run validator if present
        if (patternDef.validator && !patternDef.validator(value)) {
          continue;
        }

        // Calculate confidence based on pattern match quality
        const confidence = this.calculateConfidence(value, patternDef.type);

        if (confidence < (effectiveConfig.confidenceThreshold ?? 0.7)) {
          continue;
        }

        // Get masking style (config override or pattern default)
        const maskingStyle =
          effectiveConfig.maskingStyles?.[patternDef.type] ?? patternDef.maskingStyle;

        entities.push({
          type: patternDef.type,
          originalValue: value,
          redactedValue: this.mask(value, patternDef.type, maskingStyle),
          startIndex: match.index,
          endIndex: match.index + value.length,
          confidence,
        });
      }
    }

    // Check custom patterns
    for (const customPattern of this.customPatterns) {
      if (!effectiveConfig.enabledTypes.includes(customPattern.type)) {
        continue;
      }

      customPattern.pattern.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = customPattern.pattern.exec(text)) !== null) {
        const value = match[0];

        entities.push({
          type: customPattern.type,
          originalValue: value,
          redactedValue: this.mask(value, customPattern.type, customPattern.maskingStyle),
          startIndex: match.index,
          endIndex: match.index + value.length,
          confidence: 0.9, // Custom patterns are assumed high confidence
        });
      }
    }

    // Remove overlapping entities (keep higher confidence)
    return this.removeOverlaps(entities);
  }

  /**
   * Retrieves original value from vault using break-glass access.
   */
  async retrieveOriginal(
    vaultToken: string,
    requesterId: string,
    reason: string
  ): Promise<string | null> {
    if (!this.breakGlass) {
      throw new Error('Break-glass access not configured');
    }

    const result = await this.breakGlass.requestAccess({
      vaultToken,
      requesterId,
      reason,
      urgency: 'normal',
    });

    return result.granted ? result.value ?? null : null;
  }

  /**
   * Updates redaction configuration.
   */
  configure(config: Partial<PIIRedactionConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.customPatterns) {
      this.customPatterns = config.customPatterns;
    }

    this.patterns = this.buildPatterns();
  }

  /**
   * Gets current configuration.
   */
  getConfig(): PIIRedactionConfig {
    return { ...this.config };
  }

  /**
   * Adds a custom pattern for PII detection.
   */
  addCustomPattern(pattern: CustomPIIPattern): void {
    this.customPatterns.push(pattern);
  }

  /**
   * Removes a custom pattern.
   */
  removeCustomPattern(patternId: string): boolean {
    const index = this.customPatterns.findIndex((p) => p.id === patternId);
    if (index >= 0) {
      this.customPatterns.splice(index, 1);
      return true;
    }
    return false;
  }

  private buildPatterns(): PIIPattern[] {
    // Clone default patterns to avoid mutation
    return DEFAULT_PATTERNS.map((p) => ({
      ...p,
      pattern: new RegExp(p.pattern.source, p.pattern.flags),
    }));
  }

  private mask(value: string, type: PIIType, style: MaskingStyle): string {
    switch (style) {
      case 'full':
        return '*'.repeat(Math.min(value.length, 12));

      case 'partial':
        return this.partialMask(value, type);

      case 'type_label':
        return `[${type.toUpperCase()}]`;

      case 'hash':
        return `#${this.simpleHash(value).slice(0, 8)}`;

      case 'custom':
      default:
        return '[REDACTED]';
    }
  }

  private partialMask(value: string, type: PIIType): string {
    switch (type) {
      case 'email': {
        const [local, domain] = value.split('@');
        if (!domain) return '[EMAIL]';
        const maskedLocal = local.length > 2
          ? local[0] + '*'.repeat(Math.min(local.length - 2, 6)) + local.slice(-1)
          : '*'.repeat(local.length);
        return `${maskedLocal}@${domain}`;
      }

      case 'phone': {
        const digits = value.replace(/\D/g, '');
        if (digits.length < 4) return '***';
        return '***-***-' + digits.slice(-4);
      }

      case 'credit_card': {
        const digits = value.replace(/\D/g, '');
        if (digits.length < 4) return '****';
        return '**** **** **** ' + digits.slice(-4);
      }

      case 'ssn': {
        return '***-**-****';
      }

      case 'ip_address': {
        const parts = value.split('.');
        if (parts.length !== 4) return '[IP]';
        return `${parts[0]}.***.***.***.`;
      }

      default:
        return value.length > 4
          ? value.slice(0, 2) + '*'.repeat(Math.min(value.length - 4, 8)) + value.slice(-2)
          : '*'.repeat(value.length);
    }
  }

  private calculateConfidence(value: string, type: PIIType): number {
    // Base confidence from pattern match
    let confidence = 0.8;

    switch (type) {
      case 'email':
        // Higher confidence for common domains
        if (/@(gmail|yahoo|outlook|hotmail|icloud)\./i.test(value)) {
          confidence = 0.95;
        }
        break;

      case 'phone':
        // Higher confidence for properly formatted numbers
        if (/^\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/.test(value)) {
          confidence = 0.9;
        }
        break;

      case 'credit_card':
        // Luhn validation already done, high confidence
        confidence = 0.95;
        break;

      case 'ssn':
        // SSN validation already done
        confidence = 0.9;
        break;

      case 'ip_address':
        // All valid IPs are high confidence
        confidence = 0.95;
        break;

      case 'address':
        // Addresses are less certain
        confidence = 0.7;
        break;

      case 'date_of_birth':
        // Could be any date
        confidence = 0.6;
        break;
    }

    return confidence;
  }

  private removeOverlaps(entities: PIIEntity[]): PIIEntity[] {
    if (entities.length <= 1) return entities;

    // Sort by start index, then by confidence (descending)
    const sorted = [...entities].sort((a, b) => {
      if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
      return b.confidence - a.confidence;
    });

    const result: PIIEntity[] = [];
    let lastEnd = -1;

    for (const entity of sorted) {
      if (entity.startIndex >= lastEnd) {
        result.push(entity);
        lastEnd = entity.endIndex;
      }
    }

    return result;
  }

  private simpleHash(value: string): string {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}
