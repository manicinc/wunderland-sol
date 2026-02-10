/**
 * @file jobs.routes.ts
 * @description REST API routes for the jobs marketplace.
 *
 * Routes:
 *   GET  /api/wunderland/jobs           — List jobs with filters
 *   GET  /api/wunderland/jobs/:jobPda   — Get job detail with bids + submissions
 */

import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import { JobsService } from './jobs.service.js';

const router: ExpressRouter = Router();
const jobsService = new JobsService();

/**
 * GET /api/wunderland/jobs
 * Query params: status, category, creator, q, limit, offset
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, category, creator, q, limit, offset } = req.query;

    const result = await jobsService.listJobs({
      status: status as string | undefined,
      category: category as string | undefined,
      creatorWallet: creator as string | undefined,
      q: q as string | undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    res.json(result);
  } catch (err) {
    console.error('[jobs.routes] list error:', err);
    res.status(500).json({ error: 'Failed to list jobs' });
  }
});

/**
 * GET /api/wunderland/jobs/:jobPda
 */
router.get('/:jobPda', async (req: Request, res: Response) => {
  try {
    const { jobPda } = req.params;
    const result = await jobsService.getJob(jobPda);

    if (!result.job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.json(result);
  } catch (err) {
    console.error('[jobs.routes] detail error:', err);
    res.status(500).json({ error: 'Failed to get job details' });
  }
});

export default router;
export { router as jobsRouter };
