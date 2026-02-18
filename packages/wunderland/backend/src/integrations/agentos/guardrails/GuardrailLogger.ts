/**
 * @fileoverview Guardrail Logging and Escalation System
 * @description Logs guardrail decisions, triggers human escalation, and manages intervention queues.
 * 
 * Use cases:
 * - Log all SANITIZE/BLOCK actions for compliance audit
 * - Escalate high-risk detections to human moderators
 * - Queue responses for manual review before delivery
 * - Send webhooks when critical policies are violated
 */

import {
  GuardrailAction,
  type GuardrailEvaluationResult,
  type GuardrailContext,
} from '@framers/agentos/core/guardrails/IGuardrailService';

/**
 * Severity level for guardrail events.
 */
export enum GuardrailSeverity {
  /** Informational (e.g., FLAG actions) */
  INFO = 'info',
  /** Warning (e.g., SANITIZE with low confidence) */
  WARNING = 'warning',
  /** High risk (e.g., SANITIZE for sensitive topics) */
  HIGH = 'high',
  /** Critical (e.g., BLOCK for illegal content) */
  CRITICAL = 'critical',
}

/**
 * Logged guardrail event.
 */
export interface GuardrailLogEntry {
  /** Unique log ID */
  id: string;
  /** Timestamp */
  timestamp: string;
  /** Guardrail ID that triggered */
  guardrailId: string;
  /** Stage: 'input' or 'output' */
  stage: 'input' | 'output';
  /** Action taken */
  action: GuardrailAction;
  /** Severity level */
  severity: GuardrailSeverity;
  /** User/session context */
  context: GuardrailContext;
  /** Evaluation result */
  evaluation: GuardrailEvaluationResult;
  /** Original content (truncated) */
  originalContent?: string;
  /** Modified content (if sanitized) */
  modifiedContent?: string;
  /** Whether this triggered human escalation */
  escalated: boolean;
}

/**
 * Escalation action to take when guardrail triggers.
 */
export interface EscalationAction {
  /** Notify via webhook */
  webhook?: {
    url: string;
    headers?: Record<string, string>;
  };
  /** Add to manual review queue */
  queueForReview?: boolean;
  /** Block stream until human approves */
  requireApproval?: boolean;
  /** Custom handler function */
  customHandler?: (entry: GuardrailLogEntry) => Promise<void>;
}

/**
 * Configuration for guardrail logger.
 */
export interface GuardrailLoggerConfig {
  /** Enable console logging */
  logToConsole: boolean;
  /** Enable database persistence */
  logToDatabase: boolean;
  /** Database connection (if enabled) */
  databaseUrl?: string;
  /** Webhook URL for high-severity events */
  escalationWebhook?: string;
  /** Escalation rules */
  escalationRules?: Array<{
    /** Match condition */
    condition: (entry: GuardrailLogEntry) => boolean;
    /** Action to take */
    action: EscalationAction;
  }>;
  /** Minimum severity to log (default: INFO) */
  minSeverity?: GuardrailSeverity;
}

/**
 * Guardrail event logger with escalation support.
 * 
 * **Features:**
 * - Logs all guardrail decisions (FLAG, SANITIZE, BLOCK)
 * - Assigns severity levels based on action and content
 * - Triggers human escalation for critical events
 * - Queues responses for manual review
 * - Sends webhooks to external monitoring systems
 * 
 * @example
 * ```typescript
 * const logger = new GuardrailLogger({
 *   logToConsole: true,
 *   logToDatabase: true,
 *   escalationWebhook: 'https://monitoring.example.com/guardrail-alert',
 *   escalationRules: [
 *     {
 *       condition: (entry) => entry.severity === GuardrailSeverity.CRITICAL,
 *       action: { queueForReview: true, requireApproval: true },
 *     },
 *   ],
 * });
 * 
 * // Log a guardrail decision
 * await logger.log({
 *   guardrailId: 'guardrail-sensitive-topic',
 *   stage: 'output',
 *   action: GuardrailAction.BLOCK,
 *   context: { userId: 'user-1', sessionId: 'session-1' },
 *   evaluation: { action: GuardrailAction.BLOCK, reason: 'Harmful content detected' },
 * });
 * ```
 */
export class GuardrailLogger {
  private logs: GuardrailLogEntry[] = [];

  constructor(private readonly config: GuardrailLoggerConfig) {}

  /**
   * Log a guardrail event.
   * @param params Event parameters
   * @returns Log entry with escalation flag
   */
  async log(params: {
    guardrailId: string;
    stage: 'input' | 'output';
    action: GuardrailAction;
    context: GuardrailContext;
    evaluation: GuardrailEvaluationResult;
    originalContent?: string;
    modifiedContent?: string;
  }): Promise<GuardrailLogEntry> {
    const severity = this.determineSeverity(params.action, params.evaluation);

    if (this.config.minSeverity && this.compareSeverity(severity, this.config.minSeverity) < 0) {
      // Below minimum severity; skip logging
      return this.createLogEntry({ ...params, severity, escalated: false });
    }

    const entry = this.createLogEntry({ ...params, severity, escalated: false });

    // Console logging
    if (this.config.logToConsole) {
      this.logToConsole(entry);
    }

    // Database logging
    if (this.config.logToDatabase) {
      await this.logToDatabase(entry);
    }

    // Check escalation rules
    const escalated = await this.checkEscalation(entry);
    entry.escalated = escalated;

    // Store in memory
    this.logs.push(entry);

    return entry;
  }

  /**
   * Get recent log entries.
   * @param limit Maximum number of entries
   * @returns Recent logs (newest first)
   */
  getRecentLogs(limit = 100): GuardrailLogEntry[] {
    return this.logs.slice(-limit).reverse();
  }

  /**
   * Get logs by severity.
   */
  getLogsBySeverity(severity: GuardrailSeverity): GuardrailLogEntry[] {
    return this.logs.filter((entry) => entry.severity === severity);
  }

  /**
   * Get escalated logs (pending human review).
   */
  getEscalatedLogs(): GuardrailLogEntry[] {
    return this.logs.filter((entry) => entry.escalated);
  }

  /**
   * Determine severity from action and evaluation.
   */
  private determineSeverity(action: GuardrailAction, evaluation: GuardrailEvaluationResult): GuardrailSeverity {
    if (action === GuardrailAction.BLOCK) {
      // BLOCK actions are at least HIGH, possibly CRITICAL
      const topics = (evaluation.metadata as any)?.detectedTopics as string[] | undefined;
      const isCritical = evaluation.reasonCode?.includes('ILLEGAL') ||
        evaluation.reasonCode?.includes('HARMFUL') ||
        (Array.isArray(topics) && topics.some((t) => ['violence', 'self-harm'].includes(t)));
      return isCritical ? GuardrailSeverity.CRITICAL : GuardrailSeverity.HIGH;
    }

    if (action === GuardrailAction.SANITIZE) {
      // SANITIZE is HIGH if PII or sensitive, otherwise WARNING
      const isPII = evaluation.reasonCode?.includes('PII') || evaluation.reasonCode?.includes('SSN') || evaluation.reasonCode?.includes('EMAIL');
      return isPII ? GuardrailSeverity.HIGH : GuardrailSeverity.WARNING;
    }

    // FLAG and ALLOW are INFO
    return GuardrailSeverity.INFO;
  }

  /**
   * Compare severity levels (returns -1, 0, 1 like strcmp).
   */
  private compareSeverity(a: GuardrailSeverity, b: GuardrailSeverity): number {
    const order = [GuardrailSeverity.INFO, GuardrailSeverity.WARNING, GuardrailSeverity.HIGH, GuardrailSeverity.CRITICAL];
    return order.indexOf(a) - order.indexOf(b);
  }

  /**
   * Create a log entry object.
   */
  private createLogEntry(params: {
    guardrailId: string;
    stage: 'input' | 'output';
    action: GuardrailAction;
    severity: GuardrailSeverity;
    context: GuardrailContext;
    evaluation: GuardrailEvaluationResult;
    originalContent?: string;
    modifiedContent?: string;
    escalated: boolean;
  }): GuardrailLogEntry {
    return {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
      ...params,
      originalContent: params.originalContent?.substring(0, 500), // Truncate
    };
  }

  /**
   * Log to console with color coding by severity.
   */
  private logToConsole(entry: GuardrailLogEntry): void {
    const prefix = `[Guardrail:${entry.stage}:${entry.severity}]`;
    const message = `${entry.guardrailId}: ${entry.action} - ${entry.evaluation.reason ?? 'No reason'}`;

    switch (entry.severity) {
      case GuardrailSeverity.CRITICAL:
        console.error(prefix, message, entry);
        break;
      case GuardrailSeverity.HIGH:
        console.warn(prefix, message);
        break;
      case GuardrailSeverity.WARNING:
        console.warn(prefix, message);
        break;
      default:
        console.log(prefix, message);
    }
  }

  /**
   * Persist log to database (stub—implement with your DB adapter).
   */
  private async logToDatabase(entry: GuardrailLogEntry): Promise<void> {
    // TODO: Implement database persistence
    // Example:
    // await db.guardrailLogs.create({ data: entry });
    console.debug('[GuardrailLogger] Database logging not implemented yet');
  }

  /**
   * Check if entry should be escalated and trigger actions.
   */
  private async checkEscalation(entry: GuardrailLogEntry): Promise<boolean> {
    if (!this.config.escalationRules || this.config.escalationRules.length === 0) {
      return false;
    }

    let escalated = false;

    for (const rule of this.config.escalationRules) {
      if (!rule.condition(entry)) {
        continue;
      }

      escalated = true;

      // Trigger webhook
      if (rule.action.webhook) {
        await this.sendWebhook(rule.action.webhook, entry);
      }

      // Queue for review
      if (rule.action.queueForReview) {
        await this.queueForReview(entry);
      }

      // Custom handler
      if (rule.action.customHandler) {
        await rule.action.customHandler(entry);
      }

      // Note: requireApproval is handled by caller (stream router)
    }

    return escalated;
  }

  /**
   * Send webhook notification.
   */
  private async sendWebhook(
    webhook: { url: string; headers?: Record<string, string> },
    entry: GuardrailLogEntry,
  ): Promise<void> {
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...webhook.headers,
        },
        body: JSON.stringify({
          event: 'guardrail_triggered',
          severity: entry.severity,
          guardrailId: entry.guardrailId,
          action: entry.action,
          context: entry.context,
          reason: entry.evaluation.reason,
          timestamp: entry.timestamp,
        }),
      });

      if (!response.ok) {
        console.error('[GuardrailLogger] Webhook failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('[GuardrailLogger] Webhook error:', error);
    }
  }

  /**
   * Add entry to manual review queue.
   */
  private async queueForReview(entry: GuardrailLogEntry): Promise<void> {
    // TODO: Implement queue persistence
    // Example:
    // await db.reviewQueue.create({ data: { logId: entry.id, status: 'pending' } });
    console.log('[GuardrailLogger] Queued for review:', entry.id);
  }

  /**
   * Get statistics for analytics dashboard.
   */
  getStats(): {
    total: number;
    byAction: Record<GuardrailAction, number>;
    bySeverity: Record<GuardrailSeverity, number>;
    escalationRate: number;
  } {
    const total = this.logs.length;
    const byAction: Record<GuardrailAction, number> = {
      [GuardrailAction.ALLOW]: 0,
      [GuardrailAction.FLAG]: 0,
      [GuardrailAction.SANITIZE]: 0,
      [GuardrailAction.BLOCK]: 0,
    };
    const bySeverity: Record<GuardrailSeverity, number> = {
      [GuardrailSeverity.INFO]: 0,
      [GuardrailSeverity.WARNING]: 0,
      [GuardrailSeverity.HIGH]: 0,
      [GuardrailSeverity.CRITICAL]: 0,
    };
    let escalated = 0;

    for (const entry of this.logs) {
      byAction[entry.action] = (byAction[entry.action] || 0) + 1;
      bySeverity[entry.severity] = (bySeverity[entry.severity] || 0) + 1;
      if (entry.escalated) escalated++;
    }

    return {
      total,
      byAction,
      bySeverity,
      escalationRate: total > 0 ? escalated / total : 0,
    };
  }
}


