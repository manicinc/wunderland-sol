import { NextResponse } from 'next/server';

const WUNDERLAND_APIS = (
  process.env.WUNDERLAND_API_URLS ||
  process.env.WUNDERLAND_API_URL ||
  'https://wunderland.sh'
)
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const BACKEND_API = (
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001/api'
).replace(/\/+$/, '');

const MERGE_MODE = process.env.WUNDERLAND_STATS_MERGE_MODE === 'max' ? 'max' : 'append';
const CACHE_TTL_MS = 45_000;
const REQUEST_TIMEOUT_MS = 15_000;

interface StatsLike {
  agents: number;
  posts: number;
  activeRuntimes: number;
  proposalsDecided: number;
}

interface StatsPayload extends StatsLike {
  sources: {
    mode: 'append' | 'max';
    backend: StatsLike | null;
    deployments: Array<{
      baseUrl: string;
      stats: StatsLike | null;
      programId?: string;
      cluster?: string;
    }>;
    programIds: string[];
  };
}

const FALLBACK: StatsPayload = {
  agents: 0,
  posts: 0,
  activeRuntimes: 0,
  proposalsDecided: 0,
  sources: {
    mode: MERGE_MODE,
    backend: null,
    deployments: [],
    programIds: [],
  },
};

let cached: { data: StatsPayload; ts: number } | null = null;

function toPositiveInt(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed));
  }
  return 0;
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }
  return undefined;
}

function normalizeStatsLike(data: unknown): StatsLike {
  const stats = (data ?? {}) as Record<string, unknown>;
  return {
    agents: toPositiveInt(stats.agents ?? stats.totalAgents),
    posts: toPositiveInt(stats.posts ?? stats.totalPosts),
    activeRuntimes: toPositiveInt(stats.activeRuntimes ?? stats.activeAgents),
    proposalsDecided: toPositiveInt(stats.proposalsDecided ?? stats.totalVotes ?? stats.votes),
  };
}

function mergeMetric(values: number[]): number {
  if (values.length === 0) return 0;
  if (MERGE_MODE === 'max') return Math.max(...values);
  return values.reduce((sum, value) => sum + value, 0);
}

async function fetchJsonWithTimeout(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data !== 'object') return null;
    return data as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function fetchStats(): Promise<StatsPayload> {
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  const [backendJson, deployments] = await Promise.all([
    fetchJsonWithTimeout(`${BACKEND_API}/wunderland/stats`),
    Promise.all(
      WUNDERLAND_APIS.map(async (baseUrl) => {
        const [statsJson, configJson] = await Promise.all([
          fetchJsonWithTimeout(`${baseUrl}/api/stats`),
          fetchJsonWithTimeout(`${baseUrl}/api/config`),
        ]);

        return {
          baseUrl,
          stats: statsJson ? normalizeStatsLike(statsJson) : null,
          programId: toOptionalString(configJson?.programId ?? configJson?.PROGRAM_ID),
          cluster: toOptionalString(configJson?.cluster ?? configJson?.CLUSTER),
        };
      })
    ),
  ]);

  const backendStats = backendJson ? normalizeStatsLike(backendJson) : null;
  const deploymentStats = deployments
    .map((deployment) => deployment.stats)
    .filter((stats): stats is StatsLike => Boolean(stats));

  const payload: StatsPayload = {
    agents: mergeMetric([backendStats?.agents ?? 0, ...deploymentStats.map((stats) => stats.agents)]),
    posts: mergeMetric([backendStats?.posts ?? 0, ...deploymentStats.map((stats) => stats.posts)]),
    activeRuntimes: mergeMetric([
      backendStats?.activeRuntimes ?? 0,
      ...deploymentStats.map((stats) => stats.activeRuntimes),
    ]),
    proposalsDecided: mergeMetric([
      backendStats?.proposalsDecided ?? 0,
      ...deploymentStats.map((stats) => stats.proposalsDecided),
    ]),
    sources: {
      mode: MERGE_MODE,
      backend: backendStats,
      deployments,
      programIds: Array.from(
        new Set(
          deployments
            .map((deployment) => deployment.programId)
            .filter((programId): programId is string => Boolean(programId))
        )
      ),
    },
  };

  const hasAnyLiveData =
    (backendStats?.agents ?? 0) > 0 ||
    (backendStats?.posts ?? 0) > 0 ||
    deploymentStats.some(
      (stats) =>
        stats.agents > 0 ||
        stats.posts > 0 ||
        stats.activeRuntimes > 0 ||
        stats.proposalsDecided > 0
    );

  if (hasAnyLiveData) {
    cached = { data: payload, ts: Date.now() };
  }

  return cached?.data ?? payload;
}

export async function GET() {
  const stats = await fetchStats();
  return NextResponse.json(stats, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
  });
}
