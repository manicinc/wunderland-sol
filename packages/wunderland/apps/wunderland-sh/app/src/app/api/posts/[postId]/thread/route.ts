import { NextResponse, type NextRequest } from 'next/server';
import { PublicKey } from '@solana/web3.js';

import { getBackendApiBaseUrl } from '@/lib/backend-url';
import { getEnclaveDirectoryMapServer } from '@/lib/enclave-directory-server';
import { getPostThreadServer } from '@/lib/solana-server';

const BACKEND_URL = getBackendApiBaseUrl();
const PROGRAM_ID =
  process.env.WUNDERLAND_SOL_PROGRAM_ID ||
  process.env.PROGRAM_ID ||
  process.env.NEXT_PUBLIC_PROGRAM_ID ||
  '3Z4e2eQuUJKvoi3egBdwKYc2rdZm8XFw9UNDf99xpDJo';

function enrichThreadTree(tree: any[]): any[] {
  try {
    const programId = new PublicKey(PROGRAM_ID);
    const map = getEnclaveDirectoryMapServer(programId);

    const visit = (node: any) => {
      const post = node?.post;
      const enclavePda = typeof post?.enclavePda === 'string' ? post.enclavePda : '';
      if (enclavePda) {
        const info = map.get(enclavePda);
        if (info) {
          post.enclaveName = info.name;
          post.enclaveDisplayName = info.displayName;
        }
      }
      const children = Array.isArray(node?.children) ? node.children : [];
      for (const c of children) visit(c);
    };

    for (const n of tree) visit(n);
  } catch {
    // best-effort
  }
  return tree;
}

/**
 * GET /api/posts/:postId/thread
 *
 * Returns the on-chain (PostAnchor) comment tree for a root post PDA.
 * Query params:
 * - sort=best|new
 * - max=number (default 500, max 2000)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const { postId } = await params;
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get('sort') === 'new' ? 'new' : 'best';
    const maxComments = Number(searchParams.get('max') || '500');

    // Prefer backend Solana indexer.
    try {
      const qs = new URLSearchParams();
      qs.set('sort', sort);
      qs.set('max', String(maxComments));
      qs.set('includeIpfsContent', '1');

      const res = await fetch(
        `${BACKEND_URL}/wunderland/sol/posts/${encodeURIComponent(postId)}/thread?${qs.toString()}`,
        { cache: 'no-store' },
      );
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.tree)) {
          data.tree = enrichThreadTree(data.tree);
          return NextResponse.json(data, { status: 200 });
        }
      }
    } catch {
      // Fall back to RPC scan below.
    }

    const data = await getPostThreadServer({
      rootPostId: postId,
      maxComments,
      sort,
    });

    data.tree = enrichThreadTree(data.tree as any);
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error('[api/posts/:postId/thread] Error:', err);
    return NextResponse.json(
      { rootPostId: null, total: 0, truncated: false, tree: [] },
      { status: 200 },
    );
  }
}
