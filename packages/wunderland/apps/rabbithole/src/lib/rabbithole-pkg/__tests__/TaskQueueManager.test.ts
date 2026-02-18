/**
 * TaskQueueManager Tests
 *
 * Tests for task queue CRUD, status transitions, bulk operations, and auto-approve.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TaskQueueManager,
  InMemoryTaskQueueStore,
  createTaskQueueManager,
} from '../admin/TaskQueueManager';
import type { TaskQueueItem, TaskPriority } from '../admin/types';

describe('TaskQueueManager', () => {
  let manager: TaskQueueManager;
  let store: InMemoryTaskQueueStore;

  beforeEach(() => {
    store = new InMemoryTaskQueueStore();
    manager = new TaskQueueManager({ store });
  });

  // --------------------------------------------------------------------------
  // InMemoryTaskQueueStore Tests
  // --------------------------------------------------------------------------

  describe('InMemoryTaskQueueStore', () => {
    it('should create and retrieve a task', async () => {
      const task = await store.createTask({
        clientId: 'client_1',
        organizationId: 'org_1',
        title: 'Test Task',
        description: 'Test description',
        status: 'pending',
        priority: 'normal',
        piiRedactionLevel: 'partial',
        estimatedHours: 2,
        createdBy: 'user_1',
        statusHistory: [],
      });

      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.createdAt).toBeInstanceOf(Date);

      const retrieved = await store.getTask(task.id);
      expect(retrieved).toEqual(task);
    });

    it('should filter tasks by status', async () => {
      await store.createTask({
        clientId: 'c1',
        organizationId: 'org_1',
        title: 'Pending Task',
        description: '',
        status: 'pending',
        priority: 'normal',
        piiRedactionLevel: 'none',
        estimatedHours: 1,
        createdBy: 'u1',
        statusHistory: [],
      });

      await store.createTask({
        clientId: 'c1',
        organizationId: 'org_1',
        title: 'Approved Task',
        description: '',
        status: 'approved',
        priority: 'normal',
        piiRedactionLevel: 'none',
        estimatedHours: 1,
        createdBy: 'u1',
        statusHistory: [],
      });

      const pending = await store.getTasks({ status: 'pending' });
      expect(pending).toHaveLength(1);
      expect(pending[0].title).toBe('Pending Task');

      const approved = await store.getTasks({ status: 'approved' });
      expect(approved).toHaveLength(1);
      expect(approved[0].title).toBe('Approved Task');
    });

    it('should calculate queue stats', async () => {
      await store.createTask({
        clientId: 'c1',
        organizationId: 'org_1',
        title: 'T1',
        description: '',
        status: 'pending',
        priority: 'normal',
        piiRedactionLevel: 'none',
        estimatedHours: 1,
        createdBy: 'u1',
        statusHistory: [],
      });

      await store.createTask({
        clientId: 'c1',
        organizationId: 'org_1',
        title: 'T2',
        description: '',
        status: 'completed',
        priority: 'normal',
        piiRedactionLevel: 'none',
        estimatedHours: 1,
        createdBy: 'u1',
        statusHistory: [],
        completedAt: new Date(),
        actualHours: 2,
      });

      const stats = await store.getStats();
      expect(stats.pending).toBe(1);
      expect(stats.completed).toBe(1);
    });

    it('should calculate risk stats', async () => {
      await store.createTask({
        clientId: 'c1',
        organizationId: 'org_1',
        title: 'Low Risk',
        description: '',
        status: 'pending',
        priority: 'normal',
        piiRedactionLevel: 'none',
        estimatedHours: 1,
        createdBy: 'u1',
        statusHistory: [],
        riskScore: 10,
      });

      await store.createTask({
        clientId: 'c1',
        organizationId: 'org_1',
        title: 'High Risk',
        description: '',
        status: 'pending',
        priority: 'normal',
        piiRedactionLevel: 'full',
        estimatedHours: 1,
        createdBy: 'u1',
        statusHistory: [],
        riskScore: 80,
      });

      const riskStats = await store.getRiskStats();
      expect(riskStats.lowRisk).toBe(1);
      expect(riskStats.criticalRisk).toBe(1);
      expect(riskStats.avgScore).toBe(45);
    });
  });

  // --------------------------------------------------------------------------
  // TaskQueueManager Tests
  // --------------------------------------------------------------------------

  describe('Task CRUD', () => {
    it('should create a task and emit event', async () => {
      const eventSpy = vi.fn();
      manager.on('task:created', eventSpy);

      const task = await manager.createTask({
        clientId: 'client_1',
        organizationId: 'org_1',
        title: 'New Task',
        description: 'Task description',
        status: 'pending',
        priority: 'normal',
        piiRedactionLevel: 'partial',
        estimatedHours: 3,
        createdBy: 'admin_1',
      });

      expect(task.id).toBeDefined();
      expect(task.statusHistory).toEqual([]);
      expect(eventSpy).toHaveBeenCalledWith({ task });
    });

    it('should get queue and risk stats', async () => {
      await manager.createTask({
        clientId: 'c1',
        organizationId: 'org_1',
        title: 'T1',
        description: '',
        status: 'pending',
        priority: 'normal',
        piiRedactionLevel: 'none',
        estimatedHours: 1,
        createdBy: 'u1',
        riskScore: 20,
      });

      const stats = await manager.getStats();
      expect(stats.queue.pending).toBe(1);
      expect(stats.risk.lowRisk).toBe(1);
    });
  });

  describe('Status Transitions', () => {
    let task: TaskQueueItem;

    beforeEach(async () => {
      task = await manager.createTask({
        clientId: 'client_1',
        organizationId: 'org_1',
        title: 'Test Task',
        description: 'Description',
        status: 'pending',
        priority: 'normal',
        piiRedactionLevel: 'partial',
        estimatedHours: 2,
        createdBy: 'user_1',
      });
    });

    it('should approve a task', async () => {
      const approved = await manager.approveTask(task.id, 'admin_1');

      expect(approved?.status).toBe('approved');
      expect(approved?.statusHistory).toHaveLength(1);
      expect(approved?.statusHistory[0].from).toBe('pending');
      expect(approved?.statusHistory[0].to).toBe('approved');
      expect(approved?.statusHistory[0].changedBy).toBe('admin_1');
    });

    it('should reject a task with reason', async () => {
      const rejected = await manager.rejectTask(task.id, 'admin_1', 'PII risk too high');

      expect(rejected?.status).toBe('rejected');
      expect(rejected?.statusHistory[0].reason).toBe('PII risk too high');
    });

    it('should assign a task to an assistant', async () => {
      const eventSpy = vi.fn();
      manager.on('task:assigned', eventSpy);

      await manager.approveTask(task.id, 'admin_1');
      const result = await manager.assignTask(task.id, 'assistant_1', 'admin_1');

      expect(result.success).toBe(true);
      expect(result.assistantId).toBe('assistant_1');
      expect(eventSpy).toHaveBeenCalledWith({
        taskId: task.id,
        assistantId: 'assistant_1',
      });

      const updated = await manager.getTask(task.id);
      expect(updated?.status).toBe('assigned');
      expect(updated?.assignedAssistantId).toBe('assistant_1');
    });

    it('should complete a task with actual hours', async () => {
      const eventSpy = vi.fn();
      manager.on('task:completed', eventSpy);

      await manager.approveTask(task.id, 'admin_1');
      await manager.assignTask(task.id, 'assistant_1', 'admin_1');
      await manager.startTask(task.id, 'assistant_1');

      const completed = await manager.completeTask(task.id, 'assistant_1', 2.5);

      expect(completed?.status).toBe('completed');
      expect(completed?.actualHours).toBe(2.5);
      expect(completed?.completedAt).toBeInstanceOf(Date);
      expect(eventSpy).toHaveBeenCalledWith({ taskId: task.id, actualHours: 2.5 });
    });

    it('should return null for non-existent task', async () => {
      const result = await manager.approveTask('non_existent', 'admin_1');
      expect(result).toBeNull();
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(async () => {
      for (let i = 0; i < 5; i++) {
        await manager.createTask({
          clientId: 'c1',
          organizationId: 'org_1',
          title: `Task ${i}`,
          description: '',
          status: 'pending',
          priority: 'normal',
          piiRedactionLevel: 'none',
          estimatedHours: 1,
          createdBy: 'u1',
        });
      }
    });

    it('should bulk approve multiple tasks', async () => {
      const tasks = await manager.getTasks({ status: 'pending' });
      const ids = tasks.map((t) => t.id);

      const result = await manager.bulkApprove(ids, 'admin_1');

      expect(result.approved).toBe(5);
      expect(result.failed).toBe(0);

      const approved = await manager.getTasks({ status: 'approved' });
      expect(approved).toHaveLength(5);
    });

    it('should bulk reject multiple tasks', async () => {
      const tasks = await manager.getTasks({ status: 'pending' });
      const ids = tasks.slice(0, 3).map((t) => t.id);

      const result = await manager.bulkReject(ids, 'admin_1', 'Bulk rejected');

      expect(result.rejected).toBe(3);
      expect(result.failed).toBe(0);

      const pending = await manager.getTasks({ status: 'pending' });
      expect(pending).toHaveLength(2);
    });
  });

  describe('Auto-Approve Low Risk', () => {
    it('should auto-approve low risk tasks', async () => {
      // Create tasks with different risk scores
      await manager.createTask({
        clientId: 'c1',
        organizationId: 'org_1',
        title: 'Low Risk Task',
        description: '',
        status: 'pending',
        priority: 'normal',
        piiRedactionLevel: 'none',
        estimatedHours: 1,
        createdBy: 'u1',
        riskScore: 10, // Low risk
      });

      await manager.createTask({
        clientId: 'c1',
        organizationId: 'org_1',
        title: 'Medium Risk Task',
        description: '',
        status: 'pending',
        priority: 'normal',
        piiRedactionLevel: 'partial',
        estimatedHours: 1,
        createdBy: 'u1',
        riskScore: 40, // Medium risk
      });

      await manager.createTask({
        clientId: 'c1',
        organizationId: 'org_1',
        title: 'Critical Risk Task',
        description: '',
        status: 'pending',
        priority: 'normal',
        piiRedactionLevel: 'full',
        estimatedHours: 1,
        createdBy: 'u1',
        riskScore: 90, // Critical risk
      });

      const result = await manager.autoApproveLowRisk('admin_1');

      expect(result.approved).toBe(1); // Low risk auto-approved
      expect(result.rejected).toBe(1); // Critical risk auto-rejected
      expect(result.pendingReview).toBe(1); // Medium risk needs review
    });
  });

  describe('Wait Time Estimation', () => {
    it('should estimate wait time based on queue', async () => {
      // Create some pending tasks
      for (let i = 0; i < 10; i++) {
        await manager.createTask({
          clientId: 'c1',
          organizationId: 'org_1',
          title: `Task ${i}`,
          description: '',
          status: 'pending',
          priority: 'normal',
          piiRedactionLevel: 'none',
          estimatedHours: 1,
          createdBy: 'u1',
        });
      }

      const normalEstimate = await manager.getWaitTimeEstimate('normal');
      const rushEstimate = await manager.getWaitTimeEstimate('rush');

      expect(normalEstimate.position).toBe(10);
      expect(rushEstimate.estimatedHours).toBeLessThan(normalEstimate.estimatedHours);
      expect(normalEstimate.estimatedDate).toBeInstanceOf(Date);
    });
  });

  describe('Factory Functions', () => {
    it('should create manager with default store', () => {
      const mgr = createTaskQueueManager();
      expect(mgr).toBeInstanceOf(TaskQueueManager);
    });

    it('should create manager with custom config', () => {
      const mgr = createTaskQueueManager({
        autoApproveRiskThreshold: 15,
      });
      expect(mgr).toBeInstanceOf(TaskQueueManager);
    });
  });
});
