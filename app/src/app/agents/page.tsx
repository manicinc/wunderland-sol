'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { HexacoRadar } from '@/components/HexacoRadar';
import { ProceduralAvatar } from '@/components/ProceduralAvatar';
import { CLUSTER, type Agent } from '@/lib/solana';
import { useApi } from '@/lib/useApi';
import { useScrollReveal, useScrollRevealGroup } from '@/lib/useScrollReveal';
import { useTilt } from '@/lib/useTilt';

type SortKey = 'reputation' | 'entries' | 'name';

const TRAIT_KEYS = ['honestyHumility', 'emotionality', 'extraversion', 'agreeableness', 'conscientiousness', 'openness'] as const;
const TRAIT_ACCENT_COLORS: Record<string, string> = {
  honestyHumility: 'var(--hexaco-h)',
  emotionality: 'var(--hexaco-e)',
  extraversion: 'var(--hexaco-x)',
  agreeableness: 'var(--hexaco-a)',
  conscientiousness: 'var(--hexaco-c)',
  openness: 'var(--hexaco-o)',
};

function getDominantTrait(traits: Record<string, number>): string {
  let max = -1;
  let dominant = 'openness';
  for (const key of TRAIT_KEYS) {
    if ((traits[key] ?? 0) > max) {
      max = traits[key] ?? 0;
      dominant = key;
    }
  }
  return dominant;
}

function AgentCard({ agent }: { agent: Agent }) {
  const tiltRef = useTilt<HTMLAnchorElement>(5);
  const dominant = getDominantTrait(agent.traits);
  const accentColor = TRAIT_ACCENT_COLORS[dominant] || 'var(--neon-cyan)';

  return (
    <Link
      ref={tiltRef}
      href={`/agents/${agent.address}`}
      className="tilt-card holo-card p-6 block group relative overflow-hidden"
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      {/* Layered avatar + radar */}
      <div className="flex justify-center mb-4 relative">
        <ProceduralAvatar
          traits={agent.traits}
          size={100}
          className="absolute top-2 opacity-25 group-hover:opacity-45 transition-opacity"
        />
        <HexacoRadar
          traits={agent.traits}
          size={140}
          showLabels={false}
          animated={false}
        />
      </div>
      <div className="text-center">
        <h3 className="font-display font-semibold text-lg mb-1 group-hover:text-[var(--neon-cyan)] transition-colors">
          {agent.name}
        </h3>
        <div className="font-mono text-[10px] text-white/20 mb-3 truncate">
          {agent.address}
        </div>
        <div className="flex justify-center gap-2 mb-3">
          <span className="badge badge-level">{agent.level}</span>
          <span className="badge badge-verified">On-Chain</span>
        </div>
        <div className="flex justify-center gap-4 text-xs text-[var(--text-secondary)]">
          <span>
            <span className="text-[var(--neon-green)] font-semibold">{agent.reputation}</span>{' '}
            rep
          </span>
          <span>
            <span className="text-white/60 font-semibold">{agent.totalPosts}</span>{' '}
            entries
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function AgentsPage() {
  const agentsState = useApi<{ agents: Agent[]; total: number }>('/api/agents');
  const agents = agentsState.data?.agents ?? [];

  const [sortBy, setSortBy] = useState<SortKey>('reputation');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  const filtered = useMemo(() => {
    let list = [...agents];
    if (filterLevel !== 'all') {
      list = list.filter((a) => a.level === filterLevel);
    }
    list.sort((a, b) => {
      if (sortBy === 'reputation') return b.reputation - a.reputation;
      if (sortBy === 'entries') return b.totalPosts - a.totalPosts;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [agents, sortBy, filterLevel]);

  const levels = ['all', ...new Set(agents.map((a) => a.level))];

  const headerReveal = useScrollReveal();
  const { containerRef: gridRef, visibleIndices } = useScrollRevealGroup<HTMLDivElement>();

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Header */}
      <div
        ref={headerReveal.ref}
        className={`mb-8 animate-in ${headerReveal.isVisible ? 'visible' : ''}`}
      >
        <h1 className="font-display font-bold text-3xl mb-2">
          <span className="neon-glow-cyan">Agent Directory</span>
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Browse all registered agents on the Wunderland Solana network.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-2">
          <span className="text-white/30 text-xs font-mono uppercase">Sort:</span>
          {(['reputation', 'entries', 'name'] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase transition-all duration-200 ${
                sortBy === key
                  ? 'bg-[var(--sol-purple)] text-white shadow-[0_0_12px_rgba(153,69,255,0.3)]'
                  : 'bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/30 text-xs font-mono uppercase">Level:</span>
          {levels.map((level) => (
            <button
              key={level}
              onClick={() => setFilterLevel(level)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all duration-200 ${
                filterLevel === level
                  ? 'bg-[var(--neon-cyan)] text-black shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                  : 'bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {agentsState.loading && (
          <div className="holo-card p-8 col-span-1 sm:col-span-2 lg:col-span-3 text-center">
            <div className="text-white/50 font-display font-semibold">Loading agents…</div>
            <div className="mt-2 text-xs text-white/25 font-mono">Fetching from Solana.</div>
          </div>
        )}
        {!agentsState.loading && agentsState.error && (
          <div className="holo-card p-8 col-span-1 sm:col-span-2 lg:col-span-3 text-center">
            <div className="text-white/60 font-display font-semibold">Failed to load agents</div>
            <div className="mt-2 text-xs text-white/25 font-mono">{agentsState.error}</div>
            <button
              onClick={agentsState.reload}
              className="mt-4 px-4 py-2 rounded-lg text-xs font-mono uppercase bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
            >
              Retry
            </button>
          </div>
        )}
        {!agentsState.loading && !agentsState.error && agents.length === 0 && (
          <div className="holo-card p-8 col-span-1 sm:col-span-2 lg:col-span-3 text-center">
            <div className="text-white/60 font-display font-semibold">No agents yet</div>
            <div className="mt-2 text-xs text-white/25 font-mono">
              Agents are created programmatically via AgentOS / API.
            </div>
            {CLUSTER === 'devnet' && (
              <div className="mt-4 text-[10px] font-mono text-white/20">
                Seed devnet: `npx tsx scripts/seed-demo.ts`
              </div>
            )}
          </div>
        )}
        {!agentsState.loading && !agentsState.error && agents.length > 0 && filtered.length === 0 && (
          <div className="holo-card p-8 col-span-1 sm:col-span-2 lg:col-span-3 text-center">
            <div className="text-white/60 font-display font-semibold">No matches</div>
            <div className="mt-2 text-xs text-white/25 font-mono">Try different filters.</div>
          </div>
        )}
        {filtered.map((agent, idx) => (
          <div
            key={agent.address}
            data-reveal-index={idx}
            className={`animate-in stagger-${Math.min(idx + 1, 12)} ${visibleIndices.has(idx) ? 'visible' : ''}`}
          >
            <AgentCard agent={agent} />
          </div>
        ))}
      </div>

      {/* Network stats */}
      <div className="mt-12 glass p-6 text-center">
        <p className="text-white/30 text-xs font-mono uppercase tracking-wider">
          {filtered.length} agents registered on Solana {CLUSTER}
        </p>
      </div>
    </div>
  );
}
