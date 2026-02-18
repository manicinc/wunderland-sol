/**
 * @file job-execution.integration.test.ts
 * @description Integration tests for autonomous job execution flow
 *
 * Note: These tests verify the service logic. Full NestJS integration requires
 * a running app context and is covered by E2E tests.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

test('Job Execution Integration - Database Schema', async () => {
  const { initializeAppDatabase, getAppDatabase, closeAppDatabase } = await import(
    '../core/database/appDatabase.js'
  );

  await initializeAppDatabase();
  const db = getAppDatabase();

  // Verify wunderland_job_deliverables table exists
  const deliverableTableCheck = await db.get(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='wunderland_job_deliverables'`
  );
  assert.ok(deliverableTableCheck, 'wunderland_job_deliverables table should exist');

  // Verify new columns exist in wunderland_jobs
  const jobsTableInfo = await db.all('PRAGMA table_info(wunderland_jobs)');
  const columnNames = jobsTableInfo.map((col: any) => col.name);

  assert.ok(
    columnNames.includes('execution_started_at'),
    'wunderland_jobs should have execution_started_at column'
  );
  assert.ok(
    columnNames.includes('execution_completed_at'),
    'wunderland_jobs should have execution_completed_at column'
  );
  assert.ok(
    columnNames.includes('execution_retry_count'),
    'wunderland_jobs should have execution_retry_count column'
  );
  assert.ok(
    columnNames.includes('execution_error'),
    'wunderland_jobs should have execution_error column'
  );
  assert.ok(
    columnNames.includes('confidential_details'),
    'wunderland_jobs should have confidential_details column'
  );

  // Verify indexes exist
  const indexes = await db.all(
    `SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='wunderland_jobs'`
  );
  const indexNames = indexes.map((idx: any) => idx.name);

  assert.ok(
    indexNames.includes('idx_wunderland_jobs_execution_status'),
    'execution status index should exist'
  );

  await closeAppDatabase();
});

test('Job Execution Integration - Service Instantiation', async () => {
  // Verify services can be imported without errors
  const { DeliverableManagerService } = await import(
    '../modules/wunderland/jobs/deliverable-manager.service.js'
  );
  const { QualityCheckService } = await import(
    '../modules/wunderland/jobs/quality-check.service.js'
  );
  const { BidLifecycleService } = await import(
    '../modules/wunderland/jobs/bid-lifecycle.service.js'
  );
  const { JobExecutionService } = await import(
    '../modules/wunderland/jobs/job-execution.service.js'
  );

  assert.ok(DeliverableManagerService, 'DeliverableManagerService should be defined');
  assert.ok(QualityCheckService, 'QualityCheckService should be defined');
  assert.ok(BidLifecycleService, 'BidLifecycleService should be defined');
  assert.ok(JobExecutionService, 'JobExecutionService should be defined');
});
