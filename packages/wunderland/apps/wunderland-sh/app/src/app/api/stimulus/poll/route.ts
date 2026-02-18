import { NextRequest, NextResponse } from 'next/server';
import { pollAllSources, pollHackerNews, pollArxiv, getPollIntervalMs } from '@/lib/db/stimulus-ingester';

function isStimulusPollEnabled() {
  const enabledRaw = (process.env.STIMULUS_POLL_ENABLED ?? 'false').toLowerCase().trim();
  return !['0', 'false', 'no', 'off'].includes(enabledRaw);
}

/**
 * POST /api/stimulus/poll
 *
 * Trigger a poll of all news sources.
 * This should be called by a cron job or background process.
 *
 * Query params:
 * - source: string (optional, poll only specific source: 'hackernews', 'arxiv', 'all')
 *
 * Headers:
 * - x-cron-secret: string (optional, for securing cron endpoint)
 */
export async function POST(request: NextRequest) {
  if (!isStimulusPollEnabled()) {
    return NextResponse.json(
      {
        error: 'Legacy local stimulus poller is disabled',
        legacy: true,
        deprecated: true,
      },
      {
        status: 410,
        headers: {
          'x-wunderland-legacy': 'stimulus-feed',
          'x-wunderland-deprecated': 'true',
        },
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source') || 'all';

  // Optional: verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const providedSecret = request.headers.get('x-cron-secret');
    if (providedSecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    let results: { source: string; count: number }[];

    if (source === 'hackernews') {
      const items = await pollHackerNews();
      results = [{ source: 'hackernews', count: items.length }];
    } else if (source === 'arxiv') {
      const items = await pollArxiv();
      results = [{ source: 'arxiv', count: items.length }];
    } else {
      results = await pollAllSources();
    }

    const totalIngested = results.reduce((sum, r) => sum + r.count, 0);

    return NextResponse.json({
      success: true,
      results,
      totalIngested,
      nextPollIn: getPollIntervalMs(),
    });
  } catch (error) {
    console.error('[API] Poll error:', error);
    return NextResponse.json(
      { error: 'Failed to poll sources', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stimulus/poll
 *
 * Get polling status and configuration.
 */
export async function GET() {
  if (!isStimulusPollEnabled()) {
    return NextResponse.json(
      {
        error: 'Legacy local stimulus poller is disabled',
        legacy: true,
        deprecated: true,
      },
      {
        status: 410,
        headers: {
          'x-wunderland-legacy': 'stimulus-feed',
          'x-wunderland-deprecated': 'true',
        },
      }
    );
  }

  try {
    return NextResponse.json({
      pollIntervalMs: getPollIntervalMs(),
      sources: ['hackernews', 'arxiv'],
      description: 'POST to this endpoint to trigger a poll. Use source query param to poll specific source.',
    });
  } catch (error) {
    console.error('[API] Poll status error:', error);
    return NextResponse.json(
      { error: 'Failed to get poll status' },
      { status: 500 }
    );
  }
}
