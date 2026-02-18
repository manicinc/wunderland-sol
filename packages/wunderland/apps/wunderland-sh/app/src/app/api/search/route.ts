import { NextResponse, type NextRequest } from 'next/server';

import { getBackendApiBaseUrl } from '@/lib/backend-url';
import { type Agent, type Post } from '@/lib/solana';
import {
  getAllAgentsServer,
  getAllJobsServer,
  getAllPostsServer,
  getAllTipsServer,
  type OnChainJob,
  type Tip,
} from '@/lib/solana-server';

const BACKEND_URL = getBackendApiBaseUrl();

type SearchSection<T> = { items: T[]; total: number; limit: number };

type BackendSearchResponse = {
  query: string;
  agents: SearchSection<unknown>;
  posts: SearchSection<unknown>;
  comments: SearchSection<unknown>;
  jobs: SearchSection<unknown>;
  stimuli: SearchSection<unknown>;
};

type SearchResponse = {
  query: string;
  limit: number;
  backend: BackendSearchResponse;
  onChain: {
    agents: SearchSection<Agent>;
    posts: SearchSection<Post>;
    tips: SearchSection<Tip>;
    jobs: SearchSection<OnChainJob>;
  };
};

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function emptySection<T>(limit: number): SearchSection<T> {
  return { items: [], total: 0, limit };
}

function emptyBackend(query: string, limit: number): BackendSearchResponse {
  return {
    query,
    agents: emptySection(limit),
    posts: emptySection(limit),
    comments: emptySection(limit),
    jobs: emptySection(limit),
    stimuli: emptySection(limit),
  };
}

function emptyAll(query: string, limit: number): SearchResponse {
  return {
    query,
    limit,
    backend: emptyBackend(query, limit),
    onChain: {
      agents: emptySection(limit),
      posts: emptySection(limit),
      tips: emptySection(limit),
      jobs: emptySection(limit),
    },
  };
}

async function fetchBackendSearch(opts: {
  query: string;
  limit: number;
  headers: { authorization: string; cookie: string };
}): Promise<BackendSearchResponse> {
  const q = opts.query.trim();
  if (!q) return emptyBackend('', opts.limit);

  try {
    const url = `${BACKEND_URL}/wunderland/search?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(
      String(opts.limit),
    )}`;
    const res = await fetch(url, {
      headers: {
        authorization: opts.headers.authorization,
        cookie: opts.headers.cookie,
      },
      signal: AbortSignal.timeout(3500),
      cache: 'no-store',
    });

    if (!res.ok) {
      return emptyBackend(q, opts.limit);
    }

    const json = (await res.json()) as BackendSearchResponse;
    return json;
  } catch {
    return emptyBackend(q, opts.limit);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const query = (searchParams.get('q') ?? '').trim();
  const limit = clampInt(searchParams.get('limit'), 10, 1, 25);

  // UX: treat empty / too-short queries as empty sections (avoid 400 spam while typing).
  if (!query || query.length < 2) {
    return NextResponse.json(emptyAll(query, limit));
  }

  const q = query.toLowerCase();

  const auth = req.headers.get('authorization') || '';
  const cookie = req.headers.get('cookie') || '';

  const [backend, agentsAll, posts, tipsRes, jobsRes] = await Promise.all([
    fetchBackendSearch({ query, limit, headers: { authorization: auth, cookie } }),
    getAllAgentsServer(),
    getAllPostsServer({
      limit,
      offset: 0,
      kind: 'post',
      sort: 'new',
      q,
      includeIpfsContent: true,
      prefetchIpfsForSearch: false,
    }),
    getAllTipsServer({ limit, offset: 0, q }),
    getAllJobsServer({ limit, offset: 0, q }),
  ]);

  const agentMatches = agentsAll.filter((agent) => {
    return (
      agent.name.toLowerCase().includes(q) ||
      agent.address.toLowerCase().includes(q) ||
      agent.owner.toLowerCase().includes(q) ||
      agent.level.toLowerCase().includes(q)
    );
  });

  const response: SearchResponse = {
    query,
    limit,
    backend,
    onChain: {
      agents: { items: agentMatches.slice(0, limit), total: agentMatches.length, limit },
      posts: { items: posts.posts, total: posts.total, limit },
      tips: { items: tipsRes.tips, total: tipsRes.total, limit },
      jobs: { items: jobsRes.jobs, total: jobsRes.total, limit },
    },
  };

  return NextResponse.json(response);
}

