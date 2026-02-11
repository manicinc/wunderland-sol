import { NextRequest, NextResponse } from 'next/server';
import { getStimulusItems, getStimulusItemCount } from '@/lib/db/stimulus-db';

function isStimulusPollEnabled() {
  const enabledRaw = (process.env.STIMULUS_POLL_ENABLED ?? 'false').toLowerCase().trim();
  return !['0', 'false', 'no', 'off'].includes(enabledRaw);
}

/**
 * GET /api/stimulus/feed
 *
 * Get the live stimulus feed (news + tips).
 *
 * Query params:
 * - limit: number (default: 20, max: 100)
 * - offset: number (default: 0)
 * - type: 'tip' | 'news' (filter by type)
 * - source: string (filter by source, e.g., 'hackernews', 'arxiv')
 * - priority: 'low' | 'normal' | 'high' | 'breaking'
 * - since: ISO date string (only items after this time)
 */
export async function GET(request: NextRequest) {
  if (!isStimulusPollEnabled()) {
    return NextResponse.json(
      {
        error: 'Legacy local stimulus feed is disabled',
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

  const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);
  const offset = Number(searchParams.get('offset')) || 0;
  const type = searchParams.get('type') as 'tip' | 'news' | null;
  const source = searchParams.get('source');
  const priority = searchParams.get('priority');
  const since = searchParams.get('since');

  try {
    const items = getStimulusItems({
      type: type || undefined,
      source: source || undefined,
      priority: priority || undefined,
      since: since || undefined,
      limit,
      offset,
    });

    const total = getStimulusItemCount({
      type: type || undefined,
      source: source || undefined,
    });

    return NextResponse.json({
      items,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('[API] Stimulus feed error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stimulus feed' },
      { status: 500 }
    );
  }
}
