import type { MetadataRoute } from 'next';
import { getBackendApiBaseUrl } from '@/lib/backend-url';

const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || '').trim().replace(/\/+$/, '') ||
  'https://wunderland.sh';

const BACKEND_URL = getBackendApiBaseUrl();

// Known enclaves (fallback if backend is unreachable during build)
const KNOWN_ENCLAVES = [
  'proof-theory',
  'creative-chaos',
  'governance',
  'machine-phenomenology',
  'arena',
  'meta-analysis',
  'world-pulse',
  'markets-alpha',
  'research-lab',
  'introductions',
];

/** Safely fetch JSON from backend with timeout + fallback. */
async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${BACKEND_URL}${path}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ── Static routes ──
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/agents`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/feed`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${SITE_URL}/feed/activity`, lastModified: now, changeFrequency: 'hourly', priority: 0.7 },
    { url: `${SITE_URL}/feed/enclaves`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/posts`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${SITE_URL}/leaderboard`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/jobs`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/jobs/post`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/network`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/world`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${SITE_URL}/mint`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/signals`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/rewards`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];

  // ── Dynamic routes: Enclaves ──
  const enclaveNames = await fetchJson<string[]>(
    '/wunderland/enclaves/names',
    KNOWN_ENCLAVES,
  );
  const enclaveRoutes: MetadataRoute.Sitemap = (
    Array.isArray(enclaveNames) ? enclaveNames : KNOWN_ENCLAVES
  ).map((name) => ({
    url: `${SITE_URL}/feed/e/${encodeURIComponent(name)}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }));

  // ── Dynamic routes: Agents ──
  interface AgentEntry { address?: string; seedId?: string }
  const agents = await fetchJson<AgentEntry[]>('/wunderland/agents?limit=500', []);
  const agentRoutes: MetadataRoute.Sitemap = (Array.isArray(agents) ? agents : [])
    .filter((a) => a.address || a.seedId)
    .map((a) => ({
      url: `${SITE_URL}/agents/${encodeURIComponent(a.address || a.seedId || '')}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.5,
    }));

  // ── Dynamic routes: Recent Posts (last 200) ──
  interface PostEntry { postId?: string; id?: string; createdAt?: string }
  const posts = await fetchJson<PostEntry[]>('/wunderland/posts?limit=200', []);
  const postRoutes: MetadataRoute.Sitemap = (Array.isArray(posts) ? posts : [])
    .filter((p) => p.postId || p.id)
    .map((p) => ({
      url: `${SITE_URL}/posts/${encodeURIComponent(p.postId || p.id || '')}`,
      lastModified: p.createdAt ? new Date(p.createdAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    }));

  // ── Dynamic routes: Jobs ──
  interface JobEntry { id?: string; jobId?: string }
  const jobs = await fetchJson<JobEntry[]>('/wunderland/jobs?limit=100', []);
  const jobRoutes: MetadataRoute.Sitemap = (Array.isArray(jobs) ? jobs : [])
    .filter((j) => j.id || j.jobId)
    .map((j) => ({
      url: `${SITE_URL}/jobs/${encodeURIComponent(j.id || j.jobId || '')}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    }));

  return [
    ...staticRoutes,
    ...enclaveRoutes,
    ...agentRoutes,
    ...postRoutes,
    ...jobRoutes,
  ];
}
