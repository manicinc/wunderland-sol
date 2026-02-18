/**
 * RabbitHole Admin Types
 *
 * Core types for human assistant management, task queuing, RBAC, and PII policies.
 */

// ============================================================================
// RBAC Types
// ============================================================================

/** User roles in the RabbitHole platform */
export type UserRole = 'superadmin' | 'admin' | 'assistant' | 'client';

/** Permission scopes for RBAC */
export type Permission =
  | 'admin:read'
  | 'admin:write'
  | 'queue:read'
  | 'queue:manage'
  | 'queue:assign'
  | 'assistant:read'
  | 'assistant:manage'
  | 'client:read'
  | 'client:manage'
  | 'pii:view'
  | 'pii:breakglass';

/** Role-to-permission mapping */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  superadmin: [
    'admin:read',
    'admin:write',
    'queue:read',
    'queue:manage',
    'queue:assign',
    'assistant:read',
    'assistant:manage',
    'client:read',
    'client:manage',
    'pii:view',
    'pii:breakglass',
  ],
  admin: [
    'admin:read',
    'queue:read',
    'queue:manage',
    'queue:assign',
    'assistant:read',
    'assistant:manage',
    'client:read',
    'pii:view',
  ],
  assistant: ['queue:read', 'pii:view'],
  client: ['queue:read', 'client:read'],
};

/** User with role information */
export interface RoleUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId?: string;
  createdAt: Date;
  lastActiveAt?: Date;
}

// ============================================================================
// Task Queue Types
// ============================================================================

/** Task priority levels */
export type TaskPriority = 'low' | 'normal' | 'high' | 'rush';

/** Task status in the queue workflow */
export type TaskStatus =
  | 'pending' // Awaiting review
  | 'approved' // Approved, awaiting assignment
  | 'assigned' // Assigned to assistant
  | 'in_progress' // Being worked on
  | 'review' // Completed, awaiting client review
  | 'completed' // Fully complete
  | 'rejected'; // Rejected by admin

/** PII redaction level for tasks */
export type PIIRedactionLevel = 'none' | 'partial' | 'full';

/** Task queue item */
export interface TaskQueueItem {
  id: string;
  clientId: string;
  projectId?: string;
  organizationId: string;

  // Task content
  title: string;
  description: string;
  attachments?: TaskAttachment[];

  // Workflow
  status: TaskStatus;
  priority: TaskPriority;
  riskScore?: number; // 0-100, PII exposure risk

  // Assignment
  assignedAssistantId?: string;
  assignedAt?: Date;

  // PII handling
  piiRedactionLevel: PIIRedactionLevel;
  redactedDescription?: string; // Description after PII removal

  // Timing
  createdAt: Date;
  updatedAt: Date;
  dueAt?: Date;
  completedAt?: Date;
  estimatedHours: number;
  actualHours?: number;

  // Audit
  createdBy: string;
  statusHistory: TaskStatusChange[];
}

/** Task attachment */
export interface TaskAttachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  piiScanned: boolean;
  piiDetected: boolean;
}

/** Status change audit entry */
export interface TaskStatusChange {
  from: TaskStatus;
  to: TaskStatus;
  changedBy: string;
  changedAt: Date;
  reason?: string;
}

/** Queue statistics */
export interface QueueStats {
  pending: number;
  approved: number;
  assigned: number;
  inProgress: number;
  review: number;
  completed: number;
  rejected: number;
  avgWaitHours: number;
  avgCompletionHours: number;
}

/** Risk statistics */
export interface RiskStats {
  avgScore: number;
  lowRisk: number; // score <= 25
  mediumRisk: number; // 26-50
  highRisk: number; // 51-75
  criticalRisk: number; // > 75
}

// ============================================================================
// Human Assistant Types
// ============================================================================

/** Assistant availability status */
export type AssistantStatus = 'available' | 'busy' | 'offline' | 'on_break';

/** Human assistant profile */
export interface HumanAssistant {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;

  // Status
  status: AssistantStatus;
  statusMessage?: string;
  lastActiveAt?: Date;

  // Capacity
  hoursThisWeek: number;
  maxHoursPerWeek: number;
  activeTasks: string[]; // Task IDs
  maxConcurrentTasks: number;

  // Skills
  skillTags: string[];
  languages: string[];
  timezone: string;

  // Performance
  tasksCompleted: number;
  avgRating?: number;
  avgCompletionHours?: number;

  createdAt: Date;
  updatedAt: Date;
}

/** Assistant assignment result */
export interface AssignmentResult {
  success: boolean;
  taskId: string;
  assistantId?: string;
  error?: string;
  estimatedStartAt?: Date;
}

// ============================================================================
// Client & Organization Types
// ============================================================================

/** Subscription tier */
export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'premium';

/** Hours allocation by tier */
export const TIER_HOURS: Record<SubscriptionTier, number> = {
  free: 0,
  basic: 2,
  pro: 5,
  premium: 20,
};

/** Client organization */
export interface ClientOrganization {
  id: string;
  name: string;
  slug: string;

  // Subscription
  tier: SubscriptionTier;
  humanHoursPerWeek: number;
  hoursUsedThisWeek: number;
  hoursResetAt: Date;

  // PII settings
  piiPolicy: PIIPolicy;

  // Members
  ownerUserId: string;
  memberCount: number;

  createdAt: Date;
  updatedAt: Date;
}

/** Client project within an organization */
export interface ClientProject {
  id: string;
  organizationId: string;
  name: string;
  description?: string;

  // Override org-level settings
  piiPolicyOverride?: Partial<PIIPolicy>;

  // Stats
  taskCount: number;
  completedTaskCount: number;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PII Policy Types
// ============================================================================

/** PII policy configuration */
export interface PIIPolicy {
  // What to redact
  redactNames: boolean;
  redactEmails: boolean;
  redactPhones: boolean;
  redactAddresses: boolean;
  redactFinancials: boolean; // Credit cards, bank accounts
  redactSSN: boolean;
  redactCustomPatterns: string[]; // Regex patterns

  // Break-glass access
  allowBreakGlass: boolean;
  breakGlassApprovers: string[]; // User IDs who can approve
  breakGlassRequiresMultiple: boolean; // Require 2+ approvers
  breakGlassAuditLog: boolean;
}

/** Default PII policy (full redaction) */
export const DEFAULT_PII_POLICY: PIIPolicy = {
  redactNames: true,
  redactEmails: true,
  redactPhones: true,
  redactAddresses: true,
  redactFinancials: true,
  redactSSN: true,
  redactCustomPatterns: [],
  allowBreakGlass: false,
  breakGlassApprovers: [],
  breakGlassRequiresMultiple: false,
  breakGlassAuditLog: true,
};

/** Break-glass access request (admin-level) */
export interface AdminBreakGlassRequest {
  id: string;
  taskId: string;
  requestedBy: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  approvals: BreakGlassApproval[];
  requiredApprovals: number;
  expiresAt: Date;
  createdAt: Date;
}

/** Break-glass approval record */
export interface BreakGlassApproval {
  approverId: string;
  decision: 'approved' | 'denied';
  reason?: string;
  decidedAt: Date;
}

// ============================================================================
// Admin Events
// ============================================================================

/** Admin event types for real-time updates */
export interface AdminEvents {
  'task:created': { task: TaskQueueItem };
  'task:updated': { taskId: string; changes: Partial<TaskQueueItem> };
  'task:assigned': { taskId: string; assistantId: string };
  'task:completed': { taskId: string; actualHours: number };
  'assistant:status': { assistantId: string; status: AssistantStatus };
  'queue:stats': { stats: QueueStats };
  'breakglass:requested': { request: AdminBreakGlassRequest };
  'breakglass:decided': { requestId: string; approved: boolean };
}
