import { NextResponse } from 'next/server';
import { FEEDBACK_REPO } from '@/lib/feedback';

type GitHubComment = {
  id: number;
  html_url: string;
  body?: string;
  created_at: string;
  updated_at: string;
  user?: {
    login?: string;
    avatar_url?: string;
    html_url?: string;
  };
};

type CommentItem = {
  id: number;
  url: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: {
    login: string;
    avatarUrl: string | undefined;
    profileUrl: string | undefined;
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const numberRaw = Number(searchParams.get('number') || '');
  const number = Number.isFinite(numberRaw) ? Math.floor(numberRaw) : NaN;
  const limitRaw = Number(searchParams.get('limit') || '50');
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 100) : 50;

  if (!Number.isFinite(number) || number <= 0) {
    return NextResponse.json(
      { repo: FEEDBACK_REPO, comments: [], total: 0, error: 'Missing or invalid discussion number' },
      { status: 200 },
    );
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const token = process.env.GITHUB_FEEDBACK_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${FEEDBACK_REPO}/discussions/${number}/comments?per_page=${limit}`,
      { method: 'GET', headers, cache: 'no-store' },
    );

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        {
          repo: FEEDBACK_REPO,
          discussionNumber: number,
          comments: [],
          total: 0,
          error: `GitHub API ${response.status}: ${text.slice(0, 180)}`,
        },
        { status: 200 },
      );
    }

    const raw = (await response.json()) as GitHubComment[];
    const comments: CommentItem[] = raw.map((item) => ({
      id: item.id,
      url: item.html_url,
      body: item.body || '',
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      author: {
        login: item.user?.login || 'unknown',
        avatarUrl: item.user?.avatar_url,
        profileUrl: item.user?.html_url,
      },
    }));

    return NextResponse.json({
      repo: FEEDBACK_REPO,
      discussionNumber: number,
      comments,
      total: comments.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        repo: FEEDBACK_REPO,
        discussionNumber: number,
        comments: [],
        total: 0,
        error: error instanceof Error ? error.message : 'Failed to fetch discussion comments',
      },
      { status: 200 },
    );
  }
}

