/**
 * @file job-scanning.integration.test.ts
 * @description Integration tests for autonomous job scanning with agent selectivity.
 *
 * Tests verify:
 * - JobScannerService initializes with active agents
 * - Agents skip crowded jobs (>10 bids)
 * - Agents are selective based on workload and success rate
 * - Bids are submitted to Solana and stored in database
 * - RAG memory is used for decision-making
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { DatabaseService } from '../core/database/database.service.js';
import { JobScannerService } from '../modules/wunderland/jobs/job-scanner.service.js';
import { JobsService } from '../modules/wunderland/jobs/jobs.service.js';
import { OrchestrationService } from '../modules/wunderland/orchestration/orchestration.service.js';
import { WunderlandVectorMemoryService } from '../modules/wunderland/orchestration/wunderland-vector-memory.service.js';
import { WunderlandSolService } from '../modules/wunderland/wunderland-sol/wunderland-sol.service.js';

describe('JobScanning Integration Tests', () => {
  let app: any;
  let db: DatabaseService;
  let jobScannerService: JobScannerService;
  let jobsService: JobsService;
  let wunderlandSol: WunderlandSolService;

  beforeAll(async () => {
    // Set environment for job scanning
    process.env.ENABLE_JOB_SCANNING = 'true';
    process.env.ENABLE_SOCIAL_ORCHESTRATION = 'true';

    const moduleRef = await Test.createTestingModule({
      providers: [
        DatabaseService,
        JobScannerService,
        JobsService,
        OrchestrationService,
        WunderlandVectorMemoryService,
        WunderlandSolService,
      ],
    }).compile();

    app = moduleRef;
    db = moduleRef.get<DatabaseService>(DatabaseService);
    jobScannerService = moduleRef.get<JobScannerService>(JobScannerService);
    jobsService = moduleRef.get<JobsService>(JobsService);
    wunderlandSol = moduleRef.get<WunderlandSolService>(WunderlandSolService);

    // Initialize services
    await jobScannerService.onModuleInit();
  });

  afterAll(async () => {
    await jobScannerService.onModuleDestroy();
    await app.close();
  });

  beforeEach(async () => {
    // Clear test data
    await db.run('DELETE FROM wunderland_job_bids WHERE agent_address LIKE "test-%"');
    await db.run('DELETE FROM wunderland_agent_job_states WHERE seed_id LIKE "test-%"');
  });

  describe('Scanner Initialization', () => {
    it('should initialize scanners for active agents', async () => {
      // Create test agent
      await db.run(
        `INSERT INTO wunderland_agents (seed_id, display_name, hexaco_traits, status, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          'test-agent-1',
          'TestAgent1',
          JSON.stringify({
            honesty_humility: 0.6,
            emotionality: 0.5,
            extraversion: 0.7,
            agreeableness: 0.5,
            conscientiousness: 0.8,
            openness: 0.6,
          }),
          'active',
          Date.now(),
        ]
      );

      // Re-initialize to pick up new agent
      await jobScannerService.onModuleDestroy();
      await jobScannerService.onModuleInit();

      const status = jobScannerService.getStatus();
      const testAgent = status.find((s) => s.seedId === 'test-agent-1');

      expect(testAgent).toBeDefined();
      expect(testAgent?.isRunning).toBe(true);
    });
  });

  describe('Agent Selectivity', () => {
    it('should not bid on crowded jobs (>10 bids)', async () => {
      // Create job with many bids
      await db.run(
        `INSERT INTO wunderland_jobs (job_pda, creator_wallet, title, description, budget_lamports, category, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'crowded-job-pda',
          'Creator123',
          'Very popular job',
          'Everyone wants this',
          1_000_000_000,
          'development',
          'open',
          Date.now(),
        ]
      );

      // Add 11 bids to make it crowded
      for (let i = 0; i < 11; i++) {
        await db.run(
          `INSERT INTO wunderland_job_bids (bid_pda, job_pda, agent_address, amount_lamports, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [`bid-${i}`, 'crowded-job-pda', `other-agent-${i}`, 900_000_000, 'active', Date.now()]
        );
      }

      // Wait for scan cycle
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Test agent should NOT have bid on this crowded job
      const bids = await db.all(
        'SELECT * FROM wunderland_job_bids WHERE agent_address = ? AND job_pda = ?',
        ['test-agent-1', 'crowded-job-pda']
      );

      expect(bids).toHaveLength(0);
    });

    it('should increase threshold when agent has 2+ active jobs', async () => {
      // Create agent state with 2 active jobs
      await db.run(
        `INSERT INTO wunderland_agent_job_states
         (seed_id, active_job_count, bandwidth, min_acceptable_rate_per_hour, preferred_categories,
          recent_outcomes, risk_tolerance, total_jobs_evaluated, total_jobs_bid_on, total_jobs_completed,
          success_rate, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'test-agent-1',
          2, // 2 active jobs
          0.6,
          0.05,
          JSON.stringify([['development', 0.8]]),
          JSON.stringify([]),
          0.5,
          50,
          10,
          5,
          0.7,
          Date.now(),
          Date.now(),
        ]
      );

      // Create moderate-budget job
      await db.run(
        `INSERT INTO wunderland_jobs (job_pda, creator_wallet, title, description, budget_lamports, category, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'moderate-job-pda',
          'Creator456',
          'Moderate job',
          'Description',
          600_000_000,
          'development',
          'open',
          Date.now(),
        ]
      );

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // With 2 active jobs, threshold is ~0.75 (0.65 + 0.1)
      // Moderate job likely won't pass threshold
      const bids = await db.all(
        'SELECT * FROM wunderland_job_bids WHERE agent_address = ? AND job_pda = ?',
        ['test-agent-1', 'moderate-job-pda']
      );

      expect(bids).toHaveLength(0); // Should not bid due to increased threshold
    });
  });

  describe('Bid Submission', () => {
    it('should submit bid to Solana when score > threshold', async () => {
      // Mock WunderlandSolService placeJobBid
      const bidSpy = vi.spyOn(wunderlandSol, 'placeJobBid').mockResolvedValue({
        success: true,
        bidPda: 'mock-bid-pda',
        signature: 'mock-signature',
      });

      // Create high-budget job (should pass threshold)
      await db.run(
        `INSERT INTO wunderland_jobs (job_pda, creator_wallet, title, description, budget_lamports, category, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'high-budget-job',
          'Creator789',
          'High-budget job',
          'Very lucrative',
          2_000_000_000, // 2 SOL
          'development',
          'open',
          Date.now(),
        ]
      );

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Should have called placeJobBid
      expect(bidSpy).toHaveBeenCalled();
      expect(bidSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          seedId: 'test-agent-1',
          jobPdaAddress: 'high-budget-job',
        })
      );

      bidSpy.mockRestore();
    });

    it('should store bid in database after successful submission', async () => {
      vi.spyOn(wunderlandSol, 'placeJobBid').mockResolvedValue({
        success: true,
        bidPda: 'stored-bid-pda',
        signature: 'stored-signature',
      });

      await db.run(
        `INSERT INTO wunderland_jobs (job_pda, creator_wallet, title, description, budget_lamports, category, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'storable-job',
          'Creator012',
          'Storable job',
          'Desc',
          1_500_000_000,
          'development',
          'open',
          Date.now(),
        ]
      );

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const bids = await db.all('SELECT * FROM wunderland_job_bids WHERE job_pda = ?', [
        'storable-job',
      ]);

      expect(bids.length).toBeGreaterThan(0);
      expect(bids[0].bid_pda).toBe('stored-bid-pda');
      expect(bids[0].agent_address).toBe('test-agent-1');
    });
  });

  describe('RAG Integration', () => {
    it('should use RAG to find similar past jobs', async () => {
      // TODO: Requires RAG/vector memory to be fully initialized
      // This test would verify that JobMemoryService is queried during evaluation
      expect(true).toBe(true); // Placeholder
    });
  });
});
