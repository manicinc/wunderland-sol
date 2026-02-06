import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { FEEDBACK_REPO } from '@/lib/feedback';
import { PROGRAM_ID as DEFAULT_PROGRAM_ID } from '@/lib/solana';
import { getEnclaveDirectoryMapServer } from '@/lib/enclave-directory-server';

type GitHubDiscussion = {
  id: number;
  number: number;
  title: string;
  html_url: string;
  body?: string;
  created_at: string;
  updated_at: string;
  comments?: number;
  user?: {
    login?: string;
    avatar_url?: string;
    html_url?: string;
  };
};

type DiscussionItem = {
  id: number;
  number: number;
  title: string;
  url: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  comments: number;
  entityType: string;
  entityId: string;
  enclaveId: string | undefined;
  enclaveName: string | undefined;
  enclaveDisplayName: string | undefined;
  author: {
    login: string;
    avatarUrl: string | undefined;
    profileUrl: string | undefined;
  };
};

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function parseEntityMarker(body: string): { type: string; id: string } | null {
  const match = body.match(/\[entity:([^:\]]+):([^\]]+)\]/i);
  if (!match) return null;
  return { type: normalize(match[1]), id: match[2].trim() };
}

function parseEnclaveMarker(body: string): string | undefined {
  const match = body.match(/\[enclave:([^\]]+)\]/i);
  return match?.[1]?.trim() || undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const entityType = 'post';
  const entityId = searchParams.get('entityId');
  const limitRaw = Number(searchParams.get('limit') || '25');
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 100) : 25;
  const programIdStr = process.env.PROGRAM_ID || process.env.NEXT_PUBLIC_PROGRAM_ID || DEFAULT_PROGRAM_ID;
  const enclaveDirectory = getEnclaveDirectoryMapServer(new PublicKey(programIdStr));

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const token = process.env.GITHUB_FEEDBACK_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${FEEDBACK_REPO}/discussions?per_page=${limit}`,
      {
        method: 'GET',
        headers,
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        {
          discussions: [],
          total: 0,
          repo: FEEDBACK_REPO,
          error: `GitHub API ${response.status}: ${text.slice(0, 180)}`,
        },
        { status: 200 },
      );
    }

    const raw = (await response.json()) as GitHubDiscussion[];
    const discussions = raw
      .map((item) => {
        const body = item.body || '';
        const entity = parseEntityMarker(body);
        if (!entity || entity.type !== 'post' || !entity.id) return null;

        const enclaveId = parseEnclaveMarker(body);
        const enclaveInfo = enclaveId ? enclaveDirectory.get(enclaveId) : undefined;

        return {
          id: item.id,
          number: item.number,
          title: item.title,
          url: item.html_url,
          body,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          comments: item.comments || 0,
          entityType: entity.type,
          entityId: entity.id,
          enclaveId,
          enclaveName: enclaveInfo?.name,
          enclaveDisplayName: enclaveInfo?.displayName,
          author: {
            login: item.user?.login || 'unknown',
            avatarUrl: item.user?.avatar_url,
            profileUrl: item.user?.html_url,
          },
        };
      })
      .filter((item): item is DiscussionItem => item !== null);

    const qNorm = q ? normalize(q) : '';
    const entityNorm = entityId ? normalize(entityId) : '';

    const filtered = discussions.filter((item) => {
      if (item.entityType !== entityType) return false;
      if (entityNorm && normalize(item.entityId) !== entityNorm) return false;
      if (!qNorm) return true;
      return (
        normalize(item.title).includes(qNorm) ||
        normalize(item.body).includes(qNorm) ||
        normalize(item.author.login).includes(qNorm) ||
        normalize(item.entityId).includes(qNorm) ||
        normalize(item.enclaveId || '').includes(qNorm) ||
        normalize(item.enclaveName || '').includes(qNorm)
      );
    });

    return NextResponse.json({
      repo: FEEDBACK_REPO,
      mode: 'post-linked-only',
      discussions: filtered,
      total: filtered.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        repo: FEEDBACK_REPO,
        discussions: [],
        total: 0,
        error: error instanceof Error ? error.message : 'Failed to fetch discussions',
      },
      { status: 200 },
    );
  }
}
