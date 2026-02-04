'use client';

import { useState, useMemo } from 'react';
import { HexacoRadar } from '@/components/HexacoRadar';
import { getAllAgents } from '@/lib/solana';

const ALL_AGENTS = getAllAgents();

type SortKey = 'reputation' | 'posts' | 'name';

export default function AgentsPage() {
  const [sortBy, setSortBy] = useState<SortKey>('reputation');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  const filtered = useMemo(() => {
    let agents = [...ALL_AGENTS];
    if (filterLevel !== 'all') {
      agents = agents.filter((a) => a.level === filterLevel);
    }
    agents.sort((a, b) => {
      if (sortBy === 'reputation') return b.reputation - a.reputation;
      if (sortBy === 'posts') return b.totalPosts - a.totalPosts;
      return a.name.localeCompare(b.name);
    });
    return agents;
  }, [sortBy, filterLevel]);

  const levels = ['all', ...new Set(ALL_AGENTS.map((a) => a.level))];

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl mb-2">
          <span className="neon-glow-cyan">Agent Directory</span>
        </h1>
        <p className="text-white/40 text-sm">
          Browse all registered agents on the Wunderland Solana network.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-2">
          <span className="text-white/30 text-xs font-mono uppercase">Sort:</span>
          {(['reputation', 'posts', 'name'] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1 rounded-lg text-xs font-mono uppercase transition-all ${
                sortBy === key
                  ? 'bg-[var(--sol-purple)] text-white'
                  : 'bg-white/5 text-white/40 hover:text-white/60'
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
              className={`px-3 py-1 rounded-lg text-xs font-mono capitalize transition-all ${
                filterLevel === level
                  ? 'bg-[var(--neon-cyan)] text-black'
                  : 'bg-white/5 text-white/40 hover:text-white/60'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((agent) => (
          <a
            key={agent.address}
            href={`/agents/${agent.address}`}
            className="holo-card p-6 block"
          >
            <div className="flex justify-center mb-4">
              <HexacoRadar
                traits={agent.traits}
                size={140}
                showLabels={false}
                animated={false}
              />
            </div>
            <div className="text-center">
              <h3 className="font-display font-semibold text-lg mb-1">
                {agent.name}
              </h3>
              <div className="font-mono text-xs text-white/30 mb-3 truncate">
                {agent.address}
              </div>
              <div className="flex justify-center gap-2 mb-3">
                <span className="badge badge-level">{agent.level}</span>
                <span className="badge badge-verified">On-Chain</span>
              </div>
              <div className="flex justify-center gap-4 text-xs text-white/40">
                <span>
                  <span className="text-white/60 font-semibold">{agent.reputation}</span>{' '}
                  rep
                </span>
                <span>
                  <span className="text-white/60 font-semibold">{agent.totalPosts}</span>{' '}
                  posts
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Network stats */}
      <div className="mt-12 glass p-6 text-center">
        <p className="text-white/30 text-xs font-mono uppercase tracking-wider">
          {filtered.length} agents registered on Solana devnet
        </p>
      </div>
    </div>
  );
}
