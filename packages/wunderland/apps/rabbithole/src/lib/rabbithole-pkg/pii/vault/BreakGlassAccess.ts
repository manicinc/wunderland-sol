/**
 * @fileoverview Break-Glass Access for PII Vault
 * @module @framers/rabbithole/pii/vault
 *
 * Provides emergency access to PII with full audit trail and notifications.
 */

import type { PIIVault, VaultEntry } from './PIIVault.js';
import type { PIIType } from '../IPIIRedactor.js';

/**
 * Request for break-glass access.
 */
export interface BreakGlassRequest {
  /** Vault token to access */
  vaultToken: string;
  /** ID of user/agent requesting access */
  requesterId: string;
  /** Justification for emergency access */
  reason: string;
  /** Pre-approved via HITL workflow */
  approvalId?: string;
  /** Urgency level */
  urgency: 'normal' | 'high' | 'critical';
  /** Expected duration of access in milliseconds */
  accessDuration?: number;
}

/**
 * Result of break-glass access request.
 */
export interface BreakGlassResult {
  /** Whether access was granted */
  granted: boolean;
  /** Original value if granted */
  value?: string;
  /** Entry metadata */
  metadata?: Omit<VaultEntry, 'encryptedValue'>;
  /** Reason for denial if not granted */
  denialReason?: string;
  /** Unique access ID for audit */
  accessId: string;
  /** When access expires */
  expiresAt?: Date;
}

/**
 * Notification for break-glass access.
 */
export interface BreakGlassNotification {
  /** Unique notification ID */
  notificationId: string;
  /** Access ID this relates to */
  accessId: string;
  /** Vault token accessed */
  vaultToken: string;
  /** Type of PII accessed */
  piiType: PIIType;
  /** Who accessed */
  requesterId: string;
  /** Reason provided */
  reason: string;
  /** Owner of the data (userId who sent it) */
  dataOwnerId: string;
  /** Tenant context */
  tenantId: string;
  /** When the access occurred */
  timestamp: Date;
  /** Notification status */
  status: 'pending' | 'sent' | 'acknowledged';
}

/**
 * Permission required for break-glass access.
 */
export interface BreakGlassPermission {
  /** User/role ID */
  principalId: string;
  /** Principal type */
  principalType: 'user' | 'role' | 'service';
  /** Allowed PII types */
  allowedTypes: PIIType[] | 'all';
  /** Allowed tenants */
  allowedTenants: string[] | 'all';
  /** Whether pre-approval is required */
  requiresApproval: boolean;
  /** Maximum accesses per day */
  dailyLimit?: number;
}

/**
 * Configuration for break-glass access.
 */
export interface BreakGlassConfig {
  /** Default access duration in milliseconds */
  defaultAccessDuration: number;
  /** Whether to notify data owners */
  notifyDataOwners: boolean;
  /** Whether to notify security team */
  notifySecurityTeam: boolean;
  /** Callback for sending notifications */
  notificationHandler?: (notification: BreakGlassNotification) => Promise<void>;
  /** Callback for checking HITL approvals */
  approvalChecker?: (approvalId: string) => Promise<boolean>;
}

/**
 * Access log entry for break-glass.
 */
interface BreakGlassAccessLog {
  accessId: string;
  vaultToken: string;
  requesterId: string;
  reason: string;
  urgency: 'normal' | 'high' | 'critical';
  approvalId?: string;
  granted: boolean;
  denialReason?: string;
  timestamp: Date;
  expiresAt?: Date;
  piiType?: PIIType;
  tenantId?: string;
}

/**
 * Break-glass access manager for emergency PII retrieval.
 *
 * Provides controlled emergency access to PII with:
 * - Permission-based access control
 * - Full audit trail
 * - Data owner notifications
 * - Time-bound access windows
 * - Daily access limits
 *
 * @example
 * ```typescript
 * const breakGlass = new BreakGlassAccess(vault, {
 *   defaultAccessDuration: 15 * 60 * 1000, // 15 minutes
 *   notifyDataOwners: true,
 *   notifySecurityTeam: true,
 *   notificationHandler: async (notification) => {
 *     await slackAdapter.sendMessage({
 *       channelId: notification.dataOwnerId,
 *       content: `Your data was accessed: ${notification.reason}`,
 *     });
 *   },
 * });
 *
 * // Grant permission to a role
 * breakGlass.grantPermission({
 *   principalId: 'role:support-escalation',
 *   principalType: 'role',
 *   allowedTypes: ['email', 'phone'],
 *   allowedTenants: 'all',
 *   requiresApproval: true,
 *   dailyLimit: 10,
 * });
 *
 * // Request access
 * const result = await breakGlass.requestAccess({
 *   vaultToken: 'pii_abc123...',
 *   requesterId: 'user:john',
 *   reason: 'Customer verification for account recovery',
 *   urgency: 'high',
 *   approvalId: 'approval_xyz',
 * });
 * ```
 */
export class BreakGlassAccess {
  private vault: PIIVault;
  private config: BreakGlassConfig;
  private permissions: Map<string, BreakGlassPermission> = new Map();
  private accessLogs: BreakGlassAccessLog[] = [];
  private notifications: BreakGlassNotification[] = [];
  private dailyAccessCounts: Map<string, { date: string; count: number }> = new Map();

  constructor(vault: PIIVault, config: BreakGlassConfig) {
    this.vault = vault;
    this.config = config;
  }

  /**
   * Grants break-glass permission to a principal.
   */
  grantPermission(permission: BreakGlassPermission): void {
    this.permissions.set(permission.principalId, permission);
  }

  /**
   * Revokes break-glass permission.
   */
  revokePermission(principalId: string): boolean {
    return this.permissions.delete(principalId);
  }

  /**
   * Requests break-glass access to a PII value.
   */
  async requestAccess(request: BreakGlassRequest): Promise<BreakGlassResult> {
    const accessId = this.generateAccessId();
    const metadata = this.vault.getMetadata(request.vaultToken);

    // Check if token exists
    if (!metadata) {
      return this.logAndDeny(accessId, request, 'Token not found or expired');
    }

    // Check permissions
    const permission = this.getApplicablePermission(
      request.requesterId,
      metadata.piiType,
      metadata.tenantId
    );

    if (!permission) {
      return this.logAndDeny(accessId, request, 'No permission for break-glass access');
    }

    // Check daily limit
    if (permission.dailyLimit) {
      const todayCount = this.getDailyAccessCount(request.requesterId);
      if (todayCount >= permission.dailyLimit) {
        return this.logAndDeny(accessId, request, 'Daily access limit exceeded');
      }
    }

    // Check approval if required
    if (permission.requiresApproval) {
      if (!request.approvalId) {
        return this.logAndDeny(accessId, request, 'Pre-approval required but not provided');
      }

      if (this.config.approvalChecker) {
        const approved = await this.config.approvalChecker(request.approvalId);
        if (!approved) {
          return this.logAndDeny(accessId, request, 'Approval not valid or expired');
        }
      }
    }

    // Grant access
    const value = await this.vault.retrieve(
      request.vaultToken,
      request.requesterId,
      `BREAK_GLASS: ${request.reason}`
    );

    if (!value) {
      return this.logAndDeny(accessId, request, 'Failed to retrieve value from vault');
    }

    // Calculate expiration
    const accessDuration = request.accessDuration ?? this.config.defaultAccessDuration;
    const expiresAt = new Date(Date.now() + accessDuration);

    // Log successful access
    this.logAccess({
      accessId,
      vaultToken: request.vaultToken,
      requesterId: request.requesterId,
      reason: request.reason,
      urgency: request.urgency,
      approvalId: request.approvalId,
      granted: true,
      timestamp: new Date(),
      expiresAt,
      piiType: metadata.piiType,
      tenantId: metadata.tenantId,
    });

    // Increment daily count
    this.incrementDailyCount(request.requesterId);

    // Send notifications
    await this.sendNotifications(accessId, request, metadata);

    return {
      granted: true,
      value,
      metadata,
      accessId,
      expiresAt,
    };
  }

  /**
   * Gets break-glass access logs for audit.
   */
  getAccessLogs(filter?: {
    requesterId?: string;
    vaultToken?: string;
    startDate?: Date;
    endDate?: Date;
    grantedOnly?: boolean;
  }): BreakGlassAccessLog[] {
    let logs = [...this.accessLogs];

    if (filter?.requesterId) {
      logs = logs.filter((l) => l.requesterId === filter.requesterId);
    }
    if (filter?.vaultToken) {
      logs = logs.filter((l) => l.vaultToken === filter.vaultToken);
    }
    if (filter?.startDate) {
      logs = logs.filter((l) => l.timestamp >= filter.startDate!);
    }
    if (filter?.endDate) {
      logs = logs.filter((l) => l.timestamp <= filter.endDate!);
    }
    if (filter?.grantedOnly) {
      logs = logs.filter((l) => l.granted);
    }

    return logs;
  }

  /**
   * Gets pending notifications.
   */
  getPendingNotifications(): BreakGlassNotification[] {
    return this.notifications.filter((n) => n.status === 'pending');
  }

  /**
   * Marks a notification as acknowledged.
   */
  acknowledgeNotification(notificationId: string): boolean {
    const notification = this.notifications.find((n) => n.notificationId === notificationId);
    if (notification) {
      notification.status = 'acknowledged';
      return true;
    }
    return false;
  }

  /**
   * Gets statistics for break-glass access.
   */
  getStats(): {
    totalAccesses: number;
    grantedAccesses: number;
    deniedAccesses: number;
    pendingNotifications: number;
    accessesByUrgency: Record<string, number>;
    topRequesters: Array<{ requesterId: string; count: number }>;
  } {
    const accessesByUrgency: Record<string, number> = {};
    const requesterCounts: Map<string, number> = new Map();

    let granted = 0;
    let denied = 0;

    for (const log of this.accessLogs) {
      if (log.granted) granted++;
      else denied++;

      accessesByUrgency[log.urgency] = (accessesByUrgency[log.urgency] ?? 0) + 1;
      requesterCounts.set(
        log.requesterId,
        (requesterCounts.get(log.requesterId) ?? 0) + 1
      );
    }

    const topRequesters = Array.from(requesterCounts.entries())
      .map(([requesterId, count]) => ({ requesterId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalAccesses: this.accessLogs.length,
      grantedAccesses: granted,
      deniedAccesses: denied,
      pendingNotifications: this.getPendingNotifications().length,
      accessesByUrgency,
      topRequesters,
    };
  }

  private getApplicablePermission(
    requesterId: string,
    piiType: PIIType,
    tenantId: string
  ): BreakGlassPermission | null {
    // Check direct user permission
    const directPermission = this.permissions.get(requesterId);
    if (directPermission && this.permissionApplies(directPermission, piiType, tenantId)) {
      return directPermission;
    }

    // Check role-based permissions (would integrate with actual RBAC)
    // For now, check any permissions that match the pattern
    for (const permission of this.permissions.values()) {
      if (
        permission.principalType === 'role' &&
        this.permissionApplies(permission, piiType, tenantId)
      ) {
        return permission;
      }
    }

    return null;
  }

  private permissionApplies(
    permission: BreakGlassPermission,
    piiType: PIIType,
    tenantId: string
  ): boolean {
    const typeAllowed =
      permission.allowedTypes === 'all' || permission.allowedTypes.includes(piiType);

    const tenantAllowed =
      permission.allowedTenants === 'all' || permission.allowedTenants.includes(tenantId);

    return typeAllowed && tenantAllowed;
  }

  private getDailyAccessCount(requesterId: string): number {
    const today = new Date().toISOString().slice(0, 10);
    const record = this.dailyAccessCounts.get(requesterId);

    if (!record || record.date !== today) {
      return 0;
    }

    return record.count;
  }

  private incrementDailyCount(requesterId: string): void {
    const today = new Date().toISOString().slice(0, 10);
    const record = this.dailyAccessCounts.get(requesterId);

    if (!record || record.date !== today) {
      this.dailyAccessCounts.set(requesterId, { date: today, count: 1 });
    } else {
      record.count++;
    }
  }

  private logAndDeny(
    accessId: string,
    request: BreakGlassRequest,
    denialReason: string
  ): BreakGlassResult {
    this.logAccess({
      accessId,
      vaultToken: request.vaultToken,
      requesterId: request.requesterId,
      reason: request.reason,
      urgency: request.urgency,
      approvalId: request.approvalId,
      granted: false,
      denialReason,
      timestamp: new Date(),
    });

    return {
      granted: false,
      denialReason,
      accessId,
    };
  }

  private logAccess(log: BreakGlassAccessLog): void {
    this.accessLogs.push(log);

    // Keep only last 10000 logs
    if (this.accessLogs.length > 10000) {
      this.accessLogs = this.accessLogs.slice(-10000);
    }
  }

  private async sendNotifications(
    accessId: string,
    request: BreakGlassRequest,
    metadata: Omit<VaultEntry, 'encryptedValue'>
  ): Promise<void> {
    const notification: BreakGlassNotification = {
      notificationId: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      accessId,
      vaultToken: request.vaultToken,
      piiType: metadata.piiType,
      requesterId: request.requesterId,
      reason: request.reason,
      dataOwnerId: metadata.userId,
      tenantId: metadata.tenantId,
      timestamp: new Date(),
      status: 'pending',
    };

    this.notifications.push(notification);

    if (this.config.notificationHandler) {
      try {
        await this.config.notificationHandler(notification);
        notification.status = 'sent';
      } catch (error) {
        // Log error but don't fail the access
        console.error('Failed to send break-glass notification:', error);
      }
    }
  }

  private generateAccessId(): string {
    return `bg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}
