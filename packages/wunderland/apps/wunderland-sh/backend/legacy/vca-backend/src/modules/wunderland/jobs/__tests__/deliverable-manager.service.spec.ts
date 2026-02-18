/**
 * @file deliverable-manager.service.spec.ts
 * @description Unit tests for DeliverableManagerService
 */

import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DeliverableManagerService } from '../deliverable-manager.service.js';
import type { DatabaseService } from '../../../../core/database/database.service.js';
import type { WunderlandSolService } from '../../wunderland-sol/wunderland-sol.service.js';

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
  (fn as any).mockReturnValue = (value: any) => {
    (fn as any)._mockReturnValue = value;
    return fn;
  };
  return fn;
};

test('DeliverableManagerService', async (t) => {
  let service: DeliverableManagerService;
  let mockDb: DatabaseService;
  let mockWunderlandSol: WunderlandSolService;

  t.beforeEach(() => {
    const runFn = createMockFn();
    runFn.mockResolvedValue(undefined);
    mockDb = {
      run: runFn,
      get: createMockFn(),
      all: createMockFn(),
    } as any;

    mockWunderlandSol = {
      submitJob: createMockFn(),
    } as any;

    process.env.JOB_DELIVERABLE_STORAGE = 'db';
    service = new DeliverableManagerService(mockDb, mockWunderlandSol);
  });

  await t.test('storeDeliverable - should store small deliverable in database only', async () => {
    const deliverable = {
      type: 'code' as const,
      content: 'console.log("test");',
      mimeType: 'text/javascript',
    };

    const deliverableId = await service.storeDeliverable('job-123', 'agent-456', deliverable);

    assert.ok(deliverableId);
    assert.ok((mockDb.run as any).calls.length > 0);
    const [query, params] = (mockDb.run as any).calls[0];
    assert.ok(query.includes('INSERT INTO wunderland_job_deliverables'));
    assert.strictEqual(params[0], deliverableId);
    assert.strictEqual(params[1], 'job-123');
    assert.strictEqual(params[2], 'agent-456');
    assert.strictEqual(params[3], 'code');
  });

  await t.test('storeDeliverable - should generate deterministic submission hash', async () => {
    const deliverable = {
      type: 'report' as const,
      content: 'Test report content',
    };

    const id1 = await service.storeDeliverable('job-123', 'agent-456', deliverable);
    const id2 = await service.storeDeliverable('job-123', 'agent-456', deliverable);

    assert.notStrictEqual(id1, id2);
    assert.strictEqual((mockDb.run as any).calls.length, 2);
  });

  await t.test('storeDeliverable - should handle different deliverable types', async () => {
    const types: Array<'code' | 'report' | 'data' | 'url' | 'ipfs'> = [
      'code',
      'report',
      'data',
      'url',
      'ipfs',
    ];

    for (const type of types) {
      const deliverable = { type, content: 'test content' };
      const id = await service.storeDeliverable('job-123', 'agent-456', deliverable);
      assert.ok(id);
    }

    assert.strictEqual((mockDb.run as any).calls.length, types.length);
  });

  await t.test('submitJob - should submit job with valid deliverable', async () => {
    const mockDeliverable = {
      submission_hash: 'abc123def456',
      agent_address: 'agent-789',
    };

    (mockDb.get as any).mockResolvedValue(mockDeliverable);
    (mockWunderlandSol.submitJob as any).mockResolvedValue({
      success: true,
      signature: 'sig-123',
    });

    const result = await service.submitJob('seed-123', 'job-456', 'deliverable-789');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.signature, 'sig-123');
    assert.ok((mockWunderlandSol.submitJob as any).calls.length > 0);
    assert.ok((mockDb.run as any).calls.length >= 2); // Update deliverable + job status
  });

  await t.test('submitJob - should handle missing deliverable', async () => {
    (mockDb.get as any).mockResolvedValue(null);

    const result = await service.submitJob('seed-123', 'job-456', 'missing-deliverable');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Deliverable not found');
    assert.strictEqual((mockWunderlandSol.submitJob as any).calls.length, 0);
  });

  await t.test('submitJob - should handle Solana submission failure', async () => {
    (mockDb.get as any).mockResolvedValue({
      submission_hash: 'abc123',
      agent_address: 'agent-789',
    });

    (mockWunderlandSol.submitJob as any).mockResolvedValue({
      success: false,
      error: 'Transaction failed',
    });

    const result = await service.submitJob('seed-123', 'job-456', 'deliverable-789');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Transaction failed');
  });

  await t.test('getDeliverable - should retrieve deliverable from database', async () => {
    const mockRow = {
      deliverable_type: 'code',
      content: 'console.log("test");',
      ipfs_cid: null,
      mime_type: 'text/javascript',
    };

    (mockDb.get as any).mockResolvedValue(mockRow);

    const result = await service.getDeliverable('deliverable-123');

    assert.ok(result);
    assert.strictEqual(result?.type, 'code');
    assert.strictEqual(result?.content, 'console.log("test");');
    assert.strictEqual(result?.mimeType, 'text/javascript');
  });

  await t.test('getDeliverable - should return null for missing deliverable', async () => {
    (mockDb.get as any).mockResolvedValue(null);

    const result = await service.getDeliverable('missing-deliverable');

    assert.strictEqual(result, null);
  });
});
