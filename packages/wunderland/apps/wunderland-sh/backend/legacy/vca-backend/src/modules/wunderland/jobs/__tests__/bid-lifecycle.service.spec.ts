/**
 * @file bid-lifecycle.service.spec.ts
 * @description Unit tests for BidLifecycleService
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { BidLifecycleService } from '../bid-lifecycle.service.js';

const createMockFn = () => {
  const calls: any[] = [];
  const fn = (...args: any[]) => {
    calls.push(args);
    return (fn as any)._mockReturnValue;
  };
  (fn as any).calls = calls;
  (fn as any).mockResolvedValue = (value: any) => {
    (fn as any)._mockReturnValue = Promise.resolve(value);
    return fn;
  };
  return fn;
};

test('BidLifecycleService', async (t) => {
  await t.test(
    'withdrawLosingBids - should withdraw bid when job assigned to another agent',
    async () => {
      const mockDb = {
        all: createMockFn(),
        get: createMockFn(),
        run: createMockFn(),
      };

      const mockWunderlandSol = {
        withdrawJobBid: createMockFn(),
      };

      (mockDb.all as any).mockResolvedValue([{ bid_pda: 'bid-123', job_pda: 'job-456' }]);

      (mockDb.get as any).mockResolvedValue({
        status: 'assigned',
        assigned_agent: 'other-agent',
      });

      (mockDb.run as any).mockResolvedValue(undefined);

      (mockWunderlandSol.withdrawJobBid as any).mockResolvedValue({
        success: true,
        signature: 'sig-123',
      });

      process.env.JOB_EXECUTION_POLL_INTERVAL_MS = '1000';
      const service = new BidLifecycleService(mockDb as any, mockWunderlandSol as any);

      await service.withdrawLosingBids('our-agent');

      assert.ok((mockWunderlandSol.withdrawJobBid as any).calls.length > 0);
      const [withdrawCall] = (mockWunderlandSol.withdrawJobBid as any).calls[0];
      assert.strictEqual(withdrawCall.seedId, 'our-agent');
      assert.strictEqual(withdrawCall.jobPdaAddress, 'job-456');
      assert.strictEqual(withdrawCall.bidPdaAddress, 'bid-123');

      assert.ok((mockDb.run as any).calls.length > 0);
    }
  );

  await t.test(
    'withdrawLosingBids - should not withdraw bid if job assigned to our agent',
    async () => {
      const mockDb = {
        all: createMockFn(),
        get: createMockFn(),
        run: createMockFn(),
      };

      const mockWunderlandSol = {
        withdrawJobBid: createMockFn(),
      };

      (mockDb.all as any).mockResolvedValue([{ bid_pda: 'bid-123', job_pda: 'job-456' }]);

      (mockDb.get as any).mockResolvedValue({
        status: 'assigned',
        assigned_agent: 'our-agent', // Same agent
      });

      process.env.JOB_EXECUTION_POLL_INTERVAL_MS = '1000';
      const service = new BidLifecycleService(mockDb as any, mockWunderlandSol as any);

      await service.withdrawLosingBids('our-agent');

      assert.strictEqual((mockWunderlandSol.withdrawJobBid as any).calls.length, 0);
    }
  );

  await t.test('withdrawLosingBids - should handle job not found gracefully', async () => {
    const mockDb = {
      all: createMockFn(),
      get: createMockFn(),
      run: createMockFn(),
    };

    const mockWunderlandSol = {
      withdrawJobBid: createMockFn(),
    };

    (mockDb.all as any).mockResolvedValue([{ bid_pda: 'bid-123', job_pda: 'missing-job' }]);

    (mockDb.get as any).mockResolvedValue(null);

    process.env.JOB_EXECUTION_POLL_INTERVAL_MS = '1000';
    const service = new BidLifecycleService(mockDb as any, mockWunderlandSol as any);

    await service.withdrawLosingBids('our-agent');

    assert.strictEqual((mockWunderlandSol.withdrawJobBid as any).calls.length, 0);
  });

  await t.test('withdrawLosingBids - should mark bid inactive for cancelled jobs', async () => {
    const mockDb = {
      all: createMockFn(),
      get: createMockFn(),
      run: createMockFn(),
    };

    const mockWunderlandSol = {
      withdrawJobBid: createMockFn(),
    };

    (mockDb.all as any).mockResolvedValue([{ bid_pda: 'bid-123', job_pda: 'job-456' }]);

    (mockDb.get as any).mockResolvedValue({
      status: 'cancelled',
      assigned_agent: null,
    });

    (mockDb.run as any).mockResolvedValue(undefined);

    process.env.JOB_EXECUTION_POLL_INTERVAL_MS = '1000';
    const service = new BidLifecycleService(mockDb as any, mockWunderlandSol as any);

    await service.withdrawLosingBids('our-agent');

    assert.ok((mockDb.run as any).calls.length > 0);
    const [query] = (mockDb.run as any).calls[0];
    assert.ok(query.includes('inactive'));
  });

  await t.test('withdrawLosingBids - should handle withdrawal failure gracefully', async () => {
    const mockDb = {
      all: createMockFn(),
      get: createMockFn(),
      run: createMockFn(),
    };

    const mockWunderlandSol = {
      withdrawJobBid: createMockFn(),
    };

    (mockDb.all as any).mockResolvedValue([{ bid_pda: 'bid-123', job_pda: 'job-456' }]);

    (mockDb.get as any).mockResolvedValue({
      status: 'assigned',
      assigned_agent: 'other-agent',
    });

    (mockWunderlandSol.withdrawJobBid as any).mockResolvedValue({
      success: false,
      error: 'Transaction failed',
    });

    process.env.JOB_EXECUTION_POLL_INTERVAL_MS = '1000';
    const service = new BidLifecycleService(mockDb as any, mockWunderlandSol as any);

    await service.withdrawLosingBids('our-agent');

    // Should not update DB if withdrawal failed
    const updateWithdrawnCalls = (mockDb.run as any).calls.filter((call: any[]) =>
      call[0].includes("SET status = 'withdrawn'")
    );
    assert.strictEqual(updateWithdrawnCalls.length, 0);
  });

  await t.test('Polling - should start withdrawal loop', async () => {
    const mockDb = {
      all: createMockFn(),
      get: createMockFn(),
      run: createMockFn(),
    };

    const mockWunderlandSol = {
      withdrawJobBid: createMockFn(),
    };

    (mockDb.all as any).mockResolvedValue([]);

    process.env.JOB_EXECUTION_POLL_INTERVAL_MS = '1000';
    const service = new BidLifecycleService(mockDb as any, mockWunderlandSol as any);

    await service.startWithdrawalLoopForAgent('agent-123');

    assert.ok((service as any).pollingIntervals.has('agent-123'));

    service.stopWithdrawalLoopForAgent('agent-123');
  });

  await t.test('Polling - should not start duplicate loops for same agent', async () => {
    const mockDb = {
      all: createMockFn(),
      get: createMockFn(),
      run: createMockFn(),
    };

    const mockWunderlandSol = {
      withdrawJobBid: createMockFn(),
    };

    (mockDb.all as any).mockResolvedValue([]);

    process.env.JOB_EXECUTION_POLL_INTERVAL_MS = '1000';
    const service = new BidLifecycleService(mockDb as any, mockWunderlandSol as any);

    await service.startWithdrawalLoopForAgent('agent-123');
    await service.startWithdrawalLoopForAgent('agent-123');

    assert.strictEqual((service as any).pollingIntervals.size, 1);

    service.stopWithdrawalLoopForAgent('agent-123');
  });

  await t.test('Polling - should stop withdrawal loop', async () => {
    const mockDb = {
      all: createMockFn(),
      get: createMockFn(),
      run: createMockFn(),
    };

    const mockWunderlandSol = {
      withdrawJobBid: createMockFn(),
    };

    (mockDb.all as any).mockResolvedValue([]);

    process.env.JOB_EXECUTION_POLL_INTERVAL_MS = '1000';
    const service = new BidLifecycleService(mockDb as any, mockWunderlandSol as any);

    await service.startWithdrawalLoopForAgent('agent-123');
    service.stopWithdrawalLoopForAgent('agent-123');

    assert.ok(!(service as any).pollingIntervals.has('agent-123'));
  });
});
