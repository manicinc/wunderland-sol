/**
 * Integration tests for the emergent multi-agent agency system
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createAgencyExecution,
  updateAgencySeat,
  getAgencyExecution,
  listAgencySeats,
} from '../integrations/agentos/agencyPersistence.service.js';
import {
  initializeAppDatabase,
  closeAppDatabase,
  getAppDatabase,
  __setAppDatabaseAdapterResolverForTests,
} from '../core/database/appDatabase.js';
import type { AdapterKind } from '@framers/sql-storage-adapter';

/**
 * Initialize a test database for agency tests
 */
async function setupTestDatabase() {
  await closeAppDatabase();
  __setAppDatabaseAdapterResolverForTests(async (): Promise<any> => {
    const { resolveStorageAdapter } = await import('@framers/sql-storage-adapter');
    return await resolveStorageAdapter({
      priority: ['sqljs'],
      // Force in-memory sql.js mode (disable fs-backed persistence).
      openOptions: { filePath: '' },
    } as any);
  });
  await initializeAppDatabase();
  const db = getAppDatabase();

  // Create a test user to satisfy foreign key constraints
  await db.run(
    `INSERT OR IGNORE INTO app_users (id, email, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    ['test_user_123', 'test@example.com', 'test_hash', Date.now(), Date.now()]
  );
}

/**
 * Test suite for agency persistence and state management
 */
test('Agency persistence: create and retrieve execution', async () => {
  await setupTestDatabase();

  const agencyId = `test_agency_${Date.now()}`;
  const userId = 'test_user_123';
  const conversationId = 'test_conversation_456';
  const goal = 'Test agency goal';

  await createAgencyExecution({
    agencyId,
    userId,
    conversationId,
    goal,
    workflowDefinitionId: 'test-workflow',
  });

  const execution = await getAgencyExecution(agencyId);
  assert.ok(execution, 'Agency execution should be created');
  assert.equal(execution.agency_id, agencyId);
  assert.equal(execution.user_id, userId);
  assert.equal(execution.goal, goal);
  assert.equal(execution.status, 'running');
});

test('Agency persistence: track seat progress and retries', async () => {
  await setupTestDatabase();

  const agencyId = `test_agency_${Date.now()}`;
  const seatId = `seat_${agencyId}_researcher`;

  await createAgencyExecution({
    agencyId,
    userId: 'test_user_123', // Use the test user we created
    conversationId: 'test_conv',
    goal: 'Research and report',
  });

  // First create the seat using the service
  const { getAppDatabase } = await import('../core/database/appDatabase.js');
  const db = getAppDatabase();
  await db.run(
    `INSERT INTO agency_seats (id, agency_id, role_id, persona_id, status, retry_count)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [seatId, agencyId, 'researcher', 'research-specialist', 'pending', 0]
  );

  // Now update seat with retry
  await updateAgencySeat({
    seatId,
    status: 'running',
    startedAt: Date.now(),
    retryCount: 0,
  });

  // Simulate failure and retry
  await updateAgencySeat({
    seatId,
    status: 'failed',
    error: 'Network timeout',
    retryCount: 1,
  });

  // Simulate success on retry
  await updateAgencySeat({
    seatId,
    status: 'completed',
    completedAt: Date.now(),
    output: 'Research complete',
    usageTokens: 1500,
    usageCostUsd: 0.0045,
    retryCount: 1,
  });

  const seats = await listAgencySeats(agencyId);
  assert.ok(seats.length > 0, 'Should have at least one seat');

  const seat = seats.find((s) => s.id === seatId);
  assert.ok(seat, 'Seat should exist');
  assert.equal(seat.status, 'completed');
  assert.equal(seat.retry_count, 1);
  assert.ok(seat.output, 'Seat should have output');
});

test('Agency persistence: emergent metadata storage', async () => {
  await setupTestDatabase();

  const agencyId = `test_agency_${Date.now()}`;

  await createAgencyExecution({
    agencyId,
    userId: 'test_user_123', // Use the test user we created
    conversationId: 'test_conv',
    goal: 'Complex emergent task',
  });

  // This would normally be called by MultiGMIAgencyExecutor after completion
  // For now, we're just testing the persistence layer
  const execution = await getAgencyExecution(agencyId);
  assert.ok(execution);
  assert.equal(execution.status, 'running');
});
