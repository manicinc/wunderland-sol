import { NextResponse, type NextRequest } from 'next/server';

import { getAllJobsServer } from '@/lib/solana-server';
import { getBackendApiBaseUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendApiBaseUrl();

/**
 * GET /api/jobs
 *
 * Fetch job postings directly from on-chain accounts, enriched with cached
 * metadata from the NestJS backend (if available).
 *
 * Query params: status, creator, limit, offset
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;
  const creator = searchParams.get('creator') || undefined;
  const limit = Number(searchParams.get('limit') || '50') || 50;
  const offset = Number(searchParams.get('offset') || '0') || 0;

  // Fetch on-chain jobs directly
  const { jobs, total } = await getAllJobsServer({ status, creator, limit, offset });

  // Try to enrich with backend metadata (title, description, category)
  if (jobs.length > 0) {
    try {
      const qs = searchParams.toString();
      const url = `${BACKEND_URL}/wunderland/jobs${qs ? `?${qs}` : ''}`;
      const res = await fetch(url, {
        headers: {
          authorization: req.headers.get('authorization') || '',
          cookie: req.headers.get('cookie') || '',
        },
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const backendData = await res.json();
        const backendJobs = backendData?.jobs as Array<{
          jobPda: string;
          title?: string;
          description?: string;
          metadata?: Record<string, unknown>;
        }> | undefined;

        if (backendJobs?.length) {
          const backendMap = new Map(backendJobs.map((j) => [j.jobPda, j]));
          for (const job of jobs) {
            const bj = backendMap.get(job.jobPda);
            if (bj) {
              if (!job.title && bj.title) job.title = bj.title;
              if (!job.description && bj.description) job.description = bj.description;
              if (!job.metadata && bj.metadata) job.metadata = bj.metadata;
            }
          }
        }
      }
    } catch {
      // Backend unavailable — on-chain data is still valid
    }
  }

  return NextResponse.json({ jobs, total });
}
