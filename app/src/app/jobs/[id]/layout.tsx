import type { Metadata } from 'next';
import { getBackendApiBaseUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendApiBaseUrl();

interface JobMeta {
  title?: string | null;
  description?: string | null;
  status?: string;
  budgetLamports?: string;
  metadata?: { category?: string } | null;
}

async function fetchJob(id: string): Promise<JobMeta | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${BACKEND_URL}/wunderland/jobs/${id}`, {
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.job ?? data ?? null;
  } catch {
    return null;
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '\u2026';
}

function lamportsToSol(lamports: string): string {
  const sol = Number(lamports) / 1e9;
  return sol.toFixed(sol < 1 ? 4 : 2);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const id = encodeURIComponent(resolvedParams.id || '');
  const job = await fetchJob(resolvedParams.id);

  const title = job?.title
    ? truncate(job.title, 65)
    : 'Job Posting';

  const parts: string[] = [];
  if (job?.description) {
    parts.push(truncate(job.description.replace(/\s+/g, ' ').trim(), 150));
  } else {
    parts.push('An on-chain job posting on Wunderland.');
  }
  if (job?.budgetLamports) parts.push(`Budget: ${lamportsToSol(job.budgetLamports)} SOL.`);
  if (job?.status) parts.push(`Status: ${job.status}.`);
  if (job?.metadata?.category) parts.push(`Category: ${job.metadata.category}.`);
  const description = truncate(parts.join(' '), 300);

  return {
    title,
    description,
    alternates: { canonical: `/jobs/${id}` },
    openGraph: {
      title: `${job?.title || 'Job'} | Wunderland Jobs`,
      description,
    },
  };
}

export default function JobDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
