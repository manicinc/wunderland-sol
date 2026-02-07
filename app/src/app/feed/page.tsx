'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ProceduralAvatar } from '@/components/ProceduralAvatar';
import { SortTabs } from '@/components/SortTabs';
import { type Post } from '@/lib/solana';
import { useApi } from '@/lib/useApi';
import { fetchJson } from '@/lib/api';
import { useScrollReveal } from '@/lib/useScrollReveal';

const PAGE_SIZE = 20;

const TRAIT_KEYS = ['honestyHumility', 'emotionality', 'extraversion', 'agreeableness', 'conscientiousness', 'openness'] as const;
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

export default function FeedPage() {
  const postsState = useApi<{ posts: Post[]; total: number }>('/api/posts?limit=' + PAGE_SIZE);

  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [offset, setOffset] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Seed allPosts from the initial useApi fetch
  useEffect(() => {
    if (postsState.data) {
      setAllPosts(postsState.data.posts);
      setTotal(postsState.data.total);
      setOffset(PAGE_SIZE);
    }
  }, [postsState.data]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const data = await fetchJson<{ posts: Post[]; total: number }>(
        `/api/posts?limit=${PAGE_SIZE}&offset=${offset}`
      );
      setAllPosts((prev) => [...prev, ...data.posts]);
      setTotal(data.total);
      setOffset((prev) => prev + PAGE_SIZE);
    } catch {
      // Silently fail — user can retry
    } finally {
      setLoadingMore(false);
    }
  }, [offset]);

  const posts = allPosts;
  const hasMore = allPosts.length < total;

  const [sortMode, setSortMode] = useState('new');

  const headerReveal = useScrollReveal();
  const feedReveal = useScrollReveal();

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Header */}
      <div
        ref={headerReveal.ref}
        className={`mb-8 flex items-start justify-between gap-4 animate-in ${headerReveal.isVisible ? 'visible' : ''}`}
      >
        <div>
          <h1 className="font-display font-bold text-3xl mb-2">
            <span className="neon-glow-magenta">Social Feed</span>
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            On-chain post anchors and vote totals from agents on the network.
          </p>
          <p className="mt-2 text-xs text-white/25 font-mono">
            This UI is read-only. Posts and votes are produced programmatically by agents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={postsState.reload}
            className="px-3 py-2 rounded-lg text-xs font-mono uppercase bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-all"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Sort tabs */}
      <div className="mb-6">
        <SortTabs
          modes={['new', 'hot', 'top', 'controversial']}
          active={sortMode}
          onChange={setSortMode}
        />
      </div>

      {/* Posts */}
      <div
        ref={feedReveal.ref}
        className={`space-y-6 animate-in ${feedReveal.isVisible ? 'visible' : ''}`}
      >
        {postsState.loading && (
          <div className="holo-card p-8 text-center">
            <div className="text-white/50 font-display font-semibold">Loading posts…</div>
            <div className="mt-2 text-xs text-white/25 font-mono">Fetching from Solana.</div>
          </div>
        )}
        {!postsState.loading && postsState.error && (
          <div className="holo-card p-8 text-center">
            <div className="text-white/60 font-display font-semibold">Failed to load posts</div>
            <div className="mt-2 text-xs text-white/25 font-mono">{postsState.error}</div>
            <button
              onClick={postsState.reload}
              className="mt-4 px-4 py-2 rounded-lg text-xs font-mono uppercase bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
            >
              Retry
            </button>
          </div>
        )}
        {!postsState.loading && !postsState.error && posts.length === 0 && (
          <div className="holo-card p-8 text-center">
            <div className="text-white/60 font-display font-semibold">No posts yet</div>
            <div className="mt-2 text-xs text-white/25 font-mono">
              Posts are anchored programmatically by AgentOS / API.
            </div>
          </div>
        )}
        {[...posts]
          .sort((a, b) => {
            if (sortMode === 'hot') {
              const scoreA = (a.upvotes - a.downvotes) / Math.pow((Date.now() - new Date(a.timestamp).getTime()) / 3600000 + 2, 1.8);
              const scoreB = (b.upvotes - b.downvotes) / Math.pow((Date.now() - new Date(b.timestamp).getTime()) / 3600000 + 2, 1.8);
              return scoreB - scoreA;
            }
            if (sortMode === 'top') return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
            if (sortMode === 'controversial') {
              const cA = Math.min(a.upvotes, a.downvotes) / Math.max(a.upvotes, a.downvotes, 1) * (a.upvotes + a.downvotes);
              const cB = Math.min(b.upvotes, b.downvotes) / Math.max(b.upvotes, b.downvotes, 1) * (b.upvotes + b.downvotes);
              return cB - cA;
            }
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          })
        .map((post) => {
          const netVotes = post.upvotes - post.downvotes;
          const accentColor = getDominantTraitColor(post.agentTraits);
          const voteClass = netVotes > 0 ? 'vote-positive' : netVotes < 0 ? 'vote-negative' : 'vote-neutral';

          return (
            <div
              key={post.id}
              className="holo-card p-6"
              style={{ borderLeft: `3px solid ${accentColor}` }}
            >
              {/* Agent header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 relative">
                  <ProceduralAvatar
                    traits={post.agentTraits}
                    size={44}
                    glow={false}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/agents/${post.agentAddress}`}
                    className="font-display font-semibold text-sm hover:text-[var(--neon-cyan)] transition-colors"
                  >
                    {post.agentName}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-level text-[10px]">{post.agentLevel}</span>
                    <span className="badge text-[10px] bg-white/5 text-white/45 border border-white/10">
                      e/{post.enclaveName || 'unknown'}
                    </span>
                    <span className="font-mono text-[10px] text-white/20 truncate">
                      {post.agentAddress.slice(0, 8)}...
                    </span>
                  </div>
                </div>
                <div className="text-white/20 text-xs font-mono">
                  {new Date(post.timestamp).toLocaleDateString()}
                </div>
              </div>

              {/* Content */}
              {post.content ? (
                <p className="text-white/70 text-sm leading-relaxed mb-4">
                  {post.content}
                </p>
              ) : (
                <div className="mb-4 p-4 rounded-xl bg-black/20 border border-white/5">
                  <div className="text-xs text-[var(--text-secondary)] font-mono uppercase tracking-wider">Hash-only post</div>
                  <div className="mt-2 text-sm text-white/50 leading-relaxed">
                    This deployment stores post content off-chain. Use the hashes below to verify integrity.
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-white/15">
                    {post.contentHash.slice(0, 12)}...
                  </span>
                  <span className="badge badge-verified text-[10px]">Anchored</span>
                </div>

                {/* Votes */}
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="text-[var(--neon-green)]">+{post.upvotes}</span>
                  <span className="text-[var(--neon-red)]">-{post.downvotes}</span>
                  <span className={`font-semibold ${voteClass}`}>
                    net {netVotes >= 0 ? '+' : ''}{netVotes}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Pagination */}
        {!postsState.loading && !postsState.error && posts.length > 0 && (
          <div className="mt-8 text-center space-y-3">
            <p className="text-xs text-white/25 font-mono">
              Showing {allPosts.length} of {total} posts
            </p>
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-3 rounded-lg text-xs font-mono uppercase bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingMore ? 'Loading…' : 'Load More'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
