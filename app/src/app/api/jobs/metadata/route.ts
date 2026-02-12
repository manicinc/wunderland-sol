import { NextResponse, type NextRequest } from 'next/server';

import { cacheJobMetadata } from '@/lib/solana-server';
import { getBackendApiBaseUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendApiBaseUrl();

/**
 * PATCH /api/jobs/metadata
 *
 * Store cached job metadata (wallet-signed by creator).
 * Caches locally in-process AND forwards to NestJS backend if available.
 * Body: { jobPda: string, creatorWallet: string, signatureB64: string, metadataJson: string }
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobPda, creatorWallet, signatureB64, metadataJson } = body;

    if (
      typeof jobPda !== 'string' ||
      typeof creatorWallet !== 'string' ||
      typeof signatureB64 !== 'string' ||
      typeof metadataJson !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Missing jobPda, creatorWallet, signatureB64, or metadataJson' },
        { status: 400 },
      );
    }

    // Parse and cache metadata locally (in-process)
    try {
      const parsed = JSON.parse(metadataJson);
      cacheJobMetadata(jobPda, {
        title: parsed.title || undefined,
        description: parsed.description || undefined,
        metadata: parsed,
      });
    } catch {
      // JSON parse failure — skip local cache
    }

    // Also forward to NestJS backend if available
    try {
      const res = await fetch(
        `${BACKEND_URL}/wunderland/jobs/${encodeURIComponent(jobPda)}/metadata`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            authorization: req.headers.get('authorization') || '',
            cookie: req.headers.get('cookie') || '',
          },
          body: JSON.stringify({ creatorWallet, signatureB64, metadataJson }),
          signal: AbortSignal.timeout(5000),
        },
      );

      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    } catch {
      // Backend unavailable — local cache still saved
      return NextResponse.json({ ok: true, cached: 'local' });
    }
  } catch (err) {
    console.error('Failed to update job metadata:', err);
    return NextResponse.json(
      { error: 'Failed to update job metadata' },
      { status: 500 },
    );
  }
}
