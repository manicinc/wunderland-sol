/**
 * Admin Module Exports
 *
 * Human assistant management, task queuing, and RBAC.
 */

// Types
export type {
  UserRole,
  Permission,
  RoleUser,
  TaskPriority,
  TaskStatus,
  PIIRedactionLevel,
  TaskQueueItem,
  TaskAttachment,
  TaskStatusChange,
  QueueStats,
  RiskStats,
  AssistantStatus,
  HumanAssistant,
  AssignmentResult,
  SubscriptionTier,
  ClientOrganization,
  ClientProject,
  PIIPolicy,
  AdminBreakGlassRequest,
  BreakGlassApproval,
  AdminEvents,
} from './types';

// Constants
export { ROLE_PERMISSIONS, TIER_HOURS, DEFAULT_PII_POLICY } from './types';

// Task Queue
export type { TaskQueueStore, TaskFilter, TaskQueueManagerConfig } from './TaskQueueManager';
export {
  InMemoryTaskQueueStore,
  TaskQueueManager,
  createTaskQueueManager,
} from './TaskQueueManager';
