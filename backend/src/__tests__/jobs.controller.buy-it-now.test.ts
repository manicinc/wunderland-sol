import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock NestJS decorators/metadata to keep controller tests lightweight.
// ---------------------------------------------------------------------------

vi.mock('@nestjs/common', () => ({
  Controller: () => (target: unknown) => target,
  Get: () => () => {},
  Post: () => () => {},
  Patch: () => () => {},
  Param: () => () => {},
  Query: () => () => {},
  Body: () => () => {},
  HttpCode: () => () => {},
  SetMetadata: () => () => {},
  HttpStatus: { OK: 200 },
}));

describe('JobsController — buy-it-now field passthrough', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes buyItNowLamports in listJobs response', async () => {
    const { JobsController } = await import('../modules/wunderland/jobs/jobs.controller.js');

    const jobsService = {
      listJobs: vi.fn().mockResolvedValue({
        total: 1,
        jobs: [
          {
            job_pda: 'jobPda1',
            creator_wallet: 'creator1',
            job_nonce: '1',
            metadata_hash_hex: 'aa',
            budget_lamports: '1000',
            buy_it_now_lamports: '1250',
            status: 'open',
            assigned_agent_pda: null,
            accepted_bid_pda: null,
            created_at: 1,
            updated_at: 2,
            sol_cluster: 'devnet',
            metadata_json: null,
            title: 'Title',
            description: 'Desc',
            indexed_at: 3,
          },
        ],
      }),
      getJob: vi.fn(),
      getJobBids: vi.fn(),
      getJobSubmissions: vi.fn(),
    };

    const jobExecutionService = { getStatus: vi.fn() };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controller = new (JobsController as any)(jobsService, jobExecutionService);
    const result = await controller.listJobs();

    expect(result.total).toBe(1);
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]).toMatchObject({
      jobPda: 'jobPda1',
      budgetLamports: '1000',
      buyItNowLamports: '1250',
    });
  });

  it('includes buyItNowLamports in getJob response', async () => {
    const { JobsController } = await import('../modules/wunderland/jobs/jobs.controller.js');

    const jobsService = {
      listJobs: vi.fn(),
      getJob: vi.fn().mockResolvedValue({
        job_pda: 'jobPda2',
        creator_wallet: 'creator2',
        job_nonce: '2',
        metadata_hash_hex: 'bb',
        budget_lamports: '2000',
        buy_it_now_lamports: null,
        status: 'assigned',
        assigned_agent_pda: 'agentPda',
        accepted_bid_pda: 'bidPda',
        created_at: 10,
        updated_at: 20,
        sol_cluster: 'devnet',
        metadata_json: JSON.stringify({ title: 'T', description: 'D' }),
        title: 'T',
        description: 'D',
        indexed_at: 30,
      }),
      getJobBids: vi.fn().mockResolvedValue([]),
      getJobSubmissions: vi.fn().mockResolvedValue([]),
    };

    const jobExecutionService = { getStatus: vi.fn() };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controller = new (JobsController as any)(jobsService, jobExecutionService);
    const result = await controller.getJob('jobPda2');

    expect(result.job).toMatchObject({
      jobPda: 'jobPda2',
      budgetLamports: '2000',
      buyItNowLamports: null,
      status: 'assigned',
    });
  });
});

