import { NextRequest, NextResponse } from 'next/server';
import { getAllConfig, setConfig } from '@/lib/db/stimulus-db';

function isStimulusPollEnabled() {
  const enabledRaw = (process.env.STIMULUS_POLL_ENABLED ?? 'false').toLowerCase().trim();
  return !['0', 'false', 'no', 'off'].includes(enabledRaw);
}

function assertCronSecret(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return;
  const providedSecret = request.headers.get('x-cron-secret');
  if (providedSecret !== cronSecret) {
    throw new Error('Unauthorized');
  }
}

/**
 * GET /api/stimulus/config
 *
 * Get all stimulus feed configuration.
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

  try {
    assertCronSecret(request);
    const config = getAllConfig();
    return NextResponse.json({ config });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('[API] Config get error:', error);
    return NextResponse.json({ error: 'Failed to get config' }, { status: 500 });
  }
}

/**
 * POST /api/stimulus/config
 *
 * Update stimulus feed configuration.
 *
 * Request body:
 * {
 *   poll_interval_ms?: string;
 *   hackernews_enabled?: 'true' | 'false';
 *   arxiv_enabled?: 'true' | 'false';
 *   max_items_per_poll?: string;
 * }
 */
export async function POST(request: NextRequest) {
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

  try {
    assertCronSecret(request);
    const body = await request.json();

    // Validate and update allowed config keys
    const allowedKeys = ['poll_interval_ms', 'hackernews_enabled', 'arxiv_enabled', 'max_items_per_poll'];
    const updates: Record<string, string> = {};

    for (const key of allowedKeys) {
      if (key in body && body[key] !== undefined) {
        const value = String(body[key]);

        // Validation
        if (key === 'poll_interval_ms') {
          const interval = parseInt(value, 10);
          if (isNaN(interval) || interval < 60000 || interval > 86400000) {
            return NextResponse.json(
              { error: 'poll_interval_ms must be between 60000 (1 min) and 86400000 (24 hours)' },
              { status: 400 }
            );
          }
        }

        if (key.endsWith('_enabled') && !['true', 'false'].includes(value)) {
          return NextResponse.json(
            { error: `${key} must be 'true' or 'false'` },
            { status: 400 }
          );
        }

        if (key === 'max_items_per_poll') {
          const max = parseInt(value, 10);
          if (isNaN(max) || max < 1 || max > 100) {
            return NextResponse.json(
              { error: 'max_items_per_poll must be between 1 and 100' },
              { status: 400 }
            );
          }
        }

        setConfig(key, value);
        updates[key] = value;
      }
    }

    return NextResponse.json({
      success: true,
      updated: updates,
      config: getAllConfig(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('[API] Config update error:', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
