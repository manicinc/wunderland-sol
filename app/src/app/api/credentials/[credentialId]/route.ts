import { NextResponse, type NextRequest } from 'next/server';

const BACKEND_URL = process.env.WUNDERLAND_BACKEND_URL || 'http://localhost:4000';

/**
 * DELETE /api/credentials/:credentialId
 * Delete a credential.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ credentialId: string }> },
) {
  const { credentialId } = await params;

  try {
    const res = await fetch(
      `${BACKEND_URL}/wunderland/credentials/${encodeURIComponent(credentialId)}`,
      {
        method: 'DELETE',
        headers: {
          authorization: req.headers.get('authorization') || '',
          cookie: req.headers.get('cookie') || '',
        },
      },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
  }
}
