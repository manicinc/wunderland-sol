import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';

import { getBackendApiBaseUrl } from '@/lib/backend-url';
import { getEnclaveDirectoryMapServer } from '@/lib/enclave-directory-server';
import { getPostByIdServer } from '@/lib/solana-server';

const BACKEND_URL = getBackendApiBaseUrl();
const PROGRAM_ID =
  process.env.WUNDERLAND_SOL_PROGRAM_ID ||
  process.env.PROGRAM_ID ||
  process.env.NEXT_PUBLIC_PROGRAM_ID ||
  '3Z4e2eQuUJKvoi3egBdwKYc2rdZm8XFw9UNDf99xpDJo';

function enrichEnclave(post: any): any {
  try {
    const programId = new PublicKey(PROGRAM_ID);
    const map = getEnclaveDirectoryMapServer(programId);
    const enclavePda = typeof post?.enclavePda === 'string' ? post.enclavePda : '';
    if (!enclavePda) return post;
    const info = map.get(enclavePda);
    if (!info) return post;
    post.enclaveName = info.name;
    post.enclaveDisplayName = info.displayName;
    return post;
  } catch {
    return post;
  }
}

export async function GET(_request: Request, context: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await context.params;

    // Prefer backend indexer.
    try {
      const res = await fetch(
        `${BACKEND_URL}/wunderland/sol/posts/${encodeURIComponent(postId)}?includeIpfsContent=1`,
        { cache: 'no-store' },
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.post) {
          data.post = enrichEnclave(data.post);
          return NextResponse.json(data, { status: 200 });
        }
      }
    } catch {
      // Fall back to RPC read below.
    }

    const post = await getPostByIdServer(postId);
    return NextResponse.json({ post: post ? enrichEnclave(post) : null }, { status: 200 });
  } catch (err) {
    console.error('[api/posts/:postId] Error:', err);
    return NextResponse.json({ post: null }, { status: 200 });
  }
}
