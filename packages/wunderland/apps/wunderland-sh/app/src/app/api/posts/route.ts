import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';

import { getBackendApiBaseUrl } from '@/lib/backend-url';
import { getEnclaveDirectoryMapServer } from '@/lib/enclave-directory-server';
import { getAllPostsServer } from '@/lib/solana-server';

// ── Main GET handler ───────────────────────────────────────────────────────

const BACKEND_URL = getBackendApiBaseUrl();
const PROGRAM_ID =
  process.env.WUNDERLAND_SOL_PROGRAM_ID ||
  process.env.PROGRAM_ID ||
  process.env.NEXT_PUBLIC_PROGRAM_ID ||
  '3Z4e2eQuUJKvoi3egBdwKYc2rdZm8XFw9UNDf99xpDJo';

function enrichEnclaves(posts: any[]): any[] {
  try {
    const programId = new PublicKey(PROGRAM_ID);
    const map = getEnclaveDirectoryMapServer(programId);
    for (const p of posts) {
      const enclavePda = typeof p?.enclavePda === 'string' ? p.enclavePda : '';
      if (!enclavePda) continue;
      const info = map.get(enclavePda);
      if (!info) continue;
      p.enclaveName = info.name;
      p.enclaveDisplayName = info.displayName;
    }
  } catch {
    // best-effort
  }
  return posts;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') || '20');
    const offset = Number(searchParams.get('offset') || '0');
    const agent = searchParams.get('agent') || undefined;
    const replyTo = searchParams.get('replyTo') || undefined;
    const kindParam = searchParams.get('kind');
    const kind = kindParam === 'comment' ? 'comment' : kindParam === 'post' ? 'post' : 'post';

    // New filter params
    const sort = searchParams.get('sort') || 'new';
    const enclave = searchParams.get('enclave') || undefined;
    const since = searchParams.get('since') || undefined;
    const q = searchParams.get('q') || undefined;
    const includePlaceholders =
      String(searchParams.get('includePlaceholders') ?? '').trim().toLowerCase() === '1' ||
      String(searchParams.get('includePlaceholders') ?? '').trim().toLowerCase() === 'true';

    const safeLimit = Math.min(Number.isFinite(limit) && limit > 0 ? limit : 20, 100);
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;

    // Prefer the backend Solana indexer (DB-backed) to avoid per-request RPC scans.
    try {
      const params = new URLSearchParams();
      params.set('limit', String(safeLimit));
      params.set('offset', String(safeOffset));
      params.set('kind', kind);
      params.set('sort', sort);
      if (agent) params.set('agent', agent);
      if (replyTo) params.set('replyTo', replyTo);
      if (enclave) params.set('enclave', enclave);
      if (since) params.set('since', since);
      if (q) params.set('q', q);
      params.set('includeIpfsContent', '1');
      if (!includePlaceholders) params.set('hidePlaceholders', '1');

      const res = await fetch(`${BACKEND_URL}/wunderland/sol/posts?${params.toString()}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.posts)) {
          // Safety-net: filter placeholder filler posts client-side as well.
          if (!includePlaceholders) {
            const beforeCount = data.posts.length;
            const filtered = data.posts.filter((p: any) => {
              const c = typeof p?.content === 'string' ? p.content.trim().toLowerCase() : '';
              if (!c) return true;
              if (c.startsWith('observation from ') && c.includes(': scheduled post')) return false;
              if (c.includes('] observation: scheduled post')) return false;
              return true;
            });
            data.posts = filtered;
            const removed = Math.max(0, beforeCount - filtered.length);
            if (typeof data.total === 'number') {
              data.total = Math.max(0, data.total - removed);
            }
          }
          data.posts = enrichEnclaves(data.posts);
          return NextResponse.json(data);
        }
      }
    } catch {
      // Fall back to RPC scanning below.
    }

    const result = await getAllPostsServer({
      limit: safeLimit,
      offset: safeOffset,
      agentAddress: agent,
      replyTo,
      kind,
      sort,
      enclave,
      since,
      q,
    });

    if (!includePlaceholders && Array.isArray((result as any)?.posts)) {
      const beforeCount = (result as any).posts.length;
      (result as any).posts = (result as any).posts.filter((p: any) => {
        const c = typeof p?.content === 'string' ? p.content.trim().toLowerCase() : '';
        if (!c) return true;
        if (c.startsWith('observation from ') && c.includes(': scheduled post')) return false;
        if (c.includes('] observation: scheduled post')) return false;
        return true;
      });
      const removed = Math.max(0, beforeCount - (result as any).posts.length);
      if (typeof (result as any).total === 'number') {
        (result as any).total = Math.max(0, (result as any).total - removed);
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/posts] Error:', err);
    return NextResponse.json({ posts: [], total: 0 }, { status: 200 });
  }
}
