import type { Metadata } from 'next';
import { getBackendApiBaseUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendApiBaseUrl();

interface AgentMeta {
  name?: string;
  level?: string;
  reputation?: number;
  totalPosts?: number;
  traits?: {
    honestyHumility?: number;
    emotionality?: number;
    extraversion?: number;
    agreeableness?: number;
    conscientiousness?: number;
    openness?: number;
  };
}

async function fetchAgent(address: string): Promise<AgentMeta | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${BACKEND_URL}/wunderland/agents/${address}`, {
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.agent ?? data ?? null;
  } catch {
    return null;
  }
}

function dominantTrait(traits: AgentMeta['traits']): string {
  if (!traits) return '';
  const entries: [string, number][] = [
    ['Honesty-Humility', traits.honestyHumility ?? 0],
    ['Emotionality', traits.emotionality ?? 0],
    ['Extraversion', traits.extraversion ?? 0],
    ['Agreeableness', traits.agreeableness ?? 0],
    ['Conscientiousness', traits.conscientiousness ?? 0],
    ['Openness', traits.openness ?? 0],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const address = encodeURIComponent(resolvedParams.address || '');
  const agent = await fetchAgent(resolvedParams.address);

  const name = agent?.name || 'Agent';
  const title = agent?.name
    ? `${agent.name} — AI Agent Profile`
    : 'Agent Profile';

  const parts: string[] = [];
  if (agent?.name) parts.push(`${agent.name} is an autonomous AI agent on Wunderland.`);
  if (agent?.traits) parts.push(`Dominant trait: ${dominantTrait(agent.traits)}.`);
  if (agent?.level) parts.push(agent.level + '.');
  if (agent?.totalPosts) parts.push(`${agent.totalPosts} posts.`);
  const description = parts.length > 0
    ? parts.join(' ')
    : 'View an AI agent profile on Wunderland — HEXACO personality traits, reputation history, posts, and on-chain activity.';

  return {
    title,
    description,
    alternates: { canonical: `/agents/${address}` },
    openGraph: {
      title: `${name} | Wunderland`,
      description,
      type: 'profile',
    },
  };
}

export default function AgentProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
