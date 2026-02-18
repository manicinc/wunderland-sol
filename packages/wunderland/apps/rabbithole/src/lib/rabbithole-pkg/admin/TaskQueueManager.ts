/**
 * TaskQueueManager
 *
 * Manages the task queue workflow including approval, assignment, and bulk operations.
 * Based on hackbase-next QueuePage patterns.
 */

import EventEmitter from 'eventemitter3';
import type {
  TaskQueueItem,
  TaskStatus,
  TaskPriority,
  QueueStats,
  RiskStats,
  AssignmentResult,
  TaskStatusChange,
  AdminEvents,
} from './types';

// ============================================================================
// Queue Store Interface
// ============================================================================

/** Storage interface for task queue persistence */
export interface TaskQueueStore {
  getTask(id: string): Promise<TaskQueueItem | null>;
  getTasks(filter?: TaskFilter): Promise<TaskQueueItem[]>;
  createTask(task: Omit<TaskQueueItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<TaskQueueItem>;
  updateTask(id: string, updates: Partial<TaskQueueItem>): Promise<TaskQueueItem | null>;
  deleteTask(id: string): Promise<boolean>;
  getStats(): Promise<QueueStats>;
  getRiskStats(): Promise<RiskStats>;
}

/** Filter options for task queries */
export interface TaskFilter {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  assignedAssistantId?: string;
  clientId?: string;
  organizationId?: string;
  minRiskScore?: number;
  maxRiskScore?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

// ============================================================================
// In-Memory Store (Development)
// ============================================================================

/** In-memory implementation for development/testing */
export class InMemoryTaskQueueStore implements TaskQueueStore {
  private tasks: Map<string, TaskQueueItem> = new Map();
  private idCounter = 0;

  async getTask(id: string): Promise<TaskQueueItem | null> {
    return this.tasks.get(id) || null;
  }

  async getTasks(filter?: TaskFilter): Promise<TaskQueueItem[]> {
    let results = Array.from(this.tasks.values());

    if (filter) {
      if (filter.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
        results = results.filter((t) => statuses.includes(t.status));
      }
      if (filter.priority) {
        const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
        results = results.filter((t) => priorities.includes(t.priority));
      }
      if (filter.assignedAssistantId) {
        results = results.filter((t) => t.assignedAssistantId === filter.assignedAssistantId);
      }
      if (filter.clientId) {
        results = results.filter((t) => t.clientId === filter.clientId);
      }
      if (filter.organizationId) {
        results = results.filter((t) => t.organizationId === filter.organizationId);
      }
      if (filter.minRiskScore !== undefined) {
        results = results.filter((t) => (t.riskScore ?? 0) >= filter.minRiskScore!);
      }
      if (filter.maxRiskScore !== undefined) {
        results = results.filter((t) => (t.riskScore ?? 0) <= filter.maxRiskScore!);
      }
      if (filter.offset) {
        results = results.slice(filter.offset);
      }
      if (filter.limit) {
        results = results.slice(0, filter.limit);
      }
    }

    return results;
  }

  async createTask(
    task: Omit<TaskQueueItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TaskQueueItem> {
    const id = `task_${++this.idCounter}`;
    const now = new Date();
    const newTask: TaskQueueItem = {
      ...task,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(id, newTask);
    return newTask;
  }

  async updateTask(id: string, updates: Partial<TaskQueueItem>): Promise<TaskQueueItem | null> {
    const task = this.tasks.get(id);
    if (!task) return null;

    const updated = {
      ...task,
      ...updates,
      updatedAt: new Date(),
    };
    this.tasks.set(id, updated);
    return updated;
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  async getStats(): Promise<QueueStats> {
    const tasks = Array.from(this.tasks.values());

    const byStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status).length;

    const completedTasks = tasks.filter((t) => t.status === 'completed' && t.completedAt);
    const avgWaitHours =
      completedTasks.length > 0
        ? completedTasks.reduce((sum, t) => {
            const waitMs =
              (t.assignedAt?.getTime() ?? t.createdAt.getTime()) - t.createdAt.getTime();
            return sum + waitMs / (1000 * 60 * 60);
          }, 0) / completedTasks.length
        : 0;

    const avgCompletionHours =
      completedTasks.length > 0
        ? completedTasks.reduce((sum, t) => sum + (t.actualHours ?? 0), 0) / completedTasks.length
        : 0;

    return {
      pending: byStatus('pending'),
      approved: byStatus('approved'),
      assigned: byStatus('assigned'),
      inProgress: byStatus('in_progress'),
      review: byStatus('review'),
      completed: byStatus('completed'),
      rejected: byStatus('rejected'),
      avgWaitHours,
      avgCompletionHours,
    };
  }

  async getRiskStats(): Promise<RiskStats> {
    const tasks = Array.from(this.tasks.values());
    const withRisk = tasks.filter((t) => t.riskScore !== undefined);

    if (withRisk.length === 0) {
      return { avgScore: 0, lowRisk: 0, mediumRisk: 0, highRisk: 0, criticalRisk: 0 };
    }

    return {
      avgScore: withRisk.reduce((sum, t) => sum + t.riskScore!, 0) / withRisk.length,
      lowRisk: withRisk.filter((t) => t.riskScore! <= 25).length,
      mediumRisk: withRisk.filter((t) => t.riskScore! > 25 && t.riskScore! <= 50).length,
      highRisk: withRisk.filter((t) => t.riskScore! > 50 && t.riskScore! <= 75).length,
      criticalRisk: withRisk.filter((t) => t.riskScore! > 75).length,
    };
  }
}

// ============================================================================
// TaskQueueManager
// ============================================================================

export interface TaskQueueManagerConfig {
  store: TaskQueueStore;
  autoApproveRiskThreshold?: number; // Tasks below this score auto-approve (default: 25)
  maxPendingPerClient?: number; // Limit pending tasks per client
}

export class TaskQueueManager extends EventEmitter<AdminEvents> {
  private store: TaskQueueStore;
  private config: Required<TaskQueueManagerConfig>;

  constructor(config: TaskQueueManagerConfig) {
    super();
    this.store = config.store;
    this.config = {
      store: config.store,
      autoApproveRiskThreshold: config.autoApproveRiskThreshold ?? 25,
      maxPendingPerClient: config.maxPendingPerClient ?? 10,
    };
  }

  // --------------------------------------------------------------------------
  // Task CRUD
  // --------------------------------------------------------------------------

  async createTask(
    task: Omit<TaskQueueItem, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'>
  ): Promise<TaskQueueItem> {
    const created = await this.store.createTask({
      ...task,
      statusHistory: [],
    });

    this.emit('task:created', { task: created });
    return created;
  }

  async getTask(id: string): Promise<TaskQueueItem | null> {
    return this.store.getTask(id);
  }

  async getTasks(filter?: TaskFilter): Promise<TaskQueueItem[]> {
    return this.store.getTasks(filter);
  }

  async getStats(): Promise<{ queue: QueueStats; risk: RiskStats }> {
    const [queue, risk] = await Promise.all([this.store.getStats(), this.store.getRiskStats()]);
    return { queue, risk };
  }

  // --------------------------------------------------------------------------
  // Status Transitions
  // --------------------------------------------------------------------------

  private async changeStatus(
    taskId: string,
    newStatus: TaskStatus,
    changedBy: string,
    reason?: string
  ): Promise<TaskQueueItem | null> {
    const task = await this.store.getTask(taskId);
    if (!task) return null;

    const change: TaskStatusChange = {
      from: task.status,
      to: newStatus,
      changedBy,
      changedAt: new Date(),
      reason,
    };

    const updates: Partial<TaskQueueItem> = {
      status: newStatus,
      statusHistory: [...task.statusHistory, change],
    };

    // Set timestamps for specific transitions
    if (newStatus === 'completed') {
      updates.completedAt = new Date();
    }

    const updated = await this.store.updateTask(taskId, updates);
    if (updated) {
      this.emit('task:updated', { taskId, changes: updates });
    }
    return updated;
  }

  async approveTask(taskId: string, approvedBy: string): Promise<TaskQueueItem | null> {
    return this.changeStatus(taskId, 'approved', approvedBy, 'Approved for assignment');
  }

  async rejectTask(
    taskId: string,
    rejectedBy: string,
    reason: string
  ): Promise<TaskQueueItem | null> {
    return this.changeStatus(taskId, 'rejected', rejectedBy, reason);
  }

  async assignTask(
    taskId: string,
    assistantId: string,
    assignedBy: string
  ): Promise<AssignmentResult> {
    const task = await this.store.getTask(taskId);
    if (!task) {
      return { success: false, taskId, error: 'Task not found' };
    }

    if (task.status !== 'approved' && task.status !== 'pending') {
      return { success: false, taskId, error: `Cannot assign task with status: ${task.status}` };
    }

    const updated = await this.store.updateTask(taskId, {
      status: 'assigned',
      assignedAssistantId: assistantId,
      assignedAt: new Date(),
      statusHistory: [
        ...task.statusHistory,
        {
          from: task.status,
          to: 'assigned',
          changedBy: assignedBy,
          changedAt: new Date(),
          reason: `Assigned to assistant ${assistantId}`,
        },
      ],
    });

    if (updated) {
      this.emit('task:assigned', { taskId, assistantId });
      return { success: true, taskId, assistantId, estimatedStartAt: new Date() };
    }

    return { success: false, taskId, error: 'Failed to update task' };
  }

  async startTask(taskId: string, assistantId: string): Promise<TaskQueueItem | null> {
    return this.changeStatus(taskId, 'in_progress', assistantId, 'Work started');
  }

  async submitForReview(taskId: string, assistantId: string): Promise<TaskQueueItem | null> {
    return this.changeStatus(taskId, 'review', assistantId, 'Submitted for client review');
  }

  async completeTask(
    taskId: string,
    completedBy: string,
    actualHours: number
  ): Promise<TaskQueueItem | null> {
    const task = await this.store.getTask(taskId);
    if (!task) return null;

    const updated = await this.store.updateTask(taskId, {
      status: 'completed',
      completedAt: new Date(),
      actualHours,
      statusHistory: [
        ...task.statusHistory,
        {
          from: task.status,
          to: 'completed',
          changedBy: completedBy,
          changedAt: new Date(),
        },
      ],
    });

    if (updated) {
      this.emit('task:completed', { taskId, actualHours });
    }
    return updated;
  }

  // --------------------------------------------------------------------------
  // Bulk Operations
  // --------------------------------------------------------------------------

  async bulkApprove(
    taskIds: string[],
    approvedBy: string
  ): Promise<{ approved: number; failed: number }> {
    let approved = 0;
    let failed = 0;

    for (const id of taskIds) {
      const result = await this.approveTask(id, approvedBy);
      if (result) {
        approved++;
      } else {
        failed++;
      }
    }

    return { approved, failed };
  }

  async bulkReject(
    taskIds: string[],
    rejectedBy: string,
    reason: string
  ): Promise<{ rejected: number; failed: number }> {
    let rejected = 0;
    let failed = 0;

    for (const id of taskIds) {
      const result = await this.rejectTask(id, rejectedBy, reason);
      if (result) {
        rejected++;
      } else {
        failed++;
      }
    }

    return { rejected, failed };
  }

  async autoApproveLowRisk(approvedBy: string): Promise<{
    approved: number;
    rejected: number;
    pendingReview: number;
  }> {
    const pendingTasks = await this.store.getTasks({ status: 'pending' });

    let approved = 0;
    let rejected = 0;
    let pendingReview = 0;

    for (const task of pendingTasks) {
      const riskScore = task.riskScore ?? 50; // Default to medium if not scored

      if (riskScore <= this.config.autoApproveRiskThreshold) {
        const result = await this.approveTask(task.id, approvedBy);
        if (result) approved++;
      } else if (riskScore > 75) {
        // Auto-reject critical risk
        const result = await this.rejectTask(
          task.id,
          approvedBy,
          'Auto-rejected: Critical PII risk'
        );
        if (result) rejected++;
      } else {
        pendingReview++;
      }
    }

    return { approved, rejected, pendingReview };
  }

  // --------------------------------------------------------------------------
  // Queue Status
  // --------------------------------------------------------------------------

  async getWaitTimeEstimate(priority: TaskPriority): Promise<{
    position: number;
    estimatedHours: number;
    estimatedDate: Date;
  }> {
    const stats = await this.store.getStats();
    const totalPending = stats.pending + stats.approved + stats.assigned;

    const hoursPerTask = 0.5;
    const baseHours = priority === 'rush' ? 4 : 16;
    const priorityMultiplier = priority === 'rush' ? 0.3 : priority === 'high' ? 0.6 : 1;

    const estimatedHours = Math.max(baseHours, totalPending * hoursPerTask * priorityMultiplier);

    return {
      position: totalPending,
      estimatedHours,
      estimatedDate: new Date(Date.now() + estimatedHours * 60 * 60 * 1000),
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createTaskQueueManager(config?: Partial<TaskQueueManagerConfig>): TaskQueueManager {
  return new TaskQueueManager({
    store: config?.store ?? new InMemoryTaskQueueStore(),
    ...config,
  });
}
