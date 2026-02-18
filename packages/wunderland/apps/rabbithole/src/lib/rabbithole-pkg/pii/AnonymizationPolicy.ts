/**
 * AnonymizationPolicy
 *
 * Configurable PII redaction engine for task content.
 * Applies client-specific policies before tasks reach human assistants.
 */

import type { PIIPolicy, PIIRedactionLevel, TaskQueueItem } from '../admin/types';
import { DEFAULT_PII_POLICY } from '../admin/types';

// ============================================================================
// Redaction Patterns
// ============================================================================

/** PII detection patterns */
export const PII_PATTERNS = {
  // Names - simple heuristic (capitalized words)
  name: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,

  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,

  // Phone numbers (various formats)
  phone: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,

  // US addresses (simplified)
  address:
    /\b\d{1,5}\s+[A-Za-z0-9\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Circle|Cir)\b\.?(?:\s*,?\s*(?:Apt|Suite|Unit|#)\s*\d+)?/gi,

  // Credit cards (basic patterns)
  creditCard:
    /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,

  // SSN
  ssn: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,

  // Bank account numbers (basic)
  bankAccount: /\b\d{8,17}\b/g,
} as const;

/** Redaction replacement tokens */
export const REDACTION_TOKENS = {
  name: '[REDACTED_NAME]',
  email: '[REDACTED_EMAIL]',
  phone: '[REDACTED_PHONE]',
  address: '[REDACTED_ADDRESS]',
  creditCard: '[REDACTED_CC]',
  ssn: '[REDACTED_SSN]',
  bankAccount: '[REDACTED_ACCOUNT]',
  custom: '[REDACTED]',
} as const;

// ============================================================================
// Redaction Result
// ============================================================================

/** Details about what was redacted */
export interface RedactionResult {
  original: string;
  redacted: string;
  piiDetected: boolean;
  detections: RedactionDetection[];
  redactionLevel: PIIRedactionLevel;
}

/** Individual PII detection */
export interface RedactionDetection {
  type: keyof typeof PII_PATTERNS | 'custom';
  count: number;
  positions: Array<{ start: number; end: number }>;
}

// ============================================================================
// AnonymizationPolicy
// ============================================================================

export interface AnonymizationPolicyConfig {
  defaultPolicy?: PIIPolicy;
}

export class AnonymizationPolicy {
  private defaultPolicy: PIIPolicy;

  constructor(config?: AnonymizationPolicyConfig) {
    this.defaultPolicy = config?.defaultPolicy ?? DEFAULT_PII_POLICY;
  }

  /**
   * Redact PII from text based on policy
   */
  redact(text: string, policy?: Partial<PIIPolicy>): RedactionResult {
    const effectivePolicy = { ...this.defaultPolicy, ...policy };
    const detections: RedactionDetection[] = [];
    let redacted = text;
    let piiDetected = false;

    // Apply standard patterns based on policy
    if (effectivePolicy.redactNames) {
      const result = this.applyPattern(redacted, 'name', PII_PATTERNS.name, REDACTION_TOKENS.name);
      redacted = result.text;
      if (result.detection) detections.push(result.detection);
      if (result.count > 0) piiDetected = true;
    }

    if (effectivePolicy.redactEmails) {
      const result = this.applyPattern(
        redacted,
        'email',
        PII_PATTERNS.email,
        REDACTION_TOKENS.email
      );
      redacted = result.text;
      if (result.detection) detections.push(result.detection);
      if (result.count > 0) piiDetected = true;
    }

    if (effectivePolicy.redactPhones) {
      const result = this.applyPattern(
        redacted,
        'phone',
        PII_PATTERNS.phone,
        REDACTION_TOKENS.phone
      );
      redacted = result.text;
      if (result.detection) detections.push(result.detection);
      if (result.count > 0) piiDetected = true;
    }

    if (effectivePolicy.redactAddresses) {
      const result = this.applyPattern(
        redacted,
        'address',
        PII_PATTERNS.address,
        REDACTION_TOKENS.address
      );
      redacted = result.text;
      if (result.detection) detections.push(result.detection);
      if (result.count > 0) piiDetected = true;
    }

    if (effectivePolicy.redactFinancials) {
      const ccResult = this.applyPattern(
        redacted,
        'creditCard',
        PII_PATTERNS.creditCard,
        REDACTION_TOKENS.creditCard
      );
      redacted = ccResult.text;
      if (ccResult.detection) detections.push(ccResult.detection);
      if (ccResult.count > 0) piiDetected = true;

      const bankResult = this.applyPattern(
        redacted,
        'bankAccount',
        PII_PATTERNS.bankAccount,
        REDACTION_TOKENS.bankAccount
      );
      redacted = bankResult.text;
      if (bankResult.detection) detections.push(bankResult.detection);
      if (bankResult.count > 0) piiDetected = true;
    }

    if (effectivePolicy.redactSSN) {
      const result = this.applyPattern(redacted, 'ssn', PII_PATTERNS.ssn, REDACTION_TOKENS.ssn);
      redacted = result.text;
      if (result.detection) detections.push(result.detection);
      if (result.count > 0) piiDetected = true;
    }

    // Apply custom patterns
    for (const pattern of effectivePolicy.redactCustomPatterns) {
      try {
        const regex = new RegExp(pattern, 'gi');
        const result = this.applyPattern(redacted, 'custom', regex, REDACTION_TOKENS.custom);
        redacted = result.text;
        if (result.detection) detections.push(result.detection);
        if (result.count > 0) piiDetected = true;
      } catch (e) {
        // Invalid regex, skip
        console.warn(`Invalid custom PII pattern: ${pattern}`);
      }
    }

    return {
      original: text,
      redacted,
      piiDetected,
      detections,
      redactionLevel: piiDetected ? 'partial' : 'none',
    };
  }

  /**
   * Calculate PII risk score (0-100)
   */
  calculateRiskScore(text: string): number {
    const weights = {
      ssn: 30,
      creditCard: 25,
      bankAccount: 20,
      email: 10,
      phone: 8,
      address: 5,
      name: 2,
    };

    let score = 0;

    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
      const matches = text.match(pattern);
      if (matches) {
        const weight = weights[type as keyof typeof weights] ?? 5;
        score += matches.length * weight;
      }
    }

    return Math.min(100, score);
  }

  /**
   * Scan text without redacting
   */
  scan(text: string): { piiDetected: boolean; riskScore: number; types: string[] } {
    const types: string[] = [];

    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
      if (pattern.test(text)) {
        types.push(type);
        // Reset regex lastIndex
        pattern.lastIndex = 0;
      }
    }

    return {
      piiDetected: types.length > 0,
      riskScore: this.calculateRiskScore(text),
      types,
    };
  }

  private applyPattern(
    text: string,
    type: keyof typeof PII_PATTERNS | 'custom',
    pattern: RegExp,
    token: string
  ): { text: string; count: number; detection: RedactionDetection | null } {
    const positions: Array<{ start: number; end: number }> = [];
    let count = 0;

    // Find all matches first
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      positions.push({ start: match.index, end: match.index + match[0].length });
      count++;
    }

    if (count === 0) {
      return { text, count: 0, detection: null };
    }

    // Replace all matches
    const redacted = text.replace(pattern, token);

    return {
      text: redacted,
      count,
      detection: { type, count, positions },
    };
  }
}

// ============================================================================
// TaskRedactor
// ============================================================================

export interface TaskRedactorConfig {
  policy?: AnonymizationPolicy;
}

/**
 * Applies PII redaction to tasks before they reach assistants
 */
export class TaskRedactor {
  private policy: AnonymizationPolicy;

  constructor(config?: TaskRedactorConfig) {
    this.policy = config?.policy ?? new AnonymizationPolicy();
  }

  /**
   * Redact PII from a task based on its redaction level
   */
  redactTask(task: TaskQueueItem, orgPolicy?: Partial<PIIPolicy>): TaskQueueItem {
    if (task.piiRedactionLevel === 'none') {
      return task;
    }

    // Redact description
    const descResult = this.policy.redact(task.description, orgPolicy);

    // Calculate risk score if not already set
    const riskScore = task.riskScore ?? this.policy.calculateRiskScore(task.description);

    return {
      ...task,
      redactedDescription: descResult.redacted,
      riskScore,
    };
  }

  /**
   * Prepare a list of tasks for assistant view
   */
  redactTasks(tasks: TaskQueueItem[], orgPolicy?: Partial<PIIPolicy>): TaskQueueItem[] {
    return tasks.map((task) => this.redactTask(task, orgPolicy));
  }

  /**
   * Scan a task for PII without modifying it
   */
  scanTask(task: TaskQueueItem): {
    piiDetected: boolean;
    riskScore: number;
    types: string[];
  } {
    return this.policy.scan(task.description);
  }

  /**
   * Calculate recommended redaction level based on content
   */
  recommendRedactionLevel(task: TaskQueueItem): PIIRedactionLevel {
    const { riskScore } = this.policy.scan(task.description);

    if (riskScore >= 50) return 'full';
    if (riskScore > 0) return 'partial';
    return 'none';
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createAnonymizationPolicy(policy?: Partial<PIIPolicy>): AnonymizationPolicy {
  return new AnonymizationPolicy({
    defaultPolicy: { ...DEFAULT_PII_POLICY, ...policy },
  });
}

export function createTaskRedactor(policy?: AnonymizationPolicy): TaskRedactor {
  return new TaskRedactor({ policy });
}
