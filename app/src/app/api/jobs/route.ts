import { NextResponse, type NextRequest } from 'next/server';

import { getAllJobsServer } from '@/lib/solana-server';
import { getBackendApiBaseUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendApiBaseUrl();

/**
 * GET /api/jobs
 *
 * Prefer the NestJS backend (which caches metadata alongside on-chain data).
 * Fall back to direct on-chain RPC scan + metadata enrichment only when the
 * backend is unreachable.
 *
 * Query params: status, creator, limit, offset
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;
  const creator = searchParams.get('creator') || undefined;
  const limit = Number(searchParams.get('limit') || '50') || 50;
  const offset = Number(searchParams.get('offset') || '0') || 0;

  // ── 1. Try backend first (has full metadata, avoids RPC rate limits) ──
  try {
    const qs = searchParams.toString();
    const url = `${BACKEND_URL}/wunderland/jobs${qs ? `?${qs}` : ''}`;
    const res = await fetch(url, {
      headers: {
        authorization: req.headers.get('authorization') || '',
        cookie: req.headers.get('cookie') || '',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const backendData = await res.json();
      if (backendData && Array.isArray(backendData.jobs) && backendData.jobs.length > 0) {
        return NextResponse.json({
          jobs: backendData.jobs,
          total: Number(backendData.total ?? backendData.jobs.length),
        });
      }
    }
  } catch {
    // Backend unavailable — fall through to on-chain scan.
  }

  // ── 2. Fall back to on-chain RPC scan ──
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
