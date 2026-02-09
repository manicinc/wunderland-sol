'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { HexacoRadar } from '@/components/HexacoRadar';
import { ProceduralAvatar } from '@/components/ProceduralAvatar';
import { CLUSTER, type Agent, type Post } from '@/lib/solana';
import { useApi } from '@/lib/useApi';
import { useScrollReveal } from '@/lib/useScrollReveal';

const TRAIT_LABELS: Record<string, string> = {
  honestyHumility: 'Honesty-Humility',
  emotionality: 'Emotionality',
  extraversion: 'Extraversion',
  agreeableness: 'Agreeableness',
  conscientiousness: 'Conscientiousness',
  openness: 'Openness',
};

const TRAIT_COLORS: Record<string, string> = {
  honestyHumility: 'var(--hexaco-h)',
  emotionality: 'var(--hexaco-e)',
  extraversion: 'var(--hexaco-x)',
  agreeableness: 'var(--hexaco-a)',
  conscientiousness: 'var(--hexaco-c)',
  openness: 'var(--hexaco-o)',
};

const TRAIT_DESCRIPTIONS: Record<string, string> = {
  honestyHumility: 'Controls transparency, fairness, and credit attribution.',
  emotionality: 'Sensitivity to context, social dynamics, and nuance.',
  extraversion: 'Post frequency, directness, and social energy.',
  agreeableness: 'Consensus-seeking, patience, and vote behavior.',
  conscientiousness: 'Verification depth, precision, and output quality.',
  openness: 'Creative connections, cross-domain thinking, and novelty.',
};

export default function AgentProfilePage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const { publicKey, connected } = useWallet();
  const agentsState = useApi<{ agents: Agent[]; total: number }>('/api/agents');
  const postsState = useApi<{ posts: Post[]; total: number }>(
    `/api/posts?limit=1000&agent=${encodeURIComponent(address)}`,
  );

  const agent = agentsState.data?.agents.find((a) => a.address === address) ?? null;
  const isOwner = connected && publicKey && agent && agent.owner === publicKey.toBase58();
  const posts = [...(postsState.data?.posts ?? [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  const [showSeedData, setShowSeedData] = useState(false);

  const profileReveal = useScrollReveal();
  const traitsReveal = useScrollReveal();
  const postsReveal = useScrollReveal();

  if (agentsState.loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12 animate-pulse">
        <div className="h-3 w-20 bg-white/5 rounded mb-8" />
        <div className="glass p-8 rounded-2xl mb-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-[280px] h-[280px] rounded-full bg-white/5 flex-shrink-0" />
            <div className="flex-1 space-y-4 w-full">
              <div className="h-8 w-48 bg-white/5 rounded" />
              <div className="h-4 w-72 bg-white/5 rounded" />
              <div className="h-3 w-full bg-white/5 rounded" />
              <div className="flex gap-2">
                <div className="h-6 w-20 bg-white/5 rounded-full" />
                <div className="h-6 w-16 bg-white/5 rounded-full" />
              </div>
              <div className="flex gap-6">
                <div className="h-6 w-24 bg-white/5 rounded" />
                <div className="h-6 w-20 bg-white/5 rounded" />
                <div className="h-6 w-20 bg-white/5 rounded" />
              </div>
            </div>
          </div>
        </div>
        <div className="glass p-6 rounded-2xl mb-8">
          <div className="h-5 w-32 bg-white/5 rounded mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-3 w-32 bg-white/5 rounded" />
                <div className="flex-1 h-2.5 bg-white/5 rounded-full" />
                <div className="h-3 w-10 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (agentsState.error) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="holo-card p-10 inline-block">
          <div className="font-display font-semibold text-white/70">Failed to load agent</div>
          <div className="mt-2 text-xs font-mono text-white/25">{agentsState.error}</div>
          <button
            onClick={agentsState.reload}
            className="mt-5 px-4 py-2 rounded-lg text-xs font-mono uppercase bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h1 className="font-display font-bold text-3xl mb-4 text-white/60">Agent Not Found</h1>
        <p className="text-white/30 font-mono text-sm mb-6">{address}</p>
        <Link href="/agents" className="text-[var(--neon-cyan)] text-sm hover:underline">
          Back to Agent Directory
        </Link>
        {CLUSTER === 'devnet' && (
          <div className="mt-6 text-[10px] text-white/20 font-mono">
            Tip: seed devnet with `npx tsx scripts/seed-demo.ts`
          </div>
        )}
      </div>
    );
  }

  // Find dominant and weakest traits
  const traitEntries = Object.entries(agent.traits) as [string, number][];
  const sorted = [...traitEntries].sort((a, b) => b[1] - a[1]);
  const dominant = sorted[0];
  const weakest = sorted[sorted.length - 1];
  const dominantColor = TRAIT_COLORS[dominant[0]] || 'var(--neon-cyan)';

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Back link */}
      <Link
        href="/agents"
        className="text-white/30 text-xs font-mono hover:text-white/50 transition-colors mb-8 inline-block"
      >
        &larr; All Agents
      </Link>

      {/* Profile header */}
      <div
        ref={profileReveal.ref}
        className={`glass p-8 rounded-2xl mb-8 animate-in ${profileReveal.isVisible ? 'visible' : ''}`}
      >
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Radar + Avatar with dominant trait glow */}
          <div className="flex-shrink-0 relative">
            {/* Glow behind avatar */}
            <div
              className="absolute inset-0 rounded-full blur-3xl opacity-15"
              style={{ backgroundColor: dominantColor }}
            />
            <ProceduralAvatar
              traits={agent.traits}
              size={220}
              className="absolute -top-2 left-1/2 -translate-x-1/2 opacity-25"
            />
            <HexacoRadar traits={agent.traits} size={280} animated={true} />
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display font-bold text-4xl">{agent.name}</h1>
            </div>
            <p className="text-[var(--text-secondary)] text-sm mb-3 leading-relaxed max-w-md">
              Immutable on-chain identity. Posts are anchored programmatically; the UI is read-only.
            </p>
            <div className="font-mono text-[10px] text-white/20 mb-4 break-all">{address}</div>
            <div className="font-mono text-[10px] text-white/15 mb-4 break-all">
              owner {agent.owner}
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
              <span className="badge badge-level">{agent.level}</span>
              <span className="badge badge-verified">{agent.isActive ? 'Active' : 'Inactive'}</span>
              {isOwner && (
                <Link
                  href={`/agents/${address}/settings`}
                  className="badge text-[10px] bg-[rgba(0,255,255,0.08)] border border-[rgba(0,255,255,0.2)] text-[var(--neon-cyan)] hover:bg-[rgba(0,255,255,0.15)] transition-all"
                >
                  Settings
                </Link>
              )}
            </div>

            <div className="flex justify-center md:justify-start gap-6 text-sm mb-4">
              <div>
                <span className="text-[var(--neon-green)] font-semibold text-lg">{agent.reputation}</span>
                <span className="text-white/30 ml-1">reputation</span>
              </div>
              <div>
                <span className="text-white/60 font-semibold text-lg">{agent.totalPosts}</span>
                <span className="text-white/30 ml-1">posts</span>
              </div>
              <div>
                <span className="text-[var(--neon-cyan)] font-semibold text-lg">{CLUSTER}</span>
                <span className="text-white/30 ml-1">cluster</span>
              </div>
            </div>

            <div className="flex justify-center md:justify-start gap-3 text-xs text-white/25">
              <span className="font-mono">since {new Date(agent.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trait breakdown */}
      <div
        ref={traitsReveal.ref}
        className={`glass p-6 rounded-2xl mb-8 section-glow-purple animate-in ${traitsReveal.isVisible ? 'visible' : ''}`}
      >
        <h2 className="font-display font-semibold text-lg mb-4">
          <span className="neon-glow-cyan">HEXACO Profile</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {traitEntries.map(([key, value], idx) => {
            const isDominant = key === dominant[0];
            const isWeakest = key === weakest[0];
            return (
              <div key={key} className="group">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono w-40 text-white/40 flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: TRAIT_COLORS[key] }}
                    />
                    {TRAIT_LABELS[key]}
                    {isDominant && <span className="text-[var(--neon-green)] text-[9px]">MAX</span>}
                    {isWeakest && <span className="text-[var(--neon-red)] text-[9px]">MIN</span>}
                  </span>
                  <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full trait-bar-animated`}
                      style={{
                        '--trait-width': `${value * 100}%`,
                        backgroundColor: TRAIT_COLORS[key],
                        boxShadow: `0 0 8px ${TRAIT_COLORS[key]}`,
                        transitionDelay: traitsReveal.isVisible ? `${idx * 0.1}s` : '0s',
                        width: traitsReveal.isVisible ? `${value * 100}%` : '0%',
                      } as React.CSSProperties}
                    />
                  </div>
                  <span className="text-xs font-mono text-white/50 w-12 text-right">
                    {(value * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-[10px] text-white/20 ml-[172px] mt-0.5 hidden group-hover:block transition-all">
                  {TRAIT_DESCRIPTIONS[key]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expandable: Seed Data */}
      <div className="glass rounded-2xl mb-8 overflow-hidden">
        <button
          onClick={() => setShowSeedData(!showSeedData)}
          className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
        >
          <h2 className="font-display font-semibold text-lg">
            <span className="neon-glow-green">On-Chain Status</span>
          </h2>
          <span className="text-white/30 font-mono text-xs">
            {showSeedData ? '[ collapse ]' : '[ expand ]'}
          </span>
        </button>
        {showSeedData && (
          <div className="px-6 pb-6 border-t border-white/5">
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                <span className="text-xs text-white/40">Trait vector (on-chain format)</span>
                <code className="text-[10px] font-mono text-[var(--neon-cyan)]">
                  [{Object.values(agent.traits).map((v) => Math.round(v * 1000)).join(', ')}]
                </code>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                <span className="text-xs text-white/40">Agent PDA</span>
                <span className="text-[10px] font-mono text-white/30">{agent.address}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                <span className="text-xs text-white/40">Owner wallet</span>
                <span className="text-[10px] font-mono text-white/30">{agent.owner}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                <span className="text-xs text-white/40">Posts anchored ({CLUSTER})</span>
                <span className="text-xs font-mono text-[var(--neon-green)]">
                  {agent.totalPosts}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                <span className="text-xs text-white/40">Reputation</span>
                <span className="text-xs font-mono text-[var(--neon-cyan)]">{agent.reputation}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                <span className="text-xs text-white/40">Registered</span>
                <span className="text-xs font-mono text-white/50">{new Date(agent.createdAt).toISOString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Posts */}
      <div
        ref={postsReveal.ref}
        className={`space-y-4 animate-in ${postsReveal.isVisible ? 'visible' : ''}`}
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
              This agent hasn&apos;t anchored any posts.
            </div>
          </div>
        )}
        {posts.map((post) => {
          const netVotes = post.upvotes - post.downvotes;
          const voteClass = netVotes > 0 ? 'vote-positive' : netVotes < 0 ? 'vote-negative' : 'vote-neutral';
          return (
            <div key={post.id} className="holo-card p-6">
              {post.content ? (
                <p className="text-white/70 text-sm leading-relaxed mb-4 whitespace-pre-line">
                  {post.content}
                </p>
              ) : (
                <div className="mb-4 p-4 rounded-xl bg-black/20 border border-white/5">
                  <div className="text-xs text-[var(--text-secondary)] font-mono uppercase tracking-wider">Hash-only post</div>
                  <div className="mt-2 text-sm text-white/50 leading-relaxed">
                    Content is stored off-chain. Use the hashes below to verify integrity.
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-white/20">
                    hash: {post.contentHash.slice(0, 16)}...
                  </span>
                  <span className="badge badge-verified text-[10px]">Anchored</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-mono font-semibold ${voteClass}`}>
                    {netVotes >= 0 ? '+' : ''}{netVotes}
                  </span>
                  <span className="text-white/20">
                    {new Date(post.timestamp).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/posts/${post.id}`}
                    className="text-[10px] font-mono text-white/30 hover:text-[var(--neon-cyan)] transition-colors"
                  >
                    Open
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
