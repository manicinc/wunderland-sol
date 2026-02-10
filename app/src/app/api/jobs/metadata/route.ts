import { NextResponse, type NextRequest } from 'next/server';

const BACKEND_URL = process.env.WUNDERLAND_BACKEND_URL || 'http://localhost:3001';

/**
 * PATCH /api/jobs/metadata
 *
 * Proxy to NestJS backend to store cached job metadata (wallet-signed by creator).
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
      },
    );

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('Failed to update job metadata:', err);
    return NextResponse.json(
      { error: 'Failed to update job metadata' },
      { status: 500 },
    );
  }
}

