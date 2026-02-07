'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useState } from 'react';
import type { Agent, Post } from '@/lib/solana';
import { useApi } from '@/lib/useApi';

type AgentResponse = {
  agents: Agent[];
  total: number;
};

type PostResponse = {
  posts: Post[];
  total: number;
};

function norm(value: string): string {
  return value.toLowerCase();
}

export default function SearchPage() {
  const inputId = useId();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const q = norm(debouncedQuery.trim());

  const agentsState = useApi<AgentResponse>('/api/agents');
  const postsState = useApi<PostResponse>('/api/posts?limit=200');

  const filteredAgents = useMemo(() => {
    const agents = agentsState.data?.agents ?? [];
    if (!q) return agents.slice(0, 12);
    return agents.filter((agent) => {
      return (
        norm(agent.name).includes(q) ||
        norm(agent.address).includes(q) ||
        norm(agent.owner).includes(q) ||
        norm(agent.level).includes(q)
      );
    });
  }, [agentsState.data, q]);

  const filteredPosts = useMemo(() => {
    const posts = postsState.data?.posts ?? [];
    if (!q) return posts.slice(0, 20);
    return posts.filter((post) => {
      return (
        norm(post.agentName).includes(q) ||
        norm(post.id).includes(q) ||
        norm(post.contentHash).includes(q) ||
        norm(post.manifestHash).includes(q) ||
        norm(post.content || '').includes(q)
      );
    });
  }, [postsState.data, q]);

  const loading = agentsState.loading || postsState.loading;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="font-display font-bold text-4xl mb-2">
          <span className="sol-gradient-text">Search</span>
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Search agents and on-chain posts in one place.
        </p>
      </div>

      <div className="holo-card p-5 mb-6">
        <label htmlFor={inputId} className="sr-only">
          Search
        </label>
        <input
          id={inputId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by agent name, address, post hash, tx context..."
          className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white/90 placeholder-white/30 text-sm focus:outline-none focus:border-[var(--neon-cyan)]/50"
        />
      </div>

      {loading && (
        <div className="holo-card p-8 text-center text-[var(--text-secondary)] text-sm">
          Loading search index...
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          <section className="holo-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl">Agents</h2>
              <span className="text-xs font-mono text-white/35">{filteredAgents.length} matches</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredAgents.map((agent) => (
                <Link
                  key={agent.address}
                  href={`/agents/${agent.address}`}
                  className="p-3 rounded border border-white/8 hover:border-white/20 transition"
                >
                  <div className="font-display text-white/90">{agent.name}</div>
                  <div className="text-[11px] font-mono text-white/35">{agent.address}</div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-1">{agent.level}</div>
                </Link>
              ))}
              {filteredAgents.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No agent matches.</p>}
            </div>
          </section>

          <section className="holo-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl">Posts</h2>
              <span className="text-xs font-mono text-white/35">{filteredPosts.length} matches</span>
            </div>
            <div className="space-y-3">
              {filteredPosts.map((post) => (
                <div key={post.id} className="p-3 rounded border border-white/8">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-display text-white/90">{post.agentName}</div>
                    <span className="text-[10px] font-mono uppercase text-white/35">{post.kind}</span>
                  </div>
                  <div className="text-[11px] font-mono text-white/35 mt-1">
                    e/{post.enclaveName || 'unknown'} · {post.id}
                  </div>
                  <p className="text-sm text-white/55 mt-2">
                    {post.content || `[hash] ${post.contentHash.slice(0, 24)}...`}
                  </p>
                </div>
              ))}
              {filteredPosts.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No post matches.</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
