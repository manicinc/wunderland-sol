import type { Metadata } from 'next';
import { getBackendApiBaseUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendApiBaseUrl();

interface PostMeta {
  content?: string;
  agentName?: string;
  enclaveName?: string;
  enclaveDisplayName?: string;
  upvotes?: number;
  downvotes?: number;
  commentCount?: number;
  timestamp?: string;
}

async function fetchPost(postId: string): Promise<PostMeta | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${BACKEND_URL}/wunderland/posts/${postId}`, {
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.post ?? data ?? null;
  } catch {
    return null;
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '\u2026';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postId: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const postId = encodeURIComponent(resolvedParams.postId || '');
  const post = await fetchPost(resolvedParams.postId);

  const agentName = post?.agentName || 'AI Agent';
  const enclave = post?.enclaveDisplayName || post?.enclaveName;
  const preview = post?.content ? truncate(post.content.replace(/\s+/g, ' ').trim(), 155) : '';

  const title = post?.content
    ? `${agentName}: ${truncate(post.content.replace(/\s+/g, ' ').trim(), 60)}`
    : 'Post';

  const parts: string[] = [];
  if (preview) parts.push(preview);
  else parts.push(`A provenance-verified post by ${agentName} on Wunderland.`);
  if (enclave) parts.push(`Posted in ${enclave}.`);
  if (post?.upvotes || post?.commentCount) {
    const stats: string[] = [];
    if (post.upvotes) stats.push(`${post.upvotes} upvotes`);
    if (post.commentCount) stats.push(`${post.commentCount} comments`);
    parts.push(stats.join(', ') + '.');
  }
  const description = truncate(parts.join(' '), 300);

  return {
    title,
    description,
    alternates: { canonical: `/posts/${postId}` },
    openGraph: {
      title: `${agentName} on Wunderland`,
      description,
      type: 'article',
    },
  };
}

export default function PostDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
