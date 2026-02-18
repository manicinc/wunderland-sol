/**
 * @file job-execution.service.test.ts
 * @description Comprehensive unit tests for the JobExecutionService.
 *
 * Strategy:
 * - Mock the `wunderland` package so JobExecutor / BidLifecycleManager are stubs.
 * - Mock DatabaseService and WunderlandSolService with vi.fn() helpers.
 * - The service reads env vars at class-body evaluation time (field initializers),
 *   so we construct new instances per test with the appropriate env vars already set.
 * - Private DB callbacks are tested by capturing the config objects passed to the
 *   JobExecutor / BidLifecycleManager constructors during onModuleInit().
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks for the `wunderland` package
// ---------------------------------------------------------------------------

const mockJobExecutor = {
  start: vi.fn(),
  stop: vi.fn(),
  getStatus: vi.fn(() => ({
    isRunning: false,
    activeExecutions: 0,
    maxConcurrent: 1,
  })),
  executeJob: vi.fn(),
};

const mockBidLifecycleManager = {
  start: vi.fn(),
  stop: vi.fn(),
  getStatus: vi.fn(() => ({
    isRunning: false,
    stats: { totalWithdrawn: 0, totalMarkedInactive: 0, lastPollAt: null },
  })),
};

const MockJobExecutorCtor = vi.fn(() => mockJobExecutor);
const MockBidLifecycleManagerCtor = vi.fn(() => mockBidLifecycleManager);

vi.mock('wunderland', () => ({
  JobExecutor: MockJobExecutorCtor,
  DeliverableManager: vi.fn(),
  QualityChecker: vi.fn(() => ({})),
  BidLifecycleManager: MockBidLifecycleManagerCtor,
}));

// ---------------------------------------------------------------------------
// Mock NestJS decorators (they are no-ops in unit tests)
// ---------------------------------------------------------------------------

vi.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
  Logger: vi.fn(() => ({
    log: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  })),
  OnModuleInit: undefined,
  OnModuleDestroy: undefined,
}));

// ---------------------------------------------------------------------------
// Stub the relative service imports so we don't pull in real modules
// ---------------------------------------------------------------------------

vi.mock('../database/database.service.js', () => ({
  DatabaseService: vi.fn(),
}));

vi.mock('../modules/wunderland/wunderland-sol/wunderland-sol.service.js', () => ({
  WunderlandSolService: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockDb() {
  return {
    get: vi.fn(),
    all: vi.fn().mockResolvedValue([]),
    run: vi.fn().mockResolvedValue({ lastInsertRowid: 0, changes: 1 }),
  };
}

function createMockSolService(enabled = false) {
  return {
    getStatus: vi.fn(() => ({ enabled })),
    submitJob: vi.fn().mockResolvedValue({ success: true, signature: 'sol-sig-123' }),
    withdrawJobBid: vi.fn().mockResolvedValue({ success: true, signature: 'withdraw-sig-456' }),
  };
}

/**
 * Import the service class. Because env vars are evaluated in class field
 * initializers (at construction time), we must set them BEFORE calling `new`.
 * The module itself is cached (we do NOT reset modules), so the class definition
 * is stable across tests. Each `new` call re-evaluates the field initializers
 * with whatever env vars are set at that moment.
 */
async function createServiceInstance(
  db: ReturnType<typeof createMockDb>,
  sol: ReturnType<typeof createMockSolService>,
) {
  const { JobExecutionService } = await import(
    '../modules/wunderland/jobs/job-execution.service.js'
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (JobExecutionService as any)(db, sol);
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('JobExecutionService', () => {
  let db: ReturnType<typeof createMockDb>;
  let sol: ReturnType<typeof createMockSolService>;

  // Snapshot the env vars we touch so we can restore them
  let savedEnableJobExecution: string | undefined;
  let savedAgentId: string | undefined;
  let savedPollInterval: string | undefined;

  beforeEach(() => {
    savedEnableJobExecution = process.env.ENABLE_JOB_EXECUTION;
    savedAgentId = process.env.JOB_EXECUTION_AGENT_ID;
    savedPollInterval = process.env.JOB_EXECUTION_POLL_INTERVAL_MS;

    vi.clearAllMocks();
    MockJobExecutorCtor.mockClear();
    MockBidLifecycleManagerCtor.mockClear();

    db = createMockDb();
    sol = createMockSolService();
  });

  afterEach(() => {
    // Restore only the env vars we touched
    const restore = (key: string, val: string | undefined) => {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    };
    restore('ENABLE_JOB_EXECUTION', savedEnableJobExecution);
    restore('JOB_EXECUTION_AGENT_ID', savedAgentId);
    restore('JOB_EXECUTION_POLL_INTERVAL_MS', savedPollInterval);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // onModuleInit
  // ═══════════════════════════════════════════════════════════════════════════

  describe('onModuleInit', () => {
    it('should be a no-op when ENABLE_JOB_EXECUTION is not set', async () => {
      delete process.env.ENABLE_JOB_EXECUTION;
      delete process.env.JOB_EXECUTION_AGENT_ID;
      const svc = await createServiceInstance(db, sol);
      svc.onModuleInit();

      expect(MockJobExecutorCtor).not.toHaveBeenCalled();
      expect(MockBidLifecycleManagerCtor).not.toHaveBeenCalled();
    });

    it('should be a no-op when ENABLE_JOB_EXECUTION is "false"', async () => {
      process.env.ENABLE_JOB_EXECUTION = 'false';
      delete process.env.JOB_EXECUTION_AGENT_ID;
      const svc = await createServiceInstance(db, sol);
      svc.onModuleInit();

      expect(MockJobExecutorCtor).not.toHaveBeenCalled();
    });

    it('should warn and skip when enabled but JOB_EXECUTION_AGENT_ID is empty', async () => {
      process.env.ENABLE_JOB_EXECUTION = 'true';
      delete process.env.JOB_EXECUTION_AGENT_ID;
      const svc = await createServiceInstance(db, sol);
      svc.onModuleInit();

      expect(MockJobExecutorCtor).not.toHaveBeenCalled();
    });

    it('should create JobExecutor and BidLifecycleManager when fully configured', async () => {
      process.env.ENABLE_JOB_EXECUTION = 'true';
      process.env.JOB_EXECUTION_AGENT_ID = 'agent-seed-1';
      const svc = await createServiceInstance(db, sol);
      svc.onModuleInit();

      expect(MockJobExecutorCtor).toHaveBeenCalledTimes(1);
      expect(MockBidLifecycleManagerCtor).toHaveBeenCalledTimes(1);
      expect(mockJobExecutor.start).toHaveBeenCalledWith('agent-seed-1');
      expect(mockBidLifecycleManager.start).toHaveBeenCalledWith('agent-seed-1');
    });

    it('should respect JOB_EXECUTION_POLL_INTERVAL_MS with a 5 s floor', async () => {
      process.env.ENABLE_JOB_EXECUTION = 'true';
      process.env.JOB_EXECUTION_AGENT_ID = 'agent-1';
      process.env.JOB_EXECUTION_POLL_INTERVAL_MS = '1000'; // below floor
      const svc = await createServiceInstance(db, sol);
      svc.onModuleInit();

      const config = MockJobExecutorCtor.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(config.pollIntervalMs).toBeGreaterThanOrEqual(5000);
    });

    it('should use the provided poll interval when above the 5 s floor', async () => {
      process.env.ENABLE_JOB_EXECUTION = 'true';
      process.env.JOB_EXECUTION_AGENT_ID = 'agent-1';
      process.env.JOB_EXECUTION_POLL_INTERVAL_MS = '60000';
      const svc = await createServiceInstance(db, sol);
      svc.onModuleInit();

      const config = MockJobExecutorCtor.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(config.pollIntervalMs).toBe(60000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // onModuleDestroy
  // ═══════════════════════════════════════════════════════════════════════════

  describe('onModuleDestroy', () => {
    it('should stop both loops when they were started', async () => {
      process.env.ENABLE_JOB_EXECUTION = 'true';
      process.env.JOB_EXECUTION_AGENT_ID = 'agent-1';
      const svc = await createServiceInstance(db, sol);
      svc.onModuleInit();
      svc.onModuleDestroy();

      expect(mockJobExecutor.stop).toHaveBeenCalledTimes(1);
      expect(mockBidLifecycleManager.stop).toHaveBeenCalledTimes(1);
    });

    it('should be safe to call when loops were never started', async () => {
      delete process.env.ENABLE_JOB_EXECUTION;
      const svc = await createServiceInstance(db, sol);
      svc.onModuleInit(); // no-op because disabled
      expect(() => svc.onModuleDestroy()).not.toThrow();
      expect(mockJobExecutor.stop).not.toHaveBeenCalled();
      expect(mockBidLifecycleManager.stop).not.toHaveBeenCalled();
    });

    it('should null out executor and bidLifecycleManager after stopping', async () => {
      process.env.ENABLE_JOB_EXECUTION = 'true';
      process.env.JOB_EXECUTION_AGENT_ID = 'agent-1';
      const svc = await createServiceInstance(db, sol);
      svc.onModuleInit();
      svc.onModuleDestroy();

      const status = svc.getStatus();
      expect(status.executor).toBeNull();
      expect(status.bidLifecycle).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getStatus
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getStatus', () => {
    it('should return disabled status when not enabled', async () => {
      delete process.env.ENABLE_JOB_EXECUTION;
      delete process.env.JOB_EXECUTION_AGENT_ID;
      const svc = await createServiceInstance(db, sol);
      const status = svc.getStatus();

      expect(status.enabled).toBe(false);
      expect(status.agentId).toBe('');
      expect(status.executor).toBeNull();
      expect(status.bidLifecycle).toBeNull();
    });

    it('should return active status when loops are running', async () => {
      process.env.ENABLE_JOB_EXECUTION = 'true';
      process.env.JOB_EXECUTION_AGENT_ID = 'agent-1';
      const svc = await createServiceInstance(db, sol);
      svc.onModuleInit();

      const status = svc.getStatus();
      expect(status.enabled).toBe(true);
      expect(status.agentId).toBe('agent-1');
      expect(status.executor).toBeDefined();
      expect(status.executor).not.toBeNull();
      expect(status.bidLifecycle).not.toBeNull();
    });

    it('should delegate to executor.getStatus() and bidLifecycleManager.getStatus()', async () => {
      process.env.ENABLE_JOB_EXECUTION = 'true';
      process.env.JOB_EXECUTION_AGENT_ID = 'agent-1';
      const svc = await createServiceInstance(db, sol);
      svc.onModuleInit();

      svc.getStatus();
      expect(mockJobExecutor.getStatus).toHaveBeenCalled();
      expect(mockBidLifecycleManager.getStatus).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // triggerExecution
  // ═══════════════════════════════════════════════════════════════════════════

  describe('triggerExecution', () => {
    it('should return error when job execution is not enabled', async () => {
      delete process.env.ENABLE_JOB_EXECUTION;
      const svc = await createServiceInstance(db, sol);
      const result = await svc.triggerExecution('job-pda-1');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not enabled/i);
    });

    it('should return error when job is not found in DB', async () => {
      process.env.ENABLE_JOB_EXECUTION = 'true';
      process.env.JOB_EXECUTION_AGENT_ID = 'agent-1';
      const svc = await createServiceInstance(db, sol);
      svc.onModuleInit();

      db.get.mockResolvedValueOnce(undefined);
      const result = await svc.triggerExecution('nonexistent-job');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
    });

    it('should return error when job status is not "assigned"', async () => {
      process.env.ENABLE_JOB_EXECUTION = 'true';
      process.env.JOB_EXECUTION_AGENT_ID = 'agent-1';
      const svc = await createServiceInstance(db, sol);
      svc.onModuleInit();

      db.get.mockResolvedValueOnce({
        job_pda: 'job-1',
        title: 'Some Job',
        description: 'Desc',
        status: 'completed',
        budget_lamports: '100000',
        assigned_agent_pda: 'agent-1',
        metadata_json: null,
      });

      const result = await svc.triggerExecution('job-1');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/status is "completed"/);
    });

    it('should execute the job successfully when everything is valid', async () => {
      process.env.ENABLE_JOB_EXECUTION = 'true';
      process.env.JOB_EXECUTION_AGENT_ID = 'agent-1';
      const svc = await createServiceInstance(db, sol);
      svc.onModuleInit();

      db.get.mockResolvedValueOnce({
        job_pda: 'job-1',
        title: 'Write a report',
        description: 'Detailed analysis',
        status: 'assigned',
        budget_lamports: '500000',
        assigned_agent_pda: 'agent-1',
        metadata_json: '{"category":"research"}',
      });

      mockJobExecutor.executeJob.mockResolvedValueOnce({
        success: true,
        deliverableId: 'deliv-1',
        qualityScore: 0.85,
      });

      const result = await svc.triggerExecution('job-1');
      expect(result.success).toBe(true);
      expect(result.deliverableId).toBe('deliv-1');
      expect(mockJobExecutor.executeJob).toHaveBeenCalledWith('agent-1', {
        id: 'job-1',
        title: 'Write a report',
        description: 'Detailed analysis',
        category: 'research',
        budgetLamports: 500000,
        deadline: null,
      });
    });

    it('should default title to "Untitled" and description to "" when null', async () => {
      process.env.ENABLE_JOB_EXECUTION = 'true';
      process.env.JOB_EXECUTION_AGENT_ID = 'agent-1';
      const svc = await createServiceInstance(db, sol);
      svc.onModuleInit();

      db.get.mockResolvedValueOnce({
        job_pda: 'job-2',
        title: null,
        description: null,
        status: 'assigned',
        budget_lamports: '100',
        assigned_agent_pda: 'agent-1',
        metadata_json: null,
      });

      mockJobExecutor.executeJob.mockResolvedValueOnce({ success: true });

      await svc.triggerExecution('job-2');
      const callArg = mockJobExecutor.executeJob.mock.calls[0]?.[1];
      expect(callArg.title).toBe('Untitled');
      expect(callArg.description).toBe('');
      expect(callArg.category).toBe('general');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DB Callbacks — JobExecutor (tested via captured constructor config)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('JobExecutor callbacks', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let executorConfig: any;

    beforeEach(async () => {
      process.env.ENABLE_JOB_EXECUTION = 'true';
      process.env.JOB_EXECUTION_AGENT_ID = 'agent-1';
      const svc = await createServiceInstance(db, sol);
      svc.onModuleInit();

      executorConfig = MockJobExecutorCtor.mock.calls[0]?.[0];
    });

    describe('fetchAssignedJobs', () => {
      it('should query the DB and return mapped AssignedJob[]', async () => {
        db.all.mockResolvedValueOnce([
          {
            job_pda: 'job-a',
            title: 'Task A',
            description: 'Do A',
            status: 'assigned',
            budget_lamports: '200000',
            assigned_agent_pda: 'agent-1',
            metadata_json: '{"category":"dev"}',
          },
          {
            job_pda: 'job-b',
            title: null,
            description: null,
            status: 'assigned',
            budget_lamports: '50000',
            assigned_agent_pda: 'agent-1',
            metadata_json: null,
          },
        ]);

        const result = await executorConfig.fetchAssignedJobs('agent-1', 5);

        expect(db.all).toHaveBeenCalledTimes(1);
        const [sql, params] = db.all.mock.calls[0];
        expect(sql).toContain("status = 'assigned'");
        expect(sql).toContain('assigned_agent_pda = ?');
        expect(sql).toContain('LIMIT ?');
        expect(params).toEqual(['agent-1', 5]);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          id: 'job-a',
          title: 'Task A',
          description: 'Do A',
          category: 'dev',
          budgetLamports: 200000,
          deadline: null,
        });
        expect(result[1]).toEqual({
          id: 'job-b',
          title: 'Untitled',
          description: '',
          category: 'general',
          budgetLamports: 50000,
          deadline: null,
        });
      });

      it('should return empty array when no assigned jobs', async () => {
        db.all.mockResolvedValueOnce([]);
        const result = await executorConfig.fetchAssignedJobs('agent-1', 10);
        expect(result).toEqual([]);
      });
    });

    describe('onExecutionStart', () => {
      it('should update execution_started_at in the DB', async () => {
        const before = Date.now();
        await executorConfig.onExecutionStart('agent-1', 'job-x');

        expect(db.run).toHaveBeenCalledTimes(1);
        const [sql, params] = db.run.mock.calls[0];
        expect(sql).toContain('execution_started_at');
        expect(sql).toContain('WHERE job_pda = ?');
        expect(params[1]).toBe('job-x');
        expect(typeof params[0]).toBe('number');
        expect(params[0]).toBeGreaterThanOrEqual(before);
        expect(params[0]).toBeLessThanOrEqual(Date.now());
      });
    });

    describe('onExecutionComplete', () => {
      it('should persist success result to the DB', async () => {
        const result = {
          success: true,
          deliverableId: 'deliv-1',
          qualityScore: 0.92,
          error: undefined,
        };
        await executorConfig.onExecutionComplete('agent-1', 'job-x', result);

        expect(db.run).toHaveBeenCalledTimes(1);
        const [sql, params] = db.run.mock.calls[0];
        expect(sql).toContain('execution_completed_at');
        expect(sql).toContain('execution_error');
        expect(sql).toContain('execution_quality_score');
        expect(sql).toContain('execution_deliverable_id');
        // params order: [timestamp, error, qualityScore, deliverableId, jobId]
        expect(params[1]).toBeNull();        // error ?? null
        expect(params[2]).toBe(0.92);        // qualityScore
        expect(params[3]).toBe('deliv-1');   // deliverableId
        expect(params[4]).toBe('job-x');     // jobId in WHERE
      });

      it('should persist failure result with error message to the DB', async () => {
        const result = {
          success: false,
          error: 'LLM timeout',
        };
        await executorConfig.onExecutionComplete('agent-1', 'job-x', result);

        const params = db.run.mock.calls[0]?.[1];
        expect(params[1]).toBe('LLM timeout');  // error
        expect(params[2]).toBeNull();            // qualityScore ?? null
        expect(params[3]).toBeNull();            // deliverableId ?? null
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DeliverableManager callbacks (persistDeliverable, submitJobOnChain)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DeliverableManager callbacks', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let executorConfig: any;

    beforeEach(async () => {
      process.env.ENABLE_JOB_EXECUTION = 'true';
      process.env.JOB_EXECUTION_AGENT_ID = 'agent-1';
      const svc = await createServiceInstance(db, sol);
      svc.onModuleInit();

      executorConfig = MockJobExecutorCtor.mock.calls[0]?.[0];
    });

    describe('persistDeliverable (via deliverableManagerConfig.onPersist)', () => {
      it('should insert the deliverable into the DB', async () => {
        const stored = {
          deliverableId: 'deliv-1',
          jobId: 'job-1',
          agentId: 'agent-1',
          deliverable: {
            type: 'text',
            content: 'Here is the report.',
            mimeType: 'text/plain',
          },
          submissionHash: 'abc123',
          contentHash: 'def456',
          fileSize: 42,
          status: 'pending' as const,
          createdAt: 1700000000000,
        };

        await executorConfig.deliverableManagerConfig.onPersist(stored);

        expect(db.run).toHaveBeenCalledTimes(1);
        const [sql, params] = db.run.mock.calls[0];
        expect(sql).toContain('wunderland_job_deliverables');
        expect(sql).toContain('ON CONFLICT(deliverable_id)');
        expect(params[0]).toBe('deliv-1');       // deliverable_id
        expect(params[1]).toBe('job-1');          // job_pda
        expect(params[2]).toBe('agent-1');        // agent_pda
        expect(params[3]).toBe('text');           // deliverable_type
        expect(params[4]).toBe('Here is the report.'); // content
        expect(params[5]).toBe('text/plain');     // mime_type
        expect(params[6]).toBe('def456');         // content_hash
        expect(params[7]).toBe('abc123');         // submission_hash
        expect(params[8]).toBe(42);               // file_size
        expect(params[9]).toBe('pending');        // status
        expect(params[10]).toBe(1700000000000);   // created_at
      });

      it('should use null for mimeType when undefined', async () => {
        const stored = {
          deliverableId: 'd-2',
          jobId: 'job-2',
          agentId: 'agent-1',
          deliverable: { type: 'code', content: 'console.log("hi")' },
          submissionHash: 'hash-1',
          contentHash: 'hash-2',
          fileSize: 18,
          status: 'submitted' as const,
          createdAt: Date.now(),
        };

        await executorConfig.deliverableManagerConfig.onPersist(stored);
        const params = db.run.mock.calls[0]?.[1];
        expect(params[5]).toBeNull(); // mimeType ?? null
      });
    });

    describe('submitJobOnChain (via deliverableManagerConfig.onSubmit)', () => {
      it('should return offline signature when Solana is disabled', async () => {
        sol.getStatus.mockReturnValue({ enabled: false });

        const result = await executorConfig.deliverableManagerConfig.onSubmit({
          agentId: 'agent-1',
          jobId: 'job-1',
          submissionHash: 'aabbccdd',
        });

        expect(result.success).toBe(true);
        expect(result.signature).toMatch(/^offline-submit-job-1-/);
        expect(sol.submitJob).not.toHaveBeenCalled();
      });

      it('should call solService.submitJob when Solana is enabled', async () => {
        sol.getStatus.mockReturnValue({ enabled: true });
        sol.submitJob.mockResolvedValueOnce({
          success: true,
          signature: 'solana-tx-sig',
        });

        const hexHash = 'a'.repeat(64);
        const result = await executorConfig.deliverableManagerConfig.onSubmit({
          agentId: 'agent-1',
          jobId: 'job-1',
          submissionHash: hexHash,
        });

        expect(result.success).toBe(true);
        expect(sol.submitJob).toHaveBeenCalledWith({
          seedId: 'agent-1',
          jobPdaAddress: 'job-1',
          submissionHash: Buffer.from(hexHash, 'hex'),
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BidLifecycleManager callbacks
  // ═══════════════════════════════════════════════════════════════════════════

  describe('BidLifecycleManager callbacks', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let bidConfig: any;

    beforeEach(async () => {
      process.env.ENABLE_JOB_EXECUTION = 'true';
      process.env.JOB_EXECUTION_AGENT_ID = 'agent-1';
      const svc = await createServiceInstance(db, sol);
      svc.onModuleInit();

      bidConfig = MockBidLifecycleManagerCtor.mock.calls[0]?.[0];
    });

    describe('fetchActiveBids', () => {
      it('should query active bids and return mapped ActiveBid[]', async () => {
        db.all.mockResolvedValueOnce([
          {
            bid_pda: 'bid-1',
            job_pda: 'job-1',
            bidder_agent_pda: 'agent-1',
            bid_lamports: '75000',
            created_at: 1700000000,
          },
        ]);

        const result = await bidConfig.fetchActiveBids('agent-1');

        expect(db.all).toHaveBeenCalledTimes(1);
        const [sql, params] = db.all.mock.calls[0];
        expect(sql).toContain("status = 'active'");
        expect(sql).toContain('bidder_agent_pda = ?');
        expect(params).toEqual(['agent-1']);

        expect(result).toEqual([
          {
            bidId: 'bid-1',
            jobId: 'job-1',
            agentId: 'agent-1',
            amountLamports: 75000,
            createdAt: 1700000000,
          },
        ]);
      });

      it('should return empty array when no active bids', async () => {
        db.all.mockResolvedValueOnce([]);
        const result = await bidConfig.fetchActiveBids('agent-1');
        expect(result).toEqual([]);
      });
    });

    describe('getJobStatus', () => {
      it('should return mapped JobStatus when job exists', async () => {
        db.get.mockResolvedValueOnce({
          status: 'assigned',
          assigned_agent_pda: 'agent-1',
        });

        const result = await bidConfig.getJobStatus('job-1');
        expect(result).toEqual({
          status: 'assigned',
          assignedAgent: 'agent-1',
        });
      });

      it('should return null when job does not exist', async () => {
        db.get.mockResolvedValueOnce(undefined);
        const result = await bidConfig.getJobStatus('nonexistent');
        expect(result).toBeNull();
      });

      it('should handle job with null assigned_agent_pda', async () => {
        db.get.mockResolvedValueOnce({
          status: 'open',
          assigned_agent_pda: null,
        });

        const result = await bidConfig.getJobStatus('job-open');
        expect(result).toEqual({
          status: 'open',
          assignedAgent: null,
        });
      });
    });

    describe('withdrawBid', () => {
      it('should return offline signature and update DB when Solana disabled', async () => {
        sol.getStatus.mockReturnValue({ enabled: false });

        const result = await bidConfig.withdrawBid({
          agentId: 'agent-1',
          bidId: 'bid-1',
          jobId: 'job-1',
        });

        expect(result.success).toBe(true);
        expect(result.signature).toMatch(/^offline-withdraw-bid-1-/);
        expect(sol.withdrawJobBid).not.toHaveBeenCalled();
        expect(db.run).toHaveBeenCalledTimes(1);
        const [sql, params] = db.run.mock.calls[0];
        expect(sql).toContain("status = 'withdrawn'");
        expect(params[0]).toBe('bid-1');
      });

      it('should call solService.withdrawJobBid and update DB when Solana enabled', async () => {
        sol.getStatus.mockReturnValue({ enabled: true });
        sol.withdrawJobBid.mockResolvedValueOnce({
          success: true,
          signature: 'sol-withdraw-sig',
        });

        const result = await bidConfig.withdrawBid({
          agentId: 'agent-1',
          bidId: 'bid-2',
          jobId: 'job-2',
        });

        expect(result.success).toBe(true);
        expect(result.signature).toBe('sol-withdraw-sig');
        expect(sol.withdrawJobBid).toHaveBeenCalledWith({
          seedId: 'agent-1',
          jobPdaAddress: 'job-2',
          bidPdaAddress: 'bid-2',
        });
        expect(db.run).toHaveBeenCalledTimes(1);
      });

      it('should return failure without DB update when Solana withdrawal fails', async () => {
        sol.getStatus.mockReturnValue({ enabled: true });
        sol.withdrawJobBid.mockResolvedValueOnce({
          success: false,
          error: 'Insufficient funds',
        });

        const result = await bidConfig.withdrawBid({
          agentId: 'agent-1',
          bidId: 'bid-3',
          jobId: 'job-3',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Insufficient funds');
        expect(db.run).not.toHaveBeenCalled();
      });

      it('should catch thrown Error instances and return failure', async () => {
        sol.getStatus.mockReturnValue({ enabled: true });
        sol.withdrawJobBid.mockRejectedValueOnce(new Error('Network timeout'));

        const result = await bidConfig.withdrawBid({
          agentId: 'agent-1',
          bidId: 'bid-4',
          jobId: 'job-4',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Network timeout');
      });

      it('should handle non-Error thrown values via String()', async () => {
        sol.getStatus.mockReturnValue({ enabled: true });
        sol.withdrawJobBid.mockRejectedValueOnce('string error');

        const result = await bidConfig.withdrawBid({
          agentId: 'agent-1',
          bidId: 'bid-5',
          jobId: 'job-5',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('string error');
      });

      it('should use fallback signature when Solana returns success without one', async () => {
        sol.getStatus.mockReturnValue({ enabled: true });
        sol.withdrawJobBid.mockResolvedValueOnce({
          success: true,
          signature: undefined,
        });

        const result = await bidConfig.withdrawBid({
          agentId: 'agent-1',
          bidId: 'bid-6',
          jobId: 'job-6',
        });

        expect(result.success).toBe(true);
        expect(result.signature).toMatch(/^withdraw-bid-6-/);
        // DB should still be updated on success
        expect(db.run).toHaveBeenCalledTimes(1);
      });
    });

    describe('onBidInactive', () => {
      it('should set bid status to "accepted" when reason is "completed"', async () => {
        await bidConfig.onBidInactive({
          agentId: 'agent-1',
          bidId: 'bid-1',
          jobId: 'job-1',
          reason: 'completed',
        });

        expect(db.run).toHaveBeenCalledTimes(1);
        const [sql, params] = db.run.mock.calls[0];
        expect(sql).toContain('UPDATE wunderland_job_bids SET status = ?');
        expect(params[0]).toBe('accepted');
        expect(params[1]).toBe('bid-1');
      });

      it('should set bid status to "withdrawn" when reason is "cancelled"', async () => {
        await bidConfig.onBidInactive({
          agentId: 'agent-1',
          bidId: 'bid-2',
          jobId: 'job-2',
          reason: 'cancelled',
        });

        const params = db.run.mock.calls[0]?.[1];
        expect(params[0]).toBe('withdrawn');
        expect(params[1]).toBe('bid-2');
      });
    });

    describe('onWorkloadDecrement', () => {
      it('should be a no-op that resolves without error', async () => {
        // The callback is wired as a no-op: (_agentId) => Promise.resolve()
        await expect(bidConfig.onWorkloadDecrement('agent-1')).resolves.toBeUndefined();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // extractCategory (tested indirectly via triggerExecution)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('extractCategory (indirect)', () => {
    beforeEach(() => {
      process.env.ENABLE_JOB_EXECUTION = 'true';
      process.env.JOB_EXECUTION_AGENT_ID = 'agent-1';
    });

    const triggerWithMetadata = async (
      db: ReturnType<typeof createMockDb>,
      sol: ReturnType<typeof createMockSolService>,
      metadataJson: string | null,
    ) => {
      const svc = await createServiceInstance(db, sol);
      svc.onModuleInit();

      db.get.mockResolvedValueOnce({
        job_pda: 'job-cat',
        title: 'T',
        description: 'D',
        status: 'assigned',
        budget_lamports: '100',
        assigned_agent_pda: 'agent-1',
        metadata_json: metadataJson,
      });
      mockJobExecutor.executeJob.mockResolvedValueOnce({ success: true });

      await svc.triggerExecution('job-cat');
      return mockJobExecutor.executeJob.mock.calls[0]?.[1]?.category;
    };

    it('should extract category from valid JSON metadata', async () => {
      const category = await triggerWithMetadata(
        db, sol, '{"category":"data-analysis","priority":"high"}',
      );
      expect(category).toBe('data-analysis');
    });

    it('should default to "general" for null metadata', async () => {
      const category = await triggerWithMetadata(db, sol, null);
      expect(category).toBe('general');
    });

    it('should default to "general" for malformed JSON', async () => {
      const category = await triggerWithMetadata(db, sol, '{not valid json');
      expect(category).toBe('general');
    });

    it('should default to "general" when metadata has no category field', async () => {
      const category = await triggerWithMetadata(db, sol, '{"priority":"high"}');
      expect(category).toBe('general');
    });

    it('should default to "general" when category is not a string', async () => {
      const category = await triggerWithMetadata(db, sol, '{"category":42}');
      expect(category).toBe('general');
    });

    it('should default to "general" when category is an empty object', async () => {
      const category = await triggerWithMetadata(db, sol, '{"category":{}}');
      expect(category).toBe('general');
    });
  });
});
