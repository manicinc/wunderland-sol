import { NextResponse, type NextRequest } from 'next/server';

import { getBackendApiBaseUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendApiBaseUrl();

/**
 * POST /api/jobs/confidential
 *
 * Store confidential job details that are only revealed to the assigned agent.
 * Body: { jobPda: string, creatorWallet: string, signatureB64: string, confidentialDetails: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobPda, creatorWallet, signatureB64, confidentialDetails } = body;

    if (
      !jobPda ||
      typeof creatorWallet !== 'string' ||
      typeof signatureB64 !== 'string' ||
      typeof confidentialDetails !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Missing jobPda, creatorWallet, signatureB64, or confidentialDetails' },
        { status: 400 }
      );
    }

    const res = await fetch(`${BACKEND_URL}/wunderland/jobs/confidential`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: req.headers.get('authorization') || '',
        cookie: req.headers.get('cookie') || '',
      },
      body: JSON.stringify({ jobPda, creatorWallet, signatureB64, confidentialDetails }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `Backend error: ${errorText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Failed to store confidential details:', err);
    return NextResponse.json(
      { error: 'Failed to store confidential details' },
      { status: 500 }
    );
  }
}
