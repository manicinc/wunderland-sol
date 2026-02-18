/**
 * @fileoverview Human Escalation Manager for Guardrails
 * @description Manages manual intervention queue, approval workflows, and human-in-the-loop decisions.
 * 
 * When a guardrail requires human approval, the stream is paused, the request is queued,
 * and a human moderator can approve/reject/rewrite the response.
 */

import type { GuardrailLogEntry } from './GuardrailLogger';

/**
 * Status of a queued intervention request.
 */
export enum InterventionStatus {
  /** Awaiting human review */
  PENDING = 'pending',
  /** Human approved; resume stream */
  APPROVED = 'approved',
  /** Human rejected; keep blocked */
  REJECTED = 'rejected',
  /** Human rewrote the response */
  REWRITTEN = 'rewritten',
  /** Timed out waiting for approval */
  TIMEOUT = 'timeout',
}

/**
 * Intervention queue entry.
 */
export interface InterventionRequest {
  /** Unique request ID */
  id: string;
  /** Associated log entry */
  logEntry: GuardrailLogEntry;
  /** Current status */
  status: InterventionStatus;
  /** Timestamp when queued */
  queuedAt: string;
  /** Timestamp when resolved */
  resolvedAt?: string;
  /** Human moderator ID who resolved */
  resolvedBy?: string;
  /** Rewritten content (if status = REWRITTEN) */
  rewrittenContent?: string;
  /** Notes from moderator */
  moderatorNotes?: string;
}

/**
 * Configuration for escalation manager.
 */
export interface EscalationManagerConfig {
  /** Timeout for pending approvals (ms) */
  approvalTimeoutMs: number;
  /** Default action when timeout occurs */
  timeoutAction: 'approve' | 'reject';
  /** Webhook for real-time notifications */
  notificationWebhook?: string;
}

/**
 * Manages human-in-the-loop escalation for guardrails.
 * 
 * **Workflow:**
 * 1. Guardrail triggers with `requireApproval: true`
 * 2. Stream pauses, request added to queue
 * 3. Human moderator reviews in dashboard
 * 4. Moderator approves/rejects/rewrites
 * 5. Stream resumes with human decision
 * 
 * @example
 * ```typescript
 * const manager = new EscalationManager({
 *   approvalTimeoutMs: 300000, // 5 minutes
 *   timeoutAction: 'reject',
 * });
 * 
 * // Queue for approval
 * const request = await manager.queueForApproval(logEntry);
 * 
 * // Wait for human decision (or timeout)
 * const decision = await manager.waitForDecision(request.id);
 * 
 * if (decision.status === InterventionStatus.APPROVED) {
 *   // Resume stream with original content
 * } else if (decision.status === InterventionStatus.REWRITTEN) {
 *   // Resume stream with rewritten content
 * } else {
 *   // Keep blocked
 * }
 * ```
 */
export class EscalationManager {
  private queue: Map<string, InterventionRequest> = new Map();
  private resolvers: Map<string, (decision: InterventionRequest) => void> = new Map();

  constructor(private readonly config: EscalationManagerConfig) {}

  /**
   * Add a request to the manual intervention queue.
   * @param logEntry Guardrail log entry requiring review
   * @returns Intervention request with ID
   */
  async queueForApproval(logEntry: GuardrailLogEntry): Promise<InterventionRequest> {
    const request: InterventionRequest = {
      id: `intervention-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      logEntry,
      status: InterventionStatus.PENDING,
      queuedAt: new Date().toISOString(),
    };

    this.queue.set(request.id, request);

    // Send notification
    if (this.config.notificationWebhook) {
      await this.sendNotification(request);
    }

    console.log(`[EscalationManager] Queued for approval: ${request.id}`);

    return request;
  }

  /**
   * Wait for human decision (with timeout).
   * @param requestId Intervention request ID
   * @returns Resolved request with decision
   */
  async waitForDecision(requestId: string): Promise<InterventionRequest> {
    const request = this.queue.get(requestId);
    if (!request) {
      throw new Error(`Intervention request not found: ${requestId}`);
    }

    if (request.status !== InterventionStatus.PENDING) {
      return request; // Already resolved
    }

    // Wait for human decision or timeout
    return new Promise((resolve) => {
      this.resolvers.set(requestId, resolve);

      setTimeout(() => {
        const current = this.queue.get(requestId);
        if (current && current.status === InterventionStatus.PENDING) {
          current.status = this.config.timeoutAction === 'approve'
            ? InterventionStatus.APPROVED
            : InterventionStatus.REJECTED;
          current.resolvedAt = new Date().toISOString();
          current.moderatorNotes = 'Auto-resolved due to timeout';
          this.queue.set(requestId, current);
          resolve(current);
        }
      }, this.config.approvalTimeoutMs);
    });
  }

  /**
   * Approve a queued request (called by human moderator).
   */
  async approve(requestId: string, moderatorId: string, notes?: string): Promise<void> {
    const request = this.queue.get(requestId);
    if (!request) {
      throw new Error(`Intervention request not found: ${requestId}`);
    }

    request.status = InterventionStatus.APPROVED;
    request.resolvedAt = new Date().toISOString();
    request.resolvedBy = moderatorId;
    request.moderatorNotes = notes;

    this.queue.set(requestId, request);
    this.resolvers.get(requestId)?.(request);
    this.resolvers.delete(requestId);

    console.log(`[EscalationManager] Approved: ${requestId} by ${moderatorId}`);
  }

  /**
   * Reject a queued request (keep blocked).
   */
  async reject(requestId: string, moderatorId: string, notes?: string): Promise<void> {
    const request = this.queue.get(requestId);
    if (!request) {
      throw new Error(`Intervention request not found: ${requestId}`);
    }

    request.status = InterventionStatus.REJECTED;
    request.resolvedAt = new Date().toISOString();
    request.resolvedBy = moderatorId;
    request.moderatorNotes = notes;

    this.queue.set(requestId, request);
    this.resolvers.get(requestId)?.(request);
    this.resolvers.delete(requestId);

    console.log(`[EscalationManager] Rejected: ${requestId} by ${moderatorId}`);
  }

  /**
   * Rewrite the response (human provides safe alternative).
   */
  async rewrite(requestId: string, moderatorId: string, rewrittenContent: string, notes?: string): Promise<void> {
    const request = this.queue.get(requestId);
    if (!request) {
      throw new Error(`Intervention request not found: ${requestId}`);
    }

    request.status = InterventionStatus.REWRITTEN;
    request.resolvedAt = new Date().toISOString();
    request.resolvedBy = moderatorId;
    request.rewrittenContent = rewrittenContent;
    request.moderatorNotes = notes;

    this.queue.set(requestId, request);
    this.resolvers.get(requestId)?.(request);
    this.resolvers.delete(requestId);

    console.log(`[EscalationManager] Rewritten: ${requestId} by ${moderatorId}`);
  }

  /**
   * Get all pending interventions (for moderator dashboard).
   */
  getPendingInterventions(): InterventionRequest[] {
    return Array.from(this.queue.values()).filter((req) => req.status === InterventionStatus.PENDING);
  }

  /**
   * Send real-time notification to moderators.
   */
  private async sendNotification(request: InterventionRequest): Promise<void> {
    if (!this.config.notificationWebhook) {
      return;
    }

    try {
      await fetch(this.config.notificationWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'intervention_required',
          requestId: request.id,
          severity: request.logEntry.severity,
          context: request.logEntry.context,
          reason: request.logEntry.evaluation.reason,
          timestamp: request.queuedAt,
        }),
      });
    } catch (error) {
      console.error('[EscalationManager] Notification webhook failed:', error);
    }
  }
}

