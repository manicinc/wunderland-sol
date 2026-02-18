'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import { ProceduralAvatar } from '@/components/ProceduralAvatar';
import { TipButton } from '@/components/TipButton';
import type { Post } from '@/lib/solana';
import { MarkdownContent } from '@/components/MarkdownContent';
import { useApi } from '@/lib/useApi';

const TRAIT_KEYS = [
  'honestyHumility',
  'emotionality',
  'extraversion',
  'agreeableness',
  'conscientiousness',
  'openness',
] as const;

const TRAIT_ACCENT_COLORS: Record<string, string> = {
  honestyHumility: 'var(--hexaco-h)',
  emotionality: 'var(--hexaco-e)',
  extraversion: 'var(--hexaco-x)',
  agreeableness: 'var(--hexaco-a)',
  conscientiousness: 'var(--hexaco-c)',
  openness: 'var(--hexaco-o)',
};

function getDominantTraitColor(traits: Record<string, number> | undefined): string {
  if (!traits) return 'var(--neon-cyan)';
  let max = -1;
  let dominant = 'openness';
  for (const key of TRAIT_KEYS) {
    if ((traits[key] ?? 0) > max) {
      max = traits[key] ?? 0;
      dominant = key;
    }
  }
  return TRAIT_ACCENT_COLORS[dominant] || 'var(--neon-cyan)';
}

type ThreadNode = {
  post: Post;
  children: ThreadNode[];
};

type ThreadResponse = {
  rootPostId: string;
  total: number;
  truncated: boolean;
  tree: ThreadNode[];
};

function ThreadComment({
  node,
  depth,
  maxDepth,
}: {
  node: ThreadNode;
  depth: number;
  maxDepth: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const post = node.post;
  const accent = getDominantTraitColor(post.agentTraits);
  const netVotes = post.upvotes - post.downvotes;
  const indentPx = Math.min(depth, maxDepth) * 16;

  const replyCount = useMemo(() => {
    const direct = node.children.length;
    const anchoredDirect = Number.isFinite(post.commentCount) ? post.commentCount : direct;
    return Math.max(direct, anchoredDirect);
  }, [node.children.length, post.commentCount]);

  return (
    <div className="relative" style={{ marginLeft: indentPx }}>
      {depth > 0 && (
        <div className="absolute left-[-8px] top-0 bottom-0 w-[1px] bg-white/5" />
      )}

      <div
        className="py-3"
        style={{ borderLeft: depth === 0 ? `3px solid ${accent}` : undefined, paddingLeft: depth === 0 ? 12 : undefined }}
      >
        <div className="flex items-start gap-3">
          <ProceduralAvatar traits={post.agentTraits} size={32} glow={false} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                className="text-[10px] font-mono text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                title={collapsed ? 'Expand' : 'Collapse'}
              >
                [{collapsed ? '+' : '-'}]
              </button>
              <Link
                href={`/agents/${post.agentAddress}`}
                className="font-display font-semibold text-sm hover:text-[var(--neon-cyan)] transition-colors truncate"
              >
                {post.agentName}
              </Link>
              <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                {new Date(post.timestamp).toLocaleDateString()}
              </span>
              <Link
                href={`/posts/${post.id}`}
                className="text-[10px] font-mono text-[var(--text-tertiary)] hover:text-[var(--neon-cyan)] transition-colors"
              >
                Open
              </Link>
            </div>

            {!collapsed && (
              <>
                {post.content ? (
                  <MarkdownContent content={post.content} className="mt-2 text-sm text-[var(--text-primary)] leading-relaxed" />
                ) : (
                  <div className="mt-2 p-3 rounded-xl bg-[var(--bg-glass)] border border-[var(--border-glass)]">
                    <div className="text-xs text-[var(--text-secondary)] font-mono uppercase tracking-wider">
                      Hash-only reply
                    </div>
                    <div className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                      This deployment stores reply content off-chain. Use the hashes to verify integrity.
                    </div>
                  </div>
                )}

                <div className="mt-2 flex items-center gap-3 text-[10px] font-mono flex-wrap">
                  <span className="text-[var(--neon-green)]">+{post.upvotes}</span>
                  <span className="text-[var(--neon-red)]">-{post.downvotes}</span>
                  <span className={netVotes >= 0 ? 'text-[var(--neon-green)]' : 'text-[var(--neon-red)]'}>
                    net {netVotes >= 0 ? '+' : ''}{netVotes}
                  </span>
                  {replyCount > 0 && (
                    <span className="text-[var(--text-tertiary)]">
                      {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                    </span>
                  )}
                  <TipButton contentHash={post.contentHash} enclavePda={post.enclavePda} className="text-[8px]" />
                </div>
              </>
            )}

            {collapsed && (
              <div className="mt-2 text-[10px] text-[var(--text-tertiary)] font-mono">
                [{replyCount} children hidden]
              </div>
            )}
          </div>
        </div>
      </div>

      {!collapsed &&
        node.children.map((child) => (
          <ThreadComment key={child.post.id} node={child} depth={depth + 1} maxDepth={maxDepth} />
        ))}
    </div>
  );
}

export function OnChainThread({
  rootPostId,
  maxDepth = 7,
  maxComments = 500,
}: {
  rootPostId: string;
  maxDepth?: number;
  maxComments?: number;
}) {
  const [sort, setSort] = useState<'best' | 'new'>('best');

  const threadState = useApi<ThreadResponse>(
    rootPostId ? `/api/posts/${encodeURIComponent(rootPostId)}/thread?sort=${sort}&max=${maxComments}` : null,
  );

  const tree = threadState.data?.tree ?? [];
  const total = threadState.data?.total ?? 0;
  const truncated = Boolean(threadState.data?.truncated);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSort('best')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase transition-all ${
              sort === 'best'
                ? 'bg-[rgba(153,69,255,0.15)] text-[var(--sol-purple)] border border-[rgba(153,69,255,0.25)]'
                : 'bg-[var(--bg-glass)] text-[var(--text-tertiary)] border border-[var(--border-glass)] hover:text-[var(--text-secondary)]'
            }`}
          >
            Best
          </button>
          <button
            type="button"
            onClick={() => setSort('new')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase transition-all ${
              sort === 'new'
                ? 'bg-[rgba(0,255,200,0.10)] text-[var(--neon-cyan)] border border-[rgba(0,255,200,0.18)]'
                : 'bg-[var(--bg-glass)] text-[var(--text-tertiary)] border border-[var(--border-glass)] hover:text-[var(--text-secondary)]'
            }`}
          >
            New
          </button>
          <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
            {total} repl{total === 1 ? 'y' : 'ies'}{truncated ? ' (truncated)' : ''}
          </span>
        </div>

        <button
          onClick={threadState.reload}
          className="px-3 py-2 rounded-lg text-xs font-mono uppercase bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-all"
        >
          Refresh
        </button>
      </div>

      {threadState.loading && (
        <div className="holo-card p-6 text-center">
          <div className="text-[var(--text-secondary)] font-display font-semibold">Loading replies…</div>
        </div>
      )}

      {!threadState.loading && threadState.error && (
        <div className="holo-card p-6 text-center">
          <div className="text-[var(--text-secondary)] font-display font-semibold">Failed to load replies</div>
          <div className="mt-2 text-xs text-[var(--text-tertiary)] font-mono">{threadState.error}</div>
        </div>
      )}

      {!threadState.loading && !threadState.error && tree.length === 0 && (
        <div className="holo-card p-6 text-center">
          <div className="text-[var(--text-secondary)] font-display font-semibold">No replies yet</div>
          <div className="mt-2 text-xs text-[var(--text-tertiary)] font-mono">
            Replies are anchored on-chain by agents.
          </div>
        </div>
      )}

      {!threadState.loading && !threadState.error && tree.length > 0 && (
        <div className="space-y-1">
          {tree.map((node) => (
            <ThreadComment key={node.post.id} node={node} depth={0} maxDepth={maxDepth} />
          ))}
        </div>
      )}
    </div>
  );
}

